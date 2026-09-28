/**
 * ==========================================================
 *  REST API SERVER - DEVICE A  (Node.js + Express + SQLite)
 * ==========================================================
 * - Device A : menjalankan file ini. Berisi REST API + Database SQLite
 *              + menyajikan halaman web (public/index.html) sebagai client.
 * - Device B : buka browser, akses http://<IP-Device-A>:3000
 *
 * Cara pakai:
 *   1. npm install
 *   2. node server.js
 *   3. Device A buka  : http://localhost:3000
 *      Device B buka  : http://<IP-Device-A>:3000
 * ==========================================================
 */

const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "barang.db"));

// ---------- Setup Database ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS barang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    harga INTEGER NOT NULL
  )
`);
const jumlahAwal = db.prepare("SELECT COUNT(*) AS n FROM barang").get().n;
if (jumlahAwal === 0) {
  const insert = db.prepare("INSERT INTO barang (nama, harga) VALUES (?, ?)");
  insert.run("Laptop", 8500000);
  insert.run("Mouse", 75000);
  insert.run("Keyboard", 150000);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // menyajikan index.html

// ---------- Helper validasi ----------
function validasi({ nama, harga }) {
  if (typeof nama !== "string" || !nama.trim()) return "'nama' wajib diisi (teks)";
  if (!Number.isInteger(harga) || harga < 0) return "'harga' harus bilangan bulat >= 0";
  return null;
}

// ---------- Endpoint: cek koneksi ----------
app.get("/api/status", (req, res) => {
  res.json({ status: "success", message: "Server Device A aktif, database siap" });
});

// ---------- GET semua barang ----------
app.get("/api/barang", (req, res) => {
  const data = db.prepare("SELECT * FROM barang ORDER BY id").all();
  res.json({ status: "success", jumlah: data.length, data });
});

// ---------- GET satu barang ----------
app.get("/api/barang/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM barang WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ status: "error", message: "Barang tidak ditemukan" });
  res.json({ status: "success", data: row });
});

// ---------- POST tambah barang ----------
app.post("/api/barang", (req, res) => {
  const err = validasi(req.body || {});
  if (err) return res.status(400).json({ status: "error", message: err });

  const nama = req.body.nama.trim();
  const harga = req.body.harga;
  const result = db.prepare("INSERT INTO barang (nama, harga) VALUES (?, ?)").run(nama, harga);
  const data = db.prepare("SELECT * FROM barang WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ status: "success", message: "Barang ditambahkan", data });
});

// ---------- PUT update barang ----------
app.put("/api/barang/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM barang WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ status: "error", message: "Barang tidak ditemukan" });

  const body = req.body || {};
  const nama = body.nama ?? row.nama;
  const harga = body.harga ?? row.harga;

  const err = validasi({ nama, harga });
  if (err) return res.status(400).json({ status: "error", message: err });

  db.prepare("UPDATE barang SET nama = ?, harga = ? WHERE id = ?").run(nama.trim(), harga, req.params.id);
  const data = db.prepare("SELECT * FROM barang WHERE id = ?").get(req.params.id);
  res.json({ status: "success", message: "Barang diupdate", data });
});

// ---------- DELETE barang ----------
app.delete("/api/barang/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM barang WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ status: "error", message: "Barang tidak ditemukan" });
  db.prepare("DELETE FROM barang WHERE id = ?").run(req.params.id);
  res.json({ status: "success", message: "Barang dihapus" });
});

// ---------- Error handler (harus paling bawah, sebelum listen) ----------
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    status: "error",
    message: status === 400 ? "Body JSON tidak valid" : "Kesalahan server",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server jalan di port ${PORT}`);
  console.log(`Buka di Device A : http://localhost:${PORT}`);
  console.log(`Buka di Device B : http://<IP-Device-A>:${PORT}`);
});