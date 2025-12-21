import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';
import { EXAMPLE_INPUT } from '../constants';
import { UploadIcon, RemoveIcon, MicrophoneIcon, BulkGenerateIcon, PlusIcon, UndoIcon, RedoIcon, ImageIcon } from './icons';
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
  
  const [currentNote, setCurrentNote] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
 
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

  // Handle pasting images (Ctrl+V)
  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                onImageUpload(blob);
                e.preventDefault(); // Prevent pasting the image filename into text inputs if focused
            }
        }
    }
  };

  return (
    <div 
        ref={containerRef}
        onPaste={handlePaste}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/40 dark:border-white/5 transition-all hover:shadow-2xl hover:bg-white dark:hover:bg-slate-900 outline-none"
        tabIndex={0} // Make div focusable to capture paste events globally in this section
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
          Job Notes & Measurements
          <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[9px] text-gray-400 font-normal normal-case border border-gray-200 dark:border-slate-700">Ctrl+V to paste image</span>
        </h2>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
             <button type="button" onClick={onUndo} disabled={disabled || !canUndo} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-gray-400 hover:text-brand-dark disabled:opacity-30 transition-all shadow-sm"><UndoIcon className="w-3.5 h-3.5" /></button>
             <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
             <button type="button" onClick={onRedo} disabled={disabled || !canRedo} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-gray-400 hover:text-brand-dark disabled:opacity-30 transition-all shadow-sm"><RedoIcon className="w-3.5 h-3.5" /></button>
          </div>
           <button onClick={onOpenBulkModal} disabled={disabled} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors" title="Bulk Generate"><BulkGenerateIcon className="w-4 h-4" /></button>
           <button onClick={onOpenVoiceModal} disabled={disabled} className="p-2 rounded-lg bg-gold-light text-gold-dark hover:bg-gold/20 disabled:opacity-50 transition-colors" title="Voice Input"><MicrophoneIcon className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="space-y-4">
        {notes.length > 0 && (
            <div className="p-2 max-h-56 overflow-y-auto space-y-2 custom-scrollbar bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                {notes.map((note, index) => (
                    <div key={index} className="flex items-start justify-between text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-50 dark:border-slate-700 group transition-all hover:scale-[1.01] hover:shadow-md">
                        <span className="flex-grow leading-relaxed font-medium">{note}</span>
                        <button onClick={() => handleRemoveNote(index)} disabled={disabled} className="ml-3 text-gray-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                            <RemoveIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}
         <div className="relative group">
            <input
              type="text"
              className="w-full px-5 py-4 pr-20 border border-transparent rounded-2xl bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-gold/20 focus:border-gold transition-all text-sm shadow-inner placeholder-gray-400 font-medium"
              placeholder="Type measurements (e.g. Toilet Wall 45m2)"
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
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-brand-dark text-white text-xs font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50 shadow-lg hover:shadow-xl active:scale-95"
              >
                Add Note
              </button>
         </div>

         {/* Short Codes Legend */}
         <div className="flex flex-wrap gap-2 pt-1">
            {['TW', 'TF', 'KW', 'KF', 'SR', 'MBR', 'PASS'].map(code => (
                <button 
                    key={code} 
                    onClick={() => setCurrentNote(prev => prev + (prev ? ' ' : '') + code)}
                    disabled={disabled}
                    className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-transparent hover:border-gold/30 hover:text-gold-dark hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                    {code}
                </button>
            ))}
         </div>

         {isOcrLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex flex-col items-center justify-center rounded-3xl z-10 backdrop-blur-md animate-fade-in">
              <LoadingSpinner />
              <p className="mt-3 text-brand-dark dark:text-white font-bold text-sm tracking-wide animate-pulse">Reading Image...</p>
          </div>
        )}
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200 dark:border-slate-700/50"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white/80 dark:bg-slate-900/80 px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider backdrop-blur-sm">OR</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {imagePreview ? (
          <div className="relative group rounded-3xl overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 transition-transform hover:scale-[1.02]">
            <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              <button
                onClick={onRemoveImage}
                disabled={disabled}
                className="bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md border border-white/30 transition-all transform hover:scale-110 shadow-lg"
              >
                <RemoveIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          <label 
            htmlFor="image-upload"
            className={`
              relative block w-full
              border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
              ${disabled 
                ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800' 
                : 'border-gray-300 dark:border-slate-700 hover:border-gold hover:bg-gold-light/10 dark:hover:bg-gold/5 bg-gray-50/30 dark:bg-slate-800/30'
              }
            `}
          >
            <div className="bg-white dark:bg-slate-800 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-gray-100 dark:border-slate-700 group-hover:border-gold/30">
                <UploadIcon className="w-6 h-6 text-gray-400 group-hover:text-gold transition-colors" />
            </div>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Click to Upload / Scan Notes</p>
            <p className="text-xs text-gray-400 mt-1">Supports handwritten text • Ctrl+V to paste</p>
            <input
              id="image-upload"
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={disabled}
            />
          </label>
        )}
        
        <div className="flex justify-center mt-1">
            <button
                onClick={handleUseExample}
                disabled={disabled}
                className="text-[10px] font-bold text-gray-400 hover:text-gold-dark hover:underline transition-colors uppercase tracking-wide flex items-center gap-1"
            >
                <ImageIcon className="w-3 h-3"/> Try with example data
            </button>
        </div>
      </div>
    </div>
  );
};

export default InputSection;