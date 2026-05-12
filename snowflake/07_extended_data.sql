-- ============================================================================
-- 07_EXTENDED_DATA.SQL
-- Realistic sample data for a software company EX chatbot demo:
-- 13 new employees, 20 IT tickets, performance reviews, L&D, benefits, expenses
-- Run as EX_CHATBOT_ADMIN after 06_new_tables.sql
-- ============================================================================

USE ROLE EX_CHATBOT_ADMIN;
USE DATABASE EX_CHATBOT;
USE SCHEMA HR_DATA;
USE WAREHOUSE EX_CHATBOT_WH;

-- ══════════════════════════════════════════════════════════════════════════
-- EMPLOYEES  (fills in existing manager gaps + adds new departments)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO EMPLOYEES (EMP_ID, FULL_NAME, EMAIL, DEPARTMENT, TEAM, JOB_TITLE, MANAGER_ID, LOCATION, REGION, HIRE_DATE, EMPLOYMENT_TYPE, SALARY, CURRENCY, STATUS) VALUES
-- Executive leadership (fills manager gaps referenced in existing data)
('EMP-0100','Victoria Osei','v.osei@company.com','Executive','Leadership','Chief Executive Officer',NULL,'San Francisco','AMER','2018-04-01','Full-Time',520000,'USD','Active'),
('EMP-0200','Rachel Torres','r.torres@company.com','People & HR','HR Leadership','Chief People Officer','EMP-0100','New York','AMER','2019-09-15','Full-Time',340000,'USD','Active'),
('EMP-0300','Omar Hassan','o.hassan@company.com','IT','IT Management','Head of IT & Security','EMP-0100','London','EMEA','2020-02-10','Full-Time',115000,'GBP','Active'),
('EMP-0500','David Park','d.park@company.com','Engineering','Engineering Leadership','VP of Engineering','EMP-0100','San Francisco','AMER','2019-11-04','Full-Time',395000,'USD','Active'),
('EMP-1002','Lisa Zhang','l.zhang@company.com','Engineering','Data','Data Engineering Manager','EMP-0500','Seattle','AMER','2021-05-17','Full-Time',210000,'USD','Active'),
-- Engineering: Mobile team
('EMP-2001','Ryan O''Brien','r.obrien@company.com','Engineering','Mobile','Engineering Manager','EMP-0500','Austin','AMER','2021-07-12','Full-Time',198000,'USD','Active'),
('EMP-2002','Aisha Johnson','a.johnson@company.com','Engineering','Mobile','Software Engineer II','EMP-2001','Austin','AMER','2023-04-03','Full-Time',148000,'USD','Active'),
-- Engineering: Frontend
('EMP-2003','Carlos Mendez','c.mendez@company.com','Engineering','Frontend','Senior Software Engineer','EMP-1001','Remote','AMER','2022-09-19','Full-Time',175000,'USD','Active'),
-- Product & Design
('EMP-2004','Ben Harris','b.harris@company.com','Product','Core Platform','Senior Product Manager','EMP-0500','Seattle','AMER','2022-03-14','Full-Time',185000,'USD','Active'),
('EMP-2005','Kavya Reddy','k.reddy@company.com','Design','UX','Product Designer','EMP-2004','Bangalore','APAC','2023-06-26','Full-Time',2800000,'INR','Active'),
-- Sales & Customer Success
('EMP-2006','Jennifer Walsh','j.walsh@company.com','Sales','Enterprise','Enterprise Account Executive','EMP-0100','Chicago','AMER','2021-11-08','Full-Time',135000,'USD','Active'),
('EMP-2007','Michael Chang','m.chang@company.com','Sales','Customer Success','Customer Success Manager','EMP-2006','Toronto','AMER','2022-08-15','Full-Time',120000,'CAD','Active'),
-- People & HR
('EMP-2008','Fatima Al-Rashid','f.alrashid@company.com','People & HR','Talent Acquisition','Talent Acquisition Partner','EMP-0200','Dubai','EMEA','2023-01-16','Full-Time',95000,'AED','Active'),
('EMP-2009','Oliver Bennett','o.bennett@company.com','People & HR','Learning & Development','L&D Specialist','EMP-0200','London','EMEA','2022-05-09','Full-Time',68000,'GBP','Active');

-- ══════════════════════════════════════════════════════════════════════════
-- LEAVE BALANCES  (extended — more employees and leave types)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO EMPLOYEE_LEAVE (EMP_ID, FISCAL_YEAR, LEAVE_TYPE, TOTAL_ENTITLED, TAKEN, PRE_APPROVED, CARRY_FORWARD, UPDATED_AT) VALUES
-- Existing employees: add missing leave types
('EMP-4821',2026,'Bereavement Leave',3,0,0,0,CURRENT_TIMESTAMP()),
('EMP-3302',2026,'Sick Leave',10,3,0,0,CURRENT_TIMESTAMP()),
('EMP-5510',2026,'Sick Leave',10,1,0,0,CURRENT_TIMESTAMP()),
('EMP-5510',2026,'Bereavement Leave',3,3,0,0,CURRENT_TIMESTAMP()),
('EMP-2201',2026,'Sick Leave',10,0,0,0,CURRENT_TIMESTAMP()),
('EMP-1001',2026,'Sick Leave',10,1,0,0,CURRENT_TIMESTAMP()),
('EMP-1001',2026,'Parental Leave',80,0,80,0,CURRENT_TIMESTAMP()),
-- New employees: annual, sick, and where relevant parental / study leave
('EMP-2001',2026,'Annual Leave',20,7,0,5,CURRENT_TIMESTAMP()),
('EMP-2001',2026,'Sick Leave',10,2,0,0,CURRENT_TIMESTAMP()),
('EMP-2002',2026,'Annual Leave',15,3,2,0,CURRENT_TIMESTAMP()),
('EMP-2002',2026,'Sick Leave',10,0,0,0,CURRENT_TIMESTAMP()),
('EMP-2003',2026,'Annual Leave',20,6,5,0,CURRENT_TIMESTAMP()),
('EMP-2003',2026,'Sick Leave',10,0,0,0,CURRENT_TIMESTAMP()),
('EMP-6644',2026,'Annual Leave',20,10,3,0,CURRENT_TIMESTAMP()),
('EMP-6644',2026,'Sick Leave',10,4,0,0,CURRENT_TIMESTAMP()),
('EMP-8890',2026,'Annual Leave',24,5,0,0,CURRENT_TIMESTAMP()),
('EMP-8890',2026,'Sick Leave',10,2,0,0,CURRENT_TIMESTAMP()),
('EMP-2004',2026,'Annual Leave',20,4,0,0,CURRENT_TIMESTAMP()),
('EMP-2004',2026,'Sick Leave',10,1,0,0,CURRENT_TIMESTAMP()),
('EMP-2005',2026,'Annual Leave',24,8,5,0,CURRENT_TIMESTAMP()),
('EMP-2006',2026,'Annual Leave',20,8,5,0,CURRENT_TIMESTAMP()),
('EMP-2006',2026,'Sick Leave',10,0,0,0,CURRENT_TIMESTAMP()),
('EMP-2007',2026,'Annual Leave',20,2,0,0,CURRENT_TIMESTAMP()),
('EMP-2008',2026,'Annual Leave',25,1,0,0,CURRENT_TIMESTAMP()),
('EMP-2009',2026,'Annual Leave',25,3,0,0,CURRENT_TIMESTAMP()),
('EMP-0500',2026,'Annual Leave',25,10,0,5,CURRENT_TIMESTAMP()),
('EMP-1002',2026,'Annual Leave',20,5,0,0,CURRENT_TIMESTAMP()),
('EMP-0200',2026,'Annual Leave',25,6,0,0,CURRENT_TIMESTAMP());

-- ══════════════════════════════════════════════════════════════════════════
-- IT ASSETS  (more realistic coverage)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO IT_ASSETS VALUES
('ASSET-20001','EMP-1001','Laptop','MacBook Pro 14" M3 Pro','C02ZX5678901','2024-06-01','Active'),
('ASSET-20002','EMP-2001','Laptop','MacBook Pro 16" M4 Max','C02ZX9999001','2024-09-15','Active'),
('ASSET-20003','EMP-2002','Laptop','MacBook Pro 14" M3','C02ZX7777001','2023-04-15','Active'),
('ASSET-20004','EMP-2003','Laptop','MacBook Pro 14" M3 Pro','C02ZX6666001','2022-10-01','Active'),
('ASSET-20005','EMP-2201','Laptop','ThinkPad X1 Carbon Gen 12','PF-3LMNOP','2023-01-20','Active'),
('ASSET-20006','EMP-6644','Laptop','MacBook Pro 14" M3','C02ZX5555001','2022-11-05','Active'),
('ASSET-20007','EMP-7789','Laptop','Dell Latitude 5540','SVC-DELL-7789-01','2021-07-10','Active'),
('ASSET-20008','EMP-2004','Laptop','MacBook Pro 14" M3 Pro','C02ZX4444001','2022-03-20','Active'),
('ASSET-20009','EMP-2004','Monitor','LG UltraFine 27" 4K','LG-27UK850-001','2022-03-20','Active'),
('ASSET-20010','EMP-5510','Laptop','MacBook Air M2','C02ZX3333001','2020-09-25','Active');

-- ══════════════════════════════════════════════════════════════════════════
-- IT TICKETS  (20 realistic tickets across categories and states)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO IT_TICKETS (TICKET_ID, EMP_ID, CATEGORY, SUBCATEGORY, PRIORITY, SUMMARY, STATUS, ASSIGNED_GROUP, CREATED_AT, RESOLVED_AT) VALUES
('INC-80001','EMP-4821','Software','AI Tools','P3','Request GitHub Copilot Business license for daily coding assistance','In Progress','IT Operations','2026-04-15 09:10:00',NULL),
('INC-80002','EMP-3302','Access','Cloud Access','P2','Need read access to production S3 buckets for data pipeline debugging','Resolved','Cloud Operations','2026-03-20 06:30:00','2026-03-21 14:00:00'),
('INC-80003','EMP-2201','Software','Containers','P3','Docker Desktop license expired — unable to run local dev environment','Resolved','IT Operations','2026-04-02 08:00:00','2026-04-02 16:00:00'),
('INC-80004','EMP-2002','Hardware','Laptop','P2','MacBook Pro battery draining fully in under 2 hours — possible faulty cell','In Progress','Hardware Support','2026-05-01 09:00:00',NULL),
('INC-80005','EMP-2003','Software','Design Tools','P4','Add to Figma Organization for design-engineering collaboration','Resolved','IT Operations','2026-04-08 10:00:00','2026-04-08 12:30:00'),
('INC-80006','EMP-8890','Access','Project Management','P4','QA team needs write access to JIRA automation project board','Resolved','Agile Tools Admin','2026-04-12 11:00:00','2026-04-13 09:00:00'),
('INC-80007','EMP-1001','Network','Conference Room','P2','Meeting room B WiFi dropping during video calls — happening daily','Resolved','Network Operations','2026-04-20 14:00:00','2026-04-21 10:00:00'),
('INC-80008','EMP-4821','Security','Phishing','P1','Received suspicious email impersonating CFO requesting wire transfer — forwarding for investigation','Resolved','Security Team','2026-04-25 08:30:00','2026-04-25 09:45:00'),
('INC-80009','EMP-5510','Access','HRIS','P2','Need Workday admin access to manage onboarding workflows for new hires','In Progress','IAM Team','2026-05-02 07:00:00',NULL),
('INC-80010','EMP-2004','Hardware','Peripherals','P3','External 4K monitor not detected after macOS 15.3 update — display settings reset','Resolved','Hardware Support','2026-04-18 13:00:00','2026-04-19 10:30:00'),
('INC-80011','EMP-2006','Software','CRM','P1','Salesforce to HubSpot sync broken — deal updates not reflecting in real time, blocking pipeline review','Open','Enterprise Applications','2026-05-08 09:00:00',NULL),
('INC-80012','EMP-6644','Access','Data Platform','P2','Request read access to FINANCE_DATA schema in Snowflake for cross-team analysis','Open','Data Platform','2026-05-09 06:45:00',NULL),
('INC-80013','EMP-2002','Software','Collaboration','P4','Slack desktop notifications not appearing on Mac — do not disturb is off, reinstall did not help','Resolved','Collaboration Tools','2026-04-05 09:00:00','2026-04-05 14:00:00'),
('INC-80014','EMP-2003','Software','Developer Tools','P3','VS Code Remote SSH extension times out connecting to dev server after latest extension update','Resolved','Developer Tools','2026-04-14 10:30:00','2026-04-15 09:00:00'),
('INC-80015','EMP-8890','Hardware','Peripherals','P4','Wireless keyboard intermittently disconnecting every 30 minutes — Bluetooth pairing issue','Resolved','Hardware Support','2026-03-28 11:00:00','2026-03-29 13:00:00'),
('INC-80016','EMP-2008','Software','Recruiting Tools','P3','Lever ATS access needed to manage new engineering candidate pipeline','In Progress','IAM Team','2026-05-06 08:00:00',NULL),
('INC-80017','EMP-1002','Software','Data Tools','P3','dbt Cloud seat license request to support new semantic layer model development','Resolved','IT Operations','2026-04-10 07:30:00','2026-04-11 09:00:00'),
('INC-80018','EMP-2007','Software','CS Platform','P2','Gainsight CS — unable to update customer health scores, throwing 403 error on save','Open','Enterprise Applications','2026-05-07 09:30:00',NULL),
('INC-80019','EMP-2009','Software','Learning Platform','P3','Activate LinkedIn Learning license to expand L&D course library for company-wide access','Resolved','IT Operations','2026-04-22 10:00:00','2026-04-22 15:00:00'),
('INC-80020','EMP-4821','Access','Source Control','P3','Need contributor access to new backend-api-v2 repository after team restructure','Resolved','Developer Tools','2026-04-30 09:15:00','2026-04-30 11:00:00');

-- ══════════════════════════════════════════════════════════════════════════
-- ATTRITION FACT  (multiple teams — makes analytics more interesting)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO ATTRITION_FACT (PERIOD, DEPARTMENT, TEAM, MANAGER_ID, HEADCOUNT_START, EXITS, TOP_EXIT_REASON) VALUES
-- Engineering / Mobile team
('Q1 FY26','Engineering','Mobile','EMP-2001',8,1,'Career Growth'),
('Q2 FY26','Engineering','Mobile','EMP-2001',8,0,NULL),
('Q3 FY26','Engineering','Mobile','EMP-2001',8,1,'Better Compensation'),
('Q4 FY26','Engineering','Mobile','EMP-2001',7,0,NULL),
-- Engineering / Data team
('Q1 FY26','Engineering','Data','EMP-1002',6,0,NULL),
('Q2 FY26','Engineering','Data','EMP-1002',7,1,'Work-Life Balance'),
('Q3 FY26','Engineering','Data','EMP-1002',7,0,NULL),
('Q4 FY26','Engineering','Data','EMP-1002',7,2,'Better Compensation'),
-- Sales / Enterprise team (higher churn — realistic for sales)
('Q1 FY26','Sales','Enterprise','EMP-2006',6,2,'Target Pressure'),
('Q2 FY26','Sales','Enterprise','EMP-2006',5,1,'Better Offer'),
('Q3 FY26','Sales','Enterprise','EMP-2006',5,0,NULL),
-- Product team
('Q1 FY26','Product','Core Platform','EMP-2004',5,0,NULL),
('Q2 FY26','Product','Core Platform','EMP-2004',5,1,'Role Clarity'),
('Q3 FY26','Product','Core Platform','EMP-2004',4,0,NULL);

-- ══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE REVIEWS
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO PERFORMANCE_REVIEWS
  (REVIEW_ID, EMP_ID, REVIEWER_ID, REVIEW_CYCLE, REVIEW_TYPE, STATUS,
   SELF_RATING, MANAGER_RATING, FINAL_RATING, RATING_LABEL,
   GOALS_MET, GOALS_TOTAL, DUE_DATE, SUBMITTED_AT, COMPLETED_AT, NOTES)
VALUES
-- Annual FY25 (completed)
('REV-001','EMP-4821','EMP-1001','Annual FY25','Annual','Complete',
  4.0,4.5,4.5,'Exceeds Expectations',4,5,'2026-01-31','2026-01-15','2026-01-31',
  'Strong technical delivery on Platform migration. Led incident reduction initiative.'),
('REV-002','EMP-3302','EMP-1001','Annual FY25','Annual','Complete',
  3.5,3.5,3.5,'Meets Expectations',3,5,'2026-01-31','2026-01-20','2026-01-31',
  'Good individual contributor. Needs to improve cross-team communication.'),
('REV-003','EMP-2201','EMP-1001','Annual FY25','Annual','Complete',
  4.0,4.0,4.0,'Meets Expectations',4,5,'2026-01-31','2026-01-18','2026-01-31',
  'Excellent on-call reliability. CI/CD improvements reduced deploy time by 40%.'),
('REV-004','EMP-8890','EMP-1001','Annual FY25','Annual','Complete',
  3.5,3.0,3.0,'Meets Expectations',3,5,'2026-01-31','2026-01-22','2026-01-31',
  'Solid QA coverage. Explore test automation ownership in H1.'),
('REV-005','EMP-6644','EMP-1002','Annual FY25','Annual','Complete',
  4.5,5.0,5.0,'Outstanding',5,5,'2026-01-31','2026-01-10','2026-01-31',
  'Exceptional impact. Built real-time event pipeline from scratch. Promotion recommended.'),
('REV-006','EMP-2001','EMP-0500','Annual FY25','Annual','Complete',
  4.5,4.5,4.5,'Exceeds Expectations',5,5,'2026-01-31','2026-01-12','2026-01-31',
  'Scaled Mobile team from 5 to 8 engineers. Excellent retention and delivery.'),
('REV-007','EMP-2002','EMP-2001','Annual FY25','Annual','Complete',
  3.5,4.0,4.0,'Meets Expectations',3,4,'2026-01-31','2026-01-25','2026-01-31',
  'Strong first year. Delivered push notification overhaul. Continue growing system design skills.'),
('REV-008','EMP-2003','EMP-1001','Annual FY25','Annual','Complete',
  4.0,4.0,4.0,'Meets Expectations',4,5,'2026-01-31','2026-01-19','2026-01-31',
  'Consistent senior-level delivery. Led design system adoption across Frontend team.'),
-- H1 FY26 Mid-Year Reviews (in progress — due June 30)
('REV-009','EMP-4821','EMP-1001','H1 FY26','Mid-Year','Manager Review',
  4.0,NULL,NULL,NULL,NULL,NULL,'2026-06-30','2026-05-02',NULL,NULL),
('REV-010','EMP-3302','EMP-1001','H1 FY26','Mid-Year','Self Assessment',
  NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-30',NULL,NULL,NULL),
('REV-011','EMP-2201','EMP-1001','H1 FY26','Mid-Year','Not Started',
  NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-30',NULL,NULL,NULL),
('REV-012','EMP-8890','EMP-1001','H1 FY26','Mid-Year','Self Assessment',
  3.5,NULL,NULL,NULL,NULL,NULL,'2026-06-30','2026-05-08',NULL,NULL),
('REV-013','EMP-6644','EMP-1002','H1 FY26','Mid-Year','Manager Review',
  5.0,NULL,NULL,NULL,NULL,NULL,'2026-06-30','2026-04-28',NULL,NULL),
('REV-014','EMP-2001','EMP-0500','H1 FY26','Mid-Year','Complete',
  4.5,4.5,4.5,'Exceeds Expectations',3,4,'2026-06-30','2026-04-20','2026-05-01',
  'On track for Director conversation. Mobile app reliability hit 99.95% uptime.'),
('REV-015','EMP-2002','EMP-2001','H1 FY26','Mid-Year','Self Assessment',
  NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-30',NULL,NULL,NULL),
('REV-016','EMP-2003','EMP-1001','H1 FY26','Mid-Year','Manager Review',
  4.5,NULL,NULL,NULL,NULL,NULL,'2026-06-30','2026-05-05',NULL,NULL);

-- ══════════════════════════════════════════════════════════════════════════
-- LEARNING & DEVELOPMENT
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO LEARNING_DEVELOPMENT
  (LD_ID, EMP_ID, COURSE_NAME, PROVIDER, CATEGORY, LEARNING_TYPE, STATUS,
   COST, CURRENCY, FISCAL_YEAR, START_DATE, COMPLETION_DATE, APPROVED_BY)
VALUES
('LD-001','EMP-4821','SnowPro Core Certification','Snowflake','Technical','Certification','Completed',375,'USD',2026,'2026-01-15','2026-02-28','EMP-1001'),
('LD-002','EMP-4821','Crucial Conversations Workshop','VitalSmarts','Leadership','Workshop','Completed',599,'USD',2026,'2026-03-10','2026-03-12','EMP-1001'),
('LD-003','EMP-4821','AWS re:Invent 2026','Amazon Web Services','Technical','Conference','Planned',1799,'USD',2026,'2026-12-01',NULL,'EMP-1001'),
('LD-004','EMP-3302','Google Cloud Professional Data Engineer','Google Cloud','Technical','Certification','In Progress',200,'USD',2026,'2026-04-01',NULL,'EMP-1001'),
('LD-005','EMP-6644','dbt Coalesce Conference 2026','dbt Labs','Technical','Conference','Completed',1200,'USD',2026,'2026-03-18','2026-03-22','EMP-1002'),
('LD-006','EMP-6644','Astronomer Airflow Fundamentals','Astronomer','Technical','Online Course','Completed',0,'USD',2026,'2026-01-10','2026-02-15','EMP-1002'),
('LD-007','EMP-2001','Engineering Leadership Bootcamp','Reforge','Leadership','Workshop','Planned',3500,'USD',2026,'2026-06-10',NULL,'EMP-0500'),
('LD-008','EMP-2002','Clean Code & TDD','Udemy','Technical','Online Course','Completed',30,'USD',2026,'2026-04-01','2026-04-20','EMP-2001'),
('LD-009','EMP-2003','Next.js Advanced Patterns','Frontend Masters','Technical','Online Course','Completed',390,'USD',2026,'2026-02-01','2026-03-15','EMP-1001'),
('LD-010','EMP-2003','AWS Certified Developer - Associate','Amazon Web Services','Technical','Certification','In Progress',300,'USD',2026,'2026-05-01',NULL,'EMP-1001'),
('LD-011','EMP-5510','SHRM-CP Certification','SHRM','Domain','Certification','Planned',595,'USD',2026,'2026-07-15',NULL,'EMP-0200'),
('LD-012','EMP-2009','ATD Certificate in Learning Facilitation','ATD','Domain','Workshop','Completed',850,'USD',2026,'2026-03-05','2026-03-08','EMP-0200'),
('LD-013','EMP-2004','Pragmatic Product Management','Pragmatic Institute','Domain','Workshop','Completed',1800,'USD',2026,'2026-02-20','2026-02-22','EMP-0500'),
('LD-014','EMP-2006','Strategic Selling - Miller Heiman','Miller Heiman','Domain','Workshop','Completed',2200,'USD',2026,'2026-01-08','2026-01-10','EMP-0100'),
('LD-015','EMP-1001','Staff+ Engineering Track','LeadDev','Technical','Conference','Planned',899,'USD',2026,'2026-09-15',NULL,'EMP-0500');

-- Learning Budgets FY26 (ANNUAL_BUDGET, USED, COMMITTED)
INSERT INTO LEARNING_BUDGET (EMP_ID, FISCAL_YEAR, ANNUAL_BUDGET, USED, COMMITTED) VALUES
('EMP-4821',2026,3000,974,1799),    -- remaining: 227
('EMP-3302',2026,2000,200,0),       -- remaining: 1800
('EMP-6644',2026,2000,1200,0),      -- remaining: 800
('EMP-2001',2026,4000,0,3500),      -- remaining: 500
('EMP-2002',2026,1500,30,0),        -- remaining: 1470
('EMP-2003',2026,2500,390,300),     -- remaining: 1810
('EMP-5510',2026,2000,0,595),       -- remaining: 1405
('EMP-2009',2026,2000,850,0),       -- remaining: 1150
('EMP-2004',2026,3000,1800,0),      -- remaining: 1200
('EMP-2006',2026,2500,2200,0),      -- remaining: 300
('EMP-1001',2026,5000,0,899);       -- remaining: 4101

-- ══════════════════════════════════════════════════════════════════════════
-- BENEFITS ENROLLMENT
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO BENEFITS_ENROLLMENT
  (EMP_ID, BENEFIT_TYPE, PLAN_NAME, COVERAGE_TIER, EMPLOYEE_CONTRIB_MONTHLY, EMPLOYER_CONTRIB_MONTHLY, ENROLLMENT_DATE, STATUS)
VALUES
-- Jordan Rivera (EMP-4821)
('EMP-4821','Health Insurance','PPO Plus','Employee Only',185,720,'2021-03-15','Active'),
('EMP-4821','Dental','Delta Dental Plus','Employee Only',28,52,'2021-03-15','Active'),
('EMP-4821','Vision','VSP Standard','Employee Only',8,12,'2021-03-15','Active'),
('EMP-4821','401(k)','Fidelity 401k — 4% Match','Employee Only',1375,550,'2021-03-15','Active'),
('EMP-4821','RSU Grant','FY23 Annual Refresh','Employee Only',0,3542,'2023-03-15','Active'),
('EMP-4821','Wellness Stipend','Monthly Wellness Allowance','Employee Only',0,100,'2021-03-15','Active'),
('EMP-4821','Life Insurance','2x Salary Cover','Employee Only',0,275,'2021-03-15','Active'),
-- Alex Chen (EMP-1001)
('EMP-1001','Health Insurance','PPO Plus','Family',420,1080,'2019-01-10','Active'),
('EMP-1001','Dental','Delta Dental Plus','Family',68,120,'2019-01-10','Active'),
('EMP-1001','401(k)','Fidelity 401k — 4% Match','Employee Only',1625,650,'2019-01-10','Active'),
('EMP-1001','RSU Grant','FY22 Annual Refresh','Employee Only',0,5417,'2022-01-10','Active'),
('EMP-1001','Wellness Stipend','Monthly Wellness Allowance','Employee Only',0,100,'2019-01-10','Active'),
-- Ryan O'Brien (EMP-2001)
('EMP-2001','Health Insurance','PPO Standard','Employee + Spouse',285,620,'2021-07-12','Active'),
('EMP-2001','401(k)','Fidelity 401k — 4% Match','Employee Only',1650,660,'2021-07-12','Active'),
('EMP-2001','RSU Grant','FY22 Annual Refresh','Employee Only',0,4167,'2022-07-12','Active'),
('EMP-2001','Wellness Stipend','Monthly Wellness Allowance','Employee Only',0,100,'2021-07-12','Active'),
-- Aisha Johnson (EMP-2002)
('EMP-2002','Health Insurance','HMO Standard','Employee Only',95,540,'2023-04-03','Active'),
('EMP-2002','Dental','Delta Dental Standard','Employee Only',18,32,'2023-04-03','Active'),
('EMP-2002','401(k)','Fidelity 401k — 4% Match','Employee Only',1233,493,'2023-04-03','Active'),
('EMP-2002','RSU Grant','FY24 New Hire Grant','Employee Only',0,1563,'2024-04-03','Active'),
('EMP-2002','Wellness Stipend','Monthly Wellness Allowance','Employee Only',0,100,'2023-04-03','Active'),
-- Sarah Kim (EMP-6644)
('EMP-6644','Health Insurance','PPO Plus','Employee Only',185,720,'2022-11-01','Active'),
('EMP-6644','401(k)','Fidelity 401k — 4% Match','Employee Only',1292,517,'2022-11-01','Active'),
('EMP-6644','RSU Grant','FY23 Annual Refresh','Employee Only',0,2604,'2023-11-01','Active'),
('EMP-6644','Wellness Stipend','Monthly Wellness Allowance','Employee Only',0,100,'2022-11-01','Active');

-- ══════════════════════════════════════════════════════════════════════════
-- EXPENSE REPORTS
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO EXPENSE_REPORTS
  (EXPENSE_ID, EMP_ID, REPORT_NAME, CATEGORY, AMOUNT, CURRENCY, EXPENSE_DATE,
   DESCRIPTION, POLICY_LIMIT, STATUS, SUBMITTED_AT, APPROVED_BY, APPROVED_AT)
VALUES
('EXP-001','EMP-4821','Snowflake Data Cloud Summit 2026','Conference',499,'USD','2026-03-15',
  'Conference registration fee — Snowflake Data Cloud Summit',1000,'Approved','2026-03-16 09:00:00','EMP-1001','2026-03-17 10:00:00'),
('EXP-002','EMP-4821','NYC Customer Offsite - Flights','Travel',387,'USD','2026-04-02',
  'Round-trip flights SFO–JFK for platform architecture review with customer',800,'Approved','2026-04-03 08:00:00','EMP-1001','2026-04-04 09:00:00'),
('EXP-003','EMP-3302','GCP Certification Exam Voucher','Training',200,'USD','2026-04-10',
  'Google Cloud Professional Data Engineer exam registration',500,'Submitted','2026-04-11 07:30:00',NULL,NULL),
('EXP-004','EMP-2001','Q1 Team Planning Lunch','Meals',312,'USD','2026-03-28',
  'Team planning lunch — 8 people, $39/person',400,'Approved','2026-03-29 14:00:00','EMP-0500','2026-03-30 09:00:00'),
('EXP-005','EMP-2003','Home Office USB-C Dock','Hardware',89,'USD','2026-02-15',
  'CalDigit TS4 USB-C hub for home office dual-monitor setup',150,'Approved','2026-02-16 10:00:00','EMP-1001','2026-02-17 09:00:00'),
('EXP-006','EMP-2006','Chicago Client QBR - Travel','Travel',1890,'USD','2026-04-20',
  'Flight + 2-night hotel for Q2 Business Review with enterprise client',2000,'Submitted','2026-04-21 08:00:00',NULL,NULL),
('EXP-007','EMP-5510','SHRM Annual Conference 2026','Conference',1895,'USD','2026-05-01',
  'SHRM Annual Conference registration + pre-conference HR Tech workshop',2000,'Submitted','2026-05-02 07:00:00',NULL,NULL),
('EXP-008','EMP-2002','Udemy — Clean Code Course','Training',30,'USD','2026-04-05',
  'Udemy course: Clean Code and TDD for professional developers',100,'Approved','2026-04-06 09:00:00','EMP-2001','2026-04-06 14:00:00'),
('EXP-009','EMP-4821','Platform OKR Kickoff Dinner','Meals',490,'USD','2026-04-15',
  'Team dinner for Platform Q2 OKR kickoff — 8 people',400,'Rejected','2026-04-16 09:00:00','EMP-1001','2026-04-16 11:00:00'),
('EXP-010','EMP-2004','Pragmatic Institute Workshop','Training',1800,'USD','2026-02-20',
  'Pragmatic Product Management certification — 2-day workshop',2000,'Approved','2026-02-21 08:00:00','EMP-0500','2026-02-22 10:00:00'),
('EXP-011','EMP-6644','dbt Coalesce Conference — Registration','Conference',1200,'USD','2026-03-18',
  'dbt Coalesce 2026 full conference pass including workshops',2000,'Approved','2026-03-19 09:00:00','EMP-1002','2026-03-20 10:00:00'),
('EXP-012','EMP-8890','Jabra Evolve2 Wireless Headset','Hardware',145,'USD','2026-03-10',
  'Jabra Evolve2 55 for remote standup and testing calls',150,'Approved','2026-03-11 10:00:00','EMP-1001','2026-03-12 09:00:00');

SELECT 'Extended data loaded successfully.' AS status;
