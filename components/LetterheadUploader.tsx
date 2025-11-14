
import React, { useRef } from 'react';
import { ImageIcon, RemoveIcon } from './icons';

interface LetterheadUploaderProps {
  letterheadSrc: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

const LetterheadUploader: React.FC<LetterheadUploaderProps> = ({ letterheadSrc, onUpload, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      {letterheadSrc ? (
        <div className="relative group">
          <img src={letterheadSrc} alt="Letterhead preview" className="h-12 w-auto object-contain rounded-md border bg-white shadow-sm" />
          <button
            onClick={onRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove letterhead"
          >
            <RemoveIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleUploadClick}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white text-slate-700 font-semibold rounded-md border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
          >
            <ImageIcon className="w-5 h-5 text-slate-500" />
            Upload Letterhead
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
};

export default LetterheadUploader;