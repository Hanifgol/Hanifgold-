

import React, { useState, useRef, useEffect } from 'react';
import { QuotationData, Settings, Tile, Material, ChecklistItem } from '../types';
import { HanifgoldLogoIcon, SpeakerIcon, PlusIcon, EditIcon, ExportIcon, CsvIcon, CheckCircleIcon, CorporateIcon, MinimalistIcon, WordIcon, PdfIcon, CheckmateIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import { generateSpeechFromText, getAiSummaryForTts } from '../services/geminiService';
import { exportToPdf, exportToExcel, exportToWord, exportToCsv } from '../services/exportService';

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
  settings: Settings;
  onAddMaterial: () => void;
  onEditTiles: () => void;
  onEditChecklist: () => void;
  onUpdate: (updatedQuotation: QuotationData) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};


const QuotationDisplay: React.FC<QuotationDisplayProps> = ({ data, isLoading, settings, onAddMaterial, onEditTiles, onEditChecklist, onUpdate }) => {
    const [previewStyle, setPreviewStyle] = useState<'corporate' | 'minimalist'>('corporate');
    const [isTtsLoading, setIsTtsLoading] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const { 
        showMaintenance, 
        showSubtotal, 
        showUnitPrice,
        showTermsAndConditions,
        showTileSize,
        taxPercentage,
        showTax,
        headerLayout,
        companyLogo
    } = settings;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleStatusChange = (newStatus: 'Accepted' | 'Rejected') => {
        if (data) {
            onUpdate({ ...data, status: newStatus });
        }
    };
    
    const handleChecklistToggle = (index: number) => {
        if (!data || !data.checklist) return;
        const newChecklist = [...data.checklist];
        newChecklist[index] = { ...newChecklist[index], checked: !newChecklist[index].checked };
        onUpdate({ ...data, checklist: newChecklist });
    };

    const handleAddCheckmateToggle = (enabled: boolean) => {
        if (!data) return;
        const hasCheckmate = data.checklist?.some(item => item.item === 'Checkmate');
        let newChecklist = [...(data.checklist || [])];

        if (enabled && !hasCheckmate) {
            newChecklist.push({ item: 'Checkmate', checked: false });
        } else if (!enabled && hasCheckmate) {
            newChecklist = newChecklist.filter(item => item.item !== 'Checkmate');
        }
        
        onUpdate({ ...data, addCheckmate: enabled, checklist: newChecklist });
    };

    const handleShowChecklistToggle = (enabled: boolean) => {
        if (!data) return;
        onUpdate({ ...data, showChecklist: enabled });
    };
    
    const renderHeader = () => {
        if (!data) return null;
        const isMinimalist = previewStyle === 'minimalist';

        const commonRightSection = (
            <div className="text-left sm:text-right shrink-0">
                <h2 className="text-4xl font-extrabold text-gray-800 tracking-tight">{settings.documentTitle.toUpperCase()}</h2>
                <p className="text-gray-500 font-semibold mt-2">
                    <span className="font-bold text-dark-gray">Date:</span> {new Date(data.date).toLocaleDateString()}
                </p>
            </div>
        );

        const companyInfo = (
             <div>
                <h1 className="text-2xl font-bold text-secondary">{settings.companyName}</h1>
                <p className="text-sm text-gray-500 italic">{settings.companySlogan}</p>
                <div className="mt-2 text-xs text-dark-gray">
                    <p>{settings.companyAddress}</p>
                    <p>{settings.companyEmail} | {settings.companyPhone}</p>
                </div>
            </div>
        );

        return (
            <div className="mb-12">
                {headerLayout === 'modern' && (
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-8">
                        <div className="flex items-center gap-4">
                             {companyLogo ? 
                                <img src={companyLogo} alt="Company Logo" className={`${isMinimalist ? 'w-14 h-14' : 'w-20 h-20'} object-contain`}/> : 
                                <HanifgoldLogoIcon className={`${isMinimalist ? 'w-14 h-14' : 'w-20 h-20'} flex-shrink-0`} />}
                            {companyInfo}
                        </div>
                        {commonRightSection}
                    </div>
                )}
                 {headerLayout === 'classic' && (
                    <div className="flex flex-col items-center text-center gap-4">
                        {companyLogo && <img src={companyLogo} alt="Company Logo" className={`${isMinimalist ? 'w-16 h-16' : 'w-24 h-24'} object-contain`}/>}
                        {companyInfo}
                        <div className="w-full mt-4">{commonRightSection}</div>
                    </div>
                )}
                {headerLayout === 'minimalist' && (
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-8">
                         {companyInfo}
                        {commonRightSection}
                    </div>
                )}
                <div className="pt-8">
                    {isMinimalist ? (
                        <hr className="border-gold-dark/50 border-t-[0.5px]"/>
                    ) : (
                        <div className="border-b-2 border-gold"></div>
                    )}
                </div>
            </div>
        );
    };


    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                    <div className="w-12 h-12 border-4 border-sky-200 border-t-primary rounded-full animate-spin"></div>
                    <p className="mt-4 text-dark-gray font-medium text-lg">AI is analyzing and calculating...</p>
                    <p className="text-gray-500">This may take a moment.</p>
                </div>
            );
        }
        
        if (!data) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-light-gray rounded-xl">
                    <HanifgoldLogoIcon className="w-24 h-24 text-gray-300" />
                    <h2 className="mt-4 text-xl font-semibold text-secondary">Your Quotation Will Appear Here</h2>
                    <p className="mt-2 text-gray-500 max-w-sm">
                        Fill in the details on the left and click 'Generate Quotation' to see a professional, itemized result.
                    </p>
                </div>
            );
        }

        const { clientDetails, tiles, materials, workmanshipRate, maintenance, profitPercentage, status, termsAndConditions, checklist, addCheckmate, showChecklist } = data;
        const isMinimalist = previewStyle === 'minimalist';

        const totalSqm = tiles.reduce((acc, tile) => acc + tile.sqm, 0);
        const totalTileCost = tiles.reduce((acc, tile) => acc + tile.cartons * tile.unitPrice, 0);
        const totalMaterialCost = materials.reduce((acc, mat) => acc + mat.quantity * mat.unitPrice, 0);
        const workmanshipCost = totalSqm * workmanshipRate;
        const workmanshipAndMaintenance = workmanshipCost + (showMaintenance ? maintenance : 0);

        const preProfitTotal = totalTileCost + totalMaterialCost + workmanshipAndMaintenance;
        const profitAmount = profitPercentage ? preProfitTotal * (profitPercentage / 100) : 0;
        const subtotal = preProfitTotal + profitAmount;
        const taxAmount = showTax ? subtotal * (taxPercentage / 100) : 0;
        const grandTotal = subtotal + taxAmount;
        
        const handleReadAloud = async () => {
            if (!data) return;
            setIsTtsLoading(true);
            try {
                // New: Get a conversational summary from the AI
                const summaryText = await getAiSummaryForTts(data, grandTotal);

                // Existing: Generate speech from the new summary text
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

        const StatusIndicator = () => {
            const baseClasses = "px-3 py-1.5 text-xs font-bold rounded-full inline-flex items-center gap-2 border";
            if (status === 'Accepted') return <span className={`${baseClasses} bg-emerald-50 text-success border-emerald-200`}><CheckCircleIcon className="w-4 h-4" /> Accepted</span>;
            if (status === 'Rejected') return <span className={`${baseClasses} bg-red-50 text-danger border-red-200`}>Rejected</span>;
            if (status === 'Invoiced') return <span className={`${baseClasses} bg-sky-50 text-primary border-sky-200`}>Invoiced</span>;
            return <span className={`${baseClasses} bg-amber-50 text-amber-600 border-amber-200`}>Pending</span>;
        }

        const MobileCardRow: React.FC<{ label: string; value: React.ReactNode; isBold?: boolean }> = ({ label, value, isBold }) => (
            <div className="flex justify-between items-center text-sm py-1">
                <span className="text-gray-600">{label}</span>
                <span className={`${isBold ? 'font-semibold text-secondary' : 'text-dark-gray'}`}>{value}</span>
            </div>
        );

        return (
            <div id="quotation-output" className="p-6 md:p-10 flex flex-col h-full">
                {renderHeader()}
                
                <div className="flex-grow">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-12 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-gold-dark">BILLED TO</h3>
                            <div className="mt-2 text-sm text-dark-gray space-y-1">
                                {clientDetails.showClientName && <p className="font-bold text-lg">{clientDetails.clientName || '____________________'}</p>}
                                {clientDetails.showProjectName && <p className="font-semibold">{clientDetails.projectName || ''}</p>}
                                {clientDetails.showClientAddress && <p>{clientDetails.clientAddress || ''}</p>}
                                {clientDetails.showClientPhone && <p>{clientDetails.clientPhone || ''}</p>}
                            </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                            <div className="mb-4">
                                <StatusIndicator />
                            </div>
                            <div className="flex items-center gap-2 justify-start sm:justify-end">
                                <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                                    <button
                                        onClick={() => setPreviewStyle('corporate')}
                                        className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${previewStyle === 'corporate' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-secondary'}`}
                                        title="Corporate Style"
                                    >
                                        <CorporateIcon className="w-4 h-4" />
                                        Corporate
                                    </button>
                                    <button
                                        onClick={() => setPreviewStyle('minimalist')}
                                        className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${previewStyle === 'minimalist' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-secondary'}`}
                                        title="Minimalist Style"
                                    >
                                        <MinimalistIcon className="w-4 h-4" />
                                        Minimalist
                                    </button>
                                </div>
                                <button
                                    onClick={handleReadAloud}
                                    disabled={isTtsLoading}
                                    className="inline-flex items-center justify-center gap-2 w-36 px-4 py-2 bg-slate-100 text-secondary font-semibold rounded-lg hover:bg-slate-200 transition-all shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105"
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
                                <div className="relative" ref={exportMenuRef}>
                                    <button
                                        onClick={() => setIsExportMenuOpen(prev => !prev)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-sky-600 transition-all shadow-md transform hover:scale-105"
                                    >
                                        <ExportIcon className="w-5 h-5" />
                                        Export
                                    </button>
                                    {isExportMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border border-medium-gray animate-fade-in-down">
                                            <ul className="py-1 text-dark-gray">
                                                <li className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Export As</li>
                                                <li><a href="#" onClick={(e) => { e.preventDefault(); exportToPdf(data, settings); setIsExportMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-light-gray"><PdfIcon className="w-5 h-5 text-red-700"/> PDF Document</a></li>
                                                <li><a href="#" onClick={async (e) => { e.preventDefault(); await exportToWord(data, settings); setIsExportMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-light-gray"><WordIcon className="w-5 h-5 text-blue-700"/> Word (.docx)</a></li>
                                                <li><a href="#" onClick={(e) => { e.preventDefault(); exportToExcel(data, settings); setIsExportMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-light-gray"><span className="font-bold text-green-700 text-lg">X</span> Excel (.xlsx)</a></li>
                                                <li><a href="#" onClick={(e) => { e.preventDefault(); exportToCsv(data, settings); setIsExportMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-light-gray"><CsvIcon className="w-5 h-5 text-gray-600"/> CSV (for Sheets)</a></li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                             {status === 'Pending' && (
                                <div className="mt-4 border-t border-medium-gray pt-4 flex flex-col items-start sm:items-end gap-2">
                                    <p className="text-sm text-dark-gray font-medium">Update Status:</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleStatusChange('Accepted')} className="px-3 py-1 bg-success text-white text-sm font-semibold rounded-md hover:bg-emerald-600 transition-all transform hover:scale-105">Accept</button>
                                        <button onClick={() => handleStatusChange('Rejected')} className="px-3 py-1 bg-danger text-white text-sm font-semibold rounded-md hover:bg-red-600 transition-all transform hover:scale-105">Reject</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <section className="mb-12">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xl font-bold text-gold-dark">1. Tile Details & Cost Summary</h3>
                             <button 
                                onClick={onEditTiles}
                                className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-primary text-sm font-semibold rounded-lg hover:bg-sky-200 transition-all transform hover:scale-105"
                                aria-label="Edit tile details"
                            >
                                <EditIcon className="w-4 h-4" />
                                Edit Tiles
                            </button>
                        </div>
                        {isMinimalist && <hr className="mb-3 border-gold-dark/50 border-t-[0.5px]"/>}
                         {/* Responsive table for tiles */}
                        <div className="overflow-x-auto border border-medium-gray rounded-lg shadow-sm responsive-table-container">
                            <table className="w-full text-left text-sm responsive-table">
                                <thead className="bg-secondary text-white uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="p-4 font-semibold">Category</th>
                                    <th className="p-4 text-right font-semibold">m²</th>
                                    <th className="p-4 text-right font-semibold">Cartons</th>
                                    {showTileSize && <th className="p-4 font-semibold">Size</th>}
                                    <th className="p-4 font-semibold">Tile Type</th>
                                    {showUnitPrice && <th className="p-4 text-right font-semibold">Unit Price</th>}
                                    {showSubtotal && <th className="p-4 text-right font-semibold">Subtotal</th>}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-medium-gray">
                                {tiles.map((tile: Tile, index: number) => (
                                    <tr key={index} className="bg-white even:bg-light-gray hover:bg-sky-50 transition-colors">
                                    <td data-label="Category" className="p-4 font-medium text-secondary">{tile.category}</td>
                                    <td data-label="m²" className="p-4 text-right text-dark-gray">{tile.sqm.toFixed(2)}</td>
                                    <td data-label="Cartons" className="p-4 text-right text-dark-gray">{tile.cartons}</td>
                                    {showTileSize && <td data-label="Size" className="p-4 text-dark-gray">{tile.size || 'N/A'}</td>}
                                    <td data-label="Tile Type" className="p-4 text-dark-gray">{tile.tileType}</td>
                                    {showUnitPrice && <td data-label="Unit Price" className="p-4 text-right text-dark-gray">{formatCurrency(tile.unitPrice)}</td>}
                                    {showSubtotal && <td data-label="Subtotal" className="p-4 text-right font-semibold text-secondary">{formatCurrency(tile.cartons * tile.unitPrice)}</td>}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="mb-12">
                        <div className="flex justify-between items-center mb-3">
                             <h3 className="text-xl font-bold text-gold-dark">2. Other Materials</h3>
                            <button 
                                onClick={onAddMaterial}
                                className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-primary text-sm font-semibold rounded-lg hover:bg-sky-200 transition-all transform hover:scale-105"
                                aria-label="Add a new material"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Material
                            </button>
                        </div>
                         {isMinimalist && <hr className="mb-3 border-gold-dark/50 border-t-[0.5px]"/>}
                        {/* Responsive table for materials */}
                        <div className="overflow-x-auto border border-medium-gray rounded-lg shadow-sm responsive-table-container">
                        <table className="w-full text-left text-sm responsive-table">
                            <thead className="bg-secondary text-white uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-4 font-semibold">Item</th>
                                <th className="p-4 text-right font-semibold">Quantity</th>
                                {showUnitPrice && <th className="p-4 text-right font-semibold">Unit Price</th>}
                                {showSubtotal && <th className="p-4 text-right font-semibold">Total</th>}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-medium-gray">
                            {materials.map((mat: Material, index: number) => (
                                <tr key={index} className="bg-white even:bg-light-gray hover:bg-sky-50 transition-colors">
                                <td data-label="Item" className="p-4 font-medium text-secondary">{mat.item}</td>
                                <td data-label="Quantity" className="p-4 text-right text-dark-gray">{mat.quantity} {mat.unit}</td>
                                {showUnitPrice && <td data-label="Unit Price" className="p-4 text-right text-dark-gray">{formatCurrency(mat.unitPrice)}</td>}
                                {showSubtotal && <td data-label="Total" className="p-4 text-right font-semibold text-secondary">{formatCurrency(mat.quantity * mat.unitPrice)}</td>}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    </section>

                    <div className="grid md:grid-cols-2 gap-12 mb-12">
                         <section>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xl font-bold text-gold-dark">3. Project Checklist</h3>
                                <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-2">
                                        <label htmlFor="showChecklistToggle" className="text-sm font-semibold text-dark-gray">Show</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="showChecklistToggle" className="sr-only peer" checked={showChecklist} onChange={(e) => handleShowChecklistToggle(e.target.checked)} />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="checkmateToggle" className="text-sm font-semibold text-dark-gray">Checkmate</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="checkmateToggle" className="sr-only peer" checked={addCheckmate} onChange={(e) => handleAddCheckmateToggle(e.target.checked)} />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                    <button 
                                        onClick={onEditChecklist}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-primary text-sm font-semibold rounded-lg hover:bg-sky-200 transition-all transform hover:scale-105"
                                        aria-label="Edit checklist"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                        Edit
                                    </button>
                                </div>
                            </div>
                            {isMinimalist && <hr className="mb-3 border-gold-dark/50 border-t-[0.5px]"/>}
                            {showChecklist && (
                                <div className="space-y-3 bg-light-gray p-4 rounded-xl border border-medium-gray">
                                    {(checklist && checklist.length > 0) ? checklist.map((item, index) => {
                                        const isCheckmate = item.item === 'Checkmate';
                                        const isComplete = isCheckmate && item.checked;
                                        return (
                                            <div key={index} className={`p-2 rounded-lg transition-all ${isComplete ? 'bg-gold text-white shadow-md' : ''}`}>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.checked}
                                                        onChange={() => handleChecklistToggle(index)}
                                                        className={`h-5 w-5 rounded border-gray-300 focus:ring-primary ${isComplete ? 'text-secondary' : 'text-primary'}`}
                                                    />
                                                    <span className={`text-sm flex-grow ${item.checked ? `line-through ${isComplete ? 'text-white/80' : 'text-gray-500'}` : 'text-dark-gray'} ${isCheckmate ? 'font-bold' : ''}`}>
                                                        {item.item}
                                                    </span>
                                                    {isComplete && <CheckmateIcon className="w-6 h-6 ml-auto" />}
                                                </label>
                                                 {isComplete && <p className="text-center text-sm font-semibold mt-1 opacity-90">Project Complete!</p>}
                                            </div>
                                        );
                                    }) : <p className="text-sm text-gray-500 text-center">No checklist items for this project.</p>}
                                </div>
                            )}
                        </section>
                        
                        <section className="bg-gold-light/50 p-8 rounded-xl border border-gold/30">
                             <h3 className="text-xl font-bold text-gold-dark mb-4">4. Cost Summary</h3>
                            <div className="space-y-3 text-dark-gray text-sm">
                                <MobileCardRow label="Tiles Cost" value={formatCurrency(totalTileCost)} />
                                <MobileCardRow label="Materials Cost" value={formatCurrency(totalMaterialCost)} />
                                <MobileCardRow label={`Workmanship (${totalSqm.toFixed(2)}m²)`} value={formatCurrency(workmanshipCost)} />
                                {showMaintenance && maintenance > 0 && <MobileCardRow label="Maintenance" value={formatCurrency(maintenance)} />}
                                {profitPercentage && <MobileCardRow label={`Profit (${profitPercentage}%)`} value={formatCurrency(profitAmount)} />}
                                <div className="flex justify-between items-center font-semibold text-base pt-3 border-t mt-3 border-medium-gray"><span className="text-secondary">Subtotal</span> <span className="text-secondary">{formatCurrency(subtotal)}</span></div>
                                {showTax && taxPercentage > 0 && <MobileCardRow label={`Tax (${taxPercentage}%)`} value={formatCurrency(taxAmount)} />}

                                <div className="flex justify-between items-center font-bold text-2xl pt-4 mt-3 border-t-2 border-gold/50 text-gold-dark">
                                    <span>Grand Total</span> 
                                    <span className="text-gold-dark">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {showTermsAndConditions && (
                        <section>
                            <h3 className="text-base font-bold text-gold-dark mb-2">Terms & Conditions</h3>
                             <textarea
                                value={termsAndConditions || ''}
                                onChange={(e) => onUpdate({ ...data, termsAndConditions: e.target.value })}
                                rows={4}
                                className="w-full text-xs text-gray-700 bg-light-gray/50 border border-medium-gray rounded-lg p-3 focus:ring-2 focus:ring-primary/80 focus:border-primary transition"
                                placeholder="Enter terms and conditions..."
                            />
                        </section>
                    )}
                </div>

                {settings.footerText && (
                    <div className="mt-auto pt-8">
                        {isMinimalist ? (
                            <hr className="border-gold-dark/50 border-t-[0.5px]"/>
                        ) : (
                            <div className="border-t border-gold"></div>
                        )}
                        <div className="text-center pt-4">
                            <p className="text-xs text-gray-500">{settings.footerText}</p>
                        </div>
                    </div>
                )}
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