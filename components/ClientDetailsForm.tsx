
import React, { useState, useEffect, useRef } from 'react';
import { ClientDetails, Client } from '../types';
import { ChevronDownIcon, ClientsIcon } from './icons';

interface ClientDetailsFormProps {
  details: ClientDetails;
  setDetails: React.Dispatch<React.SetStateAction<ClientDetails>>;
  disabled: boolean;
  allClients: Client[];
  saveClientInfo: boolean;
  setSaveClientInfo: (save: boolean) => void;
}

const ClientDetailsForm: React.FC<ClientDetailsFormProps> = ({ details, setDetails, disabled, allClients, saveClientInfo, setSaveClientInfo }) => {
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
        setDetails(prev => ({ ...prev, [name]: checked }));
    } else {
        setDetails(prev => ({ ...prev, [name]: value, clientId: name === 'clientName' ? undefined : prev.clientId }));
         if (name === 'clientName' && value.length > 1) {
            const filtered = allClients.filter(client => 
                client.name.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else if (name === 'clientName') {
            setShowSuggestions(false);
        }
    }
  };
  
  const handleSuggestionClick = (client: Client) => {
      setDetails(prev => ({
          ...prev,
          clientName: client.name,
          clientAddress: client.address,
          clientPhone: client.phone,
          clientEmail: client.email,
          clientId: client.id,
      }));
      setShowSuggestions(false);
  };
  
  const optionalFields = [
      { name: 'clientEmail', label: "Email Address", placeholder: "e.g., john@example.com" },
      { name: 'clientAddress', showName: 'showClientAddress', label: "Address / Site Location", placeholder: "e.g., 123 Banana Island, Lagos" },
      { name: 'clientPhone', showName: 'showClientPhone', label: "Phone Number", placeholder: "e.g., 08012345678" },
      { name: 'projectName', showName: 'showProjectName', label: "Project Description", placeholder: "e.g., Lekki Phase 1 Residence" },
  ];

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/40 dark:border-white/5 transition-all hover:shadow-2xl hover:bg-white dark:hover:bg-slate-900 group">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <span className="p-1 rounded-md bg-gold/10 text-gold-dark"><ClientsIcon className="w-3 h-3"/></span>
            Client Information
        </h2>
        <button onClick={() => setShowMore(!showMore)} className="text-[10px] font-bold text-gold-dark hover:text-white hover:bg-gold uppercase tracking-wider flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-light/30 transition-all">
          {showMore ? 'Less' : 'More Fields'}
          <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${showMore ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="space-y-5">
        {/* Client Name with Autocomplete */}
        <div className="relative" ref={wrapperRef}>
            <div className="flex items-center justify-between mb-2">
                 <label htmlFor="clientName" className="block text-sm font-bold text-brand-dark dark:text-slate-200">
                    Client Name
                </label>
                {showMore && (
                  <div className="flex items-center gap-2 cursor-pointer group/toggle">
                      <div className="relative">
                        <input type="checkbox" id="showClientName" name="showClientName" checked={details.showClientName} onChange={handleChange} disabled={disabled} className="sr-only peer"/>
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-gold"></div>
                      </div>
                      <label htmlFor="showClientName" className="text-[9px] text-gray-400 font-bold uppercase cursor-pointer group-hover/toggle:text-gold-dark transition-colors">Show</label>
                  </div>
                )}
            </div>
            <div className="relative">
                <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    value={details.clientName}
                    onChange={handleChange}
                    onFocus={() => details.clientName.length > 1 && setShowSuggestions(true)}
                    placeholder="Enter client name..."
                    disabled={disabled}
                    autoComplete="off"
                    className="block w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-transparent rounded-2xl shadow-inner placeholder-gray-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-gold/20 focus:border-gold transition-all sm:text-sm font-medium"
                />
                {details.clientId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 pointer-events-none">
                        SAVED
                    </div>
                )}
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl max-h-60 overflow-auto animate-fade-in p-1">
                    {suggestions.map(client => (
                        <li key={client.id} onClick={() => handleSuggestionClick(client)} className="px-4 py-3 cursor-pointer hover:bg-gold-lightest dark:hover:bg-slate-800 rounded-xl transition-colors group/item">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-sm text-brand-dark dark:text-white group-hover/item:text-gold-dark transition-colors">{client.name}</p>
                                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{client.address}</p>
                                </div>
                                <div className="text-right">
                                     <p className="text-[10px] font-medium text-gray-500">{client.phone}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
        
        {/* Collapsible Section */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showMore ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="pt-2 space-y-5">
            {optionalFields.map(field => (
                <div key={field.name}>
                    <div className="flex items-center justify-between mb-2">
                         <label htmlFor={field.name} className="block text-sm font-bold text-brand-dark dark:text-slate-200">
                            {field.label}
                        </label>
                        {field.showName && (
                            <div className="flex items-center gap-2 cursor-pointer group/toggle">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        id={field.showName}
                                        name={field.showName}
                                        checked={details[field.showName as keyof ClientDetails] as boolean}
                                        onChange={handleChange}
                                        disabled={disabled}
                                        className="sr-only peer"
                                    />
                                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-gold"></div>
                                </div>
                                <label htmlFor={field.showName} className="text-[9px] text-gray-400 font-bold uppercase cursor-pointer group-hover/toggle:text-gold-dark transition-colors">Show</label>
                            </div>
                        )}
                    </div>
                    <input
                        type={field.name.toLowerCase().includes('email') ? 'email' : 'text'}
                        id={field.name}
                        name={field.name}
                        value={(details[field.name as keyof ClientDetails] as string) || ''}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        disabled={disabled}
                        className="block w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border-transparent rounded-2xl shadow-inner placeholder-gray-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-gold/20 focus:border-gold transition-all sm:text-sm font-medium"
                    />
                </div>
            ))}
          </div>
        </div>

        {!details.clientId && details.clientName.trim().length > 0 && (
            <div className="flex items-center pt-1 pl-1">
                 <input
                    type="checkbox"
                    id="saveClientInfo"
                    name="saveClientInfo"
                    checked={saveClientInfo}
                    onChange={(e) => setSaveClientInfo(e.target.checked)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold cursor-pointer"
                />
                <label htmlFor="saveClientInfo" className="ml-2 text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gold-dark transition-colors">Save this client for future use</label>
            </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailsForm;
