export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://productivemindset.uk"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  // ✅ Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ✅ API key check
  const frontendKey = req.headers["x-api-key"];
  if (frontendKey !== "supersecret123") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { calories, foods } = req.body;

    if (!calories || !foods) {
      return res.status(400).json({ message: "Missing calories or foods" });
    }

    // ✅ Call OpenAI
    const prompt = `Create a 1-day meal plan for fat loss at around ${calories} calories.
    Include only these foods: ${foods.join(", ")}.
    Make sure at least 30% of calories come from protein.`;

    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const mealPlan = completion.choices[0].message.content;

    return res.status(200).json({ plan: mealPlan });
  } catch (error) {
    console.error("Meal plan error:", error);
    return res.status(500).json({
      message: "Error generating meal plan",
      error: error.message,
    });
  }
}
