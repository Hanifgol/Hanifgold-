
import { QuotationData, InvoiceData, Settings } from '../types';

/**
 * Logic for generating sequential invoice numbers based on settings and existing records.
 */
export const generateInvoiceNumber = (allInvoices: InvoiceData[], settings: Settings): string => {
    const prefix = settings.invoicePrefix || 'INV';
    const year = new Date().getFullYear();
    let nextSequence = 1;
    
    // Pattern: PREFIX-YEAR-NUMBER (e.g., INV-2023-0001)
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPrefix}-${year}-(\\d+)`);

    allInvoices.forEach(inv => {
        const match = inv.invoiceNumber.match(pattern);
        if (match) {
            const currentNum = parseInt(match[1], 10);
            if (!isNaN(currentNum) && currentNum >= nextSequence) {
                nextSequence = currentNum + 1;
            }
        }
    });

    return `${prefix}-${year}-${String(nextSequence).padStart(4, '0')}`;
};

/**
 * Converts a Quotation object into an Invoice object.
 */
export const createInvoiceFromQuotation = (quotation: QuotationData, settings: Settings, invoiceNumber: string): InvoiceData => {
    return {
        id: crypto.randomUUID(),
        quotationId: quotation.id,
        invoiceNumber: invoiceNumber,
        invoiceDate: Date.now(),
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // Default 7 days
        status: 'Unpaid',
        clientDetails: quotation.clientDetails,
        tiles: quotation.tiles,
        materials: quotation.materials,
        workmanshipRate: quotation.workmanshipRate,
        maintenance: quotation.maintenance,
        profitPercentage: quotation.profitPercentage,
        paymentTerms: 'Due on Receipt',
        bankDetails: settings.defaultBankDetails,
        invoiceNotes: settings.defaultInvoiceNotes,
        showMaterials: quotation.showMaterials,
        showAdjustments: quotation.showAdjustments,
    };
};
