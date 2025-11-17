import React, { useState, useEffect, useMemo } from 'react';
import { InvoiceData, Settings } from '../types';
import { RemoveIcon, DollarSignIcon } from './icons';
import QRCode from './QRCode';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: InvoiceData) => void;
  invoice: InvoiceData;
  settings: Settings;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, onSave, invoice, settings }) => {
  const [localInvoice, setLocalInvoice] = useState<InvoiceData>(invoice);

  useEffect(() => {
    setLocalInvoice(invoice);
  }, [invoice, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'date') {
        const date = new Date(value);
        setLocalInvoice(prev => ({ ...prev, [name]: date.getTime() }));
    } else if (type === 'number') {
        setLocalInvoice(prev => ({...prev, [name]: parseFloat(value) || 0}));
    } else {
        setLocalInvoice(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleMarkAsPaid = () => {
      setLocalInvoice(prev => ({ ...prev, status: 'Paid', paymentDate: Date.now() }));
  }

  const totals = useMemo(() => {
    const { tiles, materials, workmanshipRate, maintenance, profitPercentage, discountType, discountValue } = localInvoice;
    const { showMaintenance, taxPercentage, showTax } = settings;
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
        discountAmount = subtotal * ((Number(discountValue) || 0) / 100);
    } else if (discountType === 'amount') {
        discountAmount = Number(discountValue) || 0;
    }

    const postDiscountSubtotal = subtotal - discountAmount;
    const taxAmount = showTax ? postDiscountSubtotal * (Number(taxPercentage) || 0) / 100 : 0;
    const grandTotal = postDiscountSubtotal + taxAmount;
    return { subtotal, discountAmount, taxAmount, grandTotal };
  }, [localInvoice, settings]);

  const handleSave = () => {
    onSave(localInvoice);
  };
  
  if (!isOpen) return null;

  const renderInput = (name: keyof InvoiceData, label: string, type: string = 'text', props = {}) => (
    <div>
      <label htmlFor={name} className="block text-sm font-bold text-dark-gray">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        value={localInvoice[name] as any}
        onChange={handleChange}
        className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-primary sm:text-sm transition"
        {...props}
      />
    </div>
  );

  const formatDateForInput = (timestamp: number) => new Date(timestamp).toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-8 border-b border-medium-gray flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-secondary">Edit Invoice ({localInvoice.invoiceNumber})</h2>
            <p className="text-sm text-gray-500">Update invoice details and manage payment status.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-danger hover:bg-red-100 rounded-full">
            <RemoveIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <label htmlFor="invoiceNumber" className="block text-sm font-bold text-dark-gray">Invoice #</label>
                  <input type="text" id="invoiceNumber" name="invoiceNumber" value={localInvoice.invoiceNumber} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg"/>
                </div>
                 <div>
                  <label htmlFor="invoiceDate" className="block text-sm font-bold text-dark-gray">Issue Date</label>
                  <input type="date" id="invoiceDate" name="invoiceDate" value={formatDateForInput(localInvoice.invoiceDate)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg"/>
                </div>
                 <div>
                  <label htmlFor="dueDate" className="block text-sm font-bold text-dark-gray">Due Date</label>
                  <input type="date" id="dueDate" name="dueDate" value={formatDateForInput(localInvoice.dueDate)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg"/>
                </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg">
                 <div>
                  <label htmlFor="paymentTerms" className="block text-sm font-bold text-dark-gray">Payment Terms</label>
                   <select id="paymentTerms" name="paymentTerms" value={localInvoice.paymentTerms} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg">
                       <option>Net 7</option>
                       <option>Net 14</option>
                       <option>Net 30</option>
                       <option>Due on Receipt</option>
                   </select>
                </div>
                 <div>
                  <label htmlFor="status" className="block text-sm font-bold text-dark-gray">Status</label>
                   <select id="status" name="status" value={localInvoice.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg">
                       <option value="Unpaid">Unpaid</option>
                       <option value="Paid">Paid</option>
                       <option value="Overdue">Overdue</option>
                   </select>
                </div>
             </div>
             <div>
                <label htmlFor="bankDetails" className="block text-sm font-bold text-dark-gray">Bank Details</label>
                <textarea id="bankDetails" name="bankDetails" value={localInvoice.bankDetails} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg" />
            </div>
             <div>
                <label htmlFor="invoiceNotes" className="block text-sm font-bold text-dark-gray">Notes / Remarks</label>
                <textarea id="invoiceNotes" name="invoiceNotes" value={localInvoice.invoiceNotes} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-light-gray/50 border border-medium-gray rounded-lg" />
            </div>
          </div>

          {/* Right Column - Totals */}
          <div className="md:col-span-1 bg-light-gray p-6 rounded-lg space-y-6">
              <h3 className="font-bold text-lg text-secondary border-b pb-2">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span> <span className="font-medium">{new Intl.NumberFormat().format(totals.subtotal)}</span></div>
                
                <div className="flex items-center gap-2">
                    <select name="discountType" value={localInvoice.discountType} onChange={handleChange} className="w-2/3 px-2 py-1 border border-medium-gray rounded-md">
                        <option value="none">No Discount</option>
                        <option value="percentage">Discount (%)</option>
                        <option value="amount">Discount (Amt)</option>
                    </select>
                    <input type="number" name="discountValue" value={localInvoice.discountValue} onChange={handleChange} disabled={localInvoice.discountType === 'none'} className="w-1/3 px-2 py-1 border border-medium-gray rounded-md disabled:bg-gray-200" />
                </div>
                
                 {localInvoice.discountType !== 'none' && <div className="flex justify-between text-danger"><span>Discount</span> <span className="font-medium">-{new Intl.NumberFormat().format(totals.discountAmount)}</span></div>}

                {settings.showTax && <div className="flex justify-between border-t pt-2 mt-2"><span>Tax ({settings.taxPercentage}%)</span> <span className="font-medium">{new Intl.NumberFormat().format(totals.taxAmount)}</span></div>}
                <div className="flex justify-between font-bold text-xl text-primary border-t-2 pt-2 mt-2"><span>Amount Due</span> <span>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN'}).format(totals.grandTotal)}</span></div>
              </div>
              
              {settings.showQRCode && settings.paymentUrl && (
                <div className="pt-4 border-t border-medium-gray text-center">
                    <h4 className="font-bold text-md text-secondary mb-2">Scan to Pay</h4>
                    <div className="flex justify-center">
                        <QRCode text={settings.paymentUrl} size={120} />
                    </div>
                </div>
              )}

              {localInvoice.status !== 'Paid' && (
                <button onClick={handleMarkAsPaid} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-success text-white font-bold rounded-lg hover:bg-emerald-600 transition-all">
                    <DollarSignIcon className="w-5 h-5"/> Mark as Paid
                </button>
              )}
          </div>

        </div>
        <div className="p-6 bg-light-gray border-t border-medium-gray flex justify-end gap-4 mt-auto">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white text-secondary font-semibold rounded-lg border border-medium-gray hover:bg-gray-100">Cancel</button>
          <button type="button" onClick={handleSave} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600">Save Invoice</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;