# Step 3: Data Migration Service - Complete Reference

## What Was Done

Created `services/dataMigration.ts` - a service that handles seeding Supabase with initial test data, ensuring the system is ready for immediate use after deployment.

## Architecture Overview

The migration service provides two main purposes:
1. **Initialize** - Seed database with test users and projects
2. **Manage** - Check status, export data, and utilities

## API Reference

### Main Functions

#### `initializeDatabase(): Promise<{ success: boolean; message: string; details: string[] }>`

Complete database initialization. Safely runs multiple times (idempotent).

```typescript
const result = await dataMigrationService.initializeDatabase();

if (result.success) {
  console.log(result.message); // "Database initialized successfully"
  console.log(result.details); // Array of what was created
} else {
  console.error(result.message);
  result.details.forEach(detail => console.log(detail));
}
```

**What it does:**
1. Checks if database already has data
2. Creates all test users (5 users with different roles)
3. Creates sample project with clients
4. Seeds phase 1 data
5. Adds qualification data for clients
6. Returns detailed results

**Safe to call multiple times** - skips existing data

**Test Users Created:**
```
Email: admin@planejar.com
Password: admin123
Role: Administrator
---

Email: diego.garcia@grupociatos.com.br
Password: 250500
Role: Consultant
---

Email: joao.completo@email.com
Password: 123
Role: Client (Partner)
---

Email: maria.completo@email.com
Password: 123
Role: Client (Partner)
---

Email: servicos@grupociatos.com.br
Password: 123456
Role: Auxiliary
```

---

#### `isDatabaseSeeded(): Promise<boolean>`

Check if database already has data.

```typescript
const seeded = await dataMigrationService.isDatabaseSeeded();

if (seeded) {
  console.log('Database has data');
} else {
  console.log('Database is empty');
}
```

---

#### `seedTestUsers(): Promise<boolean>`

Seed only the test users (called by `initializeDatabase()`).

```typescript
const success = await dataMigrationService.seedTestUsers();
if (success) {
  console.log('Users created');
}
```

**Creates:**
- 1 Administrator
- 1 Consultant
- 2 Clients (Partners)
- 1 Auxiliary

---

#### `seedTestProject(): Promise<boolean>`

Seed only the test project (called by `initializeDatabase()`).

```typescript
const success = await dataMigrationService.seedTestProject();
if (success) {
  console.log('Project and related data created');
}
```

**Creates:**
- 1 project "Holding Família Completo"
- Links 2 clients to the project
- Seeds Phase 1 diagnostic data
- Adds qualification data for both clients

---

#### `getStatus(): Promise<{ isSeeded: boolean; userCount: number; projectCount: number }>`

Get current database migration status.

```typescript
const status = await dataMigrationService.getStatus();

console.log(`Database seeded: ${status.isSeeded}`);
console.log(`Users: ${status.userCount}`);
console.log(`Projects: ${status.projectCount}`);
```

---

#### `exportDatabase(): Promise<any | null>`

Export database to JSON format (for backup or analysis).

```typescript
const backup = await dataMigrationService.exportDatabase();

if (backup) {
  console.log('Backup timestamp:', backup.timestamp);
  console.log('Users:', backup.data.users.length);
  console.log('Projects:', backup.data.projects.length);
  
  // Save to file
  const jsonStr = JSON.stringify(backup, null, 2);
  downloadFile(jsonStr, 'database-backup.json');
}
```

---

#### `clearDatabase(): Promise<boolean>`

⚠️ **DANGEROUS** - Delete all data from database.

```typescript
const success = await dataMigrationService.clearDatabase();
if (success) {
  console.log('Database cleared');
}
```

**Use only for:**
- Testing
- Development reset
- Before complete reinitialization

**DO NOT use in production**

---

## Integration with App

### Option 1: Auto-initialize on First Load

Initialize database automatically when app detects it's empty:

```typescript
// In App.tsx useEffect
useEffect(() => {
  const initializeIfNeeded = async () => {
    const status = await dataMigrationService.getStatus();
    
    if (!status.isSeeded) {
      console.log('First time setup - initializing database...');
      const result = await dataMigrationService.initializeDatabase();
      
      if (result.success) {
        console.log('✅ Database initialized!');
        result.details.forEach(detail => console.log(detail));
      } else {
        console.error('❌ Database initialization failed');
        result.details.forEach(detail => console.error(detail));
      }
    }
  };

  initializeIfNeeded();
}, []);
```

### Option 2: Manual Initialization

Provide UI button for admin to initialize database:

```typescript
const [isInitializing, setIsInitializing] = useState(false);

const handleInitialize = async () => {
  setIsInitializing(true);
  const result = await dataMigrationService.initializeDatabase();
  
  if (result.success) {
    alert(result.message);
    result.details.forEach(detail => console.log(detail));
    // Reload app to get new users
    window.location.reload();
  } else {
    alert('Initialization failed: ' + result.message);
  }
  
  setIsInitializing(false);
};

return (
  <button onClick={handleInitialize} disabled={isInitializing}>
    {isInitializing ? 'Initializing...' : 'Initialize Database'}
  </button>
);
```

### Option 3: Browser Console (Development)

Run directly in browser console for quick testing:

```typescript
// In browser console
const { default: dataMigrationService } = await import('/services/dataMigration.ts');
const result = await dataMigrationService.initializeDatabase();
console.log(result);
```

---

## How It Works

### Step 1: Check if Seeded
```typescript
const isSeeded = await this.isDatabaseSeeded();
if (isSeeded) return; // Already has data, skip
```

### Step 2: Create Test Users
```typescript
// Creates 5 users with realistic test data
- admin@planejar.com
- diego.garcia@grupociatos.com.br
- joao.completo@email.com
- maria.completo@email.com
- servicos@grupociatos.com.br
```

### Step 3: Create Test Project
```typescript
// Creates "Holding Família Completo" project
// Assigns Diego as consultant
// Assigns João and Maria as clients
```

### Step 4: Seed Phase Data
```typescript
// Fills in Phase 1 with diagnostic info
// Adds personal data for both clients (CPF, RG, etc.)
```

---

## Test Data Details

### Project: "Holding Família Completo"
- **Status:** in-progress
- **Current Phase:** 1
- **Consultant:** Diego Garcia
- **Clients:** João da Silva, Maria Souza

### João's Profile
- **CPF:** 111.222.333-44
- **RG:** 12.345.678-9
- **Marital Status:** Casado
- **Property Regime:** Comunhão Parcial
- **Birth Date:** 1965-05-20
- **Address:** Rua das Flores, 123, São Paulo, SP
- **Declares Income Tax:** Yes

### Maria's Profile
- **CPF:** 222.333.444-55
- **RG:** 23.456.789-0
- **Marital Status:** Casada
- **Property Regime:** Comunhão Parcial
- **Birth Date:** 1968-08-15
- **Address:** Rua das Flores, 123, São Paulo, SP
- **Declares Income Tax:** Yes

### Phase 1 Diagnostic Data
- **Objectives:** Proteção patrimonial e planejamento sucessório
- **Family:** João (patriarca), Maria (esposa), Pedro (filho), Ana (filha)
- **Assets:** 2 apartamentos, 1 sala comercial, participações na ABC Ltda, R$ 500.000
- **Existing Companies:** ABC Comércio Ltda
- **Meeting Link:** https://meet.google.com/example

---

## Idempotency (Safe to Run Multiple Times)

The `initializeDatabase()` function is **idempotent**:

```typescript
// First run: Creates all data
await dataMigrationService.initializeDatabase();

// Second run: Detects data exists, returns success
await dataMigrationService.initializeDatabase();
// No duplicate data created!

// Third run: Same as second
await dataMigrationService.initializeDatabase();
```

This is achieved by:
1. Checking if database has data first
2. Checking if each user already exists before creating
3. Checking if project already exists before creating

---

## Logging and Debugging

All operations log to console:

```
🌱 Seeding test users...
  ✓ Created user: admin@planejar.com
  ✓ Created user: diego.garcia@grupociatos.com.br
  ✓ User already exists: joao.completo@email.com
  ✓ Created user: maria.completo@email.com
  ✓ Created user: servicos@grupociatos.com.br
✅ Test users seeding complete

🌱 Seeding test project...
  ✓ Created project: Holding Família Completo
  ✓ Added João as client
  ✓ Added Maria as client
  ✓ Seeded Phase 1 data
  ✓ Added qualification data for João
  ✓ Added qualification data for Maria
✅ Test project seeding complete

🎉 Database initialization complete!

Test Credentials:
- Admin: admin@planejar.com / admin123
- Consultant: diego.garcia@grupociatos.com.br / 250500
- Client 1: joao.completo@email.com / 123
- Client 2: maria.completo@email.com / 123
- Auxiliary: servicos@grupociatos.com.br / 123456
```

---

## Common Scenarios

### Scenario 1: Fresh Deployment
```typescript
// Automatically initialize on first load
const status = await dataMigrationService.getStatus();
if (!status.isSeeded) {
  await dataMigrationService.initializeDatabase();
}
```

### Scenario 2: Add More Test Data
```typescript
// Existing data is preserved
await dataMigrationService.seedTestProject(); // Creates another project
```

### Scenario 3: Reset for Testing
```typescript
// Clear and reinitialize
await dataMigrationService.clearDatabase();
await dataMigrationService.initializeDatabase();
```

### Scenario 4: Backup Before Major Change
```typescript
// Export current data
const backup = await dataMigrationService.exportDatabase();
saveToFile(backup);

// Make changes...
// If needed, can reference the backup
```

---

## What's Next

Step 4 will refactor `App.tsx` to use Supabase for all data operations instead of in-memory state. This is the largest change and will:
- Replace `useState` with Supabase queries
- Add auth state listening
- Convert actions to async
- Remove mock data entirely

---

## Troubleshooting

**Q: Seeding fails with "User already exists"**
A: Normal behavior. The service is idempotent - it checks before creating.

**Q: No error but users not created**
A: Check:
1. Supabase Auth table is accessible
2. RLS policies allow inserts
3. Check browser console for specific errors

**Q: How do I create more test data?**
A: Call `seedTestUsers()` and `seedTestProject()` again - they skip existing data.

**Q: Can I modify the seeded data?**
A: Yes! After seeding, all data is normal - you can edit via the UI.

**Q: How do I see what was created?**
A: Call `getStatus()` to see counts, or `exportDatabase()` to see full details.

---

**Status**: ✅ Complete and ready for Step 4 (App.tsx Refactor)
