# Ask EX — Employee Experience AI Chatbot

[![Snowflake](https://img.shields.io/badge/Snowflake-Cortex%20AI-29B5E8?logo=snowflake&logoColor=white)](https://docs.snowflake.com/en/guides-overview-ai-features)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Built on Snowflake Cortex AI**
> A proof-of-concept employee experience chatbot that keeps all data, inference, and governance inside the Snowflake perimeter. Employees ask natural-language questions about leave, policies, performance reviews, IT tickets, and team analytics — and receive grounded, cited answers. Includes a multi-agent travel automation demo with five parallel agents.

**📚 [Read the Documentation →](https://saurabh-oss.github.io/snowflake-employee-experience-chatbot/)**

---

## What This PoC Demonstrates

| Snowflake Component | Role |
|---|---|
| **Cortex AI Agents API** | Native agent orchestration via `/api/v2/cortex/agent:run` — the LLM autonomously selects Cortex Search or Cortex Analyst per question |
| **Cortex Search** | Hybrid (semantic + keyword) retrieval over 12 HR policy documents |
| **Cortex Analyst** | Natural-language → governed SQL on 10 employee tables via a semantic model |
| **Cortex COMPLETE** | LLM synthesis fallback — used for action intents and when the Agents API is unavailable |
| **Multi-agent WebSocket** | 5 parallel async agents for travel automation (custom orchestration for contrast) |
| **Horizon Catalog** | Governance: column masking (salary, email), row-access policies, audit log |

### How Cortex AI Agents powers the main chat

All Q&A requests (leave balance, policy lookup, performance review, attrition trends, etc.) flow through the Cortex Agents REST API:

```
POST https://<account>.snowflakecomputing.com/api/v2/cortex/agent:run
Authorization: Bearer <JWT>

{
  "model": "claude-sonnet-4",
  "tools": [
    { "tool_spec": { "type": "cortex_analyst_text_to_sql", "name": "hr_data_analyst",
                     "semantic_model_file": "@.../04_semantic_model.yaml" } },
    { "tool_spec": { "type": "cortex_search", "name": "policy_search",
                     "cortex_search_service": "EX_CHATBOT.KNOWLEDGE_BASE.EX_POLICY_SEARCH" } }
  ],
  "messages": [...],
  "stream": true
}
```

The agent LLM decides which tool(s) to call based on the question — no manual intent classification or routing code is needed. Results stream back as SSE events which the backend buffers and returns as JSON. If the Agents API is unavailable (region, quota, preview access), the backend falls back transparently to the original manual orchestration.

**In the UI**, responses from the Cortex Agents API show a purple ✦ **Cortex AI Agent** source badge with the tools the agent selected, followed by per-tool provenance badges (Cortex Analyst SQL, Cortex Search result count).

**Action requests** (create IT ticket, submit leave, submit expense) bypass the Agents API because they write to Snowflake tables and need local parameter extraction — these go through the manual handlers and show yellow ⚡ Action badges.

**Open-source stack:**

| Tool | Purpose |
|---|---|
| FastAPI (Python) | Backend REST API + WebSocket endpoint for multi-agent streaming |
| React | Responsive chat UI (desktop + mobile, works in demo mode without a backend) |
| Snowflake Connector for Python | SQL execution + Cortex function calls |

---

## Project Structure

```
snowflake-employee-experience-chatbot/
├── README.md
├── ARCHITECTURE.md                    ← Architecture decisions, trade-offs, risks
├── .env.example                       ← Environment variables template (copy to .env)
├── .gitignore
│
├── snowflake/                         ← Run these scripts in order in Snowsight
│   ├── 01_setup_database.sql          ← Database, schemas, roles, warehouses, RBAC
│   ├── 02_create_tables_and_data.sql  ← Core employee tables, sample data, masking policies
│   ├── 03_cortex_search.sql           ← Cortex Search service over policy documents
│   ├── 04_semantic_model.yaml         ← Cortex Analyst semantic model (upload to stage)
│   ├── 05_cortex_agent.sql            ← Audit log table
│   ├── 06_new_tables.sql              ← Extended HR tables (reviews, L&D, benefits, expenses)
│   ├── 07_extended_data.sql           ← 20+ employees, realistic scenario data
│   ├── 08_extended_policies.sql       ← 8 additional HR policy documents for Cortex Search
│   └── 09_travel_agents.sql          ← Tables for multi-agent travel automation demo
│
├── backend/
│   ├── main.py                        ← FastAPI server, Cortex orchestration, 5 travel agents
│   └── requirements.txt
│
└── frontend/
    ├── package.json
    └── src/
        ├── index.jsx
        └── App.jsx                    ← Chat UI — demo mode included, no backend required
```

---

## Prerequisites

- **Snowflake account** with Cortex AI enabled (trial works — see Step 1)
- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **OpenSSL** — macOS/Linux: built-in. Windows: install via [Git for Windows](https://git-scm.com/) or [Win32 OpenSSL](https://slproweb.com/products/Win32OpenSSL.html)

---

## Step 1 — Get a Snowflake Account

1. Sign up at [signup.snowflake.com](https://signup.snowflake.com/) — choose **Enterprise** edition
2. Pick a region where Cortex AI is available. Confirmed working:
   - **AWS:** US West (Oregon), US East (N. Virginia), EU (Frankfurt)
   - **Azure:** East US 2, West Europe
   - Full matrix: [docs.snowflake.com → Cortex region availability](https://docs.snowflake.com/en/user-guide/snowflake-cortex/llm-functions#region-availability)
3. Note your **account identifier** from the URL after login — needed for `.env`

> The 30-day trial includes $400 in free credits — more than enough for this PoC.

---

## Step 2 — Run the Snowflake Setup Scripts

Open **Snowsight** and run the scripts below in order using a SQL Worksheet. Run as `ACCOUNTADMIN`.

### 2a — Foundation (`01_setup_database.sql`)
Creates `EX_CHATBOT` database, four schemas, two XS warehouses (auto-suspend 60s), and the RBAC role hierarchy (`EX_CHATBOT_ADMIN` → `EX_CHATBOT_APP` → `EX_CHATBOT_USER`).

### 2b — Core tables and data (`02_create_tables_and_data.sql`)
Creates employee directory, leave balances, IT tickets, and attrition tables. Adds column masking (salary, email) and row-access policy on leave data.

### 2c — Cortex Search (`03_cortex_search.sql`)
Inserts the first four HR policies and creates the `EX_POLICY_SEARCH` Cortex Search service.

> Wait **2–3 minutes** after this step for the search index to build before testing.

### 2d — Upload the semantic model (`04_semantic_model.yaml`)

Upload to the stage created in step 2a. In Snowsight:

1. Navigate to **Data → Databases → EX_CHATBOT → PUBLIC → Stages → SEMANTIC_MODELS**
2. Click **+ Files** and upload `snowflake/04_semantic_model.yaml`

Or via SnowSQL:
```bash
snowsql -a <your-account> -u <your-user> \
  -q "PUT file://snowflake/04_semantic_model.yaml @EX_CHATBOT.PUBLIC.SEMANTIC_MODELS AUTO_COMPRESS=FALSE OVERWRITE=TRUE;"
```

### 2e — Audit log (`05_cortex_agent.sql`)
Creates the `AUDIT.INTERACTION_LOG` table.

### 2f — Extended HR tables (`06_new_tables.sql`)
Adds six new tables for real-life scenarios:

| Table | Purpose |
|---|---|
| `PERFORMANCE_REVIEWS` | Annual and mid-year review cycles, ratings, goals |
| `LEARNING_DEVELOPMENT` | Completed and enrolled courses, costs, providers |
| `LEARNING_BUDGET` | Per-employee annual L&D budget with computed remaining balance |
| `BENEFITS_ENROLLMENT` | Health, dental, 401k, RSU enrollment by employee |
| `EXPENSE_REPORTS` | Submitted expenses with policy-limit enforcement |
| `LEAVE_REQUESTS` | Leave submissions with approval workflow |

### 2g — Extended data (`07_extended_data.sql`)
Inserts 14 additional employees (20+ total), including the CEO, CHRO, VPs, team leads, and ICs across Engineering, Product, Design, Sales, CS, People & HR. Also inserts:
- 20 realistic IT tickets (network, hardware, access, software)
- 16 performance reviews (8 Annual FY25 completed, 8 H1 FY26 in progress)
- 15 L&D records and 11 budget rows
- Benefits enrollment, expense reports (including a rejected out-of-policy expense)
- Attrition records for Mobile, Data, Sales, and Product teams

### 2h — Extended policies (`08_extended_policies.sql`)
Inserts 8 additional HR policy documents into `KNOWLEDGE_BASE.POLICY_DOCUMENTS`:

| Policy | Key Content |
|---|---|
| Parental Leave | 16 wks primary, 4 wks secondary, phased return |
| Performance Review | H1 + Annual cycles, 1–5 rating scale, PIP process |
| L&D Policy | Budget by level ($1,500–$5,000), approval thresholds |
| Benefits Guide FY2026 | PPO/HMO plans, 401k 4% match, RSU 4-yr vesting |
| Expense Reimbursement | Travel $800, Meals $50/person, Conference $2,000 |
| Equity & RSU | 4-year vesting, 1-year cliff, blackout periods |
| Mental Health & Wellness | EAP 8 free sessions/yr, $100/mo wellness stipend |
| Employee Referral | $3,000–$10,000 by level, paid in two tranches |

### 2i — Travel agent tables (`09_travel_agents.sql`)
Creates four tables for the multi-agent travel demo:

| Table | Written by |
|---|---|
| `TRAVEL_REQUESTS` | Orchestrator — one row per request |
| `TRAVEL_BOOKINGS` | Flight and Hotel agents |
| `CALENDAR_BLOCKS` | Calendar agent |
| `APPROVAL_REQUESTS` | Approval agent |

---

## Step 3 — Verify Cortex Is Working

```sql
-- LLM inference
SELECT SNOWFLAKE.CORTEX.COMPLETE('llama3.1-70b', 'Reply with just the word: pong') AS test;

-- Cortex Search
SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
  'EX_CHATBOT.KNOWLEDGE_BASE.EX_POLICY_SEARCH',
  '{"query": "parental leave primary caregiver", "columns": ["TITLE","CONTENT"], "limit": 2}'
);

-- Column masking (salary should be NULL for APP role)
USE ROLE EX_CHATBOT_APP;
SELECT EMP_ID, FULL_NAME, SALARY FROM EX_CHATBOT.HR_DATA.EMPLOYEES LIMIT 3;
```

---

## Step 4 — Set Up Key-Pair Authentication

The backend uses **RSA key-pair authentication** for Snowflake connections and Cortex Analyst REST API calls.

### Generate the key pair

```bash
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out snowflake_private_key.pem
openssl rsa -in snowflake_private_key.pem -pubout -out snowflake_public_key.pem
```

> `snowflake_private_key.pem` is in `.gitignore` — it will never be committed.

### Register the public key with Snowflake

```sql
-- Run as ACCOUNTADMIN in Snowsight
ALTER USER YOUR_USERNAME SET RSA_PUBLIC_KEY='MIIBIjANBgkqhkiG9w0BAQEF...
...your public key content here (without -----BEGIN/END lines)...';
```

Extract just the key body:
```bash
# macOS / Linux
grep -v -- "-----" snowflake_public_key.pem | tr -d '\n'

# Windows PowerShell
(Get-Content snowflake_public_key.pem | Where-Object { $_ -notmatch "^-----" }) -join ""
```

---

## Step 5 — Configure and Run the Backend

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate          # macOS / Linux
.venv\Scripts\activate             # Windows PowerShell

# Install dependencies
python -m pip install -r backend/requirements.txt

# Copy env template
cp .env.example .env               # Windows: copy .env.example .env
```

Edit `.env`:

```ini
SNOWFLAKE_ACCOUNT=YOUR-ORG-ACCOUNTNAME
SNOWFLAKE_USER=YOUR_USERNAME
SNOWFLAKE_PRIVATE_KEY_PATH=/absolute/path/to/snowflake_private_key.pem
CORTEX_MODEL=llama3.1-70b
```

> **Account format:** New accounts use `ORGNAME-ACCOUNTNAME` (no region suffix). Check your URL: `https://ORGNAME-ACCOUNTNAME.snowflakecomputing.com`.

**Start the backend:**
```bash
cd backend
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Snowflake connection established.
```

**Verify:**
- `http://localhost:8000/health` → `{"status":"healthy","snowflake_connected":true}`
- `http://localhost:8000/docs` → FastAPI Swagger UI

---

## Step 6 — Run the Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```ini
REACT_APP_API_URL=http://localhost:8000
```

```bash
npm start
```

Opens at `http://localhost:3000`. Without `REACT_APP_API_URL`, the UI runs in **demo mode** with pre-built responses — useful for presenting without a running backend.

---

## Demo Scenarios

### Running Without a Backend

The frontend works as a standalone demo without any backend or Snowflake connection. Click any starter card or use the sidebar topics — all responses are pre-built with realistic data including tables, source citations, and follow-up chips.

For the multi-agent travel demo specifically, the frontend simulates all five agents with `setTimeout` at realistic completion intervals — no WebSocket connection needed.

---

### Scenario 1 — Leave Balance (Cortex Analyst)

**Ask:** `How many leave days do I have remaining this year?`

**What happens:** Cortex Analyst translates the question into SQL against `EMPLOYEE_LEAVE` and returns a table breaking down Annual, Sick, and Bereavement leave with balances.

**What to show the audience:**
- Click the source badge to expand the generated SQL
- Point out that the query is scoped to `EMP_ID = 'EMP-4821'` — row-level data isolation
- The carry-forward rule comes from policy, not hardcoded

---

### Scenario 2 — Performance Review Status (Cortex Analyst)

**Ask:** `What is the status of my performance review for H1 FY26?`

**What happens:** Queries `PERFORMANCE_REVIEWS` for both the current mid-year review (in Manager Review stage, self-rating 4.0) and the completed Annual FY25 (4.5 — Exceeds Expectations).

**What to show:**
- Multi-row result from a single natural-language question
- Both current and historical records in one answer

---

### Scenario 3 — Raise an IT Ticket (Action → Snowflake)

**Ask:** `My VPN keeps disconnecting every 10 minutes. Please raise a ticket.`

**What happens:** The LLM classifies this as an `action_ticket` intent, extracts parameters (category: Network/VPN, priority: P3, summary: VPN disconnecting intermittently), and executes an `INSERT` into `IT_TICKETS` live. A ticket ID is returned.

**What to show:**
- The Action badge (yellow) shows the actual INSERT statement
- The ticket is written to Snowflake — verify: `SELECT * FROM EX_CHATBOT.HR_DATA.IT_TICKETS ORDER BY CREATED_AT DESC LIMIT 3;`
- Intent classification uses `llama3.1-8b` for low-latency routing before escalating to the full model

---

### Scenario 4 — L&D Budget (Cortex Analyst)

**Ask:** `How much of my learning and development budget have I used this year?`

**What happens:** Joins `LEARNING_BUDGET` and `LEARNING_DEVELOPMENT` to show $3,000 annual budget, $974 used (SnowPro Core + Crucial Conversations), $1,799 committed (AWS re:Invent), and $227 remaining with a warning.

**What to show:**
- Computed `REMAINING` column (virtual column from Snowflake AS expression)
- The warning highlights a business rule — near-zero budget triggers caution

---

### Scenario 5 — Benefits Enrollment (Cortex Analyst + Search)

**Ask:** `What benefits am I currently enrolled in?`

**What happens:** Queries `BENEFITS_ENROLLMENT` for the employee's health plan, dental, 401k, and vision, then supplements with contribution details from the Benefits Guide policy document via Cortex Search.

---

### Scenario 6 — Team Attrition Trends (Cortex Analyst)

**Ask:** `Show me attrition trends for my team over the last 4 quarters.`

**What happens:** Queries `ATTRITION_FACT` with a rolling-quarter group-by and returns a table of voluntary vs. involuntary departures by quarter.

> This query returns data for the Platform team. Adjust by asking about a different team (e.g., "Mobile team attrition").

---

### Scenario 7 — Multi-Agent Travel Demo ⭐

This is the flagship orchestration scenario. One employee request triggers five agents running **in parallel** via `asyncio.gather()`, each working independently and reporting back as they finish.

#### How to trigger

- Click **"🌍 Multi-Agent Travel Demo"** in the sidebar
- Or click the **"Book travel to New York…"** starter card on the empty screen

#### What the user sees

A travel panel appears in the chat showing five agent cards, all switching to "working" within half a second of each other. They resolve at staggered times:

| Agent | Resolves at | Result |
|---|---|---|
| 📅 **Calendar** | ~1.8s | No conflicts · Blocked May 14–17 on calendar |
| 💰 **Budget** | ~2.8s | Budget OK · $847 travel YTD of $2,500 limit |
| ✈️ **Flight** | ~3.5s | Delta DL 412 · SFO→JFK · $342 · Confirmed |
| 🏨 **Hotel** | ~4.5s | Marriott Times Sq · $189/nt · 3 nights · $567 |
| ✅ **Approval** | ~5.5s | Sent to Alex Chen · Est. response ~2 hrs |

After all five resolve (~6s total), a **Booking Summary** appears: $342 + $567 = **$909 total**, pending manager approval.

#### What each agent does (when backend is live)

| Agent | Snowflake action |
|---|---|
| Calendar | Queries `EMPLOYEE_LEAVE` for date conflicts; writes to `CALENDAR_BLOCKS` |
| Budget | Queries `EXPENSE_REPORTS` for YTD travel spend; validates against $2,500 policy |
| Flight | Selects from fare data; writes flight booking to `TRAVEL_BOOKINGS` (VARIANT for details) |
| Hotel | Selects hotel options; writes hotel booking to `TRAVEL_BOOKINGS` |
| Approval | Queries `EMPLOYEES` for manager name; writes to `APPROVAL_REQUESTS` as Pending |

#### Key talking points for this demo

- **"Parallel, not sequential"** — in a traditional workflow, these five steps happen one after another over days. Here they run simultaneously.
- **"Every action is in Snowflake"** — bookings, calendar blocks, and approval requests are all real rows you can query.
- **"Transparent orchestration"** — the tech badge in the panel shows `asyncio.gather() · Snowflake Cortex` so the audience understands what's happening under the hood.
- **"Approval is a checkpoint, not a bottleneck"** — the status stays `pending` until the manager acts; the agent surface area is well-defined.

#### Verify the writes in Snowflake (when backend is live)

```sql
USE ROLE EX_CHATBOT_ADMIN;

-- Travel request record
SELECT * FROM EX_CHATBOT.HR_DATA.TRAVEL_REQUESTS ORDER BY CREATED_AT DESC LIMIT 3;

-- Flight and hotel bookings (DETAILS column is VARIANT JSON)
SELECT BOOKING_TYPE, VENDOR, BOOKING_REF, COST,
       DETAILS:airline::STRING AS airline,
       DETAILS:hotel::STRING   AS hotel
FROM EX_CHATBOT.HR_DATA.TRAVEL_BOOKINGS ORDER BY BOOKED_AT DESC LIMIT 4;

-- Calendar block
SELECT * FROM EX_CHATBOT.HR_DATA.CALENDAR_BLOCKS ORDER BY CREATED_AT DESC LIMIT 3;

-- Approval request (status = Pending)
SELECT * FROM EX_CHATBOT.HR_DATA.APPROVAL_REQUESTS ORDER BY SUBMITTED_AT DESC LIMIT 3;
```

---

## Governance Demo (Snowsight)

Show live data governance without leaving Snowsight:

```sql
-- Column masking: salary is NULL for APP role, visible for ADMIN
USE ROLE EX_CHATBOT_APP;
SELECT FULL_NAME, SALARY, EMAIL FROM EX_CHATBOT.HR_DATA.EMPLOYEES LIMIT 5;

USE ROLE EX_CHATBOT_ADMIN;
SELECT FULL_NAME, SALARY, EMAIL FROM EX_CHATBOT.HR_DATA.EMPLOYEES LIMIT 5;

-- Row-access policy: APP role only sees own leave data
USE ROLE EX_CHATBOT_APP;
SELECT EMP_ID, LEAVE_TYPE, BALANCE FROM EX_CHATBOT.HR_DATA.EMPLOYEE_LEAVE;

-- Audit trail: every prompt, tool call, and response
SELECT TIMESTAMP, EMP_ID, INTENT, TOOLS_CALLED, PROMPT_TOKENS
FROM EX_CHATBOT.AUDIT.INTERACTION_LOG
ORDER BY TIMESTAMP DESC LIMIT 10;
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ModuleNotFoundError: jwt` | `python -m pip install PyJWT cryptography` |
| `snowflake_connected: false` | Check `.env` account format — use `ORGNAME-ACCOUNTNAME`, no region suffix |
| `250001: Multi-factor authentication required` | Complete key-pair setup in Step 4 |
| `390146: Bearer token is missing` | Private key not registered — re-run `ALTER USER SET RSA_PUBLIC_KEY` |
| `Cortex function not found` | Try `llama3.1-70b` or `mistral-large2`; check region availability |
| `392700: unknown field in semantic model` | Re-upload `04_semantic_model.yaml` to `@EX_CHATBOT.PUBLIC.SEMANTIC_MODELS/` |
| `Insufficient privileges` | `GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER TO ROLE EX_CHATBOT_APP;` |
| Search service not found | Wait 2–3 min after creating the Cortex Search service |
| `pip.exe` blocked on Windows | Use `python -m pip install ...` |
| WebSocket `/ws/travel` not connecting | Ensure backend is running; frontend falls back to simulation automatically |
| Travel agent SQL errors | Run `09_travel_agents.sql` in Snowsight and verify grants with `SHOW GRANTS ON TABLE TRAVEL_REQUESTS` |

---

## Key Talking Points

**For the CTO / VP Engineering:**
- No new infrastructure — Cortex runs serverless inside Snowflake
- LLMs are swappable (Llama, Mistral, Claude, Arctic) with a one-line config change
- Multi-agent orchestration via `asyncio.gather()` — horizontally scalable with no custom orchestration framework
- Semantic model is version-controlled YAML — GitOps-compatible

**For the CISO / Security Lead:**
- Data never leaves Snowflake during inference — no calls to external model APIs
- RBAC, column masking, and row-access policies apply to every AI query automatically
- Full audit trail of every prompt, tool call, and retrieved row in `AUDIT.INTERACTION_LOG`
- Snowflake does not train models on customer data
- Agent writes to Snowflake are governed by the same role grants as any other query

**For HR / Business Sponsor:**
- Target: 30–50% reduction in Tier-1 HR/IT ticket volume
- Process automation (travel request → 5 agents → booked + calendar blocked + approval routed) in ~6 seconds vs. 2+ days manually
- Every answer is cited — employees can verify the source policy or the exact SQL that ran
- Actions leave a complete audit trail — compliance-ready by design

---

## Production Roadmap

If this PoC gets a go-decision, the next phase includes:

- SSO/SCIM integration (Okta, Azure AD) for identity propagation into Snowflake sessions
- PrivateLink for network-level isolation
- Real HRIS connector (Workday / SuccessFactors) via Snowpipe Streaming
- Slack / Teams bot channel via MCP connectors
- Eval harness: 50+ golden Q&A pairs with automated regression on every config change
- Output guardrails: PII detection, toxicity filter, hallucination scoring
- Human-in-the-loop approval UI for action-taking (leave booking, ticket escalation)
- Model-version pinning policy (GA models only in production)
- Approval webhook so the `APPROVAL_REQUESTS.STATUS` updates when manager acts in the HR system

---

## Notes

- The debug endpoint `GET /api/debug/analyst-token` in `backend/main.py` is useful for diagnosing Cortex Analyst connectivity. Remove before any production or public deployment.
- `SNOWFLAKE_ROLE=ACCOUNTADMIN` works for a local PoC but should be switched to `EX_CHATBOT_APP` (with proper grants) before sharing or deploying.
- `allow_origins=["*"]` in FastAPI CORS is fine for local dev. Restrict to your frontend origin in any deployed environment.
- The travel demo `simulateTravelAgents` function in `App.jsx` uses `setTimeout` and does not require a backend — safe to demo from a laptop with no network access to Snowflake.
