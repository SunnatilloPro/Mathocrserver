import express from 'express';
import cors from 'cors';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env.local') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ---- Telegram xabar yuborish (https moduli bilan) ----
const telegramMultipart = (endpoint, fields, fileField, fileName, fileBuffer, mimeType) => {
  return new Promise((resolve, reject) => {
    const boundary = '----OCRBoundary' + Date.now();
    const parts = [];

    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`
      );
    }

    const partStart = Buffer.from(parts.join('\r\n') + '\r\n', 'utf-8');
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
      'utf-8'
    );
    const partEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const body = Buffer.concat([partStart, fileHeader, fileBuffer, partEnd]);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, description: 'JSON parse error' }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

const buildDocBuffer = (text) => {
  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns:m='http://schemas.microsoft.com/office/2004/12/omml'
        xmlns:v='urn:schemas-microsoft-com:vml'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>OCR Natija</title>
    <!--[if gte mso 9]><xml>
      <o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml><![endif]-->
    <style>
      v\\:* {behavior:url(#default#VML);}
      o\\:* {behavior:url(#default#VML);}
      w\\:* {behavior:url(#default#VML);}
      .shape {behavior:url(#default#VML);}
      @page WordSection1 {
        size: 8.27in 11.69in;
        margin: 0.5in 0.5in 0.7in 0.5in;
      }
      div.WordSection1 { page: WordSection1; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; }
      table.content-table { border-collapse: collapse; width: 100%; }
      table.content-table td, table.content-table th { border: 1px solid #ddd; padding: 8px; }
      img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
    </style>
  </head>
  <body>
      <!-- ===== ASOSIY KONTENT ===== -->
      ${safeText}
    </div>
  </body>
  </html>`;

  return Buffer.from('\uFEFF' + html, 'utf-8');
};

const sendToTelegram = async (text, imageBase64) => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️  Telegram token yoki chat_id yo\'q');
    return;
  }

  const chatId = String(TELEGRAM_CHAT_ID);
  const shortText = `📄 Yangi OCR natija\n\n${text.slice(0, 800)}${text.length > 800 ? '\n\n...(davomi .doc faylda)' : ''}`;

  if (imageBase64) {
    try {
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      const imgBuffer = Buffer.from(base64Data, 'base64');
      const photoRes = await telegramMultipart(
        'sendPhoto',
        { chat_id: chatId, caption: shortText },
        'photo', 'ocr.jpg', imgBuffer, 'image/jpeg'
      );
      if (photoRes.ok) {
        console.log('📨 Telegram ga rasm yuborildi');
      } else {
        console.warn('Rasm xato:', photoRes.description);
      }
    } catch (err) {
      console.warn('Rasm yuborishda xato:', err.message);
    }
  }

  try {
    const now = new Date();
    const dateStr = `${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}_${now.getHours()}-${now.getMinutes()}`;
    const docBuffer = buildDocBuffer(text);
    const docRes = await telegramMultipart(
      'sendDocument',
      { chat_id: chatId, caption: '📝 Word fayl' },
      'document', `ocr_natija_${dateStr}.doc`, docBuffer, 'application/msword'
    );
    if (docRes.ok) {
      console.log('📨 Telegram ga .doc fayl yuborildi');
    } else {
      console.warn('.doc yuborishda xato:', docRes.description);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: shortText })
      });
    }
  } catch (err) {
    console.warn('.doc yuborishda xato:', err.message);
  }
};

// ---- Express App yaratish ----
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.post('/api/results', async (req, res) => {
    try {
      const { text, imagePreview } = req.body;
      sendToTelegram(text, imagePreview);
      res.status(200).json({ success: true, message: "Telegramga yuborildi" });
    } catch (err) {
      console.error('Saqlash xatosi:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return app;
}
