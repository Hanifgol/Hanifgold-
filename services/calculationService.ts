
import { QuotationData, InvoiceData, Settings } from '../types';

/**
 * A centralized function to calculate all financial totals for a quotation or invoice.
 * This ensures consistency across the entire application (display, history, exports, etc.).
 * It safely handles potentially non-numeric data by casting values to Number.
 */
export const calculateTotals = (data: QuotationData | InvoiceData | null, settings: Settings) => {
    if (!data) {
        return {
            totalSqm: 0,
            totalTileCost: 0,
            totalMaterialCost: 0,
            workmanshipCost: 0,
            workmanshipAndMaintenance: 0,
            profitAmount: 0,
            subtotal: 0,
            totalAdjustments: 0,
            taxAmount: 0,
            grandTotal: 0,
            depositAmount: 0
        };
    }

    const { tiles, materials, workmanshipRate, maintenance, profitPercentage } = data;
    
    // Flags logic: prefer data property if present, else fallback to settings or default.
    // For invoices, they might not have these new flags, so defaults are important.
    const showTax = 'showTax' in data ? data.showTax : settings.showTax;
    const showMaintenance = 'showMaintenance' in data ? data.showMaintenance : settings.showMaintenance;
    const showWorkmanship = 'showWorkmanship' in data ? data.showWorkmanship : true;
    
    const taxPercentage = settings.taxPercentage;

    // Default to true if undefined for backward compatibility
    const showMaterials = data.showMaterials ?? true;
    const showAdjustments = data.showAdjustments ?? true;

    // Robust check: ensure arrays are arrays
    const safeTiles = Array.isArray(tiles) ? tiles : [];
    const safeMaterials = Array.isArray(materials) ? materials : [];

    // Added explicit type to acc to fix potential arithmetic operation errors
    const totalSqm = safeTiles.reduce((acc: number, tile) => acc + (Number(tile.sqm) || 0), 0);
    // Added explicit type to acc to fix potential arithmetic operation errors
    const totalTileCost = safeTiles.reduce((acc: number, tile) => acc + ((Number(tile.cartons) || 0) * (Number(tile.unitPrice) || 0)), 0);
    
    // Calculate material cost only if the section is shown
    // Added explicit type to acc to fix potential arithmetic operation errors
    const totalMaterialCost = showMaterials 
        ? safeMaterials.reduce((acc: number, mat) => acc + ((Number(mat.quantity) || 0) * (Number(mat.unitPrice) || 0)), 0)
        : 0;
    
    // If workmanship is hidden, cost is 0
    const workmanshipCost = showWorkmanship ? (totalSqm * (Number(workmanshipRate) || 0)) : 0;
    const workmanshipAndMaintenance = workmanshipCost + (showMaintenance ? (Number(maintenance) || 0) : 0);
    
    const preProfitTotal = totalTileCost + totalMaterialCost + workmanshipAndMaintenance;
    const profitAmount = profitPercentage ? preProfitTotal * ((Number(profitPercentage) || 0) / 100) : 0;
    
    const subtotal = preProfitTotal + profitAmount;

    let totalAdjustments = 0;
    // Handle quotation adjustments only if shown
    if (showAdjustments && 'adjustments' in data && Array.isArray(data.adjustments)) {
        // Added explicit type to acc to fix potential arithmetic operation errors
        totalAdjustments = data.adjustments.reduce((acc: number, adj) => acc + (Number(adj.amount) || 0), 0);
    }

    const postAdjustmentSubtotal = subtotal + totalAdjustments;
    const taxAmount = showTax ? postAdjustmentSubtotal * ((Number(taxPercentage) || 0) / 100) : 0;
    const grandTotal = postAdjustmentSubtotal + taxAmount;
    
    let depositAmount = 0;
    if ('depositPercentage' in data && data.depositPercentage) {
        depositAmount = grandTotal * ((Number(data.depositPercentage) || 0) / 100);
    }

    return {
        totalSqm,
        totalTileCost,
        totalMaterialCost,
        workmanshipCost,
        workmanshipAndMaintenance,
        profitAmount,
        subtotal,
        totalAdjustments,
        taxAmount,
        grandTotal,
        depositAmount
    };
};
