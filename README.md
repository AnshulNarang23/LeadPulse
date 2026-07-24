# LeadPulse - Full-Stack Lead Management Platform

A production-grade Lead Management Platform built for small sales teams. Features a public lead capture form, authenticated internal dashboard with Role-Based Access Control (RBAC), activity audit trails, notes timeline, and admin user management.

> **Footer Credit**: *"Built for Digital Heroes Training Task"* (linked to [digitalheroesco.com](https://digitalheroesco.com))

---

## 🚀 Demo Credentials (Pre-seeded on Startup)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `AdminPass123!` | Full CRUD, lead reassignment, delete leads, user management |
| **Member** | `member@example.com` | `MemberPass123!` | View leads, status update & add notes **only** on assigned leads |

---

## 🛠️ Stack & Architecture

- **Frontend**: React.js (Vite) + Vanilla CSS (Glassmorphism design system) + React Router v6
- **Backend**: Node.js + Express.js REST API
- **Database**: MongoDB + Mongoose ODM (Auto-seeding initial users/leads)
- **Auth**: JWT (JSON Web Tokens) + bcryptjs password hashing
- **Testing**: Jest + Supertest + `mongodb-memory-server` (Zero external DB dependency required for tests)
- **Validation & Rate Limiting**: `express-validator` + `express-rate-limit`

---

## ⚙️ Setup & Local Running Instructions

### 1. Clone & Setup Backend
```bash
cd server
npm install

# (Optional) Environment Variables (.env)
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/lead_management
# JWT_SECRET=antigravity-secret-key-12345

npm run dev
# Server will automatically connect and seed admin & member accounts + sample leads!
```

### 2. Setup Frontend
```bash
cd client
npm install
npm run dev
# Vite server starts at http://localhost:3000
```

### 3. Running Automated Tests
```bash
cd server
npm test
```
The Jest test suite automatically launches an isolated in-memory MongoDB instance (`mongodb-memory-server`) to test:
- Admin route 403 protection
- Reassignment RBAC restrictions
- Full lifecycle flow (Lead creation → assignment → status update → activity audit trail)
- Public lead capture & input validation (400 response on malformed input)
- Member ownership enforcement on unassigned leads

---

## 🔒 Permission & RBAC Rules (Server & Client Enforced)

- **Admin**:
  - Full CRUD on all leads and users.
  - Can reassign any lead to any member (`assignedTo`).
  - Can delete leads.
  - Can create and list staff users (`POST /api/users`).
- **Member**:
  - View all leads.
  - Change status and add notes **ONLY** on leads assigned to them (`assignedTo === user._id`).
  - Cannot delete leads (Server returns `403 Forbidden`).
  - Cannot reassign leads or pass `assignedTo` field (Server returns `403 Forbidden`).
  - Cannot manage users (Server returns `403 Forbidden`).
- **Public**:
  - Access to `POST /api/leads/capture` (Rate-limited, validated). Self-registration is disabled.

---

## 🔐 Security Notes

- **JWT Token Storage**: In this build, the JWT token is stored in `localStorage` for simplicity and seamless client-side state restoration. 
- **Production Recommendation**: For a production deployment, JWTs should be stored in an `httpOnly` and `SameSite=Strict` cookie to mitigate potential Cross-Site Scripting (XSS) risks.

---

## 📡 Full API Contract & Examples

### 1. Authentication

#### `POST /api/auth/login`
- **Access**: Public
- **Request**:
```json
{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```
- **Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "66a1b2c3d4e5f67890123456",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```
- **Error Statuses**: `400 Bad Request`, `401 Unauthorized`.

#### `GET /api/auth/me`
- **Access**: Authenticated (`Bearer <token>`)
- **Response (200 OK)**:
```json
{
  "user": {
    "_id": "66a1b2c3d4e5f67890123456",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

---

### 2. User Management (Admin Only)

#### `GET /api/users`
- **Access**: Admin Only
- **Response (200 OK)**: Returns list of user objects excluding password hashes.
- **Error Statuses**: `401 Unauthorized`, `403 Forbidden`.

#### `POST /api/users`
- **Access**: Admin Only
- **Request**:
```json
{
  "name": "Alex Smith",
  "email": "alex@example.com",
  "password": "Password123!",
  "role": "member"
}
```
- **Response (201 Created)**: Returns created user profile. Role strictly validated against enum `['admin', 'member']`.

---

### 3. Public Lead Capture

#### `POST /api/leads/capture`
- **Access**: Public (Rate-Limited: Max 20 req / 15 min per IP)
- **Request**:
```json
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "company": "Acme Corp",
  "source": "web_form"
}
```
- **Response (201 Created)**:
```json
{
  "message": "Lead captured successfully",
  "lead": {
    "_id": "66a9f8e7d6c5b4a392817001",
    "name": "Jane Doe",
    "email": "jane@company.com",
    "company": "Acme Corp",
    "source": "web_form",
    "status": "new",
    "assignedTo": null,
    "createdAt": "2026-07-24T18:00:00.000Z"
  }
}
```
- **Error Statuses**: `400 Bad Request` (input validation failed), `429 Too Many Requests`.

---

### 4. Authenticated Lead Management

#### `GET /api/leads`
- **Access**: Authenticated
- **Query Params**: `page` (default 1), `limit` (default 10), `status`, `assignedTo`
- **Response (200 OK)**:
```json
{
  "leads": [...],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "pages": 2
  }
}
```

#### `POST /api/leads`
- **Access**: Authenticated
- **Request**:
```json
{
  "name": "Robert Vance",
  "email": "rvance@vancerefrigeration.com",
  "company": "Vance Refrigeration",
  "status": "new"
}
```
- **Response (201 Created)**: Returns populated lead object.

#### `PATCH /api/leads/:id`
- **Access**: Authenticated (Ownership check: Members can only update status on assigned leads; reassignment `assignedTo` is Admin only)
- **Request (Status update by assigned member)**:
```json
{
  "status": "contacted"
}
```
- **Response (200 OK)**: Updated lead object + automatic `ActivityLog` entry.
- **Error Statuses**: `403 Forbidden` if member modifies unassigned lead or attempts reassignment.

#### `DELETE /api/leads/:id`
- **Access**: Admin Only
- **Response (200 OK)**: `{ "message": "Lead deleted successfully." }`
- **Error Statuses**: `403 Forbidden` if called by a member.

---

### 5. Lead Notes & Activity Log

#### `POST /api/leads/:id/notes`
- **Access**: Authenticated (Ownership check applies for members)
- **Request**:
```json
{
  "text": "Completed discovery call. Demo scheduled for Friday."
}
```
- **Response (201 Created)**: Populated note object with author details + automatic `ActivityLog` entry.

#### `GET /api/leads/:id/activity`
- **Access**: Authenticated
- **Response (200 OK)**: Returns full timeline of audit entries (`lead_created`, `status_changed`, `assigned`, `note_added`).

---

## 🎨 Architectural & State Management Choices Rationale

1. **Monorepo Separation**: Clear boundary between `server/` (Express API) and `client/` (React Vite SPA) for decoupled development and independent deployment targets (Render + Vercel).
2. **React Context API (`AuthContext`)**: Chosen over Redux for state management because the primary global state is authentication and user profile. Component-level state handles UI filters, modals, and local data fetching smoothly without over-engineering.
3. **Vanilla CSS Design Tokens**: Offers maximum visual control, custom glassmorphism effects, status badge color coding, and responsive card layouts without third-party framework overhead.
4. **Immutable Audit Trail (`ActivityLog`)**: Mutations to lead status, assignments, and notes trigger server-side `ActivityLog` creation automatically. Direct client writes to ActivityLog are prohibited, ensuring an unalterable audit log.
