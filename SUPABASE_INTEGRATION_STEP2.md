# Step 2: Enhanced Authentication Service - Complete Reference

## What Was Done

Created `services/supabaseAuth.ts` - a comprehensive authentication service that provides:
- Email/password authentication (sign up, sign in, sign out)
- Password reset and recovery flows
- Session management and persistence
- Real-time auth state listeners
- User-friendly error handling
- Validation helpers for email and password

## Architecture Overview

The auth service is organized into **5 main categories**:

```
supabaseAuthService
├── Core Auth Functions       // Sign up, sign in, sign out
├── Password Management       // Reset, update, OTP verification
├── State Listeners          // Real-time auth state changes
├── User Management          // Admin functions, email checks
├── Session Persistence      // localStorage management
└── Helper Functions         // Error parsing, validation
```

## API Reference

### Core Authentication Functions

#### `signUpWithEmail(email, password, name, role?, clientType?): Promise<{ user: User; session: AuthSession } | null>`

Register a new user. Automatically creates both Auth user and database record.

```typescript
const result = await supabaseAuthService.signUpWithEmail(
  'joao@example.com',
  'senha123',
  'João Silva',
  UserRole.CLIENT,
  'partner'
);

if (result) {
  console.log('User created:', result.user.name);
  console.log('Session token:', result.session.access_token);
} else {
  console.log('Sign up failed');
}
```

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password (min 6 chars)
- `name` (string): User's full name
- `role` (UserRole, optional): 'client', 'consultant', 'auxiliary', 'administrator'
- `clientType` (optional): 'partner' or 'interested'

**Returns:**
- `{ user, session }` on success
- `null` on failure

---

#### `signInWithEmail(email, password): Promise<{ user: User; session: AuthSession } | null>`

Authenticate a user with email and password.

```typescript
const result = await supabaseAuthService.signInWithEmail(
  'joao@example.com',
  'senha123'
);

if (result) {
  console.log('Welcome:', result.user.name);
  // Session tokens are automatically stored by Supabase
} else {
  const errorMsg = supabaseAuthService.parseAuthError('Invalid credentials');
  console.log(errorMsg);
}
```

**Returns:**
- `{ user, session }` on success
- `null` on failure (check error console)

**Note:** This is the replacement for the old mock login in LoginScreen.

---

#### `signOut(): Promise<boolean>`

Sign out the current user and clear session.

```typescript
const success = await supabaseAuthService.signOut();
if (success) {
  // User is logged out, clear app state
}
```

---

#### `getCurrentSession(): Promise<AuthSession | null>`

Get the current authenticated session (access token, user ID, etc).

```typescript
const session = await supabaseAuthService.getCurrentSession();
if (session) {
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);
  console.log('Access Token:', session.access_token);
}
```

---

#### `getCurrentUser(): Promise<User | null>`

Get the currently authenticated user with all profile data.

```typescript
const user = await supabaseAuthService.getCurrentUser();
if (user) {
  console.log('Name:', user.name);
  console.log('Role:', user.role);
  console.log('Qualification:', user.qualificationData);
}
```

---

#### `refreshSession(): Promise<AuthSession | null>`

Refresh the access token using the refresh token.

```typescript
const newSession = await supabaseAuthService.refreshSession();
if (newSession) {
  console.log('Session refreshed with new token');
}
```

---

### Password Management

#### `resetPasswordForEmail(email): Promise<boolean>`

Send password reset email to user. Uses default redirect to `/reset-password`.

```typescript
const sent = await supabaseAuthService.resetPasswordForEmail(
  'joao@example.com'
);

if (sent) {
  alert('Se o e-mail está registrado, você receberá um link de redefinição de senha.');
} else {
  alert('Erro ao enviar e-mail de reset.');
}
```

**Note:** This replaces the old "forgot password" mock flow in LoginScreen.

---

#### `updatePassword(newPassword): Promise<boolean>`

Update password for the currently authenticated user.

```typescript
const success = await supabaseAuthService.updatePassword('novaSenha123');
if (success) {
  console.log('Senha alterada com sucesso');
}
```

**Note:** Requires active session. Use after `signInWithEmail`.

---

#### `verifyOTP(email, token, type?): Promise<AuthSession | null>`

Verify OTP code from password reset email.

```typescript
const session = await supabaseAuthService.verifyOTP(
  'joao@example.com',
  '123456',
  'recovery'
);

if (session) {
  // User is now authenticated and can reset password
  await supabaseAuthService.updatePassword('newPassword123');
}
```

---

### State Listeners

#### `onAuthStateChange(callback): () => void | null`

Listen to authentication state changes (sign in, sign out, token refresh).

**Most important for App.tsx integration.**

```typescript
useEffect(() => {
  const unsubscribe = supabaseAuthService.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user.email);
        // Fetch user from database
        // Update app state
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        // Clear app state
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
    }
  );

  // Clean up listener on unmount
  return () => {
    unsubscribe?.();
  };
}, []);
```

**Events:**
- `SIGNED_IN`: User just logged in
- `SIGNED_OUT`: User just logged out
- `TOKEN_REFRESHED`: Access token was refreshed
- `USER_UPDATED`: User profile was updated

**Returns:**
- Unsubscribe function to stop listening
- `null` if setup failed

---

### User Management (Admin Functions)

#### `createUserAsAdmin(email, password, name, role, clientType?): Promise<{ user: User; session: AuthSession } | null>`

Create a new user as an administrator. Currently uses the same sign up flow.

```typescript
const result = await supabaseAuthService.createUserAsAdmin(
  'novo.usuario@example.com',
  'senha123',
  'Novo Usuário',
  UserRole.CONSULTANT
);
```

---

#### `isEmailRegistered(email): Promise<boolean>`

Check if an email is already registered.

```typescript
const exists = await supabaseAuthService.isEmailRegistered('joao@example.com');
if (exists) {
  console.log('Este e-mail já está registrado');
}
```

---

#### `getUserByEmail(email): Promise<User | null>`

Get user data by email address.

```typescript
const user = await supabaseAuthService.getUserByEmail('joao@example.com');
if (user) {
  console.log('User found:', user.name);
}
```

---

### Helper Functions

#### `parseAuthError(error): string`

Convert auth error objects to Portuguese user-friendly messages.

```typescript
try {
  await supabaseAuthService.signInWithEmail('joao@example.com', 'wrongpass');
} catch (error) {
  const friendlyMessage = supabaseAuthService.parseAuthError(error);
  setErrorMessage(friendlyMessage);
  // Shows: "E-mail ou senha inválidos."
}
```

**Handles:**
- `Invalid login credentials` → "E-mail ou senha inválidos."
- `Email not confirmed` → "Por favor, confirme seu e-mail..."
- `User already registered` → "Este e-mail já está registrado."
- `Password too short` → "Senha deve ter no mínimo 6 caracteres."

---

#### `validateEmail(email): boolean`

Check if email format is valid.

```typescript
if (!supabaseAuthService.validateEmail(userInput)) {
  setError('Formato de e-mail inválido');
}
```

---

#### `validatePasswordStrength(password): { isValid: boolean; message: string }`

Validate password strength and return feedback.

```typescript
const validation = supabaseAuthService.validatePasswordStrength('senha123');

console.log(validation.isValid); // true
console.log(validation.message); // "Senha válida."
```

**Checks:**
- Minimum 6 characters
- Returns user-friendly message in Portuguese

---

### Session Persistence

#### `persistSession(): Promise<boolean>`

Save current session to localStorage (optional, for offline support).

```typescript
const saved = await supabaseAuthService.persistSession();
if (saved) {
  console.log('Session saved locally');
}
```

---

#### `restoreSession(): Promise<AuthSession | null>`

Restore session from localStorage and refresh if needed.

```typescript
useEffect(() => {
  const restoreSessionOnLoad = async () => {
    const session = await supabaseAuthService.restoreSession();
    if (session) {
      const user = await supabaseAuthService.getCurrentUser();
      setCurrentUser(user);
    }
  };

  restoreSessionOnLoad();
}, []);
```

**Useful for:**
- App initialization
- Page reload recovery
- Browser close/reopen

---

#### `clearPersistedSession(): boolean`

Remove stored session from localStorage.

```typescript
supabaseAuthService.clearPersistedSession();
```

---

## Integration Example (for Step 4: App.tsx)

```typescript
import supabaseAuthService from './services/supabaseAuth';

const useStore = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    // Restore session on app load
    const restoreAuth = async () => {
      const user = await supabaseAuthService.getCurrentUser();
      setCurrentUser(user);
      setIsLoading(false);
    };

    restoreAuth();

    // Listen for future auth changes
    const unsubscribe = supabaseAuthService.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const user = await supabaseAuthService.getCurrentUser();
          setCurrentUser(user);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  const actions = {
    handleLogin: async (email: string, password: string) => {
      const result = await supabaseAuthService.signInWithEmail(email, password);
      if (!result) {
        throw new Error('AUTH_INVALID_CREDENTIALS');
      }
      // currentUser will be set by auth state listener
    },

    handleLogout: async () => {
      await supabaseAuthService.signOut();
      setCurrentUser(null);
    },

    handleForgotPassword: async (email: string) => {
      return await supabaseAuthService.resetPasswordForEmail(email);
    },
  };

  return { currentUser, isLoading, actions };
};
```

---

## Key Features

### Automatic Session Management
- Supabase SDK automatically manages tokens
- Tokens are refreshed automatically when expired
- Session persists across page reloads by default

### Error Safety
- All functions return `null` on error instead of throwing
- Errors are logged to console for debugging
- `parseAuthError()` converts errors to user-friendly messages

### Type Safety
- Returns `User` objects with all profile data
- TypeScript ensures correct usage
- Integrates with existing types.ts definitions

---

## Security Notes

### Do NOT:
- ❌ Store passwords in localStorage or variables
- ❌ Log sensitive tokens to console in production
- ❌ Share refresh tokens with client
- ❌ Use plain passwords in API calls

### Do:
- ✅ Let Supabase manage session tokens automatically
- ✅ Use HTTPS in production
- ✅ Validate email format before sending to API
- ✅ Enforce strong password requirements
- ✅ Use PKCE flow for OAuth (handled by SDK)

---

## Comparison with Old Mock System

| Feature | Old Mock | New Supabase |
|---------|----------|--------------|
| Login | Hardcoded users in constants | Real Supabase Auth |
| Password Reset | Console log only | Real email flow |
| Session | None (in-memory) | Persistent tokens |
| State Changes | Manual prop passing | Real-time listeners |
| Security | None | Industry standard |

---

## What's Next

Step 3 will create the data migration service to seed Supabase with initial test data. This ensures consultants and clients can start using the system immediately.

---

## Troubleshooting

**Q: Login fails with "AUTH_INVALID_CREDENTIALS"**
A: Check that:
1. User exists in Supabase Auth
2. Password is correct
3. Email is confirmed (if email verification is enabled)

**Q: Auth state listener not firing**
A: Ensure you're calling it in a useEffect and cleaning up the unsubscribe function.

**Q: Session lost after page reload**
A: Supabase stores session automatically. If lost, call `restoreSession()` on app init.

**Q: Can't update password**
A: Ensure user is authenticated (session exists) before calling `updatePassword()`.

---

**Status**: ✅ Complete and ready for Step 3 (Data Migration Service)
