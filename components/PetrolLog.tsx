
import React, { useState } from 'react';
import { Fuel, Plus, X, ArrowRight, Calendar, User } from 'lucide-react';
import { Expense, Rider, UserRole } from '../types';
import { generateId } from '../services/dataStore';

interface PetrolLogProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  riders: Rider[];
  role: UserRole;
  riderId?: string;
}

const PetrolLog: React.FC<PetrolLogProps> = ({ expenses, setExpenses, riders, role, riderId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    riderId: riderId || riders[0]?.id || '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const isOwner = role === UserRole.OWNER;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.riderId || !formData.amount) return;

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      alert("Please enter a valid positive amount for petrol.");
      return;
    }

    // Fixed: Added missing 'version' property for BaseEntity
    const newExpense: Expense = {
      id: generateId(),
      riderId: formData.riderId,
      amount: Math.max(0, amount),
      date: formData.date,
      type: 'Petrol',
      note: formData.note,
      updatedAt: new Date().toISOString(),
      version: 1
    };

    setExpenses([newExpense, ...expenses]);
    setIsModalOpen(false);
    setFormData({ ...formData, amount: '', note: '' });
  };

  const petrolExpenses = expenses.filter(e => e.type === 'Petrol');
  const visibleExpenses = isOwner ? petrolExpenses : petrolExpenses.filter(e => e.riderId === riderId);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm">
        <div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Petrol Log</h3>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 text-white px-10 py-5 rounded-3xl font-black text-lg uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-amber-200 flex items-center gap-4 active:scale-95"
        >
          <Fuel size={24} /> Log Petrol
        </button>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-sm border-2 border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr className="text-[10px] font-black uppercase tracking-[0.3em]">
              <th className="px-10 py-8">Date</th>
              <th className="px-10 py-8">Rider</th>
              <th className="px-10 py-8">Amount</th>
              <th className="px-10 py-8">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleExpenses.map(exp => (
              <tr key={exp.id} className="hover:bg-slate-50">
                <td className="px-10 py-6 font-bold text-slate-500">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                <td className="px-10 py-6 font-black text-slate-900">{riders.find(r => r.id === exp.riderId)?.name || 'Unknown'}</td>
                <td className="px-10 py-6 font-black text-amber-600 text-xl">Rs. {(exp.amount ?? 0).toLocaleString()}</td>
                <td className="px-10 py-6 text-slate-400 font-bold italic">{exp.note || 'Regular filling'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden border-8 border-amber-500/20 animate-in zoom-in-95">
            <div className="p-10 bg-amber-500 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-3xl italic tracking-tighter">Petrol Voucher</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Date</label>
                  <input type="date" required className="w-full px-6 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-lg outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Amount (Rs)</label>
                  <input 
                    type="number" 
                    min="1"
                    required 
                    className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-3xl text-center outline-none focus:border-amber-500" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: Math.max(0, parseFloat(e.target.value) || 0).toString()})} 
                    placeholder="0" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Select Staff</label>
                <select 
                  disabled={!isOwner}
                  className="w-full px-6 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xl outline-none disabled:opacity-50" 
                  value={formData.riderId}
                  onChange={e => setFormData({...formData, riderId: e.target.value})}
                >
                  {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Voucher Note</label>
                <textarea className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-lg outline-none" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="e.g. 5 Liters Petrol" />
              </div>

              <button type="submit" className="w-full py-6 bg-amber-500 text-white rounded-[2rem] font-black text-2xl hover:bg-slate-900 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 group">
                Save Fuel Entry <ArrowRight size={32} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetrolLog;
