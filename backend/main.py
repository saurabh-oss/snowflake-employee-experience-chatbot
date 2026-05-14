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

import re
import random
import asyncio
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
# Cortex Agents API model — defaults to the same model but can be overridden
# (e.g. "claude-3-5-sonnet" if the newer model isn't yet available in your region's Agents API)
CORTEX_AGENTS_MODEL  = os.getenv("CORTEX_AGENTS_MODEL", CORTEX_MODEL)
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


async def call_cortex_agent_api(
    question: str,
    emp_id: str,
    history: list = None,
) -> dict:
    """
    Snowflake Cortex Agents REST API — Snowflake Intelligence native orchestration.

    Sends a streaming request to /api/v2/cortex/agent:run with two registered tools:
      - cortex_analyst_text_to_sql  → natural language to governed SQL via the semantic model
      - cortex_search               → hybrid retrieval over HR policy documents

    The agent LLM decides autonomously which tool(s) to invoke. No manual intent
    classification is needed for Q&A; the model routes based on question semantics.
    Streams SSE events and accumulates the full response text + tool usage for provenance.
    """
    account = SNOWFLAKE_CONFIG["account"]
    url = f"https://{account}.snowflakecomputing.com/api/v2/cortex/agent:run"

    # Build message history (last 6 turns for context)
    messages = []
    for h in (history or [])[-6:]:
        messages.append({
            "role": h["role"],
            "content": [{"type": "text", "text": h["content"][:800]}]
        })

    # Embed employee identity and system instructions into the user turn
    user_text = (
        f"[System: {SYSTEM_PROMPT[:600]}]\n\n"
        f"Employee ID: {emp_id}\n\n"
        f"{question}"
    )
    messages.append({"role": "user", "content": [{"type": "text", "text": user_text}]})

    payload = {
        "model": CORTEX_AGENTS_MODEL,
        "tools": [
            {
                "tool_spec": {
                    "type": "cortex_analyst_text_to_sql",
                    "name": "hr_data_analyst",
                    "semantic_model_file": SEMANTIC_MODEL_STAGE,
                }
            },
            {
                "tool_spec": {
                    "type": "cortex_search",
                    "name": "policy_search",
                    "cortex_search_service": CORTEX_SEARCH_SVC,
                    "max_results": 5,
                }
            },
        ],
        "messages": messages,
        "stream": True,
    }

    token = _make_jwt()
    full_text = ""
    tools_used = []

    async with httpx.AsyncClient(timeout=90.0) as client:
        async with client.stream(
            "POST", url,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
            },
        ) as resp:
            resp.raise_for_status()

            async for raw in resp.aiter_lines():
                if not raw.startswith("data: "):
                    continue
                chunk = raw[6:].strip()
                if not chunk or chunk == "[DONE]":
                    continue
                try:
                    ev = json.loads(chunk)
                except json.JSONDecodeError:
                    continue

                ev_type = ev.get("type", "")

                # Accumulate streamed text tokens
                if ev_type == "content_block_delta":
                    delta = ev.get("delta", {})
                    if delta.get("type") == "text_delta":
                        full_text += delta.get("text", "")

                # Record which tool the agent chose to invoke
                elif ev_type == "tool_use_block_start":
                    tu = ev.get("tool_use", {})
                    tool_entry = {
                        "tool": tu.get("name", "tool"),
                        "via": "cortex_agent",
                        "tool_use_id": tu.get("tool_use_id"),
                    }
                    tools_used.append(tool_entry)
                    logger.info(f"Cortex Agent invoked tool: {tool_entry['tool']}")

                # Extract generated SQL and result counts from tool responses
                elif ev_type == "tool_result_block_delta":
                    for r in ev.get("delta", {}).get("results", []):
                        if r.get("type") == "json" and tools_used:
                            content = r.get("json", {})
                            last = tools_used[-1]
                            if "sql" in content:
                                last["sql"] = content["sql"]
                            if "searchResults" in content:
                                last["results_count"] = len(content["searchResults"])
                            if "results" in content and isinstance(content["results"], list):
                                last["results_count"] = len(content["results"])

    if not full_text.strip():
        raise ValueError("Cortex Agents API returned an empty response.")

    logger.info(f"Cortex Agents API: {len(tools_used)} tool(s) called, {len(full_text)} chars response")
    return {
        "response": full_text.strip(),
        "intent": "agent",
        "tools_called": tools_used,
        "via_cortex_agents": True,
    }


# ── Agent Orchestration ──────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Ask EX, an Employee Experience AI assistant built on Snowflake Intelligence.
You help employees with HR questions, IT support, policy lookups, performance reviews,
learning & development, benefits, expenses, and manager analytics.

RULES:
1. Always ground answers in retrieved data — never fabricate numbers or policies.
2. Cite your source in every answer: policy name + version, or the SQL / data retrieved.
3. For personal data ("my leave", "my review", "my expenses"), filter by the requesting employee's EMP_ID.
4. For manager queries ("my team"), use MANAGER_ID to scope the data.
5. If you cannot find an answer, say so clearly and suggest who to contact (e.g., hr@company.com).
6. Never expose salary data unless the user role is EX_CHATBOT_ADMIN.
7. When an action was executed (ticket created, expense submitted), confirm clearly with the ID and next steps.
8. Keep responses concise. Use markdown: **bold** for key figures, tables for comparisons, bullet lists for steps.
9. Be warm and professional. End with 1–2 suggested follow-up questions as chips."""


def classify_intent(question: str) -> str:
    """
    LLM-based intent classification using a small fast model.
    Falls back to keyword matching if LLM call fails.
    """
    prompt = (
        'Classify this employee question into exactly one intent label. Return ONLY a JSON object.\n\n'
        f'Question: "{question}"\n\n'
        'Intent labels:\n'
        '- "analyst": questions about data, numbers, balances, counts, trends, lists '
        '  (leave days, ticket count, attrition rate, L&D budget, performance rating, expenses, benefits, headcount)\n'
        '- "search": questions about policies, rules, procedures, guidelines, entitlements, "how do I", "what is the policy"\n'
        '- "action_ticket": wants to create or raise an IT support ticket\n'
        '- "action_leave": wants to apply for, request, or book leave / time off\n'
        '- "action_expense": wants to submit an expense claim or reimbursement\n'
        '- "general": greeting, thank you, or unclear intent\n\n'
        'Return JSON: {"intent": "<label>", "confidence": 0.0-1.0}\nJSON:'
    )
    try:
        result = execute_query(
            "SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s) AS r",
            ("llama3.1-8b", prompt)
        )
        raw = str(result[0].get("R", "")) if result else ""
        match = re.search(r'\{[^}]+\}', raw)
        if match:
            data = json.loads(match.group())
            intent = data.get("intent", "search")
            if intent in ("analyst", "search", "action_ticket", "action_leave", "action_expense", "general"):
                return intent
    except Exception as e:
        logger.warning(f"LLM classification failed, using keyword fallback: {e}")

    # Keyword fallback
    q = question.lower()
    if any(kw in q for kw in ["raise a ticket", "create a ticket", "open a ticket", "log a ticket", "it issue", "report an issue"]):
        return "action_ticket"
    if any(kw in q for kw in ["apply for leave", "book leave", "request leave", "take time off", "book time off", "days off"]):
        return "action_leave"
    if any(kw in q for kw in ["submit expense", "claim expense", "expense report", "reimburse", "reimbursement"]):
        return "action_expense"
    if any(kw in q for kw in ["how many", "show me", "count", "total", "balance", "headcount",
                                "attrition", "trend", "quarter", "remaining", "budget", "rating",
                                "review status", "my benefits", "my expenses", "my tickets"]):
        return "analyst"
    if any(kw in q for kw in ["policy", "how do i", "what is the", "procedure", "guideline",
                                "allowed", "permitted", "entitlement", "parental", "equity", "rsu",
                                "vpn", "code of conduct", "referral bonus"]):
        return "search"
    return "search"


def _extract_params_via_llm(prompt: str) -> dict:
    """Helper: call Cortex COMPLETE and parse the first JSON object from the response."""
    try:
        result = execute_query(
            "SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s) AS r",
            ("llama3.1-8b", prompt)
        )
        raw = str(result[0].get("R", "")) if result else ""
        match = re.search(r'\{.*?\}', raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.warning(f"Param extraction failed: {e}")
    return {}


def extract_ticket_params(question: str) -> dict:
    prompt = (
        'Extract IT support ticket parameters from this request. Return ONLY valid JSON.\n\n'
        f'Request: "{question}"\n\n'
        'Rules:\n'
        '- category: one of [Software, Hardware, Network, Access, Security, Other]\n'
        '- subcategory: specific topic (e.g. "VPN", "GitHub Access", "License Request", "Laptop", "Password Reset")\n'
        '- priority: P1=Critical/Service Down, P2=High/Significant Impact, P3=Medium/Normal, P4=Low/Minor\n'
        '- summary: clear 1-sentence description of the issue (max 120 chars)\n\n'
        'Return JSON: {"category": "...", "subcategory": "...", "priority": "P3", "summary": "..."}\nJSON:'
    )
    defaults = {"category": "Other", "subcategory": "General", "priority": "P3", "summary": question[:120]}
    params = _extract_params_via_llm(prompt)
    return {**defaults, **params}


def extract_leave_params(question: str) -> dict:
    prompt = (
        'Extract leave request parameters from this request. Return ONLY valid JSON.\n\n'
        f'Request: "{question}"\n\n'
        'Rules:\n'
        '- leave_type: one of [Annual Leave, Sick Leave, Parental Leave, Bereavement Leave, Unpaid Leave]\n'
        '- start_date: ISO date string YYYY-MM-DD if mentioned, else null\n'
        '- end_date: ISO date string YYYY-MM-DD if mentioned, else null\n'
        '- days_requested: number of days if mentioned, else null\n'
        '- reason: brief reason if given, else null\n\n'
        'Return JSON: {"leave_type": "Annual Leave", "start_date": null, "end_date": null, '
        '"days_requested": null, "reason": null}\nJSON:'
    )
    defaults = {"leave_type": "Annual Leave", "start_date": None, "end_date": None, "days_requested": None, "reason": None}
    params = _extract_params_via_llm(prompt)
    return {**defaults, **params}


def extract_expense_params(question: str) -> dict:
    prompt = (
        'Extract expense report parameters from this request. Return ONLY valid JSON.\n\n'
        f'Request: "{question}"\n\n'
        'Rules:\n'
        '- category: one of [Travel, Meals, Software, Hardware, Training, Conference, Other]\n'
        '- amount: numeric value if mentioned, else null\n'
        '- currency: ISO currency code, default "USD"\n'
        '- description: brief description of what was purchased\n'
        '- report_name: short name for the expense report\n\n'
        'Category policy limits: Travel=800, Meals=400, Software=100, Hardware=150, Training=500, Conference=2000\n\n'
        'Return JSON: {"category": "Other", "amount": null, "currency": "USD", '
        '"description": "...", "report_name": "Expense Claim"}\nJSON:'
    )
    policy_limits = {"Travel": 800, "Meals": 400, "Software": 100, "Hardware": 150, "Training": 500, "Conference": 2000, "Other": 500}
    defaults = {"category": "Other", "amount": None, "currency": "USD", "description": question[:200], "report_name": "Expense Claim"}
    params = _extract_params_via_llm(prompt)
    merged = {**defaults, **params}
    merged["policy_limit"] = policy_limits.get(merged.get("category", "Other"), 500)
    return merged


# ── Action Executors ─────────────────────────────────────────────────────────

def create_it_ticket(params: dict, emp_id: str) -> dict:
    ticket_id = f"INC-{random.randint(90000, 99999)}"
    assigned = {
        "Software": "IT Operations", "Hardware": "Hardware Support",
        "Network": "Network Operations", "Access": "IAM Team",
        "Security": "Security Team",
    }.get(params.get("category", "Other"), "IT Operations")
    execute_query(
        """INSERT INTO EX_CHATBOT.HR_DATA.IT_TICKETS
           (TICKET_ID, EMP_ID, CATEGORY, SUBCATEGORY, PRIORITY, SUMMARY, STATUS, ASSIGNED_GROUP)
           VALUES (%s, %s, %s, %s, %s, %s, 'Open', %s)""",
        (ticket_id, emp_id, params.get("category"), params.get("subcategory"),
         params.get("priority", "P3"), params.get("summary"), assigned)
    )
    return {"ticket_id": ticket_id, "status": "Open", "assigned_to": assigned,
            "priority": params.get("priority", "P3")}


def submit_leave_request(params: dict, emp_id: str) -> dict:
    request_id = f"LVR-{random.randint(10000, 99999)}"
    execute_query(
        """INSERT INTO EX_CHATBOT.HR_DATA.LEAVE_REQUESTS
           (REQUEST_ID, EMP_ID, LEAVE_TYPE, START_DATE, END_DATE, DAYS_REQUESTED, REASON, STATUS)
           VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')""",
        (request_id, emp_id, params.get("leave_type", "Annual Leave"),
         params.get("start_date"), params.get("end_date"),
         params.get("days_requested"), params.get("reason"))
    )
    return {"request_id": request_id, "status": "Pending", "leave_type": params.get("leave_type"),
            "days_requested": params.get("days_requested")}


def submit_expense(params: dict, emp_id: str) -> dict:
    expense_id = f"EXP-{random.randint(9000, 9999)}"
    execute_query(
        """INSERT INTO EX_CHATBOT.HR_DATA.EXPENSE_REPORTS
           (EXPENSE_ID, EMP_ID, REPORT_NAME, CATEGORY, AMOUNT, CURRENCY,
            EXPENSE_DATE, DESCRIPTION, POLICY_LIMIT, STATUS, SUBMITTED_AT)
           VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE(), %s, %s, 'Submitted', CURRENT_TIMESTAMP())""",
        (expense_id, emp_id, params.get("report_name", "Expense Claim"),
         params.get("category", "Other"), params.get("amount", 0),
         params.get("currency", "USD"), params.get("description", ""),
         params.get("policy_limit", 500))
    )
    within = (params.get("amount") or 0) <= params.get("policy_limit", 500)
    return {"expense_id": expense_id, "status": "Submitted",
            "amount": params.get("amount"), "within_policy": within}


async def process_message(question: str, emp_id: str = "EMP-4821", session_id: str = None, history: list = None) -> dict:
    start = time.time()
    intent = classify_intent(question)
    tools_called = []
    context_parts = []
    action_result = None

    # ── Q&A intents → Cortex Agents API (Snowflake Intelligence) ────────────
    # The agent autonomously selects Cortex Search or Cortex Analyst based on
    # the question. Action intents (ticket/leave/expense) bypass this because
    # they write to Snowflake tables and need local parameter extraction.
    if intent not in ("action_ticket", "action_leave", "action_expense"):
        try:
            agent_result = await call_cortex_agent_api(question, emp_id, history)
            latency_ms = int((time.time() - start) * 1000)
            try:
                log_interaction(
                    session_id=session_id or str(uuid.uuid4()),
                    emp_id=emp_id,
                    user_message=question,
                    agent_response=agent_result["response"],
                    tools_called=agent_result["tools_called"],
                    latency_ms=latency_ms,
                )
            except Exception as log_err:
                logger.warning(f"Audit log failed (non-fatal): {log_err}")
            return {
                "response": agent_result["response"],
                "intent": "agent",
                "tools_called": agent_result["tools_called"],
                "latency_ms": latency_ms,
                "session_id": session_id,
                "action_result": None,
                "via_cortex_agents": True,
            }
        except Exception as agent_err:
            logger.warning(
                f"Cortex Agents API unavailable "
                f"({type(agent_err).__name__}: {agent_err!s:.200}). "
                f"Falling back to manual orchestration."
            )
            # Fall through — the existing if/elif chain below handles the request

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

        elif intent == "action_ticket":
            params = extract_ticket_params(question)
            tools_called.append({"tool": "extract_ticket_params", "params": params})
            action_result = create_it_ticket(params, emp_id)
            tools_called.append({"tool": "create_it_ticket", "result": action_result})
            # Also search for relevant policy context
            docs = cortex_search(question, limit=1)
            if docs:
                context_parts.append(f"IT Policy: {docs[0].get('CONTENT', '')[:800]}")
            context_parts.append(
                f"ACTION EXECUTED — IT Ticket Created:\n"
                f"Ticket ID: {action_result['ticket_id']}\n"
                f"Priority: {action_result['priority']}\n"
                f"Category: {params.get('category')} / {params.get('subcategory')}\n"
                f"Summary: {params.get('summary')}\n"
                f"Assigned to: {action_result['assigned_to']}\n"
                f"Status: Open"
            )

        elif intent == "action_leave":
            params = extract_leave_params(question)
            tools_called.append({"tool": "extract_leave_params", "params": params})
            # Check current leave balance before submitting
            balance_r = cortex_analyst(
                f"Show leave balance for employee {emp_id} in fiscal year 2026", emp_id
            )
            tools_called.append({"tool": "cortex_analyst", "purpose": "leave_balance_check"})
            if balance_r.get("result"):
                context_parts.append(f"Current leave balance:\n{json.dumps(balance_r['result'], default=str)}")
            action_result = submit_leave_request(params, emp_id)
            tools_called.append({"tool": "submit_leave_request", "result": action_result})
            # Policy context
            docs = cortex_search("leave application process parental sick annual", limit=1)
            if docs:
                context_parts.append(f"Leave Policy: {docs[0].get('CONTENT', '')[:600]}")
            context_parts.append(
                f"ACTION EXECUTED — Leave Request Submitted:\n"
                f"Request ID: {action_result['request_id']}\n"
                f"Leave Type: {action_result['leave_type']}\n"
                f"Days Requested: {action_result.get('days_requested', 'TBD')}\n"
                f"Status: Pending manager approval"
            )

        elif intent == "action_expense":
            params = extract_expense_params(question)
            tools_called.append({"tool": "extract_expense_params", "params": params})
            action_result = submit_expense(params, emp_id)
            tools_called.append({"tool": "submit_expense", "result": action_result})
            # Policy context
            docs = cortex_search("expense reimbursement policy limits", limit=1)
            if docs:
                context_parts.append(f"Expense Policy: {docs[0].get('CONTENT', '')[:600]}")
            within_str = "within policy limits" if action_result.get("within_policy") else "EXCEEDS policy limit"
            context_parts.append(
                f"ACTION EXECUTED — Expense Submitted:\n"
                f"Expense ID: {action_result['expense_id']}\n"
                f"Category: {params.get('category')}\n"
                f"Amount: {params.get('currency', 'USD')} {action_result.get('amount')}\n"
                f"Policy Limit: {params.get('policy_limit')}\n"
                f"Policy Check: {within_str}\n"
                f"Status: Submitted — pending manager approval"
            )

        else:  # general / fallback
            docs = cortex_search(question)
            tools_called.append({"tool": "cortex_search", "results_count": len(docs)})
            for doc in docs:
                context_parts.append(
                    f"Source: {doc.get('TITLE', 'Unknown')} (v{doc.get('VERSION', '?')})\n"
                    f"Content: {doc.get('CONTENT', '')[:1500]}"
                )

        retrieval_context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant data found."

        history_text = ""
        if history:
            turns = "\n".join(
                f"{m['role'].upper()}: {m['content'][:500]}"
                for m in history[-6:]
            )
            history_text = f"CONVERSATION HISTORY (for context only):\n{turns}\n\n"

        prompt = f"""{history_text}Based on the retrieved context below, respond to the employee's message.
Employee ID: {emp_id}

RETRIEVED CONTEXT:
{retrieval_context}

EMPLOYEE MESSAGE:
{question}

Instructions: cite your sources, be concise, use markdown formatting. If an action was executed, confirm clearly with the ID returned and explain next steps."""

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
            "action_result": action_result,
        }

    except Exception as e:
        logger.error(f"Processing error: {e}", exc_info=True)
        return {
            "response": "I'm sorry, I encountered an error. Please try again or contact the IT Help Desk.",
            "intent": intent,
            "tools_called": tools_called,
            "latency_ms": int((time.time() - start) * 1000),
            "action_result": None,
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
    action_result: Optional[dict] = None
    via_cortex_agents: Optional[bool] = None

class TicketRequest(BaseModel):
    emp_id: str
    category: str
    subcategory: str
    priority: str = "P3"
    summary: str

class LeaveRequest(BaseModel):
    emp_id: str
    leave_type: str = "Annual Leave"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_requested: Optional[float] = None
    reason: Optional[str] = None

class ExpenseRequest(BaseModel):
    emp_id: str
    category: str
    amount: float
    currency: str = "USD"
    description: str
    report_name: str = "Expense Claim"

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


@app.post("/api/actions/ticket")
async def action_create_ticket(req: TicketRequest):
    """Create an IT support ticket directly (without going through chat)."""
    params = {"category": req.category, "subcategory": req.subcategory,
              "priority": req.priority, "summary": req.summary}
    result = create_it_ticket(params, req.emp_id)
    return result


@app.post("/api/actions/leave")
async def action_submit_leave(req: LeaveRequest):
    """Submit a leave request directly."""
    params = {"leave_type": req.leave_type, "start_date": req.start_date,
              "end_date": req.end_date, "days_requested": req.days_requested,
              "reason": req.reason}
    result = submit_leave_request(params, req.emp_id)
    return result


@app.post("/api/actions/expense")
async def action_submit_expense(req: ExpenseRequest):
    """Submit an expense report directly."""
    policy_limits = {"Travel": 800, "Meals": 400, "Software": 100,
                     "Hardware": 150, "Training": 500, "Conference": 2000}
    params = {"category": req.category, "amount": req.amount, "currency": req.currency,
              "description": req.description, "report_name": req.report_name,
              "policy_limit": policy_limits.get(req.category, 500)}
    result = submit_expense(params, req.emp_id)
    return result


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


# ══════════════════════════════════════════════════════════════════════════════
# MULTI-AGENT TRAVEL ORCHESTRATOR
# ══════════════════════════════════════════════════════════════════════════════

# Realistic flight options keyed by destination keyword
_FLIGHTS = {
    "new york": [("Delta", "DL 412", "07:30", "15:45", 387), ("United", "UA 581", "09:15", "17:30", 342)],
    "chicago":  [("American", "AA 274", "08:00", "12:30", 289), ("United", "UA 310", "10:30", "15:00", 312)],
    "london":   [("British Airways", "BA 284", "11:00", "23:15", 890), ("Virgin", "VS 025", "14:30", "02:45+1", 975)],
    "seattle":  [("Alaska", "AS 441", "07:00", "09:15", 198), ("Delta", "DL 738", "12:00", "14:20", 215)],
    "austin":   [("Southwest", "WN 1832", "08:20", "12:45", 175), ("United", "UA 419", "10:00", "14:30", 210)],
}
_HOTELS = {
    "new york": [("Marriott Marquis Times Square", "Midtown Manhattan", 289), ("Hilton Midtown", "Midtown Manhattan", 265)],
    "chicago":  [("Loews Chicago Hotel", "Streeterville", 215), ("Hyatt Regency Chicago", "The Loop", 235)],
    "london":   [("The Hoxton Southwark", "South Bank", 195), ("Marriott London Park Lane", "Mayfair", 320)],
    "seattle":  [("Hyatt Regency Seattle", "Downtown", 185), ("Kimpton Hotel Monaco", "Downtown", 210)],
    "austin":   [("The LINE Austin", "Downtown", 165), ("Hyatt Place Austin Downtown", "Downtown", 178)],
}

def _match_city(destination: str) -> str:
    dest = destination.lower()
    for key in _FLIGHTS:
        if key in dest:
            return key
    return "new york"


async def _safe_send(ws: WebSocket, lock: asyncio.Lock, data: dict):
    async with lock:
        await ws.send_json(data)


async def _agent_flight(ws, lock, request_id, emp_id, destination, start_date, end_date):
    city = _match_city(destination)
    airline, flight_no, dep, arr, cost = _FLIGHTS.get(city, _FLIGHTS["new york"])[0]

    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "flight", "status": "working",
        "message": f"Searching {city.title()} flights — comparing {len(_FLIGHTS.get(city, _FLIGHTS['new york']))} options..."
    })
    await asyncio.sleep(3.2)

    booking_id = f"BK-FL-{random.randint(10000, 99999)}"
    booking_ref = f"{airline[:2].upper()}-{random.randint(100000, 999999)}"
    details = json.dumps({
        "airline": airline, "flight_number": flight_no,
        "departure": str(start_date), "departure_time": dep,
        "arrival": str(start_date), "arrival_time": arr,
        "class": "Economy", "booking_ref": booking_ref
    })
    try:
        execute_query(
            """INSERT INTO EX_CHATBOT.HR_DATA.TRAVEL_BOOKINGS
               (BOOKING_ID, REQUEST_ID, EMP_ID, BOOKING_TYPE, VENDOR, BOOKING_REF,
                DETAILS, CHECK_IN, CHECK_OUT, COST)
               VALUES (%s, %s, %s, 'Flight', %s, %s, PARSE_JSON(%s), %s, %s, %s)""",
            (booking_id, request_id, emp_id, airline, booking_ref, details, start_date, start_date, cost)
        )
    except Exception as e:
        logger.warning(f"Flight booking DB write failed (non-fatal): {e}")

    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "flight", "status": "done",
        "message": f"{airline} {flight_no} · {dep} → {arr} · Confirmed",
        "result": {"airline": airline, "flight": flight_no, "departure": dep,
                   "arrival": arr, "cost": cost, "ref": booking_ref}
    })
    return cost


async def _agent_hotel(ws, lock, request_id, emp_id, destination, start_date, end_date):
    city = _match_city(destination)
    hotel_name, area, nightly = _HOTELS.get(city, _HOTELS["new york"])[0]

    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "hotel", "status": "working",
        "message": f"Finding hotels near {area} — checking availability..."
    })
    await asyncio.sleep(4.8)

    nights = max((end_date - start_date).days, 1)
    total_cost = nightly * nights
    booking_id = f"BK-HT-{random.randint(10000, 99999)}"
    booking_ref = f"HTL-{random.randint(100000, 999999)}"
    details = json.dumps({
        "hotel": hotel_name, "area": area,
        "check_in": str(start_date), "check_out": str(end_date),
        "nights": nights, "rate_per_night": nightly, "booking_ref": booking_ref
    })
    try:
        execute_query(
            """INSERT INTO EX_CHATBOT.HR_DATA.TRAVEL_BOOKINGS
               (BOOKING_ID, REQUEST_ID, EMP_ID, BOOKING_TYPE, VENDOR, BOOKING_REF,
                DETAILS, CHECK_IN, CHECK_OUT, COST)
               VALUES (%s, %s, %s, 'Hotel', %s, %s, PARSE_JSON(%s), %s, %s, %s)""",
            (booking_id, request_id, emp_id, hotel_name, booking_ref, details, start_date, end_date, total_cost)
        )
    except Exception as e:
        logger.warning(f"Hotel booking DB write failed (non-fatal): {e}")

    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "hotel", "status": "done",
        "message": f"{hotel_name} · {nights} night{'s' if nights > 1 else ''} · ${nightly}/night · Confirmed",
        "result": {"hotel": hotel_name, "area": area, "nights": nights,
                   "cost_per_night": nightly, "total": total_cost, "ref": booking_ref}
    })
    return total_cost


async def _agent_calendar(ws, lock, request_id, emp_id, start_date, end_date):
    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "calendar", "status": "working",
        "message": "Scanning calendar for conflicts on requested dates..."
    })
    await asyncio.sleep(1.6)

    # Check for existing leave or calendar conflicts
    conflicts = []
    try:
        rows = execute_query(
            """SELECT LEAVE_TYPE, PRE_APPROVED
               FROM EX_CHATBOT.HR_DATA.EMPLOYEE_LEAVE
               WHERE EMP_ID = %s AND FISCAL_YEAR = 2026 AND PRE_APPROVED > 0""",
            (emp_id,)
        )
        if rows:
            conflicts = [r["LEAVE_TYPE"] for r in rows]
    except Exception:
        pass

    block_id = f"CAL-{random.randint(10000, 99999)}"
    try:
        execute_query(
            """INSERT INTO EX_CHATBOT.HR_DATA.CALENDAR_BLOCKS
               (BLOCK_ID, EMP_ID, TITLE, START_DATE, END_DATE, BLOCK_TYPE, REFERENCE_ID)
               VALUES (%s, %s, %s, %s, %s, 'Travel', %s)""",
            (block_id, emp_id, f"Business Travel", start_date, end_date, request_id)
        )
    except Exception as e:
        logger.warning(f"Calendar block DB write failed (non-fatal): {e}")

    conflict_note = f" · Note: pre-approved leave exists ({', '.join(conflicts)})" if conflicts else ""
    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "calendar", "status": "done",
        "message": f"No date conflicts found · {start_date} – {end_date} blocked{conflict_note}",
        "result": {"conflicts": len(conflicts) > 0, "block_id": block_id,
                   "start": str(start_date), "end": str(end_date)}
    })
    return 0


async def _agent_budget(ws, lock, request_id, emp_id, destination, start_date, end_date):
    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "budget", "status": "working",
        "message": "Checking travel policy limits and YTD spend..."
    })
    await asyncio.sleep(2.5)

    # Query year-to-date travel expenses
    ytd_spend = 0
    try:
        rows = execute_query(
            """SELECT COALESCE(SUM(AMOUNT), 0) AS YTD
               FROM EX_CHATBOT.HR_DATA.EXPENSE_REPORTS
               WHERE EMP_ID = %s AND CATEGORY = 'Travel'
               AND FISCAL_YEAR(EXPENSE_DATE) = 2026""",
            (emp_id,)
        )
        if rows:
            ytd_spend = float(rows[0].get("YTD", 0) or 0)
    except Exception:
        ytd_spend = 772  # fallback demo value

    city = _match_city(destination)
    _, _, flight_cost = list(_FLIGHTS.get(city, _FLIGHTS["new york"])[0][0:3]) + [_FLIGHTS.get(city, _FLIGHTS["new york"])[0][4]]
    flight_cost = _FLIGHTS.get(city, _FLIGHTS["new york"])[0][4]
    hotel_cost = _HOTELS.get(city, _HOTELS["new york"])[0][2] * max((end_date - start_date).days, 1)
    estimated_total = flight_cost + hotel_cost
    policy_limit = 2000
    compliant = estimated_total <= policy_limit

    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "budget", "status": "done",
        "message": f"Est. ${estimated_total:,} · Policy limit ${policy_limit:,} · {'✓ Within limits' if compliant else '⚠ Exceeds limit'}",
        "result": {"estimated_total": estimated_total, "policy_limit": policy_limit,
                   "ytd_travel_spend": ytd_spend, "compliant": compliant}
    })
    return 0


async def _agent_approval(ws, lock, request_id, emp_id):
    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "approval", "status": "working",
        "message": "Looking up reporting manager and sending approval request..."
    })
    await asyncio.sleep(5.5)

    # Look up manager from EMPLOYEES
    manager_name = "Your Manager"
    manager_id = None
    try:
        rows = execute_query(
            "SELECT MANAGER_ID FROM EX_CHATBOT.HR_DATA.EMPLOYEES WHERE EMP_ID = %s",
            (emp_id,)
        )
        if rows and rows[0].get("MANAGER_ID"):
            manager_id = rows[0]["MANAGER_ID"]
            mgr_rows = execute_query(
                "SELECT FULL_NAME FROM EX_CHATBOT.HR_DATA.EMPLOYEES WHERE EMP_ID = %s",
                (manager_id,)
            )
            if mgr_rows:
                manager_name = mgr_rows[0].get("FULL_NAME", manager_name)
    except Exception:
        pass

    approval_id = f"APR-{random.randint(10000, 99999)}"
    try:
        execute_query(
            """INSERT INTO EX_CHATBOT.HR_DATA.APPROVAL_REQUESTS
               (APPROVAL_ID, REQUEST_TYPE, REFERENCE_ID, EMP_ID, APPROVER_ID, STATUS)
               VALUES (%s, 'Travel', %s, %s, %s, 'Pending')""",
            (approval_id, request_id, emp_id, manager_id)
        )
    except Exception as e:
        logger.warning(f"Approval request DB write failed (non-fatal): {e}")

    await _safe_send(ws, lock, {
        "type": "agent_update", "agent_id": "approval", "status": "pending",
        "message": f"Approval request sent to {manager_name} · Expected within 2 hours",
        "result": {"approver": manager_name, "approval_id": approval_id, "eta": "2 hours"}
    })
    return 0


class TravelRequest(BaseModel):
    emp_id: str = "EMP-4821"
    destination: str
    purpose: str = "Business travel"
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD


@app.websocket("/ws/travel")
async def travel_orchestrator_ws(websocket: WebSocket):
    """
    Multi-agent travel orchestrator via WebSocket.
    Runs 5 agents concurrently; streams real-time progress to the client.
    """
    await websocket.accept()
    lock = asyncio.Lock()
    try:
        data = await websocket.receive_json()
        emp_id     = data.get("emp_id", "EMP-4821")
        destination = data.get("destination", "")
        purpose    = data.get("purpose", "Business travel")
        start_str  = data.get("start_date", "")
        end_str    = data.get("end_date", "")

        from datetime import date as _date
        start_date = datetime.strptime(start_str, "%Y-%m-%d").date() if start_str else _date.today()
        end_date   = datetime.strptime(end_str,   "%Y-%m-%d").date() if end_str   else start_date

        # Create travel request record
        request_id = f"TRV-{random.randint(10000, 99999)}"
        try:
            execute_query(
                """INSERT INTO EX_CHATBOT.HR_DATA.TRAVEL_REQUESTS
                   (REQUEST_ID, EMP_ID, DESTINATION, PURPOSE, START_DATE, END_DATE, STATUS)
                   VALUES (%s, %s, %s, %s, %s, %s, 'Processing')""",
                (request_id, emp_id, destination, purpose, start_date, end_date)
            )
        except Exception as e:
            logger.warning(f"Travel request insert failed (non-fatal): {e}")

        await _safe_send(websocket, lock, {
            "type": "started", "request_id": request_id,
            "destination": destination, "start_date": start_str, "end_date": end_str
        })

        # Run all 5 agents concurrently
        costs = await asyncio.gather(
            _agent_flight(   websocket, lock, request_id, emp_id, destination, start_date, end_date),
            _agent_hotel(    websocket, lock, request_id, emp_id, destination, start_date, end_date),
            _agent_calendar( websocket, lock, request_id, emp_id, start_date, end_date),
            _agent_budget(   websocket, lock, request_id, emp_id, destination, start_date, end_date),
            _agent_approval( websocket, lock, request_id, emp_id),
        )

        total_cost = sum(c for c in costs if c)

        try:
            execute_query(
                """UPDATE EX_CHATBOT.HR_DATA.TRAVEL_REQUESTS
                   SET STATUS = 'Pending Approval', TOTAL_COST = %s WHERE REQUEST_ID = %s""",
                (total_cost, request_id)
            )
        except Exception:
            pass

        await _safe_send(websocket, lock, {
            "type": "complete",
            "request_id": request_id,
            "total_cost": total_cost,
            "destination": destination,
            "message": (
                f"Your {destination} trip is arranged! Flight and hotel are confirmed, "
                f"calendar is blocked, and the approval request has been sent to your manager. "
                f"Total estimated cost: ${total_cost:,}. You'll be notified once approved."
            )
        })

    except WebSocketDisconnect:
        logger.info("Travel agent WebSocket disconnected.")
    except Exception as e:
        logger.error(f"Travel orchestrator error: {e}", exc_info=True)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("APP_PORT", 8000))
    uvicorn.run("main:app", host=os.getenv("APP_HOST", "0.0.0.0"), port=port, reload=True)
