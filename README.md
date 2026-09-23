# Multi-Tenant SaaS Backend & Boardly Kanban Frontend

This repository showcases a complete B2B multi-tenant architecture using the MERN stack (MongoDB, Express, React, Node.js), coupled with a dynamic "Trello-style" Kanban frontend called Boardly.

## 🚀 Architecture Highlights

1. **Multi-Tenant Data Isolation:** Uses a single-database, shared-schema approach with a discriminator column (`tenantId`). Strict data isolation is enforced at the database level via a Mongoose `tenantPlugin.js` that automatically intercepts queries to ensure users only see their tenant's data.
2. **Transactional Integrity:** Complex operations (like Sign-ups creating both a User and a Tenant) use MongoDB transactions to guarantee atomicity.
3. **Role-Based Access Control (RBAC):** Middleware checks `user.role` (Owner, Admin, Member) before allowing actions.
4. **Token Rotation & Security:** Employs short-lived JWT Access Tokens (15m) and long-lived Refresh Tokens (7d). Includes built-in token reuse detection (family revocation) to mitigate token theft.
5. **Rate Limiting:** Redis-backed sliding window rate limiter protects endpoints from abuse, with fallback functionality if Redis is unavailable.
6. **Vite React Frontend:** A heavily stylized, premium UI ported from vanilla CSS/JS to React components.

## 📁 Project Structure

```
.
├── client/                 # React/Vite Frontend
│   ├── src/components/     # Board, Column, Card, UI Components
│   ├── src/contexts/       # React AuthContext (JWT Token lifecycle)
│   └── src/api/            # Axios API Client with interceptors
├── server/                 # Node.js/Express Backend
│   ├── src/models/         # Mongoose Models (Tenant, User, Board, etc.)
│   ├── src/controllers/    # Route Controllers
│   ├── src/middleware/     # Auth, RBAC, Validation Middleware
│   ├── src/services/       # Business Logic & Transactions
│   └── tests/              # Jest Integration Test Suite
└── docker-compose.yml      # Orchestrates all services
```

## 🛠️ How to Run Locally (Docker)

The easiest way to run the entire stack (including the MongoDB Replica Set required for transactions) is via Docker Compose.

1. **Ensure Docker is running** on your machine.
2. Open a terminal in the root of the project.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
4. **Access the application:**
   - **Frontend:** http://localhost:5173
   - **Backend API:** http://localhost:5000/api/health

*Note: The `docker-compose.yml` mounts your local directories as volumes, so any changes you make to the React code in `client/src` or Node code in `server/src` will instantly hot-reload in the container!*

## 🧪 Testing the API

To run the backend integration tests locally (requires Node.js):
```bash
cd server
npm install
npm run test
```
*The test suite automatically spins up an in-memory MongoDB Replica Set using `mongodb-memory-server`, meaning you don't need a local DB running to run tests!*
