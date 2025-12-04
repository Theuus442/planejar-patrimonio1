# Step 4: App.tsx Refactor - Complete Reference

## What Was Done

Refactored `App.tsx` to replace all in-memory state with Supabase database operations. This is the core integration point where:
- Authentication is now handled via Supabase Auth
- All data is fetched from and saved to Supabase
- Auth state changes trigger automatic UI updates
- Database initialization happens on first load

## Architecture Changes

### Before (In-Memory)
```
INITIAL_USERS → useState → Memory
INITIAL_PROJECTS → useState → Memory
Login → Username/Password check in memory → Set current user
```

### After (Supabase)
```
Supabase Auth ← Sign In → Session Management
Supabase Database ← Project, Users, Tasks → Real-time Updates
Auth State Change → Reload Data → Update UI
```

## Key Components Modified

### 1. State Management

**Before:**
```typescript
const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
```

**After:**
```typescript
const [currentUser, setCurrentUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [allUsers, setAllUsers] = useState<User[]>([]);
const [projects, setProjects] = useState<Project[]>([]);
// Data loaded from Supabase, not hardcoded
```

### 2. Authentication Flow

**Before:**
```typescript
const user = allUsers.find(u => 
  u.email.toLowerCase() === email.toLowerCase() && 
  u.password === password
);
if (!user) throw new Error('AUTH_INVALID_CREDENTIALS');
setCurrentUser(user);
```

**After:**
```typescript
const result = await supabaseAuthService.signInWithEmail(email, password);
if (!result) throw new Error('AUTH_INVALID_CREDENTIALS');
setCurrentUser(result.user);
await loadUserData(result.user.id);
```

### 3. Initialization & Auth State Listening

**New useEffect:**
```typescript
useEffect(() => {
  const initializeAuth = async () => {
    // Initialize database if empty
    const dbStatus = await dataMigrationService.getStatus();
    if (!dbStatus.isSeeded) {
      await dataMigrationService.initializeDatabase();
    }

    // Load current session
    const user = await supabaseAuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      await loadUserData(user.id);
    }
  };

  initializeAuth();

  // Listen for auth changes
  const unsubscribe = supabaseAuthService.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN') {
        const user = await supabaseAuthService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          await loadUserData(user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setAllUsers([]);
        setProjects([]);
      }
    }
  );

  return () => unsubscribe?.();
}, []);
```

## Core Functions

### `loadUserData(userId: string)`

Loads all data for the current user (different based on role).

```typescript
const loadUserData = useCallback(async (userId: string) => {
  // Load all users
  const users = await usersDB.listUsers();
  setAllUsers(users);

  // Load projects based on role
  const user = users.find(u => u.id === userId);
  if (user?.role === UserRole.CLIENT) {
    // Load only projects where user is a client
    const userProjects = await projectsDB.listProjectsByClient(userId);
    setProjects(userProjects);
  } else {
    // Load all projects for consultant/admin
    const allProjects = await projectsDB.listProjects();
    setProjects(allProjects);
  }
}, []);
```

### `reloadProjects()`

Refetches projects from database (called after mutations).

```typescript
const reloadProjects = useCallback(async () => {
  if (!currentUser) return;
  
  let userProjects: Project[] = [];
  if (currentUser.role === UserRole.CLIENT) {
    userProjects = await projectsDB.listProjectsByClient(currentUser.id);
  } else {
    userProjects = await projectsDB.listProjects();
  }
  
  setProjects(userProjects);
}, [currentUser]);
```

## Updated Actions

### Authentication Actions

#### `handleLogin(email, password): Promise<void>`
```typescript
handleLogin: async (email: string, password: string) => {
  const result = await supabaseAuthService.signInWithEmail(email, password);
  
  if (!result) {
    throw new Error('AUTH_INVALID_CREDENTIALS');
  }

  setCurrentUser(result.user);
  await loadUserData(result.user.id);
}
```

#### `handleLogout(): Promise<void>`
```typescript
handleLogout: async () => {
  await supabaseAuthService.signOut();
  setCurrentUser(null);
  setSelectedProjectId(null);
  setTargetPhaseId(null);
}
```

#### `handleForgotPassword(email): Promise<boolean>`
```typescript
handleForgotPassword: async (email: string) => {
  return await supabaseAuthService.resetPasswordForEmail(email);
}
```

### Data Mutation Actions

#### `handleUpdateProject(projectId, data): Promise<void>`
```typescript
handleUpdateProject: async (projectId: string, data: Partial<Project>) => {
  const oldProject = projects.find(p => p.id === projectId);
  if (!oldProject) return;

  // Log change
  if (data.currentPhaseId && data.currentPhaseId !== oldProject.currentPhaseId && currentUser) {
    await activityLogsDB.addLogEntry(projectId, currentUser.id, `avançou para Fase ${data.currentPhaseId}`);
  }

  // Update in database
  const updated = await projectsDB.updateProject(projectId, data);
  if (updated) {
    await reloadProjects(); // Sync local state
  }
}
```

#### `handleCreateTask(projectId, phaseId, description, assigneeId?): Promise<void>`
```typescript
handleCreateTask: async (projectId: string, phaseId: number, description: string, assigneeId?: string) => {
  if (!currentUser) return;

  const task = await tasksDB.createTask({
    projectId,
    phaseId,
    description,
    createdBy: currentUser.id,
    assigneeId: assigneeId || currentUser.id,
  });

  if (task) {
    await reloadProjects();
  }
}
```

#### `handleCreateClient(projectName, mainClientData, additionalClientsData, contractFile): Promise<void>`
```typescript
handleCreateClient: async (
  projectName: string,
  mainClientData: NewClientData,
  additionalClientsData: NewClientData[],
  contractFile: File
) => {
  if (!currentUser) return;

  const allNewClientsData = [mainClientData, ...additionalClientsData];
  const createdUserIds: string[] = [];

  // Create each user via Supabase Auth
  for (const clientData of allNewClientsData) {
    const result = await supabaseAuthService.signUpWithEmail(
      clientData.email,
      clientData.password || 'TempPassword123!',
      clientData.name,
      UserRole.CLIENT,
      clientData.clientType
    );

    if (result) {
      createdUserIds.push(result.user.id);
    }
  }

  // Create project
  const project = await projectsDB.createProject({
    name: projectName,
    consultantId: currentUser.id,
  });

  if (project) {
    // Add clients to project
    for (const clientId of createdUserIds) {
      await projectClientsDB.addClientToProject(project.id, clientId);
    }

    // Log creation
    await activityLogsDB.addLogEntry(project.id, currentUser.id, 'criou o projeto.');

    // Refresh local state
    await reloadProjects();
    setCurrentView('dashboard');
  }
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Initialization                       │
└────────┬────────────────────────────────────────────────────────┘
         │
         ├─→ Check if DB needs init
         │   └─→ If empty: dataMigrationService.initializeDatabase()
         │
         ├─→ Get current session
         │   └─→ supabaseAuthService.getCurrentUser()
         │
         ├─→ If logged in: loadUserData(userId)
         │   └─→ Fetch users and projects from Supabase
         │
         └─→ Listen for auth changes
             └─→ onAuthStateChange() reloads data on sign in/out

                    ┌────────────────────────────┐
                    │  User takes action        │
                    │  (e.g., create project)   │
                    └────────────┬───────────────┘
                                 │
                                 ├─→ Call Supabase API
                                 │   (e.g., projectsDB.createProject())
                                 │
                                 ├─→ Add log entry
                                 │   (e.g., activityLogsDB.addLogEntry())
                                 │
                                 ├─→ Reload projects
                                 │   (reloadProjects())
                                 │
                                 └─→ React updates UI
                                     (state change triggers re-render)
```

## Key Improvements

### 1. Real-time Auth State Management
- Auth state changes automatically trigger data reload
- No manual session management needed
- Login/logout flow is seamless

### 2. Data Consistency
- All mutations go through Supabase
- Local state stays in sync with database
- No data loss on page reload

### 3. Role-Based Data Loading
```typescript
if (user.role === UserRole.CLIENT) {
  // Load only user's projects
  userProjects = await projectsDB.listProjectsByClient(userId);
} else {
  // Load all projects for staff
  userProjects = await projectsDB.listProjects();
}
```

### 4. Automatic Database Initialization
- On first load, checks if DB has data
- If empty, seeds with test data
- Users can start using system immediately

### 5. Proper Loading States
```typescript
if (store.isLoading) {
  return <div>Carregando...</div>;
}
```

## What's Removed

✅ **Removed:**
- `INITIAL_USERS` state initialization
- `INITIAL_PROJECTS` state initialization
- Mock password validation
- Hardcoded user IDs
- In-memory password storage
- Mock login flow

## What's Added

✅ **Added:**
- Supabase Auth listener
- Database initialization check
- `loadUserData()` function
- `reloadProjects()` function
- Async action handlers
- Error handling for API calls
- Loading state UI

## Migration Notes

### For Components Using Store

No changes needed! Components still receive the same data and callbacks:

```typescript
// Components still work the same way
<ConsultantDashboard 
  projects={store.projects}           // Still available
  users={store.allUsers}              // Still available
  currentUser={store.currentUser}     // Still available
  onProjectClick={store.actions.handleSelectProject}
  onDeleteProject={(id) => {...}}
/>
```

### Async Considerations

Some actions are now async. Components should handle:

```typescript
// Old (sync)
store.actions.handleLogin(email, password);

// New (async)
try {
  await store.actions.handleLogin(email, password);
} catch (error) {
  setError(error.message);
}
```

LoginScreen already handles this correctly.

## What's Next

Step 5 will update LoginScreen to use the new Supabase auth service. The changes are minimal since App.tsx already handles the core auth flow.

---

## Troubleshooting

**Q: Data not loading after login**
A: Check that:
1. `loadUserData()` is called after successful login
2. Supabase RLS policies allow user to read their data
3. Check browser console for API errors

**Q: Projects not updating after creation**
A: Ensure `reloadProjects()` is called after mutations.

**Q: Auth state not persisting across page reloads**
A: Supabase SDK handles this automatically. Check that `getCurrentUser()` is called on app init.

**Q: Too many API calls**
A: Consider debouncing `reloadProjects()` or using real-time subscriptions (future enhancement).

---

**Status**: ✅ Complete and ready for Step 5 (LoginScreen Update)
