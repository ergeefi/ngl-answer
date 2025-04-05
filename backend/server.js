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
import cloudinary from "cloudinary";

// Setup __dirname karena kita pakai ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup Express dan port
const app = express();
const port = process.env.PORT || 3000;

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

// Setup multer untuk file upload (file tidak disimpan secara lokal)
const storage = multer.memoryStorage();  // Gunakan memoryStorage untuk menyimpan file sementara
const upload = multer({ storage });

// Routes
app.get("/answers", (req, res) => {
  res.json(db.data.answers);
});

// Route untuk menambah data answer dengan gambar
app.post("/answers", upload.single("image"), async (req, res) => {
  try {
    const { answer } = req.body;

    // Cek apakah ada file gambar yang diupload
    if (req.file) {
      // Upload gambar ke Cloudinary
      const result = await cloudinary.uploader.upload_stream(
        { resource_type: "auto" }, // secara otomatis mendeteksi tipe file (gambar/video)
        async (error, result) => {
          if (error) {
            return res.status(500).json({ error: "Cloudinary upload failed" });
          }

          // Simpan URL gambar dari Cloudinary
          const imageUrl = result.secure_url;

          // Menambahkan data ke database
          const newEntry = {
            id: Date.now().toString(),
            image: imageUrl,
            answer,
          };

          db.data.answers.push(newEntry);
          await db.write();

          // Kirim respons
          res.status(201).json(newEntry);
        }
      );

      // Mengubah file gambar menjadi stream untuk diupload ke Cloudinary
      req.file.stream.pipe(result);
    } else {
      res.status(400).json({ error: "No file uploaded" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to upload image to Cloudinary" });
  }
});

// Route untuk mengupdate answer
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

// Route untuk menghapus answer
app.delete("/answers/:id", async (req, res) => {
  const { id } = req.params;
  db.data.answers = db.data.answers.filter((a) => a.id !== id);
  await db.write();
  res.status(204).end();
});

app.get("/", (req, res) => {
  res.send("Hello there! Api is working");
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
