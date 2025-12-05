-- ============================================================================
-- SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Run this SQL in your Supabase project's SQL Editor
-- Path: SQL Editor > New Query > Paste this content > Run

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  role VARCHAR NOT NULL CHECK (role IN ('client', 'consultant', 'auxiliary', 'administrator')),
  avatar_url VARCHAR,
  client_type VARCHAR CHECK (client_type IS NULL OR client_type IN ('partner', 'interested')),
  requires_password_change BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. PARTNER QUALIFICATION DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS partner_qualification_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cpf VARCHAR,
  rg VARCHAR,
  marital_status VARCHAR CHECK (marital_status IS NULL OR marital_status IN ('solteiro', 'casado', 'uniao_estavel', 'divorciado', 'viuvo')),
  property_regime VARCHAR CHECK (property_regime IS NULL OR property_regime IN ('comunhao_parcial', 'comunhao_universal', 'separacao_total', 'participacao_final_nos_aquestos')),
  birth_date DATE,
  nationality VARCHAR,
  address VARCHAR,
  phone VARCHAR,
  declares_income_tax BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. USER DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  category VARCHAR NOT NULL CHECK (category IN ('identity', 'address', 'marriage', 'tax_return', 'other')),
  url VARCHAR NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'archived')),
  current_phase_id INTEGER DEFAULT 1,
  consultant_id UUID REFERENCES users(id) ON DELETE SET NULL,
  auxiliary_id UUID REFERENCES users(id) ON DELETE SET NULL,
  post_completion_status VARCHAR CHECK (post_completion_status IS NULL OR post_completion_status IN ('pending_choice', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. PROJECT CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, client_id)
);

-- ============================================================================
-- 6. DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  url VARCHAR NOT NULL,
  type VARCHAR CHECK (type IN ('pdf', 'doc', 'other')),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  version INTEGER DEFAULT 1,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL,
  description VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved')),
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee_role VARCHAR CHECK (assignee_role IS NULL OR assignee_role IN ('client', 'consultant', 'auxiliary', 'administrator')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  related_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by_ai BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  approved_at TIMESTAMP
);

-- ============================================================================
-- 8. CHAT MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chat_type VARCHAR NOT NULL CHECK (chat_type IN ('client', 'internal')),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_name VARCHAR NOT NULL,
  author_avatar_url VARCHAR,
  author_role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. ACTIVITY LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name VARCHAR NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. PHASE 1 DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_1_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  diagnostic_summary TEXT,
  objectives TEXT,
  family_composition TEXT,
  main_assets TEXT,
  partners TEXT,
  existing_companies TEXT,
  is_form_completed BOOLEAN DEFAULT FALSE,
  meeting_scheduled BOOLEAN DEFAULT FALSE,
  meeting_date_time TIMESTAMP,
  meeting_link VARCHAR,
  meeting_minutes TEXT,
  consultant_checklist JSONB,
  analyzed_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. PHASE 2 DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_2_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  company_data JSONB,
  status VARCHAR DEFAULT 'pending_client' CHECK (status IN ('pending_client', 'pending_consultant_review', 'approved')),
  process_status VARCHAR DEFAULT 'pending_start' CHECK (process_status IN ('pending_start', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. PHASE 2 PARTNERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_2_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_2_data_id UUID NOT NULL REFERENCES phase_2_data(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  is_administrator BOOLEAN DEFAULT FALSE,
  participation DECIMAL(5,2),
  data_status VARCHAR DEFAULT 'pending' CHECK (data_status IN ('pending', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. PHASE 3 DATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS phase_3_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'pending_client' CHECK (status IN ('pending_client', 'pending_consultant_review', 'approved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 14. ASSETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_3_data_id UUID NOT NULL REFERENCES phase_3_data(id) ON DELETE CASCADE,
  owner_partner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type VARCHAR NOT NULL CHECK (type IN ('property', 'vehicle', 'cash', 'other')),
  description TEXT NOT NULL,
  value DECIMAL(15,2),
  market_value DECIMAL(15,2),
  status VARCHAR DEFAULT 'pendente' CHECK (status IN ('pendente', 'completo', 'em_correcao', 'validado')),
  consultant_observations TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  property_type VARCHAR CHECK (property_type IS NULL OR property_type IN ('casa', 'apartamento', 'terreno', 'sala_comercial')),
  address VARCHAR,
  registration_number VARCHAR,
  registry_office VARCHAR,
  certificate_date VARCHAR,
  usage VARCHAR,
  year INTEGER,
  license_plate VARCHAR,
  renavam VARCHAR,
  registration_details VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 15. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR,
  is_read BOOLEAN DEFAULT FALSE,
  type VARCHAR CHECK (type IS NULL OR type IN ('message', 'task', 'alert')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_consultant ON projects(consultant_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_clients_client ON project_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) - OPTIONAL
-- ============================================================================
-- Uncomment the lines below if you want to enable RLS for security
-- This is recommended for production but can be skipped for development

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEMA CREATED SUCCESSFULLY
-- ============================================================================
-- All tables are now ready for use!
-- The app will automatically seed test data on first startup.
