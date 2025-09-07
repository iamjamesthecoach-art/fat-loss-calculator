import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Debug log
    console.log("🔑 OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "Missing API key on server" });
    }

    let body = req.body;

    // Ensure body is parsed
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (err) {
        return res.status(400).json({ message: "Invalid JSON in request body" });
      }
    }

    const { calories, foods } = body;

    if (!calories || !foods || foods.length === 0) {
      return res.status(400).json({ message: "Missing calories or foods" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
      Create a 1-day meal plan for fat loss around ${calories} calories.
      Only use the following foods: ${foods.join(", ")}.
      Make it high in protein (at least 30% of calories).
      Break it into Breakfast, Lunch, Dinner, and Snacks.
      Show calories and protein for each meal.
      Add a total at the end.
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const plan = response.choices[0].message.content;

    res.status(200).json({ plan });
  } catch (error) {
    console.error("Mealplan API Error:", error);
    res.status(500).json({
      message: "Error generating meal plan",
      error: error.message,
      stack: error.stack,
    });
  }
}
