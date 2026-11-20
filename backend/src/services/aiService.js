import { GoogleGenerativeAI } from "@google/generative-ai";
import { ollamaChat } from "./ollamaClient.js";

// Initialize the SDK with the API Key from env file
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model order: GEMINI_MODEL (optional, from .env) first, then known-good fallbacks.
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
].filter(Boolean);
// LLM_PROVIDER=openai in .env switches the text AI to a local server (LM Studio); otherwise Gemini is used.
const useLocalLlm = () => String(process.env.LLM_PROVIDER || "").toLowerCase() === "openai";

export const generateAIResponse = async (userPrompt) => {
    if (useLocalLlm()) return await ollamaChat({ prompt: userPrompt });
    if (process.env.LOCAL_ONLY === 'true') throw new Error('AI trực tuyến đã tắt trong bản local.');
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing in .env.");

    let lastError = null;
    for (const modelName of GEMINI_MODELS) {
        try {
            const model = ai.getGenerativeModel({ model: modelName });
            const response = await model.generateContent(userPrompt);
            return response.response.text();
        } catch (error) {
            console.warn(`[AI] Gemini model ${modelName} failed:`, error.message || error);
            lastError = error;
        }
    }
    console.error("[AI] All Gemini models failed:", lastError?.message || lastError);
    throw new Error("Unable to connect to artificial intelligence service.");
};

export const analyzeDishImageWithGemini = async ({ imageBase64, mimeType = "image/jpeg", menuList = [] }) => {
    const modelsToTry = [
        process.env.GEMINI_MODEL,
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-2.5-flash"
    ].filter(Boolean);

    const simplifiedMenu = menuList.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || item.category_name || "General",
        description: item.description || "",
        price: item.price
    }));

    const systemPrompt = `You are FUKU Restaurant's AI Executive Chef. Analyze the provided image and compare it with FUKU's active menu:
${JSON.stringify(simplifiedMenu, null, 2)}

TASK & OUTPUT INSTRUCTIONS:
1. Determine if the image depicts a food dish or beverage (isFood: boolean).
2. If it is NOT food (e.g., cat, car, shoe, text document), return JSON with:
   {
     "isFood": false,
     "detectedFoodName": null,
     "matchedDishIds": [],
     "matchScores": {},
     "reasons": {},
     "outOfMenuAlternative": false,
     "message": "No food detected in this photo. Enjoy our Top Signature Dishes selected for you today!"
   }
3. If it IS food:
   - Identify the food name in "detectedFoodName".
   - Check if it matches or closely resembles any items in the provided FUKU menu list.
   - If matching items exist in FUKU menu:
     Return up to 3 best matching dish IDs in "matchedDishIds", with similarity score (0-100) in "matchScores" object keyed by dish ID string, and a concise 1-sentence English explanation in "reasons" object keyed by dish ID string.
   - If the food is clearly NOT on FUKU's menu (e.g., Pizza, Pho, Burger):
     Set "outOfMenuAlternative": true. Select 2-3 FUKU dishes with similar flavor profiles or cooking styles as recommendations, and explain why in "message" and "reasons".

CRITICAL: Return ONLY raw, valid JSON. Do not include markdown code block backticks (\`\`\`json).`;

    const imagePart = {
        inlineData: {
            data: imageBase64,
            mimeType: mimeType
        }
    };

    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            const model = ai.getGenerativeModel({ 
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });
            const response = await model.generateContent([systemPrompt, imagePart]);
            const responseText = response.response.text().trim();
            const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
            return JSON.parse(cleanJson);
        } catch (error) {
            console.warn(`Visual AI search error with model ${modelName}:`, error.message || error);
            lastError = error;
        }
    }

    console.error("Visual search API failed on all models:", lastError);
    throw new Error("Failed to process image visual search.");
};