import React, { useRef, useState, KeyboardEvent } from 'react';
import { EXAMPLE_INPUT } from '../constants';
import { UploadIcon, RemoveIcon, MicrophoneIcon, BulkGenerateIcon, PlusIcon, UndoIcon, RedoIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface InputSectionProps {
  notes: string[];
  setNotes: (notes: string[] | ((prev: string[]) => string[])) => void;
  disabled: boolean;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  imagePreview: string | null;
  isOcrLoading: boolean;
  onOpenVoiceModal: () => void;
  onOpenBulkModal: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ 
  notes, setNotes, disabled,
  onImageUpload, onRemoveImage, imagePreview, isOcrLoading,
  onOpenVoiceModal, onOpenBulkModal,
  onUndo, onRedo, canUndo, canRedo
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
      setNotes(prev => [...prev, currentNote.trim()]);
      setCurrentNote('');
    }
  };

  const handleRemoveNote = (indexToRemove: number) => {
    setNotes(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNote();
    }
  }

  return (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-border-color dark:border-border-dark shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-brand-dark dark:text-white uppercase tracking-wide">
          Job Notes & Details
        </h2>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2 mr-1">
             <button type="button" onClick={onUndo} disabled={disabled || !canUndo} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-brand-dark disabled:opacity-30 transition-colors"><UndoIcon className="w-4 h-4" /></button>
             <button type="button" onClick={onRedo} disabled={disabled || !canRedo} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-brand-dark disabled:opacity-30 transition-colors"><RedoIcon className="w-4 h-4" /></button>
          </div>
           <button onClick={onOpenBulkModal} disabled={disabled} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 hover:text-gold-dark disabled:opacity-50 transition-colors" title="Bulk Generate"><BulkGenerateIcon className="w-4 h-4" /></button>
           <button onClick={onOpenVoiceModal} disabled={disabled} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 hover:text-gold-dark disabled:opacity-50 transition-colors" title="Voice Input"><MicrophoneIcon className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="space-y-4">
        {notes.length > 0 && (
            <div className="p-1 max-h-48 overflow-y-auto space-y-1">
                {notes.map((note, index) => (
                    <div key={index} className="flex items-start justify-between text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 group transition-all hover:border-gold/30">
                        <span className="flex-grow leading-relaxed">{note}</span>
                        <button onClick={() => handleRemoveNote(index)} disabled={disabled} className="ml-3 text-gray-400 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                            <RemoveIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
         <div className="relative">
            <input
              type="text"
              className="w-full p-3 pr-20 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all bg-white dark:bg-slate-800 text-sm shadow-sm"
              placeholder="Type notes here (e.g. Flat 1: TW 60m2...)"
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
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-dark text-white text-xs font-bold rounded-lg hover:bg-black transition-colors disabled:opacity-50 shadow-sm"
              >
                Add
              </button>
         </div>

         {/* Short Codes Legend */}
         <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 uppercase font-bold tracking-wide pt-2">
            <span title="Toilet Wall">TW</span>
            <span title="Toilet Floor">TF</span>
            <span title="Kitchen Wall">KW</span>
            <span title="Kitchen Floor">KF</span>
            <span title="Sitting Room">SR</span>
            <span title="Master Bedroom">MBR</span>
            <span title="Passage/Lobby">PASS</span>
         </div>

         {isOcrLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex flex-col items-center justify-center rounded-2xl z-10 backdrop-blur-sm">
              <LoadingSpinner />
              <p className="mt-3 text-brand-dark dark:text-white font-medium text-sm">Processing image...</p>
          </div>
        )}
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-surface-dark px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">OR Upload</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 hover:border-gold hover:bg-gold-light/10 transition-all min-h-[8rem] cursor-pointer group" onClick={!imagePreview ? handleUploadClick : undefined}>
          {imagePreview ? (
             <div className="relative w-full flex justify-center group-hover:scale-[1.02] transition-transform">
              <img src={imagePreview} alt="Tiling notes preview" className="rounded-lg shadow-md max-h-40 object-contain" />
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveImage(); }}
                disabled={disabled}
                className="absolute -top-3 -right-3 bg-white text-danger rounded-full p-1.5 shadow-lg hover:bg-red-50 border border-gray-200 z-10"
                aria-label="Remove image"
              >
                <RemoveIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
             <div className="text-center w-full">
                <UploadIcon className="mx-auto h-10 w-10 text-gray-400 group-hover:text-gold transition-colors mb-3" />
                <p className="text-sm text-brand-dark dark:text-slate-300 font-medium">Click to upload image</p>
                <p className="text-xs text-gray-500 mt-1">Supports handwritten notes</p>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={disabled} />
             </div>
          )}
      </div>
      
      <div className="mt-4 text-center">
           <button type="button" onClick={handleUseExample} className="text-xs text-gold-dark font-medium hover:underline disabled:opacity-50" disabled={disabled}>
            Load example data
          </button>
      </div>
    </div>
  );
};

export default InputSection;