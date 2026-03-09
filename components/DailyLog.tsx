
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Search, ClipboardList, Wallet, 
  TrendingUp, ReceiptText, Banknote, Clock, ArrowUpDown, Filter, User,
  Printer, MapPin, Phone, Settings2, Smartphone, Monitor
} from 'lucide-react';
import * as ReactWindow from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

const { FixedSizeList } = ReactWindow as any;
import { Delivery, Payment, Customer, Rider, UserRole } from '../types';
import { formatPKR, generateId } from '../services/dataStore';
import { printService } from '../services/printService';
import { SummaryReceipt } from './Receipts';

interface DailyLogProps {
  deliveries: Delivery[];
  payments: Payment[];
  customers: Customer[];
  riders: Rider[];
  riderFilterId: string;
  role: UserRole;
}

const LogRow = React.memo(({ 
  item, 
  customer 
}: { 
  item: any, 
  customer: Customer | undefined 
}) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex justify-between items-center group transition-all">
       <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${item.type === 'delivery' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
             {item.type === 'delivery' ? <ClipboardList size={28}/> : <Banknote size={28}/>}
          </div>
          <div>
             <p className="font-black text-slate-900 text-base">{customer?.name}</p>
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
               <span className={item.type === 'delivery' ? 'text-blue-600' : 'text-green-600'}>
                 {item.type === 'delivery' ? 'Milk Delivery' : 'Cash Received'}
               </span>
               <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
               <Clock size={10}/> {new Date(item.sortTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </div>
          </div>
       </div>
       <div className="text-right">
          <p className={`text-2xl font-black italic tracking-tighter ${item.type === 'delivery' ? 'text-red-500' : 'text-green-600'}`}>
             {item.type === 'delivery' ? `${((item as any).liters ?? 0).toFixed(1)}L` : `Rs.${((item as any).amount ?? 0).toLocaleString()}`}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1" dir="rtl">{customer?.urduName}</p>
       </div>
    </div>
  );
});

const DailyLog: React.FC<DailyLogProps> = ({ deliveries, payments, customers, riders, riderFilterId, role }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [searchTerm, setSearchTerm] = useState('');
  
  // PRINT CONFIGURATION
  const [printProfile, setPrintProfile] = useState<'A4' | '80' | '58'>('80');
  const [printFontSize, setPrintFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  const isOwner = role === UserRole.OWNER;

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  const filteredDeliveries = useMemo(() => {
    return (deliveries || []).filter(d => {
      const isDateMatch = d.date === selectedDate;
      const isRiderMatch = riderFilterId === 'all' ? true : d.riderId === riderFilterId;
      return isDateMatch && isRiderMatch;
    });
  }, [deliveries, selectedDate, riderFilterId]);

  const filteredPayments = useMemo(() => {
    return (payments || []).filter(p => {
      const isDateMatch = p.date === selectedDate;
      let isRiderMatch = true;
      if (riderFilterId !== 'all') {
        const cust = customers.find(c => c.id === p.customerId);
        isRiderMatch = cust?.riderId === riderFilterId;
      }
      return isDateMatch && isRiderMatch;
    });
  }, [payments, selectedDate, riderFilterId, customers]);

  const stats = useMemo(() => {
    const milk = filteredDeliveries.reduce((acc, d) => acc + (d.liters || 0), 0);
    const bill = filteredDeliveries.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
    const recovery = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    return { milk, bill, recovery };
  }, [filteredDeliveries, filteredPayments]);

  const activityLog = useMemo(() => {
    const combined = [
      ...filteredDeliveries.map(d => ({ ...d, type: 'delivery' as const, sortTime: d.updatedAt })),
      ...filteredPayments.map(p => ({ ...p, type: 'payment' as const, sortTime: p.updatedAt }))
    ].sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime());

    return combined.filter(item => {
      const cust = customerMap.get(item.customerId);
      return cust?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             (cust?.urduName && cust?.urduName.includes(searchTerm));
    });
  }, [filteredDeliveries, filteredPayments, customerMap, searchTerm]);

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const item = activityLog[index];
    return (
      <div style={{ ...style, padding: '5px' }}>
        <LogRow 
          item={item} 
          customer={customerMap.get(item.customerId)} 
        />
      </div>
    );
  };

  const handlePrint = () => {
    printService.setPrintConfig(printProfile, printFontSize);
    printService.triggerPrint(
      <SummaryReceipt 
        date={selectedDate}
        customers={customers}
        deliveries={filteredDeliveries}
        payments={filteredPayments}
        profile={printProfile}
        fontSize={printFontSize}
        compact={true}
      />
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-32">
      
      {/* WEB CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
         <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Daily Shop Records</h3>
            <button 
              onClick={() => setShowPrintSettings(!showPrintSettings)}
              className={`p-2 rounded-xl transition-all ${showPrintSettings ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              <Settings2 size={18}/>
            </button>
         </div>
         
         <button 
           onClick={handlePrint}
           className="flex items-center justify-center gap-3 px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all w-full md:w-auto"
         >
           <Printer size={16}/> Print Report
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

      {/* WEB VIEW UI */}
      <div className="bg-white p-8 md:p-14 rounded-[3.5rem] border-4 border-slate-100 shadow-sm space-y-10 no-print">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100">
                  <ReceiptText size={28}/>
               </div>
               <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Timeline Summary</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {riderFilterId === 'all' ? 'Full Shop Activity' : `Route: ${riders.find(r => r.id === riderFilterId)?.name}`}
                  </p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 px-6 rounded-2xl w-full md:w-auto">
               <Calendar size={18} className="text-slate-400" />
               <input 
                 type="date" 
                 className={`bg-transparent font-black text-slate-700 outline-none text-sm flex-1 ${isOwner ? '' : 'pointer-events-none'}`} 
                 value={selectedDate} 
                 onChange={e => setSelectedDate(e.target.value)} 
               />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LogStat icon={<ClipboardList size={20}/>} label="Total Delivered" value={`${(stats.milk ?? 0).toFixed(1)} L`} sub={`Rs. ${(stats.bill ?? 0).toLocaleString()}`} color="blue" />
            <LogStat icon={<Wallet size={20}/>} label="Cash Collected" value={`Rs. ${(stats.recovery ?? 0).toLocaleString()}`} sub="Direct Recovery" color="green" />
            <LogStat icon={<TrendingUp size={20}/>} label="Efficiency" value={`${stats.bill > 0 ? ((stats.recovery / stats.bill) * 100).toFixed(0) : 0}%`} sub="Recovery Rate" color="amber" />
         </div>

         <div className="flex items-center justify-between pt-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Transaction Feed</h3>
            <div className="relative w-64">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Search Feed..." 
                 className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:border-blue-500 transition-all" 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
               />
            </div>
         </div>

         <div className="space-y-4">
            {activityLog.length === 0 ? (
              <p className="py-20 text-slate-300 font-black text-center w-full uppercase tracking-widest">No activity found.</p>
            ) : (
              <div className="flex-1 min-h-[500px]">
                <AutoSizer>
                  {({ height, width }) => (
                  <FixedSizeList
                    height={height}
                    itemCount={activityLog.length}
                    itemSize={120}
                    width={width}
                    className="scrollbar-hide"
                  >
                    {Row}
                  </FixedSizeList>
                  )}
                </AutoSizer>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const LogStat = ({ icon, label, value, sub, color }: { icon: any, label: string, value: string, sub: string, color: 'blue' | 'green' | 'amber' }) => (
  <div className="p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50 flex items-center gap-5 group hover:bg-white transition-all cursor-default">
     <div className={`p-4 rounded-2xl bg-slate-900 text-white shadow-lg transition-all group-hover:scale-110`}>{icon}</div>
     <div>
        <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-none italic">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 mt-2">{sub}</p>
     </div>
  </div>
);

export default React.memo(DailyLog);
