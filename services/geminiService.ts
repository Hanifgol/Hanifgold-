
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Settings, QuotationData } from '../types';

/**
 * Robust API key retrieval for both build-time replacement (process.env) 
 * and runtime access (import.meta.env).
 */
const getApiKey = (): string => {
  // Guidelines require process.env.API_KEY usage
  const processKey = process.env.API_KEY;
  // Fallback to Vite-style environment variables for production reliability
  const metaKey = (import.meta as any).env?.VITE_GOOGLE_GEMINI_API_KEY;
  
  return processKey || metaKey || 'AIzaSyAP4aM15Tx-RBQ1PYD8ZymQLPXNwDGZyDg';
};

const generateMockQuotation = (inputText: string, settings: Settings) => {
    const sqmMatch = inputText.match(/(\d+)\s*m2/i);
    const mockSqm = sqmMatch ? parseFloat(sqmMatch[1]) : 50;

    return {
        clientDetails: {
            clientName: "Test Client (Fallback Mode)",
            clientAddress: "Check API Settings",
            clientPhone: "000-000-0000",
            projectName: "Tiling Project",
        },
        tiles: [
            {
                category: "Standard Floor Tiles",
                group: "General",
                cartons: Math.ceil(mockSqm / 1.5),
                sqm: mockSqm,
                size: settings.defaultSittingRoomSize,
                tileType: "Floor",
                unitPrice: settings.sittingRoomTilePrice,
            }
        ],
        materials: [
            { item: "Cement", quantity: Math.ceil(mockSqm / 5), unit: "bags", unitPrice: settings.cementPrice, calculationLogic: "Estimated based on area" },
            { item: "White Cement", quantity: 1, unit: "bags", unitPrice: settings.whiteCementPrice, calculationLogic: "Standard estimation" }
        ],
        adjustments: [],
        checklist: [
            { item: "Surface preparation", checked: false },
            { item: "Grouting", checked: false }
        ],
        workmanshipRate: settings.workmanshipRate,
        maintenance: 0,
        profitPercentage: 10,
        depositPercentage: settings.defaultDepositPercentage,
        termsAndConditions: settings.defaultTermsAndConditions,
        proTips: ["Verify measurements before purchase", "Use spacer lugs for even grout lines"]
    };
};

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
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [
                imagePart,
                { text: "Extract all handwritten or printed text from this tiling job note. Return only the extracted text." }
            ]},
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Gemini OCR Error:", error);
        return "Failed to read image. Please type notes manually.";
    }
};

export const analyzeSiteConditionsAI = async (imageFile: File): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [
                imagePart,
                { text: "Act as a senior tiler. Analyze this site photo. List any potential issues (uneven floors, cracks, damp) and suggested prep materials." }
            ]},
        });
        return response.text?.trim() || "No issues detected.";
    } catch (error) {
        console.error("Gemini Vision Error:", error);
        return "Analysis failed.";
    }
};

const quotationSchema = {
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
            required: ['clientName', 'clientAddress', 'clientPhone', 'projectName']
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
                required: ['category', 'group', 'cartons', 'sqm', 'size', 'tileType', 'unitPrice']
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
                    calculationLogic: { type: Type.STRING },
                },
                required: ['item', 'quantity', 'unit', 'unitPrice']
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
        termsAndConditions: { type: Type.STRING },
        proTips: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['clientDetails', 'tiles', 'materials', 'checklist', 'adjustments', 'workmanshipRate', 'maintenance', 'profitPercentage', 'depositPercentage', 'termsAndConditions', 'proTips']
};

export const generateQuotationFromAI = async (inputText: string, settings: Settings, addCheckmateDefault: boolean, showChecklistDefault: boolean): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const sizePriceRules = settings.tilePricesBySize?.map(r => `* Size "${r.size}" -> ${r.price} NGN`).join('\n') || '';

    const prompt = `
        You are "Tiling Quotation Formatter & Calculator AI".
        Convert this text into a professional quotation JSON.
        Input: "${inputText}"
        Rules:
        1. Units: SR=Sitting, TW=Toilet Wall, etc.
        2. Pricing: ${sizePriceRules}. Default Workmanship: ${settings.workmanshipRate}.
        3. Materials: Sugest cement, grout, and adhesive based on total SQM.
        4. Calculation Logic: In the 'materials' array, explain HOW you got the quantity (e.g., '1 bag per 4m2 based on area').
        5. Pro Tips: Add 2-3 professional technical tips for this specific project.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quotationSchema as any,
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return generateMockQuotation(inputText, settings);
    }
};

export const refineQuotationAI = async (currentData: QuotationData, instruction: string): Promise<QuotationData> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const prompt = `
        Update the following tiling quotation JSON based on this instruction: "${instruction}".
        Keep the JSON structure identical.
        Current JSON: ${JSON.stringify(currentData)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quotationSchema as any,
            }
        });
        return { ...currentData, ...JSON.parse(response.text.trim()) };
    } catch (error) {
        console.error("Refinement failed", error);
        return currentData;
    }
};

export const getAiSummaryForTts = async (data: QuotationData, totalAmount: number): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
        const prompt = `Summarize this quote for ${data.clientDetails.clientName} for project ${data.clientDetails.projectName}. Total: ${totalAmount}. Max 50 words.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt 
        });
        return response.text || "Summary unavailable.";
    } catch (error) {
        console.error("Gemini Summary Error:", error);
        return "Failed to generate summary.";
    }
};

export const generateSpeechFromText = async (text: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { voiceName: 'Kore' },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    } catch (error) {
        console.error("Gemini TTS Error:", error);
        return "";
    }
};
