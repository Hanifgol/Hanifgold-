import React, { useRef, useState, useEffect } from 'react';
import { EXAMPLE_INPUT } from '../constants';
import { UploadIcon, RemoveIcon, MicrophoneIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

// Fix: Add types for the Web Speech API to resolve TypeScript errors.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  }
}

interface InputSectionProps {
  inputText: string;
  setInputText: (text: string) => void;
  disabled: boolean;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  imagePreview: string | null;
  isOcrLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ 
  inputText, setInputText, disabled,
  onImageUpload, onRemoveImage, imagePreview, isOcrLoading
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  useEffect(() => {
    // Fix: Use declared types for SpeechRecognition which may be vendor-prefixed.
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
        setIsSpeechSupported(false);
        console.warn("Speech Recognition not supported in this browser.");
        return;
    }
    setIsSpeechSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        if (finalTranscript.trim()) {
            if (imagePreview) onRemoveImage();
            setInputText(prev => (prev.trim() ? prev + ' ' : '') + finalTranscript.trim());
        }
    };
    
    recognitionRef.current = recognition;

    return () => {
        recognitionRef.current?.stop();
    };
  }, [imagePreview, onRemoveImage, setInputText]);

  const handleToggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
  };

  const handleUseExample = () => {
    onRemoveImage();
    setInputText(EXAMPLE_INPUT);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        Job Notes
      </h2>
      <div className="relative">
        <textarea
          id="quotation-input"
          className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200 resize-none"
          placeholder="e.g., Toilet Wall 61 cartons 85m2, or Kitchen Floor 14m2..."
          value={inputText}
          onChange={(e) => {
            if (imagePreview) onRemoveImage();
            setInputText(e.target.value)
          }}
          disabled={disabled}
        />
        {isSpeechSupported && (
            <button
                type="button"
                onClick={handleToggleRecording}
                disabled={disabled}
                className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'}`}
                aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            >
                <MicrophoneIcon className="w-5 h-5" />
            </button>
        )}
        {isOcrLoading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg">
              <LoadingSpinner />
              <p className="mt-2 text-gray-600 font-medium">Reading text from image...</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleUseExample}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 mt-2"
        disabled={disabled}
      >
        Use a text example
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-sm font-medium text-gray-500">OR</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-500 transition-colors min-h-40">
          {imagePreview ? (
             <div className="relative w-full max-w-xs">
              <img src={imagePreview} alt="Tiling notes preview" className="rounded-md object-contain max-h-32 w-full" />
              <button 
                onClick={onRemoveImage}
                disabled={disabled}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 disabled:bg-gray-400"
                aria-label="Remove image"
              >
                <RemoveIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
             <div className="text-center">
                <UploadIcon className="mx-auto h-10 w-10 text-gray-400" />
                 <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={disabled}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 font-semibold rounded-md border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                    <UploadIcon className="w-5 h-5" />
                    Upload Image
                </button>
                <input 
                    ref={fileInputRef}
                    id="image-upload" 
                    name="image-upload" 
                    type="file" 
                    className="hidden"
                    accept="image/*" 
                    onChange={handleFileChange} 
                    disabled={disabled} 
                />
                <p className="mt-2 text-xs text-gray-500">PNG, JPG up to 10MB</p>
             </div>
          )}
        </div>
    </div>
  );
};

export default InputSection;