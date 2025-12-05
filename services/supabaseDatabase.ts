import { getSupabaseClient } from './supabaseService';
import { getInitialProjectPhases } from '../constants';
import {
  User,
  Project,
  Task,
  Document,
  ChatMessage,
  LogEntry,
  Asset,
  Phase1Data,
  Phase2Data,
  Phase3Data,
  Phase4MinutaData,
  Phase5ITBIData,
  Phase6RegistrationData,
  Phase7ConclusionData,
  Phase8QuotasData,
  Phase9AgreementData,
  Phase10SupportData,
} from '../types';

let supabase: any = null;

const getSupabase = () => {
  if (!supabase) {
    supabase = getSupabaseClient();
  }
  return supabase;
};

// ============================================================================
// USERS
// ============================================================================
export const usersDB = {
  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return null;
    }
    return mapDatabaseUserToAppUser(data);
  },

  async listUsers(): Promise<User[]> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error listing users:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return Promise.all(data.map(u => mapDatabaseUserToAppUser(u)));
  },

  async listUsersByRole(role: string): Promise<User[]> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('role', role)
      .order('name');
    
    if (error) {
      console.error('Error listing users by role:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return Promise.all(data.map(u => mapDatabaseUserToAppUser(u)));
  },

  async createUser(user: Partial<User> & { id: string }): Promise<User | null> {
    try {
      const { data, error } = await getSupabase()
        .from('users')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatarUrl,
          client_type: user.clientType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting user in database:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        throw new Error(error.message || 'Erro ao criar usuário no banco de dados');
      }

      return await mapDatabaseUserToAppUser(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error creating user:', {
        message: errorMessage,
        error: err,
      });
      throw new Error(errorMessage || 'Erro desconhecido ao criar usuário');
    }
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .update({
        name: updates.name,
        avatar_url: updates.avatarUrl,
        client_type: updates.clientType,
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return null;
    }
    
    return mapDatabaseUserToAppUser(data);
  },

  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('Error deleting user:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },

  async updateQualificationData(userId: string, qualificationData: any): Promise<boolean> {
    const { error } = await getSupabase()
      .from('partner_qualification_data')
      .upsert([{
        user_id: userId,
        cpf: qualificationData.cpf,
        rg: qualificationData.rg,
        marital_status: qualificationData.maritalStatus,
        property_regime: qualificationData.propertyRegime,
        birth_date: qualificationData.birthDate,
        nationality: qualificationData.nationality,
        address: qualificationData.address,
        phone: qualificationData.phone,
        declares_income_tax: qualificationData.declaresIncomeTax,
      }])
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating qualification data:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },

  async getQualificationData(userId: string): Promise<any | null> {
    const { data, error } = await getSupabase()
      .from('partner_qualification_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching qualification data:', error.message || error);
      return null;
    }

    if (!data) {
      return null;
    }

    return mapDatabaseQualificationToAppQualification(data);
  },
};

// ============================================================================
// USER DOCUMENTS
// ============================================================================
export const userDocumentsDB = {
  async uploadUserDocument(userId: string, document: any): Promise<boolean> {
    const { error } = await getSupabase()
      .from('user_documents')
      .insert([{
        user_id: userId,
        name: document.name,
        category: document.category,
        url: document.url,
      }]);
    
    if (error) {
      console.error('Error uploading user document:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },

  async getUserDocuments(userId: string): Promise<any[]> {
    const { data, error } = await getSupabase()
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user documents:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return data.map(mapDatabaseDocumentToAppDocument);
  },

  async deleteUserDocument(documentId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('user_documents')
      .delete()
      .eq('id', documentId);
    
    if (error) {
      console.error('Error deleting user document:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },
};

// ============================================================================
// PROJECTS
// ============================================================================
export const projectsDB = {
  async getProject(projectId: string): Promise<Project | null> {
    try {
      const { data, error } = await getSupabase()
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return null;
      }

      return await mapDatabaseProjectToAppProject(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error fetching project:', {
        message: errorMessage,
        error: err,
      });
      return null;
    }
  },

  async listProjects(): Promise<Project[]> {
    try {
      const { data, error } = await getSupabase()
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing projects:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return [];
      }

      return Promise.all(data.map(p => mapDatabaseProjectToAppProject(p)));
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error listing projects:', {
        message: errorMessage,
        error: err,
      });
      return [];
    }
  },

  async listProjectsByConsultant(consultantId: string): Promise<Project[]> {
    try {
      const { data, error } = await getSupabase()
        .from('projects')
        .select('*')
        .eq('consultant_id', consultantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing projects:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return [];
      }

      return Promise.all(data.map(p => mapDatabaseProjectToAppProject(p)));
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error listing projects:', {
        message: errorMessage,
        error: err,
      });
      return [];
    }
  },

  async listProjectsByClient(clientId: string): Promise<Project[]> {
    try {
      const { data, error } = await getSupabase()
        .from('project_clients')
        .select('project_id')
        .eq('client_id', clientId);

      if (error) {
        console.error('Error listing client projects:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return [];
      }

      const projectIds = data.map(d => d.project_id);

      if (projectIds.length === 0) return [];

      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projectError) {
        console.error('Error fetching client projects:', {
          code: projectError.code,
          message: projectError.message,
          details: projectError.details,
        });
        return [];
      }

      return Promise.all(projects.map(p => mapDatabaseProjectToAppProject(p)));
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error listing client projects:', {
        message: errorMessage,
        error: err,
      });
      return [];
    }
  },

  async createProject(project: Partial<Project> & { name: string; consultantId: string }): Promise<Project | null> {
    try {
      const { data, error } = await getSupabase()
        .from('projects')
        .insert([{
          name: project.name,
          status: 'in-progress',
          current_phase_id: 1,
          consultant_id: project.consultantId,
          auxiliary_id: project.auxiliaryId,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return null;
      }

      return await mapDatabaseProjectToAppProject(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error creating project:', {
        message: errorMessage,
        error: err,
      });
      return null;
    }
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      // Define allowed columns that can be updated in the projects table
      const allowedColumns = [
        'name',
        'status',
        'current_phase_id',
        'auxiliary_id',
        'post_completion_status',
        'phases'
      ];

      // Handle phase data updates separately (stored in separate tables)
      if (updates.phases !== undefined) {
        const currentProject = await this.getProject(projectId);
        if (currentProject && currentProject.phases) {
          // Check each phase for updates
          for (let i = 0; i < updates.phases.length; i++) {
            const updatedPhase = updates.phases[i];
            const currentPhase = currentProject.phases[i];

            // Phase 1 data
            if (updatedPhase.id === 1 && updatedPhase.phase1Data && JSON.stringify(updatedPhase.phase1Data) !== JSON.stringify(currentPhase?.phase1Data)) {
              await phaseDataDB.updatePhase1Data(projectId, updatedPhase.phase1Data);
            }
            // Phase 2 data
            else if (updatedPhase.id === 2 && updatedPhase.phase2Data && JSON.stringify(updatedPhase.phase2Data) !== JSON.stringify(currentPhase?.phase2Data)) {
              await phaseDataDB.updatePhase2Data(projectId, updatedPhase.phase2Data);
            }
            // Phase 3 data
            else if (updatedPhase.id === 3 && updatedPhase.phase3Data && JSON.stringify(updatedPhase.phase3Data) !== JSON.stringify(currentPhase?.phase3Data)) {
              await phaseDataDB.updatePhase3Data(projectId, updatedPhase.phase3Data);
            }
          }
        }
        // Don't update phases in the projects table, they're stored separately
        delete updates.phases;
      }

      // Build update object with only defined fields for the projects table
      const updateObj: any = {};

      if (updates.name !== undefined) updateObj.name = updates.name;
      if (updates.status !== undefined) updateObj.status = updates.status;
      if (updates.currentPhaseId !== undefined) updateObj.current_phase_id = updates.currentPhaseId;
      if (updates.auxiliaryId !== undefined) updateObj.auxiliary_id = updates.auxiliaryId;
      if (updates.postCompletionStatus !== undefined) updateObj.post_completion_status = updates.postCompletionStatus;

      // If only phases were being updated, just return the current project
      if (Object.keys(updateObj).length === 0) {
        console.warn('updateProject called with only phase data. No project table fields updated.');
        return await this.getProject(projectId);
      }

      const { data, error } = await getSupabase()
        .from('projects')
        .update(updateObj)
        .eq('id', projectId)
        .select();

      if (error) {
        console.error('Error updating project:', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return null;
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.error('Error updating project: No data returned from update. ProjectId:', projectId, 'Updates:', updateObj);
        return null;
      }

      const projectData = Array.isArray(data) ? data[0] : data;
      return await mapDatabaseProjectToAppProject(projectData);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error updating project:', {
        message: errorMessage,
        error: err,
      });
      return null;
    }
  },

  async deleteProject(projectId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) {
      console.error('Error deleting project:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },
};

// ============================================================================
// PROJECT CLIENTS
// ============================================================================
export const projectClientsDB = {
  async addClientToProject(projectId: string, clientId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('project_clients')
      .insert([{
        project_id: projectId,
        client_id: clientId,
      }]);
    
    if (error) {
      console.error('Error adding client to project:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },

  async removeClientFromProject(projectId: string, clientId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('project_clients')
      .delete()
      .eq('project_id', projectId)
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error removing client from project:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },

  async getProjectClients(projectId: string): Promise<User[]> {
    const { data, error } = await getSupabase()
      .from('project_clients')
      .select('client_id')
      .eq('project_id', projectId);
    
    if (error) {
      console.error('Error fetching project clients:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    const users = await Promise.all(
      data.map(d => usersDB.getUser(d.client_id))
    );
    
    return users.filter((u): u is User => u !== null);
  },
};

// ============================================================================
// DOCUMENTS
// ============================================================================
export const documentsDB = {
  async uploadDocument(document: Partial<Document> & { projectId: string; phaseId: number; name: string; url: string }): Promise<Document | null> {
    const { data, error } = await getSupabase()
      .from('documents')
      .insert([{
        project_id: document.projectId,
        phase_id: document.phaseId,
        name: document.name,
        url: document.url,
        type: document.type || 'pdf',
        uploaded_by: document.uploadedBy,
        version: 1,
        status: 'active',
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error uploading document:', error);
      return null;
    }
    
    return mapDatabaseDocumentToAppDocument(data);
  },

  async getDocument(documentId: string): Promise<Document | null> {
    const { data, error } = await getSupabase()
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) {
      console.error('Error fetching document:', error);
      return null;
    }
    
    return mapDatabaseDocumentToAppDocument(data);
  },

  async listProjectDocuments(projectId: string): Promise<Document[]> {
    const { data, error } = await getSupabase()
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error listing documents:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return data.map(mapDatabaseDocumentToAppDocument);
  },

  async listPhaseDocuments(projectId: string, phaseId: number): Promise<Document[]> {
    const { data, error } = await getSupabase()
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .eq('status', 'active')
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error listing phase documents:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return data.map(mapDatabaseDocumentToAppDocument);
  },

  async deleteDocument(documentId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('documents')
      .update({ status: 'deprecated' })
      .eq('id', documentId);
    
    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }
    return true;
  },
};

// ============================================================================
// TASKS
// ============================================================================
export const tasksDB = {
  async createTask(task: Partial<Task> & { projectId: string; phaseId: number; description: string; createdBy: string }): Promise<Task | null> {
    const { data, error } = await getSupabase()
      .from('tasks')
      .insert([{
        project_id: task.projectId,
        phase_id: task.phaseId,
        description: task.description,
        status: 'pending',
        assignee_id: task.assigneeId,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating task:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return null;
    }
    
    return mapDatabaseTaskToAppTask(data);
  },

  async listProjectTasks(projectId: string): Promise<Task[]> {
    const { data, error } = await getSupabase()
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error listing tasks:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return data.map(mapDatabaseTaskToAppTask);
  },

  async listPhaseTasks(projectId: string, phaseId: number): Promise<Task[]> {
    const { data, error } = await getSupabase()
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error listing phase tasks:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return data.map(mapDatabaseTaskToAppTask);
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const { data, error } = await getSupabase()
      .from('tasks')
      .update({
        status: updates.status,
        assignee_id: updates.assigneeId,
      })
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating task:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return null;
    }
    
    return mapDatabaseTaskToAppTask(data);
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      console.error('Error deleting task:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },
};

// ============================================================================
// CHAT MESSAGES
// ============================================================================
export const chatDB = {
  async sendMessage(projectId: string, chatType: 'client' | 'internal', message: ChatMessage): Promise<ChatMessage | null> {
    const { data, error } = await getSupabase()
      .from('chat_messages')
      .insert([{
        project_id: projectId,
        chat_type: chatType,
        author_id: message.authorId,
        content: message.content,
        created_at: message.timestamp,
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error sending message:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return null;
    }
    
    return mapDatabaseChatMessageToAppChatMessage(data, message.authorName, message.authorRole);
  },

  async getMessages(projectId: string, chatType: 'client' | 'internal'): Promise<ChatMessage[]> {
    const { data, error } = await getSupabase()
      .from('chat_messages')
      .select('*, users(name, role)')
      .eq('project_id', projectId)
      .eq('chat_type', chatType)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return data.map((msg: any) => ({
      id: msg.id,
      authorId: msg.author_id,
      authorName: msg.users?.name || 'Unknown',
      authorRole: msg.users?.role || 'client',
      content: msg.content,
      timestamp: msg.created_at,
    }));
  },
};

// ============================================================================
// ACTIVITY LOGS
// ============================================================================
export const activityLogsDB = {
  async addLogEntry(projectId: string, actorId: string, action: string): Promise<boolean> {
    const actor = await usersDB.getUser(actorId);
    const actorName = actor?.name || 'Unknown';
    
    const { error } = await getSupabase()
      .from('activity_logs')
      .insert([{
        project_id: projectId,
        actor_id: actorId,
        action: action,
        created_at: new Date().toISOString(),
      }]);
    
    if (error) {
      console.error('Error adding log entry:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return false;
    }
    return true;
  },

  async getActivityLog(projectId: string): Promise<LogEntry[]> {
    const { data, error } = await getSupabase()
      .from('activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching activity log:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return [];
    }
    
    return Promise.all(
      data.map(async (log) => {
        const actor = await usersDB.getUser(log.actor_id);
        return {
          id: log.id,
          actorId: log.actor_id,
          actorName: actor?.name || 'Unknown',
          action: log.action,
          timestamp: log.created_at,
        };
      })
    );
  },
};

// ============================================================================
// PHASE DATA - GENERIC OPERATIONS
// ============================================================================
export const phaseDataDB = {
  async getPhase1Data(projectId: string): Promise<Phase1Data | null> {
    const { data, error } = await getSupabase()
      .from('phase_1_data')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching phase 1 data:', error);
    }
    
    return data ? mapDatabasePhase1DataToAppPhase1Data(data) : {};
  },

  async updatePhase1Data(projectId: string, phaseData: Partial<Phase1Data>): Promise<boolean> {
    try {
      // Build the update object with only the fields that exist in the database
      const updateData: any = {
        project_id: projectId,
      };

      // Add fields only if they are defined
      if (phaseData.diagnosticSummary !== undefined) updateData.diagnostic_summary = phaseData.diagnosticSummary;
      if (phaseData.objective !== undefined) updateData.objectives = phaseData.objective;
      else if (phaseData.objectives !== undefined) updateData.objectives = phaseData.objectives;
      if (phaseData.familyComposition !== undefined) updateData.family_composition = phaseData.familyComposition;
      if (phaseData.mainAssets !== undefined) updateData.main_assets = phaseData.mainAssets;
      if (phaseData.partners !== undefined) updateData.partners = phaseData.partners;
      if (phaseData.existingCompanies !== undefined) updateData.existing_companies = phaseData.existingCompanies;
      if (phaseData.meetingLink !== undefined) updateData.meeting_link = phaseData.meetingLink;

      console.log('Upserting phase 1 data:', { projectId, dataBeingSet: updateData });

      const { error } = await getSupabase()
        .from('phase_1_data')
        .upsert([updateData], { onConflict: 'project_id' });

      if (error) {
        const errorDetails = {
          code: error.code || 'UNKNOWN',
          message: error.message || 'No message provided',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          errorString: JSON.stringify(error),
        };
        console.error('Error updating phase 1 data:', errorDetails);
        console.error('Full error object:', error);
        alert(`Erro ao salvar pré-diagnóstico:\n${error.message || JSON.stringify(error)}`);
        return false;
      }
      console.log('Phase 1 data saved successfully for project:', projectId);
      return true;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorDetails = {
        message: errorMessage,
        stack: err?.stack,
        errorString: JSON.stringify(err),
        type: typeof err,
      };
      console.error('Error updating phase 1 data (catch):', errorDetails);
      console.error('Full caught error:', err);
      alert(`Erro ao salvar pré-diagnóstico:\n${errorMessage}`);
      return false;
    }
  },

  async getPhase2Data(projectId: string): Promise<Phase2Data | null> {
    const { data, error } = await getSupabase()
      .from('phase_2_data')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching phase 2 data:', error);
    }
    
    if (!data) return null;
    
    const partners = await supabase
      .from('phase_2_partners')
      .select('*')
      .eq('phase_2_data_id', data.id);
    
    return mapDatabasePhase2DataToAppPhase2Data(data, partners.data || []);
  },

  async updatePhase2Data(projectId: string, phaseData: Partial<Phase2Data>): Promise<boolean> {
    let phase2Id = null;
    
    const { data: existing } = await supabase
      .from('phase_2_data')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (existing) {
      phase2Id = existing.id;
    } else {
      const { data: created } = await supabase
        .from('phase_2_data')
        .insert([{ project_id: projectId, status: 'pending_client' }])
        .select('id')
        .single();
      
      if (created) phase2Id = created.id;
    }
    
    if (!phase2Id) return false;
    
    const { error } = await getSupabase()
      .from('phase_2_data')
      .update({
        company_name: phaseData.companyData?.name,
        company_capital: phaseData.companyData?.capital,
        status: phaseData.status,
      })
      .eq('id', phase2Id);
    
    if (error) {
      console.error('Error updating phase 2 data:', error);
      return false;
    }
    return true;
  },

  async getPhase3Data(projectId: string): Promise<Phase3Data | null> {
    const { data, error } = await getSupabase()
      .from('phase_3_data')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching phase 3 data:', error);
    }
    
    if (!data) return null;
    
    const assets = await supabase
      .from('assets')
      .select('*')
      .eq('phase_3_data_id', data.id);
    
    return {
      assets: (assets.data || []).map(mapDatabaseAssetToAppAsset),
      status: data.status as any,
    };
  },

  async updatePhase3Data(projectId: string, phaseData: Partial<Phase3Data>): Promise<boolean> {
    const { error } = await getSupabase()
      .from('phase_3_data')
      .upsert([{
        project_id: projectId,
        status: phaseData.status,
      }], { onConflict: 'project_id' });

    if (error) {
      console.error('Error updating phase 3 data:', error);
      return false;
    }
    return true;
  },
};

// ============================================================================
// ASSETS
// ============================================================================
export const assetsDB = {
  async createAsset(projectId: string, asset: Partial<Asset>): Promise<Asset | null> {
    let phase3DataId = null;
    
    const { data: phase3 } = await supabase
      .from('phase_3_data')
      .select('id')
      .eq('project_id', projectId)
      .single();
    
    if (phase3) {
      phase3DataId = phase3.id;
    } else {
      const { data: created } = await supabase
        .from('phase_3_data')
        .insert([{ project_id: projectId, status: 'pending_client' }])
        .select('id')
        .single();
      
      if (created) phase3DataId = created.id;
    }
    
    if (!phase3DataId) return null;
    
    const { data, error } = await getSupabase()
      .from('assets')
      .insert([{
        phase_3_data_id: phase3DataId,
        owner_partner_id: asset.ownerPartnerId,
        type: asset.type,
        description: asset.description,
        value: asset.value,
        status: asset.status || 'pendente',
        document_id: asset.documentId,
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating asset:', error);
      return null;
    }
    
    return mapDatabaseAssetToAppAsset(data);
  },

  async updateAsset(assetId: string, updates: Partial<Asset>): Promise<Asset | null> {
    const { data, error } = await getSupabase()
      .from('assets')
      .update({
        type: updates.type,
        description: updates.description,
        value: updates.value,
        status: updates.status,
      })
      .eq('id', assetId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating asset:', error);
      return null;
    }
    
    return mapDatabaseAssetToAppAsset(data);
  },

  async deleteAsset(assetId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('assets')
      .delete()
      .eq('id', assetId);
    
    if (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
    return true;
  },

  async getAssetsByPhase(projectId: string): Promise<Asset[]> {
    const { data: phase3 } = await supabase
      .from('phase_3_data')
      .select('id')
      .eq('project_id', projectId)
      .single();
    
    if (!phase3) return [];
    
    const { data, error } = await getSupabase()
      .from('assets')
      .select('*')
      .eq('phase_3_data_id', phase3.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching assets:', error);
      return [];
    }
    
    return data.map(mapDatabaseAssetToAppAsset);
  },
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================
export const notificationsDB = {
  async createNotification(notification: any): Promise<boolean> {
    const { error } = await getSupabase()
      .from('notifications')
      .insert([{
        recipient_id: notification.recipientId,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        is_read: false,
      }]);
    
    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }
    return true;
  },

  async getUserNotifications(userId: string): Promise<any[]> {
    const { data, error } = await getSupabase()
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    
    return data;
  },

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    return true;
  },
};

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================
function mapDatabaseUserToAppUser(dbUser: any): Promise<User> {
  return new Promise(async (resolve) => {
    const qualificationData = await usersDB.getQualificationData(dbUser.id);
    const documents = await userDocumentsDB.getUserDocuments(dbUser.id);
    
    resolve({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      avatarUrl: dbUser.avatar_url,
      clientType: dbUser.client_type,
      qualificationData,
      documents,
    });
  });
}

function mapDatabaseQualificationToAppQualification(dbQual: any): any {
  return {
    cpf: dbQual.cpf,
    rg: dbQual.rg,
    maritalStatus: dbQual.marital_status,
    propertyRegime: dbQual.property_regime,
    birthDate: dbQual.birth_date,
    nationality: dbQual.nationality,
    address: dbQual.address,
    phone: dbQual.phone,
    declaresIncomeTax: dbQual.declares_income_tax,
  };
}

function mapDatabaseDocumentToAppDocument(dbDoc: any): Document {
  return {
    id: dbDoc.id,
    name: dbDoc.name,
    url: dbDoc.url,
    type: dbDoc.type,
    uploadedAt: dbDoc.uploaded_at,
    uploadedBy: dbDoc.uploaded_by,
    phaseId: dbDoc.phase_id,
    version: dbDoc.version,
    status: dbDoc.status,
  };
}

function mapDatabaseTaskToAppTask(dbTask: any): Task {
  return {
    id: dbTask.id,
    description: dbTask.description,
    phaseId: dbTask.phase_id,
    status: dbTask.status,
    assigneeId: dbTask.assignee_id,
    createdBy: dbTask.created_at,
    createdAt: dbTask.created_at,
  };
}

function mapDatabaseChatMessageToAppChatMessage(dbMsg: any, authorName: string, authorRole: any): ChatMessage {
  return {
    id: dbMsg.id,
    authorId: dbMsg.author_id,
    authorName,
    authorRole,
    content: dbMsg.content,
    timestamp: dbMsg.created_at,
  };
}

function mapDatabaseAssetToAppAsset(dbAsset: any): Asset {
  const baseAsset = {
    id: dbAsset.id,
    ownerPartnerId: dbAsset.owner_partner_id,
    value: dbAsset.value,
    status: dbAsset.status,
    documentId: dbAsset.document_id,
    description: dbAsset.description,
    type: dbAsset.type,
  };
  
  return baseAsset as Asset;
}

function mapDatabasePhase1DataToAppPhase1Data(dbData: any): Phase1Data {
  return {
    diagnosticSummary: dbData.diagnostic_summary,
    objectives: dbData.objectives,
    objective: dbData.objectives, // Fallback to objectives
    familyComposition: dbData.family_composition,
    mainAssets: dbData.main_assets,
    partners: dbData.partners,
    existingCompanies: dbData.existing_companies,
    meetingLink: dbData.meeting_link,
    isFormCompleted: dbData.is_form_completed || false,
    meetingScheduled: dbData.meeting_scheduled || false,
    meetingDateTime: dbData.meeting_date_time,
    consultantChecklist: dbData.consultant_checklist,
    meetingMinutes: dbData.meeting_minutes,
  };
}

function mapDatabasePhase2DataToAppPhase2Data(dbData: any, dbPartners: any[]): Phase2Data {
  return {
    companyData: {
      name: dbData.company_name,
      capital: dbData.company_capital,
      type: 'LTDA',
      address: '',
      cnaes: '',
    },
    partners: dbPartners.map(p => ({
      userId: p.user_id,
      name: p.name,
      isAdministrator: p.is_administrator,
      participation: p.participation,
      dataStatus: 'pending',
    })),
    documents: {},
    status: dbData.status,
  };
}

async function mapDatabaseProjectToAppProject(dbProject: any): Promise<Project> {
  const clients = await projectClientsDB.getProjectClients(dbProject.id);
  const internalChat = await chatDB.getMessages(dbProject.id, 'internal');
  const clientChat = await chatDB.getMessages(dbProject.id, 'client');
  const activityLog = await activityLogsDB.getActivityLog(dbProject.id);

  // Initialize phases with template
  const initialPhases = getInitialProjectPhases();

  // Fetch phase-specific data from database
  const phase1Data = await phaseDataDB.getPhase1Data(dbProject.id);
  const phase2Data = await phaseDataDB.getPhase2Data(dbProject.id);
  const phase3Data = await phaseDataDB.getPhase3Data(dbProject.id);

  // Fetch all documents for this project
  const allDocuments = await documentsDB.listProjectDocuments(dbProject.id);

  // Update phases with actual data from database
  const phases = initialPhases.map(phase => {
    const phaseDocuments = allDocuments.filter(doc => doc.phaseId === phase.id);

    return {
      ...phase,
      documents: phaseDocuments,
      phase1Data: phase.id === 1 ? phase1Data || phase.phase1Data : undefined,
      phase2Data: phase.id === 2 ? phase2Data || phase.phase2Data : undefined,
      phase3Data: phase.id === 3 ? phase3Data || phase.phase3Data : undefined,
    };
  });

  return {
    id: dbProject.id,
    name: dbProject.name,
    status: dbProject.status,
    currentPhaseId: dbProject.current_phase_id,
    consultantId: dbProject.consultant_id,
    auxiliaryId: dbProject.auxiliary_id,
    clientIds: clients.map(c => c.id),
    phases,
    internalChat,
    clientChat,
    postCompletionStatus: dbProject.post_completion_status,
    activityLog,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const cleanFileName = (fileName: string): string => {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
};

// ============================================================================
// FILE UPLOADS
// ============================================================================
export const filesDB = {
  async uploadProjectDocument(projectId: string, phaseId: number, file: File): Promise<string | null> {
    try {
      const cleanedFileName = cleanFileName(file.name);
      const fileName = `projects/${projectId}/phase${phaseId}/${Date.now()}-${cleanedFileName}`;

      const { data, error } = await getSupabase()
        .storage
        .from('project-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading document:', error);
        throw new Error(error.message || 'Erro ao fazer upload do documento');
      }

      // Get public URL
      const { data: { publicUrl } } = getSupabase()
        .storage
        .from('project-files')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      throw err;
    }
  },

  async uploadProjectContract(projectId: string, file: File): Promise<string | null> {
    try {
      if (!file.type.includes('pdf')) {
        throw new Error('Apenas arquivos PDF são permitidos');
      }

      const cleanedFileName = cleanFileName(file.name);
      const fileName = `contracts/${projectId}/${Date.now()}-${cleanedFileName}`;

      const { data, error } = await getSupabase()
        .storage
        .from('project-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading contract:', error);
        throw new Error(error.message || 'Erro ao fazer upload do contrato');
      }

      // Get public URL
      const { data: { publicUrl } } = getSupabase()
        .storage
        .from('project-files')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      throw err;
    }
  },

  async deleteProjectDocument(filePath: string): Promise<boolean> {
    try {
      const { error } = await getSupabase()
        .storage
        .from('project-files')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting document:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Delete error:', err);
      return false;
    }
  },

  async deleteProjectContract(filePath: string): Promise<boolean> {
    try {
      const { error } = await getSupabase()
        .storage
        .from('project-files')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting contract:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Delete error:', err);
      return false;
    }
  },
};
