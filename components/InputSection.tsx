import React, { useRef, useState, KeyboardEvent } from 'react';
import { EXAMPLE_INPUT } from '../constants';
import { UploadIcon, RemoveIcon, MicrophoneIcon, BulkGenerateIcon, PlusIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface InputSectionProps {
  notes: string[];
  setNotes: (notes: string[]) => void;
  disabled: boolean;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  imagePreview: string | null;
  isOcrLoading: boolean;
  onOpenVoiceModal: () => void;
  onOpenBulkModal: () => void;
}

const InputSection: React.FC<InputSectionProps> = ({ 
  notes, setNotes, disabled,
  onImageUpload, onRemoveImage, imagePreview, isOcrLoading,
  onOpenVoiceModal, onOpenBulkModal
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentNote, setCurrentNote] = useState('');
 
  const handleUseExample = () => {
    onRemoveImage();
    setNotes(EXAMPLE_INPUT.split('\n').filter(n => n.trim() !== ''));
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
  
  const handleAddNote = () => {
    if (currentNote.trim()) {
      setNotes([...notes, currentNote.trim()]);
      setCurrentNote('');
    }
  };

  const handleRemoveNote = (indexToRemove: number) => {
    setNotes(notes.filter((_, index) => index !== indexToRemove));
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNote();
    }
  }

  return (
    <div className="bg-white p-8 rounded-xl border border-medium-gray shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-secondary">
          Job Notes
        </h2>
        <div className="flex items-center gap-2">
           <button
              type="button"
              onClick={onOpenBulkModal}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-200 transition-all transform hover:scale-105 disabled:opacity-50"
              aria-label={'Open Bulk Generator'}
            >
              <BulkGenerateIcon className="w-4 h-4" />
              Bulk Generate
          </button>
          <button
              type="button"
              onClick={onOpenVoiceModal}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-primary text-sm font-semibold rounded-lg hover:bg-sky-200 transition-all transform hover:scale-105 disabled:opacity-50"
              aria-label={'Start voice input'}
          >
              <MicrophoneIcon className="w-4 h-4" />
              Voice
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {notes.length > 0 && (
            <div className="p-3 bg-light-gray/60 rounded-lg border border-medium-gray max-h-40 overflow-y-auto space-y-2">
                {notes.map((note, index) => (
                    <div key={index} className="flex items-center justify-between bg-sky-100 text-sky-800 rounded-md p-2 text-sm animate-fade-in-down">
                        <span className="flex-grow">{note}</span>
                        <button onClick={() => handleRemoveNote(index)} disabled={disabled} className="ml-2 p-1 rounded-full hover:bg-sky-200">
                            <RemoveIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
         <div className="relative">
            <input
              type="text"
              className="w-full p-3 pr-20 border border-medium-gray rounded-lg focus:ring-2 focus:ring-primary/80 focus:border-primary transition-shadow duration-200 resize-none bg-light-gray/50"
              placeholder="e.g., Toilet Wall 61 cartons 85m2..."
              value={currentNote}
              onChange={(e) => {
                if (imagePreview) onRemoveImage();
                setCurrentNote(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
             <button
                onClick={handleAddNote}
                disabled={disabled || !currentNote.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-sky-600 transition-all disabled:bg-gray-400"
              >
                <PlusIcon className="w-4 h-4" /> Add
              </button>
         </div>

         {isOcrLoading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg">
              <LoadingSpinner />
              <p className="mt-2 text-dark-gray font-medium">Reading text from image...</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleUseExample}
        className="text-sm text-primary hover:text-sky-700 font-medium disabled:opacity-50 mt-2 transition-colors"
        disabled={disabled}
      >
        Use a text example
      </button>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-medium-gray" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-sm font-medium text-gray-500">OR</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center bg-light-gray border-2 border-dashed border-medium-gray rounded-lg p-4 hover:border-primary transition-colors min-h-[10rem]">
          {imagePreview ? (
             <div className="relative w-full max-w-xs">
              <img src={imagePreview} alt="Tiling notes preview" className="rounded-lg object-contain max-h-32 w-full" />
              <button 
                onClick={onRemoveImage}
                disabled={disabled}
                className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-1.5 shadow-md hover:bg-red-600 disabled:bg-gray-400 transition-transform hover:scale-110"
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
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white text-secondary font-semibold rounded-lg border border-medium-gray hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all shadow-sm"
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
        <style>{`
          @keyframes fade-in-down {
            0% {
              opacity: 0;
              transform: translateY(-5px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.3s ease-out forwards;
          }
        `}</style>
    </div>
  );
};

export default InputSection;