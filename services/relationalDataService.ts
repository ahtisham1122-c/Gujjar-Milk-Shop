
import { supabase } from './supabaseClient';

/**
 * DairyPro PK - Relational Data Service
 * Handles granular persistence to Postgres tables.
 */
export const relationalDataService = {
  /**
   * Maps camelCase (JS) to snake_case (Postgres)
   */
  toSnakeCase(obj: any) {
    const snake: any = {};
    for (const key in obj) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snake[snakeKey] = obj[key];
    }
    return snake;
  },

  /**
   * Maps snake_case (Postgres) to camelCase (JS)
   */
  toCamelCase(obj: any) {
    const camel: any = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camel[camelKey] = obj[key];
    }
    return camel;
  },

  /**
   * Fetches a single table with pagination and optional revision filter.
   */
  async fetchTable(tableName: string, sinceRevision: number = 0, dateLimit: string | null = null) {
    let allRows: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from(tableName).select('*');
      
      if (sinceRevision > 0) {
        query = query.gt('revision', sinceRevision);
      }

      if (dateLimit && tableName === 'dp_deliveries') {
        query = query.gte('date', dateLimit);
      }

      const { data, error } = await query.range(from, from + step - 1);

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn(`Table ${tableName} not found in database. Returning empty array.`);
          return [];
        }
        console.error(`Error fetching table ${tableName}:`, error);
        throw error;
      }
      
      if (data && data.length > 0) {
        allRows = [...allRows, ...data.map(item => this.toCamelCase(item))];
        if (data.length < step) hasMore = false;
        else from += step;
      } else {
        hasMore = false;
      }
    }
    return allRows;
  },

  /**
   * Fetches data from relational tables to populate the app state.
   * Supports delta sync if sinceRevision is provided.
   */
  async fetchAll(sinceRevision: number = 0) {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const dateLimit = sixtyDaysAgo.toISOString().split('T')[0];

    const tables = [
      { key: 'riders', table: 'dp_riders' },
      { key: 'customers', table: 'dp_customers' },
      { key: 'prices', table: 'dp_prices' },
      { key: 'deliveries', table: 'dp_deliveries', dateLimit: sinceRevision === 0 ? dateLimit : null },
      { key: 'payments', table: 'dp_payments' },
      { key: 'expenses', table: 'dp_expenses' },
      { key: 'archives', table: 'dp_archives' },
      { key: 'auditLogs', table: 'dp_audit_logs' },
      { key: 'riderLoads', table: 'dp_rider_loads' },
      { key: 'closingRecords', table: 'dp_closing_records' }
    ];

    const results = await Promise.all(
      tables.map(async ({ key, table, dateLimit: limit }) => {
        const data = await this.fetchTable(table, sinceRevision, limit || null);
        return { key, data };
      })
    );

    const payload: any = {};
    results.forEach(({ key, data }) => {
      if (key === 'archives') {
        payload[key] = data.map((arc: any) => {
          if (arc.payload) {
            const { payload: arcPayload, ...rest } = arc;
            // Ensure payload is an object before spreading
            const unpackedPayload = typeof arcPayload === 'string' ? JSON.parse(arcPayload) : arcPayload;
            return { ...rest, ...unpackedPayload };
          }
          return arc;
        });
      } else {
        payload[key] = data;
      }
    });

    return payload;
  },

  /**
   * Fetches the current system revision.
   */
  async getRevision() {
    try {
      const { data, error } = await supabase
        .from('dp_metadata')
        .select('value')
        .eq('key', 'system_revision')
        .single();
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn("Table dp_metadata not found. Using revision 0.");
          return 0;
        }
        console.error("Supabase RLS/Query Error (getRevision):", error);
        throw error;
      }
      return data?.value || 0;
    } catch (err) {
      console.warn("Failed to fetch revision, defaulting to 0:", err);
      return 0;
    }
  },

  /**
   * Updates the system revision.
   */
  async updateRevision(revision: number) {
    try {
      const { error } = await supabase
        .from('dp_metadata')
        .upsert({ key: 'system_revision', value: revision, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn("Table dp_metadata not found. Cannot update revision.");
          return;
        }
        console.error("Supabase RLS/Query Error (updateRevision):", error);
        throw error;
      }
    } catch (err) {
      console.warn("Failed to update revision:", err);
    }
  },

  /**
   * Persists a collection of entities to their respective table.
   */
  async persistCollection(entityType: string, data: any[]) {
    if (!data || data.length === 0) return;

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

    const tableName = tableMap[entityType];
    if (!tableName) return;

    const mappedData = data.map(item => {
      if (entityType === 'archives') {
        const { id, year, month, updatedAt, version, deleted, ...payloadData } = item;
        return this.toSnakeCase({ id, year, month, updatedAt, version, deleted, payload: payloadData });
      }
      return this.toSnakeCase(item);
    });

    // Batch upserts
    const batchSize = 500;
    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (error) throw error;
    }
  },

  /**
   * Full state sync (Relational version)
   * Instead of one big JSON, we sync each collection.
   */
  async syncAll(state: any) {
    const keys = [
      'riders', 'customers', 'prices', 'deliveries', 
      'payments', 'expenses', 'archives', 'auditLogs',
      'riderLoads', 'closingRecords'
    ];

    await Promise.all(
      keys.map(key => this.persistCollection(key, state[key]))
    );
  }
};
