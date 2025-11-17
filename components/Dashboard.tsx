

import React, { useMemo, useState } from 'react';
import { QuotationData, InvoiceData, Expense, Settings } from '../types';
import MetricCard from './MetricCard';
import { DollarSignIcon, FileTextIcon, ExpenseIcon, CheckCircleIcon, ExportIcon, InvoiceIcon, BulkGenerateIcon } from './icons';
import { exportAnalyticsToCsv } from '../services/exportService';

// --- Reusable Chart Components ---

const SimplePieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    if (total === 0) return <div className="text-center text-gray-500 h-full flex items-center justify-center">No data for chart</div>;
    let cumulative = 0;
    const gradients = data.map(item => {
        const percentage = (item.value / total) * 100;
        const segment = `${item.color} ${cumulative}% ${cumulative + percentage}%`;
        cumulative += percentage;
        return segment;
    });
    return (
        <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-32 h-32 rounded-full flex-shrink-0" style={{ background: `conic-gradient(${gradients.join(', ')})` }}></div>
            <ul className="space-y-2">
                {data.map(item => (
                    <li key={item.label} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></span>
                        <span className="font-medium text-dark-gray">{item.label}</span>
                        <span className="text-gray-500">({((item.value / total) * 100).toFixed(0)}%)</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(item => item.value), 0);
    if (maxValue === 0) return <div className="text-center text-gray-500 h-full flex items-center justify-center">No data for chart</div>;
    return (
        <div className="w-full h-64 flex items-end gap-4 px-4 border-l border-b border-medium-gray">
            {data.map(item => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group" title={`${item.label}: ${formatCurrency(item.value)}`}>
                    <div className="w-full bg-sky-200 group-hover:bg-primary transition-colors rounded-t-md" style={{ height: `${(item.value / maxValue) * 100}%` }}></div>
                    <span className="text-xs text-gray-600 font-medium truncate">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

// --- Helper Functions ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
};

// Safely calculate document totals by explicitly casting all potentially non-numeric values to numbers.
const getDocumentTotal = (doc: QuotationData | InvoiceData, settings: Settings): number => {
    const { showMaintenance, taxPercentage, showTax } = settings;
    const totalSqm = (doc.tiles || []).reduce((acc, tile) => acc + (Number(tile.sqm) || 0), 0);
    const totalTileCost = (doc.tiles || []).reduce((acc, tile) => acc + ((Number(tile.cartons) || 0) * (Number(tile.unitPrice) || 0)), 0);
    const totalMaterialCost = (doc.materials || []).reduce((acc, mat) => acc + ((Number(mat.quantity) || 0) * (Number(mat.unitPrice) || 0)), 0);
    const workmanshipCost = totalSqm * (Number(doc.workmanshipRate) || 0);
    const workmanshipAndMaintenance = workmanshipCost + (showMaintenance ? (Number(doc.maintenance) || 0) : 0);
    const preProfitTotal = totalTileCost + totalMaterialCost + workmanshipAndMaintenance;
    const profitAmount = doc.profitPercentage ? preProfitTotal * ((Number(doc.profitPercentage) || 0) / 100) : 0;
    const subtotal = preProfitTotal + profitAmount;
    
    let discountAmount = 0;
    if ('discountType' in doc && doc.discountType !== 'none') {
        if (doc.discountType === 'percentage') {
            discountAmount = subtotal * ((Number(doc.discountValue) || 0) / 100);
        } else {
            discountAmount = (Number(doc.discountValue) || 0);
        }
    }
    
    const postDiscountSubtotal = subtotal - discountAmount;
    const taxAmount = showTax ? postDiscountSubtotal * ((Number(taxPercentage) || 0) / 100) : 0;
    return postDiscountSubtotal + taxAmount;
}


// --- Main Dashboard Component ---

interface DashboardProps {
    quotations: QuotationData[];
    invoices: InvoiceData[];
    expenses: Expense[];
    settings: Settings;
}

const Dashboard: React.FC<DashboardProps> = ({ quotations, invoices, expenses, settings }) => {
    const [dateRange, setDateRange] = useState('all');

    const { filteredQuotations, filteredInvoices, filteredExpenses } = useMemo(() => {
        if (dateRange === 'all') return { filteredQuotations: quotations, filteredInvoices: invoices, filteredExpenses: expenses };
        const now = new Date();
        const rangeStart = new Date();
        if (dateRange === 'this_month') {
          rangeStart.setDate(1);
          rangeStart.setHours(0, 0, 0, 0);
        } else {
          rangeStart.setDate(now.getDate() - parseInt(dateRange, 10));
        }

        const fq = quotations.filter(q => new Date(q.date) >= rangeStart);
        const fi = invoices.filter(i => new Date(i.invoiceDate) >= rangeStart);
        const fe = expenses.filter(e => new Date(e.date) >= rangeStart);
        return { filteredQuotations: fq, filteredInvoices: fi, filteredExpenses: fe };
    }, [quotations, invoices, expenses, dateRange]);

    const metrics = useMemo(() => {
        const totalQuotations = filteredQuotations.length;
        if (totalQuotations === 0 && filteredInvoices.length === 0 && filteredExpenses.length === 0) return { 
            totalQuoted: 0, totalQuotations: 0, acceptanceRate: 0,
            invoicesGenerated: 0, paidThisMonth: 0,
            totalExpenses: 0, netProfit: 0,
            expenseBreakdown: {}
        };

        const totalQuoted = filteredQuotations.reduce((sum, q) => sum + getDocumentTotal(q, settings), 0);
        const acceptedCount = filteredQuotations.filter(q => q.status === 'Accepted' || q.status === 'Invoiced').length;
        const acceptanceRate = totalQuotations > 0 ? (acceptedCount / totalQuotations) * 100 : 0;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Invoice Metrics
        const invoicesGenerated = filteredInvoices.length;
        const paidInvoices = filteredInvoices.filter(i => i.status === 'Paid');
        const totalRevenue = paidInvoices.reduce((sum, i) => sum + getDocumentTotal(i, settings), 0);
        const paidThisMonth = paidInvoices
            .filter(i => i.paymentDate && new Date(i.paymentDate) >= startOfMonth)
            .reduce((sum, i) => sum + getDocumentTotal(i, settings), 0);
        
        // Expense Metrics
        // Fix: Safely handle expense amounts which might be stored as strings or be undefined in old data from localStorage.
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        
        // FIX: Explicitly cast operands to Number to resolve potential type inference issues, especially with data from localStorage.
        const netProfit = (Number(totalRevenue) || 0) - (Number(totalExpenses) || 0);
        const expenseBreakdown = filteredExpenses.reduce((acc: Record<string, number>, e) => {
            acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0);
            return acc;
        }, {});

        return { totalQuoted, totalQuotations, acceptanceRate, invoicesGenerated, paidThisMonth, totalExpenses, netProfit, expenseBreakdown };
    }, [filteredQuotations, filteredInvoices, filteredExpenses, settings]);
    
    const expenseColors = ['#38bdf8', '#818cf8', '#f472b6', '#fb923c', '#a3e635', '#4ade80', '#2dd4bf'];
    const expenseChartData = Object.entries(metrics.expenseBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value], index) => ({
            label, value, color: expenseColors[index % expenseColors.length]
        }));


    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">Analytics Dashboard</h1>
                    <p className="text-gray-500">An overview of your business performance.</p>
                </div>
                <div className="flex items-center gap-4">
                     <select 
                        value={dateRange} 
                        onChange={e => setDateRange(e.target.value)}
                        className="bg-white border border-medium-gray rounded-lg shadow-sm px-3 py-2 text-sm font-medium text-dark-gray hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Time</option>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="this_month">This Month</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                    <button 
                      onClick={() => exportAnalyticsToCsv(metrics)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white font-semibold rounded-lg hover:bg-emerald-600 transition-all shadow-md transform hover:scale-105"
                    >
                      <ExportIcon className="w-5 h-5"/>
                      Export Summary
                    </button>
                </div>
            </div>

            <h2 className="text-xl font-semibold text-secondary border-b border-medium-gray pb-2">Financial Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                <MetricCard title="Net Profit" value={formatCurrency(metrics.netProfit)} icon={<DollarSignIcon className="w-6 h-6"/>} gradient="bg-gradient-to-tr from-green-500 to-emerald-600"/>
                <MetricCard title="Paid This Month" value={formatCurrency(metrics.paidThisMonth)} icon={<CheckCircleIcon className="w-6 h-6"/>} gradient="bg-gradient-to-tr from-sky-500 to-blue-600"/>
                <MetricCard title="Total Expenses" value={formatCurrency(metrics.totalExpenses)} icon={<ExpenseIcon className="w-6 h-6"/>} gradient="bg-gradient-to-tr from-red-500 to-rose-600"/>
                <MetricCard title="Quotations Sent" value={String(metrics.totalQuotations)} icon={<FileTextIcon className="w-6 h-6"/>} gradient="bg-gradient-to-tr from-indigo-500 to-purple-600"/>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-white p-8 rounded-xl border border-medium-gray shadow-md">
                     <h3 className="text-lg font-semibold text-secondary mb-4">Expense Breakdown by Category</h3>
                     <SimplePieChart data={expenseChartData} />
                </div>
            </div>
        </div>
    )
};

export default Dashboard;