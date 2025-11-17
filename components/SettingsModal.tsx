

import React, { useState, useEffect, useRef } from 'react';
import { Settings } from '../types';
import { RemoveIcon } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (newSettings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [newUnit, setNewUnit] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const isNumber = type === 'number';

    setLocalSettings(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : isNumber ? parseFloat(value) || 0 : value,
    }));
  };
  
  const handleAddUnit = () => {
    if (newUnit.trim() && !localSettings.customMaterialUnits.includes(newUnit.trim().toLowerCase())) {
        setLocalSettings(prev => ({
            ...prev,
            customMaterialUnits: [...prev.customMaterialUnits, newUnit.trim().toLowerCase()]
        }));
        setNewUnit('');
    }
  };

  const handleRemoveUnit = (unitToRemove: string) => {
    setLocalSettings(prev => ({
        ...prev,
        customMaterialUnits: prev.customMaterialUnits.filter(u => u !== unitToRemove)
    }));
  };

  const handleAddExpenseCategory = () => {
    if (newExpenseCategory.trim() && !localSettings.defaultExpenseCategories.includes(newExpenseCategory.trim())) {
        setLocalSettings(prev => ({
            ...prev,
            defaultExpenseCategories: [...prev.defaultExpenseCategories, newExpenseCategory.trim()]
        }));
        setNewExpenseCategory('');
    }
  };

  const handleRemoveExpenseCategory = (categoryToRemove: string) => {
    setLocalSettings(prev => ({
        ...prev,
        defaultExpenseCategories: prev.defaultExpenseCategories.filter(c => c !== categoryToRemove)
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings(prev => ({ ...prev, companyLogo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };
  
  if (!isOpen) return null;

  const renderSection = (title: string, description: string, children: React.ReactNode) => (
    <div className="py-8 sm:grid sm:grid-cols-3 sm:gap-4">
      <div className="sm:col-span-1">
        <h3 className="text-lg font-bold text-secondary">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="mt-4 sm:mt-0 sm:col-span-2 space-y-6">
        {children}
      </div>
    </div>
  );
  
  const renderInput = (name: keyof Settings, label: string, type: string = 'number', step?: string, placeholder?: string) => (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-dark-gray">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        value={localSettings[name] as any}
        onChange={handleChange}
        step={step}
        placeholder={placeholder}
        className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
      />
    </div>
  );
  
  const renderCheckbox = (name: keyof Settings, label: string) => (
      <div className="flex items-center">
        <input
            type="checkbox"
            id={name}
            name={name}
            checked={localSettings[name] as boolean}
            onChange={handleChange}
            className="h-4 w-4 rounded border-medium-gray text-primary focus:ring-primary"
        />
        <label htmlFor={name} className="ml-3 block text-sm font-medium text-dark-gray">{label}</label>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-8 border-b border-medium-gray">
          <h2 className="text-xl font-bold text-secondary">Application Settings</h2>
          <p className="text-sm text-gray-500">Customize calculations, display options, and company information.</p>
        </div>
        <div className="p-8 overflow-y-auto divide-y divide-medium-gray">
          
          {renderSection('Company Information', 'Set your company details for quotations.',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInput('companyName', 'Company Name', 'text')}
              {renderInput('companySlogan', 'Company Slogan', 'text')}
              {renderInput('companyAddress', 'Company Address', 'text')}
              {renderInput('companyEmail', 'Company Email', 'email')}
              {renderInput('companyPhone', 'Company Phone', 'tel')}
            </div>
          )}

          {renderSection('Letterhead & Branding', 'Design a professional header and footer for all exported documents.',
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-dark-gray mb-2">Company Logo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-light-gray rounded-lg border flex items-center justify-center">
                            {localSettings.companyLogo ? <img src={localSettings.companyLogo} alt="Company Logo" className="max-w-full max-h-full object-contain"/> : <span className="text-xs text-gray-400">No Logo</span>}
                        </div>
                        <div className="space-y-2">
                           <button type="button" onClick={() => logoInputRef.current?.click()} className="px-4 py-2 bg-white text-secondary font-semibold rounded-lg border border-medium-gray hover:bg-gray-100 text-sm">Upload Logo</button>
                           <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                           {localSettings.companyLogo && <button type="button" onClick={() => setLocalSettings(p => ({...p, companyLogo: ''}))} className="text-sm text-red-600 hover:underline">Remove</button>}
                        </div>
                    </div>
                </div>
                 <div>
                    <label htmlFor="accentColor" className="block text-sm font-bold text-dark-gray">Accent Color</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input type="color" id="accentColor" name="accentColor" value={localSettings.accentColor} onChange={handleChange} className="w-10 h-10 p-1 border-none rounded-lg cursor-pointer" />
                        <span className="font-mono text-sm text-gray-600">{localSettings.accentColor}</span>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-dark-gray mb-2">Header Layout</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['modern', 'classic', 'minimalist'] as const).map(layout => (
                           <label key={layout} className={`block p-2 border-2 rounded-lg cursor-pointer text-center ${localSettings.headerLayout === layout ? 'border-primary' : 'border-medium-gray'}`}>
                             <input type="radio" name="headerLayout" value={layout} checked={localSettings.headerLayout === layout} onChange={handleChange} className="sr-only"/>
                             <span className="text-sm font-semibold capitalize text-dark-gray">{layout}</span>
                           </label>
                        ))}
                    </div>
                 </div>
                 {renderInput('footerText', 'Footer Text', 'text', undefined, "Thank you for your business!")}
            </div>
          )}

          {renderSection('Pricing & Calculation Defaults', 'Set default prices (NGN) and calculation factors.',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInput('wallTilePrice', 'Wall Tile Price/carton')}
              {renderInput('floorTilePrice', 'Floor Tile Price/carton')}
              {renderInput('sittingRoomTilePrice', 'Sitting Room Tile Price/carton')}
              {renderInput('stepTilePrice', 'Step Tile Price/carton')}
              {renderInput('externalWallTilePrice', 'External Wall Tile Price/carton')}
              {renderInput('cementPrice', 'Cement Price/bag')}
              {renderInput('whiteCementPrice', 'White Cement Price/bag')}
              {renderInput('sharpSandPrice', 'Sharp Sand Price')}
              {renderInput('workmanshipRate', 'Workmanship Rate/m²')}
              {renderInput('wastageFactor', 'Wastage Factor (e.g., 1.1 for 10%)', 'number', '0.01')}
              {renderInput('wallTileM2PerCarton', 'Wall Tile m²/carton', 'number', '0.1')}
              {renderInput('floorTileM2PerCarton', 'Floor Tile m²/carton', 'number', '0.1')}
              {renderInput('sittingRoomTileM2PerCarton', 'Sitting Room m²/carton', 'number', '0.1')}
            </div>
          )}

          {renderSection('Custom Categories', 'Define your own units and expense types.',
            <>
                <div>
                    <label className="block text-sm font-bold text-dark-gray">Custom Material Units</label>
                    <div className="flex gap-2 mt-1">
                        <input type="text" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="e.g., rolls" className="input-field" onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()} />
                        <button type="button" onClick={handleAddUnit} className="btn-primary" disabled={!newUnit.trim()}>Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {localSettings.customMaterialUnits.map(unit => (
                            <div key={unit} className="chip bg-sky-100 text-primary"><span>{unit}</span><button onClick={() => handleRemoveUnit(unit)}><RemoveIcon className="w-4 h-4" /></button></div>
                        ))}
                    </div>
                </div>
                <div className="pt-4 border-t">
                    <label className="block text-sm font-bold text-dark-gray">Expense Categories</label>
                    <div className="flex gap-2 mt-1">
                        <input type="text" value={newExpenseCategory} onChange={(e) => setNewExpenseCategory(e.target.value)} placeholder="e.g., Marketing" className="input-field" onKeyDown={(e) => e.key === 'Enter' && handleAddExpenseCategory()} />
                        <button type="button" onClick={handleAddExpenseCategory} className="btn-primary" disabled={!newExpenseCategory.trim()}>Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {localSettings.defaultExpenseCategories.map(cat => (
                            <div key={cat} className="chip bg-indigo-100 text-indigo-600"><span>{cat}</span><button onClick={() => handleRemoveExpenseCategory(cat)}><RemoveIcon className="w-4 h-4" /></button></div>
                        ))}
                    </div>
                </div>
            </>
          )}
          
           {renderSection('Display Options', 'Control what information is visible on the generated quotation.',
            <div className="space-y-6">
              {renderInput('documentTitle', 'Document Title', 'text', undefined, "QUOTATION")}
              {renderCheckbox('showUnitPrice', 'Show Unit Prices in tables')}
              {renderCheckbox('showSubtotal', 'Show Subtotal column in tables')}
              {renderCheckbox('showMaintenance', 'Include Maintenance in calculations')}
              {renderCheckbox('showTileSize', 'Show Tile Size column in tables')}
              {renderCheckbox('showTermsAndConditions', 'Show Terms & Conditions section')}
              {renderCheckbox('showChecklistDefault', 'Include Project Checklist on new quotations')}
               <div className="pt-4 border-t border-medium-gray grid grid-cols-2 gap-4 items-center">
                {renderInput('taxPercentage', 'Tax Percentage (%)', 'number', '0.1')}
                {renderCheckbox('showTax', 'Include Tax in Grand Total')}
              </div>
            </div>
          )}

          {renderSection('Quotation Defaults', 'Set default text and terms for new quotations.',
            <div className="space-y-4">
              <div>
                <label htmlFor="defaultTermsAndConditions" className="block text-sm font-bold text-dark-gray">Default Terms & Conditions</label>
                <textarea
                  id="defaultTermsAndConditions"
                  name="defaultTermsAndConditions"
                  value={localSettings.defaultTermsAndConditions}
                  onChange={handleChange}
                  rows={5}
                  className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
                  placeholder="e.g., 1. 50% advance payment..."
                />
              </div>
              {renderCheckbox('addCheckmateDefault', "Include 'Checkmate' final step in new checklists")}
            </div>
          )}

          {renderSection('Invoicing Defaults', 'Set the prefix for invoice numbers and default text.',
            <>
              {renderInput('invoicePrefix', 'Invoice Number Prefix', 'text', undefined, "INV-")}
              <div>
                <label htmlFor="defaultBankDetails" className="block text-sm font-bold text-dark-gray">Default Bank Details</label>
                <textarea
                  id="defaultBankDetails"
                  name="defaultBankDetails"
                  value={localSettings.defaultBankDetails}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
                />
              </div>
              <div>
                <label htmlFor="defaultInvoiceNotes" className="block text-sm font-bold text-dark-gray">Default Invoice Notes</label>
                <textarea
                  id="defaultInvoiceNotes"
                  name="defaultInvoiceNotes"
                  value={localSettings.defaultInvoiceNotes}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
                />
              </div>
              <div className="pt-4 border-t border-medium-gray space-y-4">
                <h4 className="text-md font-bold text-dark-gray">QR Code Payments</h4>
                {renderCheckbox('showQRCode', 'Show "Scan to Pay" QR Code on Invoices')}
                {renderInput('paymentUrl', 'Payment URL (e.g., Paystack link)', 'url', undefined, "https://paystack.com/pay/your_link")}
              </div>
            </>
          )}

        </div>
        <div className="p-6 bg-light-gray border-t border-medium-gray flex justify-end gap-4 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-white text-secondary font-semibold rounded-lg border border-medium-gray hover:bg-gray-100 transition-all shadow-sm transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600 transition-all shadow-md transform hover:scale-105"
          >
            Save Settings
          </button>
        </div>
        <style jsx>{`
            .input-field {
                padding: 8px 12px;
                border: 1px solid #E5E7EB; /* medium-gray */
                border-radius: 8px;
                font-size: 14px;
                width: 100%;
            }
            .btn-primary {
                padding: 8px 16px;
                background-color: #0EA5E9; /* primary */
                color: white;
                font-weight: 600;
                border-radius: 8px;
            }
            .btn-primary:disabled {
                background-color: #9CA3AF; /* gray-400 */
            }
            .chip {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 4px 10px;
                border-radius: 9999px;
                font-size: 14px;
                font-weight: 500;
            }
            .chip button {
                padding: 2px;
                border-radius: 9999px;
            }
            .chip button:hover {
                background-color: rgba(0,0,0,0.1);
            }
        `}</style>
      </div>
    </div>
  );
};

export default SettingsModal;