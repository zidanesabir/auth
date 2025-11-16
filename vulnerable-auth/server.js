import express from "express";
import mysql from "mysql2";
import mysqlPromise from "mysql2/promise";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_USER = process.env.DB_USER ?? "root";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
const DB_NAME = process.env.DB_NAME ?? "vuln_auth";

const admin = await mysqlPromise.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD });
await admin.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
await admin.query(`CREATE TABLE IF NOT EXISTS ${DB_NAME}.users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) UNIQUE, password VARCHAR(255))`);
await admin.end();

const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  const sql = `INSERT INTO users (username, password) VALUES ('${username}', '${password}')`;
  db.query(sql, err => {
    if (err) {
      res.status(500).send("Error");
      return;
    }
    res.send("Registered");
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
  db.query(sql, (err, results) => {
    if (err) {
      res.status(500).send("Error");
      return;
    }
    if (results && results.length > 0) {
      res.send("Logged in");
      return;
    }
    res.status(401).send("Invalid");
  });
});

const PORT = process.env.PORT || 3001;
app.get("/health", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) {
      res.status(500).json({ db: false });
      return;
    }
    res.json({ db: true });
  });
});
app.listen(PORT, () => {
  console.log(`vulnerable-auth listening on http://localhost:${PORT}`);
});