

export interface Tile {
  category: string;
  cartons: number;
  sqm: number;
  tileType: 'Wall' | 'Floor' | 'External Wall' | 'Step' | 'Unknown';
  unitPrice: number;
  // confidence: number; // Removed as per user request to hide debug info
  size?: string;
}

export interface Material {
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  // confidence: number; // Removed as per user request to hide debug info
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface ClientDetails {
  clientName: string;
  clientAddress: string;
  clientPhone: string;
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
  date: number; // timestamp
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Invoiced';
  clientDetails: ClientDetails;
  tiles: Tile[];
  materials: Material[];
  workmanshipRate: number;
  maintenance: number;
  profitPercentage: number | null;
  // This field is for user-provided terms and will be populated by the AI
  termsAndConditions?: string;
  invoiceId?: string;
  isBulkGenerated?: boolean;
  checklist?: ChecklistItem[];
  addCheckmate?: boolean;
  showChecklist?: boolean;
}

export interface InvoiceData {
  id: string;
  quotationId: string;
  invoiceNumber: string;
  invoiceDate: number; // timestamp
  dueDate: number; // timestamp
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
  discountType: 'none' | 'percentage' | 'amount';
  discountValue: number;
  paymentDate?: number;
}

export interface Expense {
  id: string;
  date: number; // timestamp
  category: string;
  description: string;
  amount: number;
  quotationId?: string; // Optional link to a project
}


export interface Settings {
  // Pricing & Calculation
  wallTilePrice: number;
  floorTilePrice: number;
  sittingRoomTilePrice: number;
  externalWallTilePrice: number;
  stepTilePrice: number;
  cementPrice: number;
  whiteCementPrice: number;
  sharpSandPrice: number;
  workmanshipRate: number;
  wastageFactor: number; // e.g., 1.10 for 10%
  wallTileM2PerCarton: number;
  floorTileM2PerCarton: number;
  sittingRoomTileM2PerCarton: number;
  externalWallTileM2PerCarton: number;
  stepTileM2PerCarton: number;
  taxPercentage: number;
  
  // Display Options
  showTermsAndConditions: boolean;
  showUnitPrice: boolean;
  showSubtotal: boolean;
  // showConfidence: boolean; // Removed as per user request
  showMaintenance: boolean;
  showTileSize: boolean;
  showTax: boolean;
  showChecklistDefault: boolean;

  // Branding & Company
  companyName: string;
  companySlogan: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  documentTitle: string;
  companyLogo: string; // Base64 encoded image
  accentColor: string;
  headerLayout: 'modern' | 'classic' | 'minimalist';
  footerText: string;


  // Customization
  customMaterialUnits: string[];
  defaultTermsAndConditions: string;
  defaultExpenseCategories: string[];
  addCheckmateDefault: boolean;
  
  // Invoicing
  invoicePrefix: string;
  defaultBankDetails: string;
  defaultInvoiceNotes: string;
  paymentUrl: string;
  showQRCode: boolean;
}