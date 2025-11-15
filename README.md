# Auth Demo: Vulnerable vs Secure JWT

Two small apps to learn authentication and security:
- `vulnerable-auth`: intentionally insecure login/register backed by MySQL
- `secure-jwt`: hardened login with bcrypt and JWT, plus basic HTTP security

## Prerequisites
- Node.js 18+
- MySQL running locally

## Databases
Both apps auto-create their database and `users` table on startup. You can also import the schemas manually:
- Vulnerable: `vulnerable-auth/schema.sql`
- Secure: `secure-jwt/schema.sql`

## Install
```powershell
cd c:\Users\hp\Desktop\auth\vulnerable-auth
npm install

cd c:\Users\hp\Desktop\auth\secure-jwt
npm install
```

## Configure (Secure JWT)
Create `.env` in `secure-jwt` (copied from `.env.example`):
```ini
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=secure_auth
JWT_SECRET=dev-local-secret-change-later
CORS_ORIGIN=http://localhost:4002
```

## Run (Windows PowerShell)
- Vulnerable (default DB user `root` with empty password):
```powershell
cd c:\Users\hp\Desktop\auth\vulnerable-auth
$env:PORT=4001; $env:DB_HOST="localhost"; $env:DB_USER="root"; $env:DB_PASSWORD=""; $env:DB_NAME="vuln_auth"; npm start
```
- Secure JWT:
```powershell
cd c:\Users\hp\Desktop\auth\secure-jwt
$env:PORT=4002; npm start
```

## Frontend Pages
- Vulnerable:
  - `http://localhost:4001/index.html` → Login/Register
  - `http://localhost:4001/welcome.html` (shown after login)
- Secure JWT:
  - `http://localhost:4002/index.html` → Login/Register
  - `http://localhost:4002/welcome.html` (shown after login)

## API Endpoints
- Vulnerable
  - Register: `POST /register` at `vulnerable-auth/server.js:26`
  - Login: `POST /login` at `vulnerable-auth/server.js:38` (redirects to welcome on success)
  - Health: `GET /health` at `vulnerable-auth/server.js:55`
- Secure JWT
  - Register: `POST /register` at `secure-jwt/server.js:31`
  - Login: `POST /login` at `secure-jwt/server.js:51` (returns JWT)
  - Profile: `GET /profile` at `secure-jwt/server.js:92` (requires `Authorization: Bearer <token>`)
  - Health: `GET /health` at `secure-jwt/server.js:96`



## SQL Injection Demo (Vulnerable, local only)
This app is intentionally unsafe. Demonstrate login bypass to understand the risk:
- Open `http://localhost:4001/login.html`
- Enter:
  - Username: `' OR 1=1 #`
  - Password: anything
- The query at `vulnerable-auth/server.js:40` uses string concatenation and accepts the injection, then redirects to the welcome page.

## Notes
- The secure app uses parameterized queries, password hashing, JWT, `helmet`, `cors`, and rate limiting.
- The vulnerable app stores plaintext passwords and builds SQL with user-controlled strings. Do not deploy it.