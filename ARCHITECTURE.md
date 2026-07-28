# 🏗️ SpendSense AI — Architecture Documentation

> **Version:** 1.0.0 | **Last Updated:** July 2026 | **Stack:** React · Node.js · MongoDB · Groq AI

---

## 📋 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [MongoDB Data Layer](#4-mongodb-data-layer)
5. [Groq AI Integration](#5-groq-ai-integration)
6. [AI Agents Registry](#6-ai-agents-registry)
7. [AI Orchestrator Pipeline](#7-ai-orchestrator-pipeline)
8. [Authentication Flow](#8-authentication-flow)
9. [Expense Flow](#9-expense-flow)
10. [AI Analysis Flow](#10-ai-analysis-flow)
11. [Notification System Flow](#11-notification-system-flow)
12. [Deployment Architecture](#12-deployment-architecture)

---

## 1. System Architecture Overview

SpendSense AI follows a **3-tier client-server architecture** with a dedicated AI intelligence layer powered by Groq's LLM API.

```mermaid
graph TB
    subgraph CLIENT["🖥️  CLIENT LAYER — React + Vite"]
        UI["React UI Pages"]
        CTX["Context Providers\n(Auth · Notification)"]
        AXIOS["Axios HTTP Layer\n(Interceptors · 120s timeout)"]
    end

    subgraph SERVER["⚙️  SERVER LAYER — Express.js + Node.js"]
        MW["Middleware Stack\n(Helmet · CORS · Rate Limiter · JWT Auth)"]
        ROUTES["REST API Router\n/api/v1/*"]
        CTRL["Controllers"]
        SVC["Service Layer"]
        CACHE["In-Memory LRU Cache\n(Prediction results)"]
    end

    subgraph AI["🤖  AI INTELLIGENCE LAYER — Groq SDK"]
        ORCH["Orchestrator Agent\n(Pipeline Coordinator)"]
        subgraph AGENTS["Specialist Agents"]
            A1["🏷️ Categorizer"]
            A2["📈 Pattern Analyzer"]
            A3["💰 Savings Advisor"]
            A4["🎯 Budget Planner"]
            A5["❤️ Health Score"]
            A6["📄 Monthly Report"]
            A7["🔮 Prediction"]
            A8["💬 Chat Agent"]
            A9["🐷 Savings Goal"]
            A10["🧠 Finance Agent"]
        end
        GROQ["Groq API\nLlama 3.3 70B Versatile"]
    end

    subgraph DB["🗄️  DATA LAYER — MongoDB Atlas"]
        U["Users"]
        E["Expenses"]
        AI_R["AI Reports"]
        MR["Monthly Reports"]
        HS["Health Scores"]
        SG["Savings Goals"]
        N["Notifications"]
    end

    UI --> CTX --> AXIOS
    AXIOS -->|"HTTPS REST"| MW
    MW --> ROUTES --> CTRL --> SVC
    SVC --> ORCH
    ORCH --> AGENTS
    AGENTS --> GROQ
    SVC -->|"Mongoose ODM"| DB

    style CLIENT fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style SERVER fill:#0f172a,stroke:#334155,color:#e2e8f0
    style AI fill:#1a0a2e,stroke:#7c3aed,color:#e2e8f0
    style DB fill:#0a1628,stroke:#1e4d8c,color:#e2e8f0
```

---

## 2. Frontend Architecture

### Component Tree & Data Flow

```mermaid
graph TD
    MAIN["main.jsx\n(React Entry Point)"]
    APP["App.jsx\n(Router + Auth Guard)"]

    subgraph PROVIDERS["Context Providers"]
        AUTH_CTX["AuthContext\n(user · token · login · logout)"]
        NOTI_CTX["NotificationContext\n(notifications · toasts · polling)"]
    end

    subgraph LAYOUT["DashboardLayout.jsx"]
        SIDEBAR["Sidebar.jsx\n(Navigation · NotificationBell)"]
        NAVBAR["Navbar.jsx\n(Mobile · Bell)"]
        MAIN_SLOT["<main> Content Slot"]
        TOAST_C["ToastContainer.jsx"]
    end

    subgraph PAGES["Route Pages"]
        DASH["Dashboard.jsx"]
        AIAN["AIAnalysis.jsx"]
        AIPR["AIPrediction.jsx"]
        CHAT["AIFinanceChat.jsx"]
        BUDG["BudgetPlanner.jsx"]
        HS["HealthScore.jsx"]
        MR["MonthlyReport.jsx"]
        SG["SavingsGoals.jsx"]
        EH["ExpenseHistory.jsx"]
        AE["AddExpense.jsx"]
        PROF["Profile.jsx"]
        LG["Login.jsx"]
        RG["Register.jsx"]
    end

    subgraph COMPONENTS["Shared Components"]
        direction LR
        SC["StatCard"]
        LDR["Loader"]
        EB["ErrorBanner\n(role=alert)"]
        PIE["PieChartCard"]
        BAR["BarChartCard"]
        LINE["LineChartCard"]
        AREA["AreaChartCard"]
        PL["AIPipelineLoader"]
        NW["NotificationWidget"]
        NB["NotificationBell"]
    end

    subgraph API["API Layer (Axios)"]
        AX["axiosInstance.js\n(Bearer token · 401 redirect)"]
        AUTH_API["auth.js"]
        EXP_API["expenses.js"]
        AI_API["ai.js"]
        ORCH_API["orchestrator.js"]
        NOTI_API["notifications.js"]
    end

    MAIN --> APP
    APP --> AUTH_CTX
    AUTH_CTX --> NOTI_CTX
    NOTI_CTX --> LAYOUT
    LAYOUT --> SIDEBAR
    LAYOUT --> NAVBAR
    LAYOUT --> MAIN_SLOT
    LAYOUT --> TOAST_C
    MAIN_SLOT --> PAGES
    PAGES --> COMPONENTS
    PAGES --> API
    API --> AX

    style PROVIDERS fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style LAYOUT fill:#0f2720,stroke:#059669,color:#e2e8f0
    style API fill:#1a0a00,stroke:#d97706,color:#e2e8f0
```

### State Management Strategy

```mermaid
graph LR
    subgraph GLOBAL["Global State (React Context)"]
        AC["AuthContext\n• user object\n• JWT token\n• loading flag\n• login()\n• logout()"]
        NC["NotificationContext\n• notifications[]\n• unreadCount\n• toasts[]\n• 30s poll interval\n• addToast()\n• markAsRead()"]
    end

    subgraph LOCAL["Local State (useState per page)"]
        LS1["Dashboard: summary, predictions"]
        LS2["AIAnalysis: months, isInitialLoad"]
        LS3["Chat: messages, input"]
        LS4["SavingsGoals: goals, form"]
    end

    subgraph REMOTE["Remote State (useApi hook)"]
        RA["useApi(apiFn)\n→ { data, loading, error, execute }"]
    end

    AC -->|"useAuth()"| LOCAL
    NC -->|"useNotifications()"| LOCAL
    RA --> LOCAL

    style GLOBAL fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style LOCAL fill:#0f172a,stroke:#334155,color:#e2e8f0
    style REMOTE fill:#1a1000,stroke:#d97706,color:#e2e8f0
```

---

## 3. Backend Architecture

### Server & Middleware Stack

```mermaid
graph TB
    REQ["Incoming HTTP Request"]

    subgraph MW_STACK["Middleware Pipeline (in order)"]
        H["Helmet\n(Security Headers)"]
        MS["mongo-sanitize\n(NoSQL Injection Prevention)"]
        CORS["CORS\n(Whitelist CLIENT_URL)"]
        COMP["compression\n(Gzip Response)"]
        PARSE["express.json\n(Body Parser · 10kb limit)"]
        MORGAN["morgan\n(Dev logging)"]
        RATE["apiLimiter\n(200 req / 15min global)"]
    end

    subgraph ROUTE_LAYER["Route Layer /api/v1"]
        AUTH_R["authLimiter\n/auth"]
        EXP_R["/expenses"]
        AI_L["aiLimiter\n/categorizer · /analysis · /ai\n/savings · /budget · /health-score\n/monthly-report"]
        ORCH_L["orchestratorLimiter (50/hr)\n/orchestrator"]
        MISC_R["/savings-goals · /notifications"]
    end

    subgraph AUTH_MW["Auth Middleware"]
        JWT_V["Verify JWT Signature"]
        BL["Check Token Blacklist"]
        DB_U["Load User from DB"]
        ATTACH["Attach req.user"]
    end

    CTRL["Controllers"]
    SVC["Service Layer"]
    AGENT["AI Agents"]
    DB[("MongoDB")]

    ERR["Global Error Handler\n(ApiError → JSON · Stack in dev only)"]
    RES["HTTP Response"]

    REQ --> H --> MS --> CORS --> COMP --> PARSE --> MORGAN --> RATE
    RATE --> ROUTE_LAYER
    ROUTE_LAYER --> AUTH_MW
    AUTH_MW --> CTRL --> SVC
    SVC --> AGENT
    SVC --> DB
    AGENT --> DB
    CTRL --> RES
    CTRL -.->|"on error"| ERR
    ERR --> RES

    style MW_STACK fill:#0f172a,stroke:#334155,color:#e2e8f0
    style ROUTE_LAYER fill:#0a1628,stroke:#1e4d8c,color:#e2e8f0
    style AUTH_MW fill:#1a0a00,stroke:#d97706,color:#e2e8f0
```

### Service Layer Responsibilities

```mermaid
graph LR
    subgraph SERVICES["Service Layer"]
        ES["expenseService\n• createExpense()\n• getExpenses()\n• getSummary()\n• escapeRegex()"]
        PS["predictionService\n• getSpendingPredictions()\n• LRU cache (100 max)\n• 15min TTL"]
        NS["notificationService\n• createNotification()\n• 60s deduplication\n• getNotifications()\n• markAsRead()"]
        MRS["monthlyReportService\n• buildMonthlyContext()\n• generateReport()\n• getHistory()"]
        SGS["savingsGoalService\n• createGoal()\n• addDeposit()\n• getSuggestions()"]
    end

    subgraph TRIGGERS["Auto Notification Triggers"]
        T1["Budget 80% → budget_80"]
        T2["Budget Exceeded → budget_exceeded"]
        T3["Large Expense ≥₹5000 → large_expense"]
        T4["Duplicate Detected → duplicate_expense"]
        T5["Goal Achieved → savings_goal_achieved"]
        T6["Report Ready → monthly_report_ready"]
        T7["Prediction Updated → prediction_updated"]
    end

    ES -->|"fires"| T1
    ES -->|"fires"| T2
    ES -->|"fires"| T3
    ES -->|"fires"| T4
    SGS -->|"fires"| T5
    MRS -->|"fires"| T6
    PS -->|"fires"| T7

    style SERVICES fill:#0f172a,stroke:#334155,color:#e2e8f0
    style TRIGGERS fill:#2a0a0a,stroke:#dc2626,color:#e2e8f0
```

---

## 4. MongoDB Data Layer

### Schema Entity Relationship Diagram

```mermaid
erDiagram
    User {
        ObjectId _id PK
        string name
        string email
        string password
        number monthlyIncome
        number monthlyBudget
        date createdAt
        date updatedAt
    }

    Expense {
        ObjectId _id PK
        ObjectId user FK
        string title
        number amount
        string category
        date date
        string notes
        date createdAt
    }

    AIReport {
        ObjectId _id PK
        ObjectId user FK
        string type
        number monthsAnalyzed
        mixed data
        string status
        string errorMessage
        date createdAt
    }

    MonthlyReport {
        ObjectId _id PK
        ObjectId user FK
        string reportMonth
        mixed data
        string status
        date createdAt
    }

    HealthScore {
        ObjectId _id PK
        ObjectId user FK
        number score
        string grade
        mixed breakdown
        date createdAt
    }

    SavingsGoal {
        ObjectId _id PK
        ObjectId user FK
        string name
        number targetAmount
        number currentSavings
        date targetDate
        string status
        date createdAt
    }

    Notification {
        ObjectId _id PK
        ObjectId user FK
        string type
        string title
        string message
        string severity
        boolean read
        mixed metadata
        date createdAt
    }

    User ||--o{ Expense : "has many"
    User ||--o{ AIReport : "has many"
    User ||--o{ MonthlyReport : "has many"
    User ||--o{ HealthScore : "has many"
    User ||--o{ SavingsGoal : "has many"
    User ||--o{ Notification : "has many"
```

### Database Indexes

```mermaid
graph TD
    subgraph IDX["Compound Indexes for Query Optimization"]
        I1["Expense\n{ user: 1, date: -1 }\n{ user: 1, category: 1 }\n{ user: 1, date: -1, category: 1 }"]
        I2["AIReport\n{ user: 1, type: 1, createdAt: -1 }\n{ status: 1, createdAt: -1 }"]
        I3["MonthlyReport\n{ user: 1, reportMonth: 1, createdAt: -1 }"]
        I4["HealthScore\n{ user: 1, createdAt: -1 }"]
        I5["Notification\n{ user: 1, read: 1, createdAt: -1 }"]
        I6["SavingsGoal\n{ user: 1, status: 1 }"]
    end

    subgraph BENEFIT["Query Benefits"]
        B1["Dashboard summary → O(log n)"]
        B2["AI report lookup → O(log n)"]
        B3["Monthly history → O(log n)"]
        B4["Unread bell count → O(log n)"]
    end

    I1 --> B1
    I2 --> B2
    I3 --> B3
    I5 --> B4

    style IDX fill:#0a1628,stroke:#1e4d8c,color:#e2e8f0
    style BENEFIT fill:#0a2010,stroke:#059669,color:#e2e8f0
```

---

## 5. Groq AI Integration

### Groq SDK Configuration

```mermaid
graph LR
    subgraph CONFIG["Groq Client Config"]
        KEY["GROQ_API_KEY\n(env variable)"]
        MODEL["Model: llama-3.3-70b-versatile"]
        TIMEOUT["Timeout: 60,000ms"]
        RETRIES["Max Retries: 3"]
        TEMP["Temperature: 0.1–0.4\n(agent-specific)"]
    end

    subgraph PATTERN["Prompt Pattern"]
        SYS["System Prompt\n(Role + Output format)"]
        USER_P["User Prompt\n(Financial data context)"]
        FORMAT["Output Contract\n(Strict JSON only,\nno markdown fences)"]
    end

    subgraph SAFETY["Safety & Reliability"]
        PARSE["Safe JSON Parser\n(strip ```json fences)"]
        FALLBACK["Structured Fallback\n(returned on parse failure)"]
        LOG["Error Logging\n([AgentName] parse error)"]
    end

    CONFIG --> PATTERN --> SAFETY

    style CONFIG fill:#1a0a2e,stroke:#7c3aed,color:#e2e8f0
    style PATTERN fill:#0f172a,stroke:#334155,color:#e2e8f0
    style SAFETY fill:#0a2010,stroke:#059669,color:#e2e8f0
```

### Agent Temperature Strategy

```mermaid
xychart-beta
    title "Groq LLM Temperature by Agent (Lower = More Deterministic)"
    x-axis ["Prediction", "Categorizer", "Health Score", "Budget Planner", "Pattern Analyzer", "Savings Advisor", "Chat Agent", "Monthly Report"]
    y-axis "Temperature" 0 --> 0.8
    bar [0.2, 0.1, 0.2, 0.3, 0.3, 0.4, 0.7, 0.4]
```

---

## 6. AI Agents Registry

### Agent Capabilities Map

```mermaid
graph TB
    subgraph REGISTRY["🤖 SpendSense AI — 10-Agent Registry"]

        subgraph ANALYSIS["Analysis Agents"]
            CAT["🏷️ Categorizer Agent\n• Single & batch classification\n• Max batch: 20 items\n• Retry on parse failure\n• Enum-validated categories"]
            PAT["📈 Pattern Analyzer Agent\n• Velocity & trend detection\n• Recurring anomaly spotting\n• Week-over-week deltas\n• Day-of-week patterns"]
            FIN["🧠 Finance Agent\n• Summary generation\n• Top category identification\n• Savings potential estimate\n• Structured fallback on error"]
        end

        subgraph ADVISORY["Advisory Agents"]
            SAV["💰 Savings Advisor Agent\n• Cost-cutting strategies\n• Category-specific tips\n• High-impact priorities\n• Emergency fund advice"]
            BUDG["🎯 Budget Planner Agent\n• 50/30/20 rule allocation\n• Per-category cap generation\n• Income-based planning\n• Rebalance suggestions"]
            GOAL["🐷 Savings Goal Agent\n• Goal acceleration tips\n• Deposit frequency advice\n• Risk-adjusted strategies\n• Timeline optimization"]
        end

        subgraph MONITORING["Monitoring Agents"]
            HS["❤️ Health Score Agent\n• 0–100 composite score\n• A+ to F letter grade\n• 4-pillar breakdown:\n  Savings · Budget · Consistency · Diversity"]
            MR["📄 Monthly Report Agent\n• Full financial audit\n• Month-over-month compare\n• AI recommendations\n• PDF-ready structured data"]
            PRED["🔮 Prediction Agent\n• Weekly forecast\n• Monthly forecast\n• Confidence scoring (50–95%)\n• Category predictions"]
        end

        subgraph CONVERSATIONAL["Conversational Agent"]
            CHAT["💬 Chat Agent\n• Multi-turn conversation\n• Context from expense history\n• Real-time financial Q&A\n• Persistent chat memory"]
        end

        ORCH2["🎼 Orchestrator Agent\n(Coordinates all agents)"]

    end

    ORCH2 --> CAT
    ORCH2 --> PAT
    ORCH2 --> SAV
    ORCH2 --> BUDG
    ORCH2 -.-> HS
    ORCH2 -.-> PRED

    style ANALYSIS fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style ADVISORY fill:#0a2010,stroke:#059669,color:#e2e8f0
    style MONITORING fill:#1a0a00,stroke:#d97706,color:#e2e8f0
    style CONVERSATIONAL fill:#0a1628,stroke:#1e4d8c,color:#e2e8f0
```

---

## 7. AI Orchestrator Pipeline

### 5-Stage Multi-Agent Pipeline

```mermaid
sequenceDiagram
    participant FE as 🖥️ Frontend
    participant ORCH as 🎼 Orchestrator
    participant CAT as 🏷️ Categorizer
    participant PAT as 📈 Pattern Analyzer
    participant SAV as 💰 Savings Advisor
    participant BUDG as 🎯 Budget Planner
    participant GROQ as 🤖 Groq LLM
    participant DB as 🗄️ MongoDB

    FE->>ORCH: POST /api/v1/orchestrator/analyze\n{ months, forceRefresh }
    ORCH->>DB: Fetch expense history (N months)
    DB-->>ORCH: expenses[]

    Note over ORCH: Stage 1 — Sequential (depends on raw data)
    ORCH->>CAT: categorizeExpenses(expenses)
    CAT->>GROQ: Batch categorization prompt
    GROQ-->>CAT: JSON category map
    CAT-->>ORCH: categorizedExpenses

    Note over ORCH: Stages 2,3,4 — Parallel (Promise.allSettled)
    par Pattern Analysis
        ORCH->>PAT: analyzePatterns(categorizedExpenses)
        PAT->>GROQ: Pattern analysis prompt
        GROQ-->>PAT: JSON patterns
        PAT-->>ORCH: patterns
    and Savings Advisory
        ORCH->>SAV: generateSavingsAdvice(expenses)
        SAV->>GROQ: Savings advisor prompt
        GROQ-->>SAV: JSON suggestions
        SAV-->>ORCH: savingsAdvice
    and Budget Planning
        ORCH->>BUDG: createBudgetPlan(expenses, income)
        BUDG->>GROQ: Budget planner prompt
        GROQ-->>BUDG: JSON budget plan
        BUDG-->>ORCH: budgetPlan
    end

    Note over ORCH: Stage 5 — Synthesis (depends on 2,3,4)
    ORCH->>GROQ: Executive synthesis prompt\n(all stage outputs combined)
    GROQ-->>ORCH: JSON executive summary

    ORCH->>DB: Save AIReport (type=full)
    DB-->>ORCH: savedReport

    ORCH-->>FE: { pipeline, summary, meta }

    Note over FE: AIPipelineLoader\nAnimates each stage completion
```

### Orchestrator Failure Isolation

```mermaid
graph LR
    subgraph STAGES["Pipeline Stages"]
        S1["Stage 1\nCategorizer\n(Sequential)"]
        S2["Stage 2\nPattern Analyzer\n(Parallel)"]
        S3["Stage 3\nSavings Advisor\n(Parallel)"]
        S4["Stage 4\nBudget Planner\n(Parallel)"]
        S5["Stage 5\nSynthesis\n(Sequential)"]
    end

    subgraph FALLBACKS["STAGE_FALLBACKS (on failure)"]
        F1["categories: []"]
        F2["patterns: null\ninsights: []"]
        F3["recommendations: []\nsavingsScore: 0"]
        F4["plan: null\nallocations: []"]
        F5["executiveSummary:\n'Analysis partially complete'"]
    end

    S1 -.->|"catch"| F1
    S2 -.->|"allSettled"| F2
    S3 -.->|"allSettled"| F3
    S4 -.->|"allSettled"| F4
    S5 -.->|"catch"| F5

    S1 --> S2
    S2 --> S5
    S3 --> S5
    S4 --> S5

    style STAGES fill:#0f172a,stroke:#334155,color:#e2e8f0
    style FALLBACKS fill:#2a0a0a,stroke:#dc2626,color:#e2e8f0
```

---

## 8. Authentication Flow

### Registration & Login

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🖥️ React App
    participant MW as ⚙️ Auth Middleware
    participant CTRL as 📋 AuthController
    participant DB as 🗄️ MongoDB

    rect rgb(30, 27, 75)
        Note over U,DB: REGISTRATION FLOW
        U->>FE: Fill register form\n(name, email, password)
        FE->>CTRL: POST /api/v1/auth/register
        CTRL->>DB: Check existing email
        DB-->>CTRL: null (not found)
        CTRL->>DB: bcrypt.hash(password, 12)
        CTRL->>DB: User.create({ name, email, hashedPassword\n  monthlyIncome: 3000, monthlyBudget: 2400 })
        DB-->>CTRL: newUser
        CTRL->>CTRL: user.generateToken() → JWT
        CTRL-->>FE: { user: toSafeObject(), token }
        FE->>FE: AuthContext.login(user, token)\nlocalStorage.setItem(token, user)
        FE-->>U: Redirect → /dashboard
    end

    rect rgb(10, 22, 40)
        Note over U,DB: LOGIN FLOW
        U->>FE: Fill login form\n(email, password)
        FE->>CTRL: POST /api/v1/auth/login
        CTRL->>DB: User.findOne({ email }).select(+password)
        DB-->>CTRL: user
        CTRL->>CTRL: user.comparePassword(plain)\nbcrypt.compare()
        CTRL->>CTRL: user.generateToken() → JWT
        CTRL-->>FE: { user: toSafeObject(), token }
        FE->>FE: AuthContext.login(user, token)
        FE-->>U: Redirect → /dashboard
    end
```

### JWT Authentication Middleware

```mermaid
flowchart TD
    REQ["Incoming Protected Request"] --> HEADER["Extract Authorization Header"]
    HEADER --> CHECK_FORMAT{"Bearer token\npresent?"}
    CHECK_FORMAT -->|"No"| UNAUTH1["401 Unauthorized\n'No token provided'"]
    CHECK_FORMAT -->|"Yes"| VERIFY["jwt.verify(token, JWT_SECRET)"]
    VERIFY --> VALID{"Valid &\nnot expired?"}
    VALID -->|"No"| UNAUTH2["401 Unauthorized\n'Token invalid or expired'"]
    VALID -->|"Yes"| BLACKLIST["Check token blacklist"]
    BLACKLIST --> LISTED{"Token\nrevoked?"}
    LISTED -->|"Yes"| UNAUTH3["401 Unauthorized\n'Token revoked'"]
    LISTED -->|"No"| DBCHECK["User.findById(decoded.id)"]
    DBCHECK --> EXISTS{"User\nexists?"}
    EXISTS -->|"No"| UNAUTH4["401 Unauthorized\n'User not found'"]
    EXISTS -->|"Yes"| ATTACH["req.user = user.toSafeObject()\n(includes monthlyIncome, monthlyBudget)"]
    ATTACH --> NEXT["next() → Controller"]

    style UNAUTH1 fill:#2a0a0a,stroke:#dc2626,color:#fca5a5
    style UNAUTH2 fill:#2a0a0a,stroke:#dc2626,color:#fca5a5
    style UNAUTH3 fill:#2a0a0a,stroke:#dc2626,color:#fca5a5
    style UNAUTH4 fill:#2a0a0a,stroke:#dc2626,color:#fca5a5
    style NEXT fill:#0a2010,stroke:#059669,color:#a7f3d0
```

---

## 9. Expense Flow

### Add Expense — Complete Flow

```mermaid
flowchart TD
    USER["User submits\nAdd Expense form"] --> VALIDATE["Client-side\nvalidation"]
    VALIDATE -->|"fail"| ERR_UI["Show inline\nfield errors"]
    VALIDATE -->|"pass"| API_CALL["POST /api/v1/expenses\n{ title, amount, category, date, notes }"]

    API_CALL --> AUTH_CHECK["JWT Auth Middleware"]
    AUTH_CHECK --> CATEGORIZE{"Category\nprovided?"}
    CATEGORIZE -->|"No → auto-detect"| CAT_AGENT["🏷️ Categorizer Agent\n(Groq AI)"]
    CAT_AGENT --> CATEGORIZE
    CATEGORIZE -->|"Yes"| ESCAPE["escapeRegex(title.trim())\n(ReDoS prevention)"]

    ESCAPE --> DUP_CHECK["Duplicate detection\n(same title + amount + date)"]
    DUP_CHECK -->|"duplicate found"| CREATE_EXP["Expense.create()"]
    DUP_CHECK -->|"no duplicate"| CREATE_EXP

    CREATE_EXP --> ASYNC_CHECKS["Async Notification Checks\n(non-blocking try/catch)"]

    subgraph CHECKS["Notification Trigger Logic"]
        NC1{"Duplicate\nfound?"}
        NC2{"Amount\n≥ ₹5,000?"}
        NC3{"Monthly spend\n≥ 80% budget?"}
        NC4{"Monthly spend\n≥ 100% budget?"}

        NC1 -->|"yes"| N1["🔔 duplicate_expense\n(warning)"]
        NC2 -->|"yes"| N2["🔔 large_expense\n(info)"]
        NC3 -->|"yes & < 100%"| N3["🔔 budget_80\n(warning)"]
        NC4 -->|"yes"| N4["🔔 budget_exceeded\n(error)"]
    end

    ASYNC_CHECKS --> CHECKS
    CHECKS --> RESPOND["Return expense object"]
    RESPOND --> FE_UPDATE["Frontend updates:\n• Expense list\n• Dashboard summary\n• Notification bell badge"]

    style CHECKS fill:#1a0a00,stroke:#d97706,color:#e2e8f0
    style ERR_UI fill:#2a0a0a,stroke:#dc2626,color:#fca5a5
```

### Expense History Query Flow

```mermaid
flowchart LR
    FE_QUERY["GET /expenses\n?page=1&limit=10\n&search=food\n&category=Food\n&startDate=2025-01-01\n&endDate=2025-01-31\n&sort=-date"] --> PARSE["Parse & sanitize\nquery params"]

    PARSE --> BUILD_FILTER["Build MongoDB filter\n{ user: userId }"]

    BUILD_FILTER --> S1["search.trim()\n→ escapeRegex()\n→ { $regex, $options:'i' }"]
    BUILD_FILTER --> S2["category\n→ exact enum match"]
    BUILD_FILTER --> S3["startDate / endDate\n→ { $gte, $lte }"]

    S1 --> EXEC
    S2 --> EXEC
    S3 --> EXEC

    EXEC["Expense.find(filter)\n.sort()\n.skip()\n.limit(50 max)\n.lean()"] --> COUNT["Expense.countDocuments(filter)"]

    COUNT --> RESP["{ expenses[], total,\npage, pages, limit }"]

    style FE_QUERY fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style EXEC fill:#0a1628,stroke:#1e4d8c,color:#e2e8f0
```

---

## 10. AI Analysis Flow

### Full Orchestrator Analysis Request

```mermaid
flowchart TD
    USER["User clicks\n'Run AI Analysis'"] --> LOADER["AIPipelineLoader shown\n(only on first load)"]

    LOADER --> API["POST /api/v1/orchestrator/analyze\n{ months: 3|6|12, forceRefresh: bool }"]

    API --> CACHE_CHECK{"Cached result\navailable &\nnot forceRefresh?"}
    CACHE_CHECK -->|"yes → HIT"| CACHED["Return cached AIReport\nfromCache: true"]
    CACHE_CHECK -->|"no → MISS"| FETCH["Fetch expenses from DB\n(compound index scan)"]

    FETCH --> S1_RUN["Stage 1: Categorizer\n(Sequential)"]
    S1_RUN --> S1_OK{"Success?"}
    S1_OK -->|"no"| S1_FB["Fallback: categories: []"]
    S1_OK -->|"yes"| PARALLEL

    S1_FB --> PARALLEL

    PARALLEL["Stages 2–4: Promise.allSettled\n(Run concurrently)"]

    PARALLEL --> S2["Stage 2\nPattern Analyzer"]
    PARALLEL --> S3["Stage 3\nSavings Advisor"]
    PARALLEL --> S4["Stage 4\nBudget Planner"]

    S2 --> S5
    S3 --> S5
    S4 --> S5

    S5["Stage 5: Orchestrator Synthesis\n(Executive summary from all outputs)"]
    S5 --> SAVE["AIReport.create()\n{ type:'full', status:'success' }"]
    SAVE --> NOTI["createNotification()\nprediction_updated"]
    NOTI --> RESPOND["Return { pipeline, summary, meta }"]

    RESPOND --> FE_RENDER["Frontend renders:\n• Executive Summary\n• Category Breakdown\n• Spending Patterns\n• Savings Suggestions\n• Budget Plan"]

    CACHED --> FE_RENDER

    style LOADER fill:#1e1b4b,stroke:#6366f1,color:#e2e8f0
    style PARALLEL fill:#1a0a2e,stroke:#7c3aed,color:#e2e8f0
    style FE_RENDER fill:#0a2010,stroke:#059669,color:#e2e8f0
```

### AI Prediction Flow

```mermaid
flowchart LR
    REQ["GET /api/v1/ai/predictions\n?months=6&forceRefresh=false"]

    REQ --> LRU{"LRU Cache\nhit?\n(15min TTL\nmax 100 entries)"}
    LRU -->|"hit"| RET_CACHE["Return cached\n{ ...data, fromCache: true }"]
    LRU -->|"miss"| PARALLEL_AGG

    subgraph PARALLEL_AGG["4 Parallel MongoDB Aggregations"]
        AGG1["Totals Aggregation\ntotalSpent · count · avg"]
        AGG2["Category Breakdown\nper-category total · count"]
        AGG3["Weekly Grouping\nisoWeek past 4 weeks"]
        AGG4["Day-of-Week Pattern\navg spend per weekday"]
    end

    PARALLEL_AGG --> CONTEXT["Build prediction context\n{ avgWeekly · avgMonthly · categories\n  normalizedWeeks[4] · dailyPattern }"]

    CONTEXT --> PRED_AGENT["🔮 Prediction Agent\n(Groq · temp=0.2)"]
    PRED_AGENT --> CONFIDENCE["Dynamic confidence score\n+10 if txns≥10\n+10 if txns≥30\n+5 if months≥3\n+5 if months≥6\n→ clamp(50, 95)"]

    CONFIDENCE --> SET_CACHE["setCached(key, result)\n(evict oldest if size≥100)"]
    SET_CACHE --> RETURN["Return predictions\n{ nextWeek · nextMonth · forecastSeries\n  categoryPredictions · confidence }"]

    style PARALLEL_AGG fill:#0a1628,stroke:#1e4d8c,color:#e2e8f0
    style PRED_AGENT fill:#1a0a2e,stroke:#7c3aed,color:#e2e8f0
```

---

## 11. Notification System Flow

### End-to-End Notification Lifecycle

```mermaid
sequenceDiagram
    participant SVC as ⚙️ Backend Service
    participant NS as 📬 NotificationService
    participant DB as 🗄️ MongoDB
    participant FE as 🖥️ Frontend
    participant CTX as 🔔 NotificationContext
    participant UI as 👤 User

    Note over SVC,DB: CREATION (event-driven, async)
    SVC->>NS: createNotification(userId, { type, title, message, severity })
    NS->>DB: findOne({ user, type, title, createdAt≥60s ago })
    DB-->>NS: existing? (deduplication check)
    alt Duplicate within 60s
        NS-->>SVC: return existing (no-op)
    else New notification
        NS->>DB: Notification.create({ ... })
        DB-->>NS: saved notification
        NS-->>SVC: notification object
    end

    Note over FE,UI: POLLING (every 30s, tab-visible only)
    loop Every 30 seconds (document.hidden check)
        CTX->>FE: GET /api/v1/notifications + /unread-count
        FE-->>CTX: { notifications[], count }
        CTX->>CTX: Compare newCount > prevUnreadRef
        alt New notifications arrived
            CTX->>CTX: addToast({ id, title, message, severity })
            CTX->>CTX: setTimeout(dismiss, 5000)\n(tracked in toastTimersRef)
            CTX-->>UI: 🍞 Toast popup appears
        end
        CTX->>CTX: Update bell badge count
    end

    Note over FE,UI: READ ACTION
    UI->>FE: Click notification
    FE->>NS: PATCH /notifications/:id/read
    NS->>DB: findOneAndUpdate({ read: true })
    DB-->>NS: updated
    NS-->>FE: success
    FE->>CTX: Optimistic update\n(setUnreadCount - 1)
    CTX-->>UI: Badge decrements instantly
```

---

## 12. Deployment Architecture

### Production Deployment Topology

```mermaid
graph TB
    subgraph INTERNET["🌐 Internet"]
        USER_B["👤 User Browser"]
    end

    subgraph CDN["☁️ Vercel / Netlify (Frontend CDN)"]
        STATIC["React Static Build\ndist/ — HTML · JS · CSS"]
        EDGE["Edge Network\nGlobal CDN Nodes"]
    end

    subgraph BACKEND_HOST["🚀 Render / Railway (Backend)"]
        NODE["Node.js Process\nExpress.js Server :5000"]
        ENV_VARS["Environment Variables\nMONGO_URI · JWT_SECRET\nGROQ_API_KEY · CLIENT_URL"]
    end

    subgraph MONGO_ATLAS["🗄️ MongoDB Atlas"]
        PRIMARY["Primary Node\n(Reads + Writes)"]
        REPLICA["Replica Set\n(Reads + Failover)"]
    end

    subgraph GROQ_CLOUD["🤖 Groq Cloud API"]
        LLAMA["Llama 3.3 70B Versatile\nInference Endpoint"]
    end

    USER_B -->|"HTTPS"| EDGE
    EDGE --> STATIC
    STATIC -->|"API calls\nHTTPS · 120s timeout"| NODE
    NODE -->|"Mongoose · TLS"| PRIMARY
    PRIMARY --> REPLICA
    NODE -->|"HTTPS · SDK"| LLAMA
    NODE --> ENV_VARS

    style CDN fill:#0a2010,stroke:#059669,color:#e2e8f0
    style BACKEND_HOST fill:#0f172a,stroke:#334155,color:#e2e8f0
    style MONGO_ATLAS fill:#0a1628,stroke:#1e4d8c,color:#e2e8f0
    style GROQ_CLOUD fill:#1a0a2e,stroke:#7c3aed,color:#e2e8f0
```

### Environment Variables Reference

| Variable | Service | Required | Description |
|---|---|---|---|
| `MONGO_URI` | Backend | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | Backend | ✅ | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | Backend | ⚪ | Token expiry (default: `7d`) |
| `GROQ_API_KEY` | Backend | ✅ | Groq cloud API key |
| `GROQ_MODEL` | Backend | ⚪ | LLM model (default: `llama-3.3-70b-versatile`) |
| `GROQ_TIMEOUT_MS` | Backend | ⚪ | Groq request timeout ms (default: `60000`) |
| `GROQ_MAX_RETRIES` | Backend | ⚪ | Groq retry count (default: `3`) |
| `CLIENT_URL` | Backend | ✅ | Frontend URL for CORS whitelist |
| `PORT` | Backend | ⚪ | Server port (default: `5000`) |
| `NODE_ENV` | Backend | ⚪ | `development` or `production` |
| `VITE_API_BASE_URL` | Frontend | ✅ | Backend API base URL |

---

## Appendix — API Rate Limits

| Route Group | Limiter | Window | Max Requests |
|---|---|---|---|
| Global `/api` | `apiLimiter` | 15 min | 200 |
| `/auth` | `authLimiter` | 15 min | 20 |
| `/ai/*` routes | `aiLimiter` | 60 min | 200 |
| `/orchestrator` | `orchestratorLimiter` | 60 min | 50 |

> **Note:** All rate limiters are bypassed in `development` mode (`NODE_ENV !== 'production'`) via passthrough middleware.

---

*Generated for SpendSense AI — AgentVerse Grand Challenge 2026*
