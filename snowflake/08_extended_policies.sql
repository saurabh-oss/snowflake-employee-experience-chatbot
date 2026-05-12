-- ============================================================================
-- 08_EXTENDED_POLICIES.SQL
-- 8 additional policy documents for realistic EX chatbot scenarios
-- Run as EX_CHATBOT_ADMIN after 03_cortex_search.sql
-- ============================================================================

USE ROLE EX_CHATBOT_ADMIN;
USE DATABASE EX_CHATBOT;
USE SCHEMA KNOWLEDGE_BASE;
USE WAREHOUSE EX_CHATBOT_WH;

INSERT INTO POLICY_DOCUMENTS (DOC_ID, TITLE, CATEGORY, CONTENT, VERSION, EFFECTIVE_DATE, AUDIENCE, REGION) VALUES

('POL-005', 'Parental Leave Policy', 'Leave & Time Off', $$
## Parental Leave Policy

### Entitlements

**Primary Carer (Birth, Adoption, or Surrogacy):**
- 16 weeks fully paid leave (100% base salary)
- May begin up to 4 weeks before the expected due date
- Eligible from Day 1 of employment

**Secondary / Supporting Carer:**
- 4 weeks fully paid leave
- Must be taken within 6 months of the child joining the family
- Can be taken all at once or in two blocks of 2 weeks each

**Adoption:**
- Same entitlement as birth parents — primary carer receives 16 weeks paid, secondary carer receives 4 weeks paid
- Leave begins on the date of placement, not court finalization

### Flexible Return Options
Employees returning from parental leave may request:
- **Keep-In-Touch (KIT) Days:** Up to 10 paid days during leave to attend team meetings, trainings, or handovers without affecting leave entitlement
- **Phased Return:** Work reduced hours (50–80%) for up to 8 weeks at full pay upon return, subject to manager agreement
- **Remote-First Return:** First 4 weeks back can be fully remote regardless of office policy

### Pay During Leave
- All 16 / 4 weeks are paid at 100% base salary
- Bonus and commission are pro-rated based on actual time worked in the performance period
- Equity vesting continues uninterrupted during parental leave

### Process
1. Notify your manager and HR at least **8 weeks before** your expected leave start date
2. Submit the Parental Leave Request form in Workday
3. HR will confirm entitlement, payroll arrangements, and a return-to-work plan within 5 business days
4. Your manager must designate a cover plan within 2 weeks of notification

### Policies That Still Apply
- Health insurance, 401(k) matching, RSU vesting, and wellness stipend all continue unchanged during parental leave
- FMLA and applicable state/country leave laws are honored in addition to (not instead of) this policy

Contact People & HR at hr@company.com or your HR Business Partner for queries.
$$, '1.3', '2025-01-01', 'All Employees', 'Global'),

('POL-006', 'Performance Review Policy', 'Career & Development', $$
## Performance Review Policy

### Review Cycles
Performance reviews occur **twice per year**:
- **H1 Mid-Year Review:** Self-assessment due May 15, manager review due June 30
- **Annual Review:** Self-assessment due January 15, manager review and calibration completed by January 31

### Rating Scale
| Rating | Label | Description |
|--------|-------|-------------|
| 5.0 | Outstanding | Exceptional impact significantly beyond role expectations. Rare — top 5% |
| 4.0–4.9 | Exceeds Expectations | Consistently delivers above requirements; strong role model |
| 3.0–3.9 | Meets Expectations | Solid performance; fully meeting role expectations |
| 2.0–2.9 | Below Expectations | Partially meeting expectations; improvement plan required |
| 1.0–1.9 | Unsatisfactory | Not meeting expectations; immediate action required |

### Process
1. **Self-Assessment:** Employee completes their review in Workday, including progress against goals, key achievements, and development areas
2. **Manager Review:** Manager adds their rating and written feedback
3. **Calibration:** Management team calibrates ratings to ensure consistency and fairness across teams
4. **Feedback Conversation:** Manager delivers feedback in a 1:1 within 2 weeks of calibration
5. **Communication:** Final rating visible in Workday after calibration is complete

### Goal Setting
- 3–5 goals per cycle, set collaboratively with your manager in Workday
- Goals must be SMART: Specific, Measurable, Achievable, Relevant, Time-bound
- Goals can be updated mid-cycle with manager approval

### Link to Compensation
- Annual Review ratings directly inform the annual merit increase process (effective April 1)
- Exceeds Expectations or above: eligible for merit increase of 5–10% plus bonus consideration
- Meets Expectations: eligible for merit increase of 2–5%
- Below Expectations: no merit increase; performance improvement plan required

### Performance Improvement Plans (PIP)
If a rating of Below Expectations is sustained across two consecutive reviews, HR initiates a formal PIP:
- Duration: 60–90 days
- Clear, measurable success criteria defined upfront
- Weekly check-ins with manager and HR
- Successful completion returns employee to standard performance process

Contact your HR Business Partner for questions about ratings or the review process.
$$, '2.0', '2025-07-01', 'All Employees', 'Global'),

('POL-007', 'Learning & Development Policy', 'Career & Development', $$
## Learning & Development Policy

### Annual L&D Budget
Every employee receives an annual Learning & Development budget to invest in their professional growth:

| Level | Annual Budget |
|-------|--------------|
| Individual Contributor (L1–L3) | $1,500 |
| Individual Contributor (L4–L5) | $2,500 |
| Staff / Principal / Senior IC | $3,000 |
| Manager | $4,000 |
| Director and above | $5,000 |

Budget resets on January 1 each fiscal year and cannot be carried forward.

### What Is Eligible?
- **Online courses and self-paced learning** (Udemy, Coursera, Pluralsight, LinkedIn Learning, etc.)
- **Certifications** (AWS, GCP, Snowflake, PMP, SHRM, CFA, etc.) — exam fees + prep materials
- **Conferences and summits** (registration, travel, and accommodation covered separately from L&D budget)
- **Workshops and bootcamps** (in-person or virtual)
- **Books:** Up to $50 per book, no prior approval needed — self-certify in Workday

### Approval Requirements
- Expenses **under $200:** submit in Workday for reimbursement, manager auto-approves
- Expenses **$200–$500:** manager approval required before booking
- Expenses **over $500:** manager approval + HR notification required
- **Conferences over $1,000:** submit at least 4 weeks in advance for budget review

### Reimbursement Process
1. Complete your learning activity
2. Submit the expense in Workday with receipt and certificate (if applicable) within **30 days of completion**
3. Approved reimbursements are included in your next payroll run
4. For company-paid upfront bookings, use the L&D request form in Workday

### Company-Paid Mandatory Training
The following trainings are company-funded and do **not** count against your personal L&D budget:
- Annual Security Awareness Training
- Anti-Harassment and Code of Conduct Refresher
- Role-specific compliance training (e.g., SOC 2, GDPR)

### Clawback Policy
If an employee voluntarily leaves within **3 months** of completing company-funded training costing over $1,000, they may be required to repay a pro-rated portion of the cost.

### Finding Courses
Browse available courses on the Learning Hub in Workday or ask your L&D Specialist (oliver.bennett@company.com) for recommendations.
$$, '3.1', '2026-01-01', 'All Employees', 'Global'),

('POL-008', 'Benefits Guide FY2026', 'Benefits & Compensation', $$
## Employee Benefits Guide — FY2026

### Health Insurance
We offer three health plan options:

| Plan | Type | Monthly Employee Cost | Coverage |
|------|------|-----------------------|----------|
| PPO Plus | Preferred Provider | $185 (Employee) / $420 (Family) | $500 deductible, 90/10 coinsurance |
| PPO Standard | Preferred Provider | $120 (Employee) / $285 (Family) | $1,500 deductible, 80/20 coinsurance |
| HMO Standard | Health Maintenance | $95 (Employee) / $220 (Family) | $250 deductible, PCP-gated referrals |

**Employer contributes:** $720/month for PPO Plus, $620/month for PPO Standard, $540/month for HMO (Employee Only).

### Dental
- **Delta Dental Plus** — $28/month (Employee), $68/month (Family)
- Covers: 100% preventive, 80% basic, 50% major, $1,500 annual max
- Orthodontics: $2,000 lifetime benefit

### Vision
- **VSP Standard** — $8/month (Employee), $20/month (Family)
- Annual eye exam covered in full; up to $200 frames/contacts allowance

### 401(k) Retirement Plan
- **Fidelity 401(k)** — company matches 100% of employee contributions up to **4% of base salary**
- Matching is **immediately vested** — no cliff or graded schedule
- Roth 401(k) option available
- 2026 IRS contribution limit: $23,500 (catch-up additional $7,500 if age 50+)

### RSU (Restricted Stock Units)
- Equity grants vest over **4 years** with a **1-year cliff** (25% vests at month 12, then monthly thereafter)
- Annual performance-based refresh grants for employees rated Meets Expectations or above
- Blackout periods apply 2 weeks before and 1 week after each quarterly earnings announcement

### Wellness Stipend
- **$100/month** deposited to your Forma wallet by the 1st of each month
- Eligible uses: gym memberships, fitness apps (Peloton, Calm, Headspace), sports equipment, nutrition coaching, ergonomic accessories, mental health apps
- Unused balance does not roll over

### Life Insurance & Disability
- **Basic Life Insurance:** 2× annual base salary, company-funded
- **Short-Term Disability:** 60% of salary for up to 12 weeks, company-funded
- **Long-Term Disability:** 60% of salary after 90-day waiting period, company-funded

### Employee Assistance Program (EAP)
- **8 free confidential counseling sessions per year** for employee and immediate family members
- Available 24/7 via phone, video, or in-person (Lyra Health)
- Covers: mental health, financial counseling, legal consultations, caregiving support

### Open Enrollment
Open enrollment runs each year from **November 1–15** for the following January 1 effective date. Outside open enrollment, changes are only allowed for qualifying life events (marriage, birth, adoption, loss of other coverage).

Contact benefits@company.com for questions.
$$, '1.0', '2026-01-01', 'All Employees', 'Global'),

('POL-009', 'Expense Reimbursement Policy', 'Finance & Operations', $$
## Expense Reimbursement Policy

All business expenses must be pre-approved where required, submitted within 30 days of the expense date, and include original receipts for amounts over $25.

### Category Limits and Rules

**Travel**
- Domestic flights (under 6 hours): Economy class only, up to $800 round-trip
- International flights (over 6 hours): Economy or Premium Economy, up to $2,500 round-trip; Business class requires VP approval
- Hotel: Up to $250/night in major cities (NYC, SF, London), $175/night elsewhere
- Ground transport: Rideshare, taxi, or public transit — no personal vehicle mileage unless pre-approved
- Per diem: $75/day for meals when traveling overnight; receipts not required for per diem

**Meals & Entertainment**
- Internal team meals: Up to **$50 per person**; includes all taxes and tips
- Client entertainment: Up to **$75 per person**; business purpose and guest list required
- Alcohol: Allowed only as part of a client meal or formal team event; maximum 20% of total bill
- Working lunches (no entertainment): Up to $25 per person, no pre-approval

**Conferences & Events**
- Registration: Up to **$2,000** without additional approval; above requires Director sign-off
- Pre-approval required for all conferences using L&D budget — see Learning & Development Policy

**Hardware & Accessories**
- Under $150: No pre-approval required
- $150–$500: Manager approval required
- Over $500: IT must be involved; equipment is company property and must be returned on exit

**Software & Subscriptions**
- Under $100/month: No pre-approval if business-justified; note the business use in the description
- Over $100/month: IT and Finance approval required; preferred vendors must be used where available

### Submission Process
1. Collect original receipts (photo or PDF)
2. Submit expense report in **Workday** within 30 days of the transaction date
3. Add the business purpose and approver in the notes field
4. Approved expenses are reimbursed in your next payroll run (within 2 weeks of approval)

### Policy Violations
- Expenses submitted without receipts (over $25) will be rejected
- Expenses exceeding category limits will be rejected and must be re-submitted with VP approval
- Fraudulent expense claims are subject to disciplinary action up to and including termination

### Corporate Card
Senior managers and above, plus frequent travelers, are issued a company card. Card holders must reconcile transactions monthly in Workday. Personal charges on the company card are a policy violation.

Questions? Contact finance-expenses@company.com.
$$, '2.2', '2026-01-01', 'All Employees', 'Global'),

('POL-010', 'Equity & RSU Policy', 'Benefits & Compensation', $$
## Equity & RSU Policy

### Grant Structure
Equity at our company is issued as **Restricted Stock Units (RSUs)**. RSUs convert to common shares upon vesting — there is no exercise price.

**Types of grants:**
- **New Hire Grant:** Issued upon joining, reflecting your level and offer negotiations
- **Annual Refresh Grant:** Issued each year based on performance rating (Meets Expectations and above)
- **Promotion Grant:** Issued upon promotion to reflect new level expectations

### Vesting Schedule
- **4-year total vesting period**
- **1-year cliff:** 25% of the grant vests at the 12-month anniversary of your grant date
- **Monthly vesting thereafter:** The remaining 75% vests in equal monthly installments over 36 months
- Vesting continues uninterrupted during parental leave, approved medical leave, or company-mandated leave

### Blackout Periods
Trading of company shares is restricted during **blackout periods:**
- 2 weeks before each quarterly earnings release
- 1 week after each quarterly earnings release
- During any special blackout declared by Legal (e.g., during M&A activity)

Employees are notified of blackout windows via email from the Legal team. Selling unvested RSUs is not possible — only vested shares are eligible for sale.

### 10b5-1 Plans
Employees with significant holdings may establish a **10b5-1 trading plan** to pre-schedule share sales outside of blackout periods. Contact legal@company.com to initiate.

### Termination
- **Voluntary resignation or termination for cause:** Unvested RSUs are forfeited on the last day of employment
- **Involuntary termination without cause:** Vesting may be accelerated at the company's discretion (case-by-case)
- **Retirement (age 60+ with 10+ years of service):** Full vesting acceleration applies

### Annual Refresh Amounts (approximate, by rating)
| Performance Rating | Refresh Grant (% of base) |
|--------------------|--------------------------|
| Outstanding | 30–40% |
| Exceeds Expectations | 20–30% |
| Meets Expectations | 10–20% |
| Below Expectations | No refresh |

Actual refresh grants are determined by the Compensation Committee and communicated during the annual review cycle in February.

Contact equity@company.com for questions about your grant details, vesting schedule, or 10b5-1 plans.
$$, '1.1', '2025-07-01', 'All Employees', 'Global'),

('POL-011', 'Mental Health & Wellness Policy', 'Health & Wellbeing', $$
## Mental Health & Wellness Policy

We believe that mental health is as important as physical health. This policy outlines the support available to all employees.

### Employee Assistance Program (EAP) — Lyra Health
All employees and their immediate family members have access to **8 free confidential counseling sessions per year** through Lyra Health.

- **Who can use it:** Employee + spouse/partner + dependents living in the same household
- **Access:** Via the Lyra Health app, lyrahealth.com, or by calling 1-800-LYRA-EAP (24/7)
- **What it covers:** Anxiety, depression, stress, relationship issues, grief, burnout, financial stress, legal concerns
- **Confidentiality:** Sessions are completely confidential. HR and management have no access to any information shared with EAP counselors.
- **Cost:** $0 to the employee — fully company-funded

### Mental Health Days
Mental health days are fully valid uses of your sick leave balance. You do not need to explain the reason to your manager. Simply mark it as sick leave in Workday.

If you need extended time due to a mental health condition, this is covered under our Medical Leave policy with full pay for up to 12 weeks.

### Wellness Stipend
$100/month is available for wellness activities including:
- Gym memberships and fitness classes
- Meditation and mindfulness apps (Calm, Headspace, Ten Percent Happier)
- Mental health apps (Woebot, Noom, BetterHelp — in addition to Lyra sessions)
- Nutrition coaching
- Ergonomic equipment for home office

Claim via Forma wallet — all submissions are private and not visible to managers.

### Manager Responsibilities
Managers complete annual mental health awareness training and are expected to:
- Check in on team wellbeing proactively, especially during periods of high workload
- Normalize conversations about mental health without prying
- Direct employees to EAP and HR resources when appropriate
- Respect confidentiality — do not share information about an employee's mental health situation

### Return-to-Work Support
Employees returning from mental health leave receive:
- A phased return plan (if desired) — start at 50–80% capacity, ramp over 4 weeks
- Regular check-ins with their manager and HR Business Partner for the first 90 days
- Continued access to EAP sessions (additional sessions available with HR approval)

If you or someone on your team needs immediate support, contact Lyra Health directly or email wellness@company.com.
$$, '1.0', '2025-10-01', 'All Employees', 'Global'),

('POL-012', 'Employee Referral Program', 'Talent & Recruitment', $$
## Employee Referral Program

Help us find great people and earn a referral bonus. Our referral program rewards employees who refer candidates who are hired and pass their probationary period.

### Referral Bonus Amounts

| Role Level | Referral Bonus |
|------------|---------------|
| Individual Contributor L1–L3 | $3,000 |
| Individual Contributor L4–L5 | $5,000 |
| Staff / Principal / Tech Lead | $7,500 |
| Manager / Senior Manager | $7,500 |
| Director and above | $10,000 |

Bonuses are **paid in two tranches:**
- **50% at the referred candidate's start date**
- **50% after the referred candidate completes their 90-day probationary period**

### How to Refer Someone
1. Ask your candidate to apply via careers.company.com and add your name in the "Referred by" field, **or**
2. Submit their resume directly in Lever (Recruiting module) with the "Employee Referral" tag and your name

### Eligibility
- Any full-time or part-time employee is eligible to refer candidates
- You cannot refer: candidates you directly manage or who are in your direct reporting line, anyone who has applied or interviewed with us in the past 12 months, former employees rehired within 6 months
- Talent Acquisition team members are not eligible for referral bonuses

### Referral Status
You can track the status of your referral in the **Workday Recruiting dashboard**. Talent Acquisition will keep you informed of key milestones.

### Tax
Referral bonuses are considered taxable compensation and will be included in your paycheck subject to standard withholding.

Contact talent@company.com or your Talent Acquisition Partner for questions.
$$, '2.0', '2025-04-01', 'All Employees', 'Global');

SELECT 'Extended policy documents inserted.' AS status;
