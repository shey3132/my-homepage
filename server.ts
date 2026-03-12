import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Get Queue Real Time
  app.get("/api/proxy/queue", async (req, res) => {
    const { token, queuePath } = req.query;
    if (!token || !queuePath) {
      return res.status(400).json({ error: "Token and queuePath are required" });
    }
    try {
      console.log(`[Proxy] Fetching queue for token: ${token}, path: ${queuePath}`);
      const params = new URLSearchParams({ token: token as string, queuePath: queuePath as string });
      const response = await fetch(`https://www.call2all.co.il/ym/api/GetQueueRealTime?${params.toString()}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Queue error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Call Action (Hangup)
  app.get("/api/proxy/hangup", async (req, res) => {
    const { token, ids } = req.query;
    if (!token || !ids) {
      return res.status(400).json({ error: "Token and ids are required" });
    }
    try {
      console.log(`[Proxy] Hangup for token: ${token}, ids: ${ids}`);
      const params = new URLSearchParams({ 
        token: token as string, 
        ids: ids as string,
        action: "set:GOasap=hangup"
      });
      const response = await fetch(`https://www.call2all.co.il/ym/api/CallAction?${params.toString()}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Hangup error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Queue Management (Kick & Hangup)
  app.post("/api/proxy/queue-kick", express.json(), async (req, res) => {
    const { token, callIds } = req.body;
    if (!token || !callIds) {
      return res.status(400).json({ error: "Token and callIds are required" });
    }
    try {
      console.log(`[Proxy] Queue Kick for token: ${token}, ids: ${callIds}`);
      const response = await fetch("https://www.call2all.co.il/ym/api/QueueManagement", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          token,
          callIds,
          action: "kick",
          moreData: "hangup"
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Kick error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  // API Proxy for Call2All to bypass CORS
  app.get("/api/proxy/calls", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token is required" });

    try {
      // We build the URL manually to ensure the token format is exactly what Call2All expects
      const url = `https://www.call2all.co.il/ym/api/GetIncomingCalls?token=${token}`;
      console.log(`[Proxy] Requesting: ${url}`);

      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      });
      
      const rawText = await response.text();
      console.log(`[Proxy] Raw Response (first 500 chars): ${rawText.substring(0, 500)}`);

      // Try to parse as JSON, if fails, send as text so frontend can handle it
      try {
        const data = JSON.parse(rawText);
        res.json(data);
      } catch (e) {
        console.warn("[Proxy] Response is not JSON, sending as raw text");
        res.json({ rawResponse: rawText, isRaw: true });
      }
    } catch (error) {
      console.error("[Proxy] Critical Error:", error);
      res.status(500).json({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Serve index.html with Vite transformations
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        if (e instanceof Error) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
