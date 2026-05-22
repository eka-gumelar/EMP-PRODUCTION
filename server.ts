import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser with larger body size for screenshots
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dynamic reference to Gemini SDK wrapper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY is not configured or uses placeholder. Will use smart fallbacks for testing.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API: Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: OCR Achievements from image using Gemini
app.post("/api/ocr-achievements", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data in request body" });
    }

    // Clean base64 header if present (e.g. "data:image/png;base64,")
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const actualMimeType = mimeType || "image/png";

    const ai = getGeminiClient();

    if (!ai) {
      // Return beautiful mock results simulating text extraction
      console.log("Using simulated OCR fallback due to missing key.");
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate slow response
      return res.json({
        success: true,
        method: "smart-simulation",
        data: [
          { nama: "Budiman", output: 125, target: 100 },
          { nama: "Siti Rahma", output: 105, target: 100 },
          { nama: "Rian Hidayat", output: 85, target: 100 },
          { nama: "Dewi Lestari", output: 110, target: 100 },
          { nama: "Agus Prasetyo", output: 95, target: 100 }
        ],
        message: "Gemini API key belum dikaitkan dengan benar. Sistem menggunakan simulasi pembacaan dokumen untuk mendemonstrasikan alur."
      });
    }

    const imagePart = {
      inlineData: {
        mimeType: actualMimeType,
        data: cleanBase64,
      }
    };

    const textPart = {
      text: `Anda adalah asisten data entry di pabrik manufaktur. Baca gambar screenshot Excel ini dan cari daftar nama Manpower (MP) beserta data output (aktual) dan targetnya untuk hari ini.
Keluarkan hasil pembacaan dalam format JSON yang berisi array 'achievements'. Setiap item harus mengandung:
- nama: nama Manpower (MP) (String lengkap seperti di Excel)
- output: angka jumlah output aktual yang dihasilkan hari ini (Number)
- target: angka jumlah target yang ditentukan (Number)

Harus cocok dengan tabel yang terlihat di gambar. Kembalikan HANYA JSON sesuai skema.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            achievements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nama: { type: Type.STRING, description: "Nama manpower / Employee name" },
                  output: { type: Type.NUMBER, description: "Jumlah output aktual (actual output number)" },
                  target: { type: Type.NUMBER, description: "Jumlah target output (target output number)" }
                },
                required: ["nama", "output", "target"]
              }
            }
          },
          required: ["achievements"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(text);
    return res.json({
      success: true,
      method: "gemini-ocr",
      data: parsed?.achievements || [],
    });

  } catch (err: any) {
    console.error("AI OCR parsing error:", err);
    return res.status(500).json({
      error: "Gagal memproses gambar menggunakan AI",
      details: err.message,
      // Fallback data for smooth user interaction on errors
      fallbackData: [
        { nama: "Siti Rahma", output: 105, target: 100 },
        { nama: "Budiman", output: 115, target: 100 },
        { nama: "Rian Hidayat", output: 95, target: 100 }
      ]
    });
  }
});

// Setup dev/prod routers
async function serveApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server sedang berjalan pada port http://0.0.0.0:${PORT}`);
  });
}

serveApp();
