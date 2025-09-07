import OpenAI from "openai";

// Initialize OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple in-memory store for rate limiting
const requests = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 5; // limit per IP per window

export default async function handler(req, res) {
  // ✅ Allow only POST
  if (req.method !== "POST") {
    console.warn("❌ Invalid request method:", req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ✅ API key check
  const frontendKey = req.headers["x-api-key"];
  if (frontendKey !== process.env.FRONTEND_KEY) {
    console.warn("❌ Unauthorized attempt — wrong API key:", frontendKey);
    return res.status(401).json({ message: "Unauthorized" });
  }

  // ✅ Rate limiting
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();
  const record = requests.get(ip) || { count: 0, startTime: now };

  if (now - record.startTime < WINDOW_MS) {
    if (record.count >= MAX_REQUESTS) {
      console.warn(`⛔ Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    record.count++;
  } else {
    // Reset window
    record.count = 1;
    record.startTime = now;
  }

  requests.set(ip, record);

  try {
    const { calories, foods } = req.body;

    if (!calories || !foods || foods.length === 0) {
      console.warn("❌ Missing input values:", { calories, foods });
      return res.status(400).json({ message: "Calories and foods are required" });
    }

    console.log("✅ Meal plan request:", { calories, foods });

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
        { role: "user", content: prompt }
      ],
      max_tokens: 600,
    });

    const mealPlan = response.choices[0].message.content;

    console.log("✅ Meal plan generated successfully");
    return res.status(200).json({ plan: mealPlan });

  } catch (err) {
    console.error("🔥 Backend Error:", err);
    return res.status(500).json({
      message: "Error generating meal plan",
      error: err.message,
    });
  }
}
