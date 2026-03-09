
import React, { useState } from 'react';
import { History, TrendingUp, Clock, Plus, User, Info, X, RefreshCcw, AlertTriangle, FileSpreadsheet, Printer, Settings2, Monitor, Smartphone } from 'lucide-react';
import { PriceRecord, Customer, Delivery } from '../types';
import { generateId } from '../services/dataStore';

interface PriceManagementProps {
  prices: PriceRecord[];
  setPrices: React.Dispatch<React.SetStateAction<PriceRecord[]>>;
  customers: Customer[];
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  onLogAction?: (price: string) => void;
}

const PriceManagement: React.FC<PriceManagementProps> = ({ prices, setPrices, customers, deliveries, setDeliveries, onLogAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printProfile, setPrintProfile] = useState<'A4' | '80' | '58'>('80');
  const [printFontSize, setPrintFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    customerId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
        alert("INVALID PRICE: Rate must be greater than 0.");
        return;
    }
    // Fixed: Added missing 'version' property for BaseEntity
    const newPrice: PriceRecord = {
      id: generateId(),
      price: price,
      effectiveDate: formData.effectiveDate,
      customerId: formData.customerId || undefined,
      updatedAt: new Date().toISOString(),
      version: 1
    };
    
    setPrices([...prices, newPrice].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()));
    
    if (onLogAction) {
      onLogAction(`${formData.price} Rs starting ${formData.effectiveDate}`);
    }
    
    setIsModalOpen(false);
  };

  const getCustomerName = (id?: string) => {
    if (!id) return 'Default (All Customers)';
    return customers.find(c => c.id === id)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* THERMAL PRINT DOCUMENT */}
      <div className={`print-only thermal-${printProfile} print-text-${printFontSize} space-y-4 text-slate-900`}>
        <div className="text-center space-y-1">
          <h1 className="font-black text-lg uppercase tracking-tight">Gujjar Milk Shop</h1>
          <p className="font-bold text-[10px]">Price List / ریٹ لسٹ</p>
          <div className="border-dashed-print"></div>
          <div className="flex justify-between font-black text-[10px]">
            <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Ref: #{generateId().substring(0, 8).toUpperCase()}</span>
          </div>
          <div className="border-dashed-print"></div>
        </div>

        <div className="space-y-2">
          {prices.map((record, i) => (
            <div key={i} className="flex justify-between items-start text-[10px] border-b border-black/10 pb-1">
              <div className="flex-1">
                <p className="font-black">{getCustomerName(record.customerId)}</p>
                <p className="opacity-70 text-[8px]">From: {new Date(record.effectiveDate).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="text-right font-black">
                Rs.{record.price}
              </div>
            </div>
          ))}
        </div>

        <div className="border-dashed-print pt-4"></div>
        <p className="text-[8px] text-center font-bold opacity-60">
          Official Price List<br/>
          Gujjar Milk Shop HQ
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl flex items-start gap-4 shadow-sm no-print">
        <Info className="text-blue-500 mt-1 flex-shrink-0" size={24} />
        <div className="space-y-2">
          <h4 className="font-bold text-blue-900 uppercase text-xs tracking-widest">Financial Safeguard Policy</h4>
          <p className="text-sm text-blue-800 leading-relaxed">
            Historical billing data is immutable. All records are maintained with a 100% auditable chain of custody.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center px-2 pt-4 no-print">
        <div className="flex items-center gap-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Price Log</h3>
          <button 
            onClick={() => setShowPrintSettings(!showPrintSettings)}
            className={`p-2 rounded-xl transition-all ${showPrintSettings ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <Settings2 size={16}/>
          </button>
          <button onClick={() => window.print()} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all">
            <Printer size={16} />
          </button>
        </div>
        <button 
          onClick={() => {
            setFormData({
              price: '',
              effectiveDate: new Date().toISOString().split('T')[0],
              customerId: ''
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <Plus size={16} />
          Record Price Change
        </button>
      </div>

      {/* PRINT SETTINGS PANEL */}
      {showPrintSettings && (
        <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-100 shadow-xl animate-in slide-in-from-top-4 no-print space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Paper Size / پیپر کا سائز</p>
                 <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setPrintProfile('A4')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] transition-all ${printProfile === 'A4' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Monitor size={14}/> A4 Page</button>
                    <button onClick={() => setPrintProfile('80')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] transition-all ${printProfile === '80' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Smartphone size={14}/> 80mm</button>
                    <button onClick={() => setPrintProfile('58')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] transition-all ${printProfile === '58' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Smartphone size={12}/> 58mm</button>
                 </div>
              </div>
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Text Size / لکھائی کا سائز</p>
                 <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setPrintFontSize('sm')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${printFontSize === 'sm' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Small</button>
                    <button onClick={() => setPrintFontSize('md')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${printFontSize === 'md' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Normal</button>
                    <button onClick={() => setPrintFontSize('lg')} className={`flex-1 py-3 rounded-xl font-black text-[10px] transition-all ${printFontSize === 'lg' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Large</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden no-print">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Applicable For</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Starting Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Milk Price</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prices.map((record) => {
              const isFuture = new Date(record.effectiveDate) > new Date();
              return (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      {record.customerId ? <User size={16} className="text-blue-500" /> : <TrendingUp size={16} className="text-indigo-500" />}
                      <span className="text-sm">{getCustomerName(record.customerId)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-500 text-xs tracking-tighter">
                    {new Date(record.effectiveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900 italic">Rs. {record.price}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isFuture ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {isFuture ? 'Upcoming' : 'Active'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border-8 border-slate-900">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                 <h3 className="font-black text-2xl tracking-tighter uppercase italic">Price Update</h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Audit-Safe Change</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-2 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Account</label>
                <select 
                  className="w-full px-6 py-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-600"
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                >
                  <option value="">Global (Default)</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Price (Rs/L)</label>
                  <input 
                    type="number"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black text-2xl outline-none focus:border-blue-600 text-center"
                    placeholder="210"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Effective Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-600 text-sm"
                    value={formData.effectiveDate}
                    onChange={e => setFormData({...formData, effectiveDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  type="submit"
                  className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Confirm & Lock Price
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceManagement;
