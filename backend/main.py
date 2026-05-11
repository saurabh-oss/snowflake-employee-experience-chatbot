"""
EX Chatbot Backend — FastAPI server
Connects to Snowflake, orchestrates Cortex Search + Analyst + Agent calls.
"""

import os
import json
import uuid
import time
import logging
import hashlib
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import jwt as pyjwt

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives import serialization
import snowflake.connector
import httpx

# Load .env from project root (one level up from this file's directory)
load_dotenv(Path(__file__).parent.parent / ".env")

# ── Configuration ─────────────────────────────────────────────────────────
def _load_private_key():
    key_path = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")
    if not key_path:
        return None
    with open(key_path, "rb") as f:
        return load_pem_private_key(f.read(), password=None)

SNOWFLAKE_CONFIG = {
    "account":     os.getenv("SNOWFLAKE_ACCOUNT"),
    "user":        os.getenv("SNOWFLAKE_USER"),
    "private_key": _load_private_key(),
    "warehouse":   os.getenv("SNOWFLAKE_WAREHOUSE", "EX_CORTEX_WH"),
    "database":    os.getenv("SNOWFLAKE_DATABASE",  "EX_CHATBOT"),
    "schema":      os.getenv("SNOWFLAKE_SCHEMA",     "HR_DATA"),
    "role":        os.getenv("SNOWFLAKE_ROLE",       "EX_CHATBOT_APP"),
}

CORTEX_MODEL         = os.getenv("CORTEX_MODEL", "claude-sonnet-4-20250514")
CORTEX_SEARCH_SVC    = "EX_CHATBOT.KNOWLEDGE_BASE.EX_POLICY_SEARCH"
SEMANTIC_MODEL_STAGE = os.getenv(
    "SEMANTIC_MODEL_STAGE",
    "@EX_CHATBOT.AGENT_CONFIG.SEMANTIC_MODELS/04_semantic_model.yaml"
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("ex-chatbot")

# ── Snowflake connection pool ─────────────────────────────────────────────
_conn = None

def get_connection():
    global _conn
    if _conn is None or _conn.is_closed():
        _conn = snowflake.connector.connect(**SNOWFLAKE_CONFIG)
        logger.info("Snowflake connection established.")
    return _conn

def execute_query(sql: str, params: tuple = None):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, params or ())
        columns = [desc[0] for desc in cur.description] if cur.description else []
        rows = cur.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cur.close()

# ── Cortex AI Functions ──────────────────────────────────────────────────

def cortex_complete(prompt: str, system_prompt: str = None) -> str:
    """Call Cortex COMPLETE via parameterized SQL (avoids escaping issues)."""
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    result = execute_query(
        "SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s) AS response",
        (CORTEX_MODEL, full_prompt)
    )
    if not result:
        return "I couldn't generate a response."
    resp = result[0].get("RESPONSE", "")
    return str(resp) if resp else "I couldn't generate a response."


def cortex_search(query: str, limit: int = 3) -> list:
    """Hybrid retrieval over policy documents via Cortex Search."""
    search_payload = json.dumps({
        "query": query,
        "columns": ["TITLE", "CONTENT", "CATEGORY", "VERSION"],
        "limit": limit
    }).replace("'", "''")

    sql = f"""
        SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
            '{CORTEX_SEARCH_SVC}',
            '{search_payload}'
        ) AS results
    """
    result = execute_query(sql)
    if not result:
        return []
    raw = result[0].get("RESULTS", "")
    try:
        data = raw if isinstance(raw, dict) else json.loads(raw)
        return data.get("results", [])
    except (json.JSONDecodeError, TypeError):
        return []


def _make_jwt() -> str:
    """Generate a signed JWT for authenticating to Snowflake REST APIs."""
    key_path = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")
    with open(key_path, "rb") as f:
        private_key = load_pem_private_key(f.read(), password=None)

    pub_der = private_key.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo
    )
    fingerprint = base64.b64encode(hashlib.sha256(pub_der).digest()).decode()

    account = SNOWFLAKE_CONFIG["account"].upper()
    user    = SNOWFLAKE_CONFIG["user"].upper()
    now     = int(time.time())

    return pyjwt.encode(
        {
            "iss": f"{account}.{user}.SHA256:{fingerprint}",
            "sub": f"{account}.{user}",
            "iat": now,
            "exp": now + 3600,
        },
        private_key,
        algorithm="RS256"
    )


def cortex_analyst(question: str, emp_id: str = None) -> dict:
    """
    Call Cortex Analyst REST API to convert NL → SQL, then execute it.
    Uses key-pair JWT Bearer authentication.
    Returns { sql, result, explanation }.
    """
    account = SNOWFLAKE_CONFIG["account"]
    url = f"https://{account}.snowflakecomputing.com/api/v2/cortex/analyst/message"
    context = f"The requesting employee is {emp_id}. " if emp_id else ""

    try:
        token = _make_jwt()
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                    "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
                },
                json={
                    "messages": [
                        {
                            "role": "user",
                            "content": [{"type": "text", "text": f"{context}{question}"}]
                        }
                    ],
                    "semantic_model_file": SEMANTIC_MODEL_STAGE,
                }
            )
        resp.raise_for_status()
        content = resp.json().get("message", {}).get("content", [])
    except httpx.HTTPStatusError as e:
        logger.error(f"Cortex Analyst API error {e.response.status_code}: {e.response.text}")
        return {"sql": None, "result": [], "explanation": f"Analyst API error: {e.response.status_code}"}
    except Exception as e:
        logger.error(f"Cortex Analyst error: {e}")
        return {"sql": None, "result": [], "explanation": str(e)}

    sql_item  = next((c for c in content if c.get("type") == "sql"),  None)
    text_item = next((c for c in content if c.get("type") == "text"), None)
    explanation = text_item.get("text", "") if text_item else ""

    if sql_item:
        generated_sql = sql_item.get("statement", "")
        if generated_sql:
            try:
                query_result = execute_query(generated_sql)
                return {"sql": generated_sql, "result": query_result, "explanation": explanation}
            except Exception as e:
                logger.error(f"Generated SQL failed: {e}\nSQL: {generated_sql}")
                return {"sql": generated_sql, "result": [], "explanation": f"SQL error: {e}"}

    return {"sql": None, "result": [], "explanation": explanation or "Could not generate a query."}


# ── Agent Orchestration ──────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Ask EX, an Employee Experience AI assistant built on Snowflake Intelligence.
You help employees with HR questions, IT support, policy lookups, and manager analytics.

RULES:
1. Always ground answers in retrieved data — never fabricate.
2. Cite the source (policy name + section, or SQL query) in every answer.
3. For personal data questions ("my leave", "my tickets"), filter by the requesting user's EMP_ID.
4. For manager questions ("my team"), filter by MANAGER_ID.
5. If you cannot find an answer, say so clearly and suggest who to contact.
6. Never expose salary data unless the user role explicitly permits it.
7. For actions (raise ticket, apply leave), confirm before executing.
8. Keep responses concise. Use markdown formatting.
9. Be warm and professional. Suggest related follow-ups."""


def classify_intent(question: str) -> str:
    q = question.lower()

    data_kw = [
        "how many", "show me", "count", "total", "average",
        "leave balance", "leave days", "headcount", "attrition",
        "tickets", "assets", "my team", "trend", "quarter",
        "remaining", "taken", "budget"
    ]
    if any(kw in q for kw in data_kw):
        return "analyst"

    policy_kw = [
        "policy", "what's the", "what is the", "how do i",
        "process for", "procedure", "rule", "guideline",
        "handbook", "allowed", "permitted", "requirement",
        "bereavement", "remote work", "vpn", "password",
        "code of conduct", "ethics"
    ]
    if any(kw in q for kw in policy_kw):
        return "search"

    action_kw = [
        "raise a ticket", "create a ticket", "apply for leave",
        "book", "submit", "request", "escalate", "notify"
    ]
    if any(kw in q for kw in action_kw):
        return "action"

    return "search"


async def process_message(question: str, emp_id: str = "EMP-4821", session_id: str = None, history: list = None) -> dict:
    start = time.time()
    intent = classify_intent(question)
    tools_called = []
    context_parts = []

    try:
        if intent == "analyst":
            r = cortex_analyst(question, emp_id)
            tools_called.append({"tool": "cortex_analyst", "sql": r.get("sql"), "row_count": len(r.get("result", []))})
            if r["result"]:
                context_parts.append(f"Query results:\n{json.dumps(r['result'], indent=2, default=str)}")
            if r["sql"]:
                context_parts.append(f"Generated SQL: {r['sql']}")
            if r["explanation"]:
                context_parts.append(f"Analyst explanation: {r['explanation']}")

        elif intent == "search":
            docs = cortex_search(question)
            tools_called.append({"tool": "cortex_search", "results_count": len(docs)})
            for doc in docs:
                context_parts.append(
                    f"Source: {doc.get('TITLE', 'Unknown')} (v{doc.get('VERSION', '?')})\n"
                    f"Category: {doc.get('CATEGORY', '')}\n"
                    f"Content: {doc.get('CONTENT', '')[:2000]}"
                )

        elif intent == "action":
            docs = cortex_search(question)
            tools_called.append({"tool": "cortex_search", "results_count": len(docs)})
            for doc in docs:
                context_parts.append(f"Source: {doc.get('TITLE', '')}\n{doc.get('CONTENT', '')[:1500]}")
            r = cortex_analyst(question, emp_id)
            tools_called.append({"tool": "cortex_analyst", "sql": r.get("sql")})
            if r["result"]:
                context_parts.append(f"Data: {json.dumps(r['result'], default=str)}")

        retrieval_context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant data found."

        history_text = ""
        if history:
            turns = "\n".join(
                f"{m['role'].upper()}: {m['content'][:500]}"
                for m in history[-6:]  # last 3 exchanges
            )
            history_text = f"CONVERSATION HISTORY (for context only):\n{turns}\n\n"

        prompt = f"""{history_text}Based on the following retrieved context, answer the employee's latest message.
Employee ID: {emp_id}

RETRIEVED CONTEXT:
{retrieval_context}

EMPLOYEE MESSAGE:
{question}

Remember: cite your sources, be concise, use markdown formatting."""

        response_text = cortex_complete(prompt, SYSTEM_PROMPT)
        latency_ms = int((time.time() - start) * 1000)

        try:
            log_interaction(
                session_id=session_id or str(uuid.uuid4()),
                emp_id=emp_id,
                user_message=question,
                agent_response=response_text,
                tools_called=tools_called,
                latency_ms=latency_ms
            )
        except Exception as log_err:
            logger.warning(f"Audit log failed (non-fatal): {log_err}")

        return {
            "response": response_text,
            "intent": intent,
            "tools_called": tools_called,
            "latency_ms": latency_ms,
            "session_id": session_id,
        }

    except Exception as e:
        logger.error(f"Processing error: {e}", exc_info=True)
        return {
            "response": "I'm sorry, I encountered an error. Please try again or contact the IT Help Desk.",
            "intent": intent,
            "tools_called": tools_called,
            "latency_ms": int((time.time() - start) * 1000),
            "error": str(e),
        }


def log_interaction(session_id, emp_id, user_message, agent_response, tools_called, latency_ms):
    sql = """
        INSERT INTO EX_CHATBOT.AUDIT.INTERACTION_LOG
        (SESSION_ID, EMP_ID, USER_ROLE, USER_MESSAGE, AGENT_RESPONSE, TOOLS_CALLED, LATENCY_MS)
        VALUES (%s, %s, %s, %s, %s, PARSE_JSON(%s), %s)
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql, (
            session_id, emp_id, SNOWFLAKE_CONFIG["role"],
            user_message[:16000], agent_response[:16000],
            json.dumps(tools_called), latency_ms
        ))
    finally:
        cur.close()


# ── FastAPI Application ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting EX Chatbot backend...")
    yield
    global _conn
    if _conn and not _conn.is_closed():
        _conn.close()
        logger.info("Snowflake connection closed.")

app = FastAPI(
    title="Ask EX — Employee Experience AI Chatbot",
    description="Backend API powered by Snowflake Cortex AI",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Models ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    emp_id: str = "EMP-4821"
    session_id: Optional[str] = None
    history: list = []  # Previous turns: [{role: "user"|"assistant", content: "..."}]

class ChatResponse(BaseModel):
    response: str
    intent: str
    tools_called: list
    latency_ms: int
    session_id: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    snowflake_connected: bool
    cortex_available: bool
    timestamp: str

# ── Routes ───────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    sf_ok = False
    cortex_ok = False
    try:
        execute_query("SELECT CURRENT_ACCOUNT() AS acct")
        sf_ok = True
        execute_query("SELECT SNOWFLAKE.CORTEX.COMPLETE('llama3.1-70b', 'ping') AS r")
        cortex_ok = True
    except Exception as e:
        logger.warning(f"Health check: {e}")
    return HealthResponse(
        status="healthy" if sf_ok else "degraded",
        snowflake_connected=sf_ok,
        cortex_available=cortex_ok,
        timestamp=datetime.utcnow().isoformat()
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    result = await process_message(
        question=request.message,
        emp_id=request.emp_id,
        session_id=request.session_id,
        history=request.history
    )
    return ChatResponse(**{k: v for k, v in result.items() if k in ChatResponse.model_fields})


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({"type": "typing", "status": True})
            result = await process_message(
                question=data.get("message", ""),
                emp_id=data.get("emp_id", "EMP-4821"),
                session_id=session_id
            )
            await websocket.send_json({"type": "typing", "status": False})
            await websocket.send_json({"type": "message", "data": result})
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")


@app.get("/api/search")
async def search_policies(query: str, limit: int = 3):
    return {"query": query, "results": cortex_search(query, limit)}


@app.get("/api/analytics")
async def run_analytics(question: str, emp_id: str = "EMP-4821"):
    return cortex_analyst(question, emp_id)


@app.get("/api/debug/analyst-token")
async def debug_analyst_token():
    """Diagnose Cortex Analyst REST connectivity — remove before production."""
    account = SNOWFLAKE_CONFIG["account"]
    url = f"https://{account}.snowflakecomputing.com/api/v2/cortex/analyst/message"
    try:
        token = _make_jwt()
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                    "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
                },
                json={
                    "messages": [{"role": "user", "content": [{"type": "text", "text": "How many employees are there?"}]}],
                    "semantic_model_file": SEMANTIC_MODEL_STAGE,
                }
            )
        return {"status_code": resp.status_code, "response": resp.json()}
    except Exception as e:
        return {"error": str(e), "token_length": len(token) if token else 0, "account": account}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("APP_PORT", 8000))
    uvicorn.run("main:app", host=os.getenv("APP_HOST", "0.0.0.0"), port=port, reload=True)
