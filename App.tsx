import React, { useState, useCallback, useEffect, useRef } from 'react';
import { QuotationData, ClientDetails, Material, Tile, Settings, InvoiceData, ChecklistItem, Client, Expense } from './types';
import { generateQuotationFromAI, getTextFromImageAI } from './services/geminiService';
import InputSection from './components/InputSection';
import QuotationDisplay from './components/QuotationDisplay';
import ImageCropper from './components/ImageCropper';
import { HanifgoldLogoIcon, GenerateIcon, SettingsIcon, SunIcon, MoonIcon } from './components/icons';
import ClientDetailsForm from './components/ClientDetailsForm';
import LoadingSpinner from './components/LoadingSpinner';
import AddMaterialModal from './components/AddMaterialModal';
import EditTilesModal from './components/EditTilesModal';
import EditChecklistModal from './components/EditChecklistModal';
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
import { exportToPdf, exportQuotesToZip } from './services/exportService';
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

const App: React.FC = () => {
  const [view, setView] = useState<'generator' | 'dashboard' | 'history' | 'invoices' | 'clients' | 'expenses'>('dashboard');
  const [jobNotes, setJobNotes] = useState<string[]>([]);
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
      // Initial simple migration for properties that don't depend on settings
      return parsedQuotations.map((q: any) => ({
          ...q,
          status: q.status || 'Pending',
          invoiceId: q.invoiceId || undefined,
          isBulkGenerated: q.isBulkGenerated || false,
          checklist: q.checklist || [],
          clientDetails: {
              ...q.clientDetails,
              showClientName: q.clientDetails.showClientName ?? true,
              showClientAddress: q.clientDetails.showClientAddress ?? true,
              showClientPhone: q.clientDetails.showClientPhone ?? true,
              showProjectName: q.clientDetails.showProjectName ?? true,
          }
      }));
    } catch (error) {
      console.error('Failed to parse quotations from localStorage', error);
      return [];
    }
  });

   const [allInvoices, setAllInvoices] = useState<InvoiceData[]>(() => {
    try {
        const savedInvoices = localStorage.getItem(INVOICES_KEY);
        return savedInvoices ? JSON.parse(savedInvoices) : [];
    } catch (error) {
        console.error('Failed to parse invoices from localStorage', error);
        return [];
    }
  });
  
  const [allClients, setAllClients] = useState<Client[]>(() => {
    try {
        const savedClients = localStorage.getItem(CLIENTS_KEY);
        return savedClients ? JSON.parse(savedClients) : [];
    } catch (error) {
        console.error('Failed to parse clients from localStorage', error);
        return [];
    }
  });
  
  const [allExpenses, setAllExpenses] = useState<Expense[]>(() => {
    try {
        const savedExpenses = localStorage.getItem(EXPENSES_KEY);
        return savedExpenses ? JSON.parse(savedExpenses) : [];
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

  // One-time migration effects
  useEffect(() => {
    const quotesNeedTermsMigration = allQuotations.some(q => !q.hasOwnProperty('termsAndConditions'));
    if (quotesNeedTermsMigration) {
      console.log("Migrating quotations to include default terms and conditions...");
      setAllQuotations(prev => prev.map(q => ({
        ...q,
        termsAndConditions: q.termsAndConditions || settings.defaultTermsAndConditions
      })));
    }
    
    const quotesNeedCheckmateMigration = allQuotations.some(q => !q.hasOwnProperty('addCheckmate'));
    if (quotesNeedCheckmateMigration) {
      console.log("Migrating quotations to include addCheckmate property...");
      setAllQuotations(prev => prev.map(q => ({
        ...q,
        addCheckmate: q.addCheckmate ?? settings.addCheckmateDefault
      })));
    }

    const quotesNeedChecklistMigration = allQuotations.some(q => !q.hasOwnProperty('showChecklist'));
    if (quotesNeedChecklistMigration) {
      console.log("Migrating quotations to include showChecklist property...");
      setAllQuotations(prev => prev.map(q => ({
        ...q,
        showChecklist: q.showChecklist ?? true
      })));
    }
  }, [settings.defaultTermsAndConditions, settings.addCheckmateDefault]);


  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [saveClientInfo, setSaveClientInfo] = useState<boolean>(true);
  
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

  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState<boolean>(false);
  const [isEditTilesModalOpen, setIsEditTilesModalOpen] = useState<boolean>(false);
  const [isEditChecklistModalOpen, setIsEditChecklistModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isBulkGeneratorModalOpen, setIsBulkGeneratorModalOpen] = useState<boolean>(false);
  const [isBulkSuccessModalOpen, setIsBulkSuccessModalOpen] = useState(false);
  const [bulkSuccessData, setBulkSuccessData] = useState<QuotationData[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  const [currentInvoice, setCurrentInvoice] = useState<InvoiceData | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // PWA Service Worker and Install Prompt Logic
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }

    // Listen for the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      const dismissed = localStorage.getItem(PWA_PROMPT_DISMISSED_KEY);
      if (!dismissed) {
          setDeferredInstallPrompt(promptEvent);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePWAInstall = () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA installation');
        } else {
          console.log('User dismissed the PWA installation');
        }
        setDeferredInstallPrompt(null);
      });
  };

  const handlePWADismiss = () => {
      localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, 'true');
      setDeferredInstallPrompt(null);
  };


  const handleGenerate = useCallback(async () => {
    if (jobNotes.length === 0) {
      setError('Please add some job notes or upload an image to generate a quotation.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuotationData(null);
    try {
        let finalClientDetails = { ...clientDetails };
        
        // Save new client if requested
        if (saveClientInfo && !finalClientDetails.clientId && finalClientDetails.clientName.trim()) {
            const existingClient = allClients.find(c => c.name.toLowerCase() === finalClientDetails.clientName.trim().toLowerCase());
            if (!existingClient) {
                const newClient: Client = {
                    id: `client_${Date.now()}`,
                    name: finalClientDetails.clientName.trim(),
                    address: finalClientDetails.clientAddress.trim(),
                    phone: finalClientDetails.clientPhone.trim(),
                };
                setAllClients(prev => [newClient, ...prev]);
                finalClientDetails.clientId = newClient.id; // Link quote to new client
            } else {
                 finalClientDetails.clientId = existingClient.id; // Link to existing client
            }
        }


      const combinedNotes = jobNotes.join('\n');
      const aiData = await generateQuotationFromAI(combinedNotes, settings, settings.addCheckmateDefault, settings.showChecklistDefault);
      
      // Merge AI data with user-provided data, prioritizing user input
       const mergedClientDetails = {
          ...finalClientDetails, 
          clientName: finalClientDetails.clientName || aiData.clientDetails.clientName,
          clientAddress: finalClientDetails.clientAddress || aiData.clientDetails.clientAddress,
          clientPhone: finalClientDetails.clientPhone || aiData.clientDetails.clientPhone,
          projectName: finalClientDetails.projectName || aiData.clientDetails.projectName,
      };
      
      const newQuotation: QuotationData = {
        ...aiData,
        id: `qt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: Date.now(),
        status: 'Pending',
        clientDetails: mergedClientDetails,
        isBulkGenerated: false,
        addCheckmate: settings.addCheckmateDefault,
        showChecklist: settings.showChecklistDefault,
      };

      setClientDetails(mergedClientDetails);
      setQuotationData(newQuotation);
      setAllQuotations(prev => [newQuotation, ...prev]);


    } catch (err) {
      console.error(err);
      setError('Failed to generate quotation. The AI model might be unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [jobNotes, clientDetails, settings, saveClientInfo, allClients]);
  
  const handleBulkGenerate = async (
    mode: 'sameClient' | 'sameJob' | 'csv',
    data: { client: ClientDetails; jobs: string[] } | { job: string; clients: ClientDetails[] } | { tasks: { client: ClientDetails; text: string }[] }
  ) => {
    setIsBulkGeneratorModalOpen(false);
    
    let tasks: { text: string; client: ClientDetails }[] = [];
    if (mode === 'sameClient' && 'client' in data) {
        tasks = data.jobs.map(job => ({ text: job, client: data.client }));
    } else if (mode === 'sameJob' && 'job' in data) {
        tasks = data.clients.map(client => ({ text: data.job, client }));
    } else if (mode === 'csv' && 'tasks' in data) {
        tasks = data.tasks;
    }

    if (tasks.length === 0) return;

    setBulkProgress({ current: 0, total: tasks.length, message: 'Starting...' });
    const generatedQuotes: QuotationData[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        setBulkProgress({ current: i + 1, total: tasks.length, message: `Generating for ${task.client.clientName || `Job #${i+1}`}...` });
        try {
            const aiData = await generateQuotationFromAI(task.text, settings, settings.addCheckmateDefault, settings.showChecklistDefault);
            const newQuotation: QuotationData = {
                ...aiData,
                id: `qt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                date: Date.now(),
                status: 'Pending',
                clientDetails: { ...task.client, ...aiData.clientDetails }, // Merge client data
                isBulkGenerated: true,
                addCheckmate: settings.addCheckmateDefault,
                showChecklist: settings.showChecklistDefault,
            };
            generatedQuotes.push(newQuotation);
        } catch (err) {
            console.error(`Failed to generate quote for task ${i + 1}:`, err);
            // Optionally, collect errors and show them in the success modal
        }
    }
    
    setAllQuotations(prev => [...generatedQuotes, ...prev]);
    setBulkProgress(null);
    setBulkSuccessData(generatedQuotes);
    setIsBulkSuccessModalOpen(true);
  };

  const handleViewBulkInHistory = (quoteIds: string[]) => {
      setHistoryFilterIds(quoteIds);
      setView('history');
      setIsBulkSuccessModalOpen(false);
  };

  const handleUpdateQuotation = (updatedQuotation: QuotationData) => {
    setAllQuotations(prev => 
        prev.map(q => q.id === updatedQuotation.id ? updatedQuotation : q)
    );
    if (quotationData?.id === updatedQuotation.id) {
        setQuotationData(updatedQuotation);
    }
  };


  const handleImageUpload = useCallback((file: File) => {
    setJobNotes([]);
    setQuotationData(null);
    if(imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if(originalImageSrc) URL.revokeObjectURL(originalImageSrc);

    setOriginalImageSrc(URL.createObjectURL(file));
    setIsCropping(true);
  }, [imagePreview, originalImageSrc]);
  
  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    if(imagePreview) {
        URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  }, [imagePreview]);

  const handleCropCancel = useCallback(() => {
      setIsCropping(false);
      if(originalImageSrc) {
          URL.revokeObjectURL(originalImageSrc);
      }
      setOriginalImageSrc(null);
  }, [originalImageSrc]);

  const handleConfirmCrop = useCallback(async (croppedFile: File) => {
    setIsCropping(false);
    if(originalImageSrc) {
        URL.revokeObjectURL(originalImageSrc);
    }
    setOriginalImageSrc(null);

    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    setIsOcrLoading(true);
    setError(null);

    try {
        const ocrText = await getTextFromImageAI(croppedFile);
        setJobNotes(ocrText.split('\n').filter(line => line.trim() !== ''));
    } catch (err) {
        console.error(err);
        setError('Failed to read text from the image. Please try a clearer image or type the notes manually.');
        handleRemoveImage();
    } finally {
        setIsOcrLoading(false);
    }
  }, [originalImageSrc, handleRemoveImage]);

  const handleAddMaterial = (newMaterial: Omit<Material, 'confidence'>) => {
    if (!quotationData) return;
    const updatedQuotation = {
      ...quotationData,
      materials: [...quotationData.materials, newMaterial],
    }
    setQuotationData(updatedQuotation);
    handleUpdateQuotation(updatedQuotation);
  };

  const handleUpdateTiles = (updatedTiles: Tile[]) => {
    if (!quotationData) return;
    const updatedQuotation = {
      ...quotationData,
      tiles: updatedTiles,
    };
    setQuotationData(updatedQuotation);
    handleUpdateQuotation(updatedQuotation);
    setIsEditTilesModalOpen(false);
  };
  
   const handleUpdateChecklist = (updatedChecklist: ChecklistItem[]) => {
    if (!quotationData) return;
    const updatedQuotation = {
      ...quotationData,
      checklist: updatedChecklist,
    };
    setQuotationData(updatedQuotation);
    handleUpdateQuotation(updatedQuotation);
    setIsEditChecklistModalOpen(false);
  };

  const handleViewQuotation = (quoteId: string) => {
    const quoteToView = allQuotations.find(q => q.id === quoteId);
    if (quoteToView) {
      setQuotationData(quoteToView);
      setClientDetails(quoteToView.clientDetails);
      setJobNotes([]); 
      setView('generator');
    }
  };
  
  const handleDuplicateQuotation = (quoteId: string) => {
    const quoteToDuplicate = allQuotations.find(q => q.id === quoteId);
    if (quoteToDuplicate) {
      const newQuote: QuotationData = {
        ...JSON.parse(JSON.stringify(quoteToDuplicate)),
        id: `qt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: Date.now(),
        status: 'Pending',
        invoiceId: undefined, // Duplicates should not be linked to old invoices
        isBulkGenerated: false, // Duplicates are not considered bulk
      };
      setQuotationData(newQuote);
      setClientDetails(newQuote.clientDetails);
      setJobNotes([]);
      setAllQuotations(prev => [newQuote, ...prev]);
      setView('generator');
    }
  };
  
  const handleDeleteQuotation = (quoteId: string) => {
    if (window.confirm('Are you sure you want to delete this quotation permanently?')) {
        setAllQuotations(prev => prev.filter(q => q.id !== quoteId));
        if (quotationData?.id === quoteId) {
            setQuotationData(null);
        }
    }
  };

  const handleConvertToInvoice = (quotationId: string) => {
    const quote = allQuotations.find(q => q.id === quotationId);
    if (!quote) return alert('Quotation not found.');
    if (quote.status !== 'Accepted') return alert('Only accepted quotations can be converted to an invoice.');
    if (quote.invoiceId) return alert('An invoice already exists for this quotation.');

    const lastInvoiceNumber = allInvoices
        .map(inv => parseInt(inv.invoiceNumber.split('-').pop() || '0'))
        .reduce((max, num) => Math.max(max, num), 0);

    const newInvoiceNumber = `${settings.invoicePrefix}-${new Date().getFullYear()}-${String(lastInvoiceNumber + 1).padStart(4, '0')}`;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newInvoice: InvoiceData = {
        id: `inv_${Date.now()}`,
        quotationId: quote.id,
        invoiceNumber: newInvoiceNumber,
        invoiceDate: Date.now(),
        dueDate: dueDate.getTime(),
        status: 'Unpaid',
        clientDetails: quote.clientDetails,
        tiles: quote.tiles,
        materials: quote.materials,
        workmanshipRate: quote.workmanshipRate,
        maintenance: quote.maintenance,
        profitPercentage: quote.profitPercentage,
        paymentTerms: 'Net 30',
        bankDetails: settings.defaultBankDetails,
        invoiceNotes: settings.defaultInvoiceNotes,
        discountType: 'none',
        discountValue: 0
    };

    setAllInvoices(prev => [newInvoice, ...prev]);
    const updatedQuote = { ...quote, status: 'Invoiced' as 'Invoiced', invoiceId: newInvoice.id };
    handleUpdateQuotation(updatedQuote);
    
    setCurrentInvoice(newInvoice);
    setIsInvoiceModalOpen(true);
    setView('invoices');
  };

  const handleEditInvoice = (invoiceId: string) => {
    const invoice = allInvoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        setCurrentInvoice(invoice);
        setIsInvoiceModalOpen(true);
    }
  };
  
  const handleSaveInvoice = (updatedInvoice: InvoiceData) => {
    setAllInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    setIsInvoiceModalOpen(false);
    setCurrentInvoice(null);
  };
  
  const handleDeleteInvoice = (invoiceId: string) => {
     if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
        const invoiceToDelete = allInvoices.find(inv => inv.id === invoiceId);
        setAllInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

        if (invoiceToDelete) {
            const linkedQuote = allQuotations.find(q => q.id === invoiceToDelete.quotationId);
            if (linkedQuote) {
                const updatedQuote = { ...linkedQuote, status: 'Accepted' as 'Accepted', invoiceId: undefined };
                handleUpdateQuotation(updatedQuote);
            }
        }
    }
  };

  // --- Client Management Handlers ---
  const handleSaveClient = (clientData: Client) => {
    if (clientData.id) { // Update existing client
        setAllClients(prev => prev.map(c => c.id === clientData.id ? clientData : c));
    } else { // Add new client
        const newClient = { ...clientData, id: `client_${Date.now()}` };
        setAllClients(prev => [newClient, ...prev]);
    }
    setIsClientModalOpen(false);
    setClientToEdit(null);
  };
  
  const handleEditClient = (client: Client) => {
      setClientToEdit(client);
      setIsClientModalOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
      if(window.confirm('Are you sure you want to delete this client? This will not delete their quotations.')) {
          setAllClients(prev => prev.filter(c => c.id !== clientId));
      }
  };

  const handleViewClientQuotes = (clientId: string) => {
      const clientQuotes = allQuotations.filter(q => q.clientDetails.clientId === clientId);
      setHistoryFilterIds(clientQuotes.map(q => q.id));
      setView('history');
  };

  // --- Expense Management Handlers ---
    const handleSaveExpense = (expenseData: Expense) => {
        if (expenseData.id) { // Update
            setAllExpenses(prev => prev.map(e => e.id === expenseData.id ? expenseData : e));
        } else { // Add new
            const newExpense = { ...expenseData, id: `exp_${Date.now()}` };
            setAllExpenses(prev => [newExpense, ...prev]);
        }
        setIsExpenseModalOpen(false);
        setExpenseToEdit(null);
    };

    const handleEditExpense = (expense: Expense) => {
        setExpenseToEdit(expense);
        setIsExpenseModalOpen(true);
    };

    const handleDeleteExpense = (expenseId: string) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            setAllExpenses(prev => prev.filter(e => e.id !== expenseId));
        }
    };

  const handleVoiceCommand = useCallback((command: string) => {
    const lowerCaseCommand = command.toLowerCase();
    
    // Navigation
    if (lowerCaseCommand.includes('go to dashboard')) setView('dashboard');
    else if (lowerCaseCommand.includes('go to history')) setView('history');
    else if (lowerCaseCommand.includes('go to invoices')) setView('invoices');
    else if (lowerCaseCommand.includes('go to clients')) setView('clients');
    else if (lowerCaseCommand.includes('go to expenses')) setView('expenses');
    else if (lowerCaseCommand.includes('go to generator')) setView('generator');
    // Actions
    else if (lowerCaseCommand.includes('generate quotation')) handleGenerate();
    else if (lowerCaseCommand.includes('export pdf')) {
        if (quotationData) exportToPdf(quotationData, settings);
    }
    // Form filling
    else {
        const clientRegex = /create quotation for (.+?) at (.+)/i;
        const clientMatch = lowerCaseCommand.match(clientRegex);
        if (clientMatch) {
            const [, clientName, clientAddress] = clientMatch;
            setClientDetails(prev => ({ ...prev, clientName: clientName.trim(), clientAddress: clientAddress.trim() }));
        } else {
            setJobNotes(prev => [...prev, command]);
        }
    }
    setIsVoiceModalOpen(false);
  }, [handleGenerate, quotationData, settings]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const isBusy = isLoading || isOcrLoading || !!bulkProgress;

  const renderView = () => {
    switch (view) {
        case 'dashboard':
            return <Dashboard quotations={allQuotations} invoices={allInvoices} expenses={allExpenses} settings={settings} />;
        case 'history':
            return (
              <History 
                quotations={allQuotations}
                onView={handleViewQuotation}
                onDuplicate={handleDuplicateQuotation}
                onDelete={handleDeleteQuotation}
                onUpdateStatus={handleUpdateQuotation}
                onConvertToInvoice={handleConvertToInvoice}
                settings={settings}
                activeFilterIds={historyFilterIds}
                onFilterChange={() => setHistoryFilterIds(null)}
              />
            );
        case 'invoices':
            return (
                <Invoices 
                    invoices={allInvoices}
                    settings={settings}
                    onEdit={handleEditInvoice}
                    onDelete={handleDeleteInvoice}
                    onUpdate={handleSaveInvoice}
                />
            );
        case 'clients':
            return (
                <Clients
                    clients={allClients}
                    quotations={allQuotations}
                    onAdd={() => { setClientToEdit(null); setIsClientModalOpen(true); }}
                    onEdit={handleEditClient}
                    onDelete={handleDeleteClient}
                    onViewQuotes={handleViewClientQuotes}
                />
            );
        case 'expenses':
            return (
                <Expenses
                    expenses={allExpenses}
                    quotations={allQuotations}
                    onAdd={() => { setExpenseToEdit(null); setIsExpenseModalOpen(true); }}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                />
            );
        case 'generator':
        default:
            return <GeneratorView />;
    }
  }

  const GeneratorView = () => (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        <div className="lg:col-span-5 xl:col-span-4 h-full flex flex-col">
          <div className="flex-grow space-y-8 overflow-y-auto pr-2">
              <p className="text-sm text-dark-gray dark:text-slate-300 bg-sky-100/60 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
                  Instantly convert your rough notes—typed or from a photo—into a professional, calculated, and print-ready tiling quotation.
              </p>
              <ClientDetailsForm 
                  details={clientDetails}
                  setDetails={setClientDetails}
                  disabled={isBusy}
                  allClients={allClients}
                  saveClientInfo={saveClientInfo}
                  setSaveClientInfo={setSaveClientInfo}
              />
              <InputSection
                  notes={jobNotes}
                  setNotes={setJobNotes}
                  onImageUpload={handleImageUpload}
                  onRemoveImage={handleRemoveImage}
                  imagePreview={imagePreview}
                  isOcrLoading={isOcrLoading}
                  disabled={isBusy}
                  onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
                  onOpenBulkModal={() => setIsBulkGeneratorModalOpen(true)}
              />
              {error && (
                  <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-danger text-red-700 dark:text-red-300 p-4 rounded-md" role="alert">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                  </div>
              )}
          </div>
          <div className="hidden pt-8 mt-auto sticky bottom-0 bg-light-gray dark:bg-secondary pb-4 lg:block">
            <button
              onClick={handleGenerate}
              disabled={isBusy || jobNotes.length === 0}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white font-bold text-lg rounded-lg shadow-md hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Generating...
                </>
              ) : (
                <>
                  <GenerateIcon className="w-6 h-6" />
                  Generate Quotation
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-medium-gray dark:border-slate-700 h-full">
          <QuotationDisplay 
              data={quotationData} 
              isLoading={isLoading} 
              settings={settings}
              onAddMaterial={() => setIsAddMaterialModalOpen(true)}
              onEditTiles={() => setIsEditTilesModalOpen(true)}
              onEditChecklist={() => setIsEditChecklistModalOpen(true)}
              onUpdate={handleUpdateQuotation}
          />
        </div>
      </div>
       {/* FAB for Mobile */}
        <div className="lg:hidden fixed bottom-24 right-4 z-30">
             <button
              onClick={handleGenerate}
              disabled={isBusy || jobNotes.length === 0}
              className="w-16 h-16 flex items-center justify-center gap-3 p-4 bg-primary text-white font-bold text-lg rounded-full shadow-lg hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              aria-label="Generate Quotation"
            >
              {isLoading ? <LoadingSpinner /> : <GenerateIcon className="w-7 h-7" />}
            </button>
        </div>
      </>
  );


  return (
    <div className="bg-light-gray dark:bg-secondary min-h-screen font-sans text-dark-gray dark:text-slate-300 flex flex-col">
      <header className="bg-gradient-to-r from-secondary to-sky-800 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-24">
                <div className="flex items-center gap-3">
                    <HanifgoldLogoIcon className="w-12 h-10" />
                    <h1 className="text-xl font-bold tracking-wider hidden sm:block text-gold">
                      HANIFGOLD
                    </h1>
                </div>

                <nav className="hidden md:flex items-center gap-4">
                  <button 
                    onClick={() => setView('generator')}
                    className={`nav-link text-gray-300 hover:text-white text-sm font-semibold ${view === 'generator' ? 'active' : ''}`}
                  >
                    Generator
                  </button>
                   <button 
                    onClick={() => setView('dashboard')}
                    className={`nav-link text-gray-300 hover:text-white text-sm font-semibold ${view === 'dashboard' ? 'active' : ''}`}
                  >
                    Dashboard
                  </button>
                   <button 
                    onClick={() => setView('clients')}
                    className={`nav-link text-gray-300 hover:text-white text-sm font-semibold ${view === 'clients' ? 'active' : ''}`}
                  >
                    Clients
                  </button>
                  <button 
                    onClick={() => setView('history')}
                    className={`nav-link text-gray-300 hover:text-white text-sm font-semibold ${view === 'history' ? 'active' : ''}`}
                  >
                    History
                  </button>
                  <button 
                    onClick={() => setView('invoices')}
                    className={`nav-link text-gray-300 hover:text-white text-sm font-semibold ${view === 'invoices' ? 'active' : ''}`}
                  >
                    Invoices
                  </button>
                   <button 
                    onClick={() => setView('expenses')}
                    className={`nav-link text-gray-300 hover:text-white text-sm font-semibold ${view === 'expenses' ? 'active' : ''}`}
                  >
                    Expenses
                  </button>
                </nav>

                <div className="flex items-center gap-4">
                     <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-white/10 text-gray-300 rounded-lg border border-white/20 hover:bg-white/20 hover:text-white transition-colors"
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5"/>}
                    </button>
                     <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="p-2.5 bg-white/10 text-gray-300 rounded-lg border border-white/20 hover:bg-white/20 hover:text-white transition-colors"
                        aria-label="Open settings"
                    >
                        <SettingsIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
      </header>
      
      <main className="flex-grow max-w-7xl w-full mx-auto p-6 sm:px-8 lg:px-10 pb-28 md:pb-10">
        {renderView()}
      </main>

      <BottomNav view={view} setView={setView} />
        
      {isCropping && originalImageSrc && (
          <ImageCropper
              imageSrc={originalImageSrc}
              onConfirm={handleConfirmCrop}
              onCancel={handleCropCancel}
          />
      )}

      {isAddMaterialModalOpen && quotationData && (
        <AddMaterialModal
          isOpen={isAddMaterialModalOpen}
          onClose={() => setIsAddMaterialModalOpen(false)}
          onSave={handleAddMaterial}
          settings={settings}
        />
      )}
      
      {isEditTilesModalOpen && quotationData && (
        <EditTilesModal
          isOpen={isEditTilesModalOpen}
          onClose={() => setIsEditTilesModalOpen(false)}
          onSave={handleUpdateTiles}
          currentTiles={quotationData.tiles}
        />
      )}

      {isEditChecklistModalOpen && quotationData && (
        <EditChecklistModal
            isOpen={isEditChecklistModalOpen}
            onClose={() => setIsEditChecklistModalOpen(false)}
            onSave={handleUpdateChecklist}
            currentChecklist={quotationData.checklist || []}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={settings}
            onSave={setSettings}
        />
      )}

      {isVoiceModalOpen && (
        <VoiceAssistantModal
            isOpen={isVoiceModalOpen}
            onClose={() => setIsVoiceModalOpen(false)}
            onCommand={handleVoiceCommand}
        />
      )}

      {isInvoiceModalOpen && currentInvoice && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => { setIsInvoiceModalOpen(false); setCurrentInvoice(null); }}
          onSave={handleSaveInvoice}
          invoice={currentInvoice}
          settings={settings}
        />
      )}
      
      {isClientModalOpen && (
          <ClientModal
              isOpen={isClientModalOpen}
              onClose={() => { setIsClientModalOpen(false); setClientToEdit(null); }}
              onSave={handleSaveClient}
              clientToEdit={clientToEdit}
          />
      )}

      {isExpenseModalOpen && (
          <ExpenseModal
              isOpen={isExpenseModalOpen}
              onClose={() => { setIsExpenseModalOpen(false); setExpenseToEdit(null); }}
              onSave={handleSaveExpense}
              expenseToEdit={expenseToEdit}
              quotations={allQuotations}
              settings={settings}
          />
      )}

      {isBulkGeneratorModalOpen && (
        <BulkGeneratorModal
          isOpen={isBulkGeneratorModalOpen}
          onClose={() => setIsBulkGeneratorModalOpen(false)}
          onGenerate={handleBulkGenerate}
          progress={bulkProgress}
        />
       )}
       
       {isBulkSuccessModalOpen && (
        <BulkSuccessModal
            isOpen={isBulkSuccessModalOpen}
            onClose={() => setIsBulkSuccessModalOpen(false)}
            generatedQuotes={bulkSuccessData}
            onDownloadZip={() => exportQuotesToZip(bulkSuccessData, settings)}
            onViewInHistory={() => handleViewBulkInHistory(bulkSuccessData.map(q => q.id))}
            onGoToHistory={() => { setView('history'); setIsBulkSuccessModalOpen(false); }}
        />
       )}
       {deferredInstallPrompt && (
          <PWAInstallPrompt 
              onInstall={handlePWAInstall}
              onDismiss={handlePWADismiss}
          />
       )}
    </div>
  );
};

export default App;