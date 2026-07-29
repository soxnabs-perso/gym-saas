# Ledger for Gyms

A small gym management platform built with the MERN stack. A gym owner or manager creates an account, adds their 
customers and generates invoices against them.

## What it does today

A gym owner or manager can sign up and log in, with an optional "remind me" setting that keeps them signed in on that device using a long lived refresh token instead of the default short one. Once logged in, they can add,
view, and remove customers, generate invoices against a customer with an amount, a due date and mark an invoice as paid. The overview dashboard shows total customers, revenue collected this month and outstanding invoice amounts with a small chart of recent invoice values.

## Planned next

An end user dashboard for the gym's own customers, so a member can log in separately, see their own membership status 
and view or pay their own invoices, is planned as the next phase.

## Stack

Backend: Node.js (native ES modules ), Express, MongoDB with Mongoose, JWT authentication with a rotating refresh token stored in an httpOnly cookie, bcrypt for password hashing, helmet and rate limiting for basic hardening.

Frontend: React with Vite, React Router, Axios with an interceptor that silently refreshes the access token and 
recharts for the dashboard chart.

## Running it locally

You'll need Node 20 or later and either a local MongoDB instance or Docker.

### With Docker

From the project root:

```
docker compose up --build
```

This starts MongoDB, the backend on port 3000, and the frontend on port
5173. Open http://localhost:5173.

### Without Docker

In one terminal:

```
cd backend
cp .env.example .env
npm install
npm run dev
```

Make sure `MONGO_URI` in `.env` points at a MongoDB instance you have running locally.

In a second terminal:

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` requests to the backend on port 3000 so no extra configuration is needed.

### Running the backend tests

```
cd backend
npm install
npm test
```

The test suite spins up an in-memory MongoDB instance, so no running database is required to run it. All 11 tests across the two suites pass.

## Project structure

```
gym-saas/
  backend/
    server.js
    src/
      app.js
      config/
      controllers/
      middleware/
      models/
      routes/
      utils/
      types/
    tests/
  frontend/
    src/
      api/
      context/
      components/
      pages/
      styles/
```