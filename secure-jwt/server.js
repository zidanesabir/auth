import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3002" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_USER = process.env.DB_USER ?? "root";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME ?? "secure_auth";

const admin = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD });
await admin.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
await admin.query(`CREATE TABLE IF NOT EXISTS ${DB_NAME}.users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE, password_hash VARCHAR(255))`);
await admin.end();

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const secret = process.env.JWT_SECRET || "change_me";

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Invalid" });
    return;
  }
  try {
    const [exists] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (Array.isArray(exists) && exists.length > 0) {
      res.status(409).json({ error: "Exists" });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, hash]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Invalid" });
    return;
  }
  try {
    const [rows] = await pool.query("SELECT id, password_hash FROM users WHERE username = ?", [username]);
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(401).json({ error: "Invalid" });
      return;
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Invalid" });
      return;
    }
    const token = jwt.sign({ sub: user.id, username }, secret, { expiresIn: "15m" });
    console.log(`[login] user=${username} token=${token}`);
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

function auth(req, res, next) {
  const h = req.headers["authorization"] || "";
  const parts = h.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(parts[1], secret);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

app.get("/profile", auth, async (req, res) => {
  res.json({ ok: true, user: req.user });
});

const PORT = process.env.PORT || 3002;
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ db: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ db: false });
  }
});
app.listen(PORT, () => {
  console.log(`secure-jwt listening on http://localhost:${PORT}`);
});