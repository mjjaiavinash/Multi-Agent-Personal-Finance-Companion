<div align="center">

# SpendSense AI

### _Intelligent Personal Finance Management powered by Groq AI_

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Groq AI](https://img.shields.io/badge/Groq-AI%20Engine-F55036?style=flat-square&logo=lightning&logoColor=white)](https://groq.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[Live Demo](#deployment) · [Docs](#api-endpoints) · [Report Bug](https://github.com/mjjaiavinash/Multi-Agent-Personal-Finance-Companion/issues) · [Request Feature](https://github.com/mjjaiavinash/Multi-Agent-Personal-Finance-Companion/issues)

</div>

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [AI Agents](#ai-agents)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [API Endpoints](#api-endpoints)
- [Screenshots](#screenshots)
- [Deployment](#deployment)
- [Future Scope](#future-scope)
- [Hackathon Details](#hackathon-details)
- [Contributors](#contributors)
- [License](#license)

---

## Project Overview

**SpendSense AI** is a full-stack, production-grade **AI-powered personal finance management application** that leverages a multi-agent orchestration pipeline built on **Groq AI (Llama 3.3 70B)** to deliver real-time expense analysis, smart budget planning, predictive forecasting, and personalized financial coaching — all within a dark-themed, glassmorphic dashboard.

> Unlike traditional expense trackers, SpendSense AI **thinks like a financial advisor** — analyzing your spending patterns, predicting your future expenses, generating health scores, and proactively alerting you through a smart notification system.

### Core Pillars

| Pillar | Description |
|---|---|
| **AI Intelligence** | Multi-agent pipeline with 7 specialized Groq-powered agents |
| **Visual Analytics** | Interactive Recharts suite: Pie, Bar, Line, Area charts |
| **Smart Alerts** | Real-time event-driven notification system with toast popups |
| **Goal Tracking** | Savings goals with AI acceleration suggestions |
| **Predictions** | ML-backed weekly & monthly spending forecasts |
| **Monthly Reports** | Comprehensive AI-generated PDF financial audits |

---

## Features

### Dashboard
- Personalized greeting with real-time financial snapshot
- 4 KPI stat cards (Balance, Total Expenses, This Month, Savings)
- Budget progress ring with color-coded threshold indicators
- Health Score card with letter grade and breakdown
- **Interactive Analytics Suite** — 4 Recharts visualizations in a 2×2 responsive grid
  - **Pie Chart** — Category spending breakdown with hover expansion
  - **Bar Chart** — Switchable Weekly / Monthly spending dynamics
  - **Line Chart** — Savings velocity trend (Income vs Spent vs Net Savings)
  - **Area Chart** — AI prediction forecast (Historical -> Projected)

### Expense Management
- Add expenses with auto-categorization via AI
- Full expense history with pagination, filters, search, and sort
- Duplicate detection & large expense alerts

### AI Financial Analysis
- Multi-agent orchestrator pipeline with **animated agent progress loader**
  - Expense Categorizer -> Pattern Analyzer -> Savings Advisor -> Budget Planner -> Finance Assistant
- Executive summary, category breakdowns, savings suggestions, and budget plan
- 3 / 6 / 12 month analysis range selection

### AI Finance Chat
- Real-time conversational financial advisor powered by Groq
- Context-aware responses based on your actual expense history
- Persistent chat history with multi-turn support

### AI Spending Predictions
- Weekly & monthly expense forecasts with confidence scores
- Highest spending category predictions
- Budget adherence & savings forecasts
- Interactive prediction graph

### Budget Planner
- AI-generated 50/30/20 budget recommendations
- Per-category budget cap management
- Real-time budget utilization tracking

### Financial Health Score
- Composite score (0-100) with letter grade (A+ to F)
- 4 pillar breakdown: Savings Rate, Budget Adherence, Spending Consistency, Expense Diversity
- Historical health score trend

### Savings Goal Tracker
- Create goals with target amount, deadline, and current savings
- Progress bar, circular progress ring, and celebration animations
- AI-generated acceleration suggestions (powered by Groq)
- Deposit functionality to track contributions

### Monthly Financial Report
- Full AI-generated monthly financial audit
- Health score, category breakdown, weekly analysis, net savings, budget performance
- Comparison to previous month
- Actionable recommendations and financial tips
- PDF download support
- Historical report access (last 24 months)

### Smart Notification System
- Automatic event-driven alerts for:
  - Budget 80% / exceeded
  - Large expense added (>= Rs. 5,000)
  - Duplicate expense detected
  - Savings goal achieved
  - Monthly report ready
  - AI predictions refreshed
- Bell icon with animated unread badge (Sidebar & Navbar)
- Slide-in toast popups with auto-dismiss (5s)
- Dashboard notification feed widget
- Mark individual / all as read

---

## AI Agents

SpendSense AI is powered by a **7-agent Groq AI orchestration pipeline**, each specializing in a distinct financial intelligence task:

| Agent | Model | Responsibility |
|---|---|---|
| **Categorizer Agent** | Llama 3.3 70B | Auto-classifies transactions into standardized spending categories |
| **Pattern Analyzer Agent** | Llama 3.3 70B | Identifies recurring trends, anomalies, and spending velocity |
| **Savings Advisor Agent** | Llama 3.3 70B | Formulates personalized cost-reduction and wealth-building strategies |
| **Budget Planner Agent** | Llama 3.3 70B | Constructs optimal 50/30/20 budget allocations and category caps |
| **Health Score Agent** | Llama 3.3 70B | Calculates composite financial wellness score across 4 pillars |
| **Monthly Report Agent** | Llama 3.3 70B | Generates comprehensive monthly financial audit with insights |
| **Prediction Agent** | Llama 3.3 70B | Forecasts next week / next month expenses with confidence scoring |
| **Chat Agent** | Llama 3.3 70B | Context-aware conversational financial advisor |
| **Savings Goal Agent** | Llama 3.3 70B | AI acceleration suggestions to reach savings goals faster |
| **Orchestrator Agent** | Llama 3.3 70B | Coordinates multi-agent pipeline and synthesizes executive summary |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │Dashboard │  │AI Analysis│  │Predictions│  │Savings Goals │  │
│  │ Recharts │  │Pipeline  │  │Area Chart │  │Progress Ring  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│        │               │             │                │         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Axios API Layer + Auth Context              │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS REST API
┌───────────────────────────────▼─────────────────────────────────┐
│                     EXPRESS.JS BACKEND (Node.js)                │
│                                                                 │
│  ┌──────────────┐   ┌─────────────┐   ┌──────────────────────┐ │
│  │ Auth Routes  │   │Expense Routes│   │   AI Agent Routes    │ │
│  │ JWT + bcrypt │   │CRUD + Filter│   │ /ai, /analysis, etc. │ │
│  └──────────────┘   └─────────────┘   └──────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  SERVICE LAYER                           │  │
│  │  expenseService · notificationService · reportService   │  │
│  │  savingsGoalService · predictionService                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              GROQ AI MULTI-AGENT PIPELINE                │  │
│  │  Categorizer -> Patterns -> Savings -> Budget -> Orchestrator│  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Mongoose ODM
┌───────────────────────────────▼─────────────────────────────────┐
│                        MONGODB ATLAS                            │
│  User · Expense · AIReport · MonthlyReport · HealthScore       │
│  SavingsGoal · Notification                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
SpendSense AI/
├── backend/
│   ├── src/
│   │   ├── agents/                   # Groq AI agent definitions
│   │   │   ├── orchestratorAgent.js  # Multi-agent pipeline coordinator
│   │   │   ├── categorizerAgent.js   # Expense auto-categorizer
│   │   │   ├── patternAnalyzerAgent.js
│   │   │   ├── savingsAdvisorAgent.js
│   │   │   ├── budgetPlannerAgent.js
│   │   │   ├── healthScoreAgent.js
│   │   │   ├── monthlyReportAgent.js
│   │   │   ├── predictionAgent.js
│   │   │   ├── chatAgent.js
│   │   │   └── savingsGoalAgent.js
│   │   ├── config/
│   │   │   ├── db.js                 # MongoDB connection
│   │   │   └── env.js                # Environment config
│   │   ├── controllers/              # Route handler logic
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT verification
│   │   │   ├── errorHandler.js
│   │   │   └── rateLimiter.js
│   │   ├── models/                   # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Expense.js
│   │   │   ├── AIReport.js
│   │   │   ├── MonthlyReport.js
│   │   │   ├── HealthScore.js
│   │   │   ├── SavingsGoal.js
│   │   │   └── Notification.js
│   │   ├── routes/                   # Express routers
│   │   ├── services/                 # Business logic layer
│   │   ├── utils/                    # ApiError, ApiResponse, asyncHandler
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                      # Axios API call modules
│   │   ├── components/
│   │   │   ├── ai/                   # AI section components + pipeline loader
│   │   │   ├── common/               # Shared UI (StatCard, Toast, Bell, Loader)
│   │   │   └── dashboard/            # Charts & widgets
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   ├── hooks/                    # useApi, custom hooks
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/                    # All route pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AIAnalysis.jsx
│   │   │   ├── AIPrediction.jsx
│   │   │   ├── MonthlyReport.jsx
│   │   │   ├── SavingsGoals.jsx
│   │   │   ├── BudgetPlanner.jsx
│   │   │   ├── HealthScore.jsx
│   │   │   ├── AIFinanceChat.jsx
│   │   │   └── ExpenseHistory.jsx
│   │   ├── utils/                    # Formatters, helpers, constants
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── package.json                      # Root scripts (concurrently)
└── README.md
```

---

## Installation

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **MongoDB Atlas** account (or local MongoDB)
- **Groq API Key** — [Get one free at console.groq.com](https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/mjjaiavinash/Multi-Agent-Personal-Finance-Companion.git
cd Multi-Agent-Personal-Finance-Companion
```

### 2. Install All Dependencies

```bash
# Install root + both workspaces
npm install

# Or install individually:
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment Variables

```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

> See [Environment Variables](#environment-variables) section for required keys.

### 4. Start Development Servers

```bash
# Run both backend and frontend concurrently from root
npm run dev
```

Or start individually:

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

### 5. Open in Browser

```
http://localhost:5173
```

---

## Environment Variables

### Backend — `backend/.env`

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/spendsense

# Auth
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Groq AI
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# CORS
CLIENT_URL=http://localhost:5173
```

### Frontend — `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | Runtime environment |
| **Express.js** | 5.x | REST API framework |
| **MongoDB** | Atlas | Primary database |
| **Mongoose** | 8.x | ODM for MongoDB |
| **Groq SDK** | Latest | AI model API client |
| **Llama 3.3 70B** | — | Large Language Model |
| **JWT** | — | Stateless authentication |
| **bcryptjs** | — | Password hashing |
| **Helmet** | — | HTTP security headers |
| **Morgan** | — | HTTP request logging |
| **express-mongo-sanitize** | — | NoSQL injection prevention |
| **express-rate-limit** | — | API rate limiting |
| **compression** | — | Gzip response compression |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18 | UI library |
| **Vite** | 5 | Build tool & dev server |
| **TailwindCSS** | 3 | Utility-first styling |
| **Recharts** | 2.x | Data visualization charts |
| **React Router** | 6 | Client-side routing |
| **Axios** | — | HTTP API client |
| **Lucide React** | — | Icon library |
| **jsPDF** | — | Client-side PDF generation |

---

## API Endpoints

### Authentication — `/api/v1/auth`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/register` | Register new user | No |
| `POST` | `/login` | Login & get JWT token | No |
| `GET` | `/me` | Get current user profile | Yes |
| `PUT` | `/me` | Update profile & settings | Yes |

### Expenses — `/api/v1/expenses`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/` | Add new expense | Yes |
| `GET` | `/` | List expenses (filter, sort, paginate) | Yes |
| `GET` | `/summary` | Get category, monthly & totals summary | Yes |
| `PUT` | `/:id` | Update expense | Yes |
| `DELETE` | `/:id` | Delete expense | Yes |

### AI Agents — `/api/v1`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/categorizer/categorize` | Auto-categorize an expense | Yes |
| `POST` | `/analysis/patterns` | Run pattern analysis | Yes |
| `GET` | `/savings/advice` | Get savings recommendations | Yes |
| `GET` | `/budget/plan` | Generate budget plan | Yes |
| `POST` | `/orchestrator/analyze` | Run full multi-agent pipeline | Yes |
| `GET` | `/health-score/latest` | Get latest health score | Yes |
| `POST` | `/health-score/generate` | Generate new health score | Yes |
| `GET` | `/ai/predictions` | Get AI spending predictions | Yes |
| `POST` | `/ai/chat` | AI finance chat message | Yes |

### Monthly Reports — `/api/v1/monthly-report`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/:month` | Get report for YYYY-MM | Yes |
| `POST` | `/:month/generate` | Generate / regenerate report | Yes |
| `GET` | `/history` | List available report months | Yes |

### Savings Goals — `/api/v1/savings-goals`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/` | Create savings goal | Yes |
| `GET` | `/` | List all goals | Yes |
| `PUT` | `/:id` | Update goal | Yes |
| `DELETE` | `/:id` | Delete goal | Yes |
| `POST` | `/:id/deposit` | Add deposit to goal | Yes |
| `GET` | `/:id/suggestions` | Get AI acceleration suggestions | Yes |

### Notifications — `/api/v1/notifications`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/` | List notifications (last 20) | Yes |
| `GET` | `/unread-count` | Get unread notification count | Yes |
| `PATCH` | `/:id/read` | Mark notification as read | Yes |
| `PATCH` | `/read-all` | Mark all notifications as read | Yes |

---

## Screenshots

> _Screenshots will be added after deployment._

| Screen | Preview |
|---|---|
| Dashboard with Analytics Grid | `[Screenshot Placeholder]` |
| AI Analysis Pipeline Loader | `[Screenshot Placeholder]` |
| Monthly Financial Report | `[Screenshot Placeholder]` |
| AI Spending Predictions | `[Screenshot Placeholder]` |
| Savings Goal Tracker | `[Screenshot Placeholder]` |
| Smart Notification Bell | `[Screenshot Placeholder]` |
| AI Finance Chat | `[Screenshot Placeholder]` |
| Health Score Dashboard | `[Screenshot Placeholder]` |

---

## Deployment

### Backend — Render / Railway / Fly.io

1. Push `backend/` to your hosting platform.
2. Set all environment variables from [Environment Variables](#environment-variables).
3. Build command: `npm install`
4. Start command: `npm start`

### Frontend — Vercel / Netlify

1. Connect your GitHub repository.
2. Set root directory to `frontend/`.
3. Build command: `npm run build`
4. Output directory: `dist/`
5. Set `VITE_API_BASE_URL` to your deployed backend URL.

### Docker (Optional)

```bash
# Build and run backend
docker build -t spendsense-backend ./backend
docker run -p 5000:5000 --env-file backend/.env spendsense-backend

# Build and run frontend
docker build -t spendsense-frontend ./frontend
docker run -p 3000:80 spendsense-frontend
```

---

## Future Scope

| Feature | Status | Priority |
|---|---|---|
| React Native Mobile App | Planned | High |
| Bank Account Integration (Plaid/Setu) | Planned | High |
| Multi-Currency Support | Planned | Medium |
| Family/Group Finance Tracking | Planned | Medium |
| Financial Goals Social Sharing | Planned | Medium |
| Advanced Tax Estimation Reports | Planned | Medium |
| UPI/Payment Gateway Integration | Planned | High |
| Voice Command Expense Entry | Planned | Low |
| Weekly Digest Email Reports | Planned | Low |
| Two-Factor Authentication | Planned | Medium |

---

## Hackathon Details

> Built for **[Hackathon Name]** — Track: **FinTech / AI Applications**

| Detail | Info |
|---|---|
| **Event** | [Hackathon Name] |
| **Date** | [Date Range] |
| **Track** | FinTech / AI / Full Stack |
| **Problem Statement** | Democratizing financial intelligence for everyone using AI |
| **Team Name** | [Team Name] |
| **Demo URL** | [Live Demo Link] |
| **Demo Video** | [Video Link] |

### Why SpendSense AI?

Most financial apps show you **what happened**. SpendSense AI tells you **what's happening, why it's happening, and what to do about it** — powered by a multi-agent AI pipeline that thinks like a personal CFO.

---

## Contributors

<div align="center">

| Name | Role |
|---|---|
| **[Your Name]** | Full Stack Developer & AI Engineer |
| **[Team Member 2]** | Frontend Developer |
| **[Team Member 3]** | Backend & Database |

</div>

---

## License

```
MIT License

Copyright (c) 2025 SpendSense AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

<div align="center">

Made by the SpendSense AI Team

**Star this repo** if you found it useful!

[![GitHub stars](https://img.shields.io/github/stars/mjjaiavinash/Multi-Agent-Personal-Finance-Companion?style=social)](https://github.com/mjjaiavinash/Multi-Agent-Personal-Finance-Companion)

</div>
