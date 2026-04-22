import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env.local') });

import Result from './models/Result.js';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ocr-pro';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB ga ulandi'))
  .catch(err => {
    console.error('❌ MongoDB ulanish xatosi:', err.message);
    console.log('⚠️  MONGODB_URI .env.local faylida sozlang');
  });

// ---- API Routes ----

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: Buffer.from(ADMIN_PASSWORD + ':' + Date.now()).toString('base64') });
  } else {
    res.status(401).json({ success: false, message: "Noto'g'ri parol" });
  }
});

// Verify admin auth middleware
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: "Avtorizatsiya talab qilinadi" });
  }
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [password] = decoded.split(':');
    if (password === ADMIN_PASSWORD) {
      next();
    } else {
      res.status(401).json({ success: false, message: "Yaroqsiz token" });
    }
  } catch {
    res.status(401).json({ success: false, message: "Yaroqsiz token" });
  }
};

// Save OCR result
app.post('/api/results', async (req, res) => {
  try {
    const { text, imagePreview, userAgent } = req.body;
    const result = new Result({
      text,
      imagePreview: imagePreview || '',
      userAgent: userAgent || 'Unknown'
    });
    await result.save();
    res.status(201).json({ success: true, id: result._id });
  } catch (err) {
    console.error('Saqlash xatosi:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all results (admin only)
app.get('/api/results', verifyAdmin, async (req, res) => {
  try {
    const results = await Result.find().sort({ createdAt: -1 });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single result (admin only)
app.get('/api/results/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Natija topilmadi" });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Download result as Word
app.get('/api/results/:id/download/word', verifyAdmin, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Natija topilmadi" });
    }

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>OCR Natija</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 8px; }
        </style>
      </head>
      <body>${result.text}</body>
      </html>
    `;

    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', `attachment; filename=ocr_natija_${result._id}.doc`);
    res.send('\uFEFF' + html);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Download result as TXT
app.get('/api/results/:id/download/txt', verifyAdmin, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Natija topilmadi" });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=ocr_natija_${result._id}.txt`);
    res.send('\uFEFF' + result.text);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete result (admin only)
app.delete('/api/results/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Natija topilmadi" });
    }
    res.json({ success: true, message: "O'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Stats
app.get('/api/stats', verifyAdmin, async (req, res) => {
  try {
    const total = await Result.countDocuments();
    const today = await Result.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
    });
    res.json({ success: true, total, today });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
  console.log(`📦 MongoDB: ${MONGODB_URI}`);
});
