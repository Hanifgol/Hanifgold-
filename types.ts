

export interface Tile {
  category: string;
  cartons: number;
  sqm: number;
  tileType: 'Wall' | 'Floor' | 'External Wall' | 'Step' | 'Unknown';
  unitPrice: number;
  confidence: number;
}

export interface Material {
  item: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  confidence: number;
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
}

export interface QuotationData {
  clientDetails: ClientDetails;
  tiles: Tile[];
  materials: Material[];
  workmanshipRate: number;
  maintenance: number;
  profitPercentage: number | null;
}

export interface Settings {
  wallTilePrice: number;
  floorTilePrice: number;
  externalWallTilePrice: number;
  stepTilePrice: number;
  cementPrice: number;
  whiteCementPrice: number;
  sharpSandPrice: number;
  workmanshipRate: number;
  wastageFactor: number;
  wallTileM2PerCarton: number;
  floorTileM2PerCarton: number;
  externalWallTileM2PerCarton: number;
  stepTileM2PerCarton: number;
  termsAndConditions: string;
  showTermsAndConditions: boolean;
  showUnitPrice: boolean;
  showSubtotal: boolean;
  showConfidence: boolean;
  showMaintenance: boolean;
}