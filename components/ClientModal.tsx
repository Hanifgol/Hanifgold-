import React, { useState, useEffect } from 'react';
import { Client } from '../types';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  clientToEdit: Client | null;
}

const defaultClientState = { id: '', name: '', address: '', phone: '' };

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSave, clientToEdit }) => {
  const [client, setClient] = useState<Client>(defaultClientState);

  useEffect(() => {
    if (clientToEdit) {
      setClient(clientToEdit);
    } else {
      setClient(defaultClientState);
    }
  }, [clientToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (client.name.trim()) {
      onSave(client);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-medium-gray">
          <h2 className="text-xl font-bold text-secondary">{clientToEdit ? 'Edit Client' : 'Add New Client'}</h2>
          <p className="text-sm text-gray-500">Enter the client's contact information.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-dark-gray">Client Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={client.name}
              onChange={handleChange}
              placeholder="e.g., John Doe"
              className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-bold text-dark-gray">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={client.address}
              onChange={handleChange}
              placeholder="e.g., 123 Banana Island, Lagos"
              className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-bold text-dark-gray">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={client.phone}
              onChange={handleChange}
              placeholder="e.g., 08012345678"
              className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg"
            />
          </div>
        </div>
        <div className="p-4 bg-light-gray border-t border-medium-gray flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-white text-secondary font-semibold rounded-lg border border-medium-gray hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!client.name.trim()}
            className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600 disabled:bg-gray-400"
          >
            Save Client
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;