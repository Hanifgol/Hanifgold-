
import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';
import { EXAMPLE_INPUT } from '../constants';
import { UploadIcon, RemoveIcon, MicrophoneIcon, BulkGenerateIcon, PlusIcon, UndoIcon, RedoIcon, ImageIcon, ViewIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface InputSectionProps {
  notes: string[];
  setNotes: (notes: string[] | ((prev: string[]) => string[])) => void;
  disabled: boolean;
  onImageUpload: (file: File) => void;
  onSitePhotoUpload: (file: File) => void;
  onRemoveImage: () => void;
  imagePreview: string | null;
  sitePhotoPreview: string | null;
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
  onImageUpload, onSitePhotoUpload, onRemoveImage, imagePreview, sitePhotoPreview, isOcrLoading,
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
    if (file) onImageUpload(file);
  };
  
  const handleSitePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onSitePhotoUpload(file);
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
    <div 
        ref={containerRef}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/40 dark:border-white/5 outline-none"
        tabIndex={0}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
          Project Input
        </h2>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
             <button type="button" onClick={onUndo} disabled={disabled || !canUndo} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-gray-400 disabled:opacity-30 transition-all"><UndoIcon className="w-3.5 h-3.5" /></button>
             <button type="button" onClick={onRedo} disabled={disabled || !canRedo} className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-gray-400 disabled:opacity-30 transition-all"><RedoIcon className="w-3.5 h-3.5" /></button>
          </div>
           <button onClick={onOpenVoiceModal} disabled={disabled} className="p-2 rounded-lg bg-gold-light text-gold-dark hover:bg-gold/20" title="Voice Input"><MicrophoneIcon className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="space-y-4">
        {notes.length > 0 && (
            <div className="p-2 max-h-40 overflow-y-auto space-y-2 custom-scrollbar bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                {notes.map((note, index) => (
                    <div key={index} className="flex items-start justify-between text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-50 dark:border-slate-700 group transition-all">
                        <span className="flex-grow font-medium">{note}</span>
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
              className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-transparent rounded-2xl shadow-inner placeholder-gray-400 font-medium text-sm focus:bg-white focus:ring-4 focus:ring-gold/20 transition-all"
              placeholder="Type measurements (e.g. Wall 40m2)"
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
             <button
                onClick={handleAddNote}
                disabled={disabled || !currentNote.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-brand-dark text-white text-xs font-bold rounded-xl"
              >
                Add
              </button>
         </div>

         {isOcrLoading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex flex-col items-center justify-center rounded-3xl z-50 backdrop-blur-md animate-fade-in">
              <LoadingSpinner />
              <p className="mt-3 text-brand-dark dark:text-white font-bold text-sm tracking-wide animate-pulse">AI Analyzing...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {/* Note Scanning */}
        <label className={`cursor-pointer group flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl transition-all ${imagePreview ? 'border-success bg-success/5' : 'border-gray-200 hover:border-gold hover:bg-gold/5'}`}>
            <div className="p-2 rounded-full bg-white shadow-sm mb-2"><ImageIcon className={`w-5 h-5 ${imagePreview ? 'text-success' : 'text-gray-400 group-hover:text-gold'}`} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Scan Notes</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={disabled} />
        </label>

        {/* Site Vision */}
        <label className={`cursor-pointer group flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl transition-all ${sitePhotoPreview ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-brand-dark hover:bg-gray-50'}`}>
            <div className="p-2 rounded-full bg-white shadow-sm mb-2"><ViewIcon className={`w-5 h-5 ${sitePhotoPreview ? 'text-gold' : 'text-gray-400 group-hover:text-brand-dark'}`} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Site Vision</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleSitePhotoChange} disabled={disabled} />
        </label>
      </div>
      
      {sitePhotoPreview && (
          <p className="mt-2 text-[9px] text-gold-dark font-black text-center uppercase tracking-tighter animate-pulse">Site photo attached for prep analysis</p>
      )}
    </div>
  );
};

export default InputSection;
