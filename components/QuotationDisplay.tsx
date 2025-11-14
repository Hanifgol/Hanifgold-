import React, { useState } from 'react';
import { QuotationData, Settings } from '../types';
import { PdfIcon, LogoIcon, SpeakerIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import { generateSpeechFromText } from '../services/geminiService';

// This is needed because the jsPDF types are not available in this environment
declare const jspdf: any;

// Audio decoding functions
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


interface QuotationDisplayProps {
  data: QuotationData | null;
  isLoading: boolean;
  letterheadSrc: string | null;
  settings: Settings;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};

const ConfidenceBadge: React.FC<{ score: number }> = ({ score }) => {
    const scorePercent = Math.round(score * 100);
    let bgColor = 'bg-green-100 text-green-800';
    let text = `${scorePercent}%`;

    if (score < 0.8) {
        bgColor = 'bg-yellow-100 text-yellow-800';
        text = `~${scorePercent}%`;
    }
     if (score < 0.5) {
        bgColor = 'bg-red-100 text-red-800';
        text = `Low (${scorePercent}%)`;
    }

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
            {text}
        </span>
    );
};


const QuotationDisplay: React.FC<QuotationDisplayProps> = ({ data, isLoading, letterheadSrc, settings }) => {
    const [isTtsLoading, setIsTtsLoading] = useState(false);
    const { 
        showConfidence, 
        showMaintenance, 
        showSubtotal, 
        showUnitPrice,
        termsAndConditions: terms,
        showTermsAndConditions: showTerms
    } = settings;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 font-medium text-lg">AI is analyzing and calculating...</p>
                    <p className="text-gray-500">This may take a moment.</p>
                </div>
            );
        }
        
        if (!data) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gray-50 rounded-xl">
                    <LogoIcon className="w-24 h-24 text-gray-300" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-700">Your Quotation Will Appear Here</h2>
                    <p className="mt-2 text-gray-500 max-w-sm">
                        Fill in the details on the left and click 'Generate Quotation' to see a professional, itemized result.
                    </p>
                </div>
            );
        }

        const { clientDetails, tiles, materials, workmanshipRate, maintenance, profitPercentage } = data;

        const totalSqm = tiles.reduce((acc, tile) => acc + tile.sqm, 0);
        const totalTileCost = tiles.reduce((acc, tile) => acc + tile.cartons * tile.unitPrice, 0);
        const totalMaterialCost = materials.reduce((acc, mat) => acc + mat.quantity * mat.unitPrice, 0);
        const workmanshipCost = totalSqm * workmanshipRate;
        const workmanshipAndMaintenance = workmanshipCost + (showMaintenance ? maintenance : 0);

        const preProfitTotal = totalTileCost + totalMaterialCost + workmanshipAndMaintenance;
        const profitAmount = profitPercentage ? preProfitTotal * (profitPercentage / 100) : 0;
        const grandTotal = preProfitTotal + profitAmount;
        
        const tileTableCols = ['Category', 'Cartons', 'm²', 'Tile Type'];
        if (showUnitPrice) tileTableCols.push('Unit Price');
        if (showSubtotal) tileTableCols.push('Subtotal');
        if (showConfidence) tileTableCols.push('Confidence');
        const tileFooterColSpan = tileTableCols.length - (showSubtotal ? 2 : 1);


        const materialTableCols = ['Item', 'Quantity'];
        if (showUnitPrice) materialTableCols.push('Unit Price');
        if (showSubtotal) materialTableCols.push('Total');
        if (showConfidence) materialTableCols.push('Confidence');
        const materialFooterColSpan = materialTableCols.length - (showSubtotal ? 2 : 1);


        const handleReadAloud = async () => {
            if (!data) return;
            setIsTtsLoading(true);
    
            const summaryText = `
                Here is the quotation for ${clientDetails.projectName || clientDetails.clientName || 'the project'}.
                The total tile cost is ${totalTileCost.toLocaleString()} Naira.
                The total material cost is ${totalMaterialCost.toLocaleString()} Naira.
                The cost for workmanship and maintenance is ${workmanshipAndMaintenance.toLocaleString()} Naira.
                The grand total is ${grandTotal.toLocaleString()} Naira.
            `;
    
            try {
                const base64Audio = await generateSpeechFromText(summaryText);
                
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    outputAudioContext,
                    24000,
                    1,
                );
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.start();
    
            } catch (error) {
                console.error("Failed to play audio", error);
                alert("Sorry, the audio summary could not be generated at this time.");
            } finally {
                setIsTtsLoading(false);
            }
        };

        const handleExportPdf = () => {
            const { jsPDF } = jspdf;
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });
            
            const PAGE_MARGIN = 15;
            const pageContentWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
            const SIGNATURE_AREA_HEIGHT = 45;
            const TERMS_AREA_HEIGHT = 35;


            const generatePdfContent = (startY: number) => {
                let currentY = startY;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.text("TILING PROJECT QUOTATION", PAGE_MARGIN, currentY);
                currentY += 8;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                
                const clientInfo = [];
                if (clientDetails.showClientName) clientInfo.push(`Client: ${clientDetails.clientName || '____________________'}`);
                if (clientDetails.showProjectName) clientInfo.push(`Project: ${clientDetails.projectName || 'N/A'}`);
                if (clientDetails.showClientAddress) clientInfo.push(`Address: ${clientDetails.clientAddress || 'N/A'}`);
                if (clientDetails.showClientPhone) clientInfo.push(`Phone: ${clientDetails.clientPhone || 'N/A'}`);

                const dateText = `Date: ${new Date().toLocaleDateString()}`;
                const dateTextWidth = doc.getTextWidth(dateText);
                doc.text(dateText, doc.internal.pageSize.getWidth() - PAGE_MARGIN - dateTextWidth, currentY);
                
                if (clientInfo.length > 0) {
                    doc.text(clientInfo, PAGE_MARGIN, currentY);
                    currentY += (clientInfo.length * 4) + 8;
                } else {
                    currentY += 8;
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("1. Tile Details & Cost Summary", PAGE_MARGIN, currentY);
                currentY += 6;
                
                const pdfTileHeaders = ['Category', 'Cartons', 'm²', 'Tile Type'];
                if (showUnitPrice) pdfTileHeaders.push('Unit Price');
                if (showSubtotal) pdfTileHeaders.push('Subtotal');

                const pdfTileBody = tiles.map(t => {
                    const row = [t.category, t.cartons, t.sqm.toFixed(2), t.tileType];
                    if (showUnitPrice) row.push(formatCurrency(t.unitPrice));
                    if (showSubtotal) row.push(formatCurrency(t.cartons * t.unitPrice));
                    return row;
                });

                doc.autoTable({
                    startY: currentY,
                    head: [pdfTileHeaders],
                    body: pdfTileBody,
                    theme: 'striped',
                    headStyles: { 
                        fillColor: [45, 55, 72], // slate-700
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    foot: [
                        [{ content: 'Total Tile Cost', colSpan: pdfTileHeaders.length -1, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: formatCurrency(totalTileCost), styles: { halign: 'right', fontStyle: 'bold' } }]
                    ],
                    footStyles: {
                        fillColor: [241, 245, 249],
                        textColor: [20, 20, 20],
                        fontStyle: 'bold'
                    },
                    columnStyles: {
                        [pdfTileHeaders.length - 2]: { halign: 'right' },
                        [pdfTileHeaders.length - 1]: { halign: 'right' },
                    },
                    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN }
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("2. Other Materials", PAGE_MARGIN, currentY);
                currentY += 6;

                const pdfMaterialHeaders = ['Item', 'Quantity'];
                if (showUnitPrice) pdfMaterialHeaders.push('Unit Price');
                if (showSubtotal) pdfMaterialHeaders.push('Total');

                const pdfMaterialBody = materials.map(m => {
                    const row: (string|number)[] = [m.item, `${m.quantity} ${m.unit}`];
                    if (showUnitPrice) row.push(formatCurrency(m.unitPrice));
                    if (showSubtotal) row.push(formatCurrency(m.quantity * m.unitPrice));
                    return row;
                });

                doc.autoTable({
                    startY: currentY,
                    head: [pdfMaterialHeaders],
                    body: pdfMaterialBody,
                    theme: 'striped',
                    headStyles: { 
                        fillColor: [45, 55, 72],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    foot: [
                        [{ content: 'Total for Materials', colSpan: pdfMaterialHeaders.length - 1, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: formatCurrency(totalMaterialCost), styles: { halign: 'right', fontStyle: 'bold' } }]
                    ],
                    footStyles: {
                        fillColor: [241, 245, 249],
                        textColor: [20, 20, 20],
                        fontStyle: 'bold'
                    },
                    columnStyles: {
                        [pdfMaterialHeaders.length - 2]: { halign: 'right' },
                        [pdfMaterialHeaders.length - 1]: { halign: 'right' },
                    },
                    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN }
                });
                currentY = (doc as any).lastAutoTable.finalY + 15;
                
                const summaryStartY = currentY;
                const summaryBoxWidth = pageContentWidth / 2 - 5;

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("3. Workmanship & Maintenance", PAGE_MARGIN, currentY);
                currentY += 6;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Workmanship (${totalSqm.toFixed(2)}m² @ ${formatCurrency(workmanshipRate)}/m²)`, PAGE_MARGIN + 2, currentY);
                doc.text(formatCurrency(workmanshipCost), PAGE_MARGIN + summaryBoxWidth, currentY, { align: 'right' });
                currentY += 6;

                if (showMaintenance && maintenance > 0) {
                    doc.text(`Maintenance`, PAGE_MARGIN + 2, currentY);
                    doc.text(formatCurrency(maintenance), PAGE_MARGIN + summaryBoxWidth, currentY, { align: 'right' });
                    currentY += 6;
                }

                doc.line(PAGE_MARGIN, currentY, PAGE_MARGIN + summaryBoxWidth, currentY);
                currentY += 5;
                
                doc.setFont('helvetica', 'bold');
                doc.text(`Total`, PAGE_MARGIN + 2, currentY);
                doc.text(formatCurrency(workmanshipAndMaintenance), PAGE_MARGIN + summaryBoxWidth, currentY, { align: 'right' });
                
                let rightColX = PAGE_MARGIN + summaryBoxWidth + 10;
                currentY = summaryStartY;
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("4. Project Total Summary", rightColX, currentY);
                currentY += 6;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Tiles`, rightColX + 2, currentY);
                doc.text(formatCurrency(totalTileCost), rightColX + summaryBoxWidth, currentY, { align: 'right' });
                currentY += 6;
                
                doc.text(`Materials`, rightColX + 2, currentY);
                doc.text(formatCurrency(totalMaterialCost), rightColX + summaryBoxWidth, currentY, { align: 'right' });
                currentY += 6;
                
                doc.text(`Workmanship + Maintenance`, rightColX + 2, currentY);
                doc.text(formatCurrency(workmanshipAndMaintenance), rightColX + summaryBoxWidth, currentY, { align: 'right' });
                currentY += 6;
                
                if(profitPercentage){
                    doc.text(`Profit (${profitPercentage}%)`, rightColX + 2, currentY);
                    doc.text(formatCurrency(profitAmount), rightColX + summaryBoxWidth, currentY, { align: 'right' });
                    currentY += 6;
                }

                doc.line(rightColX, currentY, rightColX + summaryBoxWidth, currentY);
                currentY += 5;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(`Grand Total`, rightColX + 2, currentY);
                doc.text(formatCurrency(grandTotal), rightColX + summaryBoxWidth, currentY, { align: 'right' });

                const pageHeight = doc.internal.pageSize.getHeight();
                let signatureY = pageHeight - SIGNATURE_AREA_HEIGHT;
                if (showTerms && terms) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    const termsY = signatureY - TERMS_AREA_HEIGHT + 10;
                    doc.text("Terms & Conditions", PAGE_MARGIN, termsY);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    const splitTerms = doc.splitTextToSize(terms, pageContentWidth);
                    doc.text(splitTerms, PAGE_MARGIN, termsY + 4);
                }

                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text("Signature: _____________________________", PAGE_MARGIN, signatureY + 20);

                doc.save('Tiling_Quotation.pdf');
            };

            if (letterheadSrc) {
                const img = new Image();
                img.src = letterheadSrc;
                img.onload = () => {
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const availableWidth = pageWidth - PAGE_MARGIN * 2;
                    
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    let imgHeight = availableWidth / aspectRatio;
                    
                    const maxImgHeight = 50;
                    if (imgHeight > maxImgHeight) {
                        imgHeight = maxImgHeight;
                    }
                    const imgWidth = imgHeight * aspectRatio;
                    const xPos = (pageWidth - imgWidth) / 2;

                    doc.addImage(letterheadSrc, 'PNG', xPos, PAGE_MARGIN, imgWidth, imgHeight);
                    
                    const startY = PAGE_MARGIN + imgHeight + 10;
                    generatePdfContent(startY);
                };
                img.onerror = () => {
                    console.error("Letterhead image failed to load.");
                    generatePdfContent(PAGE_MARGIN);
                }
            } else {
                generatePdfContent(PAGE_MARGIN + 10);
            }
        };

        return (
            <div id="quotation-output" className="p-6 md:p-8">
                {letterheadSrc && (
                    <div className="mb-8 border-b pb-8">
                        <img src={letterheadSrc} alt="Company Letterhead" className="max-w-full max-h-40 mx-auto object-contain" />
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Quotation</h2>
                        <p className="text-gray-500">Tiling Project Estimate</p>
                        <div className="mt-4 text-sm text-gray-600 space-y-1">
                            {clientDetails.showClientName && <p><span className="font-semibold text-gray-800 w-24 inline-block">Client:</span> {clientDetails.clientName || '____________________'}</p>}
                            {clientDetails.showProjectName && <p><span className="font-semibold text-gray-800 w-24 inline-block">Project:</span> {clientDetails.projectName || 'N/A'}</p>}
                            {clientDetails.showClientAddress && <p><span className="font-semibold text-gray-800 w-24 inline-block">Address:</span> {clientDetails.clientAddress || 'N/A'}</p>}
                            {clientDetails.showClientPhone && <p><span className="font-semibold text-gray-800 w-24 inline-block">Phone:</span> {clientDetails.clientPhone || 'N/A'}</p>}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-gray-500 font-semibold mb-2">Date: {new Date().toLocaleDateString()}</p>
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={handleReadAloud}
                                disabled={isTtsLoading}
                                className="inline-flex items-center justify-center gap-2 w-36 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                aria-label="Read quotation summary aloud"
                            >
                                {isTtsLoading ? (
                                    <>
                                        <LoadingSpinner />
                                        Reading...
                                    </>
                                ) : (
                                    <>
                                        <SpeakerIcon className="w-5 h-5" />
                                        Read Aloud
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleExportPdf}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <PdfIcon className="w-5 h-5" />
                                Export PDF
                            </button>
                        </div>
                    </div>
                </div>

                <section className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Tile Details & Cost Summary</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider">
                            <tr>
                                <th className="p-3 font-semibold">Category</th>
                                <th className="p-3 text-right font-semibold">Cartons</th>
                                <th className="p-3 text-right font-semibold">m²</th>
                                <th className="p-3 font-semibold">Tile Type</th>
                                {showUnitPrice && <th className="p-3 text-right font-semibold">Unit Price</th>}
                                {showSubtotal && <th className="p-3 text-right font-semibold">Subtotal</th>}
                                {showConfidence && <th className="p-3 text-center font-semibold">Confidence</th>}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {tiles.map((tile, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-800">{tile.category}</td>
                                <td className="p-3 text-right text-gray-600">{tile.cartons}</td>
                                <td className="p-3 text-right text-gray-600">{tile.sqm.toFixed(2)}</td>
                                <td className="p-3 text-gray-600">{tile.tileType}</td>
                                {showUnitPrice && <td className="p-3 text-right text-gray-600">{formatCurrency(tile.unitPrice)}</td>}
                                {showSubtotal && <td className="p-3 text-right font-semibold text-gray-800">{formatCurrency(tile.cartons * tile.unitPrice)}</td>}
                                {showConfidence && <td className="p-3 text-center"><ConfidenceBadge score={tile.confidence} /></td>}
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold text-base bg-gray-100">
                                    <td colSpan={tileFooterColSpan + 1} className="p-4 text-right text-gray-800">Total Tile Cost</td>
                                    {showSubtotal && <td className="p-4 text-right text-gray-900">{formatCurrency(totalTileCost)}</td>}
                                    {!showSubtotal && <td className="p-4 text-right text-gray-900">{formatCurrency(totalTileCost)}</td>}
                                    {showConfidence && <td></td>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                <section className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Other Materials</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider">
                        <tr>
                            <th className="p-3 font-semibold">Item</th>
                            <th className="p-3 text-right font-semibold">Quantity</th>
                            {showUnitPrice && <th className="p-3 text-right font-semibold">Unit Price</th>}
                            {showSubtotal && <th className="p-3 text-right font-semibold">Total</th>}
                            {showConfidence && <th className="p-3 text-center font-semibold">Confidence</th>}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {materials.map((mat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-800">{mat.item}</td>
                            <td className="p-3 text-right text-gray-600">{mat.quantity} {mat.unit}</td>
                            {showUnitPrice && <td className="p-3 text-right text-gray-600">{formatCurrency(mat.unitPrice)}</td>}
                            {showSubtotal && <td className="p-3 text-right font-semibold text-gray-800">{formatCurrency(mat.quantity * mat.unitPrice)}</td>}
                            {showConfidence && <td className="p-3 text-center"><ConfidenceBadge score={mat.confidence} /></td>}
                            </tr>
                        ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold text-base bg-gray-100">
                                <td colSpan={materialFooterColSpan + 1} className="p-4 text-right text-gray-800">Total for Materials</td>
                                {showSubtotal && <td className="p-4 text-right text-gray-900">{formatCurrency(totalMaterialCost)}</td>}
                                {!showSubtotal && <td className="p-4 text-right text-gray-900">{formatCurrency(totalMaterialCost)}</td>}
                                {showConfidence && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                    </div>
                </section>
                
                <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">3. Workmanship & Maintenance</h3>
                            <div className="space-y-2 text-gray-700 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Workmanship ({totalSqm.toFixed(2)}m² @ {formatCurrency(workmanshipRate)}/m²)</span> 
                                    <span className="font-medium text-gray-800">{formatCurrency(workmanshipCost)}</span>
                                </div>
                                {showMaintenance && maintenance > 0 && 
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Maintenance</span> 
                                        <span className="font-medium text-gray-800">{formatCurrency(maintenance)}</span>
                                    </div>
                                }
                                <div className="flex justify-between items-center font-bold text-base pt-2 border-t mt-2">
                                    <span className="text-gray-800">Subtotal</span> 
                                    <span className="text-gray-900">{formatCurrency(workmanshipAndMaintenance)}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">4. Project Total Summary</h3>
                            <div className="space-y-2 text-gray-700 text-sm">
                                <div className="flex justify-between items-center"><span className="text-gray-600">Tiles</span> <span className="font-medium text-gray-800">{formatCurrency(totalTileCost)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600">Materials</span> <span className="font-medium text-gray-800">{formatCurrency(totalMaterialCost)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-600">Workmanship + Maint.</span> <span className="font-medium text-gray-800">{formatCurrency(workmanshipAndMaintenance)}</span></div>
                                {profitPercentage && <div className="flex justify-between items-center"><span className="text-gray-600">Profit ({profitPercentage}%)</span> <span className="font-medium text-gray-800">{formatCurrency(profitAmount)}</span></div>}
                                <div className="flex justify-between items-center font-bold text-2xl pt-3 mt-2 border-t-2 border-gray-300 text-gray-900">
                                    <span>Grand Total</span> 
                                    <span className="text-indigo-600">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {showTerms && terms && (
                    <section className="mt-8">
                        <h3 className="text-base font-semibold text-gray-800 mb-2">Terms & Conditions</h3>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap border-l-4 border-gray-200 pl-4">{terms}</p>
                    </section>
                )}

                <div className="mt-12 pt-8 border-t">
                    <p className="text-gray-600 font-semibold">Signature: _________________________</p>
                </div>

                <p className="text-center mt-8 text-sm text-gray-500 italic">Quotation generated via Tiling Quotation AI.</p>
            </div>
        );
    }
    
    return (
        <div className="h-full overflow-y-auto">
            {renderContent()}
        </div>
    )
};

export default QuotationDisplay;