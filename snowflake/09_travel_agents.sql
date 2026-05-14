-- ============================================================================
-- 09_TRAVEL_AGENTS.SQL
-- Tables for multi-agent travel automation demo
-- Run as EX_CHATBOT_ADMIN after 07_extended_data.sql
-- ============================================================================

USE ROLE EX_CHATBOT_ADMIN;
USE DATABASE EX_CHATBOT;
USE SCHEMA HR_DATA;
USE WAREHOUSE EX_CHATBOT_WH;

-- ── Travel Requests (orchestrator creates this first) ─────────────────────
CREATE TABLE IF NOT EXISTS TRAVEL_REQUESTS (
    REQUEST_ID       VARCHAR(30)   NOT NULL PRIMARY KEY,
    EMP_ID           VARCHAR(20)   NOT NULL,
    DESTINATION      VARCHAR(200),
    PURPOSE          VARCHAR(500),
    START_DATE       DATE,
    END_DATE         DATE,
    TOTAL_NIGHTS     INTEGER       AS (DATEDIFF('day', START_DATE, END_DATE)),
    STATUS           VARCHAR(30)   DEFAULT 'Processing',
    TOTAL_COST       NUMBER(10,2),
    CREATED_AT       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── Travel Bookings (flight + hotel agents write here) ────────────────────
CREATE TABLE IF NOT EXISTS TRAVEL_BOOKINGS (
    BOOKING_ID       VARCHAR(30)   NOT NULL PRIMARY KEY,
    REQUEST_ID       VARCHAR(30)   NOT NULL,
    EMP_ID           VARCHAR(20)   NOT NULL,
    BOOKING_TYPE     VARCHAR(50),              -- 'Flight', 'Hotel'
    VENDOR           VARCHAR(200),
    BOOKING_REF      VARCHAR(100),
    DETAILS          VARIANT,                  -- JSON: flight/hotel specifics
    CHECK_IN         DATE,
    CHECK_OUT        DATE,
    COST             NUMBER(10,2),
    CURRENCY         VARCHAR(10)   DEFAULT 'USD',
    STATUS           VARCHAR(30)   DEFAULT 'Confirmed',
    BOOKED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── Calendar Blocks (calendar agent writes here) ──────────────────────────
CREATE TABLE IF NOT EXISTS CALENDAR_BLOCKS (
    BLOCK_ID         VARCHAR(30)   NOT NULL PRIMARY KEY,
    EMP_ID           VARCHAR(20)   NOT NULL,
    TITLE            VARCHAR(300),
    START_DATE       DATE,
    END_DATE         DATE,
    BLOCK_TYPE       VARCHAR(50)   DEFAULT 'Travel',   -- 'Travel', 'Leave', 'OOO'
    REFERENCE_ID     VARCHAR(30),
    CREATED_AT       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── Approval Requests (approval agent writes here) ────────────────────────
CREATE TABLE IF NOT EXISTS APPROVAL_REQUESTS (
    APPROVAL_ID      VARCHAR(30)   NOT NULL PRIMARY KEY,
    REQUEST_TYPE     VARCHAR(50),              -- 'Travel', 'Leave', 'Expense'
    REFERENCE_ID     VARCHAR(30),
    EMP_ID           VARCHAR(20),
    APPROVER_ID      VARCHAR(20),
    STATUS           VARCHAR(30)   DEFAULT 'Pending',
    SUBMITTED_AT     TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    REVIEWED_AT      TIMESTAMP_NTZ,
    NOTES            VARCHAR(500)
);

-- ── Permissions ───────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON TABLE TRAVEL_REQUESTS    TO ROLE EX_CHATBOT_APP;
GRANT SELECT, INSERT ON TABLE TRAVEL_BOOKINGS    TO ROLE EX_CHATBOT_APP;
GRANT SELECT, INSERT ON TABLE CALENDAR_BLOCKS    TO ROLE EX_CHATBOT_APP;
GRANT SELECT, INSERT ON TABLE APPROVAL_REQUESTS  TO ROLE EX_CHATBOT_APP;
GRANT SELECT        ON TABLE TRAVEL_REQUESTS     TO ROLE EX_CHATBOT_USER;

GRANT ALL ON TABLE TRAVEL_REQUESTS    TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE TRAVEL_BOOKINGS    TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE CALENDAR_BLOCKS    TO ROLE EX_CHATBOT_ADMIN;
GRANT ALL ON TABLE APPROVAL_REQUESTS  TO ROLE EX_CHATBOT_ADMIN;

-- ── UPDATE on TRAVEL_REQUESTS (needed to set final status + cost) ─────────
GRANT UPDATE ON TABLE TRAVEL_REQUESTS TO ROLE EX_CHATBOT_APP;
GRANT UPDATE ON TABLE APPROVAL_REQUESTS TO ROLE EX_CHATBOT_APP;

SELECT 'Travel agent tables created.' AS status;
