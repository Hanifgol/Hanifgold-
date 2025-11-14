

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuotationData, Settings } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper function to convert File to a GoogleGenerativeAI.Part
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix (e.g., "data:image/jpeg;base64,"), remove it.
        resolve(reader.result.split(',')[1]);
      } else {
        resolve(''); // Should not happen with readAsDataURL
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export const getTextFromImageAI = async (imageFile: File): Promise<string> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [
                imagePart,
                { text: "Extract all text from this image of handwritten or printed notes for a tiling job. Present the text clearly." }
            ]},
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini Vision API:", error);
        throw new Error("Failed to extract text from the image.");
    }
};

export const generateQuotationFromAI = async (inputText: string, settings: Settings): Promise<QuotationData> => {
    const {
        wallTilePrice,
        floorTilePrice,
        externalWallTilePrice,
        stepTilePrice,
        cementPrice,
        whiteCementPrice,
        sharpSandPrice,
        workmanshipRate,
        wastageFactor,
        wallTileM2PerCarton,
        floorTileM2PerCarton,
        externalWallTileM2PerCarton,
        stepTileM2PerCarton,
    } = settings;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            clientDetails: {
                type: Type.OBJECT,
                properties: {
                    clientName: { type: Type.STRING, description: 'The name of the client. Default to empty string if not found.' },
                    clientAddress: { type: Type.STRING, description: 'The address of the client or project. Default to empty string if not found.' },
                    clientPhone: { type: Type.STRING, description: 'The phone number of the client. Default to empty string if not found.' },
                    projectName: { type: Type.STRING, description: 'A name for the project, e.g., "Lekki Residence". Default to empty string if not found.' },
                },
                required: ['clientName', 'clientAddress', 'clientPhone', 'projectName']
            },
            tiles: {
                type: Type.ARRAY,
                description: 'List of all tile categories found in the text.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, description: 'The name of the area, e.g., "Toilet Wall".' },
                        cartons: { type: Type.NUMBER, description: 'Number of cartons. If not present, estimate from m².' },
                        sqm: { type: Type.NUMBER, description: 'Square meters. If not present, estimate from cartons.' },
                        tileType: { type: Type.STRING, description: 'Categorize as "Wall", "Floor", "External Wall", "Step", or "Unknown".', enum: ['Wall', 'Floor', 'External Wall', 'Step', 'Unknown'] },
                        unitPrice: { type: Type.NUMBER, description: 'Price per carton. Use defaults if not specified.' },
                        confidence: { type: Type.NUMBER, description: 'Confidence score (0.0 to 1.0) for the extracted data for this tile entry. A score below 0.8 indicates a default was likely used.' }
                    },
                    required: ['category', 'cartons', 'sqm', 'tileType', 'unitPrice', 'confidence']
                }
            },
            materials: {
                type: Type.ARRAY,
                description: 'List of all other materials.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        item: { type: Type.STRING, description: 'Name of the material, e.g., "Cement".' },
                        quantity: { type: Type.NUMBER, description: 'Quantity of the material.' },
                        unit: { type: Type.STRING, description: 'Unit of measurement, e.g., "bags", "kg".' },
                        unitPrice: { type: Type.NUMBER, description: 'Price per unit. If not provided, estimate a reasonable price in NGN.' },
                        confidence: { type: Type.NUMBER, description: 'Confidence score (0.0 to 1.0) for the extracted data for this material entry.' }
                    },
                    required: ['item', 'quantity', 'unit', 'unitPrice', 'confidence']
                }
            },
            workmanshipRate: { type: Type.NUMBER, description: `Rate for workmanship per m². Default to ${workmanshipRate} if not found.` },
            maintenance: { type: Type.NUMBER, description: `Maintenance fee. If not explicitly mentioned in the input, this value must be 0.` },
            profitPercentage: { type: Type.NUMBER, description: 'Profit percentage if mentioned, otherwise null.' }
        },
        required: ['clientDetails', 'tiles', 'materials', 'workmanshipRate', 'maintenance']
    };

    const prompt = `
        You are "Tiling Quotation Formatter & Calculator AI" for professional tilers in Nigeria.
        Your task is to convert the following rough text input into a complete, clean, professional tiling quotation in JSON format.
        
        **CRITICAL INSTRUCTIONS (MUST ALWAYS EXECUTE FULLY):**

        1.  **Input Analysis:** Analyze the following text. It could be typed or from OCR, so it may contain errors.
            \`\`\`
            ${inputText}
            \`\`\`

        2.  **Field Extraction & Defaults:** Extract all relevant fields. If a field is missing or seems incorrect, apply the specified defaults. NEVER fail or stop. ALWAYS produce a full JSON output.
            *   **Client & Project Details:** Look for information like client name, address, phone number, or a project name in the text. If any are not found, their value MUST be an empty string "".
            *   **Tile Categories:** Identify categories like 'Toilet Wall', 'Toilet Floor', 'Kitchen Wall', 'Kitchen Floor', 'Rooms', 'Long Lobby', 'Step', 'External Wall', and any other custom ones.
            *   **Quantities & Calculation Logic:** When estimating quantities, you MUST use these specific coverage rates:
                *   Wall Tiles: ${wallTileM2PerCarton} m²/carton.
                *   Floor Tiles (including Rooms, Lobby): ${floorTileM2PerCarton} m²/carton.
                *   External Wall Tiles: ${externalWallTileM2PerCarton} m²/carton.
                *   Step Tiles: ${stepTileM2PerCarton} m²/carton.
                *   **If only 'm²' is provided for a tile category:** You MUST first calculate the 'cartons'. Use the formula: \`cartons = (m² / [appropriate m²/carton from above]) * ${wastageFactor}\`. ALWAYS round the result up to the nearest whole number. After calculating the cartons, apply the default unit price per carton to this calculated number.
                *   **If only 'cartons' are provided:** You MUST calculate the 'm²'. Use the formula: \`m² = cartons * [appropriate m²/carton from above]\`.
                *   **If BOTH are missing for a category mentioned:** You MUST set both 'cartons' and 'm²' to 0. Do not invent quantities.
            *   **Tile Type & Unit Price Defaults (NGN):**
                *   For categories containing 'Wall' (but not 'External Wall'), classify as 'Wall' tile, default price: ${wallTilePrice}.
                *   For categories containing 'Floor', 'Rooms', 'Lobby', classify as 'Floor' tile, default price: ${floorTilePrice}.
                *   For categories containing 'External Wall', classify as 'External Wall', default price: ${externalWallTilePrice}.
                *   For categories containing 'Step', classify as 'Step', default price: ${stepTilePrice}.
                *   If a price is provided in the text, USE IT. Otherwise, use the defaults.
            *   **Materials:** Extract materials like 'Cement', 'White Cement', 'Sand'. If unit prices are missing, you MUST use these specific default prices (in NGN):
                *   Cement (per bag): ${cementPrice}
                *   White Cement (per bag): ${whiteCementPrice}
                *   Sharp Sand: ${sharpSandPrice}
                *   For any other materials not listed above, use reasonable market estimates in NGN.
            *   **Rates:**
                *   Workmanship rate per m²: Default is ${workmanshipRate}.
                *   Maintenance fee: Extract this if explicitly mentioned. **If not mentioned, set it to 0.**
            *   **Profit:** Extract profit only if explicitly mentioned as a percentage. Otherwise, the field should be null.
        
        3.  **Confidence Score:**
            *   For each tile and material entry, provide a \`confidence\` score from 0.0 to 1.0. A score of 1.0 means the data was explicitly and clearly stated. A score below 0.8 means you had to use a default or make a strong assumption.
            
        4.  **JSON Output:** Return ONLY a single valid JSON object that strictly adheres to the provided schema. Do not add any explanatory text before or after the JSON.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedData: QuotationData = JSON.parse(jsonText);
        return parsedData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to parse quotation data from AI response.");
    }
};

export const generateSpeechFromText = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say this in a clear, professional tone: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A standard, clear voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error calling Gemini TTS API:", error);
        throw new Error("Failed to generate speech from text.");
    }
};
