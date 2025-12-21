
import React, { useMemo, useState } from 'react';
import { QuotationData, InvoiceData, Expense, Settings } from '../types';
import MetricCard from './MetricCard';
import { DollarSignIcon, FileTextIcon, ExpenseIcon, CheckCircleIcon, ExportIcon } from './icons';
import { exportAnalyticsToCsv } from '../services/exportService';
import { calculateTotals } from '../services/calculationService';

// --- Reusable Chart Components ---

const SimplePieChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    // FIX: Explicitly type the accumulator in reduce to ensure numeric arithmetic
    const total = data.reduce((acc: number, item) => acc + item.value, 0);
    if (total === 0) return <div className="text-center text-gray-400 h-full flex items-center justify-center text-sm italic">No expense data available</div>;
    
    let cumulative = 0;
    const gradients = data.map(item => {
        const percentage = (item.value / total) * 100;
        const segment = `${item.color} ${cumulative}% ${cumulative + percentage}%`;
        cumulative += percentage;
        return segment;
    });

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-4 h-full">
            <div className="relative w-48 h-48 rounded-full flex-shrink-0 border-8 border-white/50 dark:border-slate-800 shadow-xl ring-1 ring-black/5" style={{ background: `conic-gradient(${gradients.join(', ')})` }}>
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 rounded-full m-6 backdrop-blur-sm shadow-inner">
                    <div className="text-center">
                        <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total</span>
                        <span className="block font-black text-lg text-brand-dark dark:text-white tracking-tight">{formatCurrency(total)}</span>
                    </div>
                </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-3 px-4">
                {data.slice(0, 4).map(item => (
                    <div key={item.label} className="flex items-center gap-2 bg-white/50 dark:bg-white/5 p-2.5 rounded-xl border border-white/60 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                         <span className="w-3 h-3 rounded-full shadow-sm ring-1 ring-black/5" style={{ backgroundColor: item.color }}></span>
                         <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider truncate">{item.label}</span>
                            <span className="font-bold text-xs text-brand-dark dark:text-white truncate">{formatCurrency(item.value)}</span>
                         </div>
                    </div>
                ))}
                {data.length > 4 && (
                    <div className="col-span-2 text-center text-[10px] text-gray-400 font-bold uppercase mt-1">
                        + {data.length - 4} more categories
                    </div>
                )}
            </div>
        </div>
    );
};

const GroupedBarChart: React.FC<{ data: { label: string; values: { value: number; color: string; label: string }[] }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.flatMap(d => d.values.map(v => v.value)), 1000);
    if (data.length === 0) return <div className="text-center text-gray-400 h-full flex items-center justify-center text-sm italic">No historical data available</div>;

    return (
        <div className="w-full h-80 flex items-end gap-3 sm:gap-6 pt-12 pb-4 px-2">
            {data.map(item => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-3 h-full px-1 sm:px-3 bg-white/30 dark:bg-white/5 rounded-2xl pb-0 pt-4 border border-white/20 dark:border-white/5 backdrop-blur-sm transition-all hover:bg-white/50 dark:hover:bg-white/10">
                        {item.values.map(val => (
                            <div key={val.label} className="w-full rounded-t-lg relative transition-all duration-500 hover:opacity-90 shadow-md group/bar"
                                 style={{ height: `${Math.max((val.value / maxValue) * 100, 2)}%`, backgroundColor: val.color }}>
                                 {/* Tooltip */}
                                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-brand-dark text-white text-[10px] px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover/bar:opacity-100 transition-all whitespace-nowrap z-20 pointer-events-none border border-white/10 backdrop-blur-md transform translate-y-2 group-hover/bar:translate-y-0">
                                     <span className="font-bold">{val.label}</span>: {formatCurrency(val.value)}
                                     <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-brand-dark rotate-45"></div>
                                 </div>
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                </div>
            ))}
        </div>
    );
};


// --- Helper Functions ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
};


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
          // FIX: Ensure numeric subtraction by explicitly parsing and wrapping in Number()
          const daysToSubtract = parseInt(dateRange, 10);
          rangeStart.setDate(now.getDate() - (isNaN(daysToSubtract) ? 0 : daysToSubtract));
        }

        const startTimestamp = rangeStart.getTime();
        // FIX: Compare timestamps for reliable date filtering in TS
        const fq = quotations.filter(q => new Date(q.date).getTime() >= startTimestamp);
        const fi = invoices.filter(i => new Date(i.invoiceDate).getTime() >= startTimestamp);
        const fe = expenses.filter(e => new Date(e.date).getTime() >= startTimestamp);
        return { filteredQuotations: fq, filteredInvoices: fi, filteredExpenses: fe };
    }, [quotations, invoices, expenses, dateRange]);

    const metrics = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        // 1. Quotations Count
        const totalQuotations = filteredQuotations.length;
        const acceptedCount = filteredQuotations.filter(q => q.status === 'Accepted' || q.status === 'Invoiced').length;
        const acceptanceRate = totalQuotations > 0 ? (acceptedCount / totalQuotations) * 100 : 0;
        
        // 2. Revenue & Paid This Month
        // Only Paid invoices count towards revenue for "Paid This Month" and "Net Profit"
        const paidInvoices = filteredInvoices.filter(i => i.status === 'Paid');
        
        // FIX: Explicitly type accumulator in reduce and ensure we handle number operations safely
        const totalRevenue: number = paidInvoices.reduce((sum: number, i) => {
            const totals = calculateTotals(i, settings);
            return sum + (Number(totals.grandTotal) || 0);
        }, 0);
        
        const paidThisMonth: number = paidInvoices
            .filter(i => (Number(i.paymentDate) || Number(i.invoiceDate)) >= startOfMonth)
            .reduce((sum: number, i) => {
                const totals = calculateTotals(i, settings);
                return sum + (Number(totals.grandTotal) || 0);
            }, 0);
        
        // 3. Total Expenses
        // FIX: Explicitly type accumulator in reduce and ensure amount is treated as a number
        const totalExpenses: number = filteredExpenses.reduce((sum: number, e) => sum + (Number(e.amount) || 0), 0);
        
        // 4. Net Profit
        // FIX: Ensure left and right hand sides are numeric for the arithmetic operation.
        // Removed redundant Number() calls on variables already typed as number to satisfy TS rules
        const netProfit: number = (totalRevenue || 0) - (totalExpenses || 0);
        
        // 5. Expense Breakdown (Pie Chart)
        // FIX: Provide explicit Record type and casting for initial value to prevent indexing errors.
        const expenseBreakdownMap = filteredExpenses.reduce<Record<string, number>>((acc, e) => {
            const cat = e.category || 'Other';
            acc[cat] = (Number(acc[cat]) || 0) + (Number(e.amount) || 0);
            return acc;
        }, {} as Record<string, number>);

        const expenseColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#14B8A6'];
        const expenseChartData = Object.entries(expenseBreakdownMap)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value], index) => ({
                label, value, color: expenseColors[index % expenseColors.length]
            }));

        // 6. Monthly Performance (Bar Chart - last 6 months)
        const monthlyData: { [key: string]: { revenue: number, expenses: number } } = {};
        const monthsToShow = 6;
        
        // Initialize last 6 months
        for (let i = monthsToShow - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = { revenue: 0, expenses: 0 };
        }

        // Fill revenue from paid invoices
        paidInvoices.forEach(i => {
            const date = new Date(Number(i.paymentDate) || Number(i.invoiceDate));
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[key]) {
                const totals = calculateTotals(i, settings);
                monthlyData[key].revenue += (Number(totals.grandTotal) || 0);
            }
        });

        // Fill expenses
        filteredExpenses.forEach(e => {
            const date = new Date(Number(e.date));
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyData[key]) {
                monthlyData[key].expenses += (Number(e.amount) || 0);
            }
        });
        
        const monthlyPerformance = Object.keys(monthlyData).sort().map(key => ({
            label: new Date(key + '-02').toLocaleString('default', { month: 'short' }),
            values: [
                { label: 'Revenue', value: monthlyData[key].revenue, color: '#EAB308' }, // Gold
                { label: 'Expenses', value: monthlyData[key].expenses, color: '#94A3B8' }, // Slate 400
            ]
        }));

        return { 
            totalQuotations, 
            totalRevenue,
            paidThisMonth, 
            totalExpenses, 
            netProfit, 
            acceptanceRate,
            expenseChartData, 
            monthlyPerformance,
            // FIX: Explicitly type accumulator in reduce and ensure numeric grandTotal
            totalQuoted: filteredQuotations.reduce((sum: number, q) => {
                const totals = calculateTotals(q, settings);
                return sum + (Number(totals.grandTotal) || 0);
            }, 0),
            invoicesGenerated: filteredInvoices.length
        };
    }, [filteredQuotations, filteredInvoices, filteredExpenses, settings]);
    

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 p-1">
                <div>
                    <h1 className="text-4xl font-extrabold text-brand-dark dark:text-white tracking-tight">Dashboard</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Here is what's happening with your business.</p>
                </div>
                <div className="flex items-center gap-3">
                     <div className="relative">
                        <select 
                            value={dateRange} 
                            onChange={e => setDateRange(e.target.value)}
                            className="appearance-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-none rounded-2xl px-6 py-3 pl-4 pr-10 text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gold/50 shadow-lg hover:shadow-xl transition-all cursor-pointer ring-1 ring-black/5"
                        >
                            <option value="all">All Time</option>
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="this_month">This Month</option>
                            <option value="90">Last 90 Days</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                     </div>
                    <button 
                      onClick={() => exportAnalyticsToCsv(metrics)}
                      className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white font-bold rounded-2xl shadow-lg hover:bg-black transition-all transform hover:scale-105 active:scale-100 text-sm"
                    >
                      <ExportIcon className="w-4 h-4"/>
                      Export
                    </button>
                </div>
            </div>
            
            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MetricCard title="Net Profit (Cash)" value={formatCurrency(metrics.netProfit)} icon={<DollarSignIcon className="w-6 h-6 text-emerald-500"/>} gradient="from-emerald-500/10 to-emerald-500/5"/>
                <MetricCard title="Paid This Month" value={formatCurrency(metrics.paidThisMonth)} icon={<CheckCircleIcon className="w-6 h-6 text-blue-500"/>} gradient="from-blue-500/10 to-blue-500/5"/>
                <MetricCard title="Total Expenses" value={formatCurrency(metrics.totalExpenses)} icon={<ExpenseIcon className="w-6 h-6 text-rose-500"/>} gradient="from-rose-500/10 to-rose-500/5"/>
                <MetricCard title="Quotations Sent" value={String(metrics.totalQuotations)} icon={<FileTextIcon className="w-6 h-6 text-amber-500"/>} gradient="from-amber-500/10 to-amber-500/5"/>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Historical Chart */}
                <div className="lg:col-span-2 bg-white/60 dark:bg-surface-dark/50 backdrop-blur-md p-8 rounded-[2rem] border border-white/40 dark:border-white/5 shadow-xl transition-all hover:shadow-2xl hover:bg-white/70 dark:hover:bg-surface-dark/60">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                             <h3 className="text-xl font-bold text-brand-dark dark:text-white">Financial Performance</h3>
                             <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">Revenue vs Expenses (Monthly)</p>
                        </div>
                        <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-2 bg-white dark:bg-white/10 px-3 py-1.5 rounded-full shadow-sm text-yellow-700 dark:text-yellow-400 border border-gray-100 dark:border-gray-700"><span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span> Revenue</span>
                            <span className="flex items-center gap-2 bg-white dark:bg-white/10 px-3 py-1.5 rounded-full shadow-sm text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-gray-700"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Expenses</span>
                        </div>
                    </div>
                    <GroupedBarChart data={metrics.monthlyPerformance} />
                </div>

                {/* Expense Pie Chart */}
                <div className="lg:col-span-1 bg-white/60 dark:bg-surface-dark/50 backdrop-blur-md p-8 rounded-[2rem] border border-white/40 dark:border-white/5 shadow-xl flex flex-col transition-all hover:shadow-2xl hover:bg-white/70 dark:hover:bg-surface-dark/60">
                     <div className="mb-4">
                        <h3 className="text-xl font-bold text-brand-dark dark:text-white">Expense Breakdown</h3>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">Category Distribution</p>
                     </div>
                     <div className="flex-grow flex items-center justify-center">
                        <SimplePieChart data={metrics.expenseChartData} />
                     </div>
                </div>
            </div>

            {/* Additional Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                <div className="bg-white/40 dark:bg-white/5 p-6 rounded-3xl border border-white/20 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Value Quoted</p>
                        <h4 className="text-2xl font-bold text-brand-dark dark:text-white mt-1">{formatCurrency(metrics.totalQuoted)}</h4>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Acceptance Rate</p>
                        <h4 className="text-2xl font-bold text-gold-dark mt-1">{metrics.acceptanceRate.toFixed(1)}%</h4>
                    </div>
                </div>
                <div className="bg-white/40 dark:bg-white/5 p-6 rounded-3xl border border-white/20 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Invoices Issued</p>
                        <h4 className="text-2xl font-bold text-brand-dark dark:text-white mt-1">{metrics.invoicesGenerated}</h4>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg. Project Value</p>
                        <h4 className="text-2xl font-bold text-indigo-500 mt-1">
                            {metrics.totalQuotations > 0 ? formatCurrency(metrics.totalQuoted / metrics.totalQuotations) : 'N/A'}
                        </h4>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default Dashboard;
