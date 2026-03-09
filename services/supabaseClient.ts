import { createClient } from '@supabase/supabase-js';

// Production Credentials provided by user
const SUPABASE_URL = 'https://kbiziyvbxiwyjrwrajpd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_N5-vgbq4VD3oX_l6GM3KJA_6UA_aaDy';

// Initialize the Supabase Client
// We use these as defaults but also allow overrides from localStorage if needed
const finalUrl = localStorage.getItem('sb_url') || SUPABASE_URL;
const finalKey = localStorage.getItem('sb_key') || SUPABASE_KEY;

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

/**
 * Validates if the cloud connection is correctly initialized
 */
export const isCloudConnected = () => {
  return finalUrl && finalKey && finalUrl.includes('supabase.co');
};