# LeadPulse — Lead Management Platform

LeadPulse is a full-stack, multi-tenant lead management platform engineered for small to mid-sized sales teams. It provides a public-facing lead capture endpoint, an authenticated internal workspace with role-based access control (RBAC), immutable audit activity logging, and staff user management.

## Table of Contents

1. [Live Links & Demo Credentials](#live-links--demo-credentials)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Data Models](#data-models)
5. [Authorization & Permission Model](#authorization--permission-model)
6. [Frontend State Management Rationale](#frontend-state-management-rationale)
7. [Full API Contract](#full-api-contract)
   - [Authentication Endpoints](#1-authentication-endpoints)
   - [Lead Endpoints](#2-lead-endpoints)
   - [Notes & Activity Trail Endpoints](#3-notes--activity-trail-endpoints)
   - [User Management Endpoints](#4-user-management-endpoints)
   - [System Endpoints](#5-system-endpoints)
8. [Local Setup Instructions](#local-setup-instructions)
9. [Automated Testing](#automated-testing)
10. [Security Notes](#security-notes)
11. [Deployment Configuration](#deployment-configuration)
12. [Attribution & Required Credit](#attribution--required-credit)

---

## Live Links & Demo Credentials

### Live Environment URLs
- **Frontend App (Vercel)**: [https://leadpulse-omega.vercel.app/](https://leadpulse-omega.vercel.app/)
- **Backend REST API (Render)**: [https://leadpulse-fe6v.onrender.com](https://leadpulse-fe6v.onrender.com)

> **Note on Backend Cold Starts**: The backend API is hosted on Render's free tier. If inactive, the service spins down and may take 30–60 seconds to wake up on the first request.

### Reviewer Seed Accounts
The database automatically populates two initial user accounts on startup for immediate testing:

| Role | Email | Password | Scope of Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `AdminPass123!` | Full CRUD, lead reassignment, deletion, user provisioning |
| **Member** | `member@example.com` | `MemberPass123!` | View pipeline, update status & add notes **only** on assigned leads |

---

## Tech Stack

- **Frontend**: React.js (Vite), React Router v6, Lucide Icons, Custom Vanilla CSS Design System (HubSpot/Bigin light B2B CRM styling)
- **Backend**: Node.js, Express.js REST API
- **Database**: MongoDB, Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens), bcryptjs password hashing
- **Validation & Security**: `express-validator`, `express-rate-limit`
- **Testing**: Jest, Supertest, `mongodb-memory-server`

---

## Architecture Overview

The repository is structured as a decoupled full-stack monorepo:

```
Assignment/
├── client/                      # React (Vite) Single Page Application
│   ├── src/
│   │   ├── components/          # Navbar, Footer, LeadModal, CreateLeadModal
│   │   ├── context/             # AuthContext (JWT & profile state)
│   │   ├── pages/               # PublicCapturePage, LoginPage, DashboardPage, UserManagementPage
│   │   ├── services/            # API client wrapper
│   │   └── styles/              # Global CSS tokens and light CRM themes
│   ├── index.html
│   ├── vite.config.js
│   └── vercel.json
├── server/                      # Node.js + Express REST API
│   ├── config/                  # DB environment setup
│   ├── controllers/             # Auth, Lead, User, Note, Activity controllers
│   ├── middleware/              # Auth JWT, RBAC ownership, Rate limiter, Express-validator
│   ├── models/                  # Mongoose Schemas (User, Lead, Note, ActivityLog)
│   ├── routes/                  # Express Router definitions
│   ├── seed/                    # Database startup seeder
│   ├── tests/                   # Jest + Supertest integration suite
│   └── server.js                # App entry point
└── README.md
```

---

## Data Models

### 1. User
- `_id`: ObjectId
- `name`: String (required, trimmed)
- `email`: String (required, unique, lowercase, trimmed)
- `passwordHash`: String (required)
- `role`: String (enum: `['admin', 'member']`, default: `'member'`)
- `createdAt`: Date (default: `Date.now`)

### 2. Lead
- `_id`: ObjectId
- `name`: String (required, trimmed)
- `email`: String (required, lowercase, trimmed)
- `company`: String (default: `""`)
- `source`: String (default: `"web_form"`)
- `status`: String (enum: `['new', 'contacted', 'qualified', 'won', 'lost']`, default: `'new'`)
- `assignedTo`: Ref User (default: `null`)
- `createdAt`, `updatedAt`: Timestamps

### 3. Note
- `_id`: ObjectId
- `leadId`: Ref Lead (required)
- `authorId`: Ref User (required)
- `text`: String (required, trimmed)
- `timestamp`: Date (default: `Date.now`)

### 4. ActivityLog
- `_id`: ObjectId
- `leadId`: Ref Lead (required)
- `action`: String (enum: `['lead_created', 'status_changed', 'assigned', 'note_added', 'lead_updated']`)
- `actorId`: Ref User (null for public capture)
- `details`: Object / Mixed (metadata like previous and new status)
- `timestamp`: Date (default: `Date.now`)
*(Immutable - generated strictly server-side on lead mutations)*

---

## Authorization & Permission Model

Access control is enforced on both the client (UI controls hidden/disabled) and server (middleware returning `403 Forbidden` on violations).

| Operation | Path | Admin | Assigned Member | Unassigned Member | Public |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Public Lead Submission** | `POST /api/leads/capture` | Yes | Yes | Yes | Yes (Rate Limited) |
| **User Login** | `POST /api/auth/login` | Yes | Yes | Yes | Yes |
| **View Pipeline** | `GET /api/leads` | Yes | Yes | Yes | 401 |
| **Create Lead** | `POST /api/leads` | Yes | Yes | Yes | 401 |
| **Update Status** | `PATCH /api/leads/:id` | Yes | Yes | **403** | 401 |
| **Reassign Lead** | `PATCH /api/leads/:id` (`assignedTo`) | Yes | **403** | **403** | 401 |
| **Delete Lead** | `DELETE /api/leads/:id` | Yes | **403** | **403** | 401 |
| **Add Note** | `POST /api/leads/:id/notes` | Yes | Yes | **403** | 401 |
| **User Management** | `/api/users/*` | Yes | **403** | **403** | 401 |

---

## Frontend State Management Rationale

React Context API (`AuthContext`) was selected for global state management instead of Redux. Since application-wide state is confined to user authentication and profile data, Context API provides a clean, lightweight mechanism without boilerplate overhead. Page-level state (filters, pagination, lead views, kanban stages, and modal toggles) is managed via component state and custom API service modules.

---

## Full API Contract

### 1. Authentication Endpoints

#### `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```
- **Success Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "66a1b2c3d4e5f67890123456",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```
- **Error Response (401 Unauthorized)**:
```json
{
  "message": "Invalid credentials."
}
```

#### `GET /api/auth/me`
- **Access**: Authenticated (`Authorization: Bearer <token>`)
- **Success Response (200 OK)**:
```json
{
  "user": {
    "_id": "66a1b2c3d4e5f67890123456",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2026-07-24T18:00:00.000Z"
  }
}
```
- **Error Response (401 Unauthorized)**:
```json
{
  "message": "Authentication required. Token missing or invalid format."
}
```

---

### 2. Lead Endpoints

#### `POST /api/leads/capture`
- **Access**: Public (Rate-Limited: Max 20 requests per 15 min per IP)
- **Request Body**:
```json
{
  "name": "Sarah Connor",
  "email": "sarah@cyberdyne.io",
  "company": "Cyberdyne Systems",
  "source": "web_form"
}
```
- **Success Response (201 Created)**:
```json
{
  "message": "Lead captured successfully",
  "lead": {
    "_id": "66a9f8e7d6c5b4a392817001",
    "name": "Sarah Connor",
    "email": "sarah@cyberdyne.io",
    "company": "Cyberdyne Systems",
    "source": "web_form",
    "status": "new",
    "assignedTo": null,
    "createdAt": "2026-07-24T18:00:00.000Z"
  }
}
```
- **Error Response (400 Bad Request)**:
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    }
  ]
}
```

#### `GET /api/leads`
- **Access**: Authenticated
- **Query Parameters**: `page` (default `1`), `limit` (default `10`), `status` (`new|contacted|qualified|won|lost`), `assignedTo` (`<userId>|unassigned`)
- **Success Response (200 OK)**:
```json
{
  "leads": [
    {
      "_id": "66a9f8e7d6c5b4a392817001",
      "name": "Sarah Connor",
      "email": "sarah@cyberdyne.io",
      "company": "Cyberdyne Systems",
      "source": "web_form",
      "status": "contacted",
      "assignedTo": {
        "_id": "66a1b2c3d4e5f67890123457",
        "name": "Sales Member",
        "email": "member@example.com",
        "role": "member"
      },
      "createdAt": "2026-07-24T18:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

#### `POST /api/leads`
- **Access**: Authenticated
- **Request Body**:
```json
{
  "name": "Bruce Wayne",
  "email": "bwayne@wayneenterprises.com",
  "company": "Wayne Enterprises",
  "status": "new"
}
```
- **Success Response (201 Created)**:
```json
{
  "message": "Lead created successfully",
  "lead": {
    "_id": "66a9f8e7d6c5b4a392817002",
    "name": "Bruce Wayne",
    "email": "bwayne@wayneenterprises.com",
    "company": "Wayne Enterprises",
    "status": "new",
    "assignedTo": null,
    "createdAt": "2026-07-24T18:05:00.000Z"
  }
}
```

#### `GET /api/leads/:id`
- **Access**: Authenticated
- **Success Response (200 OK)**: Returns single populated lead object.
- **Error Response (404 Not Found)**:
```json
{
  "message": "Lead not found."
}
```

#### `PATCH /api/leads/:id`
- **Access**: Authenticated (Ownership check applies: Members can only update status on assigned leads; reassignment via `assignedTo` is Admin-only)
- **Request Body**:
```json
{
  "status": "qualified"
}
```
- **Success Response (200 OK)**:
```json
{
  "message": "Lead updated successfully",
  "lead": {
    "_id": "66a9f8e7d6c5b4a392817001",
    "status": "qualified"
  }
}
```
- **Error Response (403 Forbidden)**:
```json
{
  "message": "Forbidden: You can only modify leads assigned to you."
}
```

#### `DELETE /api/leads/:id`
- **Access**: Admin Only
- **Success Response (200 OK)**:
```json
{
  "message": "Lead deleted successfully."
}
```
- **Error Response (403 Forbidden)**:
```json
{
  "message": "Forbidden: Admin access required."
}
```

---

### 3. Notes & Activity Trail Endpoints

#### `POST /api/leads/:id/notes`
- **Access**: Authenticated (Ownership check applies for members)
- **Request Body**:
```json
{
  "text": "Completed discovery call with VP of Engineering. Proposal sent."
}
```
- **Success Response (201 Created)**:
```json
{
  "message": "Note added successfully",
  "note": {
    "_id": "66a9f8e7d6c5b4a392817099",
    "leadId": "66a9f8e7d6c5b4a392817001",
    "authorId": {
      "_id": "66a1b2c3d4e5f67890123457",
      "name": "Sales Member",
      "email": "member@example.com",
      "role": "member"
    },
    "text": "Completed discovery call with VP of Engineering. Proposal sent.",
    "timestamp": "2026-07-24T18:10:00.000Z"
  }
}
```

#### `GET /api/leads/:id/activity`
- **Access**: Authenticated
- **Success Response (200 OK)**:
```json
{
  "activity": [
    {
      "_id": "66a9f8e7d6c5b4a392817088",
      "leadId": "66a9f8e7d6c5b4a392817001",
      "action": "status_changed",
      "actorId": {
        "_id": "66a1b2c3d4e5f67890123457",
        "name": "Sales Member"
      },
      "details": {
        "from": "contacted",
        "to": "qualified"
      },
      "timestamp": "2026-07-24T18:08:00.000Z"
    }
  ]
}
```

---

### 4. User Management Endpoints

#### `GET /api/users`
- **Access**: Admin Only
- **Success Response (200 OK)**: Returns array of user profiles excluding password hashes.
- **Error Response (403 Forbidden)**:
```json
{
  "message": "Forbidden: Admin access required."
}
```

#### `POST /api/users`
- **Access**: Admin Only
- **Request Body**:
```json
{
  "name": "Alex Mercer",
  "email": "alex@example.com",
  "password": "Password123!",
  "role": "member"
}
```
- **Success Response (201 Created)**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": "66a1b2c3d4e5f67890123488",
    "name": "Alex Mercer",
    "email": "alex@example.com",
    "role": "member",
    "createdAt": "2026-07-24T18:15:00.000Z"
  }
}
```
- **Error Response (400 Bad Request)**:
```json
{
  "message": "Invalid role specified. Must be admin or member."
}
```

---

### 5. System Endpoints

#### `GET /api/health`
- **Access**: Public
- **Success Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2026-07-24T18:20:00.000Z"
}
```

---

## Local Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/leadpulse.git
cd leadpulse
```

### Step 2: Backend Setup (`server/`)
```bash
cd server
npm install
```

Create a `.env` file inside the `server/` directory using `.env.example` as a template:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```
*(Note: If `MONGODB_URI` is left blank, the server will automatically fall back to an in-memory Mongo server for zero-config local testing).*

Start the backend server:
```bash
npm dev
# API server runs at http://localhost:5000
```

### Step 3: Frontend Setup (`client/`)
In a new terminal window:
```bash
cd client
npm install
```

Optionally create a `.env` file in the `client/` directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the Vite development server:
```bash
npm run dev
# Frontend runs at http://localhost:3000
```

---

## Automated Testing

The backend includes an automated integration test suite written with Jest, Supertest, and `mongodb-memory-server`.

### Test Coverage
- **RBAC Protections**: Member blocked from accessing admin user management (`403`).
- **Reassignment Restrictions**: Member attempting lead reassignment (`assignedTo`) blocked (`403`).
- **Public Lead Capture Validation**: Input sanitization & bad format rejection (`400`).
- **Full Lifecycle Flow**: Lead creation → assignment → member status update → note addition → activity audit log validation.
- **Ownership Enforcement**: Member blocked from updating status or adding notes to unassigned leads (`403`).

### Run Tests
```bash
cd server
npm test
```

---

## Security Notes

1. **JWT Storage**: JWTs are stored in `localStorage` for simplicity in this build. A production deployment would use `httpOnly` and `SameSite=Strict` cookies to mitigate Cross-Site Scripting (XSS) risks.
2. **Public Write Gate**: The public lead capture endpoint (`POST /api/leads/capture`) is strictly rate-limited and sanitized using `express-validator` to prevent spam and payload injection.
3. **No Self-Registration**: Public user registration (`POST /api/auth/register`) is disabled to prevent privilege escalation. Account creation is strictly restricted to authenticated administrators via `POST /api/users`.

---

## Deployment Configuration

- **Backend API**: Deployed on **Render** as a Node.js Web Service (Root Directory: `server/`).
- **Frontend App**: Deployed on **Vercel** as a Static Vite SPA (Root Directory: `client/`).
- Environment variables (`MONGODB_URI`, `JWT_SECRET`, `VITE_API_BASE_URL`) are managed via each platform's deployment environment settings and are never committed to source control.

---

## Attribution & Required Credit

> Built for **Digital Heroes Training Task** — [digitalheroesco.com](https://digitalheroesco.com)
