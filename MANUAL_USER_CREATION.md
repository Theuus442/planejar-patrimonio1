# Manual Test User Creation Guide

Due to proxy constraints on Fly.io, automatic database seeding is disabled. You'll need to manually create test users in your Supabase dashboard.

## How to Create Test Users

### Step 1: Go to Your Supabase Project
1. Visit https://supabase.com
2. Log in to your account
3. Select your project: **puepexwgznjdtgrihxsa**
4. Click on **Authentication** in the left sidebar

### Step 2: Create Users

Click **"Create New User"** and add these test accounts:

#### User 1: Administrator
- **Email**: `admin@planejar.com`
- **Password**: `admin123`
- Click **Create User**

#### User 2: Consultant
- **Email**: `diego.garcia@grupociatos.com.br`
- **Password**: `250500`
- Click **Create User**

#### User 3: Client 1
- **Email**: `joao.completo@email.com`
- **Password**: `123`
- Click **Create User**

#### User 4: Client 2
- **Email**: `maria.completo@email.com`
- **Password**: `123`
- Click **Create User**

#### User 5: Auxiliary
- **Email**: `servicos@grupociatos.com.br`
- **Password**: `123456`
- Click **Create User**

### Step 3: Create Database Records

After creating the Auth users, you need to add them to the `users` table in your database.

1. Go to **Database** → **Tables** in Supabase
2. Select the **users** table
3. Click **Insert Row** for each user:

**Admin User:**
- `id`: Copy from Auth user (click on admin@planejar.com user in Auth)
- `name`: Administrador
- `email`: admin@planejar.com
- `role`: administrator
- `client_type`: (null)
- `avatar_url`: (null)
- `created_at`: (auto)

**Consultant User:**
- `id`: (from Auth)
- `name`: Diego Garcia
- `email`: diego.garcia@grupociatos.com.br
- `role`: consultant
- `client_type`: (null)

**Client 1:**
- `id`: (from Auth)
- `name`: João da Silva Completo
- `email`: joao.completo@email.com
- `role`: client
- `client_type`: partner

**Client 2:**
- `id`: (from Auth)
- `name`: Maria Souza Completo
- `email`: maria.completo@email.com
- `role`: client
- `client_type`: partner

**Auxiliary:**
- `id`: (from Auth)
- `name`: Gisele Pego
- `email`: servicos@grupociatos.com.br
- `role`: auxiliary
- `client_type`: (null)

## How to Find User IDs

1. Go to **Authentication** in Supabase
2. Click on the user
3. Copy the **User ID** from the right panel
4. Use this ID when inserting into the users table

## Test the App

Once users are created:

1. Go to your app: https://5e71392f1f704e7fab5be6315d3d12dc-b84ccab9c40745bd8bba0f47f.fly.dev
2. Click **Entrar** (Login)
3. Use one of the test credentials:
   - Email: `admin@planejar.com`
   - Password: `admin123`
4. You should see the appropriate dashboard for that role

## Troubleshooting

### "Invalid credentials" error
- Double-check the email and password match what you entered in Supabase
- Emails are case-insensitive but must match exactly otherwise
- Make sure the user exists in both **Auth** and the **users** table

### User doesn't appear in app after login
- Check that the user record is in the **users** table (not just Auth)
- Verify the user `id` in the users table matches the Auth user ID
- Make sure the `role` field is set correctly (administrator, consultant, client, auxiliary)

### Can't find User ID
- Go to Authentication → Users
- Click the user's email
- The User ID appears in the right panel as a long alphanumeric string
- Copy and paste it into your users table record

## Once You're Logged In

After successfully logging in as the consultant (diego.garcia@grupociatos.com.br), you can:

1. **Create Projects** - Assign clients to projects
2. **Create Clients** - Add new users to the system via the "Criar Cliente" feature
3. **Create Tasks** - Assign work within projects
4. **View Phases** - Navigate through the 10 project phases

## Automating User Creation (Future)

Once the Fly.io networking issue is resolved, you can re-enable automatic seeding by uncommenting the database initialization code in `App.tsx`.

For now, manual creation in the Supabase dashboard is the most reliable approach.

---

**Note:** This is a temporary workaround. Once Fly.io networking is configured properly, the app will auto-seed test data on first startup.
