const OpenAI = require("openai");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { calories, foods } = req.body;

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
    res
      .status(500)
      .json({ message: "Error generating meal plan", error: error.message });
  }
};

