# Supabase Network Errors - Debugging Guide

## Errors You're Seeing

```
1. "Failed to execute 'json' on 'Response': body stream already read"
2. "Failed to fetch"
3. "unsubscribe is not a function"
```

## What These Errors Mean

### Error 1 & 2: Network/Proxy Issues
These errors occur when:
- The app can't reach your Supabase API
- A proxy/middleware is intercepting the response incorrectly
- CORS (Cross-Origin) issues between your app and Supabase
- Network connectivity problems to Supabase

### Error 3: Fixed ✅
The "unsubscribe is not a function" error has been fixed in the code.

---

## Step 1: Verify Your Environment Variables

The app won't work without correct Supabase credentials.

### Check What's Set
1. Open your browser's DevTools (F12)
2. Go to Console tab
3. Run this command:

```javascript
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

You should see:
```
VITE_SUPABASE_URL: https://puepexwgznjdtgrihxsa.supabase.co
VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...
```

### If Empty or Wrong
The environment variables aren't being loaded:

1. **On Local Dev**: Check your `.env` file exists with:
   ```
   VITE_SUPABASE_URL=https://puepexwgznjdtgrihxsa.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **On Deployment**: Variables must be set in your deployment platform (Netlify, Vercel, Fly.io, etc.)

3. **After Updating**: Restart the dev server (`npm run dev`)

---

## Step 2: Test Direct Supabase Connection

In browser console, test if your app can reach Supabase:

```javascript
// Test 1: Can we reach Supabase?
fetch('https://puepexwgznjdtgrihxsa.supabase.co/auth/v1/health', {
  headers: {
    'apikey': 'YOUR_ANON_KEY_HERE'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Supabase is reachable:', d))
.catch(e => console.error('❌ Cannot reach Supabase:', e.message));
```

**Expected:** Should return something like `{ version: "2.x.x" }`

**If it fails:** 
- Your network can't reach Supabase
- CORS is blocking the request
- The URL or key is wrong

---

## Step 3: Check CORS Settings

If you see CORS errors in the Network tab (browser DevTools):

1. Go to your Supabase project settings
2. Look for "API" settings
3. Check "CORS allowed origins"
4. Make sure your app URL is allowed:
   - Local: `http://localhost:3000`
   - Deployed: `https://your-domain.com`

If not listed, add it.

---

## Step 4: Check Your Supabase Project Status

1. Visit https://supabase.com
2. Log in to your account
3. Select the project: **puepexwgznjdtgrihxsa**
4. Check:
   - Is the project online/active? (should show green status)
   - Is Auth enabled?
   - Can you access the database in Supabase dashboard?

If the project is paused or offline, activate it.

---

## Step 5: Check Network Issues (Deployment)

If running on a deployed platform (Fly.io, Netlify, Vercel, etc.):

### Issue: Proxy/Firewall
Some deployment environments have strict outbound rules. The app might be blocked from reaching Supabase.

**Solution:**
1. Check your deployment platform's documentation for outbound network access
2. Whitelist Supabase domain: `*.supabase.co`
3. If using a proxy, ensure it doesn't read response body twice

### Issue: CORS on Deployment
Deployed apps might have different CORS behavior.

**Solution:**
1. Add your deployment domain to Supabase CORS allowed origins
2. Ensure the app is using HTTPS in production

---

## Step 6: Enable Debug Logging

Add this to your `services/supabaseService.ts` to see detailed logs:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing Supabase configuration. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    // Add logging for debugging
    console.log('[Supabase] Initializing client with URL:', url);

    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      headers: {
        'x-client-info': 'app-version-1.0'
      }
    });
  }

  return supabaseClient;
};
```

---

## Step 7: Workaround for Network Issues

If you have persistent network errors, you can still test the app:

### Manual Login (if users exist)
1. If database was already initialized before the errors started, existing users can still login
2. The app might work fine once you're logged in
3. The initialization only runs once on first load

### Skip Initialization During Development
In `App.tsx`, you can temporarily disable initialization for testing:

```typescript
// Temporarily skip initialization if it's causing issues
const SKIP_DB_INIT = false; // Set to true to skip

if (!SKIP_DB_INIT) {
  // Initialize database if empty
  try {
    // ... initialization code
  } catch (dbInitError) {
    // ...
  }
}
```

### Use Pre-created Accounts
Ask your Supabase admin to create test accounts directly in the Supabase Auth dashboard instead of seeding via code.

---

## Checklist: Troubleshooting Steps

- [ ] Environment variables are set correctly (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Direct fetch to Supabase works from browser console
- [ ] Supabase project is active and online
- [ ] CORS settings include your app's domain
- [ ] Network tab shows no CORS errors
- [ ] If deployed: outbound network access is allowed
- [ ] Dev server was restarted after setting environment variables

---

## Still Having Issues?

### Common Causes & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Failed to fetch` | No internet or can't reach Supabase | Check network, verify Supabase is online |
| `body stream already read` | Proxy reading response twice | Check deployment proxy settings |
| `CORS error` | Domain not allowed | Add domain to Supabase CORS settings |
| `Auth key not found` | Missing env variable | Set VITE_SUPABASE_ANON_KEY |
| `unsubscribe is not a function` | SDK version mismatch | Code has been fixed ✅ |

---

## If You Can't Get It Working

### Option 1: Local Development First
- Ensure it works locally (`npm run dev`)
- Then deploy once working

### Option 2: Use Mock Auth (Temporary)
Create a simple mock auth while debugging network issues:

```typescript
// Temporary: in supabaseAuth.ts
async signInWithEmail(email: string, password: string) {
  console.warn('⚠️ Using mock auth for debugging');
  // Return mock user for testing
  return {
    user: { id: 'test', name: 'Test User', email, role: 'consultant', ... },
    session: { access_token: 'test', ... }
  };
}
```

### Option 3: Contact Support
If environment variables are correct and network tests pass but app still fails:
- Check Supabase status page: https://status.supabase.com/
- Contact Supabase support
- Check your deployment platform's logs for network issues

---

## Quick Test Script

Run this in browser console to diagnose issues:

```javascript
async function diagnoseSupabase() {
  console.log('=== SUPABASE DIAGNOSIS ===\n');
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('1. Environment Variables:');
  console.log('  URL:', url ? '✅ Set' : '❌ Missing');
  console.log('  Key:', key ? '✅ Set' : '❌ Missing');
  
  if (!url || !key) {
    console.error('❌ Cannot continue - environment variables not set');
    return;
  }
  
  console.log('\n2. Network Connectivity:');
  try {
    const res = await fetch(url + '/auth/v1/health', {
      headers: { 'apikey': key }
    });
    const data = await res.json();
    console.log('  ✅ Can reach Supabase:', data);
  } catch (e) {
    console.error('  ❌ Cannot reach Supabase:', e.message);
  }
  
  console.log('\n3. Auth Service:');
  try {
    const { default: service } = await import('./services/supabaseAuth.ts');
    const user = await service.getCurrentUser();
    console.log('  User:', user ? `✅ Logged in (${user.email})` : '❌ Not logged in');
  } catch (e) {
    console.error('  ❌ Auth error:', e.message);
  }
  
  console.log('\n=== END DIAGNOSIS ===');
}

// Run it
diagnoseSupabase();
```

---

## After Fixing the Issues

Once your network issues are resolved:

1. The app will automatically initialize the database on first load
2. You'll see test data in the Supabase dashboard
3. You can login with the test credentials
4. All features should work normally

---

**Note:** The code has been updated with better error handling and retry logic. The app will now continue running even if initialization has issues, allowing manual login if you have existing credentials.
