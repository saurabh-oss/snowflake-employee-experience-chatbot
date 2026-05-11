-- ============================================================================
-- 05_CORTEX_AGENT.SQL
-- Cortex Agent definition with Search + Analyst tools
-- Run as EX_CHATBOT_ADMIN
-- ============================================================================

USE ROLE EX_CHATBOT_ADMIN;
USE DATABASE EX_CHATBOT;
USE WAREHOUSE EX_CHATBOT_WH;

-- ── 1. Stage for semantic model (created in PUBLIC for Cortex Analyst REST API access) ──
USE SCHEMA PUBLIC;

CREATE STAGE IF NOT EXISTS SEMANTIC_MODELS
  DIRECTORY = (ENABLE = TRUE)
  COMMENT = 'Semantic model YAML files for Cortex Analyst';

-- Upload the YAML via Snowsight: Data → Databases → EX_CHATBOT → PUBLIC → Stages → SEMANTIC_MODELS → + Files
-- Or via SnowSQL:
-- PUT file://./04_semantic_model.yaml @EX_CHATBOT.PUBLIC.SEMANTIC_MODELS AUTO_COMPRESS=FALSE OVERWRITE=TRUE;

USE SCHEMA AGENT_CONFIG;

-- ── 2. Test Cortex Analyst standalone ────────────────────────────────────
-- Quick validation query (run interactively in Snowsight):
/*
SELECT SNOWFLAKE.CORTEX.COMPLETE(
  'llama3.1-70b',
  'How many annual leave days does employee EMP-4821 have remaining in FY26?'
) AS test_response;
*/

-- ── 3. Test Cortex Search standalone ─────────────────────────────────────
/*
SELECT PARSE_JSON(
  SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
    'EX_CHATBOT.KNOWLEDGE_BASE.EX_POLICY_SEARCH',
    '{
      "query": "working from another country policy",
      "columns": ["TITLE", "CONTENT", "CATEGORY"],
      "limit": 3
    }'
  )
) AS search_results;
*/

-- ── 4. Create the Cortex Agent ───────────────────────────────────────────
-- NOTE: Cortex Agents API is called from the backend via REST.
-- Below is the agent configuration stored as reference.
-- The actual agent orchestration happens in the Python backend
-- using the Snowflake Cortex Agent REST API.

CREATE OR REPLACE TABLE AGENT_DEFINITIONS (
    AGENT_ID        VARCHAR(50) PRIMARY KEY,
    AGENT_NAME      VARCHAR(200),
    DESCRIPTION     VARCHAR(2000),
    MODEL           VARCHAR(100),
    TOOLS           VARIANT,       -- JSON array of tool configs
    SYSTEM_PROMPT   VARCHAR(16000),
    CREATED_AT      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

INSERT INTO AGENT_DEFINITIONS
SELECT
  'ex-chatbot-v1',
  'Ask EX — Employee Experience Agent',
  'Multi-tool agent combining Cortex Search, Cortex Analyst, and external MCP connectors for employee self-service.',
  'claude-sonnet-4-20250514',
  PARSE_JSON('[
    {
      "type": "cortex_search",
      "name": "policy_search",
      "service": "EX_CHATBOT.KNOWLEDGE_BASE.EX_POLICY_SEARCH",
      "description": "Search company policies, handbooks, KB articles, and SOPs."
    },
    {
      "type": "cortex_analyst",
      "name": "employee_analyst",
      "semantic_model_stage": "@EX_CHATBOT.PUBLIC.SEMANTIC_MODELS/04_semantic_model.yaml",
      "description": "Generate SQL to query employee data — leave, headcount, attrition, tickets."
    }
  ]'),
  'You are Ask EX, an Employee Experience AI assistant. You help employees with HR questions, IT support, policy lookups, and manager analytics.

RULES:
1. Always ground answers in retrieved data — never fabricate.
2. Cite the source (policy name + section, or SQL query) in every answer.
3. For personal data questions (my leave, my tickets), always filter by the requesting user''s EMP_ID.
4. For manager questions (my team), filter by MANAGER_ID.
5. If you cannot find an answer, say so clearly and suggest who to contact.
6. Never expose salary data unless explicitly confirmed the user role permits it.
7. For actions (raise ticket, apply leave), confirm before executing.
8. Keep responses concise but complete. Use bullet points for lists.
9. Be warm, professional, and proactive — suggest related follow-ups.',
  CURRENT_TIMESTAMP();

-- ── 5. Audit log table ───────────────────────────────────────────────────
USE SCHEMA AUDIT;

CREATE OR REPLACE TABLE INTERACTION_LOG (
    LOG_ID          VARCHAR(50) DEFAULT UUID_STRING(),
    SESSION_ID      VARCHAR(50),
    EMP_ID          VARCHAR(20),
    USER_ROLE       VARCHAR(50),
    TIMESTAMP       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    USER_MESSAGE    VARCHAR(16000),
    AGENT_RESPONSE  VARCHAR(16000),
    TOOLS_CALLED    VARIANT,       -- JSON: which tools were invoked
    TOKENS_USED     INTEGER,
    LATENCY_MS      INTEGER,
    FEEDBACK        VARCHAR(20)    -- thumbs_up, thumbs_down, null
);

-- Restrict audit access to admin only
GRANT SELECT ON TABLE INTERACTION_LOG TO ROLE EX_CHATBOT_ADMIN;
GRANT INSERT ON TABLE INTERACTION_LOG TO ROLE EX_CHATBOT_APP;

SELECT 'Agent config and audit log created.' AS status;
