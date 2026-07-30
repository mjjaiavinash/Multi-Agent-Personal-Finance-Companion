<div align="center">

# 💸 SpendSense AI

### *An Autonomous Multi-Agent AI System for Intelligent Personal Finance Operations*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Groq AI](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036?style=flat-square&logo=lightning&logoColor=white)](https://groq.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

**SpendSense AI** is an autonomous, self-learning, multi-agent AI-powered Personal Finance Command Center. Powered by **Groq AI (Llama 3.3 70B)**, it connects financial accounts, expense histories, budget allocations, savings goals, and risk factors to deliver real-time monitoring, anomaly detection, predictive risk analysis, income overspending alerts, budget simulations with 100% allocation PDF exports, and autonomous financial decision support.

---

## 📋 Table of Contents

- [Key Highlights & New Features](#key-highlights--new-features)
- [Project Overview](#project-overview)
- [Features](#features)
- [Multi-Agent AI Pipeline](#multi-agent-ai-pipeline)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [API Endpoints](#api-endpoints)
- [PDF Report Generation](#pdf-report-generation)
- [Deployment](#deployment)
- [Future Scope](#future-scope)
- [License](#license)

---

## 🌟 Key Highlights & New Features

- 🤖 **10 Specialized AI Agents**: Autonomous multi-agent pipeline orchestrated for categorization, pattern analysis, savings optimization, budget planning, health scoring, monthly auditing, prediction forecasting, goal acceleration, and context-aware chat.
- 🚨 **Income Overspending Alerts**: Real-time monitoring by the Savings Advisor Agent that triggers instant high-priority alerts when monthly expenditure exceeds calculated user income.
- 📑 **100% Allocation PDF Export**: Budget Planner constructs full envelope allocations and exports official, formatted PDF budget plans.
- 📊 **Interactive Analytics Suite**: Powered by Recharts featuring category pie charts, weekly/monthly spending bar charts, net savings line charts, and predictive expense forecast area charts.
- 📄 **Monthly PDF Financial Audits**: Automated end-of-month financial health audit with historical comparisons, category break-downs, and downloadable PDF reports.
- 🔔 **Smart Event-Driven Notifications**: In-app toast popups, unread badge counters, and real-time alerts for budget thresholds (80%/100%), large transactions, duplicates, and goal milestones.

---

## 🎯 Project Overview

**SpendSense AI** bridges the gap between static transaction tracking and active wealth management. Unlike traditional expense trackers that only report past transactions, SpendSense AI acts as an autonomous **AI Financial Advisor** — continuously evaluating spending velocity, identifying financial leaks, predicting future risk areas, and delivering human-in-the-loop recommendations.

### Core Pillars

| Pillar | Description |
|---|---|
| **Multi-Agent AI** | 10 specialized Groq Llama 3.3 70B agents working sequentially & asynchronously |
| **Predictive Analytics** | Machine learning and LLM hybrid weekly/monthly expense forecasting with confidence metrics |
| **Smart Budgeting** | 50/30/20 and custom budget rule generation with 100% envelope allocation & PDF exports |
| **Overspending Guard** | Real-time expense monitoring with immediate notifications on income deficit or budget excess |
| **Goal Acceleration** | AI-driven deposit suggestions and milestone tracking to reach savings goals faster |
| **Financial Wellness** | 4-pillar composite health score (0-100) with grade distribution and historical trends |

---

## ⚡ Features

### 1. Dashboard Command Center
- **Greeting & Overview**: Real-time snapshot of user total balance, monthly income, total spent, and net savings.
- **KPI Stat Cards**: Animated metric cards with monthly trend indicators.
- **Health Score Ring**: Radial progress gauge showing current health score and letter grade (A+ to F).
- **Interactive Analytics Grid (2x2)**:
  - **Category Pie Chart**: Interactive breakdown of expenses by category with hover tooltips.
  - **Spending Bar Chart**: Toggleable weekly and monthly spending dynamics.
  - **Savings Velocity Line Chart**: Income vs. Expense vs. Net Savings trends over time.
  - **Prediction Area Chart**: Historical spending seamlessly transitioning into AI-projected expense curves.

### 2. Multi-Agent AI Analysis (`/categorizer`, `/savings-advisor`, `/ai-analysis`)
- **Expense Categorizer Agent**: Auto-classifies raw transaction text/receipts into standardized categories with confidence scores and reasoning tags.
- **Pattern Analyzer Agent**: Scans transaction logs to pinpoint hidden recurring subscriptions, spending spikes, and velocity anomalies.
- **Savings Advisor Agent**: Computes actionable cost-cutting strategies, flags high-leak categories, and issues **Income Overspending Alerts**.

### 3. Smart Budget Planner & PDF Export (`/budget`)
- **AI 50/30/20 Allocation**: Automatically splits monthly income into Needs (50%), Wants (30%), and Savings (20%).
- **100% Envelope Allocation**: Guarantees every dollar/rupee of income is accounted for without unallocated gaps.
- **Category Budget Caps**: Real-time tracking of spend-to-cap percentages with warning states at 80% and 100%.
- **PDF Export**: Generates professional, branded PDF documents of the complete budget plan with category breakdown tables.

### 4. AI Spending Predictions (`/ai-prediction`)
- **Forecast Engine**: Projects upcoming weekly and monthly expenses using recent spending rate and seasonal trends.
- **Confidence Metrics**: Provides probability score for forecast accuracy.
- **Risk Identification**: Predicts top 3 categories prone to overspending in the upcoming period.

### 5. Financial Health Score (`/health-score`)
- **Composite Score (0-100)**: Evaluated across 4 key pillars:
  1. *Savings Rate Pillar*
  2. *Budget Adherence Pillar*
  3. *Spending Consistency Pillar*
  4. *Expense Diversity Pillar*
- **Grade Rating**: Assigns A+, A, B, C, D, or F with detailed breakdown notes and historical score charts.

### 6. Savings Goals & AI Acceleration (`/savings-goals`)
- **Goal Creation**: Set target amounts, deadlines, and categories (e.g., Emergency Fund, Vacation, Car).
- **Progress Tracking**: Circular progress metrics, current savings, and deposit history.
- **AI Acceleration Suggestions**: Groq-powered advice on micro-saving tweaks to achieve targets early.

### 7. Monthly Financial Report & Audit (`/monthly-report`)
- **Automated Monthly Audits**: Deep-dive monthly review analyzing total inflow/outflow, savings rate, and category shifts.
- **Month-over-Month Comparison**: Calculates percentage change compared to the previous month.
- **PDF Download**: One-click export to download official monthly financial audits.

### 8. AI Finance Chat (`/ai-chat`)
- **Conversational Assistant**: Multi-turn chat interface powered by Groq Llama 3.3 70B.
- **Full Context Integration**: Ingests user-specific financial context (recent expenses, budget limits, savings goals) to answer questions directly.

### 9. Smart Notification System
- **Real-Time Event Triggers**:
  - Budget cap reached 80% or 100%
  - Income overspending alert
  - High-value expense added (>= ₹5,000 / $100)
  - Duplicate transaction detected
  - Savings goal milestone reached
- **UI Elements**: Animated bell counter badge, slide-in toast notifications, and interactive notification drawer.

---

## 🧠 Multi-Agent AI Pipeline

SpendSense AI utilizes a **10-Agent Pipeline** built on the Groq AI SDK (`llama-3.3-70b-versatile`):

```
                                  ┌────────────────────────┐
                                  │   Orchestrator Agent   │
                                  └───────────┬────────────┘
                                              │
         ┌───────────────────┬────────────────┼───────────────────┬──────────────────┐
         ▼                   ▼                ▼                   ▼                  ▼
┌─────────────────┐ ┌────────────────┐ ┌─────────────┐ ┌────────────────────┐ ┌─────────────┐
│Categorizer Agent│ │Pattern Analyzer│ │Savings Agent│ │Budget Planner Agent│ │Health Agent │
└─────────────────┘ └────────────────┘ └─────────────┘ └────────────────────┘ └─────────────┘
         │                   │                │                   │                  │
         ▼                   ▼                ▼                   ▼                  ▼
┌─────────────────┐ ┌────────────────┐ ┌─────────────┐ ┌────────────────────┐ ┌─────────────┐
│  Prediction Agt │ │Monthly Aud. Agt│ │Chat Assistant│ │Goal Accelerator Agt│ │Finance Agent│
└─────────────────┘ └────────────────┘ └─────────────┘ └────────────────────┘ └─────────────┘
```

| Agent Name | Primary Model | Function & Outputs |
|---|---|---|
| **Orchestrator Agent** | Llama 3.3 70B | Coordinates multi-agent workflows, synthesizes cross-agent findings, and outputs executive summaries. |
| **Categorizer Agent** | Llama 3.3 70B | Maps transactions to standard categories (Food, Housing, Utilities, Transportation, Entertainment, etc.) with reasoning. |
| **Pattern Analyzer Agent** | Llama 3.3 70B | Detects velocity changes, weekend spending spikes, recurring subscriptions, and abnormal expense surges. |
| **Savings Advisor Agent** | Llama 3.3 70B | Analyzes discretionary spend, generates customized savings plans, and issues **Income Overspending Alerts**. |
| **Budget Planner Agent** | Llama 3.3 70B | Formulates 50/30/20 envelope plans, sets category budget caps, and formats data for PDF export. |
| **Health Score Agent** | Llama 3.3 70B | Evaluates 4 pillars of financial health and assigns a score (0-100) and grade (A+ to F). |
| **Monthly Report Agent** | Llama 3.3 70B | Generates end-of-month executive financial audit reports with period-over-period delta analysis. |
| **Prediction Agent** | Llama 3.3 70B | Computes forward-looking weekly & monthly expense forecasts with confidence levels. |
| **Savings Goal Agent** | Llama 3.3 70B | Formulates personalized strategies and micro-saving advice to accelerate goal achievement. |
| **Chat Agent** | Llama 3.3 70B | Context-aware, conversational AI advisor for user queries regarding their real-time financial status. |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (React 18 + Vite)                      │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Dashboard   │  │ Budget Plan  │  │ Predictions  │  │ AI Chat /    │ │
│  │ (Recharts)   │  │ (& PDF Gen)  │  │ Forecasts    │  │ Categorizer  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                 │                 │         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Axios HTTP + Auth Context                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS REST API
┌────────────────────────────────────▼────────────────────────────────────┐
│                       EXPRESS.JS BACKEND (Node.js)                       │
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  ┌───────────┐  │
│  │ Auth Routes  │   │Expense Routes│   │ AI Routes    │  │Budget/Goal│  │
│  │ JWT + bcrypt │   │ CRUD & Filter│   │ Agents & Chat│  │Routes     │  │
│  └──────────────┘   └──────────────┘   └──────────────┘  └───────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     GROQ AI MULTI-AGENT PIPELINE                  │  │
│  │     Orchestrator ➔ Categorizer ➔ Pattern ➔ Savings ➔ Budget       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Mongoose ODM
┌────────────────────────────────────▼────────────────────────────────────┐
│                           MONGODB ATLAS                                 │
│  Users · Expenses · AIReports · MonthlyReports · HealthScores           │
│  SavingsGoals · Notifications                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
SpendSense AI/
├── backend/
│   ├── src/
│   │   ├── agents/                   # Groq AI Multi-Agent Implementations
│   │   │   ├── prompts/              # System Prompts & Structured Schemas
│   │   │   │   ├── budgetPrompt.js
│   │   │   │   ├── categorizerPrompt.js
│   │   │   │   ├── healthScorePrompt.js
│   │   │   │   ├── monthlyReportPrompt.js
│   │   │   │   ├── patternPrompt.js
│   │   │   │   ├── predictionPrompt.js
│   │   │   │   └── savingsPrompt.js
│   │   │   ├── budgetPlannerAgent.js # 50/30/20 Envelope & PDF Data Generator
│   │   │   ├── categorizerAgent.js   # Expense Auto-Categorizer
│   │   │   ├── chatAgent.js          # Context-Aware Financial Chat
│   │   │   ├── financeAgent.js       # Core Agent Helper
│   │   │   ├── healthScoreAgent.js   # 4-Pillar Wellness Calculator
│   │   │   ├── monthlyReportAgent.js # Monthly Audit Generator
│   │   │   ├── orchestratorAgent.js  # Pipeline Coordinator
│   │   │   ├── patternAnalyzerAgent.js
│   │   │   ├── predictionAgent.js
│   │   │   ├── savingsAdvisorAgent.js# Savings Strategies & Overspending Alerts
│   │   │   └── savingsGoalAgent.js
│   │   ├── config/                   # Database (db.js) & Env Setup
│   │   ├── controllers/              # Request Handlers
│   │   ├── middleware/               # Auth (JWT), Rate Limiter, Error Handler
│   │   ├── models/                   # Mongoose Schemas (User, Expense, Goal, etc.)
│   │   ├── routes/                   # Express Routers
│   │   ├── services/                 # Business Logic & Service Integration Layer
│   │   └── server.js                 # Entry Point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                      # Axios API Clients
│   │   ├── components/               # React UI Components
│   │   │   ├── ai/                   # AI Analysis Pipeline Loaders & Sections
│   │   │   ├── common/               # StatCard, Toast, Bell, Loaders
│   │   │   └── dashboard/            # Recharts Analytics Grid & Widgets
│   │   ├── context/                  # AuthContext & NotificationContext
│   │   ├── layouts/                  # DashboardLayout
│   │   ├── pages/                    # React Router Page Views
│   │   │   ├── AddExpense.jsx
│   │   │   ├── AIAnalysis.jsx
│   │   │   ├── AIFinanceChat.jsx
│   │   │   ├── AIPrediction.jsx
│   │   │   ├── BudgetPlanner.jsx     # Budget Caps & PDF Export
│   │   │   ├── CategorizerPage.jsx   # Interactive Expense Categorizer
│   │   │   ├── Dashboard.jsx         # Financial Command Center
│   │   │   ├── ExpenseHistory.jsx
│   │   │   ├── HealthScore.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx / Register.jsx
│   │   │   ├── MonthlyReport.jsx     # Monthly Audit & PDF Download
│   │   │   ├── Profile.jsx
│   │   │   ├── SavingsAdvisorPage.jsx# Advisor Insights & Overspending Alerts
│   │   │   └── SavingsGoals.jsx
│   │   ├── utils/                    # Formatters & Constants
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css                 # Glassmorphic & Dark Theme Styles
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── package.json                      # Root Concurrently Scripts
└── README.md
```

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** instance (Local or MongoDB Atlas)
- **Groq API Key** (Free access at [console.groq.com](https://console.groq.com))

### Step 1: Clone the Repository

```bash
git clone https://github.com/mjjaiavinash/Multi-Agent-Personal-Finance-Companion.git
cd Multi-Agent-Personal-Finance-Companion
```

### Step 2: Install Dependencies

Install root dependencies and workspace dependencies concurrently:

```bash
npm install
```

Alternatively, install individually:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Step 3: Configure Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Step 4: Run Development Server

Start both the Express backend server (port 5000) and Vite frontend dev server (port 5173) simultaneously from the project root:

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/spendsense?retryWrites=true&w=majority

# Security / Auth
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Groq AI Platform Key
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# CORS Config
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 💻 Tech Stack

### Backend Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (v5.x)
- **Database & ODM**: MongoDB Atlas + Mongoose (v8.x)
- **AI Engine**: Groq SDK (`llama-3.3-70b-versatile`)
- **Authentication**: JSON Web Tokens (JWT) + bcryptjs
- **Security & Optimization**: Helmet, Morgan, Express Mongo Sanitize, Rate Limiter, Compression

### Frontend Stack
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS 3 (Glassmorphism & Sleek Dark UI Palette)
- **Data Visualization**: Recharts (Pie, Bar, Line, Area charts)
- **PDF Generation**: jsPDF
- **Routing**: React Router v6
- **Icons**: Lucide React

---

## 📡 API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/register` | Register a new user | No |
| `POST` | `/login` | Authenticate user & return JWT | No |
| `GET` | `/me` | Get current user profile | Yes |
| `PUT` | `/me` | Update profile information | Yes |

### Expense Management (`/api/v1/expenses`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/` | Create a new expense | Yes |
| `GET` | `/` | Fetch user expenses (with filters & search) | Yes |
| `GET` | `/summary` | Get aggregated expense stats | Yes |
| `PUT` | `/:id` | Update an existing expense | Yes |
| `DELETE` | `/:id` | Delete an expense | Yes |

### AI Multi-Agent Services (`/api/v1`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/categorizer/categorize` | Auto-categorize expense transaction | Yes |
| `POST` | `/analysis/patterns` | Execute pattern analysis agent | Yes |
| `GET` | `/savings/advice` | Get savings advice & overspending alerts | Yes |
| `GET` | `/budget/plan` | Generate 50/30/20 budget allocation | Yes |
| `POST` | `/orchestrator/analyze` | Trigger full 10-agent pipeline run | Yes |
| `GET` | `/health-score/latest` | Fetch latest financial health score | Yes |
| `POST` | `/health-score/generate` | Recalculate health score | Yes |
| `GET` | `/ai/predictions` | Fetch weekly/monthly expense predictions | Yes |
| `POST` | `/ai/chat` | Send prompt to AI Finance Chat Agent | Yes |

### Monthly Reports (`/api/v1/monthly-report`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/:month` | Retrieve audit report for YYYY-MM | Yes |
| `POST` | `/:month/generate` | Generate/regenerate monthly audit | Yes |
| `GET` | `/history` | Fetch history of available reports | Yes |

### Savings Goals (`/api/v1/savings-goals`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/` | Create a savings goal | Yes |
| `GET` | `/` | Fetch all savings goals | Yes |
| `POST` | `/:id/deposit` | Add funds to a goal | Yes |
| `GET` | `/:id/suggestions` | Fetch AI acceleration tips | Yes |

---

## 📄 PDF Report Generation

SpendSense AI includes built-in, client-side PDF document compilation using `jsPDF`:

1. **Budget Plan PDF**: Export clean, 100% allocated budget breakdowns, category cap limits, and savings targets directly from the Budget Planner view (`/budget`).
2. **Monthly Audit PDF**: Download full end-of-month executive summaries, health score cards, expense breakdowns, and strategic action plans from the Monthly Report view (`/monthly-report`).

---

## 🚀 Deployment

### Backend (Render / Railway / Fly.io)
1. Link your repository and set the root directory to `backend/`.
2. Configure environment variables (`MONGODB_URI`, `GROQ_API_KEY`, `JWT_SECRET`, `CLIENT_URL`).
3. Build Command: `npm install`
4. Start Command: `npm start`

### Frontend (Vercel / Netlify)
1. Connect your repository and set the root directory to `frontend/`.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Environment Variable: `VITE_API_BASE_URL=https://<your-backend-url>/api/v1`

---

## 🔮 Future Scope

- 🏦 **Open Banking / Plaid Integration**: Direct bank feed sync for automated transaction importing.
- 📱 **React Native Mobile App**: iOS & Android cross-platform companion app.
- 🌐 **Multi-Currency & FX Engine**: Automatic currency conversion and localized budget models.
- 👥 **Shared / Family Budgets**: Multi-user shared vaults and joint goal tracking.
- 🔐 **WebAuthn / 2FA**: Hardware security key & biometric authentication.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Made with ❤️ by the **SpendSense AI Team**

⭐ **Star this repository** if you found SpendSense AI helpful!

[![GitHub stars](https://img.shields.io/github/stars/mjjaiavinash/Multi-Agent-Personal-Finance-Companion?style=social)](https://github.com/mjjaiavinash/Multi-Agent-Personal-Finance-Companion)

</div>
