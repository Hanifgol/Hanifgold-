import React, { useState, useCallback } from 'react';
import { QuotationData, Settings, ClientDetails } from './types';
import { generateQuotationFromAI, getTextFromImageAI } from './services/geminiService';
import InputSection from './components/InputSection';
import QuotationDisplay from './components/QuotationDisplay';
import ImageCropper from './components/ImageCropper';
import LetterheadUploader from './components/LetterheadUploader';
import { LogoIcon, SettingsIcon, GenerateIcon } from './components/icons';
import { DEFAULT_SETTINGS } from './constants';
import SettingsModal from './components/SettingsModal';
import ClientDetailsForm from './components/ClientDetailsForm';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [letterheadSrc, setLetterheadSrc] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  
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

  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings>(() => {
    try {
        const savedSettings = localStorage.getItem('tilingAiSettings');
        return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Failed to parse settings from localStorage', error);
        return DEFAULT_SETTINGS;
    }
  });

  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('tilingAiSettings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };

  const handleGenerate = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Please enter some text or upload an image to generate a quotation.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuotationData(null);
    try {
      const data = await generateQuotationFromAI(inputText, settings);
      
      const finalClientDetails = {
          ...clientDetails, // Keep the user's current show/hide preferences
          clientName: clientDetails.clientName || data.clientDetails.clientName,
          clientAddress: clientDetails.clientAddress || data.clientDetails.clientAddress,
          clientPhone: clientDetails.clientPhone || data.clientDetails.clientPhone,
          projectName: clientDetails.projectName || data.clientDetails.projectName,
      };
      setClientDetails(finalClientDetails);
      setQuotationData({ ...data, clientDetails: finalClientDetails });

    } catch (err) {
      console.error(err);
      setError('Failed to generate quotation. The AI model might be unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, settings, clientDetails]);

  const handleImageUpload = useCallback((file: File) => {
    setInputText('');
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
        setInputText(ocrText);
    } catch (err) {
        console.error(err);
        setError('Failed to read text from the image. Please try a clearer image or type the notes manually.');
        handleRemoveImage();
    } finally {
        setIsOcrLoading(false);
    }
  }, [originalImageSrc, handleRemoveImage]);

  const handleLetterheadUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setLetterheadSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveLetterhead = useCallback(() => {
    setLetterheadSrc(null);
  }, []);

  const isBusy = isLoading || isOcrLoading;

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-800 flex flex-col">
      <header className="bg-white/90 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-3">
                    <LogoIcon className="w-8 h-8 text-indigo-600" />
                    <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                    Tiling Quotation AI
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <LetterheadUploader 
                        letterheadSrc={letterheadSrc}
                        onUpload={handleLetterheadUpload}
                        onRemove={handleRemoveLetterhead}
                    />
                    <button
                        onClick={handleOpenSettings}
                        className="p-2 bg-white rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                        aria-label="Open settings"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
      </header>
      
      <main className="flex-grow max-w-screen-2xl w-full mx-auto p-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

          {/* Left Panel: Inputs & Controls */}
          <div className="lg:col-span-5 xl:col-span-4 h-full flex flex-col">
            <div className="flex-grow space-y-6 overflow-y-auto pr-4 -mr-4">
                <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    Instantly convert your rough notes—typed or from a photo—into a professional, calculated, and print-ready tiling quotation.
                </p>
                <ClientDetailsForm 
                    details={clientDetails}
                    setDetails={setClientDetails}
                    disabled={isBusy}
                />
                <InputSection
                    inputText={inputText}
                    setInputText={setInputText}
                    onImageUpload={handleImageUpload}
                    onRemoveImage={handleRemoveImage}
                    imagePreview={imagePreview}
                    isOcrLoading={isOcrLoading}
                    disabled={isBusy}
                />
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                    </div>
                )}
            </div>
            <div className="pt-6 mt-auto sticky bottom-0 bg-gray-100 pb-4">
              <button
                onClick={handleGenerate}
                disabled={isBusy || !inputText.trim()}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
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

          {/* Right Panel: Quotation Display */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-xl shadow-lg border border-gray-200 h-full">
            <QuotationDisplay 
                data={quotationData} 
                isLoading={isLoading} 
                letterheadSrc={letterheadSrc} 
                settings={settings}
            />
          </div>
        </div>
      </main>
        
      {isCropping && originalImageSrc && (
          <ImageCropper
              imageSrc={originalImageSrc}
              onConfirm={handleConfirmCrop}
              onCancel={handleCropCancel}
          />
      )}

      {isSettingsOpen && (
          <SettingsModal
              isOpen={isSettingsOpen}
              onClose={handleCloseSettings}
              onSave={handleSaveSettings}
              currentSettings={settings}
          />
      )}
    </div>
  );
};

export default App;