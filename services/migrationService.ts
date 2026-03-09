
import { supabase } from './supabaseClient';
import { BaseEntity } from '../types';

/**
 * Gujjar Milk Shop - Migration Engine
 * Safely moves data from JSON 'dairy_vault' to Relational Tables.
 */
export const migrationService = {
  /**
   * Fetches the current monolithic payload.
   */
  async getVaultPayload() {
    const { data, error } = await supabase
      .from('dairy_vault')
      .select('payload')
      .eq('id', 'primary_business')
      .single();
    
    if (error) throw error;
    return data.payload;
  },

  /**
   * Performs a "Dry Run" to calculate totals from the JSON payload.
   * This establishes our "Source of Truth" (SoT).
   */
  async calculateSourceTotals() {
    const payload = await this.getVaultPayload();
    
    const totals = {
      customers: (payload.customers || []).length,
      riders: (payload.riders || []).length,
      deliveries: (payload.deliveries || []).length,
      payments: (payload.payments || []).length,
      totalSales: (payload.deliveries || []).reduce((sum: number, d: any) => sum + Number(d.totalAmount || 0), 0),
      totalPayments: (payload.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
      archives: (payload.archives || []).length,
    };

    return totals;
  },

  /**
   * Maps camelCase JSON fields to snake_case Postgres columns.
   */
  mapToSnakeCase(obj: any) {
    const snake: any = {};
    for (const key in obj) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snake[snakeKey] = obj[key];
    }
    return snake;
  },

  /**
   * Step-by-Step Migration Execution
   * We migrate one entity type at a time to ensure safety.
   */
  async migrateEntity(entityType: string, data: any[]) {
    if (!data || data.length === 0) return { success: true, count: 0 };

    // Map entity keys to prefixed table names
    const tableMap: Record<string, string> = {
      riders: 'dp_riders',
      customers: 'dp_customers',
      prices: 'dp_prices',
      deliveries: 'dp_deliveries',
      payments: 'dp_payments',
      expenses: 'dp_expenses',
      archives: 'dp_archives',
      auditLogs: 'dp_audit_logs',
      riderLoads: 'dp_rider_loads',
      closingRecords: 'dp_closing_records'
    };

    const tableName = tableMap[entityType] || `dp_${entityType.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;
    
    // Filter out items without IDs and map to snake_case
    const validData = data.filter(item => item && item.id);
    if (validData.length === 0) return { success: true, count: 0 };
    
    const mappedData = validData.map(item => this.mapToSnakeCase(item));

    // Batch upserts to handle large datasets
    const batchSize = 500;
    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (error) throw error;
    }

    return { success: true, count: data.length };
  },

  /**
   * Helper to fetch all rows from a table by paginating.
   */
  async fetchAllRows(tableName: string, columns: string = '*') {
    let allRows: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select(columns)
        .range(from, from + step - 1);

      if (error) throw error;
      if (data && data.length > 0) {
        allRows = [...allRows, ...data];
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }
    return allRows;
  },

  /**
   * Calculates totals from the new relational tables for verification.
   */
  async calculateRelationalTotals() {
    const [customers, riders, deliveries, payments, archives] = await Promise.all([
      supabase.from('dp_customers').select('id', { count: 'exact', head: true }),
      supabase.from('dp_riders').select('id', { count: 'exact', head: true }),
      this.fetchAllRows('dp_deliveries', 'total_amount'),
      this.fetchAllRows('dp_payments', 'amount'),
      supabase.from('dp_archives').select('id', { count: 'exact', head: true }),
    ]);

    const totalSales = (deliveries || []).reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const totalPayments = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      customers: customers.count || 0,
      riders: riders.count || 0,
      deliveries: (deliveries || []).length,
      payments: (payments || []).length,
      totalSales,
      totalPayments,
      archives: archives.count || 0,
    };
  }
};
