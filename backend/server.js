import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import { Low } from "lowdb";
import { JSONFile } from "lowdb";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Setup __dirname karena kita pakai ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Express dan port
const app = express();
const port = process.env.PORT || 3000;


// Buat folder uploads kalau belum ada
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Setup LowDB
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Baca dan inisialisasi database
await db.read();
db.data ||= { answers: [] };
await db.write();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Setup multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Routes
app.get("/answers", (req, res) => {
  res.json(db.data.answers);
});

app.post("/answers", upload.single("image"), async (req, res) => {
  const { answer } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newEntry = {
    id: Date.now().toString(),
    image: imageUrl,
    answer,
  };

  db.data.answers.push(newEntry);
  await db.write();

  res.status(201).json(newEntry);
});

app.put("/answers/:id", async (req, res) => {
  const { id } = req.params;
  const { answer } = req.body;

  const item = db.data.answers.find((a) => a.id === id);
  if (item) {
    item.answer = answer;
    await db.write();
    res.json(item);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.delete("/answers/:id", async (req, res) => {
  const { id } = req.params;
  db.data.answers = db.data.answers.filter((a) => a.id !== id);
  await db.write();
  res.status(204).end();
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
