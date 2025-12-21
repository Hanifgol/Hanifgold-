
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Settings, QuotationData } from '../types';

// Lazy initialization of the AI client
let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
    if (aiInstance) {
        return aiInstance;
    }
  const API_KEY = process.env.VITE_GOOGLE_API_KEY;    
    // Diagnostic log for API Key presence
    if (API_KEY) {
        const maskedKey = API_KEY.length > 8 
            ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` 
            : '****';
        console.log(`[Gemini Service] Initializing with API Key: ${maskedKey}`);
    } else {
        console.error("[Gemini Service] CRITICAL: process.env.API_KEY is undefined. Check your Vite environment variable mapping.");
        throw new Error("API Key is missing. Please configure VITE_GOOGLE_API_KEY.");
    }
    
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance;
}


// Helper function to convert File to a GoogleGenerativeAI.Part
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve('');
      }
    };
    reader.readAsDataURL(file);
  });
  const data = await base64EncodedDataPromise;
  return {
    inlineData: { data, mimeType: file.type },
  };
}

export const getTextFromImageAI = async (imageFile: File): Promise<string> => {
    try {
        const ai = getAiClient();
        const imagePart = await fileToGenerativePart(imageFile);
        console.log("[Gemini Service] Sending Vision request...");
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [
                imagePart,
                { text: "Extract all handwritten or printed text from this tiling job note. Return only the extracted text." }
            ]},
        });
        
        if (!response.text) {
            throw new Error("No text content in response.");
        }
        
        return response.text.trim();
    } catch (error: any) {
        console.error("[Gemini Service] Vision Error:", error);
        throw new Error(`OCR Failed: ${error.message}`);
    }
};

export const generateQuotationFromAI = async (inputText: string, settings: Settings, addCheckmateDefault: boolean, showChecklistDefault: boolean): Promise<any> => {
    const {
        wallTilePrice, floorTilePrice, sittingRoomTilePrice, externalWallTilePrice, stepTilePrice,
        bedroomTilePrice, toiletWallTilePrice, toiletFloorTilePrice, kitchenWallTilePrice, kitchenFloorTilePrice,
        cementPrice, whiteCementPrice, sharpSandPrice, workmanshipRate,
        wallTileM2PerCarton, floorTileM2PerCarton, sittingRoomTileM2PerCarton, roomTileM2PerCarton,
        externalWallTileM2PerCarton, stepTileM2PerCarton, toiletWallTileM2PerCarton, toiletFloorTileM2PerCarton,
        kitchenWallTileM2PerCarton, kitchenFloorTileM2PerCarton,
        defaultToiletWallSize, defaultToiletFloorSize, defaultRoomFloorSize, defaultSittingRoomSize,
        defaultKitchenWallSize, defaultKitchenFloorSize,
        defaultTermsAndConditions, tilePricesBySize,
    } = settings;
    
    // Strict schema according to @google/genai standards
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            clientDetails: {
                type: Type.OBJECT,
                properties: {
                    clientName: { type: Type.STRING },
                    clientAddress: { type: Type.STRING },
                    clientPhone: { type: Type.STRING },
                    projectName: { type: Type.STRING },
                },
                required: ['clientName', 'clientAddress', 'clientPhone', 'projectName'],
                propertyOrdering: ['clientName', 'clientAddress', 'clientPhone', 'projectName']
            },
            tiles: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        group: { type: Type.STRING },
                        cartons: { type: Type.NUMBER },
                        sqm: { type: Type.NUMBER },
                        size: { type: Type.STRING },
                        tileType: { type: Type.STRING }, 
                        unitPrice: { type: Type.NUMBER },
                    },
                    required: ['category', 'group', 'cartons', 'sqm', 'size', 'tileType', 'unitPrice'],
                    propertyOrdering: ['category', 'group', 'sqm', 'cartons', 'size', 'tileType', 'unitPrice']
                }
            },
            materials: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        item: { type: Type.STRING },
                        quantity: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        unitPrice: { type: Type.NUMBER },
                    },
                    required: ['item', 'quantity', 'unit', 'unitPrice'],
                    propertyOrdering: ['item', 'quantity', 'unit', 'unitPrice']
                }
            },
            adjustments: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                    },
                    required: ['description', 'amount']
                }
            },
            checklist: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        item: { type: Type.STRING },
                        checked: { type: Type.BOOLEAN }
                    },
                    required: ['item', 'checked']
                }
            },
            workmanshipRate: { type: Type.NUMBER },
            maintenance: { type: Type.NUMBER },
            profitPercentage: { type: Type.NUMBER },
            depositPercentage: { type: Type.NUMBER },
            termsAndConditions: { type: Type.STRING }
        },
        required: [
            'clientDetails', 'tiles', 'materials', 'checklist', 'adjustments', 
            'workmanshipRate', 'maintenance', 'profitPercentage', 'depositPercentage', 'termsAndConditions'
        ],
        propertyOrdering: [
            'clientDetails', 'tiles', 'materials', 'adjustments', 'checklist', 
            'workmanshipRate', 'maintenance', 'profitPercentage', 'depositPercentage', 'termsAndConditions'
        ]
    };
    
    const sizePriceRules = tilePricesBySize && tilePricesBySize.length > 0 
        ? tilePricesBySize.map(r => `* Size "${r.size}" -> Use Price: ${r.price} NGN`).join('\n')
        : 'No specific size defaults configured.';

    const prompt = `
        You are "Tiling Quotation Formatter & Calculator AI".
        Convert the following rough text into a professional tiling quotation JSON.
        
        Input Text:
        """
        ${inputText}
        """

        STRICT CALCULATION RULES:
        1. Abbreviations: TW=Toilet Wall, TF=Toilet Floor, KW=Kitchen Wall, KF=Kitchen Floor, SR=Sitting Room, PASS=Passage, EXT=External Wall, STEP=Step.
        2. Cartons Calculation: cartons = ceil(sqm / rate). 
           Rates (m2/ctn): SR=${sittingRoomTileM2PerCarton}, Room=${roomTileM2PerCarton}, TW=${toiletWallTileM2PerCarton}, TF=${toiletFloorTileM2PerCarton}, KW=${kitchenWallTileM2PerCarton}, KF=${kitchenFloorTileM2PerCarton}, Wall=${wallTileM2PerCarton}, Floor=${floorTileM2PerCarton}, EXT=${externalWallTileM2PerCarton}, STEP=${stepTileM2PerCarton}.
        3. Sizes: If missing, use: TW/KW=${defaultToiletWallSize}, TF/KF/Room=${defaultToiletFloorSize}, SR=${defaultSittingRoomSize}.
        4. Unit Prices: 
           - Highest Priority: Any price specified in the user text (e.g. "@ 5000").
           - Second Priority: Rules based on tile size:
             ${sizePriceRules}
           - Third Priority (Area Defaults): SR=${sittingRoomTilePrice}, Room=${bedroomTilePrice}, TW=${toiletWallTilePrice}, TF=${toiletFloorTilePrice}, KW=${kitchenWallTilePrice}, KF=${kitchenFloorTilePrice}, EXT=${externalWallTilePrice}, STEP=${stepTilePrice}, General Wall=${wallTilePrice}, General Floor=${floorTilePrice}.
        5. Materials: Cement=${cementPrice}, White Cement=${whiteCementPrice}, Sand=${sharpSandPrice}.
        6. Rates: Workmanship=${workmanshipRate}. Maintenance=0 unless specified.
        7. Terms: Use "${defaultTermsAndConditions}".
        8. Checklist: Generate 3-5 tasks${addCheckmateDefault ? ' including "Checkmate"' : ''}.
    `;
    
    try {
        const ai = getAiClient();
        console.log("[Gemini Service] Generating structured quotation with gemini-3-pro-preview...");
        
        // FIX: Completed the call with prompt and config including responseSchema
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema as any,
            }
        });

        if (!response.text) {
            throw new Error("No text content in response.");
        }
        
        return JSON.parse(response.text.trim());
    } catch (error: any) {
        console.error("[Gemini Service] Generation Error:", error);
        throw error;
    }
};

// FIX: Added missing exported function getAiSummaryForTts
export const getAiSummaryForTts = async (data: QuotationData, totalAmount: number): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `Summarize this tiling quotation for a client in a friendly, professional way. 
        Mention the project name "${data.clientDetails.projectName}", the client "${data.clientDetails.clientName}", 
        the total cost of ${totalAmount} Naira, and key materials or tiles used. Keep it under 100 words.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });
        return response.text || "No summary available.";
    } catch (error) {
        console.error("Error generating summary for TTS:", error);
        return "Failed to generate quotation summary.";
    }
};

// FIX: Added missing exported function generateSpeechFromText
export const generateSpeechFromText = async (text: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
            generationConfig: {
                responseModalities: [Modality.AUDIO],
                speechgenerationConfig: {
                    voicegenerationConfig: {
                        prebuiltVoicegenerationConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    } catch (error) {
        console.error("Error generating speech:", error);
        throw error;
    }
};
