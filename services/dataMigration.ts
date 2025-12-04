import { getSupabaseClient } from './supabaseService';
import supabaseAuthService from './supabaseAuth';
import { usersDB, projectsDB, projectClientsDB, phaseDataDB } from './supabaseDatabase';
import { UserRole } from '../types';

const supabase = getSupabaseClient();

// ============================================================================
// DATA MIGRATION SERVICE
// ============================================================================
// This service handles seeding Supabase with initial test data
// to ensure the system is ready for use immediately after deployment

export const dataMigrationService = {
  /**
   * Check if database is already seeded
   */
  async isDatabaseSeeded(): Promise<boolean> {
    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      return count ? count > 0 : false;
    } catch (error) {
      console.error('Error checking if database is seeded:', error);
      return false;
    }
  },

  /**
   * Seed test users for all roles
   */
  async seedTestUsers(): Promise<boolean> {
    try {
      console.log('🌱 Seeding test users...');

      const testUsers = [
        {
          email: 'admin@planejar.com',
          password: 'admin123',
          name: 'Administrador',
          role: UserRole.ADMINISTRATOR,
          clientType: undefined,
        },
        {
          email: 'diego.garcia@grupociatos.com.br',
          password: '250500',
          name: 'Diego Garcia',
          role: UserRole.CONSULTANT,
          clientType: undefined,
        },
        {
          email: 'joao.completo@email.com',
          password: '123',
          name: 'João da Silva Completo',
          role: UserRole.CLIENT,
          clientType: 'partner',
        },
        {
          email: 'maria.completo@email.com',
          password: '123',
          name: 'Maria Souza Completo',
          role: UserRole.CLIENT,
          clientType: 'partner',
        },
        {
          email: 'servicos@grupociatos.com.br',
          password: '123456',
          name: 'Gisele Pego',
          role: UserRole.AUXILIARY,
          clientType: undefined,
        },
      ];

      for (const userData of testUsers) {
        try {
          // Check if user already exists
          const existingUser = await supabaseAuthService.getUserByEmail(userData.email);
          if (existingUser) {
            console.log(`  ✓ User already exists: ${userData.email}`);
            continue;
          }

          // Create auth user with retry
          let result = null;
          let retries = 2;

          while (retries > 0 && !result) {
            try {
              result = await supabaseAuthService.signUpWithEmail(
                userData.email,
                userData.password,
                userData.name,
                userData.role as UserRole,
                userData.clientType as 'partner' | 'interested' | undefined
              );

              if (result) {
                console.log(`  ✓ Created user: ${userData.email}`);
                break;
              }
            } catch (retryError) {
              retries--;
              if (retries > 0) {
                console.warn(`  ⚠ Retrying user creation for ${userData.email}...`);
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1500));
              } else {
                throw retryError;
              }
            }
          }

          if (!result) {
            console.error(`  ✗ Failed to create user: ${userData.email}`);
          }
        } catch (error) {
          console.error(`  ✗ Error creating user ${userData.email}:`, error);
        }
      }

      console.log('✅ Test users seeding complete');
      return true;
    } catch (error) {
      console.error('Error seeding test users:', error);
      return false;
    }
  },

  /**
   * Seed test project with sample data
   */
  async seedTestProject(): Promise<boolean> {
    try {
      console.log('🌱 Seeding test project...');

      // Get the consultant and client users
      const consultant = await supabaseAuthService.getUserByEmail('diego.garcia@grupociatos.com.br');
      const joao = await supabaseAuthService.getUserByEmail('joao.completo@email.com');
      const maria = await supabaseAuthService.getUserByEmail('maria.completo@email.com');

      if (!consultant || !joao || !maria) {
        console.error('  ✗ Required test users not found');
        return false;
      }

      // Check if project already exists
      const existing = await projectsDB.listProjectsByConsultant(consultant.id);
      if (existing.length > 0) {
        console.log('  ✓ Test project already exists');
        return true;
      }

      // Create project
      const project = await projectsDB.createProject({
        name: 'Holding Família Completo',
        consultantId: consultant.id,
        auxiliaryId: undefined,
      });

      if (!project) {
        console.error('  ✗ Failed to create test project');
        return false;
      }

      console.log(`  ✓ Created project: ${project.name}`);

      // Add clients to project
      await projectClientsDB.addClientToProject(project.id, joao.id);
      console.log(`  ✓ Added João as client`);

      await projectClientsDB.addClientToProject(project.id, maria.id);
      console.log(`  ✓ Added Maria as client`);

      // Seed phase 1 data
      await phaseDataDB.updatePhase1Data(project.id, {
        objectives: 'Proteção patrimonial e planejamento sucessório.',
        familyComposition: 'João (patriarca), Maria (esposa), Pedro (filho), Ana (filha).',
        mainAssets: '2 apartamentos, 1 sala comercial, participações na ABC Ltda, R$ 500.000 em investimentos.',
        partners: 'João da Silva Completo e Maria Souza Completo.',
        existingCompanies: 'ABC Comércio Ltda.',
        meetingLink: 'https://meet.google.com/example',
      });

      console.log(`  ✓ Seeded Phase 1 data`);

      // Add qualification data for João
      await usersDB.updateQualificationData(joao.id, {
        cpf: '111.222.333-44',
        rg: '12.345.678-9',
        maritalStatus: 'casado',
        propertyRegime: 'comunhao_parcial',
        birthDate: '1965-05-20',
        nationality: 'Brasileiro',
        address: 'Rua das Flores, 123, São Paulo, SP',
        phone: '11987654321',
        declaresIncomeTax: true,
      });

      console.log(`  ✓ Added qualification data for João`);

      // Add qualification data for Maria
      await usersDB.updateQualificationData(maria.id, {
        cpf: '222.333.444-55',
        rg: '23.456.789-0',
        maritalStatus: 'casado',
        propertyRegime: 'comunhao_parcial',
        birthDate: '1968-08-15',
        nationality: 'Brasileira',
        address: 'Rua das Flores, 123, São Paulo, SP',
        phone: '11987654322',
        declaresIncomeTax: true,
      });

      console.log(`  ✓ Added qualification data for Maria`);

      console.log('✅ Test project seeding complete');
      return true;
    } catch (error) {
      console.error('Error seeding test project:', error);
      return false;
    }
  },

  /**
   * Initialize entire database with seed data
   * Safe to run multiple times (checks for existing data)
   */
  async initializeDatabase(): Promise<{
    success: boolean;
    message: string;
    details: string[];
  }> {
    const details: string[] = [];

    try {
      console.log('🚀 Starting database initialization...\n');

      // Check if already seeded
      const isSeeded = await this.isDatabaseSeeded();
      if (isSeeded) {
        const msg = 'Database is already initialized with data';
        console.log(`⚠️  ${msg}`);
        return {
          success: true,
          message: msg,
          details: ['Database contains data - no action taken'],
        };
      }

      details.push('Database is empty - starting initialization');

      // Step 1: Seed users
      const usersSeeded = await this.seedTestUsers();
      if (usersSeeded) {
        details.push('✓ Test users created successfully');
      } else {
        details.push('✗ Failed to seed test users');
        return {
          success: false,
          message: 'Database initialization failed during user seeding',
          details,
        };
      }

      // Step 2: Seed project
      const projectSeeded = await this.seedTestProject();
      if (projectSeeded) {
        details.push('✓ Test project created successfully');
      } else {
        details.push('✗ Failed to seed test project');
        return {
          success: false,
          message: 'Database initialization failed during project seeding',
          details,
        };
      }

      details.push('');
      details.push('🎉 Database initialization complete!');
      details.push('');
      details.push('Test Credentials:');
      details.push('- Admin: admin@planejar.com / admin123');
      details.push('- Consultant: diego.garcia@grupociatos.com.br / 250500');
      details.push('- Client 1: joao.completo@email.com / 123');
      details.push('- Client 2: maria.completo@email.com / 123');
      details.push('- Auxiliary: servicos@grupociatos.com.br / 123456');

      return {
        success: true,
        message: 'Database initialized successfully',
        details,
      };
    } catch (error) {
      console.error('Fatal error during database initialization:', error);
      return {
        success: false,
        message: 'Database initialization failed with fatal error',
        details: [...details, `Error: ${error}`],
      };
    }
  },

  /**
   * Clear all data from database (DANGEROUS - for testing only)
   */
  async clearDatabase(): Promise<boolean> {
    try {
      console.warn('⚠️  WARNING: Clearing all database data...');

      // Delete in correct order to respect foreign keys
      await supabase.from('chat_messages').delete().neq('id', '');
      await supabase.from('activity_logs').delete().neq('id', '');
      await supabase.from('tasks').delete().neq('id', '');
      await supabase.from('notifications').delete().neq('id', '');
      await supabase.from('user_documents').delete().neq('id', '');
      await supabase.from('partner_qualification_data').delete().neq('id', '');
      await supabase.from('assets').delete().neq('id', '');
      await supabase.from('documents').delete().neq('id', '');
      await supabase.from('phase_3_data').delete().neq('id', '');
      await supabase.from('project_clients').delete().neq('id', '');
      await supabase.from('projects').delete().neq('id', '');
      await supabase.from('users').delete().neq('id', '');

      console.log('✅ Database cleared');
      return true;
    } catch (error) {
      console.error('Error clearing database:', error);
      return false;
    }
  },

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    isSeeded: boolean;
    userCount: number;
    projectCount: number;
  }> {
    try {
      const users = await usersDB.listUsers();
      const projects = await projectsDB.listProjects();

      return {
        isSeeded: users.length > 0,
        userCount: users.length,
        projectCount: projects.length,
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return {
        isSeeded: false,
        userCount: 0,
        projectCount: 0,
      };
    }
  },

  /**
   * Export database to JSON (for backup)
   */
  async exportDatabase(): Promise<any | null> {
    try {
      const users = await usersDB.listUsers();
      const projects = await projectsDB.listProjects();

      return {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          users: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            clientType: u.clientType,
            qualificationData: u.qualificationData,
          })),
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            currentPhaseId: p.currentPhaseId,
            clientIds: p.clientIds,
          })),
        },
      };
    } catch (error) {
      console.error('Error exporting database:', error);
      return null;
    }
  },
};

export default dataMigrationService;
