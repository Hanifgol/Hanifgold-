
import { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  wallTilePrice: 5600,
  floorTilePrice: 6500,
  externalWallTilePrice: 6500,
  stepTilePrice: 6500,
  cementPrice: 10000,
  whiteCementPrice: 15000,
  sharpSandPrice: 50000,
  workmanshipRate: 1700,
  wastageFactor: 1.10, // 10% wastage
  wallTileM2PerCarton: 1.5,
  floorTileM2PerCarton: 1.5,
  externalWallTileM2PerCarton: 1.5,
  stepTileM2PerCarton: 1.5,
  termsAndConditions: '1. All prices are final.\n2. 50% advance payment is required to commence work.\n3. This quotation is valid for 30 days.',
  showTermsAndConditions: true,
  showUnitPrice: true,
  showSubtotal: true,
  showConfidence: true,
  showMaintenance: true,
};

export const EXAMPLE_INPUT = `Toilet Wall 61 85m2
Toilet Floor 8 12m2
Kitchen Wall 54 95m2
Kitchen Floor 8 14m2
Rooms 23 60m2
Long Lobby 15 29m2
Step 7 14m2
External Wall 10 14m2
Cement 60 bags
White Cement 50kg
Maintenance 50000
Workmanship 1700`;