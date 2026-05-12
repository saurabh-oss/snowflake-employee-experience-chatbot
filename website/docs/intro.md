---
sidebar_position: 1
---

# 👥 Employee Experience Chatbot

## Secure Employee Intelligence on Snowflake Cortex

Welcome to the **Employee Experience Chatbot**—a proof-of-concept that brings conversational AI to HR and people operations, **without any data leaving Snowflake**.

![Architecture Overview](/img/hero-diagram.svg)

---

## 🎯 The Problem

Employees spend hours finding answers to common questions:
- *"What's my remaining leave balance?"*
- *"What's the policy on remote work?"*
- *"Where's my IT ticket in the queue?"*
- *"How is my team performing this quarter?"*

HR teams spend just as much time answering the same questions repeatedly.

**The bottleneck:** Traditional chatbots require exporting data to third-party AI services. That's a compliance nightmare.

---

## ✨ The Solution

Using **Snowflake Cortex**, we built a chatbot that:

### 🔒 **Never Exports Data**
- 100% of computation happens inside Snowflake
- No data sent to external AI services
- Full audit trail of every query and response
- Built-in column and row-level security

### 🧠 **Understands Your Data**
- **Cortex Search** finds relevant policies from your documentation
- **Cortex Analyst** translates natural language questions into SQL queries
- **Cortex Complete** synthesizes answers from context
- One semantic model powers all NL-to-SQL translation

### 🎯 **Delivers Instant Answers**
- Natural language questions: *"Show me my benefits summary"*
- Grounded responses with citations from your data
- Streaming replies for smooth UX
- Works on desktop and mobile

### 👥 **Respects Privacy**
- Role-based access control (RBAC)
- Salary data automatically masked unless authorized
- Email addresses hidden from unauthorized users
- Zero human can see unmasked sensitive data

---

## 🚀 Key Features

| Feature | Benefit |
|---------|---------|
| **Cortex Search** | Hybrid semantic + keyword search over policy documents |
| **Cortex Analyst** | Convert "Show me Q3 metrics" → SQL queries automatically |
| **Cortex Complete** | LLM-powered response synthesis with full citations |
| **Horizon Governance** | Data masking, row policies, full audit logs |
| **React Chat UI** | Mobile-responsive interface with WebSocket streaming |
| **FastAPI Backend** | Lightweight orchestration between Cortex services |
| **RSA Authentication** | Secure Snowflake connectivity without storing passwords |
| **No Data Egress** | Every compute byte stays inside your Snowflake account |

---

## 💡 Real-World Scenarios

**Sarah (Employee):** *"What's my PTO balance?"*
→ Cortex Analyst queries the `employees` table → Masked response with exact number

**James (Manager):** *"What's the remote work policy?"*
→ Cortex Search finds 3 relevant policy docs → Synthesized answer with citations

**Priya (HR):** *"Show team headcount by department"*
→ Cortex Analyst translates → SQL aggregation → Chart in the UI

**Security Team:** *"Who asked about salary data this week?"*
→ Audit logs show every Cortex call → No data leaked (masking still applied)

---

## 🏗️ Architecture at a Glance

```
┌─────────────┐
│  Chat UI    │ React 18 (Desktop & Mobile)
└──────┬──────┘
       │ WebSocket
       │
┌──────▼──────────────────────────────────────────┐
│         FastAPI Backend Orchestration           │
├──────────────────────────────────────────────────┤
│  Handles auth, routing, response formatting     │
└──────────────┬──────────────────────────────────┘
               │
               │ Snowflake Connector + RSA Auth
               │
       ┌───────▼────────────────────┐
       │  Snowflake Cortex          │
       ├────────────────────────────┤
       │ ✓ Cortex Search (Hybrid)   │
       │ ✓ Cortex Analyst (NL→SQL)  │
       │ ✓ Cortex Complete (LLM)    │
       │ ✓ Horizon Governance       │
       │ ✓ Audit Logging            │
       └────────────────────────────┘
```

---

## 🔐 Why This Matters

### Security
- ✅ Zero data exfiltration
- ✅ End-to-end encryption
- ✅ Automatic PII masking
- ✅ Immutable audit logs
- ✅ No API keys to rotate

### Compliance
- ✅ HIPAA/SOX-ready architecture
- ✅ Data residency guaranteed
- ✅ Role-based access enforced
- ✅ Full query lineage tracking
- ✅ No third-party AI dependencies

### Cost Efficiency
- ✅ One semantic model for all NL-to-SQL
- ✅ No per-API-call charges
- ✅ Compute scales with Snowflake warehouse
- ✅ Snowflake discounts apply

---

## 🎓 What You'll Find Here

- **[Why This Project?](/why-this-project)** — Business case, ROI, and use cases
- **[Architecture](/architecture)** — How Cortex Search, Analyst, and Complete work together
- **[Security & Governance](/security-governance)** — RBAC, masking, audit logs
- **[Use Cases](/use-cases)** — Real scenarios and example queries
- **[Quick Start](/quick-start)** — Get up and running in 30 minutes
- **[FAQ](/faq)** — Common questions answered

---

## 🚦 Getting Started

### Option 1: Quick Tour
1. Read [Why This Project?](/why-this-project) (3 min)
2. Skim [Architecture](/architecture) (5 min)
3. Explore [Use Cases](/use-cases) (5 min)

### Option 2: Deep Dive
1. Check [Architecture](/architecture) (10 min)
2. Review [Security & Governance](/security-governance) (10 min)
3. Follow [Quick Start](/quick-start) → Full [README](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot) (30 min setup)

### Option 3: Hands-On
→ Jump to [Quick Start](/quick-start) and deploy it yourself

---

## 📚 Resources

- **[GitHub Repository](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot)** — Source code, setup scripts, data
- **[Full Architecture.md](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/ARCHITECTURE.md)** — Deep technical details, trade-offs, ADRs
- **[Snowflake Cortex Docs](https://docs.snowflake.com/en/user-guide/cortex/cortex-overview)** — Official Cortex documentation
- **[Horizon Governance Guide](https://docs.snowflake.com/en/user-guide/security-column-masking-policies)** — Column & row masking setup

---

## 💬 Questions?

Check out the [FAQ](/faq) or open an issue on [GitHub](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/issues).

---

**Ready to build employee intelligence the secure way?**

→ [Start with Quick Start](/quick-start)

→ [Or explore the Architecture](/architecture)
