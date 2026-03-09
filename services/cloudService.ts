
import { CloudConfig } from '../types';

/**
 * DairyPro PK - Production Cloud Service (Supabase Edition)
 */
export const cloudService = {
  /**
   * Pushes the entire business state to Supabase as a JSON payload.
   */
  async pushToCloud(data: any, config: CloudConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.supabaseUrl || !config.supabaseKey || !config.businessId) {
      return { success: false, error: "Missing configuration" };
    }

    try {
      const url = `${config.supabaseUrl}/rest/v1/dairy_vault`;
      
      const payload = {
        id: config.businessId,
        payload: data,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates' // Supabase specific: Upsert on ID conflict
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        return { success: false, error: errData.message || "Failed to push data" };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Fetches the latest business state from the cloud.
   */
  async fetchFromCloud(config: CloudConfig): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!config.supabaseUrl || !config.supabaseKey || !config.businessId) {
      return { success: false, error: "Missing configuration" };
    }

    try {
      const url = `${config.supabaseUrl}/rest/v1/dairy_vault?id=eq.${config.businessId}&select=*`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return { success: false, error: "Cloud fetch failed" };
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        return { success: true, data: data[0].payload };
      }

      return { success: true, data: null }; // No data found for this business ID
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};
