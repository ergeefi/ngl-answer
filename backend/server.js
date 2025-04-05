import express from "express";
import cors from "cors";
import multer from "multer";
import cloudinary from "cloudinary";
import { Low } from "lowdb";
import { JSONFile } from "lowdb";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Setup Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const app = express();
const port = process.env.PORT || 3000;

// Setup LowDB
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Setup Multer (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Baca dan inisialisasi database
await db.read();
db.data ||= { answers: [] };
await db.write();

// Middleware
app.use(cors());
app.use(express.json());

// Route untuk mendapatkan data answers
app.get("/answers", (req, res) => {
  res.json(db.data.answers);
});

// Route untuk upload gambar dan menyimpan jawaban
app.post("/answers", upload.single("image"), async (req, res) => {
  const { answer } = req.body;
  let imageUrl = null;

  // Cek jika ada file di request
  if (req.file) {
    try {
      // Upload file gambar ke Cloudinary
      const uploadResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: "auto" }, // Menangani berbagai tipe file (image, video, dll)
          (error, result) => {
            if (error) {
              console.error("Error uploading image to Cloudinary:", error);
              reject("Gagal mengupload gambar!");
            } else {
              resolve(result.secure_url);
            }
          }
        ).end(req.file.buffer); // Mengirim file ke Cloudinary
      });

      // Dapatkan URL gambar dari Cloudinary
      imageUrl = uploadResponse;
    } catch (error) {
      console.error("Error in Cloudinary upload:", error);
      return res.status(500).json({ message: "Terjadi kesalahan saat upload gambar." });
    }
  }

  // Simpan data baru ke database
  const newEntry = {
    id: Date.now().toString(),
    image: imageUrl,
    answer,
  };

  db.data.answers.push(newEntry);
  await db.write();

  res.status(201).json(newEntry);
});

// Route untuk update jawaban
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

// Route untuk delete jawaban
app.delete("/answers/:id", async (req, res) => {
  const { id } = req.params;
  db.data.answers = db.data.answers.filter((a) => a.id !== id);
  await db.write();
  res.status(204).end();
});

// Route untuk testing jika server berjalan
app.get("/", (req, res) => {
  res.send("Hello there! API is working.");
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
