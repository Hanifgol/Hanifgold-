import React from 'react';
import { ClientDetails } from '../types';

interface ClientDetailsFormProps {
  details: ClientDetails;
  setDetails: React.Dispatch<React.SetStateAction<ClientDetails>>;
  disabled: boolean;
}

const ClientDetailsForm: React.FC<ClientDetailsFormProps> = ({ details, setDetails, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
        setDetails(prev => ({ ...prev, [name]: checked }));
    } else {
        setDetails(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const fields = [
      { name: 'clientName', showName: 'showClientName', label: "Client's Name", placeholder: "e.g., John Doe" },
      { name: 'clientAddress', showName: 'showClientAddress', label: "Client's Address / Project Site", placeholder: "e.g., 123 Banana Island, Lagos" },
      { name: 'clientPhone', showName: 'showClientPhone', label: "Client's Phone", placeholder: "e.g., 08012345678" },
      { name: 'projectName', showName: 'showProjectName', label: "Project Name", placeholder: "e.g., Lekki Phase 1 Residence" },
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Client & Project Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
        {fields.map(field => (
            <div key={field.name}>
                <div className="flex items-center justify-between mb-1">
                     <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                        {field.label}
                    </label>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id={field.showName}
                            name={field.showName}
                            checked={details[field.showName as keyof ClientDetails] as boolean}
                            onChange={handleChange}
                            disabled={disabled}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor={field.showName} className="ml-2 text-xs text-gray-600">Show</label>
                    </div>
                </div>
                <input
                    type="text"
                    id={field.name}
                    name={field.name}
                    value={details[field.name as keyof ClientDetails] as string}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
                />
            </div>
        ))}
      </div>
    </div>
  );
};

export default ClientDetailsForm;