
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbiziyvbxiwyjrwrajpd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_N5-vgbq4VD3oX_l6GM3KJA_6UA_aaDy';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function auditApp() {
  console.log('--- SYSTEM AUDIT START ---');

  // 1. Table Existence & Counts
  const tables = [
    'dp_riders', 'dp_customers', 'dp_prices', 'dp_deliveries', 
    'dp_payments', 'dp_expenses', 'dp_archives', 'dp_audit_logs', 
    'dp_rider_loads', 'dp_closing_records', 'dp_metadata'
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) console.log(`[TABLE] ${table}: ERROR ${error.code} - ${error.message}`);
    else console.log(`[TABLE] ${table}: OK (${count} rows)`);
  }

  // 2. Data Integrity Checks
  // Check for deliveries without customers
  const { data: orphanedDeliveries, error: delError } = await supabase
    .from('dp_deliveries')
    .select('id, customer_id')
    .limit(100);
  
  if (orphanedDeliveries) {
    const customerIds = [...new Set(orphanedDeliveries.map(d => d.customer_id))];
    const { data: existingCustomers } = await supabase.from('dp_customers').select('id').in('id', customerIds);
    const existingIds = new Set(existingCustomers?.map(c => c.id) || []);
    const orphans = orphanedDeliveries.filter(d => !existingIds.has(d.customer_id));
    console.log(`[INTEGRITY] Deliveries Sample Audit: ${orphans.length} orphans found in first 100.`);
  }

  // 3. Metadata Check
  const { data: meta } = await supabase.from('dp_metadata').select('*').eq('key', 'system_revision').single();
  console.log(`[METADATA] System Revision: ${meta?.value || 'MISSING'}`);

  // 4. Rider Check
  const { data: riders } = await supabase.from('dp_riders').select('id, name, pin').eq('deleted', false);
  console.log(`[AUTH] Active Riders: ${riders?.length || 0}`);
  riders?.forEach(r => console.log(`  - ${r.name} (PIN: ${r.pin})`));

  console.log('--- SYSTEM AUDIT END ---');
}

auditApp();
