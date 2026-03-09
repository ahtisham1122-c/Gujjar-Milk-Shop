
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbiziyvbxiwyjrwrajpd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_N5-vgbq4VD3oX_l6GM3KJA_6UA_aaDy';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkVault() {
  console.log('--- VAULT INSPECTION ---');
  const { data, error } = await supabase
    .from('dairy_vault')
    .select('payload')
    .eq('id', 'primary_business')
    .single();
  
  if (error) {
    console.log(`Error: ${error.message}`);
    return;
  }

  const p = data.payload;
  console.log(`Customers: ${p.customers?.length || 0}`);
  console.log(`Riders: ${p.riders?.length || 0}`);
  console.log(`Deliveries: ${p.deliveries?.length || 0}`);
  console.log(`Payments: ${p.payments?.length || 0}`);
  console.log(`Expenses: ${p.expenses?.length || 0}`);
  console.log(`Archives: ${p.archives?.length || 0}`);
  console.log(`Audit Logs: ${p.auditLogs?.length || 0}`);
  console.log(`Rider Loads: ${p.riderLoads?.length || 0}`);
  console.log(`Closing Records: ${p.closingRecords?.length || 0}`);
  console.log('--- END VAULT INSPECTION ---');
}

checkVault();
