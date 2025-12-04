import { getSupabaseClient } from './supabaseService';
import { usersDB } from './supabaseDatabase';
import { User, UserRole } from '../types';

let supabase: any = null;

const getSupabaseAuth = () => {
  if (!supabase) {
    supabase = getSupabaseClient();
  }
  return supabase;
};

// ============================================================================
// AUTH STATE MANAGEMENT
// ============================================================================

interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    role?: string;
  };
}

interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

// ============================================================================
// CORE AUTHENTICATION FUNCTIONS
// ============================================================================

export const supabaseAuthService = {
  /**
   * Sign up a new user with email and password
   * Creates both Auth user and database user record
   */
  async signUpWithEmail(
    email: string,
    password: string,
    name: string,
    role: UserRole = UserRole.CLIENT,
    clientType?: 'partner' | 'interested'
  ): Promise<{ user: User; session: AuthSession } | null> {
    try {
      // Step 1: Create Auth user with metadata
      let authData;
      let authError;
      let retries = 3;

      while (retries > 0) {
        try {
          const response = await getSupabaseAuth().auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                role,
                client_type: clientType,
              },
            },
          });
          authData = response.data;
          authError = response.error;

          if (!authError || !authError.message?.includes('body stream already read')) {
            // Success or non-retryable error
            break;
          }

          retries--;
          if (retries > 0) {
            console.warn(`Supabase API connection issue - retrying (${retries} left)...`);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          }
        } catch (sdkError: any) {
          // Handle SDK-level errors (like "body stream already read" or "Failed to fetch")
          console.error('Supabase SDK error during sign up:', sdkError);

          retries--;
          if (retries > 0 && (sdkError.message?.includes('body stream already read') || sdkError.message?.includes('Failed to fetch'))) {
            console.warn(`Network error - retrying (${retries} left)...`);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          } else {
            throw sdkError;
          }
        }
      }

      if (authError) {
        console.error('Sign up error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user returned from sign up');
      }

      // Step 2: Create database user record with retry logic
      // The auth metadata is stored in Supabase Auth, but we also need it in the users table
      let user = null;
      let dbRetries = 3;

      while (dbRetries > 0 && !user) {
        try {
          user = await usersDB.createUser({
            id: authData.user.id,
            name,
            email,
            role,
            clientType,
          });

          if (user) break;
        } catch (dbError) {
          dbRetries--;
          if (dbRetries > 0) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error('Failed to create database user after retries:', dbError);
            // Continue anyway - the user exists in Auth at least
          }
        }
      }

      if (!user) {
        throw new Error('Failed to create database user record');
      }

      return {
        user,
        session: {
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            user_metadata: authData.user.user_metadata,
          },
          access_token: authData.session?.access_token || '',
          refresh_token: authData.session?.refresh_token || '',
        },
      };
    } catch (error) {
      console.error('Sign up failed:', error);
      return null;
    }
  },

  /**
   * Sign in with email and password
   * Returns user and session data
   */
  async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ user: User; session: AuthSession } | null> {
    let retries = 3;
    let lastError: any = null;

    while (retries > 0) {
      try {
        // Authenticate with Supabase Auth
        const { data, error } = await getSupabaseAuth().auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Check if this is a retryable network error
          if (error.message?.includes('body stream already read') || error.message?.includes('Failed to fetch')) {
            retries--;
            if (retries > 0) {
              console.warn(`Sign in network error - retrying (${retries} left)...`);
              await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
              continue;
            }
          }
          console.error('Sign in error:', error);
          throw new Error('AUTH_INVALID_CREDENTIALS');
        }

        if (!data.session || !data.user) {
          throw new Error('No session returned from sign in');
        }

        // Fetch user from database with related data
        const user = await usersDB.getUser(data.user.id);

        if (!user) {
          throw new Error('User not found in database');
        }

        return {
          user,
          session: {
            user: {
              id: data.user.id,
              email: data.user.email!,
              user_metadata: data.user.user_metadata,
            },
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        };
      } catch (error: any) {
        lastError = error;

        // Check if it's a retryable network error
        if (error.message?.includes('body stream already read') || error.message?.includes('Failed to fetch')) {
          retries--;
          if (retries > 0) {
            console.warn(`Sign in network error - retrying (${retries} left)...`);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            continue;
          }
        }

        break;
      }
    }

    console.error('Sign in failed:', lastError);
    return null;
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Sign out failed:', error);
      return false;
    }
  },

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const { data, error } = await getSupabaseAuth().auth.getSession();

      if (error) {
        console.error('Get session error:', error);
        return null;
      }

      if (!data.session) {
        return null;
      }

      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
    } catch (error) {
      console.error('Get session failed:', error);
      return null;
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await getSupabaseAuth().auth.getUser();

      if (error) {
        // "Auth session missing" is normal when user is not logged in - don't log this error
        if (!error.message?.includes('Auth session missing')) {
          console.error('Get user error:', error);
        }
        return null;
      }

      if (!data.user) {
        return null;
      }

      // Fetch full user from database
      return await usersDB.getUser(data.user.id);
    } catch (error) {
      // Suppress "Auth session missing" errors - this is expected when not logged in
      if (error instanceof Error && !error.message?.includes('Auth session missing')) {
        console.error('Get current user failed:', error);
      }
      return null;
    }
  },

  /**
   * Refresh authentication session
   */
  async refreshSession(): Promise<AuthSession | null> {
    try {
      const { data, error } = await getSupabaseAuth().auth.refreshSession();

      if (error) {
        console.error('Refresh session error:', error);
        return null;
      }

      if (!data.session) {
        return null;
      }

      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
    } catch (error) {
      console.error('Refresh session failed:', error);
      return null;
    }
  },

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================

  /**
   * Request password reset email
   */
  async resetPasswordForEmail(email: string): Promise<boolean> {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Reset password error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Reset password failed:', error);
      return false;
    }
  },

  /**
   * Update password (requires session)
   */
  async updatePassword(newPassword: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Update password error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update password failed:', error);
      return false;
    }
  },

  /**
   * Verify OTP code (for password reset)
   */
  async verifyOTP(email: string, token: string, type: 'recovery' | 'email_change' | 'phone_change' = 'recovery'): Promise<AuthSession | null> {
    try {
      const { data, error } = await getSupabaseAuth().auth.verifyOtp({
        email,
        token,
        type,
      });

      if (error) {
        console.error('Verify OTP error:', error);
        return null;
      }

      if (!data.session) {
        return null;
      }

      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email!,
          user_metadata: data.session.user.user_metadata,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
    } catch (error) {
      console.error('Verify OTP failed:', error);
      return null;
    }
  },

  // ============================================================================
  // STATE LISTENERS
  // ============================================================================

  /**
   * Listen to authentication state changes
   * Returns unsubscribe function
   */
  onAuthStateChange(
    callback: (
      event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED',
      session: AuthSession | null
    ) => void
  ): (() => void) | null {
    try {
      const { data: { subscription } } = getSupabaseAuth().auth.onAuthStateChange(
        async (event, session) => {
          callback(
            event as 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED',
            session
              ? {
                  user: {
                    id: session.user.id,
                    email: session.user.email!,
                    user_metadata: session.user.user_metadata,
                  },
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }
              : null
          );
        }
      );

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error('Set up auth state listener failed:', error);
      return null;
    }
  },

  // ============================================================================
  // USER MANAGEMENT (Admin Functions)
  // ============================================================================

  /**
   * Create a new user via Admin API (requires admin key)
   * Use this for creating users as an admin
   */
  async createUserAsAdmin(
    email: string,
    password: string,
    name: string,
    role: UserRole,
    clientType?: 'partner' | 'interested'
  ): Promise<{ user: User; session: AuthSession } | null> {
    try {
      // For now, we use the regular sign up flow
      // In production, you might use the Admin API with service_role key
      return await this.signUpWithEmail(email, password, name, role, clientType);
    } catch (error) {
      console.error('Create user as admin failed:', error);
      return null;
    }
  },

  /**
   * Check if email is already registered
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      // We can't directly check without making a sign in attempt
      // So we'll use the database layer instead
      const user = await usersDB.listUsers();
      return user.some(u => u.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.error('Check email failed:', error);
      return false;
    }
  },

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await usersDB.listUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      return user || null;
    } catch (error) {
      console.error('Get user by email failed:', error);
      return null;
    }
  },

  // ============================================================================
  // ERROR HANDLING HELPERS
  // ============================================================================

  /**
   * Parse auth error and return user-friendly message
   */
  parseAuthError(error: any): string {
    if (!error) return 'Unknown error occurred';

    // Handle specific Supabase Auth errors
    if (error.message?.includes('Invalid login credentials')) {
      return 'E-mail ou senha inválidos.';
    }
    if (error.message?.includes('Email not confirmed')) {
      return 'Por favor, confirme seu e-mail antes de fazer login.';
    }
    if (error.message?.includes('User already registered')) {
      return 'Este e-mail já está registrado.';
    }
    if (error.message?.includes('Password should be at least')) {
      return 'Senha deve ter no mínimo 6 caracteres.';
    }
    if (error.message?.includes('AUTH_INVALID_CREDENTIALS')) {
      return 'E-mail ou senha inválidos.';
    }

    return error.message || 'Erro na autenticação. Tente novamente.';
  },

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    message: string;
  } {
    if (password.length < 6) {
      return {
        isValid: false,
        message: 'Senha deve ter no mínimo 6 caracteres.',
      };
    }

    return {
      isValid: true,
      message: 'Senha válida.',
    };
  },

  // ============================================================================
  // SESSION PERSISTENCE
  // ============================================================================

  /**
   * Store session in localStorage (optional, for persistence)
   */
  async persistSession(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      if (session) {
        localStorage.setItem('supabase_session', JSON.stringify(session));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Persist session failed:', error);
      return false;
    }
  },

  /**
   * Restore session from localStorage
   */
  async restoreSession(): Promise<AuthSession | null> {
    try {
      const sessionStr = localStorage.getItem('supabase_session');
      if (!sessionStr) return null;

      const session = JSON.parse(sessionStr);

      // Try to refresh the session
      const refreshed = await this.refreshSession();
      if (refreshed) {
        await this.persistSession();
        return refreshed;
      }

      // If refresh fails, clear the stored session
      localStorage.removeItem('supabase_session');
      return null;
    } catch (error) {
      console.error('Restore session failed:', error);
      return null;
    }
  },

  /**
   * Clear stored session
   */
  clearPersistedSession(): boolean {
    try {
      localStorage.removeItem('supabase_session');
      return true;
    } catch (error) {
      console.error('Clear session failed:', error);
      return false;
    }
  },
};

export default supabaseAuthService;
