
import React, { useState } from 'react';
import { Wallet, Search, Calendar, Landmark, CreditCard, Coins, Plus, X, Lock, UserX, UserCheck } from 'lucide-react';
import { Customer, Payment, PaymentMode, MonthLock } from '../types';
import { generateId } from '../services/dataStore';

interface PaymentEntryProps {
  customers: Customer[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  lockedMonths: MonthLock[];
}

const PaymentEntry: React.FC<PaymentEntryProps> = ({ customers, payments, setPayments, lockedMonths }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    mode: PaymentMode.CASH,
    note: ''
  });

  // Split customers for the dropdown
  const activeCustomers = customers.filter(c => c.active);
  const withdrawnCustomers = customers.filter(c => !c.active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.amount) return;

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      alert("Please enter a valid positive payment amount.");
      return;
    }

    const payDate = new Date(formData.date);
    const isLocked = lockedMonths.some(m => m.month === payDate.getMonth() && m.year === payDate.getFullYear());
    
    if (isLocked) {
      alert("This month is CLOSED and LOCKED. You cannot record payments for this date.");
      return;
    }

    // Fixed: Added missing 'version' property for BaseEntity
    const newPayment: Payment = {
      id: generateId(),
      customerId: formData.customerId,
      amount: Math.max(0, amount),
      date: formData.date,
      mode: formData.mode,
      note: formData.note,
      updatedAt: new Date().toISOString(),
      version: 1
    };

    setPayments([newPayment, ...payments]);
    setIsModalOpen(false);
    setFormData({ customerId: '', amount: '', date: new Date().toISOString().split('T')[0], mode: PaymentMode.CASH, note: '' });
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search payments by customer..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Receive Payment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase">Date</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase">Customer</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase">Mode</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.filter(p => getCustomerName(p.customerId).toLowerCase().includes(searchTerm.toLowerCase())).map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-600">
                    {new Date(payment.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {getCustomerName(payment.customerId)}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-green-600">
                    Rs. {payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-slate-600">
                      {payment.mode === PaymentMode.BANK ? <Landmark size={14} /> : 
                       payment.mode === PaymentMode.WALLET ? <CreditCard size={14} /> : 
                       <Coins size={14} />}
                      {payment.mode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {payment.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-green-600 text-white">
              <h3 className="font-bold text-lg">Receive Payment</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Select Customer</label>
                <select 
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                >
                  <option value="">-- Choose Customer --</option>
                  <optgroup label="Active Delivery">
                    {activeCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                  <optgroup label="Withdrawn / Stopped (Recovery Only)">
                    {withdrawnCustomers.map(c => <option key={c.id} value={c.id}>{c.name} (Stopped)</option>)}
                  </optgroup>
                </select>
                <p className="text-[10px] text-slate-500">You can receive payments even from stopped customers to clear dues.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Amount (Rs.)</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-xl font-bold"
                    placeholder="0"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: Math.max(0, parseFloat(e.target.value) || 0).toString()})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Payment Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(PaymentMode).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({...formData, mode})}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                        formData.mode === mode 
                          ? 'bg-green-100 border-green-500 text-green-700 shadow-inner' 
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Remarks / Note</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="e.g. Final Settlement"
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50">Cancel</button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentEntry;
