
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Auth from './components/Auth';
import { QuotationData, ClientDetails, Material, Tile, Settings, InvoiceData, ChecklistItem, Client, Expense, Adjustment } from './types';
import { generateQuotationFromAI, getTextFromImageAI } from './services/geminiService';
import { generateInvoiceNumber, createInvoiceFromQuotation } from './services/invoiceService';
import InputSection from './components/InputSection';
import QuotationDisplay from './components/QuotationDisplay';
import ImageCropper from './components/ImageCropper';
import { HanifgoldLogoIcon, GenerateIcon, SettingsIcon, SunIcon, MoonIcon, DashboardIcon, ClientsIcon, HistoryIcon, InvoiceIcon, ExpenseIcon, PlusIcon, RemoveIcon, WarningIcon } from './components/icons';
import ClientDetailsForm from './components/ClientDetailsForm';
import LoadingSpinner from './components/LoadingSpinner';
import AddMaterialModal from './components/AddMaterialModal';
import EditMaterialsModal from './components/EditMaterialsModal';
import EditTilesModal from './components/EditTilesModal';
import EditChecklistModal from './components/EditChecklistModal';
import AddAdjustmentModal from './components/AddAdjustmentModal';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Invoices from './components/Invoices';
import Clients from './components/Clients';
import Expenses from './components/Expenses';
import ExpenseModal from './components/ExpenseModal';
import ClientModal from './components/ClientModal';
import SettingsModal from './components/SettingsModal';
import BottomNav from './components/BottomNav';
import VoiceAssistantModal from './components/VoiceAssistantModal';
import InvoiceModal from './components/InvoiceModal';
import BulkGeneratorModal from './components/BulkGeneratorModal';
import BulkSuccessModal from './components/BulkSuccessModal';
import { DEFAULT_SETTINGS } from './constants';
import { exportQuotesToZip } from './services/exportService';
import PWAInstallPrompt from './components/PWAInstallPrompt';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

const SupabaseConfigError: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden text-white">
    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/10 rounded-full blur-[120px]"></div>
    <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-red-500/10 rounded-full blur-[100px]"></div>
    
    <div className="w-full max-w-md z-10 text-center space-y-8 animate-fade-in">
       <div className="inline-block p-4 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10 mb-4 shadow-2xl">
          <HanifgoldLogoIcon className="w-16 h-12" />
        </div>
        <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <WarningIcon className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Configuration Required</h1>
            <p className="text-gray-400 font-medium">
                The professional suite requires a valid <span className="text-gold">Supabase</span> connection to securely store your business data.
            </p>
            <div className="bg-black/20 p-4 rounded-2xl text-left space-y-3 text-sm">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Missing Environment Variables:</p>
                <code className="block text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">VITE_SUPABASE_URL</code>
                <code className="block text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">VITE_SUPABASE_ANON_KEY</code>
            </div>
            <p className="text-xs text-gray-500">
                Please add these to your environment configuration to enable secure authentication and cloud sync.
            </p>
            <a 
                href="https://supabase.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full py-4 bg-gold hover:bg-gold-dark text-brand-dark font-black rounded-2xl shadow-xl shadow-gold/20 transform transition-all active:scale-95"
            >
                Visit Supabase Dashboard
            </a>
        </div>
    </div>
  </div>
);

const useHistoryState = <T,>(initialState: T) => {
  const [history, setHistory] = useState({
    past: [] as T[],
    present: initialState,
    future: [] as T[],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const set = useCallback((action: T | ((prevState: T) => T)) => {
    setHistory(current => {
      const newState = typeof action === 'function' 
        ? (action as (prevState: T) => T)(current.present) 
        : action;
        
      if (JSON.stringify(newState) === JSON.stringify(current.present)) {
        return current;
      }
      return {
        past: [...current.past, current.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (!canUndo) return;
    setHistory(current => {
      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, current.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setHistory(current => {
      const next = current.future[0];
      const newFuture = current.future.slice(1);
      return {
        past: [...current.past, current.present],
        present: next,
        future: [current.present, ...current.future],
      };
    });
  }, [canRedo]);
  
  const reset = useCallback((newState: T) => {
      setHistory({
          past: [],
          present: initialState,
          future: []
      });
  }, [initialState]);

  return { state: history.present, set, undo, redo, canUndo, canRedo, reset };
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [view, setView] = useState<'generator' | 'dashboard' | 'history' | 'invoices' | 'clients' | 'expenses'>('dashboard');
  const { state: jobNotes, set: setJobNotes, undo: undoJobNotes, redo: redoJobNotes, canUndo: canUndoJobNotes, canRedo: canRedoJobNotes, reset: resetJobNotes } = useHistoryState<string[]>([]);
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [allQuotations, setAllQuotations] = useState<QuotationData[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceData[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  // Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isEditMaterialsOpen, setIsEditMaterialsOpen] = useState(false);
  const [isEditTilesOpen, setIsEditTilesOpen] = useState(false);
  const [isEditChecklistOpen, setIsEditChecklistOpen] = useState(false);
  const [isAddAdjustmentOpen, setIsAddAdjustmentOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number, message: string } | null>(null);
  const [isBulkSuccessOpen, setIsBulkSuccessOpen] = useState(false);
  const [bulkGeneratedQuotes, setBulkGeneratedQuotes] = useState<QuotationData[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    clientName: '', clientAddress: '', clientPhone: '', clientEmail: '', projectName: '',
    showClientName: true, showClientAddress: true, showClientPhone: true, showProjectName: true,
  });
  const [saveClientInfo, setSaveClientInfo] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [historyFilterIds, setHistoryFilterIds] = useState<string[] | null>(null);

  // Authentication & Initial Data Load
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAppLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserData(session.user.id);
      else setAppLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserData(session.user.id);
      else {
          setAppLoading(false);
          clearLocalState();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearLocalState = () => {
      setAllQuotations([]);
      setAllInvoices([]);
      setAllClients([]);
      setAllExpenses([]);
      setSettings(DEFAULT_SETTINGS);
  };

  const loadUserData = async (userId: string) => {
    setAppLoading(true);
    try {
      const [quotesRes, invoicesRes, clientsRes, expensesRes, settingsRes] = await Promise.all([
        supabase.from('quotations').select('*').eq('user_id', userId),
        supabase.from('invoices').select('*').eq('user_id', userId),
        supabase.from('clients').select('*').eq('user_id', userId),
        supabase.from('expenses').select('*').eq('user_id', userId),
        supabase.from('settings').select('*').eq('user_id', userId).single(),
      ]);

      if (quotesRes.data) setAllQuotations(quotesRes.data.map(r => r.data));
      if (invoicesRes.data) setAllInvoices(invoicesRes.data.map(r => r.data));
      if (clientsRes.data) setAllClients(clientsRes.data.map(r => r.data));
      if (expensesRes.data) setAllExpenses(expensesRes.data.map(r => r.data));
      if (settingsRes.data) setSettings(settingsRes.data.data);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setAppLoading(false);
    }
  };

  // Sync Logic
  const syncTable = async (table: string, items: any[]) => {
      if (!session || !isSupabaseConfigured) return;
      try {
        await supabase.from(table).delete().eq('user_id', session.user.id);
        const rows = items.map(item => ({ user_id: session.user.id, data: item }));
        if (rows.length > 0) await supabase.from(table).insert(rows);
      } catch (e) {
        console.error(`Sync error for table ${table}:`, e);
      }
  };

  useEffect(() => { if (session && !appLoading) syncTable('quotations', allQuotations); }, [allQuotations]);
  useEffect(() => { if (session && !appLoading) syncTable('invoices', allInvoices); }, [allInvoices]);
  useEffect(() => { if (session && !appLoading) syncTable('clients', allClients); }, [allClients]);
  useEffect(() => { if (session && !appLoading) syncTable('expenses', allExpenses); }, [allExpenses]);
  useEffect(() => { 
      if (session && !appLoading) {
          supabase.from('settings').upsert({ user_id: session.user.id, data: settings }).then();
      }
  }, [settings]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await supabase.auth.signOut();
    }
  };

  const handleBulkUpdateStatus = (ids: string[], status: QuotationData['status']) => {
    setAllQuotations(prev => prev.map(q => ids.includes(q.id) ? { ...q, status } : q));
  };

  const handleBulkDelete = (ids: string[]) => {
    setAllQuotations(prev => prev.filter(q => !ids.includes(q.id)));
  };

  // Remaining Handlers
  const handleGenerate = async () => {
      if (jobNotes.length === 0) { alert("Please add at least one note or upload an image."); return; }
      setQuotationData(null);
      try {
        const textInput = jobNotes.join('\n');
        const combinedInput = `Client: ${clientDetails.clientName}\nAddress: ${clientDetails.clientAddress}\nNotes: ${textInput}`;
        const data = await generateQuotationFromAI(combinedInput, settings, settings.addCheckmateDefault, settings.showChecklistDefault);
        const newQuotation: QuotationData = {
            id: crypto.randomUUID(), date: Date.now(), status: 'Pending', ...data,
            clientDetails: { ...data.clientDetails, ...clientDetails, clientEmail: clientDetails.clientEmail || data.clientDetails.clientEmail },
            showMaterials: settings.showMaterialsDefault, showAdjustments: settings.showAdjustmentsDefault,
        };
        setAllQuotations(prev => [newQuotation, ...prev]);
        setQuotationData(newQuotation);
      } catch (error) {
          alert("Generation failed.");
      }
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setSelectedImage(reader.result as string); setShowCropper(true); };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (croppedFile: File) => {
    setShowCropper(false); setIsOcrLoading(true);
    try {
        const text = await getTextFromImageAI(croppedFile);
        setJobNotes(prev => [...prev, ...text.split('\n').filter(line => line.trim() !== '')]);
    } catch (error) { alert("OCR failed."); } finally { setIsOcrLoading(false); }
  };

  const handleConvertToInvoice = (id: string) => {
      const quote = allQuotations.find(q => q.id === id);
      if (!quote) return;
      const num = generateInvoiceNumber(allInvoices, settings);
      const invoice = createInvoiceFromQuotation(quote, settings, num);
      setAllInvoices(prev => [invoice, ...prev]);
      setAllQuotations(prev => prev.map(q => q.id === id ? { ...q, status: 'Invoiced', invoiceId: invoice.id } : q));
      setView('invoices');
  };

  if (appLoading) return <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white"><LoadingSpinner /><p className="mt-4 font-bold tracking-widest text-gold animate-pulse">Initializing Secure Session...</p></div>;
  if (!isSupabaseConfigured) return <SupabaseConfigError />;
  if (!session) return <Auth />;

  return (
    <div className="flex h-screen bg-[#e2e8f0] dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 font-sans overflow-hidden">
      {/* Sidebar Layout */}
      <aside className="hidden md:flex flex-col w-20 hover:w-64 bg-white dark:bg-[#1e293b] m-4 rounded-3xl h-[calc(100vh-2rem)] flex-shrink-0 shadow-2xl z-30 transition-all duration-300 ease-in-out group border border-white/20 dark:border-white/5 relative backdrop-blur-md">
        <div className="p-6 flex items-center gap-4 justify-center group-hover:justify-start whitespace-nowrap">
           <div className="bg-gold/10 p-2 rounded-xl"><HanifgoldLogoIcon className="w-8 h-8" /></div>
           <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"><span className="font-bold text-lg text-brand-dark dark:text-white leading-tight block">Hanifgold</span></div>
        </div>
        <nav className="flex-grow px-3 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {[
            { name: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
            { name: 'generator', label: 'Generator', icon: GenerateIcon },
            { name: 'clients', label: 'Clients', icon: ClientsIcon },
            { name: 'history', label: 'History', icon: HistoryIcon },
            { name: 'invoices', label: 'Invoices', icon: InvoiceIcon },
            { name: 'expenses', label: 'Expenses', icon: ExpenseIcon },
          ].map(item => {
             const isActive = view === item.name;
             return (
               <button key={item.name} onClick={() => setView(item.name as any)} className={`w-full flex items-center gap-4 px-3 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 whitespace-nowrap ${isActive ? 'bg-gold text-white shadow-lg shadow-gold/30' : 'text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700/50 dark:text-slate-400'}`}>
                  <div className="flex-shrink-0 flex items-center justify-center w-8"><item.icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} /></div>
                  <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
               </button>
             );
          })}
        </nav>
        <div className="p-3 mt-auto space-y-2 mb-2">
           <button onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-sm font-medium text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap">
                <div className="flex-shrink-0 flex items-center justify-center w-8">{theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6 text-gold" />}</div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Theme</span>
           </button>
           <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-sm font-medium text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors whitespace-nowrap">
                <div className="flex-shrink-0 flex items-center justify-center w-8"><SettingsIcon className="w-6 h-6" /></div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Settings</span>
           </button>
           <button onClick={handleLogout} className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap">
                <div className="flex-shrink-0 flex items-center justify-center w-8">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Logout</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative md:py-4 md:pr-4">
        <header className="md:hidden h-16 bg-white dark:bg-[#1e293b] border-b flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
             <div className="flex items-center gap-3"><HanifgoldLogoIcon className="w-8 h-8" /><span className="font-bold text-brand-dark dark:text-white">Hanifgold</span></div>
             <button onClick={handleLogout} className="text-red-400 p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1e293b] md:rounded-3xl shadow-2xl relative border border-white/20 dark:border-white/5">
             <div className="sticky top-0 z-20 px-8 py-5 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-md border-b flex items-center justify-between">
                 <div><h2 className="text-2xl font-bold text-brand-dark dark:text-white capitalize">{view}</h2><p className="text-sm text-gray-500">{session.user.email}</p></div>
                 <div className="hidden md:flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold to-amber-600 text-white flex items-center justify-center text-sm font-bold shadow-md">HG</div></div>
             </div>
             <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
                {view === 'dashboard' && <Dashboard quotations={allQuotations} invoices={allInvoices} expenses={allExpenses} settings={settings} />}
                {view === 'generator' && (
                  <div className="grid xl:grid-cols-12 gap-8 h-full">
                    <div className="xl:col-span-4 flex flex-col gap-6">
                      <ClientDetailsForm details={clientDetails} setDetails={setClientDetails} disabled={!!quotationData} allClients={allClients} saveClientInfo={saveClientInfo} setSaveClientInfo={setSaveClientInfo} />
                      <InputSection notes={jobNotes} setNotes={setJobNotes} disabled={!!quotationData} onImageUpload={handleImageUpload} onRemoveImage={() => setSelectedImage(null)} imagePreview={selectedImage} isOcrLoading={isOcrLoading} onOpenVoiceModal={() => setIsVoiceModalOpen(true)} onOpenBulkModal={() => setIsBulkModalOpen(true)} onUndo={undoJobNotes} onRedo={redoJobNotes} canUndo={canUndoJobNotes} canRedo={canRedoJobNotes} />
                      {!quotationData ? <button onClick={handleGenerate} className="w-full py-4 bg-brand-dark hover:bg-black text-white font-bold rounded-2xl flex items-center justify-center gap-3">{isOcrLoading ? <LoadingSpinner /> : <GenerateIcon className="w-5 h-5 text-gold" />} Generate Quotation</button> : <button onClick={() => { setQuotationData(null); resetJobNotes([]); }} className="w-full py-4 border-2 border-gold text-gold-dark font-bold rounded-2xl flex items-center justify-center gap-3"><PlusIcon className="w-5 h-5" /> Start New</button>}
                    </div>
                    <div className="xl:col-span-8"><QuotationDisplay data={quotationData} isLoading={false} settings={settings} onAddMaterial={() => setIsAddMaterialOpen(true)} onEditMaterials={() => setIsEditMaterialsOpen(true)} onEditTiles={() => setIsEditTilesOpen(true)} onEditChecklist={() => setIsEditChecklistOpen(true)} onAddAdjustment={() => setIsAddAdjustmentOpen(true)} onUpdate={setQuotationData} /></div>
                  </div>
                )}
                {view === 'history' && (
                  <History 
                    quotations={allQuotations} 
                    onView={(id) => { setQuotationData(allQuotations.find(q => q.id === id) || null); setView('generator'); }} 
                    onDuplicate={() => {}} 
                    onDelete={(id) => setAllQuotations(q => q.filter(x => x.id !== id))} 
                    onBulkDelete={handleBulkDelete}
                    onUpdateStatus={(updated) => setAllQuotations(prev => prev.map(q => q.id === updated.id ? updated : q))} 
                    onBulkUpdateStatus={handleBulkUpdateStatus}
                    onConvertToInvoice={handleConvertToInvoice} 
                    settings={settings} 
                    activeFilterIds={historyFilterIds} 
                    onFilterChange={() => {}} 
                  />
                )}
                {view === 'invoices' && <Invoices invoices={allInvoices} settings={settings} onEdit={(id) => { setEditingInvoice(allInvoices.find(i => i.id === id) || null); setIsInvoiceModalOpen(true); }} onDelete={(id) => setAllInvoices(i => i.filter(x => x.id !== id))} onUpdate={(inv) => setAllInvoices(i => i.map(x => x.id === inv.id ? inv : x))} />}
                {view === 'clients' && <Clients clients={allClients} quotations={allQuotations} onAdd={() => setIsClientModalOpen(true)} onEdit={(c) => { setEditingClient(c); setIsClientModalOpen(true); }} onDelete={(id) => setAllClients(c => c.filter(x => x.id !== id))} onViewQuotes={() => setView('history')} />}
                {view === 'expenses' && <Expenses expenses={allExpenses} quotations={allQuotations} onAdd={() => setIsExpenseModalOpen(true)} onEdit={(e) => { setEditingExpense(e); setIsExpenseModalOpen(true); }} onDelete={(id) => setAllExpenses(e => e.filter(x => x.id !== id))} />}
             </div>
        </main>
        <BottomNav view={view} setView={setView} />
      </div>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={setSettings} />
      <InvoiceModal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} onSave={(inv) => setAllInvoices(i => i.map(x => x.id === inv.id ? inv : x))} invoice={editingInvoice!} settings={settings} />
      {showCropper && selectedImage && <ImageCropper imageSrc={selectedImage} onConfirm={handleCropConfirm} onCancel={() => setShowCropper(false)} />}
    </div>
  );
};

export default App;
