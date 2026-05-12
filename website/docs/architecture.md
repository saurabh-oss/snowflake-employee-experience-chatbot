---
sidebar_position: 5
---

# 🏗️ Architecture

## How the Employee Experience Chatbot Works

This guide explains the system architecture at a level designed for decision-makers and architects. For deep technical details, refer to [ARCHITECTURE.md](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/ARCHITECTURE.md).

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Employee Browser                       │
│                    (Desktop or Mobile)                      │
├─────────────────────────────────────────────────────────────┤
│                  React 18 Chat UI (SSL/TLS)                 │
│  • Natural language input                                   │
│  • Streaming responses with WebSocket                       │
│  • Mobile-responsive design                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS + WSS (Encrypted)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   FastAPI Backend                           │
│         (Python, 18.9 KB, ~200 lines of core logic)        │
├─────────────────────────────────────────────────────────────┤
│  • Authentication: RSA key-pair (no passwords)              │
│  • Routing: Directs questions to appropriate Cortex service│
│  • Validation: Pydantic models for request/response shape   │
│  • Streaming: WebSocket support for real-time responses     │
│  • Logging: Every request logged for audit trail            │
└──────────────────────┬──────────────────────────────────────┘
                       │ Snowflake Connector (Encrypted)
                       │ (RSA-authenticated, no password stored)
                       │
       ┌───────────────▼───────────────────────┐
       │     Snowflake Cortex Platform         │
       │  (Compute stays in your VPC/region)   │
       ├───────────────────────────────────────┤
       │                                       │
       │  ┌─────────────────────────────────┐ │
       │  │   Cortex Search (Hybrid)        │ │
       │  ├─────────────────────────────────┤ │
       │  │ • Semantic + keyword search     │ │
       │  │ • Searches policy documents     │ │
       │  │ • Returns top 3-5 relevant docs │ │
       │  │ • No external indexing service  │ │
       │  └─────────────────────────────────┘ │
       │                                       │
       │  ┌─────────────────────────────────┐ │
       │  │   Cortex Analyst (NL→SQL)       │ │
       │  ├─────────────────────────────────┤ │
       │  │ • Reads semantic model (YAML)   │ │
       │  │ • Translates: "Show me Q3 OKRs" │ │
       │  │   → SELECT ... FROM analytics   │ │
       │  │ • Executes query on live table  │ │
       │  │ • Returns structured results    │ │
       │  └─────────────────────────────────┘ │
       │                                       │
       │  ┌─────────────────────────────────┐ │
       │  │   Cortex Complete (LLM)         │ │
       │  ├─────────────────────────────────┤ │
       │  │ • Receives context:             │ │
       │  │   - User question               │ │
       │  │   - Policy documents (Search)   │ │
       │  │   - Query results (Analyst)     │ │
       │  │ • Synthesizes natural response  │ │
       │  │ • Adds citations to sources     │ │
       │  │ • Model: Llama 3.1, Mistral, or│ │
       │  │   Claude (your choice)          │ │
       │  └─────────────────────────────────┘ │
       │                                       │
       │  ┌─────────────────────────────────┐ │
       │  │   Horizon Governance            │ │
       │  ├─────────────────────────────────┤ │
       │  │ • Column masking (auto-hide     │ │
       │  │   salary, email if unauthorized)│ │
       │  │ • Row policies (see only your   │ │
       │  │   own benefits, not others')    │ │
       │  │ • Full audit logging            │ │
       │  │ • No masked data visible        │ │
       │  └─────────────────────────────────┘ │
       │                                       │
       └───────────────────────────────────────┘
```

---

## 🔄 Request Flow: Step-by-Step

Let's trace what happens when an employee asks a question.

### Example Question: *"What's my remaining leave?"*

**Step 1: User Input** (Browser)
```
Employee types: "What's my remaining leave?"
Browser sends: POST /ask with { message: "...", user_id: "emp_123" }
```

**Step 2: Backend Receives Request** (FastAPI)
```python
1. Validates request shape (Pydantic)
2. Verifies user identity from Snowflake JWT token
3. Logs the question for audit trail
4. Determines intent: "Query employee data" + "Policy lookup"
5. Routes to dual Cortex calls:
   - Cortex Analyst: "Get leave balance for emp_123"
   - Cortex Search: "Find leave balance policy in docs"
```

**Step 3: Cortex Analyst Translates to SQL** (Snowflake)
```yaml
# Semantic Model defines:
tables:
  employees:
    - column: leave_balance
      description: "Remaining PTO balance"
      
# Cortex Analyst translates:
# "Get my leave balance" → SELECT leave_balance FROM employees WHERE id = ?
```

**Step 4: Cortex Search Finds Policies** (Snowflake)
```
Query: "leave balance policy"
Results:
  - doc_1: "Leave Policy 2025" (95% relevance)
  - doc_2: "PTO Carryover Rules" (87% relevance)
  - doc_3: "Maternity Leave Guidelines" (62% - skipped)
```

**Step 5: Governance Applies Masking** (Snowflake)
```sql
-- Column masking automatically applied:
SELECT 
  leave_balance,        -- ✓ OK to see (employee's own data)
  salary                -- ✗ NULL (masked for non-admins)
FROM employees
WHERE id = 'emp_123'
```

**Step 6: Cortex Complete Synthesizes** (Snowflake)
```
Input Context:
  Question: "What's my remaining leave?"
  Data: { leave_balance: 8 }
  Policies: ["Leave Policy 2025", "PTO Carryover Rules"]

Output:
  "You have 8 days of PTO remaining. 
   According to our Leave Policy 2025, 
   unused days carry over to the next year. 
   See: Leave Policy 2025 (section 3.2)"
```

**Step 7: Backend Streams Response** (FastAPI + WebSocket)
```
Backend sends response chunks to browser
Response appears word-by-word in UI (smooth UX)
Complete response logged to audit table
```

**Step 8: UI Displays with Citations** (React)
```
You have 8 days of PTO remaining.
According to our Leave Policy 2025, unused days carry over to the next year.

📄 Leave Policy 2025 (section 3.2)
```

---

## 🔐 Security Model

### Authentication: RSA Key-Pair

Instead of passwords, the backend uses **RSA public/private key pairs** to authenticate with Snowflake.

```
Backend                           Snowflake
───────────────────────────────────────────
Has: Private Key (secret)      Has: Public Key
     Unsigned JWT            
     ──────────────────────→ Verifies signature
                             Issues access token ✓
```

**Why this is better:**
- ✅ No plaintext passwords stored or transmitted
- ✅ Can be rotated without downtime
- ✅ Works for unattended processes (bots, background jobs)
- ✅ Industry standard (same as GitHub Actions, AWS)

---

### Row-Level Security (RLS)

Employees only see their own data.

```sql
-- Snowflake enforces at query time:
SELECT * FROM employees 
WHERE employee_id = CURRENT_USER()  -- ← Enforced by Snowflake
```

**Example:**
- Manager "alice" queries "show all salaries" → Sees entire payroll
- Employee "bob" queries "show all salaries" → Sees only his own (others are NULL)
- Same query, different results → Governed by Snowflake, not application logic

---

### Column-Level Masking

Sensitive columns are automatically hidden.

```sql
CREATE MASKING POLICY salary_mask AS (salary STRING) 
  RETURNS STRING → 
  CASE 
    WHEN CURRENT_ROLE() IN ('ADMIN', 'MANAGER') THEN salary  -- ✓ Unmasked
    ELSE 'REDACTED'                                           -- ✗ Hidden
  END;

ALTER TABLE employees MODIFY COLUMN salary SET MASKING POLICY salary_mask;
```

**Example:**
- HR sees: `salary: $120,000`
- Employee sees: `salary: REDACTED`
- Data layer enforces it → application can't bypass

---

### Immutable Audit Logging

Every Cortex call is logged.

```sql
-- Audit table captures:
INSERT INTO cortex_audit_log VALUES (
  timestamp: 2025-05-12 14:32:15,
  user_id: emp_123,
  question: "What's my remaining leave?",
  cortex_service: "ANALYST + SEARCH",
  response: "You have 8 days...",
  data_accessed: ["employees.leave_balance"],
  masking_applied: false,  -- Employee seeing own data, no masking needed
  query_id: "abc-123"
);
```

**Why immutable:**
- Snowflake table with `APPEND_ONLY` mode
- Even ADMIN cannot modify history
- Compliance teams can verify no unauthorized data access

---

## 🗄️ Data Architecture

### Data Sources

```
┌──────────────────────┐
│  HR System Data      │
│  - Employees table   │
│  - Leave balances    │
│  - Salary/benefits   │
│  - Org structure     │
└──────┬───────────────┘
       │ Load via Snowpipe/ETL
       │
┌──────▼──────────────────────┐
│  Snowflake Database          │
│  (CORTEX schema)             │
│  - EMPLOYEES (1000 rows)     │
│  - POLICIES (doc store)      │
│  - AUDIT_LOG (immutable)     │
└──────────────────────────────┘
```

### Semantic Model (YAML)

The semantic model is the "contract" between natural language and your database.

```yaml
semantic_model:
  tables:
    - name: employees
      description: "Core employee data"
      columns:
        - name: employee_id
          description: "Unique employee ID"
        - name: leave_balance
          description: "Remaining PTO days (current year)"
        - name: department
          description: "Employee's department"
        
    - name: policies
      description: "HR policy documents"
      columns:
        - name: policy_name
        - name: content
        - name: effective_date
```

**Why this matters:**
- One model powers **all** NL-to-SQL translation
- Update it once → affects every question
- No prompt engineering needed
- Cortex Analyst knows your data structure without hardcoding

---

## 🚀 Deployment Architecture

### Single Snowflake Account (Simple)

```
Snowflake Account
├── CORTEX schema
│   ├── EMPLOYEES table
│   ├── POLICIES table
│   ├── AUDIT_LOG table
│   └── Semantic model YAML
├── Backend (FastAPI, runs on EC2/Lambda/container)
└── Frontend (React, deployed to Vercel/GitHub Pages)
```

**Suitable for:**
- Single company/department
- Up to 1,000 employees
- Minimal compliance requirements

---

### Multi-Tenant (Enterprise)

```
Customer 1 Account          Customer 2 Account
├── CORTEX_CUST1           ├── CORTEX_CUST2
│   ├── Tables             │   ├── Tables
│   ├── Policies           │   ├── Policies
│   └── Audit logs         │   └── Audit logs
│                           │
└── Backend Isolation      └── Backend Isolation
    (row-level auth)          (row-level auth)
```

**Suitable for:**
- SaaS platforms
- Large enterprises with subsidiaries
- Fully isolated compliance requirements

---

## 📊 Performance Characteristics

### Response Time Breakdown

For a typical question: **2-4 seconds end-to-end**

| Stage | Time | Details |
|-------|------|---------|
| Browser → Backend | 50-100 ms | Network latency + validation |
| Cortex Search | 500-800 ms | Index lookup + relevance ranking |
| Cortex Analyst | 600-1000 ms | LLM translates to SQL + execution |
| Cortex Complete | 1-2 sec | LLM synthesizes response |
| Backend → Browser (streaming) | 100-200 ms | First token appears (streaming) |
| **Total** | **2-4 sec** | Entire response visible |

### Scalability

| Metric | Limit | Notes |
|--------|-------|-------|
| Concurrent Users | 100+ | Depends on Snowflake warehouse size |
| Employees in DB | 100K+ | Cortex handles billions of rows |
| Policy Documents | 1000+ | Search index scales effortlessly |
| Daily Queries | 10K+ | Snowflake compute scales automatically |
| Cost per Query | Less than $0.01 | Snowflake on-demand pricing |

---

## 🔧 Technical Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Frontend** | React 18 + CSS | Type-safe, responsive, fast |
| **Backend** | FastAPI (Python) | Fast, async-ready, auto-docs |
| **Authentication** | RSA + JWT | Industry standard, password-less |
| **AI/ML** | Snowflake Cortex | Built-in, no external dependencies |
| **Data Governance** | Horizon Catalog | Native masking, RBAC, audit logs |
| **Deployment** | Docker/serverless | Flexible, portable, cost-efficient |

---

## 🎯 Design Decisions

### Why Cortex?

| Decision | Alternative | Why Cortex Won |
|----------|---|---|
| Search | Elasticsearch, Pinecone | No data egress, lower cost, built-in governance |
| NL→SQL | GPT + prompt engineering | Cortex Analyst is deterministic, not hallucination-prone |
| LLM | ChatGPT, Anthropic API | Stays in Snowflake, no external calls, cheaper at scale |
| Governance | Custom code | Snowflake enforces it at query time, can't be bypassed |

### Why Not a Third-Party Chatbot Platform?

| Vendor Platform | This Solution |
|---|---|
| Data sent to vendor for processing | Data stays in Snowflake |
| Per-API-call pricing | Flat Snowflake compute cost |
| Days to integrate | 30 minutes to deploy |
| Requires BAA/DPA | Native compliance built-in |
| Generic AI | Trained on your specific data |

---

## 📈 Scaling Strategies

### For More Users
- Increase Snowflake warehouse size (vertical scaling)
- Add more FastAPI replicas behind load balancer

### For More Data
- Snowflake handles petabyte scale naturally
- Cortex Search indexes optimize automatically

### For More Questions
- Add more semantic model tables and relations
- Fine-tune based on usage patterns

---

## 🔗 How Cortex Services Interact

```
Question → Backend
           ├─ Routes to Cortex Analyst + Cortex Search (parallel)
           │
           ├─ Cortex Analyst:
           │  ├─ Reads semantic model
           │  ├─ Translates question to SQL
           │  └─ Executes + returns results
           │
           └─ Cortex Search:
              ├─ Searches policy documents
              └─ Returns top 3-5 relevant docs

Results → Cortex Complete:
          ├─ Receives:
          │  ├─ Original question
          │  ├─ Query results (data)
          │  └─ Policy documents (context)
          │
          └─ Returns:
             ├─ Synthesized response
             ├─ Citations
             └─ Confidence score

Response → Backend logs + streams to browser ✓
```

---

## ❓ Common Questions

**Q: Why not just use ChatGPT API?**  
A: ChatGPT would require sending employee data to OpenAI. This solution keeps everything in Snowflake.

**Q: What if Cortex goes down?**  
A: Cortex is part of Snowflake's core compute layer. Fallback would be to disable chatbot temporarily (no data loss).

**Q: Can I use a different LLM?**  
A: Yes! Cortex Complete supports Llama 3.1, Mistral, and Claude. Pick your preferred model.

**Q: How do I update the semantic model?**  
A: Edit the YAML file, upload to Snowflake stage, run one SQL command. Takes ~5 minutes.

---

## 🔗 Next Steps

- **See it in action** → [Use Cases](/use-cases)
- **Understand security** → [Security & Governance](/security-governance)
- **Deploy it** → [Quick Start](/quick-start)
- **Deep dive** → [Full Architecture.md](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/ARCHITECTURE.md)
