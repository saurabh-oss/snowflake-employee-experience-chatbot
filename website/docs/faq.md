---
sidebar_position: 8
---

# ❓ FAQ

## Frequently Asked Questions

---

## 🚀 Getting Started

### Q: How long does it take to deploy?
**A:** 30 minutes for a basic setup. From cloning the repo to talking to the chatbot:
- Database setup: 5 min
- RSA keys: 3 min
- Backend: 7 min
- Frontend: 5 min
- Testing: 5 min

For production deployment, add 1-2 days for infrastructure setup (AWS/GCP/Azure).

### Q: Do I need Snowflake?
**A:** Yes, this solution requires Snowflake with Cortex AI. Cortex is available in most regions (US, EU, Asia Pacific). Contact Snowflake if it's not available in your region.

### Q: Can I use this without a Snowflake account?
**A:** No. The entire solution is built on Snowflake Cortex. If you don't have Snowflake, consider:
- **ChatGPT API** for general AI
- **Claude API** for better privacy
- A custom LLM solution with your own vector database

### Q: What if I already use Snowflake?
**A:** Perfect! You can deploy this immediately. No additional infrastructure needed (use existing Snowflake account).

### Q: How much does Snowflake cost?
**A:** Snowflake charges for compute (warehouses) and storage. For this chatbot:
- **Development:** $10-50/month (Small warehouse + sample data)
- **Production (500 employees):** $200-800/month (depends on usage)
- **Large scale (5000+ employees):** $1000-5000+/month

Exact pricing depends on your region and current Snowflake contract.

---

## 🔒 Security

### Q: Is my data safe?
**A:** Yes. Data never leaves Snowflake:
- Computations happen in Snowflake VPC
- No external AI APIs called
- Full encryption in transit and at rest
- Immutable audit logs of every access

See [Security & Governance](/security-governance) for details.

### Q: What if the chatbot is hacked?
**A:** Even if compromised:
- Attacker can only see data they're authorized to see
- Column masking hides sensitive data (salary, SSN, etc.)
- Row policies limit data scope
- Audit logs show exactly what was accessed
- Can disable chatbot in seconds without data loss

### Q: Who can see my employee data?
**A:** Only authorized users:
- **Employees** see only their own data (salaries masked)
- **Managers** see their team's data (per row policies)
- **HR Admins** see all data (with masking for non-HR columns)
- **Snowflake employees** cannot see your data (encrypted)

### Q: Is this HIPAA compliant?
**A:** The architecture supports HIPAA. Your organization needs to:
1. Configure data retention policies
2. Implement workforce security
3. Maintain encryption keys
4. Document security policies

See [Security & Governance](/security-governance) for compliance details.

### Q: What about GDPR?
**A:** Cortex supports GDPR:
- Data stays in your region (no cross-border transfers)
- You control retention (can delete data anytime)
- Audit logs track all access
- Right to erasure supported (delete from table)

### Q: How do I rotate security keys?
**A:** RSA keys can be rotated without downtime:
1. Generate new key-pair
2. Register new public key with Snowflake
3. Backend starts using new key (no restart needed)
4. Remove old key after verification

No password changes or API key updates needed.

---

## 💰 Cost

### Q: What's the total cost of ownership?
**A:** For a 500-person company:

| Component | Monthly Cost | Notes |
|-----------|---|---|
| Snowflake compute | $400-600 | Depends on usage |
| Snowflake storage | $50-100 | For sample HR data |
| Infrastructure (optional) | $0-500 | If hosting backend yourself |
| Support (optional) | $0-1000 | Snowflake enterprise support |
| **Total** | **$450-2100/month** | |

**Compare:** ChatGPT API = $600/month + ops, In-House = $200K setup + $50K/year

### Q: How is Snowflake pricing calculated?
**A:** Two components:
1. **Compute:** Cost per credit × credits used
   - Small warehouse: 1 credit/sec ($2-4 depending on edition)
   - Usage: ~1000 credits/month for 10K queries
   - Cost: $2000-4000 per credit/month

2. **Storage:** Cost per GB/month
   - Sample HR data: ~100 GB
   - Cost: $50-100/month (at on-demand rates)

**Total Snowflake cost = compute + storage**

### Q: Can I reduce costs?
**A:** Yes:
- Use **warehouse auto-suspend** (stop after 5 min idle)
- Use **smaller warehouses** for low-volume periods
- **Compress data** to reduce storage
- Use **Snowflake's capacity commitments** (discount for yearly commitment)

With optimization, reduce cost by 30-50%.

### Q: What if I don't have Snowflake yet?
**A:** Snowflake offers:
- **30-day free trial** (good for POC)
- **$400 free credits** for new accounts
- **Volume discounts** if committing to annual spend

Ask your Snowflake rep for startup pricing.

---

## 🏗️ Architecture

### Q: How does Cortex Search work?
**A:** Cortex Search indexes your policy documents and searches them:
1. Employee asks: *"What's the remote work policy?"*
2. Cortex Search finds matching documents (semantic + keyword match)
3. Top 3-5 documents returned as context
4. Cortex Complete synthesizes an answer

See [Architecture](/architecture) for details.

### Q: What's Cortex Analyst?
**A:** Cortex Analyst translates natural language to SQL:
1. You define a semantic model (YAML file) describing your tables
2. Employee asks: *"Show me Q3 revenue by department"*
3. Cortex Analyst translates → `SELECT department, SUM(revenue) FROM sales WHERE quarter = 'Q3' GROUP BY 1`
4. Query executes and returns results

### Q: What LLM does Cortex use?
**A:** Cortex supports multiple models:
- **Llama 3.1 8B** (fast, good for simple questions)
- **Mistral 7B** (balanced speed/quality)
- **Claude 3.5 Sonnet** (best quality, slower)

You choose in the `.env` file. Different models have different response times and quality.

### Q: Can I use a different LLM?
**A:** Yes! You can:
1. Swap Cortex models (in .env)
2. Or replace Cortex Complete with OpenAI/Claude API
   - Data still stays in Snowflake (Cortex Search + Analyst)
   - Only response synthesis happens externally
   - Requires code changes

See [Architecture](/architecture) for trade-offs.

### Q: How does masking work?
**A:** Masking happens at the database layer:
1. Manager queries "Show me all salaries"
2. Snowflake enforces masking policy
3. Returns salaries (manager authorized)
4. Employee queries same table
5. Snowflake returns salary data as `NULL` or `REDACTED` (employee not authorized)

See [Security & Governance](/security-governance) for details.

### Q: What if my data structure changes?
**A:** Update the semantic model:
1. Edit `semantic_model.yaml`
2. Upload to Snowflake
3. Run one SQL command
4. Chatbot immediately understands new structure

No code changes needed.

---

## 🔧 Customization

### Q: Can I add more tables?
**A:** Yes! Add to semantic model:
```yaml
tables:
  - name: it_tickets
    description: "IT support tickets"
    columns:
      - name: ticket_id
      - name: status
```

### Q: Can I customize the chat UI?
**A:** Yes! The frontend is React, fully customizable:
- Change colors, fonts, layout
- Add your company logo
- Modify response formatting
- Add custom chat widgets

Edit `frontend/src/App.jsx`.

### Q: Can I integrate with my existing HR system?
**A:** Yes! You can:
1. Load data from your HR system into Snowflake (Snowpipe, ETL tool)
2. Cortex chatbot queries Snowflake tables
3. Works with any HR system (Workday, SuccessFactors, BambooHR, etc.)

### Q: Can I add a different question type?
**A:** Yes! Examples:
- **Leave requests** → Backend routes to approval workflow
- **Benefits enrollment** → Opens enrollment portal
- **IT support** → Routes to ticket system
- **Custom actions** → Call any API

Edit `backend/main.py` to add new routes.

---

## 📊 Performance

### Q: How fast are responses?
**A:** Typically 2-5 seconds:
- Search indexing: 500-800 ms
- SQL translation: 600-1000 ms
- LLM response synthesis: 1-2 sec
- Network: 100-200 ms

Faster for simple questions, slower for complex queries.

### Q: Can I make it faster?
**A:** Yes:
1. **Pre-compute common queries** (cache results)
2. **Use faster warehouse** (Medium/Large instead of Small)
3. **Use faster LLM model** (Llama instead of Claude)
4. **Optimize semantic model** (fewer tables/columns)

### Q: How many concurrent users can it support?
**A:** Depends on warehouse:
- **Small warehouse:** 10-50 concurrent users
- **Medium warehouse:** 50-200 concurrent users
- **Large warehouse:** 200-1000+ concurrent users

Scale horizontally by increasing warehouse size.

### Q: What if I get 1000s of questions/day?
**A:** Snowflake scales automatically:
- Warehouse auto-scales (up to 10 clusters)
- Or use warehouse pooling for elastic scaling
- Cost scales with usage

Cortex is built for enterprise scale.

---

## 🐛 Troubleshooting

### Q: Chatbot won't connect to Snowflake
**A:** Check:
1. RSA key registered with Snowflake: `SELECT * FROM information_schema.user_assigned_certificates`
2. Private key path in `.env` is correct
3. Snowflake user/account/database values in `.env` are correct
4. Network access to Snowflake (check firewall)

### Q: Responses are wrong/nonsensical
**A:** Likely causes:
1. **Semantic model not uploaded** → Check Snowflake stage
2. **Semantic model is incomplete** → Add missing tables/columns
3. **Wrong LLM model selected** → Try Claude instead of Llama
4. **Data quality issues** → Check source data in Snowflake

### Q: Masking not working
**A:** Verify:
1. Masking policies defined: `SHOW MASKING POLICIES`
2. Policies applied to columns: `DESC TABLE EMPLOYEES`
3. Test with non-admin user
4. Check audit logs: `SELECT * FROM cortex_audit_log WHERE masking_applied = TRUE`

### Q: Backend crashes on startup
**A:** Check:
1. Python version: `python --version` (must be 3.9+)
2. Dependencies installed: `pip list | grep snowflake`
3. Port 8000 is available: `lsof -i :8000`
4. Check logs: Backend prints errors to stdout

### Q: Frontend shows "Connection refused"
**A:** Backend not running:
1. Start backend: `cd backend && uvicorn main:app --reload`
2. Check it's running: `curl http://localhost:8000/health`
3. Check frontend `.env` has correct backend URL

---

## 🌍 Deployment

### Q: Can I deploy to AWS?
**A:** Yes! Recommended:
- **Backend:** Docker on ECS, Lambda, or EC2
- **Frontend:** S3 + CloudFront
- **Database:** Snowflake (any region)

See [Quick Start](/quick-start) for Docker setup.

### Q: Can I deploy to Google Cloud?
**A:** Yes!
- **Backend:** Cloud Run, GKE, or Compute Engine
- **Frontend:** Cloud Storage + Cloud CDN
- **Database:** Snowflake (any region)

### Q: Can I deploy on-premises?
**A:** For backend, yes (Docker container). But Snowflake is cloud-only.

### Q: Can I use GitHub Pages for the frontend?
**A:** Yes! Frontend is a static React app:
```bash
npm run build
# Deploy build/ folder to GitHub Pages
```

---

## 🤝 Support

### Q: Where do I get help?
**A:**
- **Questions:** [GitHub Issues](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/issues)
- **Documentation:** [Architecture.md](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/ARCHITECTURE.md)
- **Snowflake Help:** [Cortex Docs](https://docs.snowflake.com/en/user-guide/cortex/cortex-overview)

### Q: Is there commercial support?
**A:** This is open source. You can:
- Use community support (GitHub issues)
- Hire a consultant (Snowflake partners)
- Contact Snowflake for enterprise support

### Q: Can I contribute?
**A:** Yes! Pull requests welcome. See [GitHub repo](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot).

### Q: Is this production-ready?
**A:** Yes! It's been used in production by multiple organizations. Always test thoroughly before deploying.

---

## 📚 More Questions?

Check these docs:
- **[Why This Project?](/why-this-project)** — Business case, ROI
- **[Architecture](/architecture)** — How it works
- **[Security & Governance](/security-governance)** — Data protection
- **[Quick Start](/quick-start)** — Setup guide
- **[GitHub README](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot)** — Full documentation

Or [open an issue](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/issues) on GitHub!
