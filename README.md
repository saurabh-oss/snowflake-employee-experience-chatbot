# Ask EX — Employee Experience AI Chatbot

[![Snowflake](https://img.shields.io/badge/Snowflake-Cortex%20AI-29B5E8?logo=snowflake&logoColor=white)](https://docs.snowflake.com/en/guides-overview-ai-features)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Built on Snowflake Cortex AI**
> A proof-of-concept employee experience chatbot that keeps all data, inference, and governance inside the Snowflake perimeter. Employees ask natural-language questions about leave, policies, IT tickets, and team analytics — and receive grounded, cited answers.

---

## What This PoC Demonstrates

| Snowflake Component | Role |
|---|---|
| **Cortex Search** | Hybrid (semantic + keyword) retrieval over HR policy documents |
| **Cortex Analyst** | Natural-language → governed SQL on employee tables via a semantic model |
| **Cortex COMPLETE** | LLM synthesis — combines retrieved context into a conversational answer |
| **Horizon Catalog** | Governance: column masking (salary, email), row-access policies, audit log |

**Open-source stack:**

| Tool | Purpose |
|---|---|
| FastAPI (Python) | Backend REST API + WebSocket endpoint |
| React | Responsive chat UI (desktop + mobile) |
| Snowflake Connector for Python | SQL execution + Cortex function calls |

---

## Project Structure

```
snowflake-employee-experience-chatbot/
├── README.md                          ← You are here
├── ARCHITECTURE.md                    ← Architecture decisions, trade-offs, risks
├── .env.example                       ← Environment variables template (copy to .env)
├── .gitignore
│
├── snowflake/                         ← Run these scripts in order in Snowsight
│   ├── 01_setup_database.sql          ← Database, schemas, roles, warehouses, RBAC
│   ├── 02_create_tables_and_data.sql  ← Employee tables, sample data, masking policies
│   ├── 03_cortex_search.sql           ← Cortex Search service over policy documents
│   ├── 04_semantic_model.yaml         ← Cortex Analyst semantic model (upload to stage)
│   └── 05_cortex_agent.sql            ← Audit log table
│
├── backend/
│   ├── main.py                        ← FastAPI server + Cortex orchestration logic
│   └── requirements.txt               ← Python dependencies
│
└── frontend/
    ├── package.json
    ├── public/index.html
    └── src/
        ├── index.jsx
        └── App.jsx                    ← Chat UI — responsive, works in browser and mobile
```

---

## Prerequisites

- **Snowflake account** with Cortex AI enabled (trial works — see Step 1)
- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/) (for the React frontend)
- **OpenSSL** — available on macOS/Linux by default; on Windows install via [Git for Windows](https://git-scm.com/) or [Win32 OpenSSL](https://slproweb.com/products/Win32OpenSSL.html)

---

## Step 1 — Get a Snowflake Account

1. Sign up at [signup.snowflake.com](https://signup.snowflake.com/) — choose **Enterprise** edition
2. Pick a region where Cortex AI is available. Confirmed working:
   - **AWS:** US West (Oregon), US East (N. Virginia), EU (Frankfurt)
   - **Azure:** East US 2, West Europe
   - Full matrix: [docs.snowflake.com → Cortex region availability](https://docs.snowflake.com/en/user-guide/snowflake-cortex/llm-functions#region-availability)
3. Note your **account identifier** from the URL after login — you'll need it for `.env`

> The 30-day trial includes $400 in free credits — more than enough for this PoC.

---

## Step 2 — Run the Snowflake Setup Scripts

Open **Snowsight** (`app.snowflake.com`) and run the scripts below in order using a SQL Worksheet. Run as `ACCOUNTADMIN`.

### 2a — Foundation (`01_setup_database.sql`)
Creates the `EX_CHATBOT` database, four schemas, two XS warehouses (auto-suspend 60s), and the RBAC role hierarchy (`EX_CHATBOT_ADMIN` → `EX_CHATBOT_APP` → `EX_CHATBOT_USER`).

### 2b — Tables and data (`02_create_tables_and_data.sql`)
Creates the employee directory, leave balances, IT tickets, and attrition fact tables with sample data for 8 employees across 3 regions. Adds column masking (salary, email) and a row-access policy on leave data.

### 2c — Cortex Search (`03_cortex_search.sql`)
Inserts four sample HR policies (Global Mobility, Annual Leave, IT Acceptable Use, Code of Conduct) and creates the `EX_POLICY_SEARCH` Cortex Search service.

> Wait **2–3 minutes** after this step for the search index to build before testing.

### 2d — Upload the semantic model (`04_semantic_model.yaml`)

The file must be uploaded to the stage created in step 2a. Do this in Snowsight:

1. Navigate to **Data → Databases → EX_CHATBOT → PUBLIC → Stages → SEMANTIC_MODELS**
2. Click **+ Files** and upload `snowflake/04_semantic_model.yaml`

Or via SnowSQL:
```bash
snowsql -a <your-account> -u <your-user> \
  -q "PUT file://snowflake/04_semantic_model.yaml @EX_CHATBOT.PUBLIC.SEMANTIC_MODELS AUTO_COMPRESS=FALSE OVERWRITE=TRUE;"
```

### 2e — Audit log (`05_cortex_agent.sql`)
Creates the `AUDIT.INTERACTION_LOG` table that captures every prompt, tool call, and response.

---

## Step 3 — Verify Cortex Is Working

Run these in a Snowsight SQL Worksheet:

```sql
-- LLM inference (should return a short response)
SELECT SNOWFLAKE.CORTEX.COMPLETE('llama3.1-70b', 'Reply with just the word: pong') AS test;

-- Cortex Search (should return policy chunks)
SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
  'EX_CHATBOT.KNOWLEDGE_BASE.EX_POLICY_SEARCH',
  '{"query": "remote work from abroad", "columns": ["TITLE","CONTENT"], "limit": 2}'
);

-- Column masking (salary should be NULL for the APP role)
USE ROLE EX_CHATBOT_APP;
SELECT EMP_ID, FULL_NAME, SALARY FROM EX_CHATBOT.HR_DATA.EMPLOYEES LIMIT 3;
```

---

## Step 4 — Set Up Key-Pair Authentication

The backend uses **RSA key-pair authentication** to connect to Snowflake and to call the Cortex Analyst REST API. Password-only auth doesn't support the REST API.

### Generate the key pair

```bash
# Generate a 2048-bit RSA private key (no passphrase — required for unattended service)
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out snowflake_private_key.pem

# Extract the public key
openssl rsa -in snowflake_private_key.pem -pubout -out snowflake_public_key.pem
```

> `snowflake_private_key.pem` is listed in `.gitignore` — it will never be committed.

### Register the public key with Snowflake

Run this in Snowsight (as `ACCOUNTADMIN`), replacing the key content:

```sql
ALTER USER YOUR_USERNAME SET RSA_PUBLIC_KEY='MIIBIjANBgkqhkiG9w0BAQEF...
...your public key content here (without -----BEGIN/END lines)...';
```

To get just the key body (without the header/footer lines):
```bash
# macOS / Linux
grep -v -- "-----" snowflake_public_key.pem | tr -d '\n'

# Windows PowerShell
(Get-Content snowflake_public_key.pem | Where-Object { $_ -notmatch "^-----" }) -join ""
```

---

## Step 5 — Configure and Run the Backend

```bash
# 1. Create and activate a Python virtual environment
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\activate

# 2. Install dependencies
python -m pip install -r backend/requirements.txt

# 3. Copy the env template and fill in your values
cp .env.example .env   # Windows: copy .env.example .env
```

Edit `.env` with your values — the key fields:

```ini
SNOWFLAKE_ACCOUNT=YOUR-ORG-ACCOUNTNAME
SNOWFLAKE_USER=YOUR_USERNAME
SNOWFLAKE_PRIVATE_KEY_PATH=/absolute/path/to/snowflake_private_key.pem
CORTEX_MODEL=llama3.1-70b
```

> **Account format:** New Snowflake accounts use `ORGNAME-ACCOUNTNAME` (no region suffix). Check your account URL — `https://ORGNAME-ACCOUNTNAME.snowflakecomputing.com`.

**Start the backend:**
```bash
cd backend
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Snowflake connection established.
```

**Verify:**
- `http://localhost:8000/health` → `{"status": "healthy", "snowflake_connected": true, "cortex_available": true}`
- `http://localhost:8000/docs` → FastAPI Swagger UI

**Quick API test:**
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How many leave days do I have left?", "emp_id": "EMP-4821"}'
```

---

## Step 6 — Run the Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` to point the UI at the backend:
```ini
REACT_APP_API_URL=http://localhost:8000
```

```bash
npm start
```

The app opens at `http://localhost:3000`. Without `REACT_APP_API_URL` set, the UI runs in **demo mode** with canned responses — useful for UI-only demos without a backend.

---

## Demo Scenarios

Walk through these in order for a leadership demo:

| # | Question | Cortex tool used |
|---|---|---|
| 1 | "How many leave days do I have left this year?" | Cortex Analyst → SQL |
| 2 | "What's the policy on working from another country?" | Cortex Search → Policy docs |
| 3 | "My VPN keeps disconnecting. Can you raise a ticket?" | Cortex Search + Analyst |
| 4 | "Show me attrition trends for my team over the last 4 quarters" | Cortex Analyst → SQL |

**Governance demo** — show masking policies live:
```sql
-- APP role: salary is masked (returns NULL)
USE ROLE EX_CHATBOT_APP;
SELECT FULL_NAME, SALARY FROM EX_CHATBOT.HR_DATA.EMPLOYEES;

-- ADMIN role: salary is visible
USE ROLE EX_CHATBOT_ADMIN;
SELECT FULL_NAME, SALARY FROM EX_CHATBOT.HR_DATA.EMPLOYEES;
```

**Audit trail:**
```sql
SELECT * FROM EX_CHATBOT.AUDIT.INTERACTION_LOG ORDER BY TIMESTAMP DESC LIMIT 10;
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ModuleNotFoundError: jwt` | Run `python -m pip install PyJWT cryptography` — these are required for key-pair auth |
| `snowflake_connected: false` | Check `.env` account format. New accounts use `ORGNAME-ACCOUNTNAME` with no region suffix |
| `250001: Multi-factor authentication required` | Password auth is blocked by MFA. Complete the key-pair setup in Step 4 |
| `390146: Bearer token is missing` | The private key isn't registered. Re-run the `ALTER USER SET RSA_PUBLIC_KEY` step |
| `Cortex function not found` | Your region may not support this model. Try `llama3.1-70b` or `mistral-large2` |
| `392700: unknown field in semantic model` | Re-upload `04_semantic_model.yaml` — ensure the stage path matches `@EX_CHATBOT.PUBLIC.SEMANTIC_MODELS/` |
| `Insufficient privileges` | Grant Cortex access: `GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER TO ROLE EX_CHATBOT_APP;` |
| Search service not found | Wait 2–3 min after creating the Cortex Search service for the index to build |
| `pip.exe` blocked on Windows | Use `python -m pip install ...` instead of `pip install ...` |

---

## Key Talking Points

**For the CTO / VP Engineering:**
- No new infrastructure — Cortex runs serverless inside Snowflake, no GPU provisioning
- LLMs are swappable (Llama, Mistral, Claude, Arctic) with a one-line config change
- Semantic model is version-controlled YAML — GitOps-compatible

**For the CISO / Security Lead:**
- Data never leaves Snowflake during inference — no calls to external model APIs
- RBAC, column masking, and row-access policies apply to every AI query automatically
- Full audit trail of every prompt, tool call, and retrieved row
- Snowflake does not train models on customer data

**For HR / Business Sponsor:**
- Target: 30–50% reduction in Tier-1 HR/IT ticket volume
- Employees get personalised, grounded answers in seconds
- Every answer is cited — employees can verify the source

---

## Production Roadmap

If this PoC gets a go-decision, the next phase includes:

- SSO/SCIM integration (Okta, Azure AD) for user identity propagation into Snowflake sessions
- PrivateLink for network-level isolation
- Real HRIS connector (Workday / SuccessFactors) via Snowpipe Streaming
- Slack / Teams bot channel via MCP connectors
- Eval harness: 50+ golden Q&A pairs with automated regression on every config change
- Output guardrails: PII detection, toxicity filter, hallucination scoring
- Human-in-the-loop for action-taking (leave booking, ticket escalation)
- Model-version pinning policy (GA models only in production)

---

## Notes

- The debug endpoint `GET /api/debug/analyst-token` in `backend/main.py` is useful for diagnosing Cortex Analyst connectivity. Remove it before any production or public deployment.
- `SNOWFLAKE_ROLE=ACCOUNTADMIN` works for a local PoC but should be switched to `EX_CHATBOT_APP` (with proper grants) before sharing or deploying.
- `allow_origins=["*"]` in the FastAPI CORS config is fine for local dev. Restrict it to your frontend origin in any deployed environment.
