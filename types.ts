
export interface Adjustment {
  description: string;
  amount: number;
}

export interface Tile {
  category: string;
  cartons: number;
  sqm: number;
  tileType: 'Wall' | 'Floor' | 'External Wall' | 'Step' | 'Unknown';
  unitPrice: number;
  size?: string;
  group?: string;
}

export interface Material {
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  isCalculated?: boolean;
  calculationLogic?: string; // e.g., "1 bag per 4m2 area"
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
}

export interface ClientDetails {
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail?: string;
  projectName: string;
  showClientName: boolean;
  showClientAddress: boolean;
  showClientPhone: boolean;
  showProjectName: boolean;
  clientId?: string;
}

export interface ChecklistItem {
    item: string;
    checked: boolean;
}

export interface QuotationData {
  id: string;
  date: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Invoiced';
  clientDetails: ClientDetails;
  tiles: Tile[];
  materials: Material[];
  workmanshipRate: number;
  maintenance: number;
  profitPercentage: number | null;
  termsAndConditions?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  dueDate?: number;
  isBulkGenerated?: boolean;
  checklist?: ChecklistItem[];
  addCheckmate?: boolean;
  showChecklist?: boolean;
  showMaterials?: boolean;
  showAdjustments?: boolean;
  adjustments: Adjustment[];
  depositPercentage: number | null;
  
  showBankDetails?: boolean;
  showTerms?: boolean;
  showWorkmanship?: boolean;
  showMaintenance?: boolean;
  showTax?: boolean;
  showCostSummary?: boolean;
  
  proTips?: string[]; // Technical advice for the job
  siteAnalysis?: string; // AI analysis of site conditions
  
  aiRefinementHistory?: string[];
}

export interface InvoiceData {
  id: string;
  quotationId: string;
  invoiceNumber: string;
  invoiceDate: number;
  dueDate: number;
  status: 'Unpaid' | 'Paid' | 'Overdue';
  clientDetails: ClientDetails;
  tiles: Tile[];
  materials: Material[];
  workmanshipRate: number;
  maintenance: number;
  profitPercentage: number | null;
  paymentTerms: string;
  bankDetails: string;
  invoiceNotes: string;
  paymentDate?: number;
  showMaterials?: boolean;
  showAdjustments?: boolean;
}

export interface Expense {
  id: string;
  date: number;
  category: string;
  description: string;
  amount: number;
  quotationId?: string;
}

export interface Settings {
  wallTilePrice: number;
  floorTilePrice: number;
  sittingRoomTilePrice: number;
  externalWallTilePrice: number;
  stepTilePrice: number;
  bedroomTilePrice: number;
  toiletWallTilePrice: number;
  toiletFloorTilePrice: number;
  kitchenWallTilePrice: number;
  kitchenFloorTilePrice: number;
  cementPrice: number;
  whiteCementPrice: number;
  sharpSandPrice: number;
  workmanshipRate: number;
  wastageFactor: number;
  tilePricesBySize: { size: string; price: number }[];
  wallTileM2PerCarton: number;
  floorTileM2PerCarton: number;
  sittingRoomTileM2PerCarton: number;
  roomTileM2PerCarton: number;
  externalWallTileM2PerCarton: number;
  stepTileM2PerCarton: number;
  toiletWallTileM2PerCarton: number;
  toiletFloorTileM2PerCarton: number;
  kitchenWallTileM2PerCarton: number;
  kitchenFloorTileM2PerCarton: number;
  defaultToiletWallSize: string;
  defaultToiletFloorSize: string;
  defaultRoomFloorSize: string;
  defaultSittingRoomSize: string;
  defaultKitchenWallSize: string;
  defaultKitchenFloorSize: string;
  taxPercentage: number;
  showTermsAndConditions: boolean;
  showUnitPrice: boolean;
  showSubtotal: boolean;
  showMaintenance: boolean;
  showTileSize: boolean;
  showTax: boolean;
  showChecklistDefault: boolean;
  showMaterialsDefault: boolean;
  showAdjustmentsDefault: boolean;
  showDeposit: boolean;
  companyName: string;
  companySlogan: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  documentTitle: string;
  companyLogo: string;
  companySignature: string;
  accentColor: string;
  headerLayout: 'modern' | 'classic' | 'minimalist';
  footerText: string;
  customMaterialUnits: string[];
  defaultTermsAndConditions: string;
  defaultExpenseCategories: string[];
  addCheckmateDefault: boolean;
  defaultDepositPercentage: number;
  invoicePrefix: string;
  defaultBankDetails: string;
  defaultInvoiceNotes: string;
  paymentUrl: string;
  showQRCode: boolean;
}
