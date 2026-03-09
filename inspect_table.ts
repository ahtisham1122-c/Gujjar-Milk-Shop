
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbiziyvbxiwyjrwrajpd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_N5-vgbq4VD3oX_l6GM3KJA_6UA_aaDy';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTable() {
  const { data, error } = await supabase
    .from('dp_riders')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in dp_riders:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('Table dp_riders is empty.');
  }
}

inspectTable();
