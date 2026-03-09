
import React, { useState, useMemo } from 'react';
import { Truck, Plus, Clock, X, ShieldAlert, Printer, Settings2, Monitor, Smartphone } from 'lucide-react';
import { RiderLoad, Rider, UserRole, MonthlyArchive } from '../types';
import { generateId } from '../services/dataStore';
import { printService } from '../services/printService';
import ThermalPrintView from './ThermalPrintView';

interface DispatchHubProps {
  riderLoads: RiderLoad[];
  setRiderLoads: React.Dispatch<React.SetStateAction<RiderLoad[]>>;
  riders: Rider[];
  role: UserRole;
  riderFilterId: string;
  archives: MonthlyArchive[];
}

const DispatchHub: React.FC<DispatchHubProps> = ({ riderLoads, setRiderLoads, riders, role, riderFilterId, archives }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printProfile, setPrintProfile] = useState<'A4' | '80' | '58'>('80');
  const [printFontSize, setPrintFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [formData, setFormData] = useState({ riderId: riders[0]?.id || '', liters: '' });

  const isOwner = role === UserRole.OWNER;

  const isPeriodClosed = useMemo(() => {
    const dt = new Date(selectedDate);
    return (archives || []).some(a => a.month === dt.getMonth() && a.year === dt.getFullYear());
  }, [selectedDate, archives]);

  const filteredLoads = useMemo(() => {
    return riderLoads.filter(r => 
      r.date === selectedDate && 
      (riderFilterId === 'all' ? true : r.riderId === riderFilterId)
    );
  }, [riderLoads, selectedDate, riderFilterId]);

  const groupedLoads = useMemo(() => {
    const groups: Record<string, RiderLoad[]> = {};
    filteredLoads.forEach(load => {
      if (!groups[load.riderId]) groups[load.riderId] = [];
      groups[load.riderId].push(load);
    });
    Object.keys(groups).forEach(key => groups[key].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    return groups;
  }, [filteredLoads]);

  const totalDispatched = useMemo(() => {
    return filteredLoads.reduce((a, b) => a + b.liters, 0);
  }, [filteredLoads]);

  const handleAddLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPeriodClosed) {
        alert("Cannot dispatch milk to an archived period.");
        return;
    }
    const amount = parseFloat(formData.liters);
    if (!formData.riderId || isNaN(amount) || amount <= 0) {
        alert("INVALID QUANTITY: Dispatch quantity must be greater than 0.");
        return;
    }

    // Fixed: Added missing 'version' property for BaseEntity
    const newLoad: RiderLoad = {
      id: generateId(),
      riderId: riderFilterId !== 'all' ? riderFilterId : formData.riderId,
      date: selectedDate,
      liters: amount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    setRiderLoads([newLoad, ...riderLoads]);
    setIsModalOpen(false);
    setFormData({ ...formData, liters: '' });
  };

  const removeLoad = (id: string) => {
    if (!isOwner || isPeriodClosed) return;
    if (window.confirm("Delete this dispatch record?")) {
      setRiderLoads(riderLoads.filter(r => r.id !== id));
    }
  };

  const handlePrint = () => {
    printService.setPrintConfig(printProfile, printFontSize);
    printService.triggerPrint(
      <ThermalPrintView 
        profile={printProfile} 
        fontSize={printFontSize} 
        title="Gujjar Milk Shop" 
        subtitle="Dispatch Audit Report"
      >
        <div className="space-y-1 text-xs">
          <div className="flex justify-between font-black">
            <span>Date: {new Date(selectedDate).toLocaleDateString('en-GB')}</span>
            <span>Ref: #{generateId().substring(0, 8).toUpperCase()}</span>
          </div>
        </div>

        <div className="border-dashed-print my-2"></div>

        <div className="space-y-4">
          {Object.keys(groupedLoads).map(riderId => {
            const rider = riders.find(r => r.id === riderId);
            const loads = groupedLoads[riderId];
            const milkT = loads.reduce((a, b) => a + b.liters, 0);
            return (
              <div key={riderId} className="space-y-1">
                <div className="flex justify-between font-black text-xs border-b border-black pb-1">
                  <span>{rider?.name}</span>
                  <span>{milkT.toFixed(1)}L</span>
                </div>
                {loads.map(load => (
                  <div key={load.id} className="flex justify-between text-[10px] opacity-70">
                    <span>{load.timestamp}</span>
                    <span>{load.liters.toFixed(1)}L</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="border-dashed-print my-2"></div>
        <div className="flex justify-between font-black text-xs">
          <span>TOTAL DISPATCHED:</span>
          <span>{totalDispatched.toFixed(1)}L</span>
        </div>

        <div className="border-dashed-print my-4"></div>
        <div className="text-center space-y-1">
          <p className="font-black text-xs uppercase tracking-widest">Verified Dispatch Audit</p>
          <p className="text-[10px] opacity-50">Gujjar Milk Shop HQ • {selectedDate}</p>
        </div>
      </ThermalPrintView>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className={`p-8 rounded-[3rem] border-4 flex flex-col md:flex-row gap-6 items-center relative overflow-hidden transition-colors no-print ${isPeriodClosed ? 'bg-red-900 border-red-500' : 'bg-slate-900 border-white/5'}`}>
        <div className="flex-1 w-full flex items-center gap-4">
           <input type="date" className={`flex-1 p-5 rounded-2xl outline-none font-black transition-all ${isPeriodClosed ? 'bg-red-500/20 text-red-200 border border-red-500' : 'bg-white/5 border border-white/10 text-white'}`} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
           <button 
             onClick={() => setShowPrintSettings(!showPrintSettings)}
             className={`p-5 rounded-2xl transition-all ${showPrintSettings ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
           >
             <Settings2 size={20}/>
           </button>
           <button onClick={handlePrint} className="p-5 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
             <Printer size={20} />
           </button>
        </div>
        <div className="w-full md:w-auto">
           <div className="flex items-center gap-6 bg-white/5 p-8 rounded-3xl border border-white/10">
              <Truck size={48} className="text-blue-500" />
              <div className="text-right">
                 <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">Total Dispatched</p>
                 <p className="text-5xl font-black text-white italic tracking-tighter">{totalDispatched.toFixed(1)}L</p>
              </div>
           </div>
        </div>
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

      {isPeriodClosed && (
         <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2.5rem] flex items-center gap-4 text-red-600 animate-in fade-in">
            <ShieldAlert size={32}/>
            <div>
               <p className="text-sm font-black uppercase">Archive Lock Active</p>
               <p className="text-xs font-bold opacity-80">This date belongs to a finalized month. Pickup records cannot be modified.</p>
            </div>
         </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center px-4">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Route Issuance</h3>
           {isOwner && !isPeriodClosed && (
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2">
               <Plus size={16}/> Record Pickup
             </button>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {Object.keys(groupedLoads).map(riderId => {
             const rider = riders.find(r => r.id === riderId);
             const loads = groupedLoads[riderId];
             const milkT = loads.reduce((a, b) => a + b.liters, 0);
             return (
               <div key={riderId} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-4">
                        <div className="bg-slate-100 p-4 rounded-2xl"><Truck size={24} className="text-slate-500" /></div>
                        <div>
                           <p className="font-black text-slate-900 text-lg">{rider?.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Route: {rider?.route}</p>
                        </div>
                     </div>
                     <div className="bg-blue-50 px-5 py-2 rounded-xl border border-blue-100">
                         <p className="text-lg font-black text-blue-600">{milkT.toFixed(1)} L</p>
                     </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-2 space-y-1">
                     {loads.map(load => (
                       <div key={load.id} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-[10px] font-bold flex items-center gap-2"><Clock size={12}/> {load.timestamp}</span>
                          <div className="flex items-center gap-4">
                             <span className="font-black text-slate-800 text-sm">{load.liters.toFixed(1)} Liters</span>
                             {isOwner && !isPeriodClosed && <button onClick={() => removeLoad(load.id)} className="text-slate-300 hover:text-red-500 p-1"><X size={16}/></button>}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
             );
           })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg border-8 border-slate-900 animate-in zoom-in-95">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                 <h3 className="font-black text-2xl tracking-tighter uppercase italic">Dispatch Issuance</h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddLoad} className="p-10 space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Select Staff</label>
                    <select className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-2xl font-black outline-none" value={riderFilterId !== 'all' ? riderFilterId : formData.riderId} disabled={riderFilterId !== 'all'} onChange={e => setFormData({...formData, riderId: e.target.value})}>
                       {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Quantity (Liters)</label>
                    <input required type="number" step="0.5" className="w-full p-8 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-5xl text-center outline-none" value={formData.liters} onChange={e => setFormData({...formData, liters: e.target.value})} />
                 </div>
                 <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl">Confirm Dispatch</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default DispatchHub;
