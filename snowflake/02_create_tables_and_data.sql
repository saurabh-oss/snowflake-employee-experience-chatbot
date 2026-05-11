-- ============================================================================
-- 02_CREATE_TABLES_AND_DATA.SQL
-- Employee data tables, sample data, masking & row-access policies
-- Run as EX_CHATBOT_ADMIN
-- ============================================================================

USE ROLE EX_CHATBOT_ADMIN;
USE DATABASE EX_CHATBOT;
USE SCHEMA HR_DATA;
USE WAREHOUSE EX_CHATBOT_WH;

-- ── 1. Employee Directory ─────────────────────────────────────────────────
CREATE OR REPLACE TABLE EMPLOYEES (
    EMP_ID          VARCHAR(20)   PRIMARY KEY,
    FULL_NAME       VARCHAR(200)  NOT NULL,
    EMAIL           VARCHAR(200),
    DEPARTMENT      VARCHAR(100),
    TEAM            VARCHAR(100),
    JOB_TITLE       VARCHAR(200),
    MANAGER_ID      VARCHAR(20),
    LOCATION        VARCHAR(100),
    REGION          VARCHAR(50),
    HIRE_DATE       DATE,
    EMPLOYMENT_TYPE VARCHAR(50)   DEFAULT 'Full-Time',
    SALARY          NUMBER(12,2),
    CURRENCY        VARCHAR(10)   DEFAULT 'USD',
    STATUS          VARCHAR(20)   DEFAULT 'Active'
);

-- Tag sensitive columns
ALTER TABLE EMPLOYEES MODIFY COLUMN SALARY
  SET TAG EX_CHATBOT.HR_DATA.SENSITIVITY = 'RESTRICTED';
ALTER TABLE EMPLOYEES MODIFY COLUMN EMAIL
  SET TAG EX_CHATBOT.HR_DATA.SENSITIVITY = 'CONFIDENTIAL';

-- ── 2. Leave Balances ─────────────────────────────────────────────────────
CREATE OR REPLACE TABLE EMPLOYEE_LEAVE (
    EMP_ID          VARCHAR(20)  REFERENCES EMPLOYEES(EMP_ID),
    FISCAL_YEAR     INTEGER,
    LEAVE_TYPE      VARCHAR(50),
    TOTAL_ENTITLED  NUMBER(5,1),
    TAKEN           NUMBER(5,1)  DEFAULT 0,
    PRE_APPROVED    NUMBER(5,1)  DEFAULT 0,
    BALANCE         NUMBER(5,1)  AS (TOTAL_ENTITLED - TAKEN - PRE_APPROVED),
    CARRY_FORWARD   NUMBER(5,1)  DEFAULT 0,
    UPDATED_AT      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── 3. IT Assets ──────────────────────────────────────────────────────────
CREATE OR REPLACE TABLE IT_ASSETS (
    ASSET_ID        VARCHAR(30)  PRIMARY KEY,
    EMP_ID          VARCHAR(20)  REFERENCES EMPLOYEES(EMP_ID),
    ASSET_TYPE      VARCHAR(50),
    MAKE_MODEL      VARCHAR(200),
    SERIAL_NUMBER   VARCHAR(100),
    ASSIGNED_DATE   DATE,
    STATUS          VARCHAR(30)  DEFAULT 'Active'
);

-- ── 4. IT Tickets ─────────────────────────────────────────────────────────
CREATE OR REPLACE TABLE IT_TICKETS (
    TICKET_ID       VARCHAR(30)  PRIMARY KEY,
    EMP_ID          VARCHAR(20)  REFERENCES EMPLOYEES(EMP_ID),
    CATEGORY        VARCHAR(100),
    SUBCATEGORY     VARCHAR(100),
    PRIORITY        VARCHAR(10),
    SUMMARY         VARCHAR(500),
    STATUS          VARCHAR(30)  DEFAULT 'Open',
    ASSIGNED_GROUP  VARCHAR(100),
    CREATED_AT      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    RESOLVED_AT     TIMESTAMP_NTZ
);

-- ── 5. Attrition Fact ─────────────────────────────────────────────────────
CREATE OR REPLACE TABLE ATTRITION_FACT (
    PERIOD          VARCHAR(10),
    DEPARTMENT      VARCHAR(100),
    TEAM            VARCHAR(100),
    MANAGER_ID      VARCHAR(20),
    HEADCOUNT_START INTEGER,
    EXITS           INTEGER,
    ATTRITION_RATE  NUMBER(5,2) AS (ROUND(EXITS / NULLIF(HEADCOUNT_START, 0) * 100, 2)),
    TOP_EXIT_REASON VARCHAR(200)
);

-- ══════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO EMPLOYEES VALUES
('EMP-4821','Jordan Rivera','jordan.rivera@company.com','Engineering','Platform','Sr. Software Engineer','EMP-1001','San Francisco','AMER','2021-03-15','Full-Time',165000,'USD','Active'),
('EMP-1001','Alex Chen','alex.chen@company.com','Engineering','Platform','Engineering Manager','EMP-0500','San Francisco','AMER','2019-01-10','Full-Time',195000,'USD','Active'),
('EMP-3302','Priya Sharma','priya.sharma@company.com','Engineering','Platform','Software Engineer','EMP-1001','Bangalore','APAC','2022-06-01','Full-Time',3800000,'INR','Active'),
('EMP-5510','Maria Gonzalez','maria.gonzalez@company.com','Human Resources','HR Operations','HR Business Partner','EMP-0200','London','EMEA','2020-09-20','Full-Time',82000,'GBP','Active'),
('EMP-2201','James Okafor','james.okafor@company.com','Engineering','Platform','DevOps Engineer','EMP-1001','London','EMEA','2023-01-15','Full-Time',78000,'GBP','Active'),
('EMP-6644','Sarah Kim','sarah.kim@company.com','Engineering','Data','Data Engineer','EMP-1002','San Francisco','AMER','2022-11-01','Full-Time',155000,'USD','Active'),
('EMP-7789','Tom Watson','tom.watson@company.com','IT','Service Desk','IT Support Analyst','EMP-0300','London','EMEA','2021-07-10','Full-Time',52000,'GBP','Active'),
('EMP-8890','Nina Patel','nina.patel@company.com','Engineering','Platform','QA Engineer','EMP-1001','Bangalore','APAC','2023-04-01','Full-Time',2900000,'INR','Active');

INSERT INTO EMPLOYEE_LEAVE (EMP_ID, FISCAL_YEAR, LEAVE_TYPE, TOTAL_ENTITLED, TAKEN, PRE_APPROVED, CARRY_FORWARD, UPDATED_AT) VALUES
('EMP-4821',2026,'Annual Leave',20,8,3,5,CURRENT_TIMESTAMP()),
('EMP-4821',2026,'Sick Leave',10,2,0,0,CURRENT_TIMESTAMP()),
('EMP-3302',2026,'Annual Leave',24,6,0,0,CURRENT_TIMESTAMP()),
('EMP-5510',2026,'Annual Leave',25,10,2,3,CURRENT_TIMESTAMP()),
('EMP-1001',2026,'Annual Leave',20,5,0,5,CURRENT_TIMESTAMP()),
('EMP-2201',2026,'Annual Leave',25,12,0,0,CURRENT_TIMESTAMP());

INSERT INTO IT_ASSETS VALUES
('ASSET-10421','EMP-4821','Laptop','MacBook Pro 16" M4 Max','C02ZX1234567','2024-01-15','Active'),
('ASSET-10422','EMP-4821','Monitor','Dell U2723QE','CN-0XYZ-12345','2024-01-15','Active'),
('ASSET-10301','EMP-3302','Laptop','ThinkPad X1 Carbon Gen 12','PF-3ABCDE','2022-06-15','Active');

INSERT INTO IT_TICKETS VALUES
('INC-78430','EMP-4821','Software','VPN','P3','Cisco AnyConnect crashes on macOS 15.2','Resolved','Network Ops','2026-04-01 09:00:00','2026-04-01 13:30:00'),
('INC-78431','EMP-3302','Access','Permissions','P4','Need access to prod-analytics Snowflake role','Open','IAM Team','2026-04-10 06:30:00',NULL),
('INC-78432','EMP-4821','Network','VPN','P3','VPN disconnects every ~10 min','Open','Network Ops','2026-05-11 10:15:00',NULL);

INSERT INTO ATTRITION_FACT (PERIOD, DEPARTMENT, TEAM, MANAGER_ID, HEADCOUNT_START, EXITS, TOP_EXIT_REASON) VALUES
('Q1 FY26','Engineering','Platform','EMP-1001',42,2,'Better compensation'),
('Q2 FY26','Engineering','Platform','EMP-1001',44,1,'Relocation'),
('Q3 FY26','Engineering','Platform','EMP-1001',43,3,'Compensation (market correction)'),
('Q4 FY26','Engineering','Platform','EMP-1001',41,0,NULL);

-- ══════════════════════════════════════════════════════════════════════════
-- MASKING POLICIES (salary hidden from non-admin roles)
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE MASKING POLICY SALARY_MASK AS (val NUMBER(12,2))
  RETURNS NUMBER(12,2) ->
  CASE
    WHEN CURRENT_ROLE() IN ('EX_CHATBOT_ADMIN', 'ACCOUNTADMIN') THEN val
    ELSE NULL  -- masked for app + user roles
  END;

ALTER TABLE EMPLOYEES MODIFY COLUMN SALARY
  SET MASKING POLICY SALARY_MASK;

CREATE OR REPLACE MASKING POLICY EMAIL_MASK AS (val VARCHAR)
  RETURNS VARCHAR ->
  CASE
    WHEN CURRENT_ROLE() IN ('EX_CHATBOT_ADMIN', 'EX_CHATBOT_APP', 'ACCOUNTADMIN') THEN val
    ELSE CONCAT(LEFT(val, 2), '***@', SPLIT_PART(val, '@', 2))
  END;

ALTER TABLE EMPLOYEES MODIFY COLUMN EMAIL
  SET MASKING POLICY EMAIL_MASK;

-- ══════════════════════════════════════════════════════════════════════════
-- ROW ACCESS POLICY (users see only their own data unless manager/admin)
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE ROW ACCESS POLICY EMPLOYEE_ROW_POLICY AS (emp_id VARCHAR)
  RETURNS BOOLEAN ->
  CURRENT_ROLE() IN ('EX_CHATBOT_ADMIN', 'ACCOUNTADMIN')
  OR emp_id = CURRENT_USER()
  OR CURRENT_ROLE() = 'EX_CHATBOT_APP';  -- app role sees all (filters in agent logic)

ALTER TABLE EMPLOYEE_LEAVE ADD ROW ACCESS POLICY EMPLOYEE_ROW_POLICY ON (EMP_ID);

SELECT 'Tables, sample data, masking & row-access policies applied.' AS status;
