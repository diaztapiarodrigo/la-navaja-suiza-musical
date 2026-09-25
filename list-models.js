const { GoogleGenAI } = require("@google/genai");
const apiKey = process.env.GCP_TELEGRAM_API_KEY || "AIzaSyAENjC80ga51V8ohwhRaK48fSjJ2Y88Gg4";
const ai = new GoogleGenAI({ apiKey: apiKey });

async function run() {
  try {
    const response = await ai.models.list();
    for await (const model of response) {
      console.log(model.name);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}
run();
