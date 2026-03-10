
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Users, Wallet, LogOut, Settings, ReceiptText, Activity, Scale,
  Loader2, RefreshCcw, Container, ClipboardList, CreditCard,
  Power, Filter, CheckCircle, Fuel, ListChecks, Menu, X, ChevronRight, Grid3X3, TrendingUp,
  Warehouse, ShieldAlert, History, AlertTriangle, CloudRain, RotateCcw, Calculator,
  UserX, Shield, Zap, BarChart3
} from 'lucide-react';
import { supabase, isCloudConnected } from './services/supabaseClient';
import { 
  Customer, Rider, Delivery, Payment, PriceRecord, Expense, 
  UserRole, RiderLoad, RiderClosingRecord, MonthlyArchive, AuditLog, BaseEntity
} from './types';
import { getStoredData, saveToStore, generateId } from './services/dataStore';
import { migrationService } from './services/migrationService';
import { relationalDataService } from './services/relationalDataService';

// Components
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import DeliveryEntry from './components/DeliveryEntry';
import PriceManagement from './components/PriceManagement';
import StaffManagement from './components/StaffManagement';
import ExpenseManagement from './components/ExpenseManagement';
import Reports from './components/Reports';
import RiderClosing from './components/RiderClosing';
import ArchiveManager from './components/ArchiveManager';
import DispatchHub from './components/DispatchHub';
import BillingTracker from './components/BillingTracker';
import DailyLog from './components/DailyLog';
import Analytics from './components/Analytics';
import RiderCalculator from './components/RiderCalculator';
import NotTakenToday from './components/NotTakenToday';
import SessionIntelligence from './components/SessionIntelligence';
import BusinessInsights from './components/BusinessInsights';
import MigrationDashboard from './components/MigrationDashboard';
import { printService } from './services/printService';

const APP_LOGO = "https://i.postimg.cc/D8SFv02C/PHOTO_2026_02_21_21_44_10.jpg"; // Official Logo URL

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcSelectedCustomer, setCalcSelectedCustomer] = useState<Customer | null>(null);
  
  // HARDENED OCC State
  const [localRevision, setLocalRevision] = useState(() => Number(localStorage.getItem('localRevision') || '0'));
  const [cloudRevision, setCloudRevision] = useState(0);
  const [syncConflict, setSyncConflict] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<'verified' | 'syncing' | 'conflict'>('verified');

 
  
  // Auth & Global Filter
  const [currentUser, setCurrentUser] = useState<{role: UserRole, id?: string} | null>(null);
  const [globalFilterRiderId, setGlobalFilterRiderId] = useState<string>('all');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Business State
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredData('customers', []));
  const [riders, setRiders] = useState<Rider[]>(() => getStoredData('riders', []));
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => getStoredData('deliveries', []));
  const [payments, setPayments] = useState<Payment[]>(() => getStoredData('payments', []));
  const [prices, setPrices] = useState<PriceRecord[]>(() => getStoredData('prices', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredData('expenses', []));
  const [riderLoads, setRiderLoads] = useState<RiderLoad[]>(() => getStoredData('riderLoads', []));
  const [closingRecords, setClosingRecords] = useState<RiderClosingRecord[]>(() => getStoredData('closingRecords', []));
  const [archives, setArchives] = useState<MonthlyArchive[]>(() => getStoredData('archives', []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStoredData('auditLogs', []));


 // Refs to avoid stale closures in sync logic
  const customersRef = useRef<Customer[]>(customers);
  useEffect(() => { customersRef.current = customers; }, [customers]);
  const deliveriesByCustomer = useMemo(() => {
    const map: Record<string, Delivery[]> = {};
    deliveries.forEach(d => {
      if (!map[d.customerId]) map[d.customerId] = [];
      map[d.customerId].push(d);
    });
    return map;
  }, [deliveries]);

  const balances = useMemo(() => {
    const newBalances: Record<string, number> = {};
    if (!customers || customers.length === 0) return newBalances;
    
    customers.forEach(c => {
      const customerDeliveries = deliveriesByCustomer[c.id] || [];
      const customerPayments = payments.filter(p => p.customerId === c.id); // Payments are fewer, O(n) is okay for now but could be indexed too
      
      const totalDeliveries = customerDeliveries.reduce((sum, d) => sum + d.totalAmount, 0);
      const totalPayments = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const calc = (c.openingBalance || 0) + totalDeliveries - totalPayments;
      newBalances[c.id] = Math.round(calc * 100) / 100;
    });
    return newBalances;
  }, [customers, deliveriesByCustomer, payments]);

  const mergeStates = useCallback((local: any, remote: any) => {
    const rejectedWrites: AuditLog[] = [];
    const mergeCollection = <T extends BaseEntity>(localArr: T[], remoteArr: T[], type: string): T[] => {
      const map = new Map<string, T>();
      const constraintMap = new Map<string, string>();
      (remoteArr || []).forEach(item => {
        map.set(item.id, item);
        if (type === 'deliveries') {
          const d = item as unknown as Delivery;
          if (!d.isAdjustment) constraintMap.set(`${d.customerId}:${d.date}`, d.id);
        }
      });
      (localArr || []).forEach(localItem => {
        const remoteItem = map.get(localItem.id);
        if (type === 'deliveries' && !remoteItem) {
          const d = localItem as unknown as Delivery;
          if (!d.isAdjustment) {
            const existingId = constraintMap.get(`${d.customerId}:${d.date}`);
            if (existingId && existingId !== d.id) {
              rejectedWrites.push({
                id: generateId(),
                action: 'SYNC_REJECTED',
                entityId: d.id,
                entityType: 'Delivery',
                performedBy: 'System Engine',
                timestamp: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 0,
                conflictReason: 'CONSTRAINT_VIOLATION',
                newValue: d
              });
              return;
            }
          }
        }
        if (!remoteItem) { map.set(localItem.id, localItem); } 
        else {
          const isFinancialTier = type === 'deliveries' || type === 'payments' || type === 'prices';
          if (isFinancialTier) return; 
          const localTime = new Date(localItem.updatedAt).getTime();
          const remoteTime = new Date(remoteItem.updatedAt).getTime();
          if (localTime > remoteTime && !remoteItem.deleted) { map.set(localItem.id, localItem); }
        }
      });
      return Array.from(map.values()).filter(item => {
        if (!item.deleted) return true;
        const deletedTime = new Date(item.updatedAt).getTime();
        return deletedTime > (Date.now() - (30 * 24 * 60 * 60 * 1000));
      });
    };
    const finalAuditLogs = mergeCollection(local.auditLogs, remote.auditLogs, 'auditLogs');
    return {
      customers: mergeCollection(local.customers, remote.customers, 'customers'),
      riders: mergeCollection(local.riders, remote.riders, 'riders'),
      deliveries: mergeCollection(local.deliveries, remote.deliveries, 'deliveries'),
      payments: mergeCollection(local.payments, remote.payments, 'payments'),
      prices: mergeCollection(local.prices, remote.prices, 'prices'),
      expenses: mergeCollection(local.expenses, remote.expenses, 'expenses'),
      riderLoads: mergeCollection(local.riderLoads, remote.riderLoads, 'riderLoads'),
      closingRecords: mergeCollection(local.closingRecords, remote.closingRecords, 'closingRecords'),
      archives: mergeCollection(local.archives, remote.archives, 'archives'),
      auditLogs: [...finalAuditLogs, ...rejectedWrites],
      revision: Math.max(local.revision || 0, remote.revision || 0)
    };
  }, []);

  const fetchCloudData = useCallback(async (silent = false) => {
    if (!isCloudConnected()) { setIsHydrated(true); return; }
    if (!silent) setLoading(true);
    try {
      // Delta Sync: only fetch what's new since localRevision
      const p = await relationalDataService.fetchAll(localRevision);
      const rev = await relationalDataService.getRevision();
      
      console.log("Sync Check:", { localRevision, cloudRevision: rev, incomingCount: p.customers.length });

      const activeOnly = <T extends BaseEntity>(arr: T[]) => (arr || []).filter(item => !item.deleted);
      
      const updateCollection = <T extends BaseEntity>(current: T[], incoming: T[]) => {
        if (!incoming || incoming.length === 0) return current;
        const map = new Map(current.map(i => [i.id, i]));
        incoming.forEach(i => map.set(i.id, i));
        return Array.from(map.values()).filter(i => !i.deleted);
      };

      if (localRevision === 0) {
        // Full load only if cloud has data (revision > 0)
        // SAFETY: Only overwrite if cloud actually has customers, or if local is empty
        const currentLocalCount = customersRef.current.length;
        if (rev > 0 && (p.customers.length > 0 || currentLocalCount === 0)) {
          setCustomers(activeOnly(p.customers));
          setRiders(activeOnly(p.riders));
          setDeliveries(activeOnly(p.deliveries));
          setPayments(activeOnly(p.payments));
          setPrices(activeOnly(p.prices));
          setExpenses(activeOnly(p.expenses));
          setRiderLoads(activeOnly(p.riderLoads));
          setClosingRecords(activeOnly(p.closingRecords));
          setArchives(activeOnly(p.archives));
          setAuditLogs(activeOnly(p.auditLogs));
        } else if (rev === 0 && currentLocalCount > 0) {
          console.warn("Cloud revision is 0 but local has data. This might be a fresh DB. Will push local data shortly.");
        } else if (rev > 0 && p.customers.length === 0 && currentLocalCount > 0) {
          console.warn("Cloud is empty but local has data. Skipping overwrite to prevent data loss. Sync will upload local data.");
        }
      } else if (localRevision > 0) {
        // Delta update
        setCustomers(prev => updateCollection(prev, p.customers));
        setRiders(prev => updateCollection(prev, p.riders));
        setDeliveries(prev => updateCollection(prev, p.deliveries));
        setPayments(prev => updateCollection(prev, p.payments));
        setPrices(prev => updateCollection(prev, p.prices));
        setExpenses(prev => updateCollection(prev, p.expenses));
        setRiderLoads(prev => updateCollection(prev, p.riderLoads));
        setClosingRecords(prev => updateCollection(prev, p.closingRecords));
        setArchives(prev => updateCollection(prev, p.archives));
        setAuditLogs(prev => updateCollection(prev, p.auditLogs));
      }
      
      if (rev > 0) {
        setLocalRevision(rev);
        localStorage.setItem('localRevision', rev.toString());
        setCloudRevision(rev);
      }
      setSyncConflict(false);
      setIntegrityStatus('verified');
      setLastSynced(new Date().toLocaleTimeString());
      setIsHydrated(true);
    } catch (err) { console.error("Cloud fetch error:", err); } finally { setLoading(false); }
  }, [localRevision]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToStore('customers', customers);
      saveToStore('riders', riders);
      saveToStore('deliveries', deliveries);
      saveToStore('payments', payments);
      saveToStore('prices', prices);
      saveToStore('expenses', expenses);
      saveToStore('riderLoads', riderLoads);
      saveToStore('closingRecords', closingRecords);
      saveToStore('archives', archives);
      saveToStore('auditLogs', auditLogs);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [customers, riders, deliveries, payments, prices, expenses, riderLoads, closingRecords, archives, auditLogs]);

  const onCloseMonth = useCallback(async (year: number, month: number) => {
    const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
    const confirm = window.confirm(`CRITICAL ACTION: Are you sure you want to HARD-CLOSE ${monthName} ${year}?\n\nThis will:\n1. Archive all current deliveries, payments, and expenses.\n2. Carry forward current balances as new Opening Balances.\n3. Clear active ledger for the new month.\n\nTHIS ACTION CANNOT BE UNDONE.`);
    
    if (!confirm) return;

    setLoading(true);
    try {
      const closingBalances = { ...balances };
      
      const newArchive: MonthlyArchive = {
        id: generateId(),
        year,
        month,
        deliveries: [...deliveries],
        payments: [...payments],
        expenses: [...expenses],
        closingBalances,
        updatedAt: new Date().toISOString(),
        version: 1
      };

      // Atomic State Update
      const updatedCustomers = customers.map(c => ({
        ...c,
        openingBalance: closingBalances[c.id] || 0,
        updatedAt: new Date().toISOString(),
        version: (c.version || 0) + 1
      }));

      setArchives(prev => [...prev, newArchive]);
      setCustomers(updatedCustomers);
      setDeliveries([]);
      setPayments([]);
      setExpenses([]);
      setRiderLoads([]);
      setClosingRecords([]);
      
      // Log the audit
      const auditEntry: AuditLog = {
        id: generateId(),
        action: 'CREATE',
        entityId: `${year}-${month}`,
        entityType: 'System',
        performedBy: currentUser?.role || 'System',
        timestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        newValue: { action: 'MONTH_CLOSE', year, month }
      };
      setAuditLogs(prev => [...prev, auditEntry]);

      alert(`Success: ${monthName} has been archived. New ledger is active.`);
    } catch (err) {
      console.error("Close Month Error:", err);
      alert("System Error: Failed to close period. Check connection.");
    } finally {
      setLoading(false);
    }
  }, [balances, deliveries, payments, expenses, archives, customers, currentUser, riders]);

  const resolveConflict = async () => {
    setLoading(true);
    try {
      const remotePayload = await relationalDataService.fetchAll();
      const remoteRevision = await relationalDataService.getRevision();
      const localState = { customers, riders, deliveries, payments, prices, expenses, riderLoads, closingRecords, archives, auditLogs, revision: localRevision };
      const merged = mergeStates(localState, { ...remotePayload, revision: remoteRevision });
      setCustomers(merged.customers.filter(i => !i.deleted));
      setDeliveries(merged.deliveries.filter(i => !i.deleted));
      setPayments(merged.payments.filter(i => !i.deleted));
      setRiders(merged.riders.filter(i => !i.deleted));
      setPrices(merged.prices.filter(i => !i.deleted));
      setExpenses(merged.expenses.filter(i => !i.deleted));
      setRiderLoads(merged.riderLoads.filter(i => !i.deleted));
      setClosingRecords(merged.closingRecords.filter(i => !i.deleted));
      setArchives(merged.archives.filter(i => !i.deleted));
      setAuditLogs(merged.auditLogs.filter(i => !i.deleted));
      const nextRev = merged.revision + 1;
      setLocalRevision(nextRev);
      setCloudRevision(nextRev);
      setSyncConflict(false);
      setIntegrityStatus('verified');
      
      await relationalDataService.syncAll(merged);
      await relationalDataService.updateRevision(nextRev);
    } catch (e) { console.error("Reconcile Failed", e); } finally { setLoading(false); }
  };

  const performImmediateSync = useCallback(async (localState: any) => {
    if (!isCloudConnected() || !currentUser || syncConflict) return;
    setSyncing(true);
    setIntegrityStatus('syncing');
    try {
      const remoteRevision = await relationalDataService.getRevision();
      if (remoteRevision > localRevision) {
        setSyncConflict(true);
        setCloudRevision(remoteRevision);
        setIntegrityStatus('conflict');
        setSyncing(false);
        return;
      }
      const nextRevision = localRevision + 1;
      
      // Relational Sync
      await relationalDataService.syncAll(localState);
      await relationalDataService.updateRevision(nextRevision);

      setLocalRevision(nextRevision);
      setCloudRevision(nextRevision);
      setIntegrityStatus('verified');
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) { console.error("Sync Failure:", err); } finally { setSyncing(false); }
  }, [currentUser, localRevision, syncConflict]);

  useEffect(() => {
    if (!isHydrated || !currentUser || syncConflict) return; 
    const debounceSync = () => {
      const payload = { customers, riders, deliveries, payments, prices, expenses, riderLoads, closingRecords, archives, auditLogs };
      performImmediateSync(payload);
    };
    const timeoutId = setTimeout(debounceSync, 4000); 
    return () => clearTimeout(timeoutId);
  }, [customers, riders, deliveries, payments, prices, expenses, riderLoads, closingRecords, archives, auditLogs, isHydrated, currentUser, performImmediateSync, syncConflict]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(false);
    try {
      const trimmedPin = pinInput.trim();
      
      // 1. Owner Login (Master PIN)
      if (trimmedPin === '1552') { 
        setCurrentUser({ role: UserRole.OWNER }); 
        await fetchCloudData(); 
        return; 
      }
      
      // 2. Rider Login - Fetch riders to validate
      const ridersData = await relationalDataService.fetchTable('dp_riders');
      
      const matchedRider = (ridersData || []).find((r: Rider) => {
        const dbPin = String(r.pin || '').trim();
        const inputPin = trimmedPin;
        const paddedInputPin = inputPin.padStart(4, '0');
        return (dbPin === inputPin || dbPin === paddedInputPin) && !r.deleted;
      });
      
      if (matchedRider) {
        // Use the same hydration logic as the owner
        setCurrentUser({ role: UserRole.RIDER, id: matchedRider.id });
        setGlobalFilterRiderId(matchedRider.id);
        await fetchCloudData();
        setActiveTab('milk');
      } else {
        console.warn("Login Failed: No matching rider found for PIN", trimmedPin);
        setLoginError(true);
      }
    } catch (err) { 
      console.error("Critical Login Error:", err);
      setLoginError(true); 
    } finally { 
      setIsLoggingIn(false); 
      setPinInput(''); 
    }
  };

  const performLogout = () => { setCurrentUser(null); setIsHydrated(false); setActiveTab('dashboard'); };
  const openCalculatorWithCustomer = (customer: Customer) => { setCalcSelectedCustomer(customer); setIsCalcOpen(true); };

  const renderContent = () => {
    if (loading) return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
         <Loader2 className="text-blue-600 animate-spin mb-4" size={48} />
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 animate-pulse">Verifying Ledger Integrity...</p>
      </div>
    );
    if (!currentUser) return null;
    const effectiveRiderId = currentUser.role === UserRole.OWNER ? (globalFilterRiderId === 'all' ? undefined : globalFilterRiderId) : currentUser.id;

    switch (activeTab) {
      case 'dashboard': return <Dashboard customers={customers} deliveries={deliveries} payments={payments} expenses={expenses} riders={riders} lockedMonths={[]} onCloseMonth={onCloseMonth} role={currentUser.role} closingRecords={closingRecords} balances={balances} riderFilterId={globalFilterRiderId} setActiveTab={setActiveTab} />;
      case 'intelligence': return <SessionIntelligence riders={riders} customers={customers} deliveries={deliveries} payments={payments} riderLoads={riderLoads} role={currentUser.role} />;
      case 'milk': return <DeliveryEntry customers={customers} deliveries={deliveries} setDeliveries={setDeliveries} prices={prices} riders={riders} payments={payments} setPayments={setPayments} archives={archives} riderId={effectiveRiderId} role={currentUser.role} balances={balances} onOpenCalc={openCalculatorWithCustomer} riderLoads={riderLoads} />;
      case 'billing': return <BillingTracker customers={customers} payments={payments} setPayments={setPayments} balances={balances} role={currentUser.role} riders={riders} riderFilterId={globalFilterRiderId} archives={archives} deliveries={deliveries} prices={prices} />;
      case 'dispatch': return <DispatchHub riderLoads={riderLoads} setRiderLoads={setRiderLoads} riders={riders} role={currentUser.role} riderFilterId={globalFilterRiderId} archives={archives} />;
      case 'audit': return <RiderClosing riders={riders} customers={customers} deliveries={deliveries} setDeliveries={setDeliveries} payments={payments} setPayments={setPayments} expenses={expenses} closingRecords={closingRecords} setClosingRecords={setClosingRecords} riderLoads={riderLoads} setRiderLoads={setRiderLoads} role={currentUser.role} setActiveTab={setActiveTab} riderFilterId={globalFilterRiderId} />;
      case 'expenses': return <ExpenseManagement expenses={expenses} setExpenses={setExpenses} riders={riders} role={currentUser.role} riderFilterId={globalFilterRiderId} archives={archives} />;
      case 'log': return <DailyLog deliveries={deliveries} payments={payments} customers={customers} riders={riders} riderFilterId={globalFilterRiderId} role={currentUser.role} />;
      case 'khata': return <Reports customers={customers} deliveries={deliveries} payments={payments} expenses={expenses} riders={riders} archives={archives} balances={balances} riderFilterId={globalFilterRiderId} />;
      case 'customers': return <CustomerManagement customers={customers} setCustomers={setCustomers} riders={riders} deliveries={deliveries} payments={payments} balances={balances} role={currentUser.role} riderFilterId={globalFilterRiderId} />;
      case 'analytics': return <Analytics customers={customers} deliveries={deliveries} payments={payments} riders={riders} riderFilterId={globalFilterRiderId} balances={balances} />;
      case 'insights': return <BusinessInsights archives={archives} deliveries={deliveries} payments={payments} customers={customers} riders={riders} riderFilterId={globalFilterRiderId} />;
      case 'notTaken': return <NotTakenToday customers={customers} deliveries={deliveries} riders={riders} riderFilterId={globalFilterRiderId} archives={archives} />;
      case 'setup': return (
          <div className="p-8 space-y-8">
            <StaffManagement riders={riders} setRiders={setRiders} role={currentUser.role} riderId={effectiveRiderId} customers={customers} balances={balances} />
            <PriceManagement prices={prices} setPrices={setPrices} customers={customers} deliveries={deliveries} setDeliveries={setDeliveries} />
            <ArchiveManager archives={archives} riders={riders} customers={customers} onCloseMonth={onCloseMonth} role={currentUser.role} />
            {currentUser.role === UserRole.OWNER && <MigrationDashboard />}
            <div className="bg-red-50 p-10 rounded-[3rem] border-4 border-red-100 flex flex-col items-center text-center gap-6">
              <LogOut size={48} className="text-red-500" />
              <button onClick={performLogout} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all">Sign Out</button>
            </div>
          </div>
      );
      default: return null;
    }
  };

  if (!currentUser) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-md space-y-8 animate-in zoom-in-95">
          <div className="text-center space-y-4">
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Gujjar Milk Shop</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Appp - Secure Access</p>
          </div>
          <div className="space-y-4">
            <input 
              type="password" placeholder="PIN" disabled={isLoggingIn}
              className={`w-full p-6 bg-slate-50 border-4 ${loginError ? 'border-red-100' : 'border-slate-100'} rounded-3xl text-center text-4xl tracking-[0.5em] font-black outline-none focus:border-blue-600 transition-all`}
              value={pinInput} onChange={e => setPinInput(e.target.value)} autoFocus
            />
            {loginError && <p className="text-center text-red-500 text-[10px] font-black uppercase">Invalid PIN. Access Denied.</p>}
          </div>
          <button type="submit" disabled={isLoggingIn} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center">
             {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Open Vault'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden safe-top safe-bottom bg-slate-50">
      <header className="bg-white border-b border-slate-200 h-24 flex items-center px-6 sticky top-0 z-[60] shadow-sm">
        <div className="flex flex-col flex-1">
           <h1 className="text-base font-black text-slate-900 uppercase tracking-tighter leading-none">
             {currentUser.role === UserRole.OWNER ? 'Gujjar Milk Shop HQ' : riders.find(r => r.id === currentUser.id)?.name}
           </h1>
           <div className="flex items-center gap-2 mt-1.5">
             <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${integrityStatus === 'verified' ? 'bg-green-50 border-green-200 text-green-600' : integrityStatus === 'syncing' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                <Shield size={8} />
                <span className="text-[7px] font-black uppercase tracking-widest">
                  {integrityStatus === 'verified' ? 'Verified' : integrityStatus === 'syncing' ? 'Syncing' : 'Drift Detected'}
                </span>
             </div>
             {localRevision === 0 && customers.length > 0 && (
               <button 
                 onClick={() => performImmediateSync({ customers, riders, deliveries, payments, prices, expenses, riderLoads, closingRecords, archives, auditLogs })}
                 className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[7px] font-black uppercase animate-pulse shadow-lg"
               >
                 Push Local Data
               </button>
             )}
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
               Rev {localRevision} {syncing ? '' : `• ${lastSynced || 'Now'}`}
             </p>
           </div>
        </div>
        <button onClick={() => fetchCloudData(false)} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-90 shadow-sm">
          <RefreshCcw size={22} className={syncing ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-44 scrollbar-hide">
        {syncConflict && (
          <div className="bg-red-600 text-white p-4 flex items-center justify-between animate-in slide-in-from-top">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20}/>
              <div>
                <p className="text-[10px] font-black uppercase">Sync Conflict: Cloud Rev {cloudRevision} Detected</p>
                <p className="text-[8px] opacity-80">Local version is outdated. Atomic merge required to prevent data overwrite.</p>
              </div>
            </div>
            <button onClick={resolveConflict} className="bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
              <RotateCcw size={12}/> Reconcile Ledger
            </button>
          </div>
        )}
        {renderContent()}
      </main>

      <button 
        onClick={() => setIsCalcOpen(true)}
        className="fixed bottom-32 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[110] active:scale-90 transition-all border-4 border-white no-print"
      >
        <Calculator size={28} />
      </button>

      <RiderCalculator 
        isOpen={isCalcOpen} 
        onClose={() => { setIsCalcOpen(false); setCalcSelectedCustomer(null); }} 
        selectedCustomer={calcSelectedCustomer}
        prices={prices}
        balances={balances}
      />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-6 flex justify-between items-center z-[70] safe-bottom shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        {(currentUser.role === UserRole.OWNER ? [
            { id: 'dashboard', label: 'HQ', icon: LayoutDashboard },
            { id: 'milk', label: 'Entry', icon: ClipboardList },
        ] : [{ id: 'milk', label: 'Entry', icon: ClipboardList }]).map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center gap-2 transition-all flex-1 ${activeTab === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`p-3 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl scale-110' : 'bg-transparent'}`}><item.icon size={22} /></div>
            <span className={`text-[9px] font-black uppercase tracking-tighter`}>{item.label}</span>
          </button>
        ))}
        <button onClick={() => setIsMoreMenuOpen(true)} className={`flex flex-col items-center gap-2 transition-all flex-1 ${isMoreMenuOpen ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`p-3 rounded-2xl transition-all duration-300 ${isMoreMenuOpen ? 'bg-blue-600 text-white shadow-xl scale-110' : 'bg-transparent'}`}><Menu size={22} /></div>
            <span className={`text-[9px] font-black uppercase tracking-tighter`}>Options</span>
        </button>
      </nav>

      {isMoreMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[80] animate-in fade-in duration-300" onClick={() => setIsMoreMenuOpen(false)}>
           <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[4rem] p-10 space-y-8 animate-in slide-in-from-bottom-20 duration-500" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Operations</h3>
                 <button onClick={() => setIsMoreMenuOpen(false)} className="p-3 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {(currentUser.role === UserRole.OWNER ? [
                    { id: 'intelligence', label: 'Live Pulse', icon: Zap },
                    { id: 'billing', label: 'Payments', icon: CreditCard },
                    { id: 'dispatch', label: 'Issuance', icon: Container },
                    { id: 'audit', label: 'Closing', icon: Scale },
                    { id: 'expenses', label: 'Expenses', icon: Fuel },
                    { id: 'log', label: 'History', icon: ReceiptText },
                    { id: 'khata', label: 'Ledger', icon: ClipboardList },
                    { id: 'notTaken', label: 'Missing Drops', icon: UserX },
                    { id: 'customers', label: 'Clients', icon: Users },
                    { id: 'analytics', label: 'Trends', icon: Activity },
                    { id: 'insights', label: 'Business Insights', icon: BarChart3 },
                    { id: 'setup', label: 'Setup', icon: Settings },
                 ] : [{id: 'setup', label: 'Sign Out', icon: Power}]).map(item => (
                    <button key={item.id} onClick={() => { if (item.id === 'setup' && currentUser.role !== UserRole.OWNER) performLogout(); else setActiveTab(item.id); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all border-2 border-transparent ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'bg-slate-50 text-slate-500'}`}>
                        <item.icon size={28} className="mb-3" />
                        <span className="text-[10px] font-black uppercase text-center leading-tight">{item.label}</span>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
