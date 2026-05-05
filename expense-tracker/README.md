# 💸 SpendWise — Full Stack Expense Tracker

A production-ready expense tracking application built with **React**, **Node.js/Express**, and **MongoDB**. Features real user authentication, CRUD operations, analytics charts, and a polished dark UI.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Chart.js, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (cloud) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| Deployment | Render (backend) + Vercel (frontend) |

---

## ✨ Features

- 🔐 **Real Authentication** — Register/Login with JWT, passwords hashed with bcrypt
- 💰 **Full CRUD** — Add, edit, delete income & expense transactions
- 📊 **Analytics** — Line chart (6-month trend), Doughnut chart (category breakdown), Bar chart
- 🔍 **Search & Filter** — Filter by type, category, and search by title
- 📄 **Pagination** — Server-side pagination for transactions
- 👤 **User Profile** — Update name, currency preference, monthly budget
- 🌙 **Dark UI** — Polished dark theme with smooth animations

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier works)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/expense-tracker
JWT_SECRET=any_long_random_string_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev   # starts on http://localhost:5000
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev   # starts on http://localhost:5173
```

---

## ☁️ Deployment Guide

### Step 1: MongoDB Atlas (Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Sign up free
2. Create a **free M0 cluster**
3. Under **Database Access** → Add a user with password
4. Under **Network Access** → Allow `0.0.0.0/0` (anywhere)
5. Click **Connect** → Drivers → Copy the connection string
6. Replace `<password>` with your user's password → Save this URI

---

### Step 2: Deploy Backend on Render

1. Go to [render.com](https://render.com) → Sign up (free)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `spendwise-api`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Under **Environment Variables**, add:
   ```
   MONGO_URI      = <your Atlas URI>
   JWT_SECRET     = <any long random string>
   JWT_EXPIRE     = 7d
   CLIENT_URL     = https://YOUR-VERCEL-APP.vercel.app
   PORT           = 5000
   ```
6. Click **Create Web Service** → Wait ~2 mins
7. Copy the deployed URL: `https://spendwise-api.onrender.com`

---

### Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up (free)
2. Click **New Project** → Import your GitHub repo
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
4. Under **Environment Variables**, add:
   ```
   VITE_API_URL = https://spendwise-api.onrender.com/api
   ```
5. Click **Deploy** → Wait ~1 min
6. Your app is live! 🎉

---

### Step 4: Update CORS (Important!)

Go back to Render → Your backend service → Environment Variables  
Update `CLIENT_URL` to your actual Vercel URL:
```
CLIENT_URL = https://your-app-name.vercel.app
```
Then click **Save Changes** (Render will redeploy automatically).

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── models/
│   │   ├── User.js          # User schema with bcrypt
│   │   └── Expense.js       # Expense schema with indexes
│   ├── routes/
│   │   ├── auth.js          # Register, Login, Profile
│   │   ├── expenses.js      # CRUD + Analytics aggregations
│   │   └── categories.js    # Category list
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   ├── server.js            # Express app entry
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx   # Global auth state
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Transactions.jsx
    │   │   ├── Analytics.jsx
    │   │   └── Profile.jsx
    │   ├── components/
    │   │   └── Layout.jsx        # Sidebar + nav
    │   ├── utils/
    │   │   └── api.js            # Axios with JWT interceptor
    │   ├── App.jsx               # Routes + auth guards
    │   └── index.css             # Design system
    ├── index.html
    └── package.json
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/me` | ✅ | Get current user |
| PUT | `/api/auth/profile` | ✅ | Update profile |
| GET | `/api/expenses` | ✅ | List expenses (filter + paginate) |
| GET | `/api/expenses/summary` | ✅ | Analytics summary |
| POST | `/api/expenses` | ✅ | Create expense |
| PUT | `/api/expenses/:id` | ✅ | Update expense |
| DELETE | `/api/expenses/:id` | ✅ | Delete expense |
| GET | `/api/categories` | ✅ | Get categories |

---

## 🎨 Screenshots

> Dashboard · Transactions · Analytics · Profile

---

## 📝 License

MIT — built for full-stack developer round 2 submission.
