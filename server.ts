import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// In-memory store for logs (simplified for this applet)
interface CallLog {
  id: string;
  phone: string;
  input: string;
  output: string;
  timestamp: string;
}
let callLogs: CallLog[] = [];

// Gemini Setup
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const model = "gemini-3-flash-preview";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- IVR API Endpoint ---
app.all("/api/ivr", async (req, res) => {
  const query = req.method === "GET" ? req.query : req.body;
  
  const callId = (query.ApiCallId as string) || "unknown";
  const phone = (query.ApiPhone as string) || "unknown";
  
  // Checking for different input types
  const userText = (query.myText as string) || (query.userInput as string);
  const audioFileRelPath = query.my_audio as string; // From api_000=my_audio,yes,record...
  
  console.log(`[IVR] Call from ${phone}. Text: ${userText}, Audio: ${audioFileRelPath}`);

  try {
    let aiResponse = "";

    if (audioFileRelPath) {
      // FREE STT MODE: Process audio recording
      // To download from Yemot, we usually need the full URL and potentially credentials.
      // For this demo, we'll assume the URL can be constructed or passed.
      const domain = query.ApiDID ? "https://call2all.co.il/ym/api" : ""; // Placeholder logic
      
      const prompt = "Please listen to this audio message from a phone caller and respond to their request in Hebrew. Be concise.";
      
      // In a real production scenario, you would fetch the file:
      // const audioBuffer = await fetch(audioUrl).then(r => r.arrayBuffer());
      
      // For now, we'll tell Gemini to handle the text if available, 
      // or explain how to handle the audio buffer.
      const result = await genAI.getGenerativeModel({ model: model }).generateContent([
        prompt,
        // { inlineData: { data: Buffer.from(audioBuffer).toString("base64"), mimeType: "audio/wav" } }
        "המשתמש שלח הקלטה. (במימוש מלא השרת יוריד את הקובץ וישלח ל-Gemini)"
      ]);
      aiResponse = result.response.text();
    } else if (userText) {
      // TEXT MODE
      const systemInstruction = process.env.SYSTEM_PROMPT || "אתה עוזר טלפוני אדיב. ענה בקצרה.";
      const result = await genAI.getGenerativeModel({ model: model }).generateContent({
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: 200 }
      });
      aiResponse = result.response.text();
    } else {
      // FIRST CONTACT
      const welcome = "שלום, איך אני יכול לעזור לך?";
      // We ask for recording (free) or voice (paid)
      // Here we set it to record for free mode
      return res.send(`read=t-${welcome}=my_audio,yes,record,/1/1,audio_file,no,yes,yes`);
    }

    const cleanAiMessage = aiResponse.replace(/[*#_]/g, "").trim();

    // Log the interaction
    callLogs.unshift({
      id: callId,
      phone,
      input: audioFileRelPath ? "[הקלטת אודיו]" : (userText || ""),
      output: cleanAiMessage,
      timestamp: new Date().toISOString()
    });
    if (callLogs.length > 50) callLogs.pop();

    // Return next loop: Read answer and record again
    res.send(`read=t-${cleanAiMessage}=my_audio,yes,record,/1/1,audio_file,no,yes,yes`);

  } catch (error) {
    console.error("Gemini Error:", error);
    res.send("id_list_message=t-סליחה, חלה שגיאה בחיבור לבינה המלאכותית");
  }
});

// --- Dashboard API ---
app.get("/api/logs", (req, res) => {
  res.json(callLogs);
});

app.post("/api/settings", (req, res) => {
  const { prompt } = req.body;
  process.env.SYSTEM_PROMPT = prompt;
  res.json({ success: true });
});

// --- Vite Middleware ---
async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
