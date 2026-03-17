import {GoogleGenAI} from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function decodeBase64(base64: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Decode this base64 string and return ONLY the raw text content. Do not add any markdown formatting or explanations.
    
    Base64: ${base64}`,
  });
  return response.text;
}

// Since I can't run this script directly and get the output easily, 
// I'll just use the knowledge that I can't easily decode it here.
// Actually, I can use `atob` in a browser context, but I'm in a Node environment.
// Node has `Buffer.from(base64, 'base64').toString('utf-8')`.
// But I can't run arbitrary Node code.
