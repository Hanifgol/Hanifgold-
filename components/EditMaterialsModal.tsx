
import React, { useState, useEffect } from 'react';
import { Material, Settings } from '../types';
import { PlusIcon, RemoveIcon } from './icons';

interface EditMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (materials: Material[]) => void;
  currentMaterials: Material[];
  settings: Settings;
}

const EditMaterialsModal: React.FC<EditMaterialsModalProps> = ({ isOpen, onClose, onSave, currentMaterials, settings }) => {
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    // Deep copy to prevent mutating prop directly
    setMaterials(JSON.parse(JSON.stringify(currentMaterials)));
  }, [currentMaterials, isOpen]);

  const handleChange = (index: number, field: keyof Material, value: string | number) => {
    const newMaterials = [...materials];
    (newMaterials[index] as any)[field] = value;
    setMaterials(newMaterials);
  };

  const handleAdd = () => {
    setMaterials([...materials, { item: '', quantity: 1, unit: 'pcs', unitPrice: 0 }]);
  };

  const handleRemove = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validated = materials.map(m => ({
        ...m,
        // Ensure numbers are numbers
        quantity: parseFloat(String(m.quantity)) || 0,
        unitPrice: parseFloat(String(m.unitPrice)) || 0
    })).filter(m => m.item.trim() !== ''); // Remove empty items
    onSave(validated);
  };

  if (!isOpen) return null;

  const inputClass = "block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-border-color dark:border-slate-700 rounded-lg shadow-sm sm:text-sm focus:ring-gold/80 focus:border-gold transition";

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in">
        <div className="p-6 border-b border-border-color dark:border-slate-700">
          <h2 className="text-xl font-bold text-brand-dark dark:text-white">Edit Materials List</h2>
          <p className="text-sm text-gray-500">Modify items, quantities, units, and prices.</p>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {materials.length === 0 && (
              <p className="text-center text-gray-500 italic py-4">No materials listed. Click 'Add New Material' to start.</p>
          )}
          {materials.map((mat, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-3 p-4 border border-border-color dark:border-slate-700 rounded-xl bg-brand-light dark:bg-slate-800 relative shadow-sm items-start md:items-end group">
                <div className="flex-grow w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Item Name</label>
                    <input
                        type="text"
                        value={mat.item}
                        onChange={(e) => handleChange(index, 'item', e.target.value)}
                        className={inputClass}
                        placeholder="Item Name"
                    />
                </div>
                <div className="w-full md:w-24">
                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Qty</label>
                    <input
                        type="number"
                        value={mat.quantity}
                        onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                        className={inputClass}
                        placeholder="Qty"
                    />
                </div>
                <div className="w-full md:w-32">
                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Unit</label>
                    <input
                        type="text"
                        list={`units-${index}`}
                        value={mat.unit}
                        onChange={(e) => handleChange(index, 'unit', e.target.value)}
                        className={inputClass}
                        placeholder="Unit"
                    />
                     <datalist id={`units-${index}`}>
                        {settings.customMaterialUnits.map(u => <option key={u} value={u} />)}
                    </datalist>
                </div>
                <div className="w-full md:w-32">
                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Price (NGN)</label>
                    <input
                        type="number"
                        value={mat.unitPrice}
                        onChange={(e) => handleChange(index, 'unitPrice', e.target.value)}
                        className={inputClass}
                        placeholder="Price"
                    />
                </div>
                <button
                    onClick={() => handleRemove(index)}
                    className="p-2 text-gray-400 hover:text-danger hover:bg-red-100 rounded-full transition-colors mb-0.5"
                    title="Remove Item"
                >
                    <RemoveIcon className="w-5 h-5" />
                </button>
            </div>
          ))}
           <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-3 border-2 border-dashed border-border-color dark:border-slate-600 text-brand-dark dark:text-white font-semibold rounded-xl hover:border-gold hover:text-gold hover:bg-gold-light/10 transition-all"
           >
                <PlusIcon className="w-5 h-5" />
                Add New Material
            </button>
        </div>
        <div className="p-6 bg-brand-light dark:bg-slate-900/50 border-t border-border-color dark:border-slate-700 flex justify-end gap-4 mt-auto rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-white dark:bg-slate-700 text-brand-dark dark:text-white font-semibold rounded-lg border border-border-color dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-gold text-brand-dark font-bold rounded-lg hover:bg-gold-dark transition-all shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMaterialsModal;
