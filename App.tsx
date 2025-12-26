
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Auth from './components/Auth';
import { QuotationData, ClientDetails, Material, Tile, Settings, InvoiceData, ChecklistItem, Client, Expense, Adjustment } from './types';
import { generateQuotationFromAI, getTextFromImageAI, analyzeSiteConditionsAI } from './services/geminiService';
import { generateInvoiceNumber, createInvoiceFromQuotation } from './services/invoiceService';
import InputSection from './components/InputSection';
import QuotationDisplay from './components/QuotationDisplay';
import { HanifgoldLogoIcon, GenerateIcon, SettingsIcon, SunIcon, MoonIcon, DashboardIcon, ClientsIcon, HistoryIcon, InvoiceIcon, ExpenseIcon, PlusIcon, RemoveIcon, LogOutIcon } from './components/icons';
import ClientDetailsForm from './components/ClientDetailsForm';
import LoadingSpinner from './components/LoadingSpinner';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Invoices from './components/Invoices';
import Clients from './components/Clients';
import Expenses from './components/Expenses';
import SettingsModal from './components/SettingsModal';
import BottomNav from './components/BottomNav';
import { DEFAULT_SETTINGS } from './constants';

// Editor Modals
import EditTilesModal from './components/EditTilesModal';
import EditMaterialsModal from './components/EditMaterialsModal';
import EditChecklistModal from './components/EditChecklistModal';
import AddAdjustmentModal from './components/AddAdjustmentModal';
import EditFinancialsModal from './components/EditFinancialsModal';

const useHistoryState = <T,>(initialState: T) => {
  const [history, setHistory] = useState({ past: [] as T[], present: initialState, future: [] as T[] });
  const set = useCallback((action: T | ((prevState: T) => T)) => {
    setHistory(current => {
      const newState = typeof action === 'function' ? (action as (prevState: T) => T)(current.present) : action;
      if (JSON.stringify(newState) === JSON.stringify(current.present)) return current;
      return { past: [...current.past, current.present], present: newState, future: [] };
    });
  }, []);
  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    setHistory(current => {
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, current.past.length - 1);
      return { past: newPast, present: previous, future: [current.present, ...current.future] };
    });
  }, [history.past]);
  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    setHistory(current => {
      const next = current.future[0];
      const newFuture = current.future.slice(1);
      return { past: [...current.past, current.present], present: next, future: newFuture };
    });
  }, [history.future]);
  const reset = useCallback((newState: T) => setHistory({ past: [], present: newState, future: [] }), []);
  return { state: history.present, set, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0, reset };
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [view, setView] = useState<'generator' | 'dashboard' | 'history' | 'invoices' | 'clients' | 'expenses'>('dashboard');
  
  // Input State
  const { state: jobNotes, set: setJobNotes, undo: undoJobNotes, redo: redoJobNotes, canUndo: canUndoJobNotes, canRedo: canRedoJobNotes, reset: resetJobNotes } = useHistoryState<string[]>([]);
  const [clientDetails, setClientDetails] = useState<ClientDetails>({ clientName: '', clientAddress: '', clientPhone: '', projectName: '', showClientName: true, showClientAddress: true, showClientPhone: true, showProjectName: true });
  
  // Application Data
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('hanifgold_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  
  const [allQuotations, setAllQuotations] = useState<QuotationData[]>(() => {
    const saved = localStorage.getItem('hanifgold_quotations');
    return saved ? JSON.parse(saved) : [];
  });
  const [allInvoices, setAllInvoices] = useState<InvoiceData[]>(() => {
    const saved = localStorage.getItem('hanifgold_invoices');
    return saved ? JSON.parse(saved) : [];
  });
  const [allClients, setAllClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('hanifgold_clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [allExpenses, setAllExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('hanifgold_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? (saved as 'light' | 'dark') : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [selectedNoteImage, setSelectedNoteImage] = useState<string | null>(null);
  const [siteImagePreview, setSiteImagePreview] = useState<string | null>(null);
  const [selectedSiteImage, setSelectedSiteImage] = useState<File | null>(null);
  const [activeModal, setActiveModal] = useState<'tiles' | 'materials' | 'checklist' | 'adjustments' | 'financials' | null>(null);

  // Persistence Effects
  useEffect(() => localStorage.setItem('hanifgold_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('hanifgold_quotations', JSON.stringify(allQuotations)), [allQuotations]);
  useEffect(() => localStorage.setItem('hanifgold_invoices', JSON.stringify(allInvoices)), [allInvoices]);
  useEffect(() => localStorage.setItem('hanifgold_clients', JSON.stringify(allClients)), [allClients]);
  useEffect(() => localStorage.setItem('hanifgold_expenses', JSON.stringify(allExpenses)), [allExpenses]);

  // Auth & Sync Logic
  useEffect(() => {
    if (isSupabaseConfigured) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) loadUserData(session.user.id);
            else setAppLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) loadUserData(session.user.id);
            else {
                setAllQuotations([]);
                setAllInvoices([]);
                setAllClients([]);
                setAllExpenses([]);
                setAppLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    } else setAppLoading(false);
  }, []);

  const loadUserData = async (userId: string) => {
    setAppLoading(true);
    try {
      const [q, i, c, e, s] = await Promise.all([
        supabase.from('quotations').select('*').eq('user_id', userId),
        supabase.from('invoices').select('*').eq('user_id', userId),
        supabase.from('clients').select('*').eq('user_id', userId),
        supabase.from('expenses').select('*').eq('user_id', userId),
        supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      if (q.data) setAllQuotations(q.data.map(r => r.data));
      if (i.data) setAllInvoices(i.data.map(r => r.data));
      if (c.data) setAllClients(c.data.map(r => r.data));
      if (e.data) setAllExpenses(e.data.map(r => r.data));
      if (s.data) setSettings(s.data.data);
    } catch (err) {
      console.error("Error loading Supabase data:", err);
    } finally { setAppLoading(false); }
  };

  const syncEntity = async (table: string, id: string, data: any) => {
      if (!session || !isSupabaseConfigured) return;
      try {
          await supabase.from(table).upsert({ 
              id, 
              user_id: session.user.id, 
              data, 
              updated_at: new Date().toISOString() 
          });
      } catch (err) {
          console.error(`Error syncing ${table}:`, err);
      }
  };

  const deleteEntity = async (table: string, id: string) => {
      if (!session || !isSupabaseConfigured) return;
      try {
          await supabase.from(table).delete().eq('id', id).eq('user_id', session.user.id);
      } catch (err) {
          console.error(`Error deleting from ${table}:`, err);
      }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleGenerate = async () => {
      if (jobNotes.length === 0) return alert("Please add measurements.");
      setIsOcrLoading(true);
      try {
        let siteVision = "";
        if (selectedSiteImage) {
            siteVision = await analyzeSiteConditionsAI(selectedSiteImage);
        }
        const combinedInput = `Client: ${clientDetails.clientName}\nNotes: ${jobNotes.join('\n')}\nSite Vision: ${siteVision}`;
        const data = await generateQuotationFromAI(combinedInput, settings, settings.addCheckmateDefault, settings.showChecklistDefault);
        const newQuotation: QuotationData = {
            id: crypto.randomUUID(), date: Date.now(), status: 'Pending', ...data,
            clientDetails: { ...data.clientDetails, ...clientDetails },
            showMaterials: settings.showMaterialsDefault, showAdjustments: settings.showAdjustmentsDefault,
            siteAnalysis: siteVision
        };
        setAllQuotations(prev => [newQuotation, ...prev]);
        setQuotationData(newQuotation);
        syncEntity('quotations', newQuotation.id, newQuotation);
      } finally { setIsOcrLoading(false); }
  };

  const updateQuotation = (updates: Partial<QuotationData>) => {
      if (quotationData) {
          const updated = { ...quotationData, ...updates };
          setQuotationData(updated);
          setAllQuotations(prev => prev.map(q => q.id === updated.id ? updated : q));
          syncEntity('quotations', updated.id, updated);
      }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
        setSession(null);
        setAllQuotations([]);
        setAllInvoices([]);
        setAllClients([]);
        setAllExpenses([]);
        setView('dashboard');
    }
  };

  if (appLoading) return <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white"><LoadingSpinner /><p className="mt-4 font-bold text-gold animate-pulse">Initializing Tiling Suite...</p></div>;

  if (!session && isSupabaseConfigured) {
      return <Auth />;
  }

  return (
    <div className="flex h-screen bg-[#e2e8f0] dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-20 hover:w-64 bg-white dark:bg-[#1e293b] m-4 rounded-3xl h-[calc(100vh-2rem)] shadow-2xl z-30 transition-all duration-300 group border border-white/20">
        <div className="p-6 flex items-center gap-4 justify-center group-hover:justify-start">
           <div className="bg-gold/10 p-2 rounded-xl"><HanifgoldLogoIcon className="w-8 h-8" /></div>
           <span className="opacity-0 group-hover:opacity-100 font-bold text-lg whitespace-nowrap">Hanifgold AI</span>
        </div>
        <nav className="flex-grow px-3 space-y-2 mt-4">
          {[
            { n: 'dashboard', l: 'Stats', i: DashboardIcon },
            { n: 'generator', l: 'Create Quote', i: GenerateIcon },
            { n: 'clients', l: 'Clients', i: ClientsIcon },
            { n: 'history', l: 'History', i: HistoryIcon },
            { n: 'invoices', l: 'Invoices', i: InvoiceIcon },
          ].map(it => (
            <button key={it.n} onClick={() => setView(it.n as any)} className={`w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all ${view === it.n ? 'bg-gold text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                <div className="w-8 flex-shrink-0 flex justify-center"><it.i className="w-6 h-6" /></div>
                <span className="opacity-0 group-hover:opacity-100 font-bold text-sm whitespace-nowrap">{it.l}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 mt-auto mb-2 space-y-2">
            <button onClick={() => setTheme(p => p === 'light' ? 'dark' : 'light')} className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-gray-400 hover:bg-gray-100">
                <div className="w-8 flex justify-center">{theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6 text-gold" />}</div>
                <span className="opacity-0 group-hover:opacity-100 font-bold text-sm whitespace-nowrap">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-gray-400 hover:bg-gray-100"><div className="w-8 flex justify-center"><SettingsIcon className="w-6 h-6" /></div><span className="opacity-0 group-hover:opacity-100 font-bold text-sm whitespace-nowrap">Settings</span></button>
            <button onClick={handleSignOut} className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><div className="w-8 flex justify-center"><LogOutIcon className="w-6 h-6" /></div><span className="opacity-0 group-hover:opacity-100 font-bold text-sm whitespace-nowrap">Sign Out</span></button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative md:py-4 md:pr-4">
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1e293b] md:rounded-3xl shadow-2xl relative">
             <div className="sticky top-0 z-20 px-8 py-5 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-md border-b flex items-center justify-between">
                <h2 className="text-2xl font-bold capitalize">{view}</h2>
                <div className="flex items-center gap-3">
                     <p className="text-xs text-gray-400 font-medium">{session ? session.user.email : 'Guest Mode'}</p>
                     <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold to-amber-600 text-white flex items-center justify-center text-sm font-bold">{session?.user.email?.charAt(0).toUpperCase() || 'G'}</div>
                </div>
             </div>
             <div className="p-4 md:p-8">
                {view === 'dashboard' && <Dashboard quotations={allQuotations} invoices={allInvoices} expenses={allExpenses} settings={settings} />}
                {view === 'generator' && (
                  <div className="grid xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-4 flex flex-col gap-6">
                      <ClientDetailsForm details={clientDetails} setDetails={setClientDetails} disabled={!!quotationData} allClients={allClients} saveClientInfo={false} setSaveClientInfo={() => {}} />
                      <InputSection 
                        notes={jobNotes} setNotes={setJobNotes} disabled={!!quotationData} 
                        onImageUpload={async (f) => { setIsOcrLoading(true); const t = await getTextFromImageAI(f); setJobNotes(p => [...p, ...t.split('\n').filter(l => l.trim())]); setSelectedNoteImage(URL.createObjectURL(f)); setIsOcrLoading(false); }} 
                        onSitePhotoUpload={(f) => { setSelectedSiteImage(f); setSiteImagePreview(URL.createObjectURL(f)); }}
                        onRemoveImage={() => { setSelectedNoteImage(null); setSiteImagePreview(null); }} 
                        imagePreview={selectedNoteImage} sitePhotoPreview={siteImagePreview} isOcrLoading={isOcrLoading} 
                        onOpenVoiceModal={() => {}} onOpenBulkModal={() => {}} onUndo={undoJobNotes} onRedo={redoJobNotes} canUndo={canUndoJobNotes} canRedo={canRedoJobNotes} 
                      />
                      {!quotationData ? <button onClick={handleGenerate} className="w-full py-4 bg-brand-dark hover:bg-black text-white font-bold rounded-2xl flex items-center justify-center gap-3">{isOcrLoading ? <LoadingSpinner /> : <GenerateIcon className="w-5 h-5 text-gold" />} Generate Quotation</button> : <button onClick={() => { setQuotationData(null); resetJobNotes([]); }} className="w-full py-4 border-2 border-gold text-gold-dark font-bold rounded-2xl">Start New Project</button>}
                    </div>
                    <div className="xl:col-span-8">
                        <QuotationDisplay 
                            data={quotationData} isLoading={false} settings={settings} 
                            onEditTiles={() => setActiveModal('tiles')} onEditMaterials={() => setActiveModal('materials')} onEditChecklist={() => setActiveModal('checklist')} onEditAdjustments={() => setActiveModal('adjustments')} onEditFinancials={() => setActiveModal('financials')}
                            onUpdate={updateQuotation} 
                        />
                    </div>
                  </div>
                )}
                {view === 'history' && <History quotations={allQuotations} onView={(id) => { setQuotationData(allQuotations.find(q => q.id === id) || null); setView('generator'); }} onDuplicate={() => {}} onDelete={(id) => { setAllQuotations(p => p.filter(q => q.id !== id)); deleteEntity('quotations', id); }} onBulkDelete={(ids) => { setAllQuotations(p => p.filter(q => !ids.includes(q.id))); ids.forEach(id => deleteEntity('quotations', id)); }} onUpdateStatus={(q) => { setAllQuotations(p => p.map(it => it.id === q.id ? q : it)); syncEntity('quotations', q.id, q); }} onBulkUpdateStatus={() => {}} onConvertToInvoice={(id) => {
                    const q = allQuotations.find(it => it.id === id);
                    if (q) {
                        const invNum = generateInvoiceNumber(allInvoices, settings);
                        const inv = createInvoiceFromQuotation(q, settings, invNum);
                        setAllInvoices(prev => [inv, ...prev]);
                        syncEntity('invoices', inv.id, inv);
                        setView('invoices');
                    }
                }} settings={settings} activeFilterIds={null} onFilterChange={() => {}} />}
                {view === 'invoices' && <Invoices invoices={allInvoices} settings={settings} onEdit={() => {}} onDelete={(id) => { setAllInvoices(p => p.filter(i => i.id !== id)); deleteEntity('invoices', id); }} onUpdate={(inv) => { setAllInvoices(p => p.map(it => it.id === inv.id ? inv : it)); syncEntity('invoices', inv.id, inv); }} />}
                {view === 'clients' && <Clients clients={allClients} quotations={allQuotations} onAdd={() => {}} onEdit={() => {}} onDelete={(id) => { setAllClients(p => p.filter(c => c.id !== id)); deleteEntity('clients', id); }} onViewQuotes={() => setView('history')} />}
                {view === 'expenses' && <Expenses expenses={allExpenses} quotations={allQuotations} onAdd={() => {}} onEdit={() => {}} onDelete={(id) => { setAllExpenses(p => p.filter(e => e.id !== id)); deleteEntity('expenses', id); }} />}
             </div>
        </main>
        <BottomNav view={view} setView={setView} />
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={(s) => { setSettings(s); syncEntity('settings', 'user_settings', s); }} />
      
      {quotationData && (
          <>
            <EditTilesModal isOpen={activeModal === 'tiles'} onClose={() => setActiveModal(null)} currentTiles={quotationData.tiles} settings={settings} onSave={(tiles) => updateQuotation({ tiles })} />
            <EditMaterialsModal isOpen={activeModal === 'materials'} onClose={() => setActiveModal(null)} currentMaterials={quotationData.materials} settings={settings} onSave={(materials) => updateQuotation({ materials })} />
            <EditChecklistModal isOpen={activeModal === 'checklist'} onClose={() => setActiveModal(null)} currentChecklist={quotationData.checklist || []} onSave={(checklist) => updateQuotation({ checklist })} />
            <AddAdjustmentModal isOpen={activeModal === 'adjustments'} onClose={() => setActiveModal(null)} currentAdjustments={quotationData.adjustments || []} onSave={(adjustments) => updateQuotation({ adjustments })} />
            <EditFinancialsModal isOpen={activeModal === 'financials'} onClose={() => setActiveModal(null)} currentData={quotationData} onSave={(updates) => updateQuotation(updates)} />
          </>
      )}
    </div>
  );
};

export default App;
