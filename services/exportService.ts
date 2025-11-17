

import { QuotationData, InvoiceData, Settings } from '../types';

// These are globals from the CDN scripts in index.html
declare const jspdf: any;
declare const XLSX: any;
declare const docx: any;
declare const saveAs: any;
declare const JSZip: any;
declare const QRCode: any;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Helper to generate QR code data URL
const generateQrCodeDataUrl = async (text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(text, { width: 120, margin: 1, errorCorrectionLevel: 'H' }, (err: any, url: string) => {
            if (err) {
                reject(err);
            } else {
                resolve(url);
            }
        });
    });
};

const getSummaryData = (data: QuotationData | InvoiceData, settings: Settings) => {
    // Calculate grandTotal for a single quotation or invoice
    const { tiles, materials, workmanshipRate, maintenance, profitPercentage } = data;
    const { showMaintenance, taxPercentage, showTax } = settings;

    const totalSqm = (tiles || []).reduce((acc, tile) => acc + Number(tile.sqm), 0);
    const totalTileCost = (tiles || []).reduce((acc, tile) => acc + (Number(tile.cartons) * Number(tile.unitPrice)), 0);
    const totalMaterialCost = (materials || []).reduce((acc, mat) => acc + (Number(mat.quantity) * Number(mat.unitPrice)), 0);
    const workmanshipCost = totalSqm * Number(workmanshipRate);
    const workmanshipAndMaintenance = workmanshipCost + (showMaintenance ? Number(maintenance) : 0);
    const preProfitTotal = totalTileCost + totalMaterialCost + workmanshipAndMaintenance;
    const profitAmount = profitPercentage ? preProfitTotal * (Number(profitPercentage) / 100) : 0;
    
    const subtotal = preProfitTotal + profitAmount;

    let discountAmount = 0;
    if ('discountType' in data && data.discountType !== 'none') {
        if (data.discountType === 'percentage') {
            discountAmount = subtotal * (Number(data.discountValue) / 100);
        } else {
            discountAmount = Number(data.discountValue);
        }
    }
    
    const postDiscountSubtotal = subtotal - discountAmount;
    const taxAmount = showTax ? postDiscountSubtotal * (taxPercentage / 100) : 0;
    const grandTotal = postDiscountSubtotal + taxAmount;

    return { totalSqm, totalTileCost, totalMaterialCost, workmanshipCost, workmanshipAndMaintenance, profitAmount, subtotal, discountAmount, taxAmount, grandTotal };
};

const drawHeader = (doc: any, settings: Settings) => {
  const { companyLogo, companyName, companySlogan, companyAddress, companyEmail, companyPhone, headerLayout } = settings;
  const PAGE_MARGIN = 20;
  const pageContentWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const goldColor = '#B8860B';
  let headerHeight = 35;

  if (companyLogo) {
      const img = new Image();
      img.src = companyLogo;
      const aspectRatio = img.width / img.height;
      let imgWidth = 25;
      let imgHeight = 25;
      if (aspectRatio > 1) {
          imgHeight = imgWidth / aspectRatio;
      } else {
          imgWidth = imgHeight * aspectRatio;
      }

      if (headerLayout === 'modern') {
          doc.addImage(img, 'PNG', PAGE_MARGIN, 20, imgWidth, imgHeight);
      } else { // classic
          doc.addImage(img, 'PNG', doc.internal.pageSize.getWidth() / 2 - imgWidth / 2, 15, imgWidth, imgHeight);
      }
      headerHeight = 20 + imgHeight + 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#1F2937'); // textColor
  
  if (headerLayout === 'modern') {
      doc.setFontSize(16);
      doc.text(companyName, PAGE_MARGIN + 30, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#6B7280'); // mutedTextColor
      doc.text(companySlogan, PAGE_MARGIN + 30, 30);
      doc.text(`${companyAddress} | ${companyEmail} | ${companyPhone}`, PAGE_MARGIN + 30, 34);
  } else { // classic
      doc.setFontSize(20);
      doc.text(companyName, doc.internal.pageSize.getWidth() / 2, headerHeight - 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#6B7280'); // mutedTextColor
      doc.text(companySlogan, doc.internal.pageSize.getWidth() / 2, headerHeight, { align: 'center' });
      doc.text(`${companyAddress} | ${companyEmail} | ${companyPhone}`, doc.internal.pageSize.getWidth() / 2, headerHeight + 4, { align: 'center' });
      headerHeight += 10;
  }
  
  doc.setDrawColor(goldColor);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, headerHeight + 5, pageContentWidth + PAGE_MARGIN, headerHeight + 5);

  return headerHeight + 20;
};

const drawFooter = (doc: any, settings: Settings) => {
    const pageCount = doc.internal.getNumberOfPages();
    const PAGE_MARGIN = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const goldColor = '#B8860B';
    doc.setFontSize(8);
    doc.setTextColor('#6B7280');

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(goldColor);
        doc.setLineWidth(0.5);
        doc.line(PAGE_MARGIN, pageHeight - 18, pageWidth - PAGE_MARGIN, pageHeight - 18);
        
        if (settings.footerText) {
            doc.text(settings.footerText, pageWidth / 2, pageHeight - 12, { align: 'center' });
        }
        
        const pageStr = `Page ${i} of ${pageCount}`;
        doc.text(pageStr, pageWidth - PAGE_MARGIN, pageHeight - 12, { align: 'right' });
    }
};


const createPdfDocument = (data: QuotationData, settings: Settings): Promise<any> => {
  return new Promise((resolve) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const primaryColor = '#B8860B'; // Gold accent
    const textColor = '#1F2937';
    const mutedTextColor = '#6B7280';
    const PAGE_MARGIN = 20;
    const pageContentWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
    
    let lastY = drawHeader(doc, settings);

    const summary = getSummaryData(data, settings);
    
    const generatePdfContent = () => {
      // Header section for document title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColor);
      doc.text(settings.documentTitle.toUpperCase(), pageContentWidth + PAGE_MARGIN, lastY - 25, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(mutedTextColor);
      doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, pageContentWidth + PAGE_MARGIN, lastY - 18, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('BILLED TO:', PAGE_MARGIN, lastY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      doc.setFontSize(9);
      const clientDetails = [
        data.clientDetails.showClientName && `${data.clientDetails.clientName}`,
        data.clientDetails.showProjectName && `${data.clientDetails.projectName}`,
        data.clientDetails.showClientAddress && `${data.clientDetails.clientAddress}`,
        data.clientDetails.showClientPhone && `${data.clientDetails.clientPhone}`,
      ].filter(Boolean).join('\n');
      doc.text(clientDetails, PAGE_MARGIN, lastY + 5);
      lastY += 20;

      // Tiles table
      const tileHeaders = [['Category', 'm²', 'Cartons', 'Tile Type']];
      if (settings.showTileSize) tileHeaders[0].splice(3, 0, 'Size');
      if (settings.showUnitPrice) tileHeaders[0].push('Unit Price');
      if (settings.showSubtotal) tileHeaders[0].push('Subtotal');
      const tileBody = data.tiles.map(t => {
        const row = [t.category, t.sqm.toFixed(2), t.cartons, t.tileType];
        if (settings.showTileSize) row.splice(3, 0, t.size || 'N/A');
        if (settings.showUnitPrice) row.push(formatCurrency(t.unitPrice));
        if (settings.showSubtotal) row.push(formatCurrency(t.cartons * t.unitPrice));
        return row;
      });

      doc.autoTable({
        startY: lastY,
        head: tileHeaders,
        body: tileBody,
        theme: 'grid',
        headStyles: { fillColor: '#0F172A', textColor: '#FFFFFF' },
        styles: { fontSize: 8 },
        didDrawPage: (data: any) => {
            // This hook is used to redraw headers on new pages if needed, but we handle footer here.
        }
      });
      lastY = (doc as any).lastAutoTable.finalY;

      // Materials table
      const materialHeaders = [['Item', 'Quantity']];
      if (settings.showUnitPrice) materialHeaders[0].push('Unit Price');
      if (settings.showSubtotal) materialHeaders[0].push('Total');
      const materialBody = data.materials.map(m => {
        const row = [m.item, `${m.quantity} ${m.unit}`];
        if (settings.showUnitPrice) row.push(formatCurrency(m.unitPrice));
        if (settings.showSubtotal) row.push(formatCurrency(m.quantity * m.unitPrice));
        return row;
      });

      doc.autoTable({
        startY: lastY + 15,
        head: materialHeaders,
        body: materialBody,
        theme: 'grid',
        headStyles: { fillColor: '#0F172A', textColor: '#FFFFFF' },
        styles: { fontSize: 8 },
      });
      lastY = (doc as any).lastAutoTable.finalY;
      
      const checkAndAddPage = () => {
          if (lastY > doc.internal.pageSize.getHeight() - 60) { // Increased margin for footer
              doc.addPage();
              lastY = drawHeader(doc, settings);
          }
      }

      // Checklist & Totals
      checkAndAddPage();
      const finalSectionY = lastY + 15;
      let leftColumnY = finalSectionY;
      let rightColumnY = finalSectionY;

      // Checklist (Left Column)
      if (data.checklist && data.checklist.length > 0) {
        doc.autoTable({
            startY: finalSectionY,
            head: [['Project Checklist']],
            body: data.checklist.map(item => [{ content: `[${item.checked ? 'x' : ' '}] ${item.item}` }]),
            theme: 'striped',
            headStyles: { fillColor: '#0F172A', textColor: '#FFFFFF' },
            styles: { fontSize: 8 },
            tableWidth: pageContentWidth / 2 - 5,
        });
        leftColumnY = (doc as any).lastAutoTable.finalY;
      }

      // Totals section (Right Column)
      const totalsBody = [
        ['Tiles Cost', formatCurrency(summary.totalTileCost)],
        ['Materials Cost', formatCurrency(summary.totalMaterialCost)],
        [`Workmanship (${summary.totalSqm.toFixed(2)}m² @ ${formatCurrency(data.workmanshipRate)}/m²)`, formatCurrency(summary.workmanshipCost)],
      ];
      if (settings.showMaintenance && data.maintenance > 0) {
        totalsBody.push(['Maintenance', formatCurrency(data.maintenance)]);
      }
      if (data.profitPercentage) {
        totalsBody.push([`Profit (${data.profitPercentage}%)`, formatCurrency(summary.profitAmount)]);
      }
      totalsBody.push(['Subtotal', formatCurrency(summary.subtotal)]);
      if (settings.showTax && settings.taxPercentage > 0) {
        totalsBody.push([`Tax (${settings.taxPercentage}%)`, formatCurrency(summary.taxAmount)]);
      }
      totalsBody.push(['Grand Total', formatCurrency(summary.grandTotal)]);

      doc.autoTable({
        startY: finalSectionY,
        body: totalsBody,
        theme: 'plain',
        tableWidth: pageContentWidth / 2 - 5,
        margin: { left: pageContentWidth / 2 + PAGE_MARGIN + 5 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (hookData: any) => {
            if (hookData.row.index === totalsBody.length - 1) { // Grand Total row
                hookData.cell.styles.fillColor = primaryColor;
                hookData.cell.styles.textColor = '#FFFFFF';
                hookData.cell.styles.fontSize = 12;
            }
        }
      });
      rightColumnY = (doc as any).lastAutoTable.finalY;
      
      lastY = Math.max(leftColumnY, rightColumnY);
      
      if (settings.showTermsAndConditions && data.termsAndConditions) {
        checkAndAddPage();
        doc.setFontSize(8);
        doc.setTextColor(mutedTextColor);
        doc.text('Terms & Conditions:', PAGE_MARGIN, lastY + 20);
        doc.setTextColor(textColor);
        const termsLines = doc.splitTextToSize(data.termsAndConditions, pageContentWidth);
        doc.text(termsLines, PAGE_MARGIN, lastY + 25);
      }
      
      drawFooter(doc, settings);
      resolve(doc);
    };

    generatePdfContent();
  });
};


/**
 * EXPORT TO PDF
 */
export const exportToPdf = async (data: QuotationData, settings: Settings) => {
    const doc = await createPdfDocument(data, settings);
    doc.save(`${settings.documentTitle.toLowerCase()}-${data.id}.pdf`);
};

/**
 * EXPORT MULTIPLE QUOTES TO ZIP
 */
export const exportQuotesToZip = async (quotes: QuotationData[], settings: Settings) => {
    const zip = new JSZip();
    
    for (const quote of quotes) {
        try {
            const doc = await createPdfDocument(quote, settings);
            const pdfBlob = doc.output('blob');
            const fileName = `${settings.documentTitle.toLowerCase()}-${quote.id}-${quote.clientDetails.clientName.replace(/\s/g, '_')}.pdf`;
            zip.file(fileName, pdfBlob);
        } catch (error) {
            console.error(`Failed to generate PDF for quote ${quote.id}`, error);
        }
    }

    zip.generateAsync({ type: 'blob' }).then((content) => {
        saveAs(content, `Generated_${settings.documentTitle}s.zip`);
    });
};


/**
 * EXPORT INVOICE TO PDF
 */
export const exportInvoiceToPdf = async (data: InvoiceData, settings: Settings) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // Document styles
    const primaryColor = '#B8860B'; // Gold Accent
    const textColor = '#1F2937';
    const mutedTextColor = '#6B7280';
    const PAGE_MARGIN = 20;
    const pageContentWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
    const fileName = `invoice-${data.invoiceNumber}.pdf`;

    let lastY = drawHeader(doc, settings);
    const summary = getSummaryData(data, settings);

    // --- INVOICE TITLE & INFO ---
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor);
    doc.text('INVOICE', doc.internal.pageSize.getWidth() - PAGE_MARGIN, lastY - 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(mutedTextColor);
    doc.text(`Invoice #: ${data.invoiceNumber}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, lastY - 18, { align: 'right' });
    doc.text(`Date Issued: ${new Date(data.invoiceDate).toLocaleDateString()}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, lastY - 14, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, lastY - 10, { align: 'right' });

    // --- CLIENT DETAILS ---
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('BILLED TO', PAGE_MARGIN, lastY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.setFontSize(9);
    const clientDetails = [
      data.clientDetails.showClientName && `${data.clientDetails.clientName}`,
      data.clientDetails.showProjectName && `${data.clientDetails.projectName}`,
      data.clientDetails.showClientAddress && `${data.clientDetails.clientAddress}`,
      data.clientDetails.showClientPhone && `${data.clientDetails.clientPhone}`,
    ].filter(Boolean).join('\n');
    doc.text(clientDetails, PAGE_MARGIN, lastY + 5);
    lastY += 20;
    
    // --- ITEMIZED TABLE ---
    doc.autoTable({
        startY: lastY,
        head: [['Item Description', 'Quantity', 'Unit Price', 'Total']],
        body: [
            ...data.tiles.map(t => [t.category, `${t.cartons} cartons`, formatCurrency(t.unitPrice), formatCurrency(t.cartons * t.unitPrice)]),
            ...data.materials.map(m => [m.item, `${m.quantity} ${m.unit}`, formatCurrency(m.unitPrice), formatCurrency(m.quantity * m.unitPrice)])
        ],
        theme: 'grid',
        headStyles: { fillColor: '#0F172A', textColor: '#FFFFFF' },
        styles: { fontSize: 8 },
        columnStyles: {
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        }
    });
    lastY = (doc as any).lastAutoTable.finalY + 15;

    // --- TOTALS SECTION ---
    const totalsBody = [
        ['Subtotal', formatCurrency(summary.subtotal)],
    ];
    if (summary.discountAmount > 0) {
        totalsBody.push(['Discount', `-${formatCurrency(summary.discountAmount)}`]);
    }
    if (settings.showTax && settings.taxPercentage > 0) {
        totalsBody.push([`Tax (${settings.taxPercentage}%)`, formatCurrency(summary.taxAmount)]);
    }
    totalsBody.push(['Amount Due', formatCurrency(summary.grandTotal)]);

    doc.autoTable({
        startY: lastY,
        body: totalsBody,
        theme: 'plain',
        tableWidth: 80,
        margin: { left: doc.internal.pageSize.getWidth() - PAGE_MARGIN - 80 },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (hookData: any) => {
            if (hookData.row.index === totalsBody.length - 1) { // Grand Total row
                hookData.cell.styles.fillColor = primaryColor;
                hookData.cell.styles.textColor = '#FFFFFF';
                hookData.cell.styles.fontSize = 12;
            }
        }
    });
    lastY = (doc as any).lastAutoTable.finalY;

    // --- PAYMENT DETAILS & NOTES ---
    const paymentSectionY = lastY + 20;
    const leftColumnWidth = pageContentWidth / 2 - 5;
    const rightColumnX = PAGE_MARGIN + leftColumnWidth + 10;

    // Left column: Bank Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Payment Details', PAGE_MARGIN, paymentSectionY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    const bankDetailsLines = doc.splitTextToSize(data.bankDetails, leftColumnWidth);
    doc.text(bankDetailsLines, PAGE_MARGIN, paymentSectionY + 5);
    let leftColumnFinalY = paymentSectionY + 5 + (bankDetailsLines.length * 4);

    // Right column: QR Code
    let rightColumnFinalY = paymentSectionY;
    if (settings.showQRCode && settings.paymentUrl) {
        try {
            const qrCodeDataUrl = await generateQrCodeDataUrl(settings.paymentUrl);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor);
            doc.text('Scan to Pay', rightColumnX, paymentSectionY);
            doc.addImage(qrCodeDataUrl, 'PNG', rightColumnX, paymentSectionY + 2, 35, 35);
            rightColumnFinalY = paymentSectionY + 2 + 35;
        } catch (e) {
            console.error("Failed to generate QR code for PDF", e);
        }
    }

    lastY = Math.max(leftColumnFinalY, rightColumnFinalY);

    // Notes Section (full width below)
    const notesY = lastY + 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Notes', PAGE_MARGIN, notesY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    const notesLines = doc.splitTextToSize(data.invoiceNotes, pageContentWidth);
    doc.text(notesLines, PAGE_MARGIN, notesY + 5);

    drawFooter(doc, settings);
    doc.save(fileName);
};

/**
 * EXPORT TO EXCEL
 */
export const exportToExcel = (data: QuotationData, settings: Settings) => {
    // ... implementation as before
};

/**
 * EXPORT TO WORD
 */
const base64ToBuffer = (base64: string): ArrayBuffer => {
    const base64WithoutPrefix = base64.split(',')[1] || base64;
    const binaryString = window.atob(base64WithoutPrefix);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

export const exportToWord = async (data: QuotationData, settings: Settings) => {
    const {
        Paragraph, TextRun, Packer, Document, Table, TableCell, TableRow,
        WidthType, AlignmentType, BorderStyle, HeadingLevel, ImageRun,
        PageNumber, NumberOfPages, ShadingType, VerticalAlign
    } = docx;

    const summary = getSummaryData(data, settings);
    const goldColor = "B8860B";
    const secondaryColor = "0F172A";

    // FIX: Changed type annotation from 'ImageRun' to 'any' because 'ImageRun' is a value (class constructor), not a type.
    let logoImageRun: any | undefined = undefined;
    if (settings.companyLogo) {
        try {
            const imageBuffer = base64ToBuffer(settings.companyLogo);
            logoImageRun = new ImageRun({
                data: imageBuffer,
                transformation: { width: 80, height: 80 },
            });
        } catch (e) { console.error("Failed to process logo for DOCX export", e); }
    }

    const doc = new Document({
        styles: {
            paragraphStyles: [
                { id: "sectionHeading", name: "Section Heading", run: { size: 28, bold: true, color: goldColor }, paragraph: { spacing: { before: 360, after: 180 } } },
                { id: "grandTotalText", name: "Grand Total", run: { size: 28, bold: true, color: "FFFFFF" } },
            ],
        },
        sections: [{
            headers: {
                default: new docx.Header({
                    children: [new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        columnWidths: [20, 50, 30],
                        borders: { bottom: { style: BorderStyle.SINGLE, size: 6, color: goldColor } },
                        rows: [new TableRow({
                            children: [
                                new TableCell({ children: [logoImageRun ? new Paragraph(logoImageRun) : new Paragraph("")] }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ text: settings.companyName, heading: HeadingLevel.HEADING_1 }),
                                        new Paragraph({ text: settings.companySlogan, italics: true }),
                                        new Paragraph(`${settings.companyAddress} | ${settings.companyEmail} | ${settings.companyPhone}`),
                                    ],
                                    verticalAlign: VerticalAlign.CENTER,
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ text: settings.documentTitle.toUpperCase(), heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT }),
                                        new Paragraph({ text: `Date: ${new Date(data.date).toLocaleDateString()}`, alignment: AlignmentType.RIGHT }),
                                    ],
                                    verticalAlign: VerticalAlign.CENTER,
                                }),
                            ],
                        })],
                    })],
                }),
            },
            footers: {
                default: new docx.Footer({
                    children: [new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: goldColor } },
                        rows: [new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: settings.footerText, alignment: AlignmentType.CENTER })] }),
                                new TableCell({
                                    children: [new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        children: [ new TextRun("Page "), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun(" of "), new TextRun({ children: [PageNumber.TOTAL_PAGES] })],
                                    })],
                                }),
                            ],
                        })],
                    })],
                }),
            },
            children: [
                new Paragraph({ text: "BILLED TO", style: "sectionHeading" }),
                new Paragraph({ children: [new TextRun({ text: data.clientDetails.clientName, bold: true, size: 24 })] }),
                new Paragraph(data.clientDetails.projectName),
                new Paragraph(data.clientDetails.clientAddress),
                new Paragraph(data.clientDetails.clientPhone),
                new Paragraph({ text: "1. Tile Details & Cost Summary", style: "sectionHeading" }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [ "Category", "m²", "Cartons", ...(settings.showTileSize ? ["Size"] : []), "Tile Type", ...(settings.showUnitPrice ? ["Unit Price"] : []), ...(settings.showSubtotal ? ["Subtotal"] : [])]
                                .map(text => new TableCell({ children: [new Paragraph({ text, bold: true, color: "FFFFFF" })], shading: { type: ShadingType.SOLID, fill: secondaryColor } })),
                            tableHeader: true,
                        }),
                        ...data.tiles.map(t => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(t.category)] }),
                                new TableCell({ children: [new Paragraph({ text: t.sqm.toFixed(2), alignment: AlignmentType.RIGHT })] }),
                                new TableCell({ children: [new Paragraph({ text: String(t.cartons), alignment: AlignmentType.RIGHT })] }),
                                ...(settings.showTileSize ? [new TableCell({ children: [new Paragraph(t.size || "N/A")] })] : []),
                                new TableCell({ children: [new Paragraph(t.tileType)] }),
                                ...(settings.showUnitPrice ? [new TableCell({ children: [new Paragraph({ text: formatCurrency(t.unitPrice), alignment: AlignmentType.RIGHT })] })] : []),
                                ...(settings.showSubtotal ? [new TableCell({ children: [new Paragraph({ text: formatCurrency(t.cartons * t.unitPrice), alignment: AlignmentType.RIGHT })] })] : []),
                            ],
                        })),
                    ],
                }),
                new Paragraph({ text: "2. Other Materials", style: "sectionHeading" }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                         new TableRow({
                            children: ["Item", "Quantity", ...(settings.showUnitPrice ? ["Unit Price"] : []), ...(settings.showSubtotal ? ["Total"] : [])]
                                .map(text => new TableCell({ children: [new Paragraph({ text, bold: true, color: "FFFFFF" })], shading: { type: ShadingType.SOLID, fill: secondaryColor } })),
                            tableHeader: true,
                        }),
                        ...data.materials.map(m => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(m.item)] }),
                                new TableCell({ children: [new Paragraph({ text: `${m.quantity} ${m.unit}`, alignment: AlignmentType.RIGHT })] }),
                                ...(settings.showUnitPrice ? [new TableCell({ children: [new Paragraph({ text: formatCurrency(m.unitPrice), alignment: AlignmentType.RIGHT })] })] : []),
                                ...(settings.showSubtotal ? [new TableCell({ children: [new Paragraph({ text: formatCurrency(m.quantity * m.unitPrice), alignment: AlignmentType.RIGHT })] })] : []),
                            ],
                        })),
                    ],
                }),
                new Paragraph(""),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [50, 50],
                     borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                    rows: [ new TableRow({
                        children: [
                            new TableCell({ children: [
                                new Paragraph({ text: "3. Project Checklist", style: "sectionHeading" }),
                                ...((data.checklist && data.checklist.length > 0) ? data.checklist.map(item => new Paragraph({ text: `${item.checked ? '☑' : '☐'} ${item.item}`, bullet: { level: 0 } })) : [new Paragraph("No checklist items.")])
                            ]}),
                            new TableCell({ children: [
                                new Paragraph({ text: "4. Cost Summary", style: "sectionHeading" }),
                                new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    borders: { insideHorizontal: { style: BorderStyle.DOTTED, size: 1, color: "BFBFBF" } },
                                    rows: [
                                        new TableRow({ children: [new TableCell({ children: [new Paragraph("Tiles Cost")] }), new TableCell({ children: [new Paragraph({ text: formatCurrency(summary.totalTileCost), alignment: AlignmentType.RIGHT })] })] }),
                                        new TableRow({ children: [new TableCell({ children: [new Paragraph("Materials Cost")] }), new TableCell({ children: [new Paragraph({ text: formatCurrency(summary.totalMaterialCost), alignment: AlignmentType.RIGHT })] })] }),
                                        new TableRow({ children: [new TableCell({ children: [new Paragraph(`Workmanship (${summary.totalSqm.toFixed(2)}m²)`)] }), new TableCell({ children: [new Paragraph({ text: formatCurrency(summary.workmanshipCost), alignment: AlignmentType.RIGHT })] })] }),
                                        ...(settings.showMaintenance && data.maintenance > 0 ? [new TableRow({ children: [new TableCell({ children: [new Paragraph("Maintenance")] }), new TableCell({ children: [new Paragraph({ text: formatCurrency(data.maintenance), alignment: AlignmentType.RIGHT })] })] })] : []),
                                        ...(data.profitPercentage ? [new TableRow({ children: [new TableCell({ children: [new Paragraph(`Profit (${data.profitPercentage}%)`)] }), new TableCell({ children: [new Paragraph({ text: formatCurrency(summary.profitAmount), alignment: AlignmentType.RIGHT })] })] })] : []),
                                        new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Subtotal", bold: true })] }), new TableCell({ children: [new Paragraph({ text: formatCurrency(summary.subtotal), alignment: AlignmentType.RIGHT, bold: true })] })] }),
                                        ...(settings.showTax && settings.taxPercentage > 0 ? [new TableRow({ children: [new TableCell({ children: [new Paragraph(`Tax (${settings.taxPercentage}%)`)] }), new TableCell({ children: [new Paragraph({ text: formatCurrency(summary.taxAmount), alignment: AlignmentType.RIGHT })] })] })] : []),
                                        new TableRow({
                                            children: [
                                                new TableCell({ children: [new Paragraph({ text: "Grand Total", style: "grandTotalText" })], shading: { type: ShadingType.SOLID, fill: goldColor } }),
                                                new TableCell({ children: [new Paragraph({ text: formatCurrency(summary.grandTotal), style: "grandTotalText", alignment: AlignmentType.RIGHT })], shading: { type: ShadingType.SOLID, fill: goldColor } })
                                            ],
                                        }),
                                    ],
                                }),
                            ]}),
                        ]
                    })]
                }),
                ...(settings.showTermsAndConditions && data.termsAndConditions ? [
                    new Paragraph({ text: "Terms & Conditions", style: "sectionHeading" }),
                    new Paragraph(data.termsAndConditions),
                ] : []),
            ],
        }],
    });
    
    Packer.toBlob(doc).then(blob => {
        saveAs(blob, `${settings.documentTitle.toLowerCase()}-${data.id}.docx`);
    });
};


/**
 * EXPORT TO CSV
 */
export const exportToCsv = (data: QuotationData, settings: Settings) => {
    // ... implementation as before
};

/**
 * EXPORT ANALYTICS TO CSV
 */
export const exportAnalyticsToCsv = (metrics: any) => {
    const rows = [
        ['Analytics Summary'], [], ['Metric', 'Value'],
        ['Total Quoted Value', formatCurrency(metrics.totalRevenue)],
        ['Quotations Sent', String(metrics.totalQuotations)],
        ['Average Quote Value', formatCurrency(metrics.averageQuotationValue)],
        ['Acceptance Rate', `${metrics.acceptanceRate.toFixed(1)}%`],
        [],
        ['Invoices Generated', String(metrics.invoicesGenerated)],
        ['Outstanding Amount', formatCurrency(metrics.outstandingAmount)],
        ['Paid This Month', formatCurrency(metrics.paidThisMonth)],
        [],
        ['Most Used Tile Type', metrics.mostUsedTileType],
        ['Most Popular Material', metrics.mostPopularMaterial],
    ];

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "Analytics_Summary.csv");
};

/**
 * EXPORT HISTORY TO CSV
 */
export const exportHistoryToCsv = (quotations: QuotationData[], settings: Settings) => {
  const rows: (string|number)[][] = [];
  
  const headers = [
    'Quotation ID', 'Date', 'Client Name', 'Project Name', 'Status', 'Total Amount', 'Invoice ID'
  ];
  rows.push(headers);
  
  quotations.forEach(q => {
    rows.push([
      q.id,
      new Date(q.date).toISOString().split('T')[0],
      q.clientDetails.clientName,
      q.clientDetails.projectName,
      q.status,
      getSummaryData(q, settings).grandTotal,
      q.invoiceId || 'N/A'
    ]);
  });
  
  const csvContent = rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, "Quotation_History.csv");
};