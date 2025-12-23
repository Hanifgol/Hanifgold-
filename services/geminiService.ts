import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Settings, QuotationData } from '../types';

// Lazy initialization of the AI client
let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (aiInstance) {
    return aiInstance;
  }
  
  const API_KEY = (import.meta as any).env?.VITE_GOOGLE_API_KEY || (process as any).env?.VITE_GOOGLE_API_KEY;
  
  if (API_KEY) {
    const maskedKey = API_KEY.length > 8 
      ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` 
      : '****';
    console.log(`[Gemini Service] Initializing with API Key: ${maskedKey}`);
  } else {
    console.error("[Gemini Service] CRITICAL: API_KEY is missing.");
    throw new Error("API Key is missing. Please configure VITE_GOOGLE_API_KEY.");
  }
  
  aiInstance = new GoogleGenAI(API_KEY);
  return aiInstance;
}

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
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      imagePart,
      { text: "Extract all handwritten or printed text from this tiling job note. Return only the extracted text." }
    ]);
    const response = await result.response;
    return response.text().trim();
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
    ]
  };
  
  const sizePriceRules = tilePricesBySize && tilePricesBySize.length > 0 
    ? tilePricesBySize.map(r => `* Size "${r.size}" -> Use Price: ${r.price} NGN`).join(\n')
: 'No specific size defaults configured.';
  
