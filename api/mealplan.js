import OpenAI from "openai";

// 🔑 Rate limit store (in-memory, resets if server restarts)
const rateLimit = {};
const LIMIT = 5; // requests per IP
const WINDOW = 60 * 1000; // 1 minute

export default async function handler(req, res) {
  // 🔍 Capture request origin
  const origin = req.headers.origin || "unknown";
  console.log("🔍 Incoming request origin:", origin);

  // ✅ Allowed origins
  const allowedOrigins = [
    "https://productivemindset.uk",
    "https://www.productivemindset.uk", // add www just in case
    "http://localhost:3000"
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  // ✅ Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // 🔑 Secret key validation
  if (req.headers["x-api-key"] !== process.env.FRONTEND_SECRET) {
    console.warn("🚨 Forbidden request: Invalid API key");
    return res.status(403).json({ message: "Forbidden" });
  }

  // ⏳ Basic rate limiting
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (!rateLimit[ip]) {
    rateLimit[ip] = [];
  }
  const now = Date.now();
  rateLimit[ip] = rateLimit[ip].filter(ts => now - ts < WINDOW);

  if (rateLimit[ip].length >= LIMIT) {
    console.warn(`🚨 Rate limit hit by IP: ${ip}`);
    return res.status(429).json({ message: "Too many requests, try again later." });
  }
  rateLimit[ip].push(now);

  try {
    const { calories, foods } = req.body;

    if (!calories || !foods) {
      return res.status(400).json({ message: "Calories and foods are required" });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a nutrition assistant that creates 1-day fat loss meal plans."
        },
        {
          role: "user",
          content: `Make a 1-day fat loss meal plan with around ${calories} calories, at least 30% protein, and using only these foods: ${foods.join(", ")}.`
        }
      ],
      temperature: 0.7
    });

    const mealPlan = completion.choices[0].message.content;
    res.status(200).json({ plan: mealPlan });
  } catch (error) {
    console.error("❌ Backend Error:", error);
    res.status(500).json({ message: "Error generating meal plan", error: error.message });
  }
}
