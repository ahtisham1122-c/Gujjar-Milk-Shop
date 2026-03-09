
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Save, Calendar, CheckCircle, Search, History, X, 
  ChevronRight, ChevronLeft, LayoutList, Target, Lock, ShieldCheck,
  Clock, Info, AlertCircle, PlusCircle, RefreshCcw, Calculator as CalcIcon, 
  TrendingUp, TrendingDown, Activity, Trash2, Zap, Pencil, AlertOctagon, 
  ArrowRight, Database, Printer
} from 'lucide-react';
import * as ReactWindow from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

const { FixedSizeList } = ReactWindow as any;
import { Customer, Delivery, PriceRecord, Rider, Payment, PaymentMode, UserRole, PaymentCycle, MonthlyArchive, RiderLoad } from '../types';
import { findPriceForDate, formatPKR, generateId } from '../services/dataStore';
import { calculateCycleBreakdown } from '../services/ledgerUtils';
import { printService } from '../services/printService';
import { SummaryReceipt } from './Receipts';

interface DeliveryEntryProps {
  customers: Customer[];
  deliveries: Delivery[];
  setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
  prices: PriceRecord[];
  riders: Rider[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  archives: MonthlyArchive[];
  riderId?: string; 
  role: UserRole; 
  balances: Record<string, number>;
  onOpenCalc?: (customer: Customer) => void;
  riderLoads: RiderLoad[];
}

const DeliveryRow = React.memo(({ 
  customer, 
  deliveries, 
  payments, 
  balances, 
  prices, 
  selectedDate, 
  deliveryInputs, 
  cashInputs, 
  setDeliveryInputs, 
  setCashInputs, 
  onOpenCalc, 
  setHistoryCustomerId, 
  setAdjustmentModalCustomer, 
  handleSaveEntry, 
  isOwner, 
  isSwipeView, 
  jumpToNextPending 
}: { 
  customer: Customer, 
  deliveries: Delivery[], 
  payments: Payment[], 
  balances: Record<string, number>, 
  prices: PriceRecord[], 
  selectedDate: string, 
  deliveryInputs: Record<string, string>, 
  cashInputs: Record<string, string>, 
  setDeliveryInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>, 
  setCashInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>, 
  onOpenCalc?: (customer: Customer) => void, 
  setHistoryCustomerId: (id: string) => void, 
  setAdjustmentModalCustomer: (c: Customer) => void, 
  handleSaveEntry: (c: Customer, autoNext: boolean) => void, 
  isOwner: boolean, 
  isSwipeView: boolean, 
  jumpToNextPending: () => void 
}) => {
  const dayDeliveries = useMemo(() => deliveries.filter(d => d.date === selectedDate), [deliveries, selectedDate]);
  const dayPayments = useMemo(() => payments.filter(p => p.date === selectedDate), [payments, selectedDate]);
  const originalD = useMemo(() => dayDeliveries.find(d => !d.isAdjustment), [dayDeliveries]);
  const isLocked = !!originalD;
  const totalBalance = balances[customer.id] || 0;
  
  const milkRate = useMemo(() => {
    if (isLocked && originalD) return originalD.priceAtTime;
    try { return findPriceForDate(selectedDate, customer, prices); } catch (e) { return -1; }
  }, [isLocked, originalD, selectedDate, customer, prices]);

  const rateError = milkRate === -1;
  const currentMilkVal = deliveryInputs[customer.id] || '';
  const currentCashVal = cashInputs[customer.id] || '';
  const draftLiters = parseFloat(currentMilkVal) || 0;
  const draftCash = parseFloat(currentCashVal) || 0;
  const draftBill = Math.round(draftLiters * (rateError ? 0 : milkRate));
  const projectedNewBalance = Math.round(totalBalance + draftBill - draftCash);
  const hasActiveDraft = draftLiters > 0 || draftCash > 0;

  const customerBreakdown = useMemo(() => calculateCycleBreakdown(customer, deliveries, payments), [customer, deliveries, payments]);

  const typicalLiters = useMemo(() => {
    const history = deliveries.filter(d => !d.isAdjustment).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    if (history.length < 3) return null;
    const val = history[0].liters;
    const isConsistent = history.every(h => Math.abs(h.liters - val) < 0.1);
    return isConsistent ? val : null;
  }, [deliveries]);

  return (
    <div className={`bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col transition-all duration-500 ${isSwipeView ? 'max-w-2xl mx-auto w-full' : 'mb-6 max-w-4xl mx-auto'}`}>
      <div className={`p-8 border-b border-slate-100 flex justify-between items-center ${isLocked ? 'bg-amber-50' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${isLocked ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'}`}>
            {isLocked ? <Lock size={24}/> : customer.deliveryOrder}
          </div>
          <div>
            <div className="flex items-center gap-2">
               <h4 className="font-black text-slate-900 text-lg tracking-tight leading-none">{customer.name}</h4>
               {hasActiveDraft && !isLocked && <Pencil size={12} className="text-blue-500 animate-pulse"/>}
               <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${customer.paymentCycle === PaymentCycle.DAILY ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{customer.paymentCycle}</span>
            </div>
            <p className="text-3xl font-black text-blue-600 mt-1" dir="rtl">{customer.urduName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onOpenCalc?.(customer)} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-green-600 rounded-2xl transition-all shadow-sm active:scale-95"><CalcIcon size={22} /></button>
          <button onClick={() => setHistoryCustomerId(customer.id)} className="p-4 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all shadow-sm active:scale-95"><History size={22} /></button>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className={`p-8 rounded-[2.5rem] border-4 flex flex-col gap-4 shadow-xl transition-all ${totalBalance > 0.01 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
           <div className="flex justify-between items-center">
              <div>
                 <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${totalBalance > 0.01 ? 'text-red-600/60' : 'text-green-600/60'}`}>
                   Account Status (Rs.) <span className="text-[8px] opacity-40 italic">بیلنس</span>
                 </p>
                 <p className={`text-5xl font-black italic tracking-tighter ${totalBalance > 0.01 ? 'text-red-600' : 'text-green-600'}`}>Rs. {formatPKR(Math.abs(totalBalance))}</p>
              </div>
              {isLocked && <div className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-right-4"><Lock size={12}/> Sealed</div>}
           </div>
        </div>

        {customerBreakdown.length > 0 && (
          <div className="p-6 bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4">
             <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2 rounded-xl">
                 <Database size={16} className="text-white" />
               </div>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Previous Dues Breakdown</h3>
             </div>
             <div className="grid grid-cols-1 gap-3">
               {customerBreakdown.map((cycle) => (
                 <div key={cycle.cycleName} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{cycle.cycleName}</span>
                   <span className={`text-sm font-black italic tracking-tighter ${cycle.outstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>
                     Rs. {formatPKR(Math.abs(cycle.outstanding))}
                     {cycle.outstanding < 0 && <span className="text-[8px] ml-1 not-italic opacity-60">(Adv)</span>}
                   </span>
                 </div>
               ))}
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <div className="flex justify-between items-end ml-4">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Milk (Liters)</label>
                <div className="flex gap-2">
                  {typicalLiters && !isLocked && <button onClick={() => setDeliveryInputs(prev => ({...prev, [customer.id]: typicalLiters.toString()}))} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase animate-pulse shadow-lg">Auto: {typicalLiters}L</button>}
                  <label className="text-[14px] font-bold text-blue-500/60 leading-none">دودھ</label>
                </div>
              </div>
              <div className="relative">
                <input type="number" step="0.5" inputMode="decimal" pattern="[0-9]*" disabled={isLocked || rateError} className={`w-full p-6 rounded-3xl border-4 text-4xl font-black text-center outline-none transition-all ${!isLocked && draftLiters > 0 ? 'bg-blue-100 border-blue-400' : 'bg-blue-50 border-blue-100 focus:border-blue-500'} disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-400`} value={deliveryInputs[customer.id] !== undefined ? deliveryInputs[customer.id] : (originalD?.liters.toString() || '')} onChange={e => setDeliveryInputs(prev => ({...prev, [customer.id]: e.target.value}))} placeholder="0.0" />
                {!isLocked && draftLiters > 0 && !rateError && (
                  <div className="absolute -top-4 right-6">
                    <p className={`text-[10px] font-black bg-white px-3 py-1 rounded-full border-2 shadow-lg uppercase tracking-tighter animate-bounce text-blue-600 border-blue-300`}>
                       + Rs. {formatPKR(draftBill)}
                    </p>
                  </div>
                )}
              </div>
           </div>
           <div className="space-y-2">
              <div className="flex justify-between items-end ml-4">
                <label className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none">Cash Received (Rs)</label>
                <label className="text-[14px] font-bold text-green-600/60 leading-none">نقد وصولی</label>
              </div>
              <input type="number" inputMode="numeric" pattern="[0-9]*" disabled={isLocked} className={`w-full p-6 rounded-3xl text-slate-900 text-4xl font-black text-center outline-none border-4 transition-all ${!isLocked && draftCash > 0 ? 'bg-green-100 border-green-400' : 'bg-slate-50 border-slate-100 focus:border-green-500'} disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-400`} value={cashInputs[customer.id] !== undefined ? cashInputs[customer.id] : ((dayPayments.find(p=>!p.isAdjustment)?.amount.toString()) || '')} onChange={e => setCashInputs(prev => ({...prev, [customer.id]: e.target.value}))} placeholder="Rs. 0" />
           </div>
        </div>

        {!isLocked && hasActiveDraft && !rateError && (
          <div className="p-6 bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-white/5 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Financial Impact / مالی اثر</p>
                <Zap size={16} className="text-amber-500 animate-pulse" />
             </div>
             <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <div>
                     <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Old Bal / پچھلا بقایا</p>
                     <span className="text-xs font-black text-slate-400 line-through">Rs. {formatPKR(Math.abs(totalBalance))}</span>
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-white uppercase mb-1 tracking-widest">New Closing / نیا بقایا</p>
                     <p className={`text-4xl font-black italic tracking-tighter ${projectedNewBalance > 0.01 ? 'text-red-400' : 'text-green-400'}`}>Rs. {formatPKR(Math.abs(projectedNewBalance))}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-2 justify-end px-4 py-2 rounded-2xl bg-white/5 border ${ (draftBill - draftCash) >= 0 ? 'border-red-900/50' : 'border-green-900/50'}`}>
                     {(draftBill - draftCash) >= 0 ? <TrendingUp size={16} className="text-red-400"/> : <TrendingDown size={16} className="text-green-400"/>}
                     <span className={`text-lg font-black italic ${ (draftBill - draftCash) >= 0 ? 'text-red-400' : 'text-green-400'}`}>{formatPKR(Math.abs(draftBill - draftCash))}</span>
                  </div>
                </div>
             </div>
          </div>
        )}

        <div className="pt-4">
          {rateError ? (
            <div className="w-full py-6 bg-amber-50 text-amber-600 rounded-[2rem] font-black uppercase text-xs flex flex-col items-center justify-center border-4 border-dashed border-amber-200">
              <AlertCircle size={32} className="mb-2"/> 
              <span>Rate Verification Required / ریٹ چیک کریں</span>
            </div>
          ) : !isLocked ? (
            <button onClick={() => handleSaveEntry(customer, isSwipeView)} className={`w-full py-6 rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all bg-blue-600 text-white hover:bg-slate-900`}>
              <Save size={20} /> Record & Lock Account
            </button>
          ) : (
            <div className="space-y-4">
              {isOwner ? (
                <button onClick={() => setAdjustmentModalCustomer(customer)} className="w-full py-6 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><RefreshCcw size={20} /> Admin Adjust Ledger</button>
              ) : (
                <div className="w-full py-6 bg-slate-100 text-slate-400 rounded-[2.5rem] font-black uppercase text-[10px] flex items-center justify-center gap-3 border-4 border-dashed border-slate-200"><ShieldCheck size={20} className="text-green-600"/> Audit Sealed</div>
              )}
              {isSwipeView && <button onClick={jumpToNextPending} className="w-full py-4 text-blue-600 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 animate-pulse">Skip to Next Pending <ArrowRight size={14}/></button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const DeliveryEntry: React.FC<DeliveryEntryProps> = ({ 
  customers, deliveries, setDeliveries, prices, riders, payments, setPayments, archives, riderId, role, balances, onOpenCalc, riderLoads
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [searchTerm, setSearchTerm] = useState('');
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);
  const [adjustmentModalCustomer, setAdjustmentModalCustomer] = useState<Customer | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [deliveryInputs, setDeliveryInputs] = useState<Record<string, string>>({});
  const [cashInputs, setCashInputs] = useState<Record<string, string>>({});
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [milkAdj, setMilkAdj] = useState('');
  const [cashAdj, setCashAdj] = useState('');
  
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
  const [currentIndex, setCurrentIndex] = useState(0);

  const isOwner = role === UserRole.OWNER;

  const handlePrintRoute = () => {
    printService.setPrintConfig('80', 'md');
    printService.triggerPrint(
      <SummaryReceipt 
        date={selectedDate}
        customers={customers}
        deliveries={deliveries.filter(d => d.date === selectedDate)}
        payments={payments.filter(p => p.date === selectedDate)}
        profile="80"
        fontSize="md"
        compact={true}
      />
    );
  };

  const indexedDeliveries = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    deliveries.forEach(d => {
      const list = map.get(d.customerId) || [];
      list.push(d);
      map.set(d.customerId, list);
    });
    return map;
  }, [deliveries]);

  const indexedPayments = useMemo(() => {
    const map = new Map<string, Payment[]>();
    payments.forEach(p => {
      const list = map.get(p.customerId) || [];
      list.push(p);
      map.set(p.customerId, list);
    });
    return map;
  }, [payments]);

  // --- DRAFT PERSISTENCE ENGINE ---
  useEffect(() => {
    const savedD = localStorage.getItem(`draft_d_${selectedDate}`);
    const savedC = localStorage.getItem(`draft_c_${selectedDate}`);
    if (savedD) setDeliveryInputs(JSON.parse(savedD));
    else setDeliveryInputs({});
    
    if (savedC) setCashInputs(JSON.parse(savedC));
    else setCashInputs({});
  }, [selectedDate]);

  useEffect(() => {
    if (Object.keys(deliveryInputs).length > 0) {
      localStorage.setItem(`draft_d_${selectedDate}`, JSON.stringify(deliveryInputs));
    } else {
      localStorage.removeItem(`draft_d_${selectedDate}`);
    }
  }, [deliveryInputs, selectedDate]);

  useEffect(() => {
    if (Object.keys(cashInputs).length > 0) {
      localStorage.setItem(`draft_c_${selectedDate}`, JSON.stringify(cashInputs));
    } else {
      localStorage.removeItem(`draft_c_${selectedDate}`);
    }
  }, [cashInputs, selectedDate]);

  const routeCustomers = useMemo(() => {
    return (customers || [])
      .filter(c => {
        const belongs = riderId ? c.riderId === riderId : true;
        const searchLower = searchTerm.toLowerCase();
        return c.active && belongs && (c.name.toLowerCase().includes(searchLower) || (c.urduName && c.urduName.includes(searchTerm)));
      })
      .sort((a, b) => a.deliveryOrder - b.deliveryOrder);
  }, [customers, riderId, searchTerm]);

  // PROGRESS CALCULATIONS
  const progressStats = useMemo(() => {
    const total = routeCustomers.length;
    const todayCompleted = routeCustomers.filter(c => 
      deliveries.some(d => d.customerId === c.id && d.date === selectedDate && !d.isAdjustment)
    );
    const completed = todayCompleted.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const firstPendingIdx = routeCustomers.findIndex(c => 
      !deliveries.some(d => d.customerId === c.id && d.date === selectedDate && !d.isAdjustment)
    );

    return { total, completed, percent, firstPendingIdx };
  }, [routeCustomers, deliveries, selectedDate]);

  const clearAllDrafts = () => {
    setDeliveryInputs({});
    setCashInputs({});
    localStorage.removeItem(`draft_d_${selectedDate}`);
    localStorage.removeItem(`draft_c_${selectedDate}`);
    setShowClearConfirm(false);
  };

  const jumpToNextPending = () => {
    if (progressStats.firstPendingIdx !== -1) {
      setCurrentIndex(progressStats.firstPendingIdx);
    }
  };

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const customer = routeCustomers[index];
    return (
      <div style={style}>
        {renderCustomerCard(customer, false)}
      </div>
    );
  };

  const handleSaveEntry = (customer: Customer, autoNext: boolean = false) => {
    const existingD = (deliveries || []).find(d => 
      d.customerId === customer.id && d.date === selectedDate && !d.isAdjustment
    );
    
    if (existingD) {
      alert(`Record Sealed: Entry already finalized for ${customer.name}.`);
      return;
    }

    const litersInput = parseFloat(deliveryInputs[customer.id] || '0');
    const cashInput = parseFloat(cashInputs[customer.id] || '0');
    
    if (isNaN(litersInput) || litersInput < 0) {
      alert("INVALID QUANTITY: Milk quantity cannot be negative.");
      return;
    }

    if (!isNaN(cashInput) && cashInput < 0) {
      alert("INVALID CASH: Cash received cannot be negative.");
      return;
    }
    
    let milkPrice: number;
    try {
      milkPrice = findPriceForDate(selectedDate, customer, prices);
    } catch (err: any) {
      alert(`PRICING ERROR: ${err.message}`);
      return;
    }

    const deliveryObj: Delivery = {
      id: generateId(),
      customerId: customer.id,
      date: selectedDate,
      liters: litersInput,
      priceAtTime: milkPrice,
      totalAmount: Math.round(litersInput * milkPrice * 100) / 100,
      riderId: customer.riderId,
      isLocked: true, 
      updatedAt: new Date().toISOString(),
      version: 1
    };

    setDeliveries(prev => [...prev, deliveryObj]);

    if (cashInput > 0) {
      const paymentObj: Payment = {
        id: generateId(),
        customerId: customer.id,
        date: selectedDate,
        amount: Math.round(cashInput),
        mode: PaymentMode.CASH,
        updatedAt: new Date().toISOString(),
        version: 1
      };
      setPayments(prev => [...prev, paymentObj]);
    }

    const newDInputs = { ...deliveryInputs };
    const newCInputs = { ...cashInputs };
    delete newDInputs[customer.id];
    delete newCInputs[customer.id];
    setDeliveryInputs(newDInputs);
    setCashInputs(newCInputs);

    if (autoNext) {
      setTimeout(() => {
        const remainingPendingIdx = routeCustomers.findIndex((c, i) => 
          i > currentIndex && !deliveries.some(d => d.customerId === c.id && d.date === selectedDate && !d.isAdjustment)
        );
        if (remainingPendingIdx !== -1) {
          setCurrentIndex(remainingPendingIdx);
        } else {
          const wrapPendingIdx = routeCustomers.findIndex(c => 
            !deliveries.some(d => d.customerId === c.id && d.date === selectedDate && !d.isAdjustment)
          );
          if (wrapPendingIdx !== -1) setCurrentIndex(wrapPendingIdx);
        }
      }, 300);
    }
  };

  const handleApplyAdjustment = (type: 'milk' | 'cash') => {
    if (!adjustmentModalCustomer) return;
    const customer = adjustmentModalCustomer;
    const adjAmount = parseFloat((type === 'milk' ? milkAdj : cashAdj) || '0');
    if (isNaN(adjAmount) || adjAmount === 0) {
      alert(`Please enter a valid ${type} adjustment amount.`);
      return;
    }
    if (type === 'milk') {
      let milkPrice: number;
      try { milkPrice = findPriceForDate(selectedDate, customer, prices); } 
      catch (err: any) { alert(`ADJUSTMENT ERROR: ${err.message}`); return; }
      const adjRecord: Delivery = {
        id: generateId(),
        customerId: customer.id,
        date: selectedDate,
        liters: adjAmount,
        priceAtTime: milkPrice,
        totalAmount: Math.round(adjAmount * milkPrice * 100) / 100,
        riderId: customer.riderId,
        isLocked: true,
        isAdjustment: true,
        adjustmentNote: adjustmentNote || "Owner Correction",
        updatedAt: new Date().toISOString(),
        version: 1
      };
      setDeliveries(prev => [...prev, adjRecord]);
    } else {
      const adjRecord: Payment = {
        id: generateId(),
        customerId: customer.id,
        date: selectedDate,
        amount: adjAmount,
        mode: PaymentMode.CASH,
        isAdjustment: true,
        adjustmentNote: adjustmentNote || "Owner Correction",
        updatedAt: new Date().toISOString(),
        version: 1
      };
      setPayments(prev => [...prev, adjRecord]);
    }
    setAdjustmentModalCustomer(null);
    setAdjustmentNote('');
    setMilkAdj('');
    setCashAdj('');
  };

  const renderCustomerCard = (customer: Customer, isSwipeView: boolean) => {
    if (!customer) return null;
    return (
      <DeliveryRow 
        key={customer.id}
        customer={customer}
        deliveries={indexedDeliveries.get(customer.id) || []}
        payments={indexedPayments.get(customer.id) || []}
        balances={balances}
        prices={prices}
        selectedDate={selectedDate}
        deliveryInputs={deliveryInputs}
        cashInputs={cashInputs}
        setDeliveryInputs={setDeliveryInputs}
        setCashInputs={setCashInputs}
        onOpenCalc={onOpenCalc}
        setHistoryCustomerId={setHistoryCustomerId}
        setAdjustmentModalCustomer={setAdjustmentModalCustomer}
        handleSaveEntry={handleSaveEntry}
        isOwner={isOwner}
        isSwipeView={isSwipeView}
        jumpToNextPending={jumpToNextPending}
      />
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-40 relative">
      <div onClick={jumpToNextPending} className="bg-white border-2 border-slate-100 rounded-[2rem] p-5 flex flex-col gap-3 shadow-sm no-print cursor-pointer hover:border-blue-300 transition-all active:scale-95">
         <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3">
               <Activity size={16} className="text-blue-500"/>
               <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Route Coverage / کوریج</h3>
            </div>
            <div className="flex items-center gap-4">
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{progressStats.completed} / {progressStats.total} Saved</p>
               <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${progressStats.percent === 100 ? 'bg-green-600 text-white shadow-lg' : 'bg-blue-100 text-blue-600'}`}>{progressStats.percent}%</span>
            </div>
         </div>
         <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5 relative">
            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${progressStats.percent === 100 ? 'bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.6)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'}`} style={{ width: `${progressStats.percent}%` }} />
            {progressStats.percent > 0 && progressStats.percent < 100 && <div className="absolute top-0 bottom-0 w-20 bg-white/20 animate-shimmer" style={{ left: `calc(${progressStats.percent}% - 20px)` }}></div>}
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-900 p-6 rounded-[3rem] shadow-xl">
          <input type="date" className={`border p-3 rounded-2xl font-black text-sm outline-none transition-all bg-white/10 border-white/20 text-white flex-shrink-0`} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={22} />
            <input type="text" placeholder="Search account..." className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={handlePrintRoute}
              className="p-4 bg-white/10 border border-white/20 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              title="Print Route Report"
            >
              <Printer size={20} />
              <span className="md:hidden text-[10px] font-black uppercase">Print</span>
            </button>
            <div className="flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 flex-1 md:flex-none">
              <button onClick={() => setViewMode('swipe')} className={`flex-1 md:flex-none p-3 px-5 rounded-xl transition-all ${viewMode === 'swipe' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}><Target size={22}/></button>
              <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none p-3 px-5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}><LayoutList size={22}/></button>
            </div>
          </div>
      </div>

      <div className="transition-all duration-300 flex-1 min-h-[600px]">
        {viewMode === 'swipe' ? (
          <div className="relative flex flex-col items-center">
            {routeCustomers[currentIndex] ? (
              <>
                {renderCustomerCard(routeCustomers[currentIndex], true)}
                <div className="mt-10 flex items-center gap-10">
                  <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)} className="w-20 h-20 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-xl disabled:opacity-20 active:scale-90 transition-all"><ChevronLeft size={32} /></button>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Navigation</p>
                    <div className="flex items-center gap-2"><span className="text-2xl font-black text-slate-900">{currentIndex + 1}</span><span className="text-slate-300">/</span><span className="text-lg font-black text-slate-400">{routeCustomers.length}</span></div>
                  </div>
                  <button disabled={currentIndex === routeCustomers.length - 1} onClick={() => setCurrentIndex(currentIndex + 1)} className="w-20 h-20 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-blue-600 shadow-xl disabled:opacity-20 active:scale-90 transition-all"><ChevronRight size={32} /></button>
                </div>
              </>
            ) : <p className="py-20 text-slate-300 font-black text-center w-full uppercase tracking-widest">No customers matching search.</p>}
          </div>
        ) : (
          <div className="h-full">
            {routeCustomers.length === 0 ? (
              <p className="py-20 text-slate-300 font-black text-center w-full uppercase tracking-widest">No customers matching search.</p>
            ) : (
              <AutoSizer>
                {({ height, width }) => (
                  <FixedSizeList
                    height={height}
                    itemCount={routeCustomers.length}
                    itemSize={750} // Approximate height of DeliveryRow
                    width={width}
                    className="scrollbar-hide"
                  >
                    {Row}
                  </FixedSizeList>
                )}
              </AutoSizer>
            )}
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-md border-8 border-red-500 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-red-500 text-white flex flex-col items-center text-center gap-4">
                 <AlertOctagon size={64} className="animate-bounce" />
                 <div><h3 className="font-black text-3xl tracking-tighter uppercase italic leading-none">Clear Route Drafts?</h3></div>
              </div>
              <div className="p-10 space-y-6">
                 <p className="text-sm font-bold text-slate-500 text-center leading-relaxed">This will permanently delete all unsaved entries for this route.</p>
                 <div className="flex flex-col gap-3">
                    <button onClick={clearAllDrafts} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all">Yes, Delete Everything</button>
                    <button onClick={() => setShowClearConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Keep My Progress</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {adjustmentModalCustomer && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[120] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-md border-8 border-orange-600 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-orange-600 text-white flex flex-col gap-2"><h3 className="font-black text-3xl tracking-tighter uppercase italic leading-none">Ledger Correction</h3></div>
              <div className="p-10 space-y-8">
                 <div className="bg-slate-50 p-6 rounded-3xl border-4 border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Account</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">{adjustmentModalCustomer.name}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-4">Milk Adj (Liters)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          className="w-full p-6 bg-blue-50 border-4 border-blue-100 rounded-[2rem] font-black text-2xl text-center outline-none focus:border-blue-500" 
                          placeholder="0.0" 
                          value={milkAdj} 
                          onChange={e => setMilkAdj(e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-green-600 uppercase tracking-widest ml-4">Cash Adj (PKR)</label>
                        <input 
                          type="number" 
                          className="w-full p-6 bg-green-50 border-4 border-green-100 rounded-[2rem] font-black text-2xl text-center outline-none focus:border-green-500" 
                          placeholder="0" 
                          value={cashAdj} 
                          onChange={e => setCashAdj(e.target.value)} 
                        />
                    </div>
                 </div>
                 <p className="text-[9px] font-bold text-slate-400 text-center uppercase">Use positive (+) to add, negative (-) to subtract</p>
                 <textarea className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-[2rem] font-bold text-base outline-none focus:border-orange-500" rows={2} placeholder="Reason..." value={adjustmentNote} onChange={e => setAdjustmentNote(e.target.value)} />
                 <div className="flex gap-4">
                    <button onClick={() => handleApplyAdjustment('milk')} className="flex-1 py-6 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] active:scale-95">Correct Milk</button>
                    <button onClick={() => handleApplyAdjustment('cash')} className="flex-1 py-6 bg-green-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] active:scale-95">Correct Cash</button>
                 </div>
                 <button onClick={() => setAdjustmentModalCustomer(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-[0.4em]">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {historyCustomerId && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl z-[150] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg border-8 border-slate-900 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div><h3 className="font-black text-2xl uppercase italic tracking-tighter leading-none">Account History</h3></div>
                 <button onClick={() => setHistoryCustomerId(null)} className="p-4 bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-hide">
                 {[
                   ...deliveries.filter(d => d.customerId === historyCustomerId).map(d => ({ ...d, type: 'milk', timestamp: d.updatedAt })),
                   ...payments.filter(p => p.customerId === historyCustomerId).map(p => ({ ...p, type: 'payment', timestamp: p.updatedAt }))
                 ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((item, idx) => (
                   <div key={idx} className={`flex gap-5 p-6 rounded-[2rem] border-4 transition-all ${item.isAdjustment ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.type === 'milk' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}><ClipboardList size={20}/></div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start"><p className="font-black text-slate-900 text-sm uppercase">{item.type === 'milk' ? 'Milk' : 'Cash'}</p></div>
                         <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Date: {new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0"><p className={`font-black text-xl italic tracking-tighter ${item.type === 'milk' ? 'text-red-500' : 'text-green-600'}`}>{item.type === 'milk' ? `${((item as any).liters).toFixed(1)}L` : `Rs.${(item as any).amount}`}</p></div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(500%); } } .animate-shimmer { animation: shimmer 2s infinite linear; }`}</style>
    </div>
  );
};

export default React.memo(DeliveryEntry);
