# Architecture Decision Record — EX Chatbot PoC

> This document captures the key architectural decisions, trade-offs, risks,
> and alternative approaches considered for the Employee Experience AI Chatbot.
> Written for an IT architecture and senior leadership audience.

---

## ADR-001: Platform Choice — Snowflake Intelligence + Cortex AI

### Decision
Use Snowflake as the unified platform for data storage, AI inference,
retrieval, governance, and agent orchestration.

### Context
The organisation already has a Snowflake investment. Employee data (HRIS,
payroll, leave, IT assets) either lives in Snowflake or can be ingested
into it. The key constraint is that employee data is highly sensitive and
must not leave the organisational perimeter.

### Pros
- **Single perimeter**: Data and LLM inference in one governed environment — no data movement to external model APIs.
- **Governance reuse**: Existing RBAC, masking, row-access, and Horizon Catalog controls apply to AI queries automatically.
- **No infrastructure to manage**: Cortex is serverless — no GPU provisioning, no model hosting, no scaling config.
- **Model flexibility**: Choose between Claude, GPT, Llama, Mistral, Snowflake Arctic — switch with a one-line config change.
- **Cortex Analyst**: Unique NL-to-SQL capability with a declarative semantic model — no RAG over structured data needed.
- **Cortex Search**: Fully managed hybrid retrieval — no vector DB to operate (Pinecone, Weaviate, pgvector not needed).
- **MCP connectors**: Native Model Context Protocol support for Workday, ServiceNow, Slack, Jira, Gmail.
- **Audit trail**: Every interaction logged with full provenance — who asked, what was retrieved, what was returned.

### Cons
- **Vendor lock-in**: Semantic model YAML, Cortex Search service API, and Agent definitions are Snowflake-proprietary. Migrating to another platform requires rewriting these components.
- **Regional availability**: Cortex features are not available in all Snowflake regions. If the org's primary region doesn't support Cortex, a cross-region setup is needed.
- **Cost opacity**: Cortex inference is metered per-token via credits. High concurrency + long contexts can cause cost spikes that are hard to predict before production load testing.
- **Feature maturity**: Skills, MCP connectors, deep research, and the mobile app are in Public/Private Preview (as of April 2026). APIs may change before GA.
- **Limited customisation**: Cannot fine-tune models inside Cortex. For domain-specific language (legal terms, internal acronyms), you depend on prompt engineering and semantic-model descriptions.

### Alternatives Considered

| Alternative | Why Not Chosen |
|---|---|
| **LangChain + OpenAI API + pgvector** | Data leaves the perimeter (OpenAI API is external). Would need to self-host an LLM (Ollama/vLLM) to match the security posture, adding significant infra burden. |
| **AWS Bedrock + Kendra** | Strong on security (VPC-hosted), but requires data duplication out of Snowflake. Two governance planes to manage. No NL-to-SQL equivalent to Cortex Analyst. |
| **Microsoft Copilot Studio** | Tight M365 integration but limited to Microsoft's model ecosystem. No native Snowflake connector — would need custom API bridge. Governance model is separate from the data platform. |
| **Google Vertex AI + AlloyDB** | Similar perimeter-security story, but requires migrating data out of Snowflake to BigQuery/AlloyDB. Loses Snowflake-specific governance controls. |

### Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Vendor lock-in | High | Certain | Wrap Cortex calls in an internal API abstraction layer. Keep semantic model and prompts in Git. |
| Cost overrun | Medium | Medium | Deploy resource monitors (already in setup). Cache frequent queries. Set per-role credit quotas. |
| Hallucination / wrong SQL | High | Medium | Build an eval harness with a golden Q&A set (50+ questions). Run regression on every model/config change. |
| Feature deprecation or API change | Medium | Medium | Pin to GA-tier models only. Use Preview features in non-prod. Subscribe to Snowflake release notes. |
| Prompt injection via policy docs | High | Low | Sanitise ingested documents. Restrict agent tool permissions. Add output guardrails. |
| Data sovereignty mismatch | High | Low | Verify Snowflake region before deployment. Document in an architecture decision record. |

---

## ADR-002: Retrieval Strategy — Cortex Search vs Custom RAG

### Decision
Use Cortex Search (fully managed) for document retrieval rather than
building a custom RAG pipeline with embeddings + vector store.

### Pros
- Zero operational overhead — no embedding pipeline, no vector DB, no reindexing jobs.
- Hybrid search (semantic + keyword) out of the box — better recall than pure vector search.
- Automatic chunking and embedding — no need to tune chunk sizes manually.
- Attribute filtering (by region, audience, category) built into the search API.
- Index refreshes automatically based on `TARGET_LAG` setting.

### Cons
- Less control over chunking strategy — cannot customise chunk sizes, overlap, or boundaries.
- No cross-encoder reranking — top-k results are based on Cortex's internal scoring.
- Cannot bring your own embedding model — locked into Snowflake's embedding.
- Search is limited to text extracted from documents — no native image/diagram understanding.

### Alternative: Custom RAG with pgvector or Pinecone
Would give full control over embeddings, chunking, and reranking, but adds 3-4 components to operate (embedding model, vector store, ingestion pipeline, reranking model). For a PoC with < 100 documents, the managed approach is the right call.

---

## ADR-003: Structured Data Access — Cortex Analyst vs Direct SQL

### Decision
Use Cortex Analyst with a semantic model for NL-to-SQL over employee data,
rather than hardcoding SQL queries or building a custom NL-to-SQL system.

### Pros
- Declarative: The semantic model (YAML) describes tables, columns, relationships, and business logic in plain language.
- Cortex Analyst generates and returns the SQL — fully auditable, no black box.
- Governance is enforced at execution time — the generated SQL runs through RBAC and masking.
- No ML training or fine-tuning needed — the semantic model IS the knowledge layer.
- Version-controllable — the YAML file lives in Git like any other config.

### Cons
- Complex joins or multi-step analytics can produce incorrect SQL. The semantic model mitigates this but doesn't eliminate it.
- The semantic model format is Snowflake-proprietary — not portable to other NL-to-SQL systems.
- Latency: NL-to-SQL adds 1-3 seconds vs direct SQL. Acceptable for conversational use, not for dashboards.
- Limited to SELECT queries — cannot generate INSERT/UPDATE/DELETE (by design, for safety).

---

## ADR-004: Frontend Architecture — React Responsive UI

### Decision
Build a React-based responsive chat interface (desktop sidebar + mobile drawer),
served as a static SPA with REST connection to the FastAPI backend.

### Pros
- Responsive layout: persistent sidebar on desktop (≥900px), slide-out drawer on mobile — single codebase covers both form factors.
- Rich interactions: expandable source citations, typing indicators, action chips, quick-topic shortcuts.
- WebSocket endpoint also available for streaming responses.
- Can be packaged as a PWA or embedded in existing employee portals.
- Demo mode (no backend needed) makes the UI independently demonstrable.

### Cons
- Requires a separate build/deploy pipeline for the frontend.
- For production, needs to be integrated with SSO (Okta, Azure AD) for user identity.

### Alternatives
- **Snowflake Intelligence native UI**: Once Snowflake Intelligence Skills reach GA, the agent could be accessed directly through Snowsight or the Snowflake mobile app — no custom frontend needed. Likely production end-state.
- **Slack/Teams bot**: Lower development effort, meets users where they already work. Recommended as a parallel channel.

---

## ADR-005: Authentication — RSA Key-Pair (not password)

### Decision
Use RSA key-pair authentication for the backend service user rather than username/password.

### Why
- The Cortex Analyst REST API (`/api/v2/cortex/analyst/message`) requires a Bearer JWT signed with a private key — password auth is not accepted by this endpoint.
- Snowflake accounts with MFA enforced (the default for new Enterprise accounts) block password-based programmatic connections outright.
- Key-pair auth is Snowflake's recommended approach for service accounts.

### How it works
1. A 2048-bit RSA key pair is generated locally.
2. The **public key** is registered with the Snowflake user via `ALTER USER ... SET RSA_PUBLIC_KEY`.
3. The **private key** stays on the application server (referenced via `SNOWFLAKE_PRIVATE_KEY_PATH` in `.env`, excluded from git via `.gitignore`).
4. For each Cortex Analyst REST call, `_make_jwt()` in `main.py` signs a short-lived JWT (1 hour TTL) with the private key. Snowflake verifies this against the registered public key.
5. The same private key is passed to `snowflake.connector.connect()` for SQL connections — no password needed.

---

## ADR-006: Security Architecture

### Layered Security Model

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1 — Network                                       │
│  PrivateLink / VPC · IP allow-lists · TLS 1.3            │
├─────────────────────────────────────────────────────────┤
│  Layer 2 — Identity                                      │
│  SSO (SAML/OIDC) · SCIM provisioning · MFA               │
├─────────────────────────────────────────────────────────┤
│  Layer 3 — Authorisation (RBAC)                          │
│  Role hierarchy · Object-level grants · Warehouse access  │
├─────────────────────────────────────────────────────────┤
│  Layer 4 — Data Protection                               │
│  Column masking · Row access policies · Dynamic data masking │
├─────────────────────────────────────────────────────────┤
│  Layer 5 — AI Governance                                 │
│  Cortex respects RBAC · No training on customer data ·    │
│  Horizon Catalog: classification, lineage, AI audit log   │
├─────────────────────────────────────────────────────────┤
│  Layer 6 — Application                                   │
│  Output guardrails · Intent classification · Prompt       │
│  injection defense · Human-in-the-loop for actions        │
├─────────────────────────────────────────────────────────┤
│  Layer 7 — Observability                                 │
│  Interaction logging · Cost monitoring · Eval harness     │
│  Resource monitors · Alert on anomalous usage             │
└─────────────────────────────────────────────────────────┘
```

### Key Security Properties
1. **No data exfiltration**: LLMs run inside the Snowflake service boundary. Prompts and data are not sent to external model providers.
2. **No model training on your data**: Snowflake contractually does not use customer data to train models.
3. **RBAC enforcement**: Cortex tools (Analyst, Search) respect the calling session's role and privileges. If a column is masked for a role, it stays masked when the LLM processes it.
4. **Audit trail**: Every prompt, tool invocation, retrieved row, and generated response is logged.

### What "Data Stays in Your Perimeter" Actually Means
Snowflake is a cloud SaaS platform. Your data is stored in cloud object storage (S3/Azure Blob/GCS) managed by Snowflake in your chosen region. "Perimeter" means:
- Data is encrypted at rest (AES-256) and in transit (TLS 1.3)
- Data is logically isolated per account
- AI inference is processed on Snowflake-managed GPU compute in the same region
- No data copies are sent to model providers (OpenAI, Anthropic, Meta)
- Optional: Tri-Secret Secure (customer-managed keys) for additional key control
- Optional: PrivateLink for network-level isolation

This is NOT the same as on-premises. If the organisation has a hard requirement for data to reside on self-managed infrastructure, Snowflake (and this architecture) does not satisfy it. The alternative would be a self-hosted stack (Ollama + pgvector + LangGraph on Kubernetes), which trades operational complexity for full physical control.

---

## Production Readiness Checklist

Before scaling from PoC to production, address:

- [ ] SSO integration (SAML/OIDC) for user identity propagation
- [ ] PrivateLink enabled for network isolation
- [ ] Customer-managed keys (Tri-Secret Secure) if required
- [ ] Eval harness: 50+ golden Q&A pairs with automated regression
- [ ] Model-version pinning policy (GA models only in prod)
- [ ] Cost modelling: projected credits/month based on load test
- [ ] Prompt injection testing (red team the agent with adversarial inputs)
- [ ] Output guardrails (PII detection in responses, toxicity filter)
- [ ] Human-in-the-loop workflow for action-taking (leave, tickets)
- [ ] SLA definition: latency p95, availability, accuracy target
- [ ] Change management: employee comms, training, feedback channel
- [ ] Data refresh pipeline: HRIS → Snowflake (Snowpipe Streaming or batch)
