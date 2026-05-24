# DevPulse

**Live URL:** https://devpulse-mauve-six.vercel.app/

REST API for tracking bugs and feature requests with contributor and maintainer roles.

## Features

- User signup and login (JWT)
- CRUD operations for issues
- Role-based permissions (contributor, maintainer)
- PostgreSQL persistence

## Tech Stack

| Category | Technologies |
|----------|----------------|
| Runtime | Node.js, TypeScript |
| Framework | Express |
| Database | PostgreSQL |
| Auth | bcrypt, jsonwebtoken |

## Setup

1. Clone the repository and install dependencies.

```bash
git clone https://github.com/joynto7/devpulse.git
cd devpulse
npm install
```

2. Create a `.env` file with `DATABASE_URL`, `JWT_SECRET`, and `JWT_EXPIRES_IN`.

3. Run the application.

```bash
npm run dev      # development
npm run build && npm start   # production
```

For Vercel deployment, add the same environment variables in the project settings and redeploy.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Health check |
| POST | `/api/auth/signup` | No | Register a user |
| POST | `/api/auth/login` | No | Authenticate and receive a JWT |
| GET | `/api/issues` | No | List issues (`sort`, `type`, `status`) |
| GET | `/api/issues/:id` | No | Get one issue |
| POST | `/api/issues` | Bearer token | Create an issue |
| PATCH | `/api/issues/:id` | Bearer token | Update an issue |
| DELETE | `/api/issues/:id` | Bearer token (maintainer) | Delete an issue |

Protected routes use the header: `Authorization: Bearer <token>`.

## Database Schema

**users**

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| name | VARCHAR | Required |
| email | VARCHAR | Unique |
| password | VARCHAR | Hashed |
| role | VARCHAR | `contributor` or `maintainer` |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**issues**

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| title | VARCHAR(150) | Required |
| description | TEXT | Min 20 characters |
| type | VARCHAR | `bug` or `feature_request` |
| status | VARCHAR | `open`, `in_progress`, `resolved` |
| reporter_id | INTEGER | Foreign key to users |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
