import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    // ✅ Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    // ✅ API key check
    const frontendKey = req.headers["x-api-key"];
    if (frontendKey !== process.env.MEALPLAN_API_KEY) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Parse body
    const { calories, foods } = req.body;
    if (!calories || !foods || !Array.isArray(foods)) {
      return res.status(400).json({ message: "Missing or invalid input" });
    }

    // ✅ OpenAI setup
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ✅ Create meal plan with GPT
    const prompt = `
      Create a 1-day fat loss meal plan with about ${calories} calories.
      Only use these foods: ${foods.join(", ")}.
      At least 30% of calories should come from protein.
      Break it into breakfast, lunch, dinner, and snacks.
      Include calorie + protein counts per meal, and totals.
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const plan = response.choices[0].message.content;

    return res.status(200).json({ plan });
  } catch (err) {
    console.error("❌ Error in /api/mealplan:", err);
    return res.status(500).json({
      message: "Error generating meal plan",
      error: err.message,
    });
  }
}
