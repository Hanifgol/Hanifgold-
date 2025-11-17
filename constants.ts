

import { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  // Pricing & Calculation
  wallTilePrice: 5600,
  floorTilePrice: 6500,
  sittingRoomTilePrice: 6800,
  externalWallTilePrice: 6500,
  stepTilePrice: 6500,
  cementPrice: 10000,
  whiteCementPrice: 15000,
  sharpSandPrice: 50000,
  workmanshipRate: 1700,
  wastageFactor: 1.10, // 10% wastage
  wallTileM2PerCarton: 1.5,
  floorTileM2PerCarton: 1.5,
  sittingRoomTileM2PerCarton: 1.5,
  externalWallTileM2PerCarton: 1.5,
  stepTileM2PerCarton: 1.5,
  taxPercentage: 7.5,

  // Display Options
  showTermsAndConditions: true,
  showUnitPrice: true,
  showSubtotal: true,
  // showConfidence: false, // Feature removed from UI
  showMaintenance: true,
  showTileSize: true,
  showTax: false,
  showChecklistDefault: true,

  // Branding & Company
  companyName: 'HANIFGOLD TILING EXPERTS',
  companySlogan: 'Perfect finish. Every tile. Every time.',
  companyAddress: '7 Unity Street, Phase 2 Arigbanwo, Mowe',
  companyEmail: 'hanofihamod094@gmail.com',
  companyPhone: '08063131498',
  documentTitle: 'QUOTATION',
  companyLogo: '',
  accentColor: '#0EA5E9',
  headerLayout: 'modern',
  footerText: 'Thank you for your business! | www.hanifgold.com',

  // Customization
  customMaterialUnits: ['bags', 'kg', 'pcs', 'litres', 'gallons', 'rolls', 'sheets'],
  defaultTermsAndConditions: '1. 50% advance payment is required to commence work.\n2. All materials remain the property of HANIFGOLD TILING EXPERTS until payment is made in full.\n3. This quotation is valid for a period of 30 days from the date of issue.\n4. Any additional work not specified in this quotation will be subject to a separate charge.',
  defaultExpenseCategories: ['Materials', 'Fuel', 'Tools', 'Labor', 'Transportation', 'Marketing', 'Other'],
  addCheckmateDefault: true,
  
  // Invoicing
  invoicePrefix: 'INV',
  defaultBankDetails: 'Bank Name: Your Bank\nAccount Name: Your Company Name\nAccount Number: 1234567890',
  defaultInvoiceNotes: 'Thank you for your business. Please make payments to the account details above.',
  paymentUrl: '',
  showQRCode: true,
};


export const EXAMPLE_INPUT = `Toilet Wall 61 85m2 60x60
Toilet Floor 8 12m2 40x40
Kitchen Wall 54 95m2 30x60
Kitchen Floor 8 14m2 60x60
Sitting Room 23 60m2 80x80
Long Lobby 15 29m2
Step 7 14m2
External Wall 10 14m2
Cement 60 bags
White Cement 50kg
Maintenance 50000
Workmanship 1700`;