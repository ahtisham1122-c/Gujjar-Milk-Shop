
import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Search, Wallet, CheckCircle, AlertCircle, 
  MessageCircle, Clock, TrendingUp, X, ArrowRight,
  Filter, Calendar, Plus, User, Receipt, Printer, Milk, MapPin, Phone,
  Info, Landmark, Smartphone, Banknote, Settings2, Monitor
} from 'lucide-react';
import { Customer, Payment, PaymentCycle, UserRole, PaymentMode, Rider, MonthlyArchive, Delivery, PriceRecord } from '../types';
import { formatPKR, findPriceForDate, generateId } from '../services/dataStore';
import { calculateCycleBreakdown } from '../services/ledgerUtils';
import { printService } from '../services/printService';
import { IndividualReceipt } from './Receipts';

interface BillingTrackerProps {
  customers: Customer[];
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  balances: Record<string, number>;
  role: UserRole;
  riders: Rider[];
  riderFilterId: string;
  archives: MonthlyArchive[];
  deliveries: Delivery[];
  prices: PriceRecord[];
}

const BillingRow = React.memo(({ 
  customer, 
  deliveries, 
  payments, 
  balances, 
  handleQuickPayment, 
  handlePrint 
}: { 
  customer: Customer, 
  deliveries: Delivery[], 
  payments: Payment[], 
  balances: Record<string, number>, 
  handleQuickPayment: (c: Customer) => void, 
  handlePrint: (c: Customer) => void 
}) => {
  const bal = balances[customer.id] || 0;
  const breakdown = useMemo(() => calculateCycleBreakdown(customer, deliveries, payments), [customer, deliveries, payments]);

  return (
    <div className="bg-white rounded-[3rem] p-8 border-2 border-slate-100 flex flex-col gap-6 transition-all hover:border-blue-600 shadow-sm hover:shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-black text-slate-900 text-lg truncate">{customer.name}</h4>
          <p className="text-2xl font-bold text-blue-500" dir="rtl">{customer.urduName}</p>
        </div>
        <div className={`p-3 rounded-2xl bg-slate-50 text-slate-300`}>
            <Info size={20}/>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest relative z-10">Remaining Dues</p>
        <p className={`text-3xl font-black italic tracking-tighter relative z-10 mt-1 ${bal > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
            Rs. {formatPKR(bal)}
        </p>
      </div>

      {breakdown.length > 0 && (
        <div className="bg-slate-900 p-5 rounded-[2rem] border border-slate-800 space-y-3">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cycle Breakdown</p>
          <div className="space-y-2">
            {breakdown.map((cycle) => (
              <div key={cycle.cycleName} className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400">{cycle.cycleName}</span>
                <span className={cycle.outstanding > 0 ? 'text-red-400' : 'text-green-400'}>
                  Rs. {formatPKR(Math.abs(cycle.outstanding))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => handleQuickPayment(customer)}
            className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            Receive Payment
          </button>
          <button 
            onClick={() => handlePrint(customer)}
            className="py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <Printer size={14}/> 🖨 Print Receipt
          </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <Clock size={12} className="text-slate-400"/>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cycle: {customer.paymentCycle}</p>
      </div>
    </div>
  );
});

const BillingTracker: React.FC<BillingTrackerProps> = ({ 
  customers, payments, setPayments, balances, role, riders, riderFilterId, archives, deliveries, prices
}) => {
  const [selectedCycle, setSelectedCycle] = useState<PaymentCycle | 'ALL_PENDING'>('ALL_PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ 
    customerId: '', 
    amount: '', 
    note: '', 
    mode: PaymentMode.CASH 
  });
  const [printingCustomer, setPrintingCustomer] = useState<Customer | null>(null);
  
  // PRINT CONFIGURATION
  const [printProfile, setPrintProfile] = useState<'A4' | '80' | '58'>('80');
  const [printFontSize, setPrintFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  const isOwner = role === UserRole.OWNER;
  const today = new Date().toISOString().split('T')[0];

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

  const isPeriodClosed = useMemo(() => {
    const dt = new Date(today);
    return (archives || []).some(a => a.month === dt.getMonth() && a.year === dt.getFullYear());
  }, [today, archives]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesRider = riderFilterId === 'all' ? true : c.riderId === riderFilterId;
      const matchesCycle = selectedCycle === 'ALL_PENDING' ? (balances[c.id] > 0.01) : c.paymentCycle === selectedCycle;
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.urduName && c.urduName.includes(searchTerm));
      return c.active && matchesRider && matchesCycle && matchesSearch;
    }).sort((a, b) => (balances[b.id] || 0) - (balances[a.id] || 0));
  }, [customers, selectedCycle, searchTerm, balances, riderFilterId]);

  const stats = useMemo(() => {
    const cycleCustIds = filteredCustomers.map(c => c.id);
    const totalDues = cycleCustIds.reduce((sum, id) => sum + Math.max(0, balances[id] || 0), 0);
    return { totalDues: Math.round(totalDues) };
  }, [filteredCustomers, balances]);

  const handleQuickPayment = (customer: Customer) => {
    if (isPeriodClosed) {
        alert("Archive restricted. Payment cannot be added.");
        return;
    }
    setPaymentForm({
      customerId: customer.id,
      amount: Math.round(balances[customer.id] || 0).toString(),
      note: '',
      mode: PaymentMode.CASH
    });
    setIsModalOpen(true);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.customerId || isNaN(amount) || amount <= 0) {
        alert("INVALID PAYMENT: Amount must be greater than 0.");
        return;
    }

    const newPayment: Payment = {
      id: generateId(),
      customerId: paymentForm.customerId,
      amount: Math.round(amount),
      date: today,
      mode: paymentForm.mode,
      note: paymentForm.note,
      updatedAt: new Date().toISOString(),
      version: 1
    };

    setPayments([newPayment, ...payments]);
    setIsModalOpen(false);
    setPaymentForm({ customerId: '', amount: '', note: '', mode: PaymentMode.CASH });
  };

  const getSlipData = (customer: Customer) => {
    const now = new Date();
    const currentMonthDeliveries = deliveries.filter(d => {
        const dDate = new Date(d.date);
        return d.customerId === customer.id && dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
    });

    const totalMilk = currentMonthDeliveries.reduce((a, b) => a + (b.liters || 0), 0);
    let milkRate = 0;
    try {
        milkRate = findPriceForDate(today, customer, prices);
    } catch(e) {
        milkRate = 210; 
    }
    
    const milkAmount = Math.round(totalMilk * milkRate);
    const netTotal = balances[customer.id] || 0;
    const remainingBalance = Math.round(netTotal - milkAmount);

    return { totalMilk, milkRate, milkAmount, remainingBalance, netTotal };
  };

  const handlePrint = (customer: Customer) => {
    printService.setPrintConfig(printProfile, printFontSize);
    printService.triggerPrint(
      <IndividualReceipt 
        customer={customer}
        deliveries={deliveries}
        payments={payments}
        prices={prices}
        balances={balances}
        profile={printProfile}
        fontSize={printFontSize}
      />
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 pb-32">
      {/* WEB CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
         <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Collection Hub</h3>
            <button 
              onClick={() => setShowPrintSettings(!showPrintSettings)}
              className={`p-2 rounded-xl transition-all ${showPrintSettings ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              <Settings2 size={18}/>
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

      <div className="bg-slate-900 p-8 md:p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden no-print">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4">
               <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-4 rounded-3xl shadow-xl">
                     <CreditCard size={32}/>
                  </div>
                  <div>
                     <h2 className="text-3xl font-black tracking-tighter uppercase italic">Collection Hub</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                       {selectedCycle === 'ALL_PENDING' ? "Outstanding Ledger Debts" : `${selectedCycle} Cycle View`}
                     </p>
                  </div>
               </div>
               <p className="text-5xl font-black text-white italic tracking-tighter">Rs. {formatPKR(stats.totalDues)}</p>
            </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden no-print">
        <div className="flex bg-slate-100 p-1.5 rounded-[1.8rem] w-full md:w-auto overflow-x-auto">
          <button 
            onClick={() => setSelectedCycle('ALL_PENDING')} 
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedCycle === 'ALL_PENDING' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            All Pending
          </button>
          {Object.values(PaymentCycle).map(cycle => (
            <button 
              key={cycle}
              onClick={() => setSelectedCycle(cycle)} 
              className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${selectedCycle === cycle ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {cycle}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-80 flex gap-2">
           <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" placeholder="Search account..." 
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-700 outline-none focus:border-blue-600 shadow-inner"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />
           </div>
           <button className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
                <Search size={18} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {filteredCustomers.map(customer => (
          <BillingRow 
            key={customer.id}
            customer={customer}
            deliveries={indexedDeliveries.get(customer.id) || []}
            payments={indexedPayments.get(customer.id) || []}
            balances={balances}
            handleQuickPayment={handleQuickPayment}
            handlePrint={handlePrint}
          />
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-slate-300 opacity-50">
             <CheckCircle size={64} className="mb-4" />
             <p className="font-black text-lg uppercase tracking-[0.4em]">No Outstanding Debts Found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 no-print">
           <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-lg border-8 border-slate-900 animate-in zoom-in-95">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                 <h3 className="font-black text-2xl tracking-tighter uppercase italic">Record Payment</h3>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 rounded-full"><X size={20}/></button>
              </div>
              <form onSubmit={submitPayment} className="p-10 space-y-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Payment Method / ادائیگی کا طریقہ</label>
                    <div className="grid grid-cols-3 gap-3">
                       {[
                         { id: PaymentMode.CASH, label: 'Cash', icon: Banknote },
                         { id: PaymentMode.BANK, label: 'Bank', icon: Landmark },
                         { id: PaymentMode.WALLET, label: 'Wallet', icon: Smartphone }
                       ].map(mode => (
                         <button 
                           key={mode.id}
                           type="button"
                           onClick={() => setPaymentForm({...paymentForm, mode: mode.id})}
                           className={`p-4 rounded-2xl border-4 flex flex-col items-center justify-center gap-2 transition-all ${paymentForm.mode === mode.id ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}
                         >
                            <mode.icon size={24}/>
                            <span className="text-[9px] font-black uppercase tracking-widest">{mode.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Payment Amount (PKR)</label>
                    <input required type="number" className="w-full p-8 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-5xl text-center outline-none focus:border-blue-600" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Note (Optional)</label>
                    <input className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-2xl font-bold text-sm outline-none" value={paymentForm.note} onChange={e => setPaymentForm({...paymentForm, note: e.target.value})} placeholder="e.g. Received by Rider" />
                 </div>

                 <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-2xl shadow-2xl active:scale-95 transition-all">Receive & Seal Record</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(BillingTracker);
