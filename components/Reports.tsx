
import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, ChevronRight, Search,
  Printer, Filter, RefreshCcw, Phone, MapPin, User, Info, Settings2, Monitor, Smartphone,
  ArrowUpRight, ArrowDownLeft, Globe
} from 'lucide-react';
import * as ReactWindow from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

const { FixedSizeList } = ReactWindow as any;
import { Customer, Delivery, Payment, Expense, Rider, MonthlyArchive } from '../types';
import { formatPKR } from '../services/dataStore';
import { printService } from '../services/printService';
import ThermalPrintView from './ThermalPrintView';

interface ReportsProps {
  customers: Customer[];
  deliveries: Delivery[];
  payments: Payment[];
  expenses: Expense[];
  riders: Rider[];
  archives: MonthlyArchive[];
  balances: Record<string, number>;
  riderFilterId: string;
}

const KhataRow = React.memo(({ 
  customer, 
  monthDeliveries, 
  balance, 
  onSelect 
}: { 
  customer: Customer, 
  monthDeliveries: Delivery[], 
  balance: number, 
  onSelect: (id: string) => void 
}) => {
  const mLiters = useMemo(() => monthDeliveries.reduce((a, b) => a + (b.liters || 0), 0), [monthDeliveries]);
  const mBill = useMemo(() => monthDeliveries.reduce((a, b) => a + (b.totalAmount || 0), 0), [monthDeliveries]);

  return (
    <tr className={`hover:bg-slate-50/80 transition-all ${!customer.active ? 'opacity-40' : ''}`}>
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm shadow-inner border border-slate-200/50">
            {customer.name.charAt(0)}
          </div>
          <div>
            <p className="font-black text-sm text-slate-900 tracking-tight">{customer.name}</p>
            <p className="text-xl font-bold text-blue-600 mt-1" dir="rtl">{customer.urduName}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6 text-right font-black text-slate-400">
        <span>{mLiters.toFixed(1)} L</span>
      </td>
      <td className="px-8 py-6 text-right font-black text-slate-900">Rs. {formatPKR(mBill)}</td>
      <td className={`px-8 py-6 text-right font-black ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>Rs. {formatPKR(balance)}</td>
      <td className="px-8 py-6 text-right">
        <button onClick={() => onSelect(customer.id)} className="p-3 bg-white border border-slate-200 rounded-xl text-blue-600 shadow-sm">
          <ChevronRight size={18}/>
        </button>
      </td>
    </tr>
  );
});

const Reports: React.FC<ReportsProps> = ({ 
  customers, deliveries, payments, expenses, riders, balances, riderFilterId, archives 
}) => {
  const [reportType, setReportType] = useState<'khata' | 'pnl'>('khata');
  
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // PRINT CONFIGURATION
  const [printProfile, setPrintProfile] = useState<'A4' | '80' | '58'>('A4');
  const [printFontSize, setPrintFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, []);

  const getMonthName = (index: number) => new Date(2000, index).toLocaleString('en-GB', { month: 'long' });

  const parseDateParts = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: -1, day: 0 };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { year: 0, month: -1, day: 0 };
    const [y, m, d] = parts.map(Number);
    return { year: y, month: m - 1, day: d };
  };

  const relevantArchive = useMemo(() => {
    return (archives || []).find(a => a.year === selectedYear && a.month === selectedMonth);
  }, [archives, selectedMonth, selectedYear]);

  const sourceDeliveries = relevantArchive ? relevantArchive.deliveries : deliveries;
  const sourcePayments = relevantArchive ? relevantArchive.payments : payments;
  const sourceExpenses = relevantArchive ? relevantArchive.expenses : expenses;

  const filteredCustomers = useMemo(() => {
    const list = riderFilterId === 'all' ? (customers || []) : (customers || []).filter(c => c.riderId === riderFilterId);
    if (!searchTerm) return list;
    return list.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.urduName && c.urduName.includes(searchTerm))
    );
  }, [customers, riderFilterId, searchTerm]);

  const customerDetailData = useMemo(() => {
    if (!selectedCustomerId) return null;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return null;

    let monthlyOpeningBalance = 0;
    if (relevantArchive) {
        const prevDeliveries = (sourceDeliveries || []).filter(d => {
            if (d.customerId !== selectedCustomerId) return false;
            const { year, month } = parseDateParts(d.date);
            return year < selectedYear || (year === selectedYear && month < selectedMonth);
        });
        const prevPayments = (sourcePayments || []).filter(p => {
            if (p.customerId !== selectedCustomerId) return false;
            const { year, month } = parseDateParts(p.date);
            return year < selectedYear || (year === selectedYear && month < selectedMonth);
        });
        monthlyOpeningBalance = (customer.openingBalance || 0) + prevDeliveries.reduce((sum, d) => sum + d.totalAmount, 0) - prevPayments.reduce((sum, p) => sum + p.amount, 0);
    } else {
        const prevDeliveries = (deliveries || []).filter(d => {
          if (d.customerId !== selectedCustomerId) return false;
          const { year, month } = parseDateParts(d.date);
          return year < selectedYear || (year === selectedYear && month < selectedMonth);
        });

        const prevPayments = (payments || []).filter(p => {
          if (p.customerId !== selectedCustomerId) return false;
          const { year, month } = parseDateParts(p.date);
          return year < selectedYear || (year === selectedYear && month < selectedMonth);
        });
        
        const totalPrevDebit = prevDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
        const totalPrevCredit = prevPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        monthlyOpeningBalance = (customer.openingBalance || 0) + totalPrevDebit - totalPrevCredit;
    }

    const mDeliveries = (sourceDeliveries || []).filter(d => {
      if (d.customerId !== selectedCustomerId) return false;
      const { year, month } = parseDateParts(d.date);
      return year === selectedYear && month === selectedMonth;
    });

    const mPayments = (sourcePayments || []).filter(p => {
      if (p.customerId !== selectedCustomerId) return false;
      const { year, month } = parseDateParts(p.date);
      return year === selectedYear && month === selectedMonth;
    });

    const ledgerItems = [
      ...mDeliveries.map(d => ({ ...d, type: 'milk', sortDate: d.date, debit: (d.totalAmount || 0), credit: 0, timestamp: d.updatedAt })),
      ...mPayments.map(p => ({ ...p, type: 'payment', sortDate: p.date, debit: 0, credit: (p.amount || 0), timestamp: p.updatedAt }))
    ].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.timestamp.localeCompare(b.timestamp));

    const periodBilling = mDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const periodRecovery = mPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const closingBalance = monthlyOpeningBalance + periodBilling - periodRecovery;

    return { customer, openingBalance: monthlyOpeningBalance, ledgerItems, periodBilling, periodRecovery, closingBalance };
  }, [selectedCustomerId, selectedMonth, selectedYear, customers, deliveries, payments, relevantArchive, sourceDeliveries, sourcePayments]);

  const indexedMonthDeliveries = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    (sourceDeliveries || []).forEach(d => {
      const { year, month } = parseDateParts(d.date);
      if (year === selectedYear && month === selectedMonth) {
        const list = map.get(d.customerId) || [];
        list.push(d);
        map.set(d.customerId, list);
      }
    });
    return map;
  }, [sourceDeliveries, selectedYear, selectedMonth]);

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const c = filteredCustomers[index];
    return (
      <div style={style}>
        <table className="w-full text-left border-collapse">
          <tbody>
            <KhataRow 
              customer={c}
              monthDeliveries={indexedMonthDeliveries.get(c.id) || []}
              balance={relevantArchive ? (relevantArchive.closingBalances[c.id] || 0) : (balances[c.id] || 0)}
              onSelect={setSelectedCustomerId}
            />
          </tbody>
        </table>
      </div>
    );
  };

  if (selectedCustomerId && customerDetailData) {
    const { customer, openingBalance, ledgerItems, closingBalance } = customerDetailData;
    let runningBal = openingBalance;

    const handlePrint = () => {
      printService.setPrintConfig(printProfile, printFontSize);
      const isThermal = printProfile === '80' || printProfile === '58';
      
      printService.triggerPrint(
        <ThermalPrintView 
          profile={printProfile} 
          fontSize={printFontSize} 
          title="Gujjar Milk Shop" 
          subtitle="Digital Statement"
        >
           <div className={`flex flex-col ${isThermal ? 'gap-4' : 'md:flex-row justify-between items-start gap-8'}`}>
              <div className={isThermal ? 'space-y-2' : 'space-y-6'}>
                 <div className="space-y-1">
                    <p className={`${isThermal ? 'text-[8px]' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest`}>Customer Account / کسٹمر اکاؤنٹ</p>
                    <h2 className={`${isThermal ? 'text-xl' : 'text-4xl'} font-black text-slate-900 tracking-tight`}>{customer.name}</h2>
                    <p className={`${isThermal ? 'text-xl' : 'text-4xl'} font-bold text-blue-600`} dir="rtl">{customer.urduName}</p>
                 </div>
                 
                 <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-600">
                       <Phone size={isThermal ? 12 : 16} className="text-blue-500" />
                       <p className={`${isThermal ? 'text-[10px]' : 'text-sm'} font-bold tracking-tight`}>{customer.phone || 'No phone'}</p>
                    </div>
                 </div>

                 <div className={`flex items-center gap-2 bg-slate-100 ${isThermal ? 'px-2 py-1' : 'px-4 py-2'} rounded-lg w-fit`}>
                    <Calendar size={isThermal ? 10 : 14} className="text-slate-500" />
                    <p className={`${isThermal ? 'text-[8px]' : 'text-[10px]'} font-black text-slate-600 uppercase tracking-widest`}>{getMonthName(selectedMonth)} {selectedYear}</p>
                 </div>
              </div>
              <div className={`${isThermal ? 'bg-slate-900 text-white p-4 rounded-2xl' : 'bg-slate-900 text-white p-10 rounded-[3rem] text-right min-w-[320px] shadow-2xl relative overflow-hidden'}`}>
                 <div className="relative z-10">
                    <p className={`${isThermal ? 'text-[8px]' : 'text-[9px]'} font-black text-blue-400 uppercase mb-1 tracking-widest`}>Final Balance / کل بقایا</p>
                    <p className={`${isThermal ? 'text-2xl' : 'text-5xl'} font-black tracking-tighter italic`}>Rs. {formatPKR(closingBalance)}</p>
                 </div>
              </div>
           </div>

           <div className={`overflow-x-auto ${isThermal ? 'rounded-xl border mt-4' : 'rounded-[2.5rem] border-2 border-slate-100 mt-8'}`}>
              <table className="w-full text-left font-bold border-collapse">
                 <thead className="bg-slate-900 text-white">
                    <tr className={`${isThermal ? 'text-[7px]' : 'text-[9px]'} font-black uppercase tracking-widest`}>
                       <th className={isThermal ? 'px-2 py-2' : 'px-10 py-7'}>Date</th>
                       <th className={isThermal ? 'px-2 py-2' : 'px-10 py-7'}>Particulars</th>
                       <th className={`${isThermal ? 'px-2 py-2' : 'px-10 py-7'} text-right`}>D/C</th>
                       <th className={`${isThermal ? 'px-2 py-2' : 'px-10 py-7'} text-right`}>Bal</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50 italic">
                       <td colSpan={2} className={`${isThermal ? 'px-2 py-2 text-[7px]' : 'px-10 py-5 text-[10px]'} font-black text-slate-400 uppercase`}>B/F</td>
                       <td className={isThermal ? 'px-2 py-2 text-right' : 'px-10 py-5 text-right'}>-</td>
                       <td className={`${isThermal ? 'px-2 py-2 text-right text-[10px]' : 'px-10 py-5 text-right text-sm'} font-black text-slate-900`}>{formatPKR(openingBalance)}</td>
                    </tr>
                    {(() => {
                      let rb = openingBalance;
                      return ledgerItems.map((entry, i) => {
                        rb += (entry.debit ?? 0) - (entry.credit ?? 0);
                        const d = entry as any;
                        const isAdj = d.isAdjustment;
                        const particulars = d.type === 'milk' 
                          ? `${d.liters || 0}L`
                          : 'Cash';
                        return (
                          <tr key={i} className={`hover:bg-slate-50/80 transition-all border-l-2 ${isAdj ? 'border-orange-400 bg-orange-50/20' : 'border-transparent'}`}>
                             <td className={`${isThermal ? 'px-2 py-2 text-[8px]' : 'px-10 py-5 text-[10px]'} font-black text-slate-500 whitespace-nowrap`}>{parseDateParts(entry.sortDate).day}</td>
                             <td className={`${isThermal ? 'px-2 py-2 text-[8px]' : 'px-10 py-5 text-[10px]'} font-black`}>
                                <div className="flex flex-col">
                                   <span className="uppercase">{particulars}</span>
                                   {isAdj && <span className="text-[6px] text-orange-600 mt-0.5">CORR</span>}
                                </div>
                             </td>
                             <td className={`${isThermal ? 'px-2 py-2 text-right text-[8px]' : 'px-10 py-5 text-right text-xs'} font-black ${entry.debit !== 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {entry.debit !== 0 ? `+${formatPKR(entry.debit)}` : `-${formatPKR(entry.credit)}`}
                             </td>
                             <td className={`${isThermal ? 'px-2 py-2 text-right text-[8px]' : 'px-10 py-5 text-right text-sm'} font-black text-slate-900`}>{formatPKR(rb)}</td>
                          </tr>
                        );
                      });
                    })()}
                 </tbody>
              </table>
           </div>
           
           <div className={`pt-6 flex justify-between items-center text-slate-400 font-black uppercase ${isThermal ? 'text-[6px] tracking-widest' : 'text-[8px] tracking-[0.4em]'}`}>
               <span>DairyPro Cloud Ledger</span>
               <div className={isThermal ? 'flex gap-2' : 'flex gap-10'}>
                  <span>Signature</span>
                  <span>Stamp</span>
               </div>
           </div>
        </ThermalPrintView>
      );
    };

    return (
      <div className="p-4 md:p-8 space-y-6 print-ledger-container animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
            <div className="flex items-center gap-4">
                <button onClick={() => setSelectedCustomerId(null)} className="flex items-center gap-2 text-slate-500 font-black uppercase text-[10px] bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
                    <ArrowLeft size={16} /> Ledger List
                </button>
                <button 
                  onClick={() => setShowPrintSettings(!showPrintSettings)}
                  className={`p-2 rounded-xl transition-all ${showPrintSettings ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Settings2 size={18}/>
                </button>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    <Printer size={16}/> Print / PDF
                </button>
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

        <div className="bg-white p-8 md:p-14 rounded-[3.5rem] border-4 border-slate-100 shadow-sm space-y-10">
           <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="space-y-6">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Account / کسٹمر اکاؤنٹ</p>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">{customer.name}</h2>
                    <p className="text-4xl font-bold text-blue-600" dir="rtl">{customer.urduName}</p>
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex items-center gap-3 text-slate-600">
                       <Phone size={16} className="text-blue-500" />
                       <p className="text-sm font-bold tracking-tight">{customer.phone || 'No phone number'}</p>
                    </div>
                    <div className="flex items-start gap-3 text-slate-600">
                       <MapPin size={16} className="text-blue-500 mt-1" />
                       <p className="text-sm font-medium tracking-tight max-w-sm">{customer.address || 'No address provided'}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl w-fit">
                    <Calendar size={14} className="text-slate-500" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{getMonthName(selectedMonth)} {selectedYear}</p>
                 </div>
              </div>
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] text-right min-w-[320px] shadow-2xl relative overflow-hidden">
                 <div className="relative z-10">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1 tracking-widest">Final Balance / کل بقایا</p>
                    <p className="text-5xl font-black tracking-tighter italic">Rs. {formatPKR(closingBalance)}</p>
                 </div>
              </div>
           </div>

           <div className="overflow-x-auto rounded-[2.5rem] border-2 border-slate-100 mt-8">
              <table className="w-full text-left font-bold border-collapse">
                 <thead className="bg-slate-900 text-white">
                    <tr className="text-[9px] font-black uppercase tracking-[0.2em]">
                       <th className="px-10 py-7">Date</th>
                       <th className="px-10 py-7">Particulars / تفصیل</th>
                       <th className="px-10 py-7 text-right">Debit (+)</th>
                       <th className="px-10 py-7 text-right">Credit (-)</th>
                       <th className="px-10 py-7 text-right">Balance</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50 italic">
                       <td colSpan={2} className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase">B/F From Prev Month</td>
                       <td className="px-10 py-5 text-right">-</td>
                       <td className="px-10 py-5 text-right">-</td>
                       <td className="px-10 py-5 text-right font-black text-slate-900 text-sm">Rs. {formatPKR(openingBalance)}</td>
                    </tr>
                    {ledgerItems.map((entry, i) => {
                      runningBal += (entry.debit ?? 0) - (entry.credit ?? 0);
                      const d = entry as any;
                      const isAdj = d.isAdjustment;
                      const particulars = d.type === 'milk' 
                        ? `${d.liters || 0}L Milk Delivery`
                        : 'Cash Payment';
                      return (
                        <tr key={i} className={`hover:bg-slate-50/80 transition-all border-l-4 ${isAdj ? 'border-orange-400 bg-orange-50/20' : 'border-transparent hover:border-blue-600'}`}>
                           <td className="px-10 py-5 text-[10px] font-black text-slate-500 whitespace-nowrap">{parseDateParts(entry.sortDate).day} {getMonthName(selectedMonth).slice(0,3)}</td>
                           <td className="px-10 py-5 text-[10px] font-black">
                              <div className="flex flex-col">
                                 <span className="uppercase text-slate-900">{particulars}</span>
                                 {isAdj && <span className="text-[8px] text-orange-600 flex items-center gap-1 mt-1"><RefreshCcw size={8}/> CORRECTION: {d.adjustmentNote}</span>}
                              </div>
                           </td>
                           <td className="px-10 py-5 text-right font-black">
                              {entry.debit !== 0 ? (
                                 <div className="flex items-center justify-end gap-2 text-red-500">
                                    <span className="text-xs">Rs. {formatPKR(entry.debit)}</span>
                                    <ArrowUpRight size={12} className="opacity-50" />
                                 </div>
                              ) : '-'}
                           </td>
                           <td className="px-10 py-5 text-right font-black">
                              {entry.credit !== 0 ? (
                                 <div className="flex items-center justify-end gap-2 text-green-600">
                                    <span className="text-xs">Rs. {formatPKR(entry.credit)}</span>
                                    <ArrowDownLeft size={12} className="opacity-50" />
                                 </div>
                              ) : '-'}
                           </td>
                           <td className="px-10 py-5 text-right font-black text-slate-900 text-sm">Rs. {formatPKR(runningBal)}</td>
                        </tr>
                      );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex bg-slate-100 p-1.5 rounded-[1.8rem] w-full md:w-auto">
          <button onClick={() => setReportType('khata')} className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${reportType === 'khata' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Ledger</button>
          <button onClick={() => setReportType('pnl')} className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${reportType === 'pnl' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Profit/Loss</button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search customer..." 
              className="pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 outline-none focus:border-blue-600 w-full md:w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-slate-200 rounded-full text-slate-500 hover:bg-slate-300 transition-colors"
              >
                <ArrowLeft size={12} className="rotate-45" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select className="flex-1 px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 outline-none" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
              {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{getMonthName(i)}</option>)}
            </select>
            <select className="flex-1 px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 outline-none" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {reportType === 'khata' ? (
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex-1 min-h-[600px] flex flex-col">
           <table className="w-full text-left shrink-0">
              <thead className="bg-slate-50/50">
                 <tr className="font-black text-[9px] text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-8 py-6">Customer Account</th>
                    <th className="px-8 py-6 text-right">Liters Sold</th>
                    <th className="px-8 py-6 text-right">Bill</th>
                    <th className="px-8 py-6 text-right">Balance</th>
                    <th className="px-8 py-6"></th>
                 </tr>
              </thead>
           </table>
           <div className="flex-1">
              {filteredCustomers.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30">
                    <Search size={48} />
                    <p className="font-black text-[10px] uppercase tracking-[0.3em]">No customers found matching "{searchTerm}"</p>
                  </div>
                </div>
              ) : (
                <AutoSizer>
                  {({ height, width }) => (
                    <FixedSizeList
                      height={height}
                      itemCount={filteredCustomers.length}
                      itemSize={100} // Approximate height of KhataRow
                      width={width}
                      className="scrollbar-hide"
                    >
                      {Row}
                    </FixedSizeList>
                  )}
                </AutoSizer>
              )}
           </div>
        </div>
      ) : (
        <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest">P&L view is currently calculating based on standard logic.</div>
      )}
    </div>
  );
};

export default React.memo(Reports);
