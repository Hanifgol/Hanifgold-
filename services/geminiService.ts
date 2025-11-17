

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Settings, QuotationData } from '../types';

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

export const generateQuotationFromAI = async (inputText: string, settings: Settings, addCheckmateDefault: boolean, showChecklistDefault: boolean): Promise<any> => {
    const {
        wallTilePrice,
        floorTilePrice,
        sittingRoomTilePrice,
        externalWallTilePrice,
        stepTilePrice,
        cementPrice,
        whiteCementPrice,
        sharpSandPrice,
        workmanshipRate,
        wastageFactor,
        wallTileM2PerCarton,
        floorTileM2PerCarton,
        sittingRoomTileM2PerCarton,
        externalWallTileM2PerCarton,
        stepTileM2PerCarton,
        customMaterialUnits,
        defaultTermsAndConditions,
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
                        size: { type: Type.STRING, description: 'The size of the tile, e.g., "60x60", "40x40", "30x60". Default to empty string if not specified.' },
                        tileType: { type: Type.STRING, description: 'Categorize as "Wall", "Floor", "External Wall", "Step", or "Unknown".', enum: ['Wall', 'Floor', 'External Wall', 'Step', 'Unknown'] },
                        unitPrice: { type: Type.NUMBER, description: 'Price per carton. Use defaults if not specified.' },
                    },
                    required: ['category', 'cartons', 'sqm', 'size', 'tileType', 'unitPrice']
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
                    },
                    required: ['item', 'quantity', 'unit', 'unitPrice']
                }
            },
            checklist: {
                type: Type.ARRAY,
                description: 'A checklist of key tasks for the project based on the job description. If checklists are disabled, return an empty array.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        item: { type: Type.STRING, description: 'A single task or milestone for the project.' },
                        checked: { type: Type.BOOLEAN, description: 'The status of the checklist item. MUST be `false`.' }
                    },
                    required: ['item', 'checked']
                }
            },
            workmanshipRate: { type: Type.NUMBER, description: `Rate for workmanship per m². Default to ${workmanshipRate} if not found.` },
            maintenance: { type: Type.NUMBER, description: `Maintenance fee. If not explicitly mentioned in the input, this value must be 0.` },
            profitPercentage: { type: Type.NUMBER, description: 'Profit percentage if mentioned, otherwise null.' },
            termsAndConditions: { type: Type.STRING, description: `Terms and conditions for the quotation. If not found in user input, default to: "${defaultTermsAndConditions}"` }
        },
        required: ['clientDetails', 'tiles', 'materials', 'checklist', 'workmanshipRate', 'maintenance', 'termsAndConditions']
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
            *   **Tile Sizes:** You MUST robustly identify tile sizes in various formats like "60x60", "60 by 60", "60 x 60cm", "600x600mm", or "30-60". Normalize the extracted size into a simple "WidthxHeight" format (e.g., "60x60", "30x60"). If no size is specified for a tile category, the value for 'size' in the JSON MUST be an empty string "".
            *   **Tile Categories:** Identify categories like 'Toilet Wall', 'Toilet Floor', 'Kitchen Wall', 'Kitchen Floor', 'Rooms', 'Long Lobby', 'Step', 'External Wall', and any other custom ones.
            *   **Quantities & Calculation Logic:** This is the most critical part. You MUST follow these rules strictly:
                *   **If BOTH 'm²' and 'cartons' are provided:** Trust the user's input. Use the provided numbers directly. DO NOT recalculate them.
                *   **If ONLY 'm²' is provided:** You MUST calculate 'cartons'. Use the exact formula: \`cartons = (m² / [appropriate m²/carton rate]) * ${wastageFactor}\`. The result MUST be rounded up to the next whole number (e.g., 40.1 becomes 41).
                *   **If ONLY 'cartons' are provided:** You MUST calculate 'm²'. Use the exact formula: \`m² = cartons * [appropriate m²/carton rate]\`.
                *   **If BOTH 'm²' and 'cartons' are missing for a category that is mentioned:** You MUST set both 'cartons' and 'm²' to 0 for that category. Do not invent or assume quantities.
            *   **Coverage Rates for Calculation:** Use these exact rates when you need to calculate 'cartons' from 'm²'.
                *   **Sitting Room:** If category contains 'Sitting Room', 'Living Room', or 'Parlour', you MUST use: ${sittingRoomTileM2PerCarton} m²/carton.
                *   **Wall Tiles:** For any wall category (e.g., 'Toilet Wall', 'Kitchen Wall'), you MUST use: ${wallTileM2PerCarton} m²/carton.
                *   **General Floor:** For all other floor types ('Toilet Floor', 'Room', 'Lobby', etc.), you MUST use: ${floorTileM2PerCarton} m²/carton.
                *   **External Wall:** For 'External Wall' categories, you MUST use: ${externalWallTileM2PerCarton} m²/carton.
                *   **Step:** For 'Step' or 'Staircase' categories, you MUST use: ${stepTileM2PerCarton} m²/carton.
            *   **Tile Type & Unit Price Defaults (NGN):** Classify tiles and assign default unit prices based on the category name, following this specific order of priority. If a user provides a price, that price ALWAYS overrides these defaults.
                1.  **Sitting Room:** If category contains 'Sitting Room', 'Living Room', or 'Parlour', classify as 'Floor' tile, price: ${sittingRoomTilePrice}.
                2.  **External Wall:** If category contains 'External Wall', 'Outside Wall', or 'Facade', classify as 'External Wall', price: ${externalWallTilePrice}.
                3.  **Step:** If category contains 'Step' or 'Staircase', classify as 'Step', price: ${stepTilePrice}.
                4.  **Wall:** If category contains 'Wall' (but not 'External Wall'), 'Toilet Wall', 'Bathroom Wall', or 'Kitchen Wall', classify as 'Wall', price: ${wallTilePrice}.
                5.  **Floor:** If category contains 'Floor', 'Room', 'Lobby', 'Toilet Floor', 'Kitchen Floor', or 'Bathroom Floor', classify as 'Floor', price: ${floorTilePrice}.
                6.  **Unknown:** If no keywords match, classify as 'Unknown' and use the general floor tile price: ${floorTilePrice}.
            *   **Materials:** Extract materials like 'Cement', 'White Cement', 'Sand'. If unit prices are missing, you MUST use these specific default prices (in NGN):
                *   Cement (per bag): ${cementPrice}
                *   White Cement (per bag): ${whiteCementPrice}
                *   Sharp Sand: ${sharpSandPrice}
                *   For any other materials not listed above, use reasonable market estimates in NGN.
                *   **Recognized Units:** When determining the 'unit' for a material, prioritize from this list: [${customMaterialUnits.join(', ')}]. If the unit is not in this list but is mentioned, use the mentioned unit.
            *   **Rates:**
                *   Workmanship rate per m²: Default is ${workmanshipRate}.
                *   Maintenance fee: Extract this if explicitly mentioned. **If not mentioned, set it to 0.**
            *   **Profit:** Extract profit only if explicitly mentioned as a percentage. Otherwise, the field should be null.
            *   **Terms & Conditions**: If the user provides terms, use them. Otherwise, default to: "${defaultTermsAndConditions}".
        
        3.  **Generate a Checklist:**
            ${showChecklistDefault
                ? `*   Based on the job description, create a simple checklist of 3-5 key tasks or stages for the project (e.g., 'Surface Preparation', 'Tiling', 'Grouting', 'Cleanup').
                    *   The 'checked' status for all items MUST be 'false' initially. If the job description is too vague to create a list, provide a generic one.
                    ${addCheckmateDefault ? `*   You MUST add a final item to the checklist with the exact text "Checkmate".` : ''}`
                : `*   The user has disabled checklists. You MUST return an empty array [] for the 'checklist' property in the JSON.`
            }
            
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
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to parse quotation data from AI response.");
    }
};

export const getAiSummaryForTts = async (quotation: QuotationData, grandTotal: number): Promise<string> => {
    const prompt = `
        You are a helpful assistant for a professional tiler.
        Your task is to create a brief, conversational, and natural-sounding summary of the following quotation JSON data.
        The summary is intended to be read aloud via text-to-speech. Make it sound like a person giving a quick, friendly overview.

        **Quotation Data:**
        \`\`\`json
        ${JSON.stringify({ client: quotation.clientDetails, tiles: quotation.tiles, materials: quotation.materials }, null, 2)}
        \`\`\`

        **Key Information:**
        *   The final grand total for this project is ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN'}).format(grandTotal)}.

        **Instructions:**
        1.  Start by addressing the project or client. e.g., "Alright, here is the summary for the ${quotation.clientDetails.projectName || quotation.clientDetails.clientName} quote."
        2.  Briefly mention the main areas being tiled or the total number of tile types. Don't list every single tile. Just give a high-level overview. For example: "Looks like we are covering about ${quotation.tiles.reduce((acc, t) => acc + t.sqm, 0).toFixed(0)} square meters across a few key areas like the kitchen and bathrooms."
        3.  Briefly mention one or two key materials if they stand out (e.g., a large quantity of cement).
        4.  Clearly state the final "Grand Total". You must use the value provided above. Spell out the currency for a more natural sound, for example, "one million, two hundred thousand Naira".
        5.  Keep the entire summary concise and friendly, ideally under 45 seconds when spoken.
        6.  Return ONLY the summary text, ready to be converted to speech. Do not add any extra formatting, explanations, or markdown.

        **Example Output (DO NOT COPY, JUST FOR STYLE):**
        "Okay, I have prepared the quote for the Lekki Residence project for Mr. John. We will be tiling three main areas, totaling about 110 square meters. The main materials are 60 bags of cement and some white cement. The grand total for the project comes to one million, two hundred thirty-four thousand, five hundred sixty-seven Naira."
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini for TTS summary:", error);
        throw new Error("Failed to generate audio summary.");
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
                        prebuiltVoiceConfig: {voiceName: 'Kore' }, // A standard, clear voice
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