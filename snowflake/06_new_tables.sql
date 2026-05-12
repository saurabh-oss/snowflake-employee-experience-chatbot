-- ============================================================================
-- 06_NEW_TABLES.SQL
-- New tables for real-life EX chatbot scenarios:
-- Performance Reviews, Learning & Development, Benefits, Expenses, Leave Requests
-- Run as EX_CHATBOT_ADMIN after 02_create_tables_and_data.sql
-- ============================================================================

USE ROLE EX_CHATBOT_ADMIN;
USE DATABASE EX_CHATBOT;
USE SCHEMA HR_DATA;
USE WAREHOUSE EX_CHATBOT_WH;

-- ── 1. Performance Reviews ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS PERFORMANCE_REVIEWS (
    REVIEW_ID        VARCHAR(30)   NOT NULL PRIMARY KEY,
    EMP_ID           VARCHAR(20)   NOT NULL,
    REVIEWER_ID      VARCHAR(20),
    REVIEW_CYCLE     VARCHAR(50),          -- 'H1 FY26', 'Annual FY25'
    REVIEW_TYPE      VARCHAR(50),          -- 'Mid-Year', 'Annual', 'Probation'
    STATUS           VARCHAR(30)   DEFAULT 'Not Started',
    SELF_RATING      NUMBER(3,1),          -- 1.0 – 5.0
    MANAGER_RATING   NUMBER(3,1),
    FINAL_RATING     NUMBER(3,1),
    RATING_LABEL     VARCHAR(100),         -- 'Exceeds Expectations', etc.
    GOALS_MET        INTEGER,
    GOALS_TOTAL      INTEGER,
    DUE_DATE         DATE,
    SUBMITTED_AT     TIMESTAMP_NTZ,
    COMPLETED_AT     TIMESTAMP_NTZ,
    NOTES            VARCHAR(2000)
);

-- ── 2. Learning & Development (individual records) ────────────────────────
CREATE TABLE IF NOT EXISTS LEARNING_DEVELOPMENT (
    LD_ID            VARCHAR(30)   NOT NULL PRIMARY KEY,
    EMP_ID           VARCHAR(20)   NOT NULL,
    COURSE_NAME      VARCHAR(500),
    PROVIDER         VARCHAR(200),
    CATEGORY         VARCHAR(100),         -- 'Technical', 'Leadership', 'Compliance', 'Domain'
    LEARNING_TYPE    VARCHAR(50),          -- 'Online Course', 'Certification', 'Conference', 'Workshop', 'Book'
    STATUS           VARCHAR(30)   DEFAULT 'Planned',
    COST             NUMBER(10,2)  DEFAULT 0,
    CURRENCY         VARCHAR(10)   DEFAULT 'USD',
    FISCAL_YEAR      INTEGER,
    START_DATE       DATE,
    COMPLETION_DATE  DATE,
    APPROVED_BY      VARCHAR(20),
    CERTIFICATE_URL  VARCHAR(500)
);

-- ── 3. Learning Budget (annual per-employee) ──────────────────────────────
CREATE TABLE IF NOT EXISTS LEARNING_BUDGET (
    EMP_ID           VARCHAR(20)   NOT NULL,
    FISCAL_YEAR      INTEGER       NOT NULL,
    ANNUAL_BUDGET    NUMBER(10,2)  DEFAULT 2000,
    USED             NUMBER(10,2)  DEFAULT 0,
    COMMITTED        NUMBER(10,2)  DEFAULT 0,
    REMAINING        NUMBER(10,2)  AS (ANNUAL_BUDGET - USED - COMMITTED),
    PRIMARY KEY (EMP_ID, FISCAL_YEAR)
);

-- ── 4. Benefits Enrollment ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS BENEFITS_ENROLLMENT (
    EMP_ID                     VARCHAR(20)   NOT NULL,
    BENEFIT_TYPE               VARCHAR(100)  NOT NULL,  -- 'Health', 'Dental', 'Vision', '401k', 'RSU', 'Wellness', 'Life Insurance'
    PLAN_NAME                  VARCHAR(200),
    COVERAGE_TIER              VARCHAR(50),              -- 'Employee Only', 'Employee + Spouse', 'Family'
    EMPLOYEE_CONTRIB_MONTHLY   NUMBER(10,2),
    EMPLOYER_CONTRIB_MONTHLY   NUMBER(10,2),
    ENROLLMENT_DATE            DATE,
    STATUS                     VARCHAR(30)   DEFAULT 'Active',
    PRIMARY KEY (EMP_ID, BENEFIT_TYPE)
);

-- ── 5. Expense Reports ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS EXPENSE_REPORTS (
    EXPENSE_ID       VARCHAR(30)   NOT NULL PRIMARY KEY,
    EMP_ID           VARCHAR(20)   NOT NULL,
    REPORT_NAME      VARCHAR(200),
    CATEGORY         VARCHAR(100),         -- 'Travel', 'Meals', 'Software', 'Hardware', 'Training', 'Conference'
    AMOUNT           NUMBER(10,2),
    CURRENCY         VARCHAR(10)   DEFAULT 'USD',
    EXPENSE_DATE     DATE,
    DESCRIPTION      VARCHAR(500),
    POLICY_LIMIT     NUMBER(10,2),
    WITHIN_POLICY    BOOLEAN       AS (AMOUNT <= POLICY_LIMIT),
    STATUS           VARCHAR(30)   DEFAULT 'Draft',     -- 'Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'
    SUBMITTED_AT     TIMESTAMP_NTZ,
    APPROVED_BY      VARCHAR(20),
    APPROVED_AT      TIMESTAMP_NTZ
);

-- ── 6. Leave Requests (submitted requests pending approval) ───────────────
CREATE TABLE IF NOT EXISTS LEAVE_REQUESTS (
    REQUEST_ID       VARCHAR(30)   NOT NULL PRIMARY KEY,
    EMP_ID           VARCHAR(20)   NOT NULL,
    LEAVE_TYPE       VARCHAR(50),
    START_DATE       DATE,
    END_DATE         DATE,
    DAYS_REQUESTED   NUMBER(5,1),
    REASON           VARCHAR(500),
    STATUS           VARCHAR(30)   DEFAULT 'Pending',   -- 'Pending', 'Approved', 'Rejected', 'Cancelled'
    SUBMITTED_AT     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    REVIEWED_BY      VARCHAR(20),
    REVIEWED_AT      TIMESTAMP_NTZ,
    NOTES            VARCHAR(500)
);

-- ══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS
-- ══════════════════════════════════════════════════════════════════════════

-- App role: SELECT on all new tables
GRANT SELECT ON TABLE PERFORMANCE_REVIEWS  TO ROLE EX_CHATBOT_APP;
GRANT SELECT ON TABLE LEARNING_DEVELOPMENT TO ROLE EX_CHATBOT_APP;
GRANT SELECT ON TABLE LEARNING_BUDGET      TO ROLE EX_CHATBOT_APP;
GRANT SELECT ON TABLE BENEFITS_ENROLLMENT  TO ROLE EX_CHATBOT_APP;
GRANT SELECT ON TABLE EXPENSE_REPORTS      TO ROLE EX_CHATBOT_APP;
GRANT SELECT ON TABLE LEAVE_REQUESTS       TO ROLE EX_CHATBOT_APP;

-- App role: INSERT on action tables (chatbot creates tickets, expenses, leave requests)
GRANT INSERT ON TABLE EXPENSE_REPORTS  TO ROLE EX_CHATBOT_APP;
GRANT INSERT ON TABLE LEAVE_REQUESTS   TO ROLE EX_CHATBOT_APP;
GRANT INSERT ON TABLE IT_TICKETS       TO ROLE EX_CHATBOT_APP;

-- Admin role: full access
GRANT ALL ON TABLE PERFORMANCE_REVIEWS  TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE LEARNING_DEVELOPMENT TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE LEARNING_BUDGET      TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE BENEFITS_ENROLLMENT  TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE EXPENSE_REPORTS      TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE LEAVE_REQUESTS       TO ROLE EX_CHATBOT_ADMIN;

SELECT 'New tables created and permissions granted.' AS status;
