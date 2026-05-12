---
sidebar_position: 4
---

# 🚀 Quick Start

## Get Up and Running in 30 Minutes

This guide walks you through deploying the Employee Experience Chatbot. For detailed setup instructions, see the [full README](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot).

---

## Prerequisites

- **Snowflake Account** with Cortex AI (US East, EU West, or Asia Pacific regions)
- **SQL Warehouse** (Standard, size Small or larger)
- **Python 3.9+** (for backend)
- **Node.js 18+** (for frontend)
- **Git** (to clone the repository)

---

## Step 1: Set Up Snowflake Database (5 min)

### 1.1 Clone the Repository

```bash
git clone https://github.com/saurabh-oss/snowflake-employee-experience-chatbot.git
cd snowflake-employee-experience-chatbot
```

### 1.2 Run Setup Scripts

Open Snowflake Worksheets (Snowsight) and execute in order:

1. **`snowflake/01_setup_database.sql`** — Creates database, schemas, roles
2. **`snowflake/02_create_tables_and_data.sql`** — Loads sample HR data
3. **`snowflake/03_cortex_search.sql`** — Creates policy document index
4. **`snowflake/05_cortex_agent.sql`** — Creates audit table

### 1.3 Upload Semantic Model

The semantic model tells Cortex Analyst how to translate questions to SQL.

**Via Snowsight UI:**
1. Go to **Data** → **Databases** → **CORTEX** → **Stages** → **MY_STAGE**
2. Upload **`snowflake/04_semantic_model.yaml`**

**Via SnowSQL CLI:**
```bash
snowsql -c your_connection -f snowflake/04_semantic_model.yaml
```

---

## Step 2: Generate RSA Key-Pair (3 min)

The backend authenticates to Snowflake using RSA keys instead of passwords.

### 2.1 Generate Keys Locally

```bash
# Generate private key
openssl genrsa -out rsa_key.p8 2048

# Extract public key
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub

# Copy public key (remove header/footer)
cat rsa_key.pub
```

You'll see output like:
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBIgKCAQEA...
-----END PUBLIC KEY-----
```

### 2.2 Register with Snowflake

In Snowflake Worksheets, run:

```sql
ALTER USER APP_USER 
SET RSA_PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBIgKCAQEA...';
```

Replace `MIIBIjA...` with your actual public key content (without header/footer).

---

## Step 3: Set Up Backend (7 min)

### 3.1 Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3.2 Create `.env` File

Copy `.env.example` to `.env`:

```bash
cp ../.env.example .env
```

Edit `.env`:
```env
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USER=APP_USER
SNOWFLAKE_DATABASE=CORTEX
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_PRIVATE_KEY_PATH=../rsa_key.p8
SNOWFLAKE_CORTEX_MODEL=llama3-8b     # or mistral-7b, claude-3-opus
BACKEND_PORT=8000
```

### 3.3 Start Backend

```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
Uvicorn running on http://127.0.0.1:8000
```

✅ **Backend is running!**

Test it:
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

---

## Step 4: Set Up Frontend (5 min)

### 4.1 Install Dependencies

```bash
cd ../frontend
npm install
```

### 4.2 Start Development Server

```bash
npm start
```

You should see:
```
Compiled successfully!
Open http://localhost:3000
```

---

## Step 5: Test the Chatbot (3 min)

Open **http://localhost:3000** in your browser.

### 5.1 Try These Questions

1. **Leave Balance:**
   - *"How much PTO do I have remaining?"*
   - Expected: Returns balance from employees table

2. **Policy Lookup:**
   - *"What's the remote work policy?"*
   - Expected: Returns relevant policy documents

3. **Manager Analytics:**
   - *"Show me team headcount by level"*
   - Expected: SQL query result with aggregations

4. **Masking Test:**
   - *"Show me salary information"* (as non-admin user)
   - Expected: Response says you don't have access

---

## 🎉 Deployment Checklist

- [ ] Database setup scripts executed (01-05)
- [ ] Semantic model uploaded to Snowflake stage
- [ ] RSA key-pair generated and registered
- [ ] Backend running on localhost:8000 (health check passes)
- [ ] Frontend running on localhost:3000
- [ ] All 4 test questions answered correctly
- [ ] Masking verified (sensitive data hidden for non-admins)

---

## 🚀 Next Steps: Production Deployment

### For AWS

```bash
# Build backend Docker image
cd backend
docker build -t ex-chatbot-backend .

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <your-ecr-url>
docker tag ex-chatbot-backend:latest <your-ecr-url>/ex-chatbot-backend:latest
docker push <your-ecr-url>/ex-chatbot-backend:latest

# Deploy to ECS/Lambda
# See: ARCHITECTURE.md for detailed deployment guide
```

### For Google Cloud

```bash
# Build backend image
cd backend
docker build -t gcr.io/<your-project>/ex-chatbot-backend .

# Push to GCR
docker push gcr.io/<your-project>/ex-chatbot-backend

# Deploy to Cloud Run
gcloud run deploy ex-chatbot-backend \
  --image gcr.io/<your-project>/ex-chatbot-backend \
  --set-env-vars SNOWFLAKE_ACCOUNT=...
```

### For Azure

```bash
# Build and push to ACR
az acr build --registry <your-registry> \
  --image ex-chatbot-backend:latest ./backend

# Deploy to App Service
az containerapp create \
  --name ex-chatbot-backend \
  --image <your-registry>.azurecr.io/ex-chatbot-backend:latest
```

### For GitHub Pages (Frontend)

Frontend can be deployed to GitHub Pages:

```bash
cd frontend
npm run build
# Deploy build/ folder to gh-pages branch
```

---

## ⚙️ Customization

### Change the LLM Model

Edit `.env`:
```env
SNOWFLAKE_CORTEX_MODEL=claude-3-opus  # or mistral-7b, llama3-8b
```

Supported models:
- `llama3-8b` (fastest, good for simple questions)
- `mistral-7b` (balanced)
- `claude-3-opus` (most capable, slowest)

### Add More Data

1. Create new table in Snowflake:
   ```sql
   CREATE TABLE IT_TICKETS (
     ticket_id VARCHAR,
     status VARCHAR,
     assignee VARCHAR,
     created_at DATE
   );
   ```

2. Add to semantic model (`semantic_model.yaml`):
   ```yaml
   - name: it_tickets
     description: "IT support tickets"
     columns:
       - name: ticket_id
         description: "Unique ticket ID"
   ```

3. Upload updated semantic model to Snowflake

4. Test: *"Show me my open IT tickets"*

### Adjust Masking Rules

Edit the masking policies in `snowflake/02_create_tables_and_data.sql`:

```sql
CREATE MASKING POLICY email_mask AS (email STRING)
  RETURNS STRING →
  CASE
    WHEN CURRENT_ROLE() = 'ADMIN' THEN email
    ELSE '***@***.***'
  END;
```

---

## ❓ Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Must be 3.9+

# Check dependencies
pip install -r requirements.txt

# Check port is free
lsof -i :8000
```

### Frontend shows 404
```bash
# Make sure backend is running
curl http://localhost:8000/health

# Check CORS headers in backend
# See: main.py line ~50
```

### Snowflake auth fails
```bash
# Verify RSA key is registered
SELECT * FROM information_schema.user_assigned_certificates 
WHERE user_name = 'APP_USER';

# Check .env file has correct path to private key
cat $SNOWFLAKE_PRIVATE_KEY_PATH
```

### Cortex Search returns no results
```bash
# Verify semantic model is uploaded
SELECT * FROM @MY_STAGE/04_semantic_model.yaml;

# Check policy documents are in the table
SELECT COUNT(*) FROM POLICIES;
```

---

## 📚 Full Documentation

For detailed information:

- **[Architecture](/architecture)** — How everything works
- **[Security & Governance](/security-governance)** — RBAC, masking, audit logs
- **[Use Cases](/use-cases)** — Real-world scenarios
- **[Full README](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot)** — Complete setup guide
- **[ARCHITECTURE.md](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/blob/main/ARCHITECTURE.md)** — Deep technical details

---

## 🎯 Success!

Once you see the chatbot responding in your browser, you're done! 🎉

Next steps:
1. **Customize** the semantic model for your data
2. **Adjust** masking policies for your security requirements
3. **Test** with real employees
4. **Deploy** to production (AWS, GCP, Azure, or on-premise)

Questions? Check the [FAQ](/faq) or open an issue on [GitHub](https://github.com/saurabh-oss/snowflake-employee-experience-chatbot/issues).
