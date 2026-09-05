import OpenAI from "openai";
import "dotenv/config";

const apiKey = process.env.EXPLABS_API_KEY;

if (!apiKey) {
  throw new Error("EXPLABS_API_KEY is not set in your .env file");
}

const client = new OpenAI({
  baseURL: "https://api.experientiallabs.ai/v1",
  apiKey: apiKey,
});

const response = await client.chat.completions.create({
  model: "gpt-6-astra",
  messages: [
    {
      role: "user",
      content: "Hello from my product",
    },
  ],
});

console.log(response.choices[0].message.content);