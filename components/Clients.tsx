
import React, { useState, useMemo } from 'react';
import { Client, QuotationData } from '../types';
import { EditIcon, DeleteIcon, ViewIcon, PlusIcon, FileTextIcon, ClientsIcon, MailIcon } from './icons';

interface ClientsProps {
  clients: Client[];
  quotations: QuotationData[];
  onAdd: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onViewQuotes: (id: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ clients, quotations, onAdd, onEdit, onDelete, onViewQuotes }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const lowercasedTerm = searchTerm.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(lowercasedTerm) ||
      client.address.toLowerCase().includes(lowercasedTerm) ||
      client.phone.toLowerCase().includes(lowercasedTerm) ||
      (client.email && client.email.toLowerCase().includes(lowercasedTerm))
    );
  }, [clients, searchTerm]);
  
  const quoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const quote of quotations) {
        if(quote.clientDetails.clientId) {
            counts[quote.clientDetails.clientId] = (counts[quote.clientDetails.clientId] || 0) + 1;
        }
    }
    return counts;
  }, [quotations]);

  return (
    <div className="bg-brand-light dark:bg-slate-900/50 p-8 rounded-2xl border border-gold-light dark:border-slate-700 shadow-lg space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark dark:text-white">Client Management</h1>
          <p className="text-gray-500">View, add, and edit your client records.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gold text-brand-dark font-bold rounded-xl hover:bg-gold-dark transition-all shadow-md transform hover:scale-105 active:scale-95"
        >
          <PlusIcon className="w-5 h-5"/>
          Add New Client
        </button>
      </div>

      <div className="relative">
        <input
            type="text"
            placeholder="Search by name, address, email or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-border-color dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/80 shadow-inner"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredClients.length > 0 ? (
          filteredClients.map(client => (
            <div key={client.id} className="bg-white dark:bg-slate-800 border border-gold-light dark:border-slate-700 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-12 h-12 rounded-full bg-gold-light text-gold-dark flex items-center justify-center font-bold text-xl border border-gold/20">
                      {client.name.charAt(0).toUpperCase()}
                   </div>
                   <div>
                      <h3 className="font-bold text-lg text-brand-dark dark:text-white leading-tight">{client.name}</h3>
                      <p className="text-xs text-gold-dark font-semibold uppercase tracking-wider">Client ID: {client.id.slice(0, 8)}</p>
                   </div>
                </div>
                
                <div className="space-y-2 mt-4">
                    {client.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                           <MailIcon className="w-4 h-4 text-gold-dark" />
                           <span className="truncate">{client.email}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                       <svg className="w-4 h-4 text-gold-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                       <span>{client.phone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
                       <svg className="w-4 h-4 text-gold-dark mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                       <span className="line-clamp-2">{client.address}</span>
                    </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-color dark:border-slate-700 flex justify-between items-center relative z-10">
                <div className="text-xs font-bold text-brand-dark dark:text-slate-300 uppercase tracking-widest bg-brand-light dark:bg-slate-700 px-3 py-1 rounded-full">
                  {quoteCounts[client.id] || 0} Quotations
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onViewQuotes(client.id)} className="p-2 text-gray-400 hover:text-gold-dark hover:bg-gold-light rounded-xl transition-all" title="View Quotations"><ViewIcon className="w-5 h-5"/></button>
                  <button onClick={() => onEdit(client)} className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-100 rounded-xl transition-all" title="Edit Client"><EditIcon className="w-5 h-5"/></button>
                  <button onClick={() => onDelete(client.id)} className="p-2 text-gray-400 hover:text-danger hover:bg-red-100 rounded-xl transition-all" title="Delete Client"><DeleteIcon className="w-5 h-5"/></button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2 lg:col-span-3 text-center py-20 text-gray-500 bg-white dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-slate-700">
            <ClientsIcon className="w-20 h-20 mx-auto text-gray-200 dark:text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-brand-dark dark:text-white">No Clients Found</h3>
            <p className="mt-1">Click "Add New Client" to build your database.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
