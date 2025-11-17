import React, { useState, useMemo } from 'react';
import { InvoiceData, Settings } from '../types';
import { ViewIcon, DeleteIcon, PdfIcon, ArrowUpIcon, ArrowDownIcon, FileTextIcon, CheckCircleIcon, EditIcon } from './icons';
import { exportInvoiceToPdf } from '../services/exportService';

interface InvoicesProps {
  invoices: InvoiceData[];
  settings: Settings;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (updatedInvoice: InvoiceData) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
};

const getInvoiceTotal = (invoice: InvoiceData, settings: Settings) => {
    const { tiles, materials, workmanshipRate, maintenance, profitPercentage, discountType, discountValue } = invoice;
    const { showMaintenance, taxPercentage } = settings;
    const totalSqm = tiles.reduce((acc, tile) => acc + Number(tile.sqm), 0);
    const totalTileCost = tiles.reduce((acc, tile) => acc + (Number(tile.cartons) * Number(tile.unitPrice)), 0);
    const totalMaterialCost = materials.reduce((acc, mat) => acc + (Number(mat.quantity) * Number(mat.unitPrice)), 0);
    const workmanshipCost = totalSqm * Number(workmanshipRate);
    const workmanshipAndMaintenance = workmanshipCost + (showMaintenance ? Number(maintenance) : 0);
    const preProfitTotal = totalTileCost + totalMaterialCost + workmanshipAndMaintenance;
    const profitAmount = profitPercentage ? preProfitTotal * (Number(profitPercentage) / 100) : 0;
    const subtotal = preProfitTotal + profitAmount;
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === 'amount') {
        discountAmount = discountValue;
    }

    const postDiscountSubtotal = subtotal - discountAmount;
    const taxAmount = postDiscountSubtotal * (taxPercentage / 100);
    return postDiscountSubtotal + taxAmount;
};

const StatusBadge: React.FC<{ status: 'Paid' | 'Unpaid' | 'Overdue' }> = ({ status }) => {
  const styles = {
    Unpaid: 'bg-amber-100 text-amber-800 border-amber-200',
    Paid: 'bg-emerald-100 text-success border-emerald-200',
    Overdue: 'bg-red-100 text-danger border-red-200',
  };
  return <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles[status]}`}>{status}</span>;
};

const Invoices: React.FC<InvoicesProps> = ({ invoices, settings, onEdit, onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'invoiceDate', direction: 'desc' });
  
  const processedInvoices = useMemo(() => {
      const now = new Date().getTime();
      return invoices.map(inv => {
          let status: 'Paid' | 'Unpaid' | 'Overdue' = inv.status;
          if (inv.status === 'Unpaid' && inv.dueDate < now) {
              status = 'Overdue';
          }
          return { ...inv, status };
      });
  }, [invoices]);

  const sortedAndFilteredInvoices = useMemo(() => {
    let filtered = [...processedInvoices];

    if (statusFilter !== 'All') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.clientDetails.clientName.toLowerCase().includes(lowercasedTerm) ||
        inv.invoiceNumber.toLowerCase().includes(lowercasedTerm)
      );
    }

    filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof InvoiceData];
        let bValue: any = b[sortConfig.key as keyof InvoiceData];
        if (sortConfig.key === 'total') {
            aValue = getInvoiceTotal(a, settings);
            bValue = getInvoiceTotal(b, settings);
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
  }, [processedInvoices, searchTerm, statusFilter, sortConfig, settings]);
  
  const handleMarkAsPaid = (invoice: InvoiceData) => {
      if (window.confirm(`Are you sure you want to mark invoice ${invoice.invoiceNumber} as Paid?`)) {
          onUpdate({ ...invoice, status: 'Paid', paymentDate: Date.now() });
      }
  }

  const requestSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const SortableHeader: React.FC<{ sortKey: string, label: string }> = ({ sortKey, label }) => (
    <th className="p-4 font-semibold text-left cursor-pointer" onClick={() => requestSort(sortKey)}>
        <div className="flex items-center gap-2">
            {label}
            {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-4 h-4"/> : <ArrowDownIcon className="w-4 h-4"/>)}
        </div>
    </th>
  );
  
  return (
    <div className="bg-white p-8 rounded-xl border border-medium-gray shadow-md space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-secondary">Invoices</h1>
        <p className="text-gray-500">Manage all your client invoices.</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 justify-between">
        <input
          type="text"
          placeholder="Search by client or invoice #..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 bg-light-gray/50 border border-medium-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary"
        />
        <div className="flex items-center gap-2">
          {['All', 'Paid', 'Unpaid', 'Overdue'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${statusFilter === status ? 'bg-primary text-white shadow' : 'bg-gray-200 text-dark-gray hover:bg-gray-300'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto border border-medium-gray rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary text-white text-xs uppercase">
            <tr>
              <SortableHeader sortKey="invoiceNumber" label="Invoice #" />
              <th className="p-4 font-semibold">Client</th>
              <SortableHeader sortKey="invoiceDate" label="Issued" />
              <SortableHeader sortKey="dueDate" label="Due" />
              <SortableHeader sortKey="total" label="Total" />
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-medium-gray">
            {sortedAndFilteredInvoices.map(inv => (
              <tr key={inv.id} className="bg-white hover:bg-light-gray transition-colors">
                <td className="p-4 font-semibold text-primary">{inv.invoiceNumber}</td>
                <td className="p-4 font-bold text-secondary">{inv.clientDetails.clientName}</td>
                <td className="p-4 text-dark-gray">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                <td className="p-4 text-dark-gray">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="p-4 font-semibold text-dark-gray">{formatCurrency(getInvoiceTotal(inv, settings))}</td>
                <td className="p-4"><StatusBadge status={inv.status} /></td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {inv.status !== 'Paid' && (
                       <button onClick={() => handleMarkAsPaid(inv)} className="p-2 text-gray-500 hover:text-success hover:bg-green-100 rounded-full" title="Mark as Paid"><CheckCircleIcon className="w-5 h-5"/></button>
                    )}
                    <button onClick={() => onEdit(inv.id)} className="p-2 text-gray-500 hover:text-primary hover:bg-sky-100 rounded-full" title="View/Edit"><EditIcon className="w-5 h-5"/></button>
                    <button onClick={async () => await exportInvoiceToPdf(inv, settings)} className="p-2 text-gray-500 hover:text-accent hover:bg-orange-100 rounded-full" title="Download PDF"><PdfIcon className="w-5 h-5"/></button>
                    <button onClick={() => onDelete(inv.id)} className="p-2 text-gray-500 hover:text-danger hover:bg-red-100 rounded-full" title="Delete"><DeleteIcon className="w-5 h-5"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

       {sortedAndFilteredInvoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">
                <FileTextIcon className="w-16 h-16 mx-auto text-gray-300" />
                <h3 className="mt-2 text-lg font-semibold text-secondary">No Invoices Found</h3>
                <p>Try adjusting your search or filters, or convert an accepted quotation to get started.</p>
            </div>
        )}
    </div>
  );
};

export default Invoices;