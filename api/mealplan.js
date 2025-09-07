import OpenAI from "openai";

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory stores
const ipRequests = {};
const emailRequests = {};

const IP_LIMIT = 5;            // max per minute
const IP_WINDOW = 60 * 1000;   // 1 minute
const EMAIL_DAILY_LIMIT = 20;  // max per user email per day

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ✅ API key validation
  const frontendKey = req.headers["x-api-key"];
  if (frontendKey !== process.env.FRONTEND_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();

  // --- IP Rate Limit ---
  if (!ipRequests[ip]) ipRequests[ip] = [];
  ipRequests[ip] = ipRequests[ip].filter((t) => now - t < IP_WINDOW);

  if (ipRequests[ip].length >= IP_LIMIT) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({ message: "Too many requests from this IP. Slow down." });
  }
  ipRequests[ip].push(now);

  // --- Email Rate Limit ---
  const { calories, foods, email } = req.body;
  if (!calories || !foods || foods.length === 0) {
    return res.status(400).json({ message: "Calories and foods are required" });
  }
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const today = new Date().toISOString().split("T")[0]; // e.g. 2025-09-06
  const emailKey = `${email}-${today}`;

  if (!emailRequests[emailKey]) emailRequests[emailKey] = 0;

  if (emailRequests[emailKey] >= EMAIL_DAILY_LIMIT) {
    console.warn(`⚠️ Daily email limit exceeded for: ${email}`);
    return res.status(429).json({ message: "Daily meal plan limit reached for this email." });
  }

  emailRequests[emailKey]++;

  try {
    // 🔥 Build GPT prompt
    const prompt = `
    Create a 1-day fat loss meal plan with about ${calories} calories.
    Rules:
    - Only include these foods: ${foods.join(", ")}.
    - At least 30% of calories must come from protein.
    - Format clearly by meals (Breakfast, Lunch, Dinner, Snacks).
    - Show approximate calories & protein per meal.
    - End with total calories & protein.
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a nutrition assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
    });

    const mealPlan = response.choices[0].message.content;

    return res.status(200).json({ plan: mealPlan });

  } catch (err) {
    console.error("🔥 Backend Error:", err);
    return res.status(500).json({
      message: "Error generating meal plan",
      error: err.message,
    });
  }
}
