import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("samity.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    account_no TEXT NOT NULL,
    mobile_no TEXT,
    guarantor_name TEXT,
    guarantor_mobile_no TEXT,
    amount REAL NOT NULL,
    total_with_profit REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'চলমান',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS savings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    account_no TEXT NOT NULL,
    amount REAL NOT NULL,
    profit REAL DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', 'As@02920');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('logo_url', '');
`);

// Ensure status column exists (migration for older databases)
try {
  db.exec("ALTER TABLE loans ADD COLUMN status TEXT DEFAULT 'চলমান'");
  console.log("Added status column to loans table");
} catch (e) {
  // Column already exists, ignore error
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const { admin_password, logo_url } = req.body;
    if (admin_password !== undefined) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(admin_password);
    }
    if (logo_url !== undefined) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'logo_url'").run(logo_url);
    }
    res.json({ success: true });
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    const adminPassword = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get() as any;
    if (password === adminPassword.value) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "ভুল পাসওয়ার্ড" });
    }
  });

  // Loans
  app.get("/api/loans", (req, res) => {
    const { year, month, account_no } = req.query;
    let query = "SELECT * FROM loans WHERE 1=1";
    let params = [];

    if (year && year !== '') {
      query += " AND strftime('%Y', start_date) = ?";
      params.push(year);
    }
    if (month && month !== '') {
      query += " AND strftime('%m', start_date) = ?";
      params.push(month.toString().padStart(2, '0'));
    }
    if (account_no && account_no !== '') {
      query += " AND account_no = ?";
      params.push(account_no);
    }

    query += " ORDER BY start_date ASC";
    const loans = db.prepare(query).all(...params);
    res.json(loans);
  });

  app.patch("/api/loans/:id/status", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      console.log(`Updating loan ${id} status to ${status}`);
      const result = db.prepare("UPDATE loans SET status = ? WHERE id = ?").run(status, id);
      console.log(`Update result:`, result);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: "বিনিয়োগটি খুঁজে পাওয়া যায়নি" });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.put("/api/loans/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const { 
      customer_name, account_no, mobile_no, guarantor_name, 
      guarantor_mobile_no, amount, total_with_profit, start_date, end_date 
    } = req.body;
    
    db.prepare(`
      UPDATE loans SET 
        customer_name = ?, account_no = ?, mobile_no = ?, guarantor_name = ?, 
        guarantor_mobile_no = ?, amount = ?, total_with_profit = ?, start_date = ?, end_date = ?
      WHERE id = ?
    `).run(
      customer_name, account_no, mobile_no, guarantor_name, 
      guarantor_mobile_no, amount, total_with_profit, start_date, end_date, id
    );
    res.json({ success: true });
  });

  app.delete("/api/loans/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Deleting loan ${id}`);
      const result = db.prepare("DELETE FROM loans WHERE id = ?").run(id);
      console.log(`Delete result:`, result);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: "বিনিয়োগটি খুঁজে পাওয়া যায়নি" });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/loans", (req, res) => {
    const { 
      customer_name, account_no, mobile_no, guarantor_name, 
      guarantor_mobile_no, amount, total_with_profit, start_date, end_date 
    } = req.body;
    
    const info = db.prepare(`
      INSERT INTO loans (
        customer_name, account_no, mobile_no, guarantor_name, 
        guarantor_mobile_no, amount, total_with_profit, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customer_name, account_no, mobile_no, guarantor_name, 
      guarantor_mobile_no, amount, total_with_profit, start_date, end_date
    );
    
    res.json({ id: info.lastInsertRowid });
  });

  // Savings
  app.get("/api/savings", (req, res) => {
    const { type, year, month, account_no } = req.query;
    let query = "SELECT * FROM savings WHERE 1=1";
    let params = [];
    
    if (type && type !== '') {
      query += " AND type = ?";
      params.push(type);
    }
    if (year && year !== '') {
      query += " AND strftime('%Y', date) = ?";
      params.push(year);
    }
    if (month && month !== '') {
      query += " AND strftime('%m', date) = ?";
      params.push(month.toString().padStart(2, '0'));
    }
    if (account_no && account_no !== '') {
      query += " AND account_no = ?";
      params.push(account_no);
    }
    
    query += " ORDER BY date ASC";
    const savings = db.prepare(query).all(...params);
    res.json(savings);
  });

  app.put("/api/savings/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const { date, customer_name, account_no, amount, profit, description } = req.body;
    
    db.prepare(`
      UPDATE savings SET 
        date = ?, customer_name = ?, account_no = ?, amount = ?, profit = ?, description = ?
      WHERE id = ?
    `).run(date, customer_name, account_no, amount, profit, description, id);
    res.json({ success: true });
  });

  app.delete("/api/savings/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Deleting saving ${id}`);
      const result = db.prepare("DELETE FROM savings WHERE id = ?").run(id);
      console.log(`Delete result:`, result);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: "সঞ্চয়টি খুঁজে পাওয়া যায়নি" });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/savings", (req, res) => {
    const { type, date, customer_name, account_no, amount, profit, description } = req.body;
    
    const info = db.prepare(`
      INSERT INTO savings (type, date, customer_name, account_no, amount, profit, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(type, date, customer_name, account_no, amount, profit, description);
    
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
