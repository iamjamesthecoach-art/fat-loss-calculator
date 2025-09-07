// api/mealplan.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 🔒 Never expose this in frontend
});

export default async function handler(req, res) {
  // ✅ Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ✅ API key check for frontend -> backend communication
  const frontendKey = req.headers["x-api-key"];
  if (frontendKey !== "supersecret123") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { calories, foods } = req.body;

    if (!calories || !foods || foods.length === 0) {
      return res.status(400).json({ message: "Missing calories or foods input" });
    }

    // Prompt to OpenAI
    const prompt = `
    Create a 1-day fat loss meal plan for around ${calories} calories
    using only these foods: ${foods.join(", ")}.
    Ensure at least 30% of calories come from protein.
    Format it clearly with meals, calories, protein, and totals.
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a nutritionist creating simple, accurate 1-day fat loss meal plans." },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
    });

    const plan = completion.choices[0].message.content;

    return res.status(200).json({ plan });
  } catch (error) {
    console.error("❌ Meal plan generation failed:", error);
    return res.status(500).json({ message: "Error generating meal plan", error: error.message });
  }
}
