
import React, { useState, useEffect } from 'react';
import { QuotationData } from '../types';
import { RemoveIcon } from './icons';

interface EditFinancialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<QuotationData>) => void;
  currentData: QuotationData;
}

const EditFinancialsModal: React.FC<EditFinancialsModalProps> = ({ isOpen, onClose, onSave, currentData }) => {
  const [formData, setFormData] = useState({
    workmanshipRate: 0,
    maintenance: 0,
    profitPercentage: 0,
    depositPercentage: 0,
    termsAndConditions: ''
  });

  useEffect(() => {
    setFormData({
      workmanshipRate: currentData.workmanshipRate || 0,
      maintenance: currentData.maintenance || 0,
      profitPercentage: currentData.profitPercentage || 0,
      depositPercentage: currentData.depositPercentage || 0,
      termsAndConditions: currentData.termsAndConditions || ''
    });
  }, [currentData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: e.target.type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass = "block w-full px-3 py-2 bg-brand-light dark:bg-slate-800 border border-border-color dark:border-slate-700 rounded-lg shadow-sm sm:text-sm focus:ring-gold/80 focus:border-gold transition";

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full flex flex-col animate-fade-in">
        <div className="p-8 border-b border-border-color dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-brand-dark dark:text-white">Financial Controls</h2>
            <p className="text-sm text-gray-500">Override default rates and fees for this project.</p>
          </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:text-danger hover:bg-red-100 rounded-full">
            <RemoveIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Labor Rate (per m²)</label>
                <input type="number" name="workmanshipRate" value={formData.workmanshipRate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Maintenance Fee (Flat)</label>
                <input type="number" name="maintenance" value={formData.maintenance} onChange={handleChange} className={inputClass} />
              </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profit Percentage (%)</label>
                <input type="number" name="profitPercentage" value={formData.profitPercentage} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Required Deposit (%)</label>
                <input type="number" name="depositPercentage" value={formData.depositPercentage} onChange={handleChange} className={inputClass} />
              </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Custom Terms & Conditions</label>
            <textarea name="termsAndConditions" value={formData.termsAndConditions} onChange={handleChange} rows={4} className={inputClass} placeholder="Add job specific terms..." />
          </div>
        </div>
        <div className="p-6 bg-brand-light dark:bg-slate-900/50 border-t border-border-color dark:border-slate-700 flex justify-end gap-4 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white dark:bg-slate-700 text-brand-dark dark:text-white font-semibold rounded-lg border border-border-color dark:border-slate-600 hover:bg-gray-100">Cancel</button>
          <button type="button" onClick={handleSave} className="px-6 py-2 bg-gold text-brand-dark font-bold rounded-lg hover:bg-gold-dark shadow-md">Apply Changes</button>
        </div>
      </div>
    </div>
  );
};

export default EditFinancialsModal;
