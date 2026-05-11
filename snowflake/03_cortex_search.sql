-- ============================================================================
-- 03_CORTEX_SEARCH.SQL
-- Cortex Search service for RAG over policy documents
-- Run as EX_CHATBOT_ADMIN
-- ============================================================================

USE ROLE EX_CHATBOT_ADMIN;
USE DATABASE EX_CHATBOT;
USE SCHEMA KNOWLEDGE_BASE;
USE WAREHOUSE EX_CHATBOT_WH;

-- ── 1. Stage for policy documents ─────────────────────────────────────────
-- Upload PDF/DOCX/MD files to this stage
CREATE STAGE IF NOT EXISTS POLICY_DOCS
  DIRECTORY = (ENABLE = TRUE)
  COMMENT = 'Policy documents for Cortex Search ingestion';

-- ── 2. Document metadata table ────────────────────────────────────────────
CREATE OR REPLACE TABLE POLICY_DOCUMENTS (
    DOC_ID          VARCHAR(50)   PRIMARY KEY,
    TITLE           VARCHAR(500),
    CATEGORY        VARCHAR(100),
    CONTENT         VARCHAR(16000000),  -- Full text content
    VERSION         VARCHAR(20),
    EFFECTIVE_DATE  DATE,
    AUDIENCE        VARCHAR(100)  DEFAULT 'All Employees',
    REGION          VARCHAR(50)   DEFAULT 'Global',
    LAST_UPDATED    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ── 3. Sample policy documents ────────────────────────────────────────────
INSERT INTO POLICY_DOCUMENTS VALUES
('POL-001','Global Mobility Policy','Travel & Remote Work',
'Global Mobility Policy v4.2

Section 3.1 — Remote Work from Abroad
Employees may work remotely from an approved country for up to 30 calendar days per year, subject to:
1. Manager approval via the Remote Work Request form (HR Portal > Forms > Remote Work)
2. Tax desk pre-clearance — mandatory for stays exceeding 14 days
3. The destination country must appear on the Approved Country List (28 countries as of Jan 2026)

Important considerations:
- Social security implications apply in EU/EEA countries from Day 1 under the Posted Workers Directive
- Tax equalisation may apply for stays over 20 days in high-tax jurisdictions
- Business travel insurance coverage is limited to 45 days total per calendar year
- VPN access from certain countries may require additional security clearance from IT Security

Contact: Global Mobility team (global.mobility@company.com) or your HR Business Partner.

Section 3.2 — Permanent International Transfer
Permanent transfers require VP-level approval and a minimum 90-day lead time for immigration and tax structuring.
','4.2','2026-01-15','All Employees','Global',CURRENT_TIMESTAMP()),

('POL-002','Annual Leave Policy','Leave & Time Off',
'Annual Leave Policy v6.1

Entitlement by Region:
- Americas: 20 days per fiscal year
- EMEA: 25 days per fiscal year (statutory minimum compliance)
- APAC: 24 days per fiscal year

Carry-Forward:
- Up to 5 days may be carried forward to the next fiscal year
- Carry-forward days expire on September 30 of the following year
- No cash-out of unused leave is permitted except at termination

Approval Process:
- Up to 3 consecutive days: Manager approval only
- 4–10 consecutive days: Manager + skip-level notification
- Over 10 consecutive days: VP approval required, minimum 30 days notice

Bereavement Leave:
- Immediate family: 5 days paid leave
- Extended family: 3 days paid leave
- India-specific: Additional provisions per the Shops & Establishments Act

Public Holidays:
- Follow the public holiday calendar of your employment country
- Floating holidays: 2 per year, usable for cultural or religious observance
','6.1','2025-11-01','All Employees','Global',CURRENT_TIMESTAMP()),

('POL-003','IT Acceptable Use Policy','IT & Security',
'IT Acceptable Use Policy v3.0

VPN Requirements:
- All remote access to corporate resources must use the Cisco AnyConnect VPN client
- Split tunneling is disabled by default; full tunnel is enforced
- VPN sessions time out after 8 hours of continuous connection; re-authentication required
- Known issue: macOS 15.x users may experience intermittent disconnections — update to AnyConnect 5.1.4+ resolves this

Password Policy:
- Minimum 14 characters, with complexity requirements (upper, lower, digit, special)
- Passwords expire every 90 days; 12-password history enforced
- Self-service password reset available via Okta (https://sso.company.com/reset)
- MFA is mandatory for all employees — Okta Verify or YubiKey

Software Requests:
- Standard software catalog available in ServiceNow > Service Catalog
- Non-standard software requires IT Security review (SLA: 5 business days)
- Personal devices may not be used to access Tier-1 classified data

IT Support:
- Tier 1 (Service Desk): Slack #it-help or ServiceNow portal
- Tier 2 (Specialist): Auto-escalated based on category and SLA
- Average resolution: P1 = 2 hours, P2 = 8 hours, P3 = 24 hours, P4 = 72 hours
','3.0','2026-02-01','All Employees','Global',CURRENT_TIMESTAMP()),

('POL-004','Code of Conduct','Compliance',
'Code of Conduct v2.5

Our Values:
We are committed to maintaining the highest standards of ethical conduct in all business dealings. Every employee is expected to act with integrity, respect, and accountability.

Conflicts of Interest:
- Employees must disclose any actual or potential conflicts of interest to their manager and the Ethics Office
- Outside employment requires written approval from your VP
- Gifts from vendors exceeding $50 in value must be reported

Reporting Concerns:
- Ethics hotline: Available 24/7 in all operating countries (anonymous reporting available)
- No retaliation policy: The company strictly prohibits retaliation against anyone who reports a concern in good faith
- Investigation SLA: All reports acknowledged within 48 hours, initial assessment within 5 business days

Data Handling:
- Classify all data according to the Data Classification Standard (Public, Internal, Confidential, Restricted)
- Restricted data must not be shared via email or stored on personal devices
- AI tool usage: Enterprise-approved AI tools only; do not paste Confidential/Restricted data into external AI services
','2.5','2025-08-01','All Employees','Global',CURRENT_TIMESTAMP());

-- ── 4. Create Cortex Search Service ──────────────────────────────────────
-- This creates the hybrid (semantic + keyword) search index
CREATE OR REPLACE CORTEX SEARCH SERVICE EX_POLICY_SEARCH
  ON CONTENT
  ATTRIBUTES CATEGORY, REGION, AUDIENCE
  WAREHOUSE = EX_CORTEX_WH
  TARGET_LAG = '1 hour'
  AS (
    SELECT
      DOC_ID,
      TITLE,
      CATEGORY,
      CONTENT,
      REGION,
      AUDIENCE,
      VERSION,
      EFFECTIVE_DATE
    FROM POLICY_DOCUMENTS
    WHERE CONTENT IS NOT NULL
  );

-- Grant search access
GRANT USAGE ON CORTEX SEARCH SERVICE EX_POLICY_SEARCH
  TO ROLE EX_CHATBOT_APP;

SELECT 'Cortex Search service created and indexed.' AS status;
