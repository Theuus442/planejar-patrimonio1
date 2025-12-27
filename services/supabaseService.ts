import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

// Retry helper with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication errors
      if (error?.message?.includes('Invalid API Key') ||
          error?.message?.includes('PGRST')) {
        throw error;
      }

      // Check if it's a network error worth retrying
      if (!(error instanceof TypeError && error.message === 'Failed to fetch')) {
        throw error;
      }

      // If this is the last attempt, throw
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff with jitter
      const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`Network error on attempt ${attempt + 1}/${maxRetries}. Retrying in ${Math.round(delayMs)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
};

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

// Helper to handle network errors
const handleSupabaseError = (error: any, operation: string) => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    console.error(`${operation} - Network Error: Cannot reach Supabase server. Check your connection and Supabase URL.`);
    throw new Error(`Network Error: Failed to connect to Supabase. Please check your internet connection and try again.`);
  }
  throw error;
};

// Authentication functions
export const supabaseAuth = {
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await getSupabaseClient().auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseError(err, 'signUp');
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseError(err, 'signIn');
    }
  },

  async signOut() {
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
    } catch (err: any) {
      handleSupabaseError(err, 'signOut');
    }
  },

  async getCurrentSession() {
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (err: any) {
      handleSupabaseError(err, 'getCurrentSession');
    }
  },

  async getCurrentUser() {
    try {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (err: any) {
      handleSupabaseError(err, 'getCurrentUser');
    }
  },

  async resetPassword(email: string) {
    try {
      const { data, error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseError(err, 'resetPassword');
    }
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
