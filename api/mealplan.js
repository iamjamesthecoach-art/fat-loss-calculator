import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ Parse body properly
    const { calories, foods } = req.body || {};

    if (!calories || !foods) {
      return res.status(400).json({ message: "Missing calories or foods" });
    }

    const prompt = `Create a 1-day fat loss meal plan with about ${calories} calories using these foods: ${foods.join(", ")}. 
    Ensure protein is at least 30% of calories. Format meals with calories and protein per meal.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const plan = completion.choices[0].message.content;

    res.status(200).json({ plan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating meal plan", error: error.message });
  }
}
