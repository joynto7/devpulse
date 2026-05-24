 DevPulse is a lightweight issue-tracking API and web client for open-source projects, providing contributor/maintainer roles, issue creation and lifecycle management.
 
Features

    User signup and login (JWT auth)
    Create, list, view, update, and delete issues
    Role-based authorization (contributor, maintainer)
    PostgreSQL-backed persistence

Tech stack

    Node.js + TypeScript
    Express
    PostgreSQL (pg)
    tsup for bundling
    bcrypt, jsonwebtoken

Live URL

https://devpulse-mauve-six.vercel.app/

Setup

Prerequisites

    Node.js 18+ and npm/yarn
    PostgreSQL database

Quick start

    Clone the repo

    git clone cd devpulse

    Install dependencies

    npm install

    Create a .env file in the project root with the following variables:

PORT=5000
DATABASE_URL=.....
JWT_SECRET=.....
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10

    Build and run (development)

    npm run build node dist/server.js

The server bootstrap calls the database initializer (initializeDatabase) on startup to create required tables if they do not exist.
API Endpoints

Base path: /api

    Auth
        POST /api/auth/signup — register a new user
            Body: { "name": string, "email": string, "password": string, "role"?: "contributor" | "maintainer" }
        POST /api/auth/login — authenticate and receive JWT
            Body: { "email": string, "password": string }

    Issues
        POST /api/issues — create issue (authenticated)
            Body: { "title": string, "description": string, "type": "bug" | "feature_request" }
        GET /api/issues — list issues (query: sort=newest|oldest, type, status)
        GET /api/issues/:id — get single issue
        PATCH /api/issues/:id — update an issue (authenticated, role checks applied)
        DELETE /api/issues/:id — delete an issue (maintainer only)

curl -X POST https://your-api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password"}'

# Then use returned token:
curl -X POST https://your-api.example.com/api/issues \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Bug in UI","description":"Steps to reproduce...","type":"bug"}'

Database schema

    users table
        id SERIAL PRIMARY KEY
        name VARCHAR(255) NOT NULL
        email VARCHAR(255) UNIQUE NOT NULL
        password VARCHAR(255) NOT NULL
        role VARCHAR(50) DEFAULT 'contributor' CHECK role IN ('contributor','maintainer')
        created_at, updated_at TIMESTAMP

    issues table
        id SERIAL PRIMARY KEY
        title VARCHAR(150) NOT NULL
        description TEXT NOT NULL (min length 20 enforced in DB)
        type VARCHAR(50) NOT NULL CHECK type IN ('bug','feature_request')
        status VARCHAR(50) DEFAULT 'open' CHECK status IN ('open','in_progress','resolved')
        reporter_id INTEGER NOT NULL (FK to users.id)
        created_at, updated_at TIMESTAMP
