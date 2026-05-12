---
sidebar_position: 3
---

# 💡 Use Cases

## Real Scenarios Powered by the Chatbot

---

## Scenario 1: Employee Leave Balance Check

### The Situation
Sarah, an engineer, is planning a vacation and needs to know her remaining PTO.

### Traditional Flow
1. Sarah opens HR portal → 404 error (portal down)
2. Emails HR team
3. Waits 24 hours for response
4. HR sends generic leave policy document
5. Sarah manually calculates her balance
6. **Total time: 24+ hours | HR effort: 10 min**

### With Employee Experience Chatbot
**Sarah:** *"How much PTO do I have left this year?"*

**Chatbot (2 seconds):**
```
You have 8 days of PTO remaining out of 20 days allocated.
According to our Leave Policy 2025, unused days carry over 
to the next year up to a maximum of 5 days. You've used 
12 days so far this year.

See: Leave Policy 2025 (section 3.2)
```

**Sarah:** *"Can I take 10 days off in June?"*

**Chatbot (2 seconds):**
```
No, 10 days exceeds your remaining balance of 8 days. 
However, you can take 8 days in June. For the additional 
2 days you'd like, you could combine with unpaid leave 
(see Unpaid Leave Policy) or wait until you earn more PTO.

See: Leave Policy 2025, Unpaid Leave Policy
```

### Impact
- **Time saved:** 24 hours → instant
- **HR effort:** 10 min → 0 min (no email)
- **Employee satisfaction:** ++++

---

## Scenario 2: Manager Team Analytics

### The Situation
James, an engineering manager, is planning Q3 headcount allocation and wants to see his team's current metrics.

### Traditional Flow
1. James sends request to HR
2. HR analyst spends 4 hours creating custom report
3. Report delivered via email
4. James discovers he needs different slices of data
5. HR creates another report
6. **Total time: 2-3 days | HR effort: 8 hours**

### With Employee Experience Chatbot
**James:** *"Show me my team's headcount by level and tenure"*

**Chatbot (2 seconds):**
```
Team Engineering (10 members):
  Senior Engineer: 3 (avg tenure: 4.2 years)
  Staff Engineer: 2 (avg tenure: 6.1 years)
  Junior Engineer: 5 (avg tenure: 1.1 years)

See: employees table, aggregated by level and hire_date
```

**James:** *"What's my team's average salary?"*

**Chatbot (Masked response, 2 seconds):**
```
Your team's compensation data is masked for privacy. 
Only compensation administrators can view salary data.

If you need this information for budgeting:
  → Request access from HR (compensation@company.com)
  → Uses a separate secure, logged workflow
  → Approval typically takes 1-2 hours

See: Data Access Policy
```

**James:** *"Show attrition trends for my team over the past year"*

**Chatbot (2 seconds):**
```
Team Engineering attrition (past 12 months):
  2024 Q2: 1 departure (1 engineer → new opportunity)
  2024 Q3: 0 departures
  2024 Q4: 2 departures (1 engineer → relocation, 
                         1 manager → role change)
  2025 Q1: 0 departures
  
Current turnover rate: 1.2% (below industry avg of 3%)

See: employee_transitions table, computed trends
```

### Impact
- **Time saved:** 2-3 days → instant
- **HR effort:** 8 hours → 0 hours
- **Decision quality:** Better (more exploratory, faster iteration)
- **Manager satisfaction:** ++++

---

## Scenario 3: New Employee Onboarding

### The Situation
Alex is a new hire (day 1) and has questions about benefits, policies, and processes.

### Traditional Flow
1. Alex receives 50-page onboarding document
2. Reads randomly, doesn't understand structure
3. Emails multiple people with questions
4. Gets incomplete, sometimes conflicting answers
5. Misses key deadlines (benefits enrollment, etc.)
6. **Total time: 3 days of confusion | HR effort: 5 hours**

### With Employee Experience Chatbot
**Alex:** *"What benefits do I get as a new hire?"*

**Chatbot (2 seconds):**
```
As a new hire, you're eligible for:
  ✓ Health Insurance: Effective immediately
  ✓ 401(k) Plan: Enroll by end of month to get company match
  ✓ Life Insurance: $500K coverage
  ✓ Gym Membership Stipend: $50/month
  ✓ Professional Development: $2,000/year budget

Action Required:
  1. Enroll in health plan (link) by May 31
  2. Set up 401(k) (link) by May 31
  
See: New Hire Benefits Guide (section 2.1)
```

**Alex:** *"When is my first paycheck?"*

**Chatbot (2 seconds):**
```
Your first paycheck will be on May 30, 2025 
(next payroll cycle, bi-weekly). 

Your payroll information:
  • Frequency: Bi-weekly (every other Friday)
  • Direct deposit: Set up at (link)
  • Pay stub access: (link)
  
See: Payroll FAQ
```

**Alex:** *"How do I set up my work laptop?"*

**Chatbot (2 seconds):**
```
Your laptop setup is handled by IT. 
Here's what to expect:

Day 1 (Today):
  • Check in with IT at 10am (IT office, 3rd floor)
  • Receive laptop + credentials
  • 30-min setup walkthrough

Days 1-3:
  • Download required software (link)
  • Join Slack workspace
  • Set up email and calendar

See: IT Onboarding Checklist, IT Support Contact
```

### Impact
- **Time saved:** 3 days of confusion → 30 min of clarity
- **HR effort:** 5 hours → 0 hours
- **Compliance:** 100% enrollment rates (vs 85% without clear guidance)
- **New hire satisfaction:** Massive improvement

---

## Scenario 4: Security Audit - Verifying Data Access

### The Situation
The security team is auditing access to sensitive employee data (salary, SSN) to ensure masking is working.

### Traditional Flow
1. Security team writes custom SQL query
2. Attempts to access sensitive tables
3. Discovers some data wasn't masked (bug)
4. Spends hours reviewing logs manually
5. Can't trace which business questions triggered access
6. **Total time: 8 hours | Audit coverage: 60%**

### With Employee Experience Chatbot
**Security Team:** *"Who accessed salary data this week?"*

**Query (instant):**
```sql
SELECT * FROM cortex_audit_log 
WHERE data_accessed LIKE '%salary%' 
  AND timestamp > CURRENT_DATE - 7 
ORDER BY timestamp DESC;
```

**Results (immediate):**
```
timestamp              user_id    question                  masking_applied
─────────────────────────────────────────────────────────────────────────
2025-05-10 14:32:00   emp_5431   "What's my salary?"       YES (redacted)
2025-05-09 09:15:00   manager_12 "Show team compensation"  NO (manager role)
```

**What they see:**
- ✅ User emp_5431 asked about salary → response was masked (compliant)
- ✅ Manager_12 asked about compensation → response unmasked (authorized role)
- ✅ Zero data leakage
- ✅ Full audit trail

### Impact
- **Time saved:** 8 hours → instant
- **Audit coverage:** 60% → 100%
- **Compliance confidence:** Fully verified
- **Risk reduction:** Quantified (zero unauthorized access)

---

## Scenario 5: HR Team Reduces Manual Support

### The Situation
The HR team answers the same 20 questions repeatedly every month.

### Traditional Flow
**Top HR Questions (manually answered):**
1. "What's my remaining PTO?" (15 emails/day)
2. "What's the remote work policy?" (10 emails/day)
3. "How do I request leave?" (8 emails/day)
4. "What's my salary?" (5 emails/day, denied)
5. "When do I get paid?" (4 emails/day)
... and 15 more ...

**Effort:** 2 FTE HR staff spend 50% of time answering emails

### With Employee Experience Chatbot
**Week 1:** Deploy chatbot
**Week 2:** Redirect 80% of FAQ questions to chatbot

**Results (Week 4):**
- Email volume: 100 → 20 (80% reduction)
- HR team freed up: 1 FTE equivalent
- HR can now focus on: Strategic projects, employee relations, policy improvements
- Quality improvement: Instant answers vs. 24-hour email

### Impact
- **HR Productivity:** +50%
- **Cost:** 1 FTE saved = $100K/year salary + $30K benefits
- **Delight:** Employees get instant help, HR gets strategic time back

---

## Scenario 6: Compliance & Policy Updates

### The Situation
Company updates remote work policy. How quickly can 500 employees learn the new rules?

### Traditional Flow
1. HR writes new policy
2. Sends email to all employees
3. 30% read it, 70% ignore
4. HR gets confused questions for weeks
5. Managers enforce policy inconsistently
6. **Compliance level: ~40% after 1 month**

### With Employee Experience Chatbot
1. HR writes new policy
2. Updates semantic model + policy documents
3. Chatbot immediately answers questions against new policy
4. Employees ask questions, get consistent answers
5. One source of truth (the chatbot)

**Example:** New rule: "Max 2 days/week remote for client-facing roles"

**Employee:** *"Can I work fully remote this week?"*

**Chatbot (2 seconds, with new policy):**
```
You're in a client-facing role (Sales Engineer), so the 
new remote work policy allows a maximum of 2 days per week 
remote. Working fully remote is not permitted.

Current week remote days scheduled:
  • Monday: Office
  • Tuesday: Remote
  • Wednesday: Remote ← Already at limit

To work fully remote, you'd need to request an exception 
(link) from your manager.

See: Updated Remote Work Policy (effective May 12, 2025)
```

### Impact
- **Compliance:** 40% → 95% (self-service consistency)
- **Training time:** 4 hours (email + meetings) → 10 minutes (update semantic model)
- **Manager support:** Consistent policy enforcement
- **Employee clarity:** Instant, authoritative answers

---

## Common Question Patterns

| Pattern | Traditional | Chatbot | Improvement |
|---------|---|---|---|
| "What's my PTO balance?" | Email → 24hr wait | 2 sec answer | 86,400x faster |
| "What's the policy on X?" | Search docs → browse → email HR | 2 sec answer | 50-100x faster |
| "Show me team stats" | Custom report (4 hrs) | 2 sec answer | 7,200x faster |
| "Can I do Y?" | Manager approval → policy lookup | Instant guidance | 60-480x faster |
| Audit: "Who accessed data?" | Manual log review (8 hrs) | SQL query (1 sec) | 28,800x faster |

---

## Why These Scenarios Matter

Each scenario above represents **real cost** in your organization:

| Metric | Impact |
|--------|--------|
| **Employee Time Wasted** | 500 employees × 10 min/day = 50 hrs/day = $2,500/day |
| **HR Team Overload** | 2 FTE → 1 FTE freed (savings: $130K/year) |
| **Compliance Risk** | Manual processes = inconsistent enforcement → audit failures |
| **Decision Quality** | HR can focus on strategy, not firefighting |
| **Employee Satisfaction** | Instant answers → happier employees |

**This chatbot addresses all of it.**

---

## Which Scenario Matches Your Organization?

- **Tech/growing companies:** Scenarios 1, 2, 3, 5 (scaling HR team)
- **Regulated industries:** Scenarios 4, 6 (compliance, audit trails)
- **Global organizations:** Scenarios 1, 3, 6 (self-service in multiple time zones)
- **HR-heavy companies:** Scenario 5 (reducing manual support load)

---

## Ready to Deploy?

These scenarios become reality with the chatbot. Next steps:

→ [Understand the Architecture](/architecture)  
→ [Learn About Security](/security-governance)  
→ [Deploy in 30 Minutes](/quick-start)
