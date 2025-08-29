import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Open SQLite database
const dbPromise = open({
  filename: path.join(__dirname, 'database.sqlite'),
  driver: sqlite3.Database
});

// API: Spin wheel
app.post('/api/spin', async (req, res) => {
  const db = await dbPromise;
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) return res.status(400).json({ error: 'Missing data' });

  const today = new Date().toISOString().slice(0,10);
  const row = await db.get("SELECT * FROM spins WHERE email=? AND date=?", [email, today]);
  if (row) return res.json({ message: 'Already spun today', prize: null });

  const prizes = [
    { name: "NOTHING", weight: 70 },
    { name: "10% OFF", weight: 20 },
    { name: "5 DINARS OFF", weight: 5 },
    { name: "20% OFF", weight: 5 },
    { name: "FREE TUNA PIZZA", weight: 0 }
  ];

  const totalWeight = prizes.reduce((a,b) => a+b.weight, 0);
  let rand = Math.random() * totalWeight;
  let prize;
  for (let p of prizes) {
    if (rand < p.weight) { prize = p.name; break; }
    rand -= p.weight;
  }
  if (!prize) prize = "NOTHING";

  await db.run("INSERT INTO spins (name,email,phone,prize,date) VALUES (?,?,?,?,?)", 
               [name,email,phone,prize,today]);

  res.json({ prize });
});

// Initialize DB
(async () => {
  const db = await dbPromise;
  await db.run(`CREATE TABLE IF NOT EXISTS spins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    prize TEXT,
    date TEXT
  )`);
})();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
