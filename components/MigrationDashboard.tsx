
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Database, RefreshCcw, AlertTriangle, 
  CheckCircle, ArrowRight, Loader2, FileJson, Table
} from 'lucide-react';
import { migrationService } from '../services/migrationService';
import { formatPKR } from '../services/dataStore';

const MigrationDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sourceTotals, setSourceTotals] = useState<any>(null);
  const [migrationStatus, setMigrationStatus] = useState<Record<string, 'pending' | 'syncing' | 'completed' | 'error'>>({
    riders: 'pending',
    customers: 'pending',
    prices: 'pending',
    deliveries: 'pending',
    payments: 'pending',
    expenses: 'pending',
    archives: 'pending',
    auditLogs: 'pending',
    riderLoads: 'pending',
    closingRecords: 'pending'
  });

  const [statusMessage, setStatusMessage] = useState<string>('');

  const fetchBaseline = async () => {
    setLoading(true);
    setStatusMessage('Calculating source totals...');
    try {
      const totals = await migrationService.calculateSourceTotals();
      setSourceTotals(totals);
      setStatusMessage('Baseline established. Ready to copy.');
    } catch (err: any) {
      console.error("Baseline Error:", err);
      setStatusMessage(`Error: ${err.message || 'Failed to fetch baseline'}`);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!sourceTotals) {
      setStatusMessage('Please calculate totals first.');
      return;
    }
    
    setStatusMessage('Starting migration...');
    setLoading(true);
    try {
      const payload = await migrationService.getVaultPayload();
      console.log("Payload fetched:", Object.keys(payload));
      
      const entities = [
        { key: 'riders', data: payload.riders },
        { key: 'customers', data: payload.customers },
        { key: 'prices', data: payload.prices },
        { key: 'deliveries', data: payload.deliveries },
        { key: 'payments', data: payload.payments },
        { key: 'expenses', data: payload.expenses },
        { key: 'archives', data: payload.archives },
        { key: 'auditLogs', data: payload.auditLogs },
        { key: 'riderLoads', data: payload.riderLoads },
        { key: 'closingRecords', data: payload.closingRecords }
      ];

      for (const entity of entities) {
        if (!entity.data || entity.data.length === 0) {
          console.log(`Skipping ${entity.key} (no data)`);
          setMigrationStatus(prev => ({ ...prev, [entity.key]: 'completed' }));
          continue;
        }

        setStatusMessage(`Migrating ${entity.key}...`);
        setMigrationStatus(prev => ({ ...prev, [entity.key]: 'syncing' }));
        try {
          await migrationService.migrateEntity(entity.key, entity.data);
          setMigrationStatus(prev => ({ ...prev, [entity.key]: 'completed' }));
        } catch (err: any) {
          console.error(`Migration Error (${entity.key}):`, err);
          setMigrationStatus(prev => ({ ...prev, [entity.key]: 'error' }));
          setStatusMessage(`Error migrating ${entity.key}: ${err.message}`);
          // We continue with other entities even if one fails
        }
      }

      setStatusMessage('Migration process finished. Verify totals below.');
    } catch (err: any) {
      console.error("Migration Failed:", err);
      setStatusMessage(`Critical Migration Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [relationalTotals, setRelationalTotals] = useState<any>(null);

  const verifyMigration = async () => {
    setLoading(true);
    setStatusMessage('Verifying relational data...');
    try {
      const totals = await migrationService.calculateRelationalTotals();
      setRelationalTotals(totals);
      
      const variance = Math.abs((sourceTotals?.totalSales || 0) - totals.totalSales) + 
                       Math.abs((sourceTotals?.totalPayments || 0) - totals.totalPayments);
      
      if (variance === 0) {
        setStatusMessage('Verification Successful: 0 Variance. Data is identical.');
      } else {
        setStatusMessage(`Verification Warning: Variance of Rs. ${formatPKR(variance)} detected.`);
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      setStatusMessage(`Error: ${err.message || 'Failed to verify data'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white relative overflow-hidden border-4 border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10"><Database size={120}/></div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-4 rounded-3xl shadow-xl"><ShieldCheck size={32}/></div>
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Safe Migration Hub</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Relational Architecture Upgrade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Source: JSON Vault</p>
              <div className="flex items-center gap-3">
                <FileJson size={24} className="text-slate-500" />
                <span className="text-lg font-black italic tracking-tighter">dairy_vault.payload</span>
              </div>
            </div>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">Destination: Relational</p>
              <div className="flex items-center gap-3">
                <Table size={24} className="text-slate-500" />
                <span className="text-lg font-black italic tracking-tighter">Postgres Tables</span>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className={`mt-6 p-4 rounded-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-4 ${statusMessage.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
              {statusMessage.includes('Error') ? <AlertTriangle size={18}/> : <Loader2 size={18} className={loading ? 'animate-spin' : ''}/>}
              <p className="text-[10px] font-black uppercase tracking-widest">{statusMessage}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Baseline */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><RefreshCcw size={20}/></div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">1. Establish Baseline</h3>
          </div>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">Calculate totals from the current JSON system to ensure we have a target to match.</p>
          
          {sourceTotals ? (
            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Sales</span>
                <span className="text-sm font-black italic">Rs. {formatPKR(sourceTotals.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Total Payments</span>
                <span className="text-sm font-black italic">Rs. {formatPKR(sourceTotals.totalPayments)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Deliveries Count</span>
                <span className="text-sm font-black italic">{sourceTotals.deliveries}</span>
              </div>
            </div>
          ) : (
            <button onClick={fetchBaseline} disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : 'Calculate JSON Totals'}
            </button>
          )}
        </div>

        {/* Step 2: Migrate */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><ArrowRight size={20}/></div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">2. Run Migration</h3>
          </div>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">Copy data to new tables. This is a safe "read-only" operation for the vault.</p>
          
          <div className="space-y-2">
            {Object.entries(migrationStatus).map(([key, status]) => (
              <div key={key} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-500 uppercase">{key}</span>
                {status === 'completed' ? <CheckCircle size={14} className="text-green-500" /> : status === 'syncing' ? <Loader2 size={14} className="text-blue-500 animate-spin" /> : status === 'error' ? <AlertTriangle size={14} className="text-red-500" /> : <div className="w-3 h-3 rounded-full bg-slate-200" />}
              </div>
            ))}
          </div>

          <button onClick={runMigration} disabled={loading || !sourceTotals} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : 'Start Data Copy'}
          </button>
        </div>

        {/* Step 3: Verify */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><CheckCircle size={20}/></div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">3. Verify Integrity</h3>
          </div>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">Compare relational totals against JSON totals. Only proceed if variance is 0.</p>
          
          {relationalTotals ? (
            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Source Counts</p>
                    <p className="text-[10px] font-bold">Cust: {sourceTotals.customers} | Rid: {sourceTotals.riders}</p>
                    <p className="text-[10px] font-bold">Del: {sourceTotals.deliveries} | Pay: {sourceTotals.payments}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Relational Counts</p>
                    <p className="text-[10px] font-bold">Cust: {relationalTotals.customers} | Rid: {relationalTotals.riders}</p>
                    <p className="text-[10px] font-bold">Del: {relationalTotals.deliveries} | Pay: {relationalTotals.payments}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Relational Sales</span>
                  <span className="text-sm font-black italic">Rs. {formatPKR(relationalTotals.totalSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Relational Payments</span>
                  <span className="text-sm font-black italic">Rs. {formatPKR(relationalTotals.totalPayments)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-900 uppercase">Variance</span>
                  <span className={`text-sm font-black italic ${Math.abs((sourceTotals?.totalSales || 0) - relationalTotals.totalSales) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                    Rs. {formatPKR(Math.abs((sourceTotals?.totalSales || 0) - relationalTotals.totalSales))}
                  </span>
                </div>
              </div>

              {Math.abs((sourceTotals?.totalSales || 0) - relationalTotals.totalSales) === 0 && (
                <div className="p-4 bg-green-50 border-2 border-green-100 rounded-2xl flex items-center gap-3">
                  <ShieldCheck className="text-green-600" size={20} />
                  <p className="text-[10px] font-black text-green-700 uppercase">Data Integrity Verified</p>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={verifyMigration} 
              disabled={loading || !sourceTotals} 
              className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Run Verification Query'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationDashboard;
