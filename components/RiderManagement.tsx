
import React, { useState } from 'react';
import { Bike, Fuel, Plus, User, X, Key, Map, Banknote, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';
import { Rider, Expense, UserRole } from '../types';

interface RiderManagementProps {
  riders: Rider[];
  setRiders: React.Dispatch<React.SetStateAction<Rider[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  role: UserRole;
}

const RiderManagement: React.FC<RiderManagementProps> = ({ riders, setRiders, expenses, setExpenses, role }) => {
  const [activeView, setActiveView] = useState<'profiles' | 'expenses'>(role === UserRole.OWNER ? 'profiles' : 'expenses');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  
  const [expenseForm, setExpenseForm] = useState({
    riderId: riders[0]?.id || '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Petrol' as any,
    note: ''
  });

  const [riderForm, setRiderForm] = useState({
    name: '',
    route: '',
    salary: '',
    pin: ''
  });

  const isOwner = role === UserRole.OWNER;

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.riderId || !expenseForm.amount) return;
    
    // Fixed: Added missing 'version' property for BaseEntity
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      riderId: expenseForm.riderId,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      type: expenseForm.type,
      note: expenseForm.note,
      updatedAt: new Date().toISOString(),
      version: 1
    };
    setExpenses([newExpense, ...expenses]);
    setIsExpenseModalOpen(false);
  };

  const handleRiderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fixed: Added missing 'version' property for BaseEntity
    const newRider: Rider = {
      id: Math.random().toString(36).substr(2, 9),
      name: riderForm.name,
      route: riderForm.route,
      salary: parseFloat(riderForm.salary) || 0,
      pin: riderForm.pin.padStart(4, '0'),
      role: 'Delivery Boy',
      updatedAt: new Date().toISOString(),
      version: 1
    };
    setRiders([...riders, newRider]);
    setIsRiderModalOpen(false);
    setRiderForm({ name: '', route: '', salary: '', pin: '' });
  };

  const getRiderName = (id: string) => riders.find(r => r.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-8">
      <div className="flex bg-slate-100 p-2 rounded-3xl w-fit border-2 border-slate-200">
        <button 
          onClick={() => setActiveView('profiles')}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeView === 'profiles' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <User size={18} /> {isOwner ? 'Staff Accounts' : 'My Account Profile'}
        </button>
        {isOwner && (
          <button 
            onClick={() => setActiveView('expenses')}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeView === 'expenses' ? 'bg-white shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Fuel size={18} /> Staff Expenses
          </button>
        )}
      </div>

      {activeView === 'profiles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {riders.map(rider => (
            <div key={rider.id} className="bg-white p-10 rounded-[3.5rem] border-4 border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-600 transition-all hover:shadow-2xl">
              <div className="bg-slate-900 text-white w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-slate-300 group-hover:bg-blue-600 transition-colors group-hover:rotate-6">
                <Bike size={40} />
              </div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">{rider.name}</h3>
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">Area: {rider.route}</p>
              
              <div className="space-y-6 pt-8 mt-8 border-t-2 border-slate-50">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={14}/> Login PIN</span>
                  <span className="font-black text-slate-900 text-xl tracking-[0.3em]">{rider.pin}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Banknote size={14}/> Monthly Salary</span>
                  <span className="font-black text-blue-900 text-lg">Rs. {(rider.salary ?? 0).toLocaleString()}</span>
                </div>
                {isOwner && (
                  <div className="flex justify-between items-center bg-red-50 p-4 rounded-2xl border border-red-100">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><Fuel size={14}/> Petrol (MTD)</span>
                    <span className="font-black text-red-600 text-lg">
                      Rs. {(expenses.filter(e => e.riderId === rider.id).reduce((a, b) => a + (b.amount ?? 0), 0)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isOwner && (
            <button 
              onClick={() => { resetRiderForm(); setIsRiderModalOpen(true); }}
              className="border-8 border-dashed border-slate-200 rounded-[3.5rem] p-12 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all group active:scale-95"
            >
              <div className="bg-slate-50 p-6 rounded-full group-hover:bg-blue-50 transition-colors">
                <Plus size={64} className="group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <span className="font-black text-xl uppercase tracking-widest mt-8">Add New Staff Member</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm">
            <div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Expense Tracking</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Petrol, Vouchers & Repairs</p>
            </div>
            <button 
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-lg uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-200 flex items-center gap-4 active:scale-95"
            >
              <Plus size={24} /> Record Expense
            </button>
          </div>
          
          <div className="bg-white rounded-[3.5rem] shadow-sm border-2 border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 border-b border-white/10 text-white">
                  <tr className="text-[10px] font-black uppercase tracking-[0.3em]">
                    <th className="px-10 py-8">Date</th>
                    <th className="px-10 py-8">Rider Name</th>
                    <th className="px-10 py-8">Category</th>
                    <th className="px-10 py-8">Amount</th>
                    <th className="px-10 py-8">Voucher Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-10 py-6 font-bold text-slate-500">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-10 py-6 font-black text-slate-900 text-lg">{getRiderName(exp.riderId || '')}</td>
                      <td className="px-10 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${exp.type === 'Petrol' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {exp.type}
                        </span>
                      </td>
                      <td className="px-10 py-6 font-black text-red-600 text-xl">Rs. {(exp.amount ?? 0).toLocaleString()}</td>
                      <td className="px-10 py-6 text-slate-400 font-bold italic truncate max-w-xs">{exp.note || 'No description'}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xl">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Rider Modal */}
      {isRiderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden border-8 border-slate-900 animate-in zoom-in-95">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-3xl italic tracking-tighter">New Staff Account</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Create Mobile Credentials</p>
              </div>
              <button onClick={() => setIsRiderModalOpen(false)} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleRiderSubmit} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Staff Full Name</label>
                <div className="relative">
                  <input required className="w-full pl-16 pr-6 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xl outline-none focus:border-blue-600 transition-all" value={riderForm.name} onChange={e => setRiderForm({...riderForm, name: e.target.value})} placeholder="e.g. Zeeshan Ali" />
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Assigned Service Area (Route)</label>
                <div className="relative">
                  <input required className="w-full pl-16 pr-6 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xl outline-none focus:border-blue-600 transition-all" value={riderForm.route} onChange={e => setRiderForm({...riderForm, route: e.target.value})} placeholder="e.g. Model Town" />
                  <Map className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Monthly Salary (Rs)</label>
                  <div className="relative">
                    <input type="number" required className="w-full pl-16 pr-6 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xl outline-none focus:border-blue-600 transition-all" value={riderForm.salary} onChange={e => setRiderForm({...riderForm, salary: e.target.value})} />
                    <Banknote className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Private Login PIN</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      maxLength={4} 
                      required 
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-3xl outline-none focus:border-blue-600 tracking-[0.5em] text-center" 
                      value={riderForm.pin} 
                      onChange={e => setRiderForm({...riderForm, pin: e.target.value.replace(/\D/g, '')})} 
                      placeholder="****"
                    />
                    <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-2xl hover:bg-blue-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 group">
                Register Staff <ArrowRight size={32} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden border-8 border-blue-600/10 animate-in zoom-in-95">
            <div className="p-10 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-3xl italic tracking-tighter">Record Expense</h3>
                <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Deduct from daily cash</p>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Select Rider</label>
                <select 
                  className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xl outline-none focus:border-blue-600 transition-all" 
                  value={expenseForm.riderId}
                  onChange={e => setExpenseForm({...expenseForm, riderId: e.target.value})}
                >
                  {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Amount (Rs)</label>
                  <input type="number" required className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-2xl outline-none focus:border-blue-600 transition-all" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
                  <select className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-xl outline-none" value={expenseForm.type} onChange={e => setExpenseForm({...expenseForm, type: e.target.value as any})}>
                    <option value="Petrol">Petrol</option>
                    <option value="Salary">Advance Salary</option>
                    <option value="Other">Repairs/Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Detailed Note</label>
                <textarea className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-lg outline-none" rows={2} value={expenseForm.note} onChange={e => setExpenseForm({...expenseForm, note: e.target.value})} placeholder="e.g. Generator petrol 5 liters" />
              </div>

              <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-2xl hover:bg-slate-900 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4 group">
                Save Voucher <ArrowRight size={32} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const resetRiderForm = () => {
    // Helper to reset internal rider form if needed
};

export default RiderManagement;
