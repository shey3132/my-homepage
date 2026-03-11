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
      const params = new URLSearchParams({ token: token as string, queuePath: queuePath as string });
      const response = await fetch(`https://www.call2all.co.il/ym/api/GetQueueRealTime?${params.toString()}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
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
      const params = new URLSearchParams({ 
        token: token as string, 
        ids: ids as string,
        action: "set:GOasap=hangup"
      });
      const response = await fetch(`https://www.call2all.co.il/ym/api/CallAction?${params.toString()}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
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
      const response = await fetch("https://www.call2all.co.il/ym/api/QueueManagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  // API Proxy for Call2All to bypass CORS
  app.get("/api/proxy/calls", async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    try {
      console.log(`[Proxy] Fetching calls for token: ${token}`);
      const params = new URLSearchParams({ token: token as string });
      const response = await fetch(`https://www.call2all.co.il/ym/api/GetIncomingCalls?${params.toString()}`);
      
      if (!response.ok) {
        console.error(`[Proxy] Call2All API error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: "Call2All API error" });
      }

      const data = await response.json();
      console.log(`[Proxy] Received data from Call2All:`, JSON.stringify(data).substring(0, 200));
      res.json(data);
    } catch (error) {
      console.error("[Proxy] Unexpected Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
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
