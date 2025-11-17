import React, { useState } from 'react';
import { Material, Settings } from '../types';

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Omit<Material, 'confidence'>) => void;
  settings: Settings;
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({ isOpen, onClose, onSave, settings }) => {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (item && typeof quantity === 'number' && quantity > 0 && unit && typeof unitPrice === 'number' && unitPrice >= 0) {
      onSave({
        item,
        quantity,
        unit,
        unitPrice,
      });
      // Reset form and close
      setItem('');
      setQuantity('');
      setUnit('');
      setUnitPrice('');
      onClose();
    }
  };

  const isFormValid = item.trim() !== '' && unit.trim() !== '' && Number(quantity) > 0 && Number(unitPrice) >= 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-8 border-b border-medium-gray">
          <h2 className="text-xl font-bold text-secondary">Add New Material</h2>
          <p className="text-sm text-gray-500">Manually add an item to the materials list.</p>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label htmlFor="item" className="block text-sm font-bold text-dark-gray">Material Name</label>
            <input
              type="text"
              id="item"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g., Tile Adhesive"
              className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-bold text-dark-gray">Quantity</label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g., 10"
                className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
              />
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-bold text-dark-gray">Unit</label>
              <input
                type="text"
                id="unit"
                list="units-datalist"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., bags"
                className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
              />
              <datalist id="units-datalist">
                {settings.customMaterialUnits.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label htmlFor="unitPrice" className="block text-sm font-bold text-dark-gray">Unit Price (NGN)</label>
            <input
              type="number"
              id="unitPrice"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="e.g., 3500"
              className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
            />
          </div>
        </div>
        <div className="p-6 bg-light-gray border-t border-medium-gray flex justify-end gap-4">
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
            disabled={!isFormValid}
            className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600 transition-all shadow-md transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
          >
            Add Material
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMaterialModal;