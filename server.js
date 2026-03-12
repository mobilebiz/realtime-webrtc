const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const port = 8080;
const settingsFile = path.resolve(__dirname, 'settings.json');

app.use(express.static("public"));
app.use(express.json());

// Get settings
app.get("/settings", (req, res) => {
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = fs.readFileSync(settingsFile, 'utf8');
      res.json(JSON.parse(settings));
    } catch (err) {
      console.error("Error reading settings:", err);
      res.status(500).json({ error: "Failed to read settings" });
    }
  } else {
    // Default settings
    res.json({});
  }
});

// Save settings
app.post("/settings", (req, res) => {
  try {
    fs.writeFileSync(settingsFile, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving settings:", err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.get("/rate", async (req, res) => {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      console.warn("EXCHANGE_RATE_API_KEY not set. Using default rate.");
      return res.json({ rate: 150 }); // Default fallback
    }

    const response = await fetch(`http://api.exchangerate.host/live?access_key=${apiKey}&source=USD&currencies=JPY`);
    if (!response.ok) {
      throw new Error(`Exchange API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.quotes && data.quotes.USDJPY) {
      res.json({ rate: data.quotes.USDJPY });
    } else {
      console.error("Invalid Exchange API response:", data);
      res.json({ rate: 150 }); // Fallback
    }
  } catch (err) {
    console.error("Error fetching exchange rate:", err);
    res.json({ rate: 150 }); // Fallback on error
  }
});

app.get("/session", async (req, res) => {
  // Legacy support or default if needed, but we mostly expect POST now if passing model
  // However, existing code uses GET. We can switch to POST or read query params. 
  // To match plan "POST /session logic change", but client currently does GET.
  // Let's support GET with query param or just keep it simple?
  // The plan said "POST /session改修". But currently it is GET. 
  // Let's support both or change client to POST. I will implement POST handler for session as well.
  res.status(405).json({ error: "Use POST /session to create session with model" });
});

app.post("/session", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const { model, voice } = req.body;
    // Default to a safe model if not provided, but client should provide it.
    const selectedModel = model || "gpt-4o-realtime-preview-2024-12-17";
    const selectedVoice = voice || "verse";

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        voice: selectedVoice,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
