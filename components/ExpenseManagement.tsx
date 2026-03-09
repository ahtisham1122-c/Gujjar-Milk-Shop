
import React, { useState, useMemo } from 'react';
import { Receipt, Plus, X, ArrowRight, Calendar, ShoppingBag, Filter, Fuel, Snowflake, Hammer, Zap, User, ShieldAlert, Printer, Settings2, Monitor, Smartphone } from 'lucide-react';
import { Expense, UserRole, Rider, ExpenseType, MonthlyArchive } from '../types';
import { formatPKR, generateId } from '../services/dataStore';

interface ExpenseManagementProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  riders: Rider[];
  role: UserRole;
  riderFilterId: string;
  archives: MonthlyArchive[];
}

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ expenses, setExpenses, riders, role, riderFilterId, archives }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printProfile, setPrintProfile] = useState<'A4' | '80' | '58'>('80');
  const [printFontSize, setPrintFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  const [formData, setFormData] = useState({ 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    type: 'Repair' as ExpenseType, 
    note: '', 
    riderId: '' 
  });

  const isOwner = role === UserRole.OWNER;
  const filteredExpenses = useMemo(() => 
    riderFilterId === 'all' ? expenses : expenses.filter(e => e.riderId === riderFilterId),
  [expenses, riderFilterId]);

  const isPeriodClosed = useMemo(() => {
    const dt = new Date(formData.date);
    return (archives || []).some(a => a.month === dt.getMonth() && a.year === dt.getFullYear());
  }, [formData.date, archives]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
        alert("INVALID AMOUNT: Expense must be greater than 0.");
        return;
    }
    if (isPeriodClosed) {
        alert("Cannot record expenses for an archived month.");
        return;
    }

    // Fixed: Added missing 'version' property for BaseEntity
    const newExpense: Expense = {
      id: generateId(),
      amount: parseFloat(formData.amount),
      date: formData.date,
      type: formData.type,
      note: formData.note,
      riderId: riderFilterId !== 'all' ? riderFilterId : (formData.riderId || undefined),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    setExpenses([newExpense, ...expenses]);
    setIsModalOpen(false);
    setFormData({ amount: '', date: new Date().toISOString().split('T')[0], type: 'Repair', note: '', riderId: '' });
  };

  const getCategoryIcon = (type: ExpenseType) => {
    switch (type) {
        case 'Petrol': return <Fuel size={14}/>;
        case 'Baraf (Ice)': return <Snowflake size={14}/>;
        case 'Generator': return <Zap size={14}/>;
        case 'Repair': return <Hammer size={14}/>;
        case 'Salary': return <User size={14}/>;
        default: return <Receipt size={14}/>;
    }
  };

  return (
    <div className="space-y-8">
      {/* THERMAL PRINT DOCUMENT */}
      <div className={`print-only thermal-${printProfile} print-text-${printFontSize} space-y-4 text-slate-900`}>
        <div className="text-center space-y-1">
          <h1 className="font-black text-lg uppercase tracking-tight">Gujjar Milk Shop</h1>
          <p className="font-bold text-[10px]">Expense Report</p>
          <div className="border-dashed-print"></div>
          <div className="flex justify-between font-black text-[10px]">
            <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Ref: #{generateId().substring(0, 8).toUpperCase()}</span>
          </div>
          <div className="border-dashed-print"></div>
        </div>

        <div className="space-y-2">
          {filteredExpenses.map((exp, i) => (
            <div key={i} className="flex justify-between items-start text-[10px]">
              <div className="flex-1">
                <p className="font-black leading-tight">{exp.type}</p>
                <p className="opacity-70 text-[8px]">{new Date(exp.date).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="text-right">
                <p className="font-black">Rs.{formatPKR(exp.amount)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-dashed-print"></div>
        <div className="flex justify-between font-black text-[10px]">
          <span>TOTAL EXPENSES:</span>
          <span>Rs.{formatPKR(filteredExpenses.reduce((acc, e) => acc + e.amount, 0))}</span>
        </div>

        <div className="border-dashed-print pt-4"></div>
        <p className="text-[8px] text-center font-bold opacity-60">
          Generated via Gujjar Digital Ledger
        </p>
      </div>

      <div className="flex justify-between items-center bg-white p-8 rounded-[3rem] border-2 border-slate-100 shadow-sm relative overflow-hidden no-print">
        {riderFilterId !== 'all' && (
           <div className="absolute top-0 right-0 bg-indigo-600 text-white px-8 py-2 rounded-bl-3xl font-black text-[8px] uppercase tracking-widest flex items-center gap-2">
            <Filter size={10}/> Route Specific View
          </div>
        )}
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Route Expenses</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Field Costs & Maintenance (Rs.)</p>
          </div>
          <button 
            onClick={() => setShowPrintSettings(!showPrintSettings)}
            className={`p-4 rounded-2xl transition-all ${showPrintSettings ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <Settings2 size={20}/>
          </button>
          <button onClick={() => window.print()} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all">
            <Printer size={20} />
          </button>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black text-lg uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200 flex items-center gap-4">
          <Receipt size={24} /> New Voucher
        </button>
      </div>

      {/* PRINT SETTINGS PANEL */}
      {showPrintSettings && (
        <div className="bg-white p-6 rounded-[2rem] border-2 border-indigo-100 shadow-xl animate-in slide-in-from-top-4 no-print space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Paper Size / پیپر کا سائز</p>
                 <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setPrintProfile('A4')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] transition-all ${printProfile === 'A4' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><Monitor size={14}/> A4 Page</button>
                    <button onClick={() => setPrintProfile('80')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] transition-all ${printProfile === '80' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><Smartphone size={14}/> 80mm</button>
                    <button onClick={() => setPrintProfile('58')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] transition-all ${printProfile === '58' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><Smartphone size={12}/> 58mm</button>
                 </div>
              </div>
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Text Size / لکھائی کا سائز</p>
                 <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setPrintFontSize('sm')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${printFontSize === 'sm' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Small</button>
                    <button onClick={() => setPrintFontSize('md')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${printFontSize === 'md' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Normal</button>
                    <button onClick={() => setPrintFontSize('lg')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${printFontSize === 'lg' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Large</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white rounded-[3.5rem] shadow-sm border-2 border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr className="text-[10px] font-black uppercase tracking-[0.3em]">
              <th className="px-10 py-8">Date</th>
              <th className="px-10 py-8">Category</th>
              <th className="px-10 py-8">Attribution</th>
              <th className="px-10 py-8 text-right">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map(exp => (
              <tr key={exp.id} className="hover:bg-slate-50 transition-all">
                <td className="px-10 py-6 font-bold text-slate-500">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                <td className="px-10 py-6">
                   <div className="flex items-center gap-2">
                      <span className={`p-2 rounded-lg bg-indigo-50 text-indigo-600`}>{getCategoryIcon(exp.type)}</span>
                      <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700">{exp.type}</span>
                   </div>
                </td>
                <td className="px-10 py-6 font-bold text-slate-600">{exp.riderId ? riders.find(r => r.id === exp.riderId)?.name : 'Main Shop'}</td>
                <td className="px-10 py-6 font-black text-red-600 text-xl text-right">Rs. {formatPKR(exp.amount)}</td>
              </tr>
            ))}
            {filteredExpenses.length === 0 && (
                <tr>
                    <td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest">No expenses found for this selection</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden border-8 border-indigo-500/20 animate-in zoom-in-95">
            <div className="p-10 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-black text-3xl italic tracking-tighter">Record Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/10 rounded-full"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Voucher Date</label>
                    <input type="date" required className={`w-full px-6 py-5 rounded-3xl font-black text-lg outline-none border-4 transition-all ${isPeriodClosed ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-100 focus:border-indigo-500'}`} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Amount (Rs.)</label>
                    <input type="number" required className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-2xl text-center outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0" />
                </div>
              </div>

              {isPeriodClosed && (
                 <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-center gap-4 animate-bounce">
                    <ShieldAlert className="text-red-600" />
                    <p className="text-[10px] font-black text-red-800 uppercase">Warning: This date belongs to a CLOSED ARCHIVE.</p>
                 </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Expense Category</label>
                <div className="grid grid-cols-2 gap-2">
                    {['Petrol', 'Repair', 'Baraf (Ice)', 'Generator', 'Salary', 'Other'].map(cat => (
                        <button 
                            key={cat} type="button" 
                            onClick={() => setFormData({...formData, type: cat as ExpenseType})}
                            className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${formData.type === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Staff Attribution</label>
                <select className="w-full px-6 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-lg outline-none" value={riderFilterId !== 'all' ? riderFilterId : formData.riderId} disabled={riderFilterId !== 'all'} onChange={e => setFormData({...formData, riderId: e.target.value})}>
                  <option value="">General Shop Account</option>
                  {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              
              <textarea className="w-full px-8 py-5 bg-slate-50 border-4 border-slate-100 rounded-3xl font-bold text-lg outline-none" rows={2} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Voucher description (optional)..." />
              
              <button disabled={isPeriodClosed} type="submit" className={`w-full py-6 rounded-[2rem] font-black text-2xl transition-all active:scale-95 ${isPeriodClosed ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-slate-900 shadow-2xl'}`}>
                {isPeriodClosed ? 'Archived Month' : 'Verify & Save Voucher'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ExpenseManagement);
