import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import { Low } from "lowdb";
import { JSONFile } from "lowdb";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Setup Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const port = process.env.PORT || 3000;

// Setup LowDB
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

// Setup multer dengan Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ergeefi",
    format: async (req, file) => {
      // Deteksi format dari mime type
      if (file.mimetype === "image/jpeg") return "jpg";
      if (file.mimetype === "image/png") return "png";
      return "auto"; // Auto-detect untuk format lainnya
    },
    public_id: (req, file) => `question_${Date.now()}`
  },
});

const upload = multer({ storage: storage });

// Buat folder uploads jika belum ada
app.use("/uploads", express.static(path.join(__dirname, process.env.UPLOAD_DIR || "uploads")));

// Routes
app.get("/answers", (req, res) => {
  console.log("Fetching answers from DB...");
  res.json(db.data.answers);
});

// Route untuk menambah data answer dengan gambar
app.post("/answers", upload.single("image"), async (req, res) => {
  try {
    console.log("Received upload request...");
    
    const { answer } = req.body;
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Log file info
    console.log("File uploaded to Cloudinary: ", req.file);

    // Ambil URL gambar dari hasil upload Cloudinary oleh multer-storage-cloudinary
    const imageUrl = req.file.path;
    
    // Buat entry baru
    const newEntry = { 
      id: Date.now().toString(), 
      image: imageUrl, 
      answer 
    };

    // Log new entry
    console.log("New entry to be saved:", newEntry);

    // Simpan ke database
    db.data.answers.push(newEntry);
    await db.write();

    console.log("Entry saved to DB successfully");

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("General error:", error);
    res.status(500).json({ error: "Failed to upload image", details: error.message });
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
  
  // Ambil item yang akan dihapus
  const item = db.data.answers.find((a) => a.id === id);
  
  if (item) {
    try {
      // Ekstrak public_id dari URL Cloudinary
      const publicIdMatch = item.image.match(/\/ergeefi\/([^/]+)(\.\w+)?$/);
      if (publicIdMatch && publicIdMatch[1]) {
        const publicId = `ergeefi/${publicIdMatch[1]}`;
        // Hapus gambar dari Cloudinary
        await cloudinary.uploader.destroy(publicId);
        console.log(`Deleted image ${publicId} from Cloudinary`);
      }
    } catch (err) {
      console.error("Error saat menghapus gambar dari Cloudinary:", err);
      // Lanjutkan proses meskipun gagal menghapus dari Cloudinary
    }
  }
  
  // Hapus dari database
  db.data.answers = db.data.answers.filter((a) => a.id !== id);
  await db.write();
  res.status(204).end();
});

app.get("/", (req, res) => {
  res.send("Hello there! Api is working");
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at https://ngl-answer.up.railway.app`);
});