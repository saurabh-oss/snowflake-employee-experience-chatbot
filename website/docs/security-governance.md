---
sidebar_position: 6
---

# 🔐 Security & Governance

## Why This Solution is Compliant by Design

Security isn't a feature bolt-on—it's embedded in every layer of this architecture. This guide explains why decision-makers can trust this solution with sensitive employee data.

---

## 🎯 The Core Promise

> **No employee data ever leaves your Snowflake account.**

Every byte of computation happens inside your Snowflake VPC. No AI vendor SaaS. No third-party APIs. No data exfiltration risk.

```
Traditional Approach          This Solution
───────────────────────       ─────────────
Employee Data                 Employee Data
  ↓ (exported)                  ↓ (stays in Snowflake)
OpenAI/Anthropic API          Snowflake Cortex
  ↓ (processed)                 ↓ (processed)
Response                      Response
```

---

## 🔐 Authentication: RSA Key-Pair

The backend authenticates to Snowflake using **RSA key-pairs**, not passwords.

### How It Works

```
1. Backend generates RSA key-pair (one-time setup)
   ├─ Private Key: Stored securely (never transmitted)
   └─ Public Key: Registered with Snowflake

2. On every request, backend:
   ├─ Creates unsigned JWT
   ├─ Signs it with private key
   └─ Sends signed JWT to Snowflake

3. Snowflake verifies:
   ├─ Signature matches public key ✓
   └─ Issues session token
   
4. Backend uses token for all Cortex calls
```

### Why This is Better Than Passwords

| Aspect | Password | RSA Key-Pair |
|--------|----------|---|
| **Storage Risk** | Cleartext in .env | Private key only, can be rotated |
| **Transmission Risk** | Sent in every request | Signature only, private key never sent |
| **Auditing** | No trace of auth | Full JWT trace with timestamp |
| **Rotation** | Downtime required | No downtime (push new public key) |
| **Unattended Use** | Risky (stored passwords) | Ideal (no human needed) |

### Key Rotation (Zero Downtime)

```sql
-- Step 1: Generate new key-pair (locally)
openssl genrsa -out snowflake_rsa_key_2.p8 2048

-- Step 2: Register new public key with Snowflake
ALTER USER backend_user ADD ASSIGNED CERTIFICATE 
  <new_public_key>;

-- Step 3: Backend starts using new key (no restart needed)

-- Step 4: Remove old key (after verification period)
ALTER USER backend_user DROP ASSIGNED CERTIFICATE 
  <old_public_key>;
```

**Result:** Key rotation without downtime or password changes.

---

## 👥 Role-Based Access Control (RBAC)

Snowflake enforces who can see what data via **database roles**.

### Role Hierarchy

```
SYSADMIN
├─ CORTEX_ADMIN         (Manages Cortex, updates semantic model)
│  └─ CORTEX_APP        (Backend user, reads data for chatbot)
│     └─ CORTEX_USER    (Employee accessing the chatbot UI)
```

### Permission Model

| Role | Can Do | Cannot Do |
|------|--------|---|
| **CORTEX_USER** | Ask questions, see own data | Modify semantic model, see others' data |
| **CORTEX_APP** | Read tables via Cortex | Write data, modify schemas |
| **CORTEX_ADMIN** | Manage Cortex, update semantic model | Drop database, create new roles |
| **SYSADMIN** | Everything | (Full control) |

### Example: Employee Row Access

```sql
-- Employee "emp_123" can only see their own row
SELECT * FROM employees 
WHERE employee_id = CURRENT_USER();  -- Enforced by Snowflake

-- Another user trying to see all rows:
SELECT * FROM employees;

-- Snowflake applies row masking invisibly:
Result:
  id=123, salary=$120K, email=alice@...   ✓ (own data)
  id=124, salary=NULL, email=REDACTED     ✗ (masked)
  id=125, salary=NULL, email=REDACTED     ✗ (masked)
```

---

## 🔒 Column-Level Masking

Sensitive columns are automatically hidden based on user role.

### Masking Policies

```sql
-- Define who can see what
CREATE MASKING POLICY salary_mask AS (salary STRING)
  RETURNS STRING →
  CASE
    WHEN CURRENT_ROLE() IN ('SYSADMIN', 'CORTEX_ADMIN') THEN salary
    WHEN CURRENT_ROLE() = 'MANAGER' AND 
         IS_DIRECT_REPORT(CURRENT_USER()) THEN salary
    ELSE '***REDACTED***'
  END;

-- Apply to sensitive column
ALTER TABLE employees 
  MODIFY COLUMN salary SET MASKING POLICY salary_mask;
```

### Example Masking Scenarios

**Manager "alice" views team salaries:**
```
SELECT name, salary FROM employees WHERE team = 'engineering';

Result:
  name=bob, salary=$120K      ✓ (is team member)
  name=carol, salary=$115K    ✓ (is team member)
  name=dan, salary=$105K      ✓ (is team member)
```

**Employee "bob" asks "Show me team salaries":**
```
SELECT name, salary FROM employees WHERE team = 'engineering';

Result (masked by Snowflake):
  name=bob, salary=$120K           ✓ (own data)
  name=carol, salary=***REDACTED***✗ (masked)
  name=dan, salary=***REDACTED***  ✗ (masked)
```

**Chatbot response to bob:**
```
"Your salary is $120K. I cannot show other team members' 
salaries for privacy reasons. Contact your manager or HR 
for team compensation discussions.

See: Compensation Privacy Policy"
```

### Automatically Masked Columns

| Column | Who Can See | Who Can't |
|--------|---|---|
| `salary` | ADMIN, MANAGER (direct reports) | Everyone else |
| `email` | SYSADMIN, CORTEX_ADMIN | Regular users |
| `ssn` | SYSADMIN, HR_ADMIN | Everyone else |
| `bank_account` | SYSADMIN, PAYROLL | Everyone else |

**Key point:** Masking happens **at query time** in Snowflake. Application code cannot bypass it.

---

## 📊 Audit Logging

Every Cortex call is logged immutably.

### Audit Table Structure

```sql
CREATE TABLE cortex_audit_log (
  log_id INT IDENTITY,
  timestamp TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  user_id VARCHAR,
  user_role VARCHAR,
  question VARCHAR,
  cortex_service VARCHAR,  -- 'SEARCH' | 'ANALYST' | 'COMPLETE'
  tables_accessed ARRAY,   -- Which tables were queried
  columns_accessed ARRAY,  -- Which columns were accessed
  masking_applied BOOLEAN, -- Was data masked?
  response VARCHAR,
  query_id VARCHAR,
  PRIMARY KEY (log_id)
) DATA_RETENTION_TIME_IN_DAYS = 90
  APPEND_ONLY = TRUE;      -- ← Can only INSERT, never UPDATE/DELETE
```

### What Gets Logged

**User asks:** *"What's my salary?"*

```sql
INSERT INTO cortex_audit_log VALUES (
  timestamp: 2025-05-12 14:32:15,
  user_id: 'emp_123',
  user_role: 'CORTEX_USER',
  question: 'What is my salary?',
  cortex_service: 'ANALYST',
  tables_accessed: ['employees'],
  columns_accessed: ['salary', 'employee_id'],
  masking_applied: FALSE,     -- ✓ Own data, no masking
  response: 'Your salary is $120,000.',
  query_id: 'q-abc123'
);
```

**Manager asks:** *"Show me team compensation"*

```sql
INSERT INTO cortex_audit_log VALUES (
  timestamp: 2025-05-12 14:35:42,
  user_id: 'mgr_456',
  user_role: 'MANAGER',
  question: 'Show me team compensation',
  cortex_service: 'ANALYST',
  tables_accessed: ['employees'],
  columns_accessed: ['salary', 'name', 'team_id'],
  masking_applied: FALSE,     -- ✓ Manager, authorized
  response: 'Engineering team avg salary: $125K',
  query_id: 'q-def456'
);
```

**Compliance team query:** *"Detect unauthorized access"*

```sql
SELECT * FROM cortex_audit_log
WHERE masking_applied = FALSE
  AND user_role NOT IN ('SYSADMIN', 'CORTEX_ADMIN', 'MANAGER')
  AND columns_accessed LIKE '%salary%'
ORDER BY timestamp DESC;

-- Result: (empty) ← No unauthorized data access ✓
```

### Why Append-Only Matters

```sql
-- Attacker tries to hide access logs:
DELETE FROM cortex_audit_log WHERE user_id = 'hacker';
-- ❌ ERROR: Cannot modify append-only table

-- Even ADMIN can't delete:
ALTER TABLE cortex_audit_log DROP ROW WHERE timestamp < '2025-01-01';
-- ❌ ERROR: Append-only constraint

-- Only archival is allowed (after retention period):
ALTER TABLE cortex_audit_log SET DATA_RETENTION_TIME = 7;
-- ✓ Data automatically purged after 7 days
```

---

## 🛡️ Compliance & Standards

### HIPAA (Healthcare)
✅ **Technical Safeguards:**
- Encryption in transit (TLS)
- Access controls (RBAC)
- Audit controls (immutable logs)
- Integrity controls (no data modification outside Snowflake)

✅ **Administrative Safeguards:**
- No business associate agreements with AI vendors
- Full data residency in your account

❌ **Not covered:**
- Physical security (Snowflake data center security)
- Workforce security (your org's IAM)

### GDPR (Privacy)
✅ **Built-in Compliance:**
- Data minimization (only relevant data in responses)
- Purpose limitation (questions only answered by Cortex)
- Retention limits (configurable in APPEND_ONLY table)
- Right to erasure (DELETE data, audit logs expire)

❌ **Not automatic:**
- Data controller responsibility (you own policy decisions)
- Vendor agreements (between you and Snowflake)

### SOX (Financial Controls)
✅ **Audit Trail:**
- Immutable logs of every access
- No deletion capability
- Timestamp on every event
- Query lineage (what data accessed)

✅ **Access Controls:**
- RBAC enforced by Snowflake (not application)
- No password reuse (RSA key-pairs)
- Key rotation without downtime

### Snowflake Horizon Catalog
This project uses Snowflake's **Horizon** governance layer, which includes:

- **Masking Policies** ← Column-level PII hiding
- **Row Access Policies** ← Row-level data filtering
- **Tag-based Governance** ← Data classification and policies
- **Query Acceleration** ← Optimized performance
- **Activity Monitoring** ← Who accessed what, when

---

## 🔒 Data Residency & Sovereignty

### No External APIs

```
Traditional AI                    This Solution
───────────────────────────────   ──────────────────
Company Snowflake VPC             Company Snowflake VPC
  ↓ (data exported)                 ↓ (stays inside)
OpenAI (US servers)               Cortex (same VPC)
  ↓ (processed overseas)            ↓ (processed inside)
Response returned                 Response returned
```

**Result:**
- ✅ Data never leaves your cloud account
- ✅ Data never leaves your region (if region-locked Snowflake)
- ✅ No GDPR issues (data stays in EU, for example)
- ✅ No HIPAA concerns (no BAA needed)

### Regional Compliance

```
Region        Cortex Support    Use Case
──────────────────────────────────────────
US East       ✓                 Default
EU West       ✓                 GDPR compliance
Asia Pacific  ✓                 Data residency (APAC)
Canada        ✓                 Canadian data sovereignty
```

All computation stays in the region where your Snowflake account is deployed.

---

## 🔍 Security Incident Response

### If Breach Occurs

Even in the unlikely event of unauthorized access:

1. **Data never left Snowflake** → Limited exposure
2. **Audit trail shows exactly what** → Precise forensics
3. **Masking protected sensitive data** → Salary/SSN already hidden
4. **RBAC limited access scope** → Attacker could only see customer-allowed data

### Immediate Actions

```sql
-- 1. Revoke compromised key
ALTER USER backend_user DROP ASSIGNED CERTIFICATE <old_key>;

-- 2. Force new authentication
ALTER USER backend_user SET MUST_CHANGE_PASSWORD = TRUE;

-- 3. Query what was accessed
SELECT * FROM cortex_audit_log 
WHERE user_id = 'backend_user' 
  AND timestamp > CURRENT_TIMESTAMP() - INTERVAL '24 hours';

-- 4. Disable chatbot immediately (no data loss, just offline)
ALTER TABLE cortex_audit_log MODIFY COLUMN 
  cortex_service SET MASKING POLICY cortex_disabled;
```

---

## 📋 Compliance Checklist

Use this to verify your security posture:

### Authentication & Authorization
- [ ] Backend uses RSA key-pair (not password)
- [ ] Key stored securely (environment variable or Key Vault)
- [ ] Roles configured (ADMIN, APP, USER hierarchy)
- [ ] RBAC policies tested (users can't see others' data)

### Data Protection
- [ ] Column masking policies defined for salary, email, SSN
- [ ] Row policies enforce employee sees only own row
- [ ] TLS encryption in transit (HTTPS + WSS)
- [ ] Encryption at rest (Snowflake default)

### Audit & Compliance
- [ ] Audit table is APPEND_ONLY
- [ ] Audit retention set appropriately (30-90 days)
- [ ] Logs reviewed monthly for anomalies
- [ ] No unauthorized access patterns detected

### Incident Response
- [ ] Key rotation procedure tested
- [ ] Backup keys in place
- [ ] Team trained on incident response
- [ ] DR plan documented

---

## 🎯 Security Best Practices

### For Administrators

1. **Rotate RSA keys quarterly**
   ```bash
   openssl genrsa -out key_new.p8 2048
   # Register in Snowflake, then remove old key
   ```

2. **Monitor audit logs weekly**
   ```sql
   SELECT * FROM cortex_audit_log 
   WHERE masking_applied = FALSE
     AND columns_accessed LIKE '%salary%';
   ```

3. **Test role access monthly**
   ```sql
   -- Verify employee can't see others' data
   SELECT COUNT(*) FROM employees 
   WHERE employee_id != CURRENT_USER();
   ```

4. **Update semantic model carefully**
   - Review all new tables/columns
   - Apply masking policies before exposing sensitive data
   - Test with non-admin user first

### For Users

1. **Don't share chatbot responses** with others (they're personalized)
2. **Report suspicious responses** to HR (e.g., seeing unmasked salary)
3. **Use official channel** only (not forwarded chats)
4. **Verify policy citations** in chatbot responses

---

## ❓ FAQ

**Q: Can Snowflake employees see my data?**  
A: No. Your data is encrypted at rest and in transit. Snowflake employees cannot access customer data without explicit authorization (which is logged and monitored).

**Q: What if Snowflake Cortex is compromised?**  
A: Cortex is Snowflake's core service. A Cortex breach = a Snowflake breach = your data at risk anyway. This solution doesn't increase that risk compared to standard Snowflake usage.

**Q: Can I audit the masking?**  
A: Yes! Query the audit table to see when masking was applied:
```sql
SELECT * FROM cortex_audit_log WHERE masking_applied = TRUE;
```

**Q: How long are audit logs kept?**  
A: By default, 90 days. Set `DATA_RETENTION_TIME_IN_DAYS = 365` for 1 year retention.

**Q: Can I delete my data from the chatbot?**  
A: Yes. Delete from the source table, and chatbot can't access it. Audit logs of past access stay (for compliance).

**Q: Is this HIPAA compliant?**  
A: The architecture supports HIPAA. Your organization needs to implement additional policies (data minimization, encryption, workforce security).

---

## 📚 Further Reading

- [Snowflake Security](https://docs.snowflake.com/en/user-guide/security)
- [Horizon Governance](https://docs.snowflake.com/en/user-guide/security-column-masking-policies)
- [Row Access Policies](https://docs.snowflake.com/en/user-guide/security-row-policies)
- [Cortex Compliance](https://docs.snowflake.com/en/user-guide/cortex/cortex-overview#security)

---

## Next Steps

- **Ready to deploy?** → [Quick Start](/quick-start)
- **Want to understand the full system?** → [Architecture](/architecture)
- **Questions?** → [FAQ](/faq)
