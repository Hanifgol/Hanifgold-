
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { QuotationData, Settings, Tile, Material, ChecklistItem, Adjustment } from '../types';
import { HanifgoldLogoIcon, SpeakerIcon, PlusIcon, EditIcon, ExportIcon, CheckCircleIcon, WordIcon, PdfIcon, MailIcon, ViewIcon, GenerateIcon, InfoIcon, WhatsAppIcon, SettingsIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import { generateSpeechFromText, getAiSummaryForTts, refineQuotationAI } from '../services/geminiService';
import { exportToPdf, exportToWord, shareQuotationToWhatsApp } from '../services/exportService';
import { calculateTotals } from '../services/calculationService';

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
  onEditFinancials: () => void;
  onEditMaterials: () => void;
  onEditTiles: () => void;
  onEditChecklist: () => void;
  onEditAdjustments: () => void;
  onUpdate: (updatedQuotation: QuotationData) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
};

const QuotationDisplay: React.FC<QuotationDisplayProps> = ({ data, isLoading, settings, onEditFinancials, onEditMaterials, onEditTiles, onEditChecklist, onEditAdjustments, onUpdate }) => {
    const [previewStyle, setPreviewStyle] = useState<'corporate' | 'minimalist'>('corporate');
    const [isTtsLoading, setIsTtsLoading] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
    
    // Refinement state
    const [refineText, setRefineText] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const viewMenuRef = useRef<HTMLDivElement>(null);

    const { 
        companyLogo,
        companySignature
    } = settings;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) setIsExportMenuOpen(false);
            if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) setIsViewMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const groupedTiles = useMemo<Record<string, Tile[]>>(() => {
        if (!data) return {};
        const groups: Record<string, Tile[]> = {};
        const tiles = (data.tiles as Tile[]) || [];
        tiles.forEach(tile => {
            const groupName = tile.group || 'General';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(tile);
        });
        return groups;
    }, [data]);

    const handleChecklistToggle = (index: number) => {
        if (!data || !data.checklist) return;
        const newChecklist = [...data.checklist];
        newChecklist[index] = { ...newChecklist[index], checked: !newChecklist[index].checked };
        onUpdate({ ...data, checklist: newChecklist });
    };

    const handleRefine = async () => {
        if (!data || !refineText.trim()) return;
        setIsRefining(true);
        try {
            const updated = await refineQuotationAI(data, refineText);
            onUpdate({ ...updated, aiRefinementHistory: [...(data.aiRefinementHistory || []), refineText] });
            setRefineText('');
        } catch (e) {
            alert("Refinement failed. Try again.");
        } finally {
            setIsRefining(false);
        }
    };

    const renderHeader = () => {
        if (!data) return null;
        return (
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                    <div className="flex items-start gap-4">
                        {companyLogo ? <img src={companyLogo} alt="Logo" className="w-20 h-20 object-contain"/> : <HanifgoldLogoIcon className="w-16 h-16" />}
                        <div>
                            <h1 className="text-2xl font-bold text-brand-dark">{settings.companyName}</h1>
                            <p className="text-xs text-gold-dark font-bold uppercase tracking-widest mt-1">{settings.companySlogan}</p>
                            <div className="mt-3 text-xs text-gray-600 leading-relaxed">
                                <p>{settings.companyAddress}</p>
                                <p>{settings.companyEmail} | {settings.companyPhone}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-bold text-gold uppercase tracking-tight">{settings.documentTitle}</h2>
                        <div className="text-sm text-gray-500 mt-3 space-y-1">
                            <p><span className="font-medium text-brand-dark">Date:</span> {new Date(data.date).toLocaleDateString()}</p>
                            {data.invoiceNumber && <p><span className="font-medium text-brand-dark">Invoice #:</span> {data.invoiceNumber}</p>}
                        </div>
                    </div>
                </div>
                <div className="pt-6"><div className="border-b border-gold"></div></div>
            </div>
        );
    };

    if (isLoading) return <div className="flex flex-col items-center justify-center p-12 text-center"><LoadingSpinner /><p className="mt-4 font-bold text-lg">Generating Quote...</p></div>;
    if (!data) return <div className="flex flex-col items-center justify-center h-full text-center p-12"><HanifgoldLogoIcon className="w-24 h-24 opacity-20 mb-6" /><h2 className="text-2xl font-bold text-gray-400">Ready to Generate</h2></div>;

    const summary = calculateTotals(data, settings);
    const StatusIndicator = () => (
        <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${data.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {data.status === 'Accepted' ? 'Accepted' : 'Pending Review'}
        </span>
    );

    return (
        <div className="flex flex-col w-full max-w-[210mm] relative">
            <div className="sticky top-2 z-30 mx-auto w-full max-w-3xl mb-4">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl flex items-center justify-between gap-4 shadow-lg border border-white/20">
                    <div className="flex items-center gap-3 pl-2"><StatusIndicator /></div>
                    <div className="flex items-center gap-1">
                         <button onClick={() => shareQuotationToWhatsApp(data, settings)} className="px-4 py-2 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2">
                            <WhatsAppIcon className="w-4 h-4"/> WhatsApp
                        </button>
                        <button onClick={async () => await exportToPdf(data, settings)} className="px-4 py-2 bg-brand-dark text-white font-bold text-xs rounded-xl hover:bg-black transition-all flex items-center gap-2">
                            <PdfIcon className="w-4 h-4"/> PDF
                        </button>
                    </div>
                </div>
            </div>

            <div id="quotation-output" className="paper-sheet rounded-lg p-12 text-slate-800 relative mb-4">
                {renderHeader()}
                <div className="mb-10 flex justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billed To</h3>
                        <p className="font-bold text-lg">{data.clientDetails.clientName}</p>
                        <p className="text-sm text-gray-600">{data.clientDetails.projectName}</p>
                        <p className="text-sm">{data.clientDetails.clientAddress}</p>
                    </div>
                    {data.siteAnalysis && (
                        <div className="max-w-[200px] bg-gold-light/20 p-3 rounded-lg border border-gold/30 text-[10px] text-gold-dark font-medium leading-relaxed italic">
                            <div className="flex items-center gap-1 mb-1 font-bold uppercase"><ViewIcon className="w-3 h-3"/> Site Assessment</div>
                            {data.siteAnalysis}
                        </div>
                    )}
                </div>

                <section className="mb-8">
                    <div className="flex justify-between border-b pb-2 mb-3">
                        <h3 className="font-bold font-serif">Tile Details</h3>
                        <button onClick={onEditTiles} className="p-1.5 text-gray-400 hover:text-gold hover:bg-gold-light/20 rounded-lg transition-all print:hidden" title="Edit Tiles">
                            <EditIcon className="w-4 h-4"/>
                        </button>
                    </div>
                    {/* Fix: Explicitly cast the Object.entries result to resolve unknown map type error */}
                    {(Object.entries(groupedTiles) as [string, Tile[]][]).map(([name, tiles]) => (
                        <div key={name} className="mb-4">
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase font-bold text-gray-400 border-b">
                                    <tr><th>Category</th><th className="text-right">m²</th><th className="text-right">Cartons</th><th className="text-right">Price</th><th className="text-right">Total</th></tr>
                                </thead>
                                <tbody>
                                    {tiles.map((t, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td className="py-2">{t.category}</td><td className="text-right">{t.sqm.toFixed(2)}</td><td className="text-right">{t.cartons}</td><td className="text-right">{formatCurrency(t.unitPrice)}</td><td className="text-right font-bold">{formatCurrency(t.cartons * t.unitPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </section>

                <section className="mb-8">
                     <div className="flex justify-between border-b pb-2 mb-3">
                        <h3 className="font-bold font-serif">Other Materials</h3>
                        <button onClick={onEditMaterials} className="p-1.5 text-gray-400 hover:text-gold hover:bg-gold-light/20 rounded-lg transition-all print:hidden" title="Edit Materials">
                            <EditIcon className="w-4 h-4"/>
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="text-[10px] uppercase font-bold text-gray-400 border-b">
                            <tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Total</th></tr>
                        </thead>
                        <tbody>
                            {(data.materials as Material[]).map((m: Material, i: number) => (
                                <tr key={i} className="border-b border-gray-50 group">
                                    <td className="py-2 flex items-center gap-2">
                                        {m.item}
                                        {m.calculationLogic && (
                                            <div className="relative inline-block group/tip">
                                                <InfoIcon className="w-3 h-3 text-gray-300 hover:text-gold-dark cursor-help"/>
                                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-brand-dark text-white p-2 rounded text-[10px] opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                                                    Logic: {m.calculationLogic}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-right">{m.quantity} {m.unit}</td>
                                    <td className="text-right">{formatCurrency(m.unitPrice)}</td>
                                    <td className="text-right font-bold">{formatCurrency(m.quantity * m.unitPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <div className="grid grid-cols-2 gap-8">
                    <section>
                         <div className="flex justify-between border-b pb-2 mb-3">
                            <h3 className="font-bold font-serif">Checklist</h3>
                            <button onClick={onEditChecklist} className="p-1.5 text-gray-400 hover:text-gold hover:bg-gold-light/20 rounded-lg transition-all print:hidden" title="Edit Checklist">
                                <EditIcon className="w-4 h-4"/>
                            </button>
                        </div>
                        <div className="space-y-1">
                            {(data.checklist as ChecklistItem[] | undefined)?.map((item: ChecklistItem, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <input type="checkbox" checked={item.checked} onChange={() => handleChecklistToggle(i)} className="rounded text-gold"/>
                                    <span className={item.checked ? 'line-through text-gray-400' : ''}>{item.item}</span>
                                </div>
                            ))}
                        </div>
                        {data.proTips && data.proTips.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-[10px] font-bold text-gold-dark uppercase tracking-widest mb-2">Expert Recommendations</h4>
                                <ul className="space-y-1">
                                    {/* Fix: Explicitly cast proTips to string[] to resolve type unknown error */}
                                    {(data.proTips as string[]).map((tip, i) => (
                                        <li key={i} className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded border-l-2 border-gold flex gap-2 items-start">
                                            <span className="font-bold text-gold-dark">•</span> {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                    <section className="bg-brand-dark text-white p-6 rounded-xl relative group/summary">
                         <button onClick={onEditFinancials} className="absolute top-4 right-4 p-1.5 text-white/30 hover:text-gold hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover/summary:opacity-100 print:hidden" title="Edit Financials">
                            <SettingsIcon className="w-4 h-4"/>
                        </button>
                        <h3 className="text-gold font-bold mb-4 border-b border-white/10 pb-2">Cost Summary</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span>Tiles</span><span>{formatCurrency(summary.totalTileCost)}</span></div>
                            <div className="flex justify-between"><span>Materials</span><span>{formatCurrency(summary.totalMaterialCost)}</span></div>
                            <div className="flex justify-between"><span>Labor</span><span>{formatCurrency(summary.workmanshipCost)}</span></div>
                             {data.maintenance > 0 && (
                                <div className="flex justify-between"><span>Maintenance</span><span>{formatCurrency(data.maintenance)}</span></div>
                            )}
                            {data.profitPercentage && data.profitPercentage > 0 && (
                                <div className="flex justify-between text-gold-light/60 italic"><span>Profit ({data.profitPercentage}%)</span><span>{formatCurrency(summary.profitAmount)}</span></div>
                            )}
                            
                            <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-lg text-gold"><span>TOTAL</span><span>{formatCurrency(summary.grandTotal)}</span></div>
                            
                            {data.depositPercentage && data.depositPercentage > 0 && (
                                <div className="mt-4 pt-2 border-t border-dashed border-white/10 flex justify-between font-bold text-xs text-emerald-400">
                                    <span>DEPOSIT ({data.depositPercentage}%)</span>
                                    <span>{formatCurrency(summary.depositAmount)}</span>
                                </div>
                            )}
                        </div>
                        
                         <button onClick={onEditAdjustments} className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gold transition-all print:hidden">
                            Add Discount / Adjustment
                        </button>
                    </section>
                </div>
            </div>

            <div className="sticky bottom-4 z-40 mx-auto w-full max-w-2xl print:hidden">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-gold/30 flex items-center gap-3">
                    <div className="bg-gold/10 p-2 rounded-full"><GenerateIcon className="w-5 h-5 text-gold-dark"/></div>
                    <input 
                        type="text" 
                        value={refineText}
                        onChange={(e) => setRefineText(e.target.value)}
                        placeholder="Refine quote: e.g. 'Add 5% discount' or 'Double adhesive'..." 
                        className="flex-grow bg-transparent border-none focus:ring-0 text-sm font-medium"
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                    />
                    <button 
                        onClick={handleRefine}
                        disabled={isRefining || !refineText.trim()}
                        className="bg-brand-dark text-white px-5 py-2 rounded-2xl text-xs font-bold hover:bg-black transition-all flex items-center gap-2"
                    >
                        {isRefining ? <LoadingSpinner /> : 'Refine'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationDisplay;
