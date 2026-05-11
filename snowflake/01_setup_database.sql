-- ============================================================================
-- 01_SETUP_DATABASE.SQL
-- Employee Experience AI Chatbot — Snowflake Foundation Setup
-- Run as ACCOUNTADMIN or equivalent
-- ============================================================================

-- ── 1. Database & Schemas ──────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS EX_CHATBOT;
USE DATABASE EX_CHATBOT;

CREATE SCHEMA IF NOT EXISTS HR_DATA;           -- Structured employee data
CREATE SCHEMA IF NOT EXISTS KNOWLEDGE_BASE;    -- Unstructured docs (policies, KB)
CREATE SCHEMA IF NOT EXISTS AGENT_CONFIG;      -- Agent definitions, skills, semantic models
CREATE SCHEMA IF NOT EXISTS AUDIT;             -- Interaction logs, eval results

-- ── 2. Warehouses ──────────────────────────────────────────────────────────
-- Small XS warehouse for dev/POC (auto-suspend to save credits)
CREATE WAREHOUSE IF NOT EXISTS EX_CHATBOT_WH
  WAREHOUSE_SIZE = 'X-SMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE
  COMMENT = 'EX Chatbot POC — dev warehouse';

-- Separate warehouse for Cortex inference (isolate cost tracking)
CREATE WAREHOUSE IF NOT EXISTS EX_CORTEX_WH
  WAREHOUSE_SIZE = 'X-SMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE
  COMMENT = 'EX Chatbot POC — Cortex inference';

-- ── 3. Roles & RBAC ───────────────────────────────────────────────────────
-- Role hierarchy:
--   ACCOUNTADMIN
--     └── EX_CHATBOT_ADMIN   (full access, manages agent config)
--           └── EX_CHATBOT_APP   (app-level access, used by backend)
--                 └── EX_CHATBOT_USER  (end-user role, row/col restricted)

CREATE ROLE IF NOT EXISTS EX_CHATBOT_ADMIN;
CREATE ROLE IF NOT EXISTS EX_CHATBOT_APP;
CREATE ROLE IF NOT EXISTS EX_CHATBOT_USER;

GRANT ROLE EX_CHATBOT_USER TO ROLE EX_CHATBOT_APP;
GRANT ROLE EX_CHATBOT_APP  TO ROLE EX_CHATBOT_ADMIN;
GRANT ROLE EX_CHATBOT_ADMIN TO ROLE SYSADMIN;

-- Warehouse grants
GRANT USAGE ON WAREHOUSE EX_CHATBOT_WH TO ROLE EX_CHATBOT_APP;
GRANT USAGE ON WAREHOUSE EX_CORTEX_WH  TO ROLE EX_CHATBOT_APP;
GRANT USAGE ON WAREHOUSE EX_CHATBOT_WH TO ROLE EX_CHATBOT_USER;

-- Database + schema grants
GRANT USAGE ON DATABASE EX_CHATBOT TO ROLE EX_CHATBOT_APP;
GRANT USAGE ON ALL SCHEMAS IN DATABASE EX_CHATBOT TO ROLE EX_CHATBOT_APP;
GRANT SELECT ON ALL TABLES IN SCHEMA EX_CHATBOT.HR_DATA TO ROLE EX_CHATBOT_APP;
GRANT SELECT ON ALL TABLES IN SCHEMA EX_CHATBOT.KNOWLEDGE_BASE TO ROLE EX_CHATBOT_APP;

-- Cortex AI access
GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER TO ROLE EX_CHATBOT_APP;

-- ── 4. Resource Monitor (cost guardrail) ──────────────────────────────────
CREATE RESOURCE MONITOR IF NOT EXISTS EX_CHATBOT_MONITOR
  WITH CREDIT_QUOTA = 50               -- 50 credits/month for POC
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS
    ON 80 PERCENT DO NOTIFY
    ON 100 PERCENT DO SUSPEND;

ALTER WAREHOUSE EX_CHATBOT_WH SET RESOURCE_MONITOR = EX_CHATBOT_MONITOR;
ALTER WAREHOUSE EX_CORTEX_WH  SET RESOURCE_MONITOR = EX_CHATBOT_MONITOR;

-- ── 5. Network Policy (optional — for production hardening) ───────────────
-- Uncomment and customise for your org's IP ranges
-- CREATE NETWORK POLICY IF NOT EXISTS EX_CHATBOT_NET_POLICY
--   ALLOWED_IP_LIST = ('203.0.113.0/24', '198.51.100.0/24')
--   COMMENT = 'Restrict EX Chatbot access to corporate IPs';
-- ALTER ACCOUNT SET NETWORK_POLICY = EX_CHATBOT_NET_POLICY;

-- ── 6. Tags for governance (Horizon Catalog) ─────────────────────────────
CREATE TAG IF NOT EXISTS EX_CHATBOT.HR_DATA.SENSITIVITY
  ALLOWED_VALUES 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
  COMMENT = 'Data sensitivity classification for EX Chatbot data';

SELECT 'Foundation setup complete.' AS status;
