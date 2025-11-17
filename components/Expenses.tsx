import React, { useState, useMemo } from 'react';
import { Expense, QuotationData } from '../types';
import { EditIcon, DeleteIcon, PlusIcon, ExpenseIcon } from './icons';

interface ExpensesProps {
  expenses: Expense[];
  quotations: QuotationData[];
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
};

const Expenses: React.FC<ExpensesProps> = ({ expenses, quotations, onAdd, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    quotations.forEach(q => {
        map.set(q.id, `${q.clientDetails.clientName} - ${q.clientDetails.projectName || 'Project'}`);
    });
    return map;
  }, [quotations]);

  const sortedAndFilteredExpenses = useMemo(() => {
    let filtered = expenses.filter(expense =>
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.quotationId && projectMap.get(expense.quotationId)?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [expenses, searchTerm, sortConfig, projectMap]);

  const requestSort = (key: keyof Expense) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-medium-gray shadow-md space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Expense Tracker</h1>
          <p className="text-gray-500">Log and manage all your business-related costs.</p>
        </div>
        <button
          onClick={onAdd}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-sky-600 shadow-md transform hover:scale-105"
        >
          <PlusIcon className="w-5 h-5"/>
          Add New Expense
        </button>
      </div>

      <input
        type="text"
        placeholder="Search expenses by description, category, or project..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 bg-light-gray/50 border border-medium-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/80"
      />

      <div className="overflow-x-auto border border-medium-gray rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary text-white text-xs uppercase">
            <tr>
              <th className="p-4 font-semibold cursor-pointer" onClick={() => requestSort('date')}>Date</th>
              <th className="p-4 font-semibold">Description</th>
              <th className="p-4 font-semibold cursor-pointer" onClick={() => requestSort('category')}>Category</th>
              <th className="p-4 font-semibold">Linked Project</th>
              <th className="p-4 font-semibold text-right cursor-pointer" onClick={() => requestSort('amount')}>Amount</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-medium-gray">
            {sortedAndFilteredExpenses.map(expense => (
              <tr key={expense.id} className="bg-white hover:bg-light-gray">
                <td className="p-4">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="p-4 font-semibold text-secondary">{expense.description}</td>
                <td className="p-4">
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">{expense.category}</span>
                </td>
                <td className="p-4 text-gray-600 text-xs">{expense.quotationId ? projectMap.get(expense.quotationId) : 'N/A'}</td>
                <td className="p-4 text-right font-bold">{formatCurrency(expense.amount)}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(expense)} className="p-2 text-gray-500 hover:text-primary hover:bg-sky-100 rounded-full" title="Edit"><EditIcon className="w-5 h-5"/></button>
                    <button onClick={() => onDelete(expense.id)} className="p-2 text-gray-500 hover:text-danger hover:bg-red-100 rounded-full" title="Delete"><DeleteIcon className="w-5 h-5"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedAndFilteredExpenses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ExpenseIcon className="w-16 h-16 mx-auto text-gray-300" />
          <h3 className="mt-2 text-lg font-semibold text-secondary">No Expenses Logged</h3>
          <p>Click "Add New Expense" to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Expenses;