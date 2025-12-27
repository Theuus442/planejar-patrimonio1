import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.debug('Supabase configuration check:', {
      url: url ? `${url.substring(0, 20)}...` : 'NOT SET',
      anonKey: anonKey ? `${anonKey.substring(0, 20)}...` : 'NOT SET',
    });

    if (!url || !anonKey) {
      const errorMsg = `Missing Supabase configuration:
        - VITE_SUPABASE_URL: ${url ? 'SET' : 'MISSING'}
        - VITE_SUPABASE_ANON_KEY: ${anonKey ? 'SET' : 'MISSING'}

Make sure environment variables are set in DevServerControl or .env file`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      const errorMsg = `Invalid VITE_SUPABASE_URL format: ${url}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    supabaseClient = createClient(url, anonKey);
    console.log('✅ Supabase client initialized successfully');
  }

  return supabaseClient;
};

// Authentication functions
export const supabaseAuth = {
  async signUp(email: string, password: string) {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  },

  async getCurrentSession() {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser() {
    const { data, error } = await getSupabaseClient().auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async resetPassword(email: string) {
    const { data, error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return getSupabaseClient().auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};

// Generic database functions
export const supabaseDB = {
  async from(table: string) {
    return getSupabaseClient().from(table);
  },

  async select(table: string, columns?: string) {
    const query = getSupabaseClient().from(table).select(columns || '*');
    return query;
  },

  async insert(table: string, data: any) {
    const { data: result, error } = await getSupabaseClient().from(table).insert(data).select();
    if (error) throw error;
    return result;
  },

  async update(table: string, id: string, data: any) {
    const { data: result, error } = await getSupabaseClient()
      .from(table)
      .update(data)
      .eq('id', id)
      .select();
    if (error) throw error;
    return result;
  },

  async delete(table: string, id: string) {
    const { error } = await getSupabaseClient().from(table).delete().eq('id', id);
    if (error) throw error;
  },

  async upsert(table: string, data: any) {
    const { data: result, error } = await getSupabaseClient().from(table).upsert(data).select();
    if (error) throw error;
    return result;
  },

  async query(table: string, filters?: { [key: string]: any }) {
    let query = getSupabaseClient().from(table).select('*');
    
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};

// Storage functions
export const supabaseStorage = {
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await getSupabaseClient().storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return data;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await getSupabaseClient().storage.from(bucket).remove([path]);
    if (error) throw error;
  },

  async getPublicUrl(bucket: string, path: string) {
    const { data } = getSupabaseClient().storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async listFiles(bucket: string, path?: string) {
    const { data, error } = await getSupabaseClient().storage.from(bucket).list(path || '');
    if (error) throw error;
    return data;
  },
};

export { getSupabaseClient };
