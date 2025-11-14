
import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  currentSettings: Settings;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState<Settings>(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setSettings(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
        setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    onSave(settings);
  };
  
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (!isOpen) return null;

  const inputFields = [
    { name: 'wallTilePrice', label: 'Wall Tile Price (NGN)', description: 'Default price per carton for wall tiles.'},
    { name: 'floorTilePrice', label: 'Floor Tile Price (NGN)', description: 'Default price per carton for floor tiles.'},
    { name: 'externalWallTilePrice', label: 'External Wall Tile Price (NGN)', description: 'Default price per carton for external wall tiles.'},
    { name: 'stepTilePrice', label: 'Step Tile Price (NGN)', description: 'Default price per carton for step tiles.'},
    { name: 'cementPrice', label: 'Cement Price (NGN)', description: 'Default price per bag of cement.'},
    { name: 'whiteCementPrice', label: 'White Cement Price (NGN)', description: 'Default price per bag of white cement.'},
    { name: 'sharpSandPrice', label: 'Sharp Sand Price (NGN)', description: 'Default price for sharp sand (e.g., per truck).'},
    { name: 'workmanshipRate', label: 'Workmanship Rate (NGN/m²)', description: 'Default rate for workmanship per square meter.'},
    { name: 'wallTileM2PerCarton', label: 'Wall Tile Coverage (m²/carton)', description: 'Assumed m² one carton of wall tiles will cover.'},
    { name: 'floorTileM2PerCarton', label: 'Floor Tile Coverage (m²/carton)', description: 'Assumed m² one carton of floor tiles will cover.'},
    { name: 'externalWallTileM2PerCarton', label: 'External Wall Coverage (m²/carton)', description: 'Assumed m² one carton of external tiles will cover.'},
    { name: 'stepTileM2PerCarton', label: 'Step Tile Coverage (m²/carton)', description: 'Assumed m² one carton of step tiles will cover.'},
    { name: 'wastageFactor', label: 'Wastage Factor', description: 'e.g., 1.10 for 10% wastage. Used when calculating cartons from m².'},
  ];
  
  const displayFields = [
      { name: 'showUnitPrice', label: 'Show Unit Price'},
      { name: 'showSubtotal', label: 'Show Subtotal Column'},
      { name: 'showConfidence', label: 'Show Confidence Score'},
      { name: 'showMaintenance', label: 'Show Maintenance Fee'},
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
          <p className="text-sm text-gray-500">Adjust the default values and display options for your quotations.</p>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {inputFields.map(field => (
                <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                        {field.label}
                    </label>
                    <input
                        type="number"
                        id={field.name}
                        name={field.name}
                        value={settings[field.name as keyof Settings]}
                        onChange={handleChange}
                        step={field.name.includes('Factor') || field.name.includes('M2PerCarton') ? '0.01' : '50'}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">{field.description}</p>
                </div>
            ))}
          </div>

          <div className="pt-4 border-t">
                <h3 className="text-base font-semibold text-gray-800">Display Options</h3>
                <p className="text-sm text-gray-500 mb-4">Choose which fields to show on the final quotation.</p>
                <div className="grid grid-cols-2 gap-4">
                    {displayFields.map(field => (
                        <div className="flex items-center" key={field.name}>
                            <input
                                id={field.name}
                                name={field.name}
                                type="checkbox"
                                checked={settings[field.name as keyof Settings] as boolean}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor={field.name} className="ml-2 block text-sm text-gray-900">
                                {field.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                    <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700">
                        Terms & Conditions
                    </label>
                    <div className="flex items-center">
                        <input
                            id="showTermsAndConditions"
                            name="showTermsAndConditions"
                            type="checkbox"
                            checked={settings.showTermsAndConditions}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />

                        <label htmlFor="showTermsAndConditions" className="ml-2 block text-sm text-gray-900">
                            Show on Quotation
                        </label>
                    </div>
                </div>
                <textarea
                    id="termsAndConditions"
                    name="termsAndConditions"
                    value={settings.termsAndConditions}
                    onChange={handleChange}
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
                    placeholder="e.g., 50% advance payment required..."
                />
                <p className="mt-1 text-xs text-gray-500">This text will appear at the bottom of your exported PDF quotation.</p>
            </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t flex justify-between items-center mt-auto">
           <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-4">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-gray-800 font-semibold rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;