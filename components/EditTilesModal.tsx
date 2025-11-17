import React, { useState, useEffect } from 'react';
import { Tile } from '../types';
import { PlusIcon, RemoveIcon } from './icons';

interface EditTilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tiles: Tile[]) => void;
  currentTiles: Tile[];
}

const EditTilesModal: React.FC<EditTilesModalProps> = ({ isOpen, onClose, onSave, currentTiles }) => {
  const [tiles, setTiles] = useState<Tile[]>([]);

  useEffect(() => {
    // Deep copy to prevent modifying original state directly
    setTiles(JSON.parse(JSON.stringify(currentTiles)));
  }, [currentTiles, isOpen]);

  const handleTileChange = (index: number, field: keyof Tile, value: string | number) => {
    const newTiles = [...tiles];
    // This type assertion is necessary for dynamic field updates
    (newTiles[index] as any)[field] = value;
    setTiles(newTiles);
  };

  const handleAddTile = () => {
    setTiles([
      ...tiles,
      {
        category: '',
        cartons: 0,
        sqm: 0,
        tileType: 'Unknown',
        unitPrice: 0,
        size: '',
      },
    ]);
  };

  const handleRemoveTile = (index: number) => {
    setTiles(tiles.filter((_, i) => i !== index));
  };

  const handleSaveChanges = () => {
    // Basic validation to ensure numbers are not negative
    const validatedTiles = tiles.map(tile => ({
        ...tile,
        cartons: Math.max(0, Number(tile.cartons)),
        sqm: Math.max(0, Number(tile.sqm)),
        unitPrice: Math.max(0, Number(tile.unitPrice))
    }));
    onSave(validatedTiles);
  };

  if (!isOpen) return null;
  
  const inputClass = "mt-1 block w-full px-2 py-1.5 bg-white border border-medium-gray rounded-lg shadow-sm sm:text-sm focus:ring-primary/80 focus:border-primary transition";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-8 border-b border-medium-gray">
          <h2 className="text-xl font-bold text-secondary">Edit Tile Details</h2>
          <p className="text-sm text-gray-500">Modify, add, or remove tile entries for the quotation.</p>
        </div>
        <div className="p-8 overflow-y-auto space-y-6">
          {tiles.map((tile, index) => (
            <div key={index} className="p-6 border border-medium-gray rounded-lg bg-light-gray relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor={`category-${index}`} className="block text-xs font-bold text-dark-gray">Category</label>
                  <input
                    type="text"
                    id={`category-${index}`}
                    value={tile.category}
                    onChange={(e) => handleTileChange(index, 'category', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Kitchen Wall"
                  />
                </div>
                <div>
                  <label htmlFor={`sqm-${index}`} className="block text-xs font-bold text-dark-gray">SQM (m²)</label>
                  <input
                    type="number"
                    id={`sqm-${index}`}
                    value={tile.sqm}
                    onChange={(e) => handleTileChange(index, 'sqm', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`cartons-${index}`} className="block text-xs font-bold text-dark-gray">Cartons</label>
                  <input
                    type="number"
                    id={`cartons-${index}`}
                    value={tile.cartons}
                    onChange={(e) => handleTileChange(index, 'cartons', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                 <div>
                  <label htmlFor={`size-${index}`} className="block text-xs font-bold text-dark-gray">Size</label>
                  <input
                    type="text"
                    id={`size-${index}`}
                    value={tile.size}
                    onChange={(e) => handleTileChange(index, 'size', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 60x60"
                  />
                </div>
                <div>
                  <label htmlFor={`unitPrice-${index}`} className="block text-xs font-bold text-dark-gray">Unit Price (NGN)</label>
                  <input
                    type="number"
                    id={`unitPrice-${index}`}
                    value={tile.unitPrice}
                    onChange={(e) => handleTileChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`tileType-${index}`} className="block text-xs font-bold text-dark-gray">Tile Type</label>
                  <select
                    id={`tileType-${index}`}
                    value={tile.tileType}
                    onChange={(e) => handleTileChange(index, 'tileType', e.target.value as Tile['tileType'])}
                    className={inputClass}
                  >
                    <option>Wall</option>
                    <option>Floor</option>
                    <option>External Wall</option>
                    <option>Step</option>
                    <option>Unknown</option>
                  </select>
                </div>
              </div>
               <button
                  onClick={() => handleRemoveTile(index)}
                  className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-danger hover:bg-red-100 rounded-full transition-colors"
                  aria-label="Remove tile"
                >
                  <RemoveIcon className="w-5 h-5" />
                </button>
            </div>
          ))}
           <button
            onClick={handleAddTile}
            className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2 border-2 border-dashed border-medium-gray text-secondary font-semibold rounded-lg hover:border-primary hover:text-primary transition-colors"
           >
                <PlusIcon className="w-5 h-5" />
                Add New Tile
            </button>
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
            onClick={handleSaveChanges}
            className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600 transition-all shadow-md transform hover:scale-105"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTilesModal;