import OpenAI from "openai";

export default async function handler(req, res) {
  // ✅ Allowed origins
  const allowedOrigins = [
    "https://fitness.productivemindset.uk",
    "http://fitness.productivemindset.uk",  // just in case GHL uses http
    "http://localhost:3000"                // dev testing
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Only allow POST for actual requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

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
