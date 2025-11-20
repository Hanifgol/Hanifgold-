import React, { useState, useCallback, useEffect, useRef } from 'react';
import { QuotationData, ClientDetails, Material, Tile, Settings, InvoiceData, ChecklistItem, Client, Expense, Adjustment } from './types';
import { generateQuotationFromAI, getTextFromImageAI } from './services/geminiService';
import InputSection from './components/InputSection';
import QuotationDisplay from './components/QuotationDisplay';
import ImageCropper from './components/ImageCropper';
import { HanifgoldLogoIcon, GenerateIcon, SettingsIcon, SunIcon, MoonIcon, DashboardIcon, ClientsIcon, HistoryIcon, InvoiceIcon, ExpenseIcon, PlusIcon } from './components/icons';
import ClientDetailsForm from './components/ClientDetailsForm';
import LoadingSpinner from './components/LoadingSpinner';
import AddMaterialModal from './components/AddMaterialModal';
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


const QUOTATIONS_KEY = 'tilingAiQuotations';
const INVOICES_KEY = 'tilingAiInvoices';
const CLIENTS_KEY = 'tilingAiClients';
const EXPENSES_KEY = 'tilingAiExpenses';
const SETTINGS_KEY = 'tilingAiSettings';
const PWA_PROMPT_DISMISSED_KEY = 'pwaPromptDismissed';
const THEME_KEY = 'theme';


interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

// Custom hook for managing state with undo/redo capabilities
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
        future: newFuture,
      };
    });
  }, [canRedo]);
  
  const reset = useCallback((newState: T) => {
      setHistory({
          past: [],
          present: newState,
          future: []
      });
  }, []);

  return { state: history.present, set, undo, redo, canUndo, canRedo, reset };
};


const App: React.FC = () => {
  const [view, setView] = useState<'generator' | 'dashboard' | 'history' | 'invoices' | 'clients' | 'expenses'>('dashboard');
  const { state: jobNotes, set: setJobNotes, undo: undoJobNotes, redo: redoJobNotes, canUndo: canUndoJobNotes, canRedo: canRedoJobNotes, reset: resetJobNotes } = useHistoryState<string[]>([]);
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) return savedTheme as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  
  const [settings, setSettings] = useState<Settings>(() => {
      try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        return savedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } : DEFAULT_SETTINGS;
      } catch (error) {
        console.error('Failed to parse settings from localStorage', error);
        return DEFAULT_SETTINGS;
      }
  });
  
  const [allQuotations, setAllQuotations] = useState<QuotationData[]>(() => {
    try {
      const savedQuotations = localStorage.getItem(QUOTATIONS_KEY);
      const parsedQuotations = savedQuotations ? JSON.parse(savedQuotations) : [];
      
      if (!Array.isArray(parsedQuotations)) return [];

      // Migration for new properties with strict safety checks
      return parsedQuotations.map((q: any) => {
          if (!q || typeof q !== 'object') return null;
          return {
            ...q,
            status: q.status || 'Pending',
            invoiceId: q.invoiceId || undefined,
            isBulkGenerated: q.isBulkGenerated || false,
            checklist: Array.isArray(q.checklist) ? q.checklist : [],
            adjustments: Array.isArray(q.adjustments) ? q.adjustments : [],
            depositPercentage: q.depositPercentage ?? null,
            showMaterials: q.showMaterials ?? true,
            showAdjustments: q.showAdjustments ?? true,
            showBankDetails: q.showBankDetails ?? true,
            showTerms: q.showTerms ?? settings.showTermsAndConditions,
            showWorkmanship: q.showWorkmanship ?? true,
            showMaintenance: q.showMaintenance ?? settings.showMaintenance,
            showTax: q.showTax ?? settings.showTax,
            showCostSummary: q.showCostSummary ?? true,
            clientDetails: {
                ...(q.clientDetails || {}),
                showClientName: q.clientDetails?.showClientName ?? true,
                showClientAddress: q.clientDetails?.showClientAddress ?? true,
                showClientPhone: q.clientDetails?.showClientPhone ?? true,
                showProjectName: q.clientDetails?.showProjectName ?? true,
                clientId: q.clientDetails?.clientId,
            }
          };
      }).filter((q: any) => q !== null);
    } catch (error) {
      console.error('Failed to parse quotations from localStorage', error);
      return [];
    }
  });

   const [allInvoices, setAllInvoices] = useState<InvoiceData[]>(() => {
    try {
        const savedInvoices = localStorage.getItem(INVOICES_KEY);
        const parsed = savedInvoices ? JSON.parse(savedInvoices) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse invoices from localStorage', error);
        return [];
    }
  });
  
  const [allClients, setAllClients] = useState<Client[]>(() => {
    try {
        const savedClients = localStorage.getItem(CLIENTS_KEY);
        const parsed = savedClients ? JSON.parse(savedClients) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse clients from localStorage', error);
        return [];
    }
  });
  
  const [allExpenses, setAllExpenses] = useState<Expense[]>(() => {
    try {
        const savedExpenses = localStorage.getItem(EXPENSES_KEY);
        const parsed = savedExpenses ? JSON.parse(savedExpenses) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to parse expenses from localStorage', error);
        return [];
    }
  });


  const [historyFilterIds, setHistoryFilterIds] = useState<string[] | null>(null);

  useEffect(() => {
    localStorage.setItem(QUOTATIONS_KEY, JSON.stringify(allQuotations));
  }, [allQuotations]);

  useEffect(() => {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(allInvoices));
  }, [allInvoices]);
  
  useEffect(() => {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(allClients));
  }, [allClients]);

  useEffect(() => {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(allExpenses));
  }, [allExpenses]);
  
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);


  // Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
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
  
  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const isDismissed = localStorage.getItem(PWA_PROMPT_DISMISSED_KEY);
      if (!isDismissed) {
        setShowInstallPrompt(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, 'true');
  };

  // Form State
  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    projectName: '',
    showClientName: true,
    showClientAddress: true,
    showClientPhone: true,
    showProjectName: true,
  });
  const [saveClientInfo, setSaveClientInfo] = useState(false);
  
  // Image Cropper
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // Generator Logic
  const handleGenerate = async () => {
      if (jobNotes.length === 0) {
          alert("Please add at least one note or upload an image.");
          return;
      }
      
      setQuotationData(null); // Clear previous result

      try {
        const textInput = jobNotes.join('\n');
        
        // Ensure client details are passed if available, or extracted from text
        const combinedInput = `
            Client Name: ${clientDetails.clientName}
            Client Address: ${clientDetails.clientAddress}
            Client Phone: ${clientDetails.clientPhone}
            Project Name: ${clientDetails.projectName}
            
            Job Notes:
            ${textInput}
        `;

        const data = await generateQuotationFromAI(combinedInput, settings, settings.addCheckmateDefault, settings.showChecklistDefault);
        
        const newQuotation: QuotationData = {
            id: crypto.randomUUID(),
            date: Date.now(),
            status: 'Pending',
            ...data,
            clientDetails: {
                ...data.clientDetails,
                // Preserve toggle states from form if not explicitly overridden by AI logic (AI usually just returns strings)
                showClientName: clientDetails.showClientName,
                showClientAddress: clientDetails.showClientAddress,
                showClientPhone: clientDetails.showClientPhone,
                showProjectName: clientDetails.showProjectName,
                clientId: clientDetails.clientId,
            },
             showMaterials: settings.showMaterialsDefault,
             showAdjustments: settings.showAdjustmentsDefault,
        };

        setQuotationData(newQuotation);
        setAllQuotations(prev => [newQuotation, ...prev]);
        
        // Auto-save client if checked and not already saved
        if (saveClientInfo && newQuotation.clientDetails.clientName && !newQuotation.clientDetails.clientId) {
            const newClient: Client = {
                id: crypto.randomUUID(),
                name: newQuotation.clientDetails.clientName,
                address: newQuotation.clientDetails.clientAddress,
                phone: newQuotation.clientDetails.clientPhone,
            };
            setAllClients(prev => [...prev, newClient]);
            // Update the current quotation to link to this new client
             setQuotationData(prev => prev ? ({ ...prev, clientDetails: { ...prev.clientDetails, clientId: newClient.id } }) : null);
        }

      } catch (error) {
          console.error(error);
          alert("Failed to generate quotation. Please check your API key or try again.");
      }
  };

  // Image Handling
  const handleImageUpload = (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
          setSelectedImage(reader.result as string);
          setShowCropper(true);
      };
      reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (croppedFile: File) => {
      setShowCropper(false);
      setIsOcrLoading(true);
      try {
          const text = await getTextFromImageAI(croppedFile);
          setJobNotes(prev => [...prev, ...text.split('\n').filter(line => line.trim() !== '')]);
          setSelectedImage(URL.createObjectURL(croppedFile)); // Show cropped preview
      } catch (error) {
          console.error(error);
          alert("Failed to extract text from image.");
          setSelectedImage(null);
      } finally {
          setIsOcrLoading(false);
      }
  };

  const handleCropCancel = () => {
      setShowCropper(false);
      setSelectedImage(null);
  };

  // Data Management Handlers
  const handleBackup = () => {
      const backupData = {
          version: 1,
          date: new Date().toISOString(),
          quotations: allQuotations,
          invoices: allInvoices,
          clients: allClients,
          expenses: allExpenses,
          settings: settings
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hanifgold_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleRestore = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const data = JSON.parse(e.target?.result as string);
              // Basic validation
              if (typeof data !== 'object' || data === null) throw new Error("Invalid file format");
              
              if (data.quotations && Array.isArray(data.quotations)) setAllQuotations(data.quotations);
              if (data.invoices && Array.isArray(data.invoices)) setAllInvoices(data.invoices);
              if (data.clients && Array.isArray(data.clients)) setAllClients(data.clients);
              if (data.expenses && Array.isArray(data.expenses)) setAllExpenses(data.expenses);
              if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
              
              alert('Data restored successfully!');
          } catch (err) {
              console.error(err);
              alert('Failed to restore data. The file may be corrupted or invalid.');
          }
      };
      reader.readAsText(file);
  };


  // Other Handlers
  const handleQuotationUpdate = (updatedQuotation: QuotationData) => {
      setQuotationData(updatedQuotation);
      setAllQuotations(prev => prev.map(q => q.id === updatedQuotation.id ? updatedQuotation : q));
  };
  
  const handleViewQuotation = (id: string) => {
      const quote = allQuotations.find(q => q.id === id);
      if (quote) {
          setQuotationData(quote);
          setClientDetails(quote.clientDetails); // Populate form for context
          setJobNotes([]); // Clear notes to avoid confusion
          resetJobNotes([]); // Reset undo history
          setView('generator');
      }
  };
  
  const handleDuplicateQuotation = (id: string) => {
      const quote = allQuotations.find(q => q.id === id);
      if (quote) {
          const newQuote = { 
              ...quote, 
              id: crypto.randomUUID(), 
              date: Date.now(), 
              status: 'Pending' as const,
              invoiceId: undefined,
              clientDetails: { ...quote.clientDetails, projectName: `${quote.clientDetails.projectName} (Copy)` }
          };
          setAllQuotations(prev => [newQuote, ...prev]);
          alert("Quotation duplicated successfully.");
      }
  };

  const handleDeleteQuotation = (id: string) => {
      if (window.confirm("Are you sure you want to delete this quotation?")) {
        setAllQuotations(prev => prev.filter(q => q.id !== id));
        if (quotationData?.id === id) {
            setQuotationData(null);
        }
      }
  };

  const handleConvertToInvoice = (id: string) => {
      const quote = allQuotations.find(q => q.id === id);
      if (!quote) return;
      if (quote.invoiceId) {
          alert("This quotation has already been invoiced.");
          return;
      }

      const newInvoice: InvoiceData = {
          id: crypto.randomUUID(),
          quotationId: quote.id,
          invoiceNumber: `${settings.invoicePrefix}-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
          invoiceDate: Date.now(),
          dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // +7 days default
          status: 'Unpaid',
          clientDetails: quote.clientDetails,
          tiles: quote.tiles,
          materials: quote.materials,
          workmanshipRate: quote.workmanshipRate,
          maintenance: quote.maintenance,
          profitPercentage: quote.profitPercentage,
          paymentTerms: 'Due on Receipt',
          bankDetails: settings.defaultBankDetails,
          invoiceNotes: settings.defaultInvoiceNotes,
          showMaterials: quote.showMaterials,
          showAdjustments: quote.showAdjustments,
      };
      
      setAllInvoices(prev => [newInvoice, ...prev]);
      // Update quotation status
      const updatedQuote = { ...quote, status: 'Invoiced' as const, invoiceId: newInvoice.id };
      handleQuotationUpdate(updatedQuote);
      
      setView('invoices');
      setEditingInvoice(newInvoice);
      setIsInvoiceModalOpen(true);
  };
  
  // Client Management
  const handleSaveClient = (client: Client) => {
      if (client.id) {
          setAllClients(prev => prev.map(c => c.id === client.id ? client : c));
      } else {
          setAllClients(prev => [...prev, { ...client, id: crypto.randomUUID() }]);
      }
      setIsClientModalOpen(false);
      setEditingClient(null);
  };
  
  const handleDeleteClient = (id: string) => {
      if (window.confirm("Delete this client? Quotations linked to this client will remain but lose the link.")) {
          setAllClients(prev => prev.filter(c => c.id !== id));
      }
  };

  // Expense Management
  const handleSaveExpense = (expense: Expense) => {
      if (expense.id) {
          setAllExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
      } else {
          setAllExpenses(prev => [...prev, { ...expense, id: crypto.randomUUID() }]);
      }
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
  };
  
  const handleDeleteExpense = (id: string) => {
      if (window.confirm("Delete this expense record?")) {
          setAllExpenses(prev => prev.filter(e => e.id !== id));
      }
  };
  
  // Invoice Management
  const handleSaveInvoice = (invoice: InvoiceData) => {
      setAllInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
      setIsInvoiceModalOpen(false);
      setEditingInvoice(null);
  };
  
  const handleDeleteInvoice = (id: string) => {
      if (window.confirm("Delete this invoice? The linked quotation will revert to Accepted status.")) {
          const inv = allInvoices.find(i => i.id === id);
          setAllInvoices(prev => prev.filter(i => i.id !== id));
          if (inv && inv.quotationId) {
              const quote = allQuotations.find(q => q.id === inv.quotationId);
              if (quote) {
                  handleQuotationUpdate({ ...quote, status: 'Accepted', invoiceId: undefined });
              }
          }
      }
  }

  // Voice Command Handler
  const handleVoiceCommand = (command: string) => {
      const cmd = command.toLowerCase();
      setIsVoiceModalOpen(false);
      
      if (cmd.includes('dashboard')) setView('dashboard');
      else if (cmd.includes('history')) setView('history');
      else if (cmd.includes('invoices')) setView('invoices');
      else if (cmd.includes('clients')) setView('clients');
      else if (cmd.includes('expenses')) setView('expenses');
      else if (cmd.includes('create quotation') || cmd.includes('generator')) setView('generator');
      else if (cmd.includes('add note') && view === 'generator') {
          // This is tricky without context, usually speech-to-text fills the input
          setJobNotes(prev => [...prev, cmd.replace('add note', '').trim()]);
      }
  };

  // Bulk Generation Handler
  const handleBulkGenerate = async (mode: 'sameClient' | 'sameJob' | 'csv', data: any) => {
      setIsBulkModalOpen(false);
      setBulkGeneratedQuotes([]);
      
      let tasks: { client: ClientDetails; text: string }[] = [];
      
      if (mode === 'sameClient') {
          const { client, jobs } = data;
          tasks = jobs.map((job: string) => ({ client, text: job }));
      } else if (mode === 'sameJob') {
          const { job, clients } = data;
          tasks = clients.map((client: ClientDetails) => ({ client, text: job }));
      } else if (mode === 'csv') {
          tasks = data.tasks;
      }
      
      if (tasks.length === 0) return;
      
      setBulkProgress({ current: 0, total: tasks.length, message: 'Starting bulk generation...' });
      setIsBulkModalOpen(true);

      const generated: QuotationData[] = [];

      for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          setBulkProgress({ current: i + 1, total: tasks.length, message: `Generating quote for ${task.client.clientName}...` });
          
          try {
              const combinedInput = `
                Client Name: ${task.client.clientName}
                Client Address: ${task.client.clientAddress}
                Client Phone: ${task.client.clientPhone}
                Project Name: ${task.client.projectName}
                
                Job Notes:
                ${task.text}
              `;
              
              const aiData = await generateQuotationFromAI(combinedInput, settings, settings.addCheckmateDefault, settings.showChecklistDefault);
              const newQuote: QuotationData = {
                  id: crypto.randomUUID(),
                  date: Date.now(),
                  status: 'Pending',
                  ...aiData,
                  isBulkGenerated: true,
                  clientDetails: {
                       ...aiData.clientDetails,
                       // Ensure display toggles from CSV/Input are respected if they exist in task.client, else default true
                       showClientName: true, 
                       showClientAddress: true,
                       showClientPhone: true,
                       showProjectName: true,
                  },
                  showMaterials: settings.showMaterialsDefault,
                  showAdjustments: settings.showAdjustmentsDefault,
              };
              
              generated.push(newQuote);
              
          } catch (e) {
              console.error(`Failed to generate for ${task.client.clientName}`, e);
              // Continue to next task even if one fails
          }
      }
      
      setAllQuotations(prev => [...generated, ...prev]);
      setBulkGeneratedQuotes(generated);
      setBulkProgress(null);
      setIsBulkModalOpen(false);
      setIsBulkSuccessOpen(true);
  };
  
  const handleBulkSuccessAction = (action: 'view' | 'download' | 'history') => {
      setIsBulkSuccessOpen(false);
      if (action === 'view') {
          setHistoryFilterIds(bulkGeneratedQuotes.map(q => q.id));
          setView('history');
      } else if (action === 'download') {
          exportQuotesToZip(bulkGeneratedQuotes, settings);
      } else if (action === 'history') {
          setHistoryFilterIds(null);
          setView('history');
      }
  };

  // Main Render
  return (
    <div className="flex h-screen bg-brand-light dark:bg-brand-dark text-slate-700 dark:text-slate-200 font-sans overflow-hidden">
      {/* Modern White Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-surface-dark border-r border-border-color dark:border-border-dark h-full flex-shrink-0 shadow-soft z-20">
        <div className="p-6 flex items-center gap-3 mb-2">
           <HanifgoldLogoIcon className="w-10 h-10" />
           <div>
              <span className="font-bold text-lg text-brand-dark dark:text-white leading-tight block">Hanifgold</span>
              <span className="text-[10px] uppercase tracking-widest text-gold font-bold">AI Assistant</span>
           </div>
        </div>
        
        <nav className="flex-grow px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {[
            { name: 'dashboard', label: 'Overview', icon: DashboardIcon },
            { name: 'generator', label: 'New Quotation', icon: GenerateIcon },
            { name: 'clients', label: 'Clients', icon: ClientsIcon },
            { name: 'history', label: 'Quotations', icon: HistoryIcon },
            { name: 'invoices', label: 'Invoices', icon: InvoiceIcon },
            { name: 'expenses', label: 'Expenses', icon: ExpenseIcon },
          ].map(item => {
             const isActive = view === item.name;
             return (
               <button
                  key={item.name}
                  onClick={() => setView(item.name as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                      ? 'bg-gold-light/50 text-gold-dark border-l-4 border-gold' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
               >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-gold' : 'text-slate-400'}`} />
                  {item.label}
               </button>
             );
          })}
        </nav>
        
        <div className="p-4 mt-auto space-y-2 border-t border-border-color dark:border-slate-700">
           <button 
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
            >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5 text-gold" />}
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
           </button>
           <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
            >
                <SettingsIcon className="w-5 h-5" />
                Settings
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-16 bg-white dark:bg-surface-dark border-b border-border-color dark:border-border-dark flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
             <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                <div className="md:hidden flex items-center gap-3">
                    <HanifgoldLogoIcon className="w-8 h-8" />
                    <span className="font-bold text-brand-dark dark:text-white">Hanifgold</span>
                </div>
                {/* Page Title */}
                <div className="hidden md:block">
                    <h2 className="text-lg font-bold text-brand-dark dark:text-white capitalize tracking-tight">{view === 'generator' ? 'Quotation Generator' : view}</h2>
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                 <div className="h-9 w-9 rounded-full bg-gold-light text-gold-dark border border-gold/20 flex items-center justify-center text-sm font-bold shadow-sm">
                     HG
                 </div>
             </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-brand-light dark:bg-brand-dark p-4 md:p-8">
             <div className="max-w-7xl mx-auto h-full">
                {view === 'dashboard' && <Dashboard quotations={allQuotations} invoices={allInvoices} expenses={allExpenses} settings={settings} />}
                
                {view === 'generator' && (
                <div className="grid xl:grid-cols-12 gap-6 h-full">
                    {/* Left Panel: Input Form */}
                    <div className="xl:col-span-5 flex flex-col gap-6 h-full overflow-y-auto pr-1 pb-20">
                        <ClientDetailsForm 
                            details={clientDetails} 
                            setDetails={setClientDetails} 
                            disabled={!!quotationData} 
                            allClients={allClients}
                            saveClientInfo={saveClientInfo}
                            setSaveClientInfo={setSaveClientInfo}
                        />
                        <InputSection
                            notes={jobNotes}
                            setNotes={setJobNotes}
                            disabled={!!quotationData}
                            onImageUpload={handleImageUpload}
                            onRemoveImage={() => { setSelectedImage(null); setShowCropper(false); }}
                            imagePreview={selectedImage}
                            isOcrLoading={isOcrLoading}
                            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
                            onOpenBulkModal={() => setIsBulkModalOpen(true)}
                            onUndo={undoJobNotes}
                            onRedo={redoJobNotes}
                            canUndo={canUndoJobNotes}
                            canRedo={canRedoJobNotes}
                        />
                        
                        {!quotationData ? (
                            <button
                                onClick={handleGenerate}
                                disabled={isOcrLoading} 
                                className="w-full py-4 bg-brand-dark hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                            >
                                {isOcrLoading ? <LoadingSpinner /> : <GenerateIcon className="w-5 h-5 text-gold" />}
                                Generate Quotation
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setQuotationData(null);
                                    setJobNotes([]);
                                    resetJobNotes([]);
                                    setClientDetails({
                                        clientName: '', clientAddress: '', clientPhone: '', projectName: '',
                                        showClientName: true, showClientAddress: true, showClientPhone: true, showProjectName: true
                                    });
                                    setSaveClientInfo(false);
                                }}
                                className="w-full py-4 bg-white dark:bg-surface-dark border-2 border-gold text-gold-dark font-bold rounded-xl shadow-sm hover:bg-gold-light/20 transition flex items-center justify-center gap-3"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Start New Quotation
                            </button>
                        )}
                    </div>
                    
                    {/* Right Panel: Document Preview */}
                    <div className="xl:col-span-7 h-full flex flex-col bg-gray-100 dark:bg-gray-900 rounded-2xl border border-border-color dark:border-border-dark overflow-hidden relative shadow-inner">
                        <div className="absolute top-0 left-0 right-0 h-12 bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-b border-gray-300 dark:border-gray-700 z-10 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Document Preview
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pt-16 flex justify-center bg-slate-200/50 dark:bg-slate-900">
                            <QuotationDisplay 
                                data={quotationData} 
                                isLoading={false} 
                                settings={settings}
                                onAddMaterial={() => setIsAddMaterialOpen(true)}
                                onEditTiles={() => setIsEditTilesOpen(true)}
                                onEditChecklist={() => setIsEditChecklistOpen(true)}
                                onAddAdjustment={() => setIsAddAdjustmentOpen(true)}
                                onUpdate={handleQuotationUpdate}
                            />
                        </div>
                    </div>
                </div>
                )}

                {view === 'clients' && (
                    <Clients 
                        clients={allClients} 
                        quotations={allQuotations}
                        onAdd={() => { setEditingClient(null); setIsClientModalOpen(true); }}
                        onEdit={(client) => { setEditingClient(client); setIsClientModalOpen(true); }}
                        onDelete={handleDeleteClient}
                        onViewQuotes={(clientId) => {
                            setHistoryFilterIds(allQuotations.filter(q => q.clientDetails.clientId === clientId).map(q => q.id));
                            setView('history');
                        }}
                    />
                )}

                {view === 'history' && (
                    <History 
                        quotations={allQuotations} 
                        onView={handleViewQuotation} 
                        onDuplicate={handleDuplicateQuotation}
                        onDelete={handleDeleteQuotation}
                        onUpdateStatus={handleQuotationUpdate}
                        onConvertToInvoice={handleConvertToInvoice}
                        settings={settings}
                        activeFilterIds={historyFilterIds}
                        onFilterChange={() => setHistoryFilterIds(null)} 
                    />
                )}
                
                {view === 'invoices' && (
                    <Invoices 
                        invoices={allInvoices}
                        settings={settings}
                        onEdit={(id) => {
                            const inv = allInvoices.find(i => i.id === id);
                            if (inv) { setEditingInvoice(inv); setIsInvoiceModalOpen(true); }
                        }}
                        onDelete={handleDeleteInvoice}
                        onUpdate={handleSaveInvoice}
                    />
                )}

                {view === 'expenses' && (
                    <Expenses 
                        expenses={allExpenses}
                        quotations={allQuotations}
                        onAdd={() => { setEditingExpense(null); setIsExpenseModalOpen(true); }}
                        onEdit={(expense) => { setEditingExpense(expense); setIsExpenseModalOpen(true); }}
                        onDelete={handleDeleteExpense}
                    />
                )}
             </div>
        </main>

        {/* Mobile Navigation */}
        <BottomNav view={view} setView={setView} />

      </div>

      {/* PWA Install Prompt */}
      {showInstallPrompt && <PWAInstallPrompt onInstall={handleInstallClick} onDismiss={handleDismissInstall} />}

      {/* Modals - Z-Index boosted for reliability */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onSave={setSettings} 
        onBackup={handleBackup}
        onRestore={handleRestore}
      />
      
      <AddMaterialModal 
        isOpen={isAddMaterialOpen} 
        onClose={() => setIsAddMaterialOpen(false)} 
        onSave={(material) => {
            if (quotationData) {
                const updated = { ...quotationData, materials: [...quotationData.materials, material] };
                handleQuotationUpdate(updated);
            }
        }} 
        settings={settings}
      />

      <EditTilesModal 
        isOpen={isEditTilesOpen} 
        onClose={() => setIsEditTilesOpen(false)} 
        onSave={(updatedTiles) => {
            if (quotationData) handleQuotationUpdate({ ...quotationData, tiles: updatedTiles });
            setIsEditTilesOpen(false);
        }}
        currentTiles={quotationData?.tiles || []}
        settings={settings}
      />

      <EditChecklistModal
         isOpen={isEditChecklistOpen}
         onClose={() => setIsEditChecklistOpen(false)}
         onSave={(updatedChecklist) => {
             if (quotationData) handleQuotationUpdate({ ...quotationData, checklist: updatedChecklist });
             setIsEditChecklistOpen(false);
         }}
         currentChecklist={quotationData?.checklist || []}
      />
      
      <AddAdjustmentModal 
          isOpen={isAddAdjustmentOpen}
          onClose={() => setIsAddAdjustmentOpen(false)}
          onSave={(updatedAdjustments) => {
              if (quotationData) handleQuotationUpdate({ ...quotationData, adjustments: updatedAdjustments });
              setIsAddAdjustmentOpen(false);
          }}
          currentAdjustments={quotationData?.adjustments || []}
      />
      
      <ExpenseModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        expenseToEdit={editingExpense}
        quotations={allQuotations}
        settings={settings}
      />
      
      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        clientToEdit={editingClient}
      />
      
      <VoiceAssistantModal 
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onCommand={handleVoiceCommand}
      />
      
      {editingInvoice && (
          <InvoiceModal 
            isOpen={isInvoiceModalOpen}
            onClose={() => setIsInvoiceModalOpen(false)}
            onSave={handleSaveInvoice}
            invoice={editingInvoice}
            settings={settings}
          />
      )}
      
      <BulkGeneratorModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onGenerate={handleBulkGenerate}
        progress={bulkProgress}
      />
      
      <BulkSuccessModal 
        isOpen={isBulkSuccessOpen}
        onClose={() => setIsBulkSuccessOpen(false)}
        generatedQuotes={bulkGeneratedQuotes}
        onDownloadZip={() => handleBulkSuccessAction('download')}
        onViewInHistory={() => handleBulkSuccessAction('view')}
        onGoToHistory={() => handleBulkSuccessAction('history')}
      />

      {showCropper && selectedImage && (
        <ImageCropper 
            imageSrc={selectedImage} 
            onConfirm={handleCropConfirm} 
            onCancel={handleCropCancel} 
        />
      )}
    </div>
  );
};

export default App;