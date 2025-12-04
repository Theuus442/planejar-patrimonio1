import React, { useState, useEffect, useCallback } from 'react';
import { User, Project, UserRole, Notification, Task, ChatMessage, NewClientData, PartnerDataForPhase2, Document, ITBIProcessData, Phase6RegistrationData, RegistrationProcessData, Phase5ITBIData, UserDocument, UserDocumentCategory, LogEntry, Asset } from './types';
import { getInitialProjectPhases } from './constants';

// Supabase Services
import supabaseAuthService from './services/supabaseAuth';
import dataMigrationService from './services/dataMigration';
import { usersDB, projectsDB, projectClientsDB, tasksDB, chatDB, activityLogsDB, phaseDataDB, assetsDB } from './services/supabaseDatabase';

// Component Imports
import LoginScreen from './components/LoginScreen';
import ChangePasswordScreen from './components/ChangePasswordScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConsultantDashboard from './components/ConsultantDashboard';
import AuxiliaryDashboard from './components/AuxiliaryDashboard';
import ProjectDetailView from './components/ProjectDetailView';
import CreateUserScreen from './components/CreateUserScreen';
import CreateClientScreen from './components/CreateClientScreen';
import ManageUsersScreen from './components/ManageUsersScreen';
import MyDataScreen from './components/MyDataScreen';
import MyTasksScreen from './components/MyTasksScreen';
import ProjectChat from './components/ProjectChat';
import DocumentsView from './components/DocumentsView';
import ProjectsDocumentsView from './components/ProjectsDocumentsView';
import AIChat from './components/AIChat';
import { createAIChatSession } from './services/geminiService';
import Icon from './components/Icon';
import SupportDashboard from './components/SupportDashboard';

// ============================================================================
// STATE MANAGEMENT HOOK (Refactored for Supabase)
// ============================================================================

const useStore = () => {
    // Authentication State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userForPasswordChange, setUserForPasswordChange] = useState<User | null>(null);
    
    // Data State (loaded from Supabase)
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    
    // UI State
    const [currentView, setCurrentView] = useState<string>('dashboard');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeChat, setActiveChat] = useState<{ projectId: string; chatType: 'client' | 'internal' } | null>(null);
    const [targetPhaseId, setTargetPhaseId] = useState<number | null>(null);
    
    // AI Chat State
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([]);
    const [aiChatSession, setAiChatSession] = useState<ReturnType<typeof createAIChatSession> | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // ========================================================================
    // INITIALIZATION: Set up auth state listener and load data
    // ========================================================================
    
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                setIsLoading(true);

                try {
                    // Try to restore current session
                    const user = await supabaseAuthService.getCurrentUser();
                    if (user) {
                        setCurrentUser(user);
                        // Load data for authenticated user
                        try {
                            await loadUserData(user.id);
                        } catch (dataError) {
                            console.error('Error loading user data:', dataError);
                            // Continue anyway - app should still load
                        }
                    } else {
                        setCurrentUser(null);
                        setAllUsers([]);
                        setProjects([]);
                    }
                } catch (authError) {
                    console.error('Error getting current user:', authError);
                    setCurrentUser(null);
                    setAllUsers([]);
                    setProjects([]);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth state changes (sign in, sign out, etc.)
        const unsubscribe = supabaseAuthService.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    const user = await supabaseAuthService.getCurrentUser();
                    if (user) {
                        setCurrentUser(user);
                        try {
                            await loadUserData(user.id);
                        } catch (dataError) {
                            console.error('Error loading user data after sign in:', dataError);
                        }
                    }
                } else if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                    setAllUsers([]);
                    setProjects([]);
                    setCurrentView('dashboard');
                }
            }
        );

        return () => {
            unsubscribe?.();
        };
    }, []);

    // ========================================================================
    // DATA LOADING FUNCTIONS
    // ========================================================================

    const loadUserData = useCallback(async (userId: string) => {
        try {
            // Load all users (for consultants/admins)
            try {
                const users = await usersDB.listUsers();
                setAllUsers(users);

                // Load projects based on role
                const user = users.find(u => u.id === userId);
                if (!user) {
                    setProjects([]);
                    return;
                }

                let userProjects: Project[] = [];
                try {
                    if (user.role === UserRole.CLIENT) {
                        userProjects = await projectsDB.listProjectsByClient(userId);
                    } else {
                        userProjects = await projectsDB.listProjects();
                    }
                } catch (projectError) {
                    console.error('Error loading projects:', projectError);
                    userProjects = [];
                }

                setProjects(userProjects);
            } catch (usersError) {
                console.error('Error loading users:', usersError);
                setAllUsers([]);
                setProjects([]);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            setAllUsers([]);
            setProjects([]);
        }
    }, []);

    const reloadProjects = useCallback(async () => {
        try {
            if (!currentUser) return;
            
            let userProjects: Project[] = [];
            if (currentUser.role === UserRole.CLIENT) {
                userProjects = await projectsDB.listProjectsByClient(currentUser.id);
            } else {
                userProjects = await projectsDB.listProjects();
            }
            
            setProjects(userProjects);
        } catch (error) {
            console.error('Error reloading projects:', error);
        }
    }, [currentUser]);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================

    const selectedProject = React.useMemo(() => {
        return projects.find(p => p.id === selectedProjectId) || null;
    }, [projects, selectedProjectId]);

    React.useEffect(() => {
        if (currentUser && currentUser.role === UserRole.CLIENT) {
            const userProject = projects.find(p => p.clientIds.includes(currentUser.id));
            if (userProject) {
                setSelectedProjectId(userProject.id);
            }
        } else if (currentUser && !selectedProjectId) {
            setSelectedProjectId(null);
            setCurrentView('dashboard');
        }
    }, [currentUser, projects, selectedProjectId]);

    const isPartnerDataComplete = (user: User): boolean => {
        if (!user || !user.clientType || !user.qualificationData) return false;
        
        const q = user.qualificationData;
        const hasBaseData = q.cpf && q.rg && q.maritalStatus && q.birthDate && q.nationality && q.address;
        if (!hasBaseData) return false;
        
        if ((q.maritalStatus === 'casado' || q.maritalStatus === 'uniao_estavel') && !q.propertyRegime) return false;
        
        if (q.declaresIncomeTax) {
            const docs = user.documents || [];
            if (!docs.some(d => d.category === 'tax_return')) {
                return false;
            }
        }

        return true;
    };

    const availableClients = React.useMemo(() => {
        const allProjectClientIds = new Set(projects.flatMap(p => p.clientIds));
        return allUsers.filter(u => u.role === UserRole.CLIENT && !allProjectClientIds.has(u.id));
    }, [projects, allUsers]);

    // ========================================================================
    // ACTIONS (Now using Supabase APIs)
    // ========================================================================

    const actions = {
        // ====== AUTHENTICATION ======
        
        handleLogin: async (email: string, password: string) => {
            const result = await supabaseAuthService.signInWithEmail(email, password);
            
            if (!result) {
                throw new Error('AUTH_INVALID_CREDENTIALS');
            }

            setCurrentUser(result.user);
            await loadUserData(result.user.id);
        },

        handleForgotPassword: async (email: string) => {
            return await supabaseAuthService.resetPasswordForEmail(email);
        },

        handleLogout: async () => {
            await supabaseAuthService.signOut();
            setCurrentUser(null);
            setSelectedProjectId(null);
            setTargetPhaseId(null);
        },

        handleRequirePasswordChange: (user: User) => setUserForPasswordChange(user),
        handleCancelPasswordChange: () => setUserForPasswordChange(null),

        handlePasswordChanged: async (userId: string, newPassword: string) => {
            const success = await supabaseAuthService.updatePassword(newPassword);
            
            if (success && currentUser) {
                const updated = await usersDB.getUser(currentUser.id);
                if (updated) {
                    setCurrentUser(updated);
                }
            }
            
            setUserForPasswordChange(null);
        },

        // ====== NAVIGATION ======
        
        handleNavigate: (view: string) => {
            if (view !== 'project_detail' && view !== 'project_documents') {
                setTargetPhaseId(null);
                if (currentUser && currentUser.role !== UserRole.CLIENT) {
                    setSelectedProjectId(null);
                }
            }
            setCurrentView(view);
            setIsSidebarOpen(false);
        },

        handleBackToDashboard: () => {
            setSelectedProjectId(null);
            setTargetPhaseId(null);
            setCurrentView('dashboard');
        },

        handleSelectProject: (projectId: string) => {
            setSelectedProjectId(projectId);
            setTargetPhaseId(null);
            setCurrentView('project_detail');
        },

        handleSelectProjectForDocuments: (projectId: string) => {
            setSelectedProjectId(projectId);
            setCurrentView('project_documents');
        },

        // ====== PROJECT MANAGEMENT ======
        
        handleUpdateProject: async (projectId: string, data: Partial<Project>) => {
            const oldProject = projects.find(p => p.id === projectId);
            if (!oldProject) return;

            // Log phase change
            if (data.currentPhaseId && data.currentPhaseId !== oldProject.currentPhaseId && currentUser) {
                await activityLogsDB.addLogEntry(projectId, currentUser.id, `avançou o projeto para a Fase ${data.currentPhaseId}.`);
            }

            // Update in database
            const updated = await projectsDB.updateProject(projectId, data);
            if (updated) {
                await reloadProjects();
            }
        },

        handleUpdateUser: async (userId: string, data: Partial<User>) => {
            const updated = await usersDB.updateUser(userId, data);
            
            if (updated) {
                // Update local state
                setAllUsers(prev => prev.map(u => u.id === userId ? updated : u));
                
                if (currentUser?.id === userId) {
                    setCurrentUser(updated);
                }
            }
        },

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
                // Optionally reload projects to get updated tasks
                await reloadProjects();
            }
        },

        handleAdvancePhase: async (projectId: string, phaseId: number) => {
            if (!currentUser) return;

            const nextPhaseId = phaseId + 1;
            const updated = await projectsDB.updateProject(projectId, {
                currentPhaseId: nextPhaseId,
            } as any);

            if (updated) {
                await activityLogsDB.addLogEntry(projectId, currentUser.id, `concluiu e avançou a Fase ${phaseId}.`);
                await reloadProjects();
            }
        },

        // ====== CHAT ======
        
        handleOpenChat: (chatType: 'client' | 'internal') => {
            if (selectedProject) {
                setActiveChat({ projectId: selectedProject.id, chatType });
            }
        },

        handleSendProjectMessage: async (content: string) => {
            if (!activeChat || !selectedProject || !currentUser) return;

            const message: ChatMessage = {
                id: `msg-${Date.now()}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                authorAvatarUrl: currentUser.avatarUrl,
                authorRole: currentUser.role,
                content,
                timestamp: new Date().toISOString(),
            };

            const sent = await chatDB.sendMessage(selectedProject.id, activeChat.chatType, message);
            if (sent) {
                // Reload project to get updated chat
                await reloadProjects();
            }
        },

        handleUpdatePhaseChat: async (projectId: string, phaseId: number, content: string) => {
            if (!currentUser) return;

            const message: ChatMessage = {
                id: `msg-${Date.now()}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                authorAvatarUrl: currentUser.avatarUrl,
                authorRole: currentUser.role,
                content,
                timestamp: new Date().toISOString(),
            };

            const sent = await chatDB.sendMessage(projectId, 'internal', message);
            if (sent) {
                await reloadProjects();
            }
        },

        // ====== CLIENT & PROJECT CREATION ======
        
        handleCreateClient: async (projectName: string, mainClientData: NewClientData, additionalClientsData: NewClientData[], contractFile: File) => {
            if (!currentUser) return;

            try {
                const allNewClientsData = [mainClientData, ...additionalClientsData];
                const createdUserIds: string[] = [];

                // Create users via Auth
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
                } as any);

                if (project) {
                    // Add clients to project
                    for (const clientId of createdUserIds) {
                        await projectClientsDB.addClientToProject(project.id, clientId);
                    }

                    // Log creation
                    await activityLogsDB.addLogEntry(project.id, currentUser.id, 'criou o projeto.');

                    // Reload data
                    await reloadProjects();
                    setCurrentView('dashboard');
                }
            } catch (error) {
                console.error('Error creating client and project:', error);
            }
        },

        // ====== AI ======
        
        handleAiSendMessage: async (content: string) => {
            if (!currentUser || !aiChatSession) return;

            const userMessage: ChatMessage = {
                id: `msg-ai-${Date.now()}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                content,
                timestamp: new Date().toISOString(),
                authorRole: currentUser.role,
            };

            setAiChatMessages(prev => [...prev, userMessage]);
            setIsAiLoading(true);

            try {
                const responseText = await aiChatSession.sendMessage(content);
                const aiResponse: ChatMessage = {
                    id: `msg-ai-${Date.now() + 1}`,
                    authorId: 'ai',
                    authorName: 'Assistente IA',
                    content: responseText,
                    timestamp: new Date().toISOString(),
                    authorRole: UserRole.CONSULTANT,
                };
                setAiChatMessages(prev => [...prev, aiResponse]);
            } catch (error) {
                const errorResponse: ChatMessage = {
                    id: `msg-ai-err-${Date.now()}`,
                    authorId: 'ai',
                    authorName: 'Assistente IA',
                    content: "Desculpe, ocorreu um erro. Tente novamente.",
                    timestamp: new Date().toISOString(),
                    authorRole: UserRole.CONSULTANT,
                };
                setAiChatMessages(prev => [...prev, errorResponse]);
            } finally {
                setIsAiLoading(false);
            }
        },
    };

    return {
        allUsers, projects, currentUser, isLoading, userForPasswordChange,
        currentView, selectedProject, notifications, activeChat, targetPhaseId, isAiChatOpen,
        aiChatMessages, isAiLoading, availableClients, isSidebarOpen,
        aiChatSession,
        actions, setCurrentUser, setUserForPasswordChange, setCurrentView,
        setSelectedProjectId, setNotifications, setActiveChat, setTargetPhaseId,
        setIsAiChatOpen, setAiChatMessages, setAiChatSession, setIsAiLoading,
        isPartnerDataComplete, setProjects, setAllUsers, setIsSidebarOpen, reloadProjects
    };
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App = () => {
  const store = useStore();

  useEffect(() => {
    if (store.currentUser && !store.aiChatSession) {
      try {
        store.setAiChatSession(createAIChatSession());
        store.setAiChatMessages([
            {
                id: 'initial-ai-msg',
                authorId: 'ai',
                authorName: 'Assistente IA',
                content: 'Olá! Eu sou o Plano, seu assistente de IA. Como posso ajudar com seu projeto de holding hoje?',
                timestamp: new Date().toISOString(),
                authorRole: UserRole.CONSULTANT,
            }
        ]);
      } catch (error) {
          console.error("Failed to initialize AI Chat Session:", error);
          store.setAiChatMessages([
             {
                  id: 'initial-ai-msg-error',
                  authorId: 'ai',
                  authorName: 'Assistente IA',
                  content: 'Não foi possível iniciar o assistente de IA. A funcionalidade de chat com IA estará desativada.',
                  timestamp: new Date().toISOString(),
                  authorRole: UserRole.CONSULTANT,
              }
          ]);
      }
    }
  }, [store.currentUser]);

  if (store.isLoading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <p className="text-xl text-gray-700 mb-4">Carregando...</p>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
      </div>
    </div>;
  }
  
  if (store.userForPasswordChange) {
    return <ChangePasswordScreen user={store.userForPasswordChange} onPasswordChanged={store.actions.handlePasswordChanged} onCancel={store.actions.handleCancelPasswordChange} />;
  }

  if (!store.currentUser) {
    return <LoginScreen onLogin={store.actions.handleLogin} onRequirePasswordChange={store.actions.handleRequirePasswordChange} onForgotPassword={store.actions.handleForgotPassword} />;
  }

  const renderView = () => {
    switch (store.currentView) {
        case 'dashboard':
            if (store.currentUser?.role === UserRole.CLIENT) {
                return store.selectedProject ? 
                  <Dashboard 
                    project={store.selectedProject} 
                    currentUser={store.currentUser} 
                    onOpenChat={store.actions.handleOpenChat} 
                    onNavigateToPhase={(phaseId) => { store.setTargetPhaseId(phaseId); store.actions.handleNavigate('project_detail'); }}
                    isPartnerDataComplete={store.isPartnerDataComplete(store.currentUser)}
                    onNavigateToMyData={() => store.actions.handleNavigate('my_data')}
                  /> : <div>Nenhum projeto associado.</div>;
            }
            if (store.currentUser?.role === UserRole.CONSULTANT || store.currentUser?.role === UserRole.ADMINISTRATOR) {
                return <ConsultantDashboard 
                            projects={store.projects} 
                            users={store.allUsers} 
                            currentUser={store.currentUser}
                            onProjectClick={store.actions.handleSelectProject} 
                            onNavigateToCreate={() => store.actions.handleNavigate('create_client')}
                            onDeleteProject={(id) => {
                                projectsDB.deleteProject(id);
                                store.reloadProjects();
                            }}
                        />;
            }
             if (store.currentUser?.role === UserRole.AUXILIARY) {
                return <AuxiliaryDashboard 
                        projects={store.projects} 
                        users={store.allUsers} 
                        currentUser={store.currentUser} 
                        onProjectClick={store.actions.handleSelectProject} 
                        onTaskClick={(projectId, phaseId) => { store.setTargetPhaseId(phaseId); store.actions.handleSelectProject(projectId); }}
                       />;
            }
            return <div>Dashboard não implementado para esta função.</div>;
        case 'project_detail':
            return store.selectedProject ? 
                <ProjectDetailView 
                    project={store.selectedProject} 
                    currentUser={store.currentUser!}
                    users={store.allUsers}
                    onBack={store.actions.handleBackToDashboard}
                    onUpdateProject={store.actions.handleUpdateProject}
                    onCreateTask={store.actions.handleCreateTask}
                    onOpenChat={store.actions.handleOpenChat}
                    onAdvancePhase={store.actions.handleAdvancePhase}
                    onUpdatePhaseChat={store.actions.handleUpdatePhaseChat}
                    initialPhaseId={store.targetPhaseId}
                    onUploadAndLinkDocument={() => {}}
                    onChoosePostCompletionPath={() => {}}
                    onRemoveMemberFromProject={() => {}}
                    onUpdateUser={store.actions.handleUpdateUser}
                    availableClients={store.availableClients}
                    onCreateAndAddMemberToProject={() => {}}
                    onAddExistingMemberToProject={() => {}}
                /> : <div>Projeto não encontrado.</div>;
         case 'my_data':
            return <MyDataScreen 
                        currentUser={store.currentUser}
                        projects={store.projects}
                        onUpdateUser={store.actions.handleUpdateUser}
                        onUploadUserDocument={() => {}}
                        onDeleteUserDocument={() => {}}
                        onBack={store.actions.handleBackToDashboard}
                        onChangePassword={() => ({ success: true, message: 'Mock success' })}
                        onNavigateToTask={() => {}}
                    />;
        case 'create_client':
            return <CreateClientScreen onBack={store.actions.handleBackToDashboard} onCreateClient={store.actions.handleCreateClient} allUsers={store.allUsers} />;
        case 'manage_users':
            return <ManageUsersScreen 
                        users={store.allUsers}
                        projects={store.projects}
                        currentUser={store.currentUser}
                        onBack={store.actions.handleBackToDashboard} 
                        onDeleteUser={(id) => {
                            usersDB.deleteUser(id);
                            setAllUsers(u => u.filter(user => user.id !== id));
                        }}
                        onNavigateToCreate={(role) => store.actions.handleNavigate('create_user')}
                        onResetPassword={(id) => {
                            alert('A funcionalidade de reset de senha está em desenvolvimento.');
                        }}
                    />;
        case 'my_tasks':
            return <MyTasksScreen 
                    currentUser={store.currentUser}
                    projects={store.projects}
                    onBack={store.actions.handleBackToDashboard}
                    onNavigateToTask={(projectId, phaseId) => {
                        store.setTargetPhaseId(phaseId);
                        store.actions.handleSelectProject(projectId);
                    }}
                   />;
        case 'documents':
            if (store.currentUser.role === UserRole.CLIENT) {
                return store.selectedProject ? <DocumentsView project={store.selectedProject} users={store.allUsers} onUploadDocument={() => {}} /> : <div>Selecione um projeto</div>
            }
            return <ProjectsDocumentsView projects={store.projects} onProjectClick={store.actions.handleSelectProjectForDocuments} />;
         case 'project_documents':
            return store.selectedProject ? <DocumentsView project={store.selectedProject} users={store.allUsers} onUploadDocument={() => {}} onBack={() => store.actions.handleNavigate('documents')} /> : <div>Projeto não encontrado.</div>;
        case 'support':
            return <SupportDashboard projects={store.projects} users={store.allUsers} currentUser={store.currentUser} onUpdateProject={store.actions.handleUpdateProject} />;
        default:
            return <div>Visualização '{store.currentView}' não encontrada.</div>
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        userRole={store.currentUser.role} 
        onNavigate={store.actions.handleNavigate} 
        activeView={store.currentView}
        isOpen={store.isSidebarOpen}
        onClose={() => store.setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={store.currentUser} 
          onLogout={store.actions.handleLogout}
          notifications={store.notifications}
          onNotificationClick={() => {}}
          onClearAllNotifications={() => {}}
          onNavigateToMyData={() => store.actions.handleNavigate('my_data')}
          onToggleSidebar={() => store.setIsSidebarOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-light">
          {renderView()}
        </main>
      </div>

       {store.activeChat && store.selectedProject && (
          <ProjectChat 
            project={store.selectedProject}
            chatType={store.activeChat.chatType}
            currentUser={store.currentUser}
            onSendMessage={store.actions.handleSendProjectMessage}
            onClose={() => store.setActiveChat(null)}
          />
        )}

      {store.isAiChatOpen && store.aiChatSession && (
        <AIChat
          currentUser={store.currentUser}
          messages={store.aiChatMessages}
          onSendMessage={store.actions.handleAiSendMessage}
          onClose={() => store.setIsAiChatOpen(false)}
          isLoading={store.isAiLoading}
        />
      )}

      {!store.isAiChatOpen && (
          <button 
            onClick={() => store.setIsAiChatOpen(true)}
            className="fixed bottom-6 right-6 bg-brand-primary text-white rounded-full p-4 shadow-lg hover:bg-brand-dark transition-transform hover:scale-110"
            aria-label="Abrir chat com assistente IA"
          >
              <Icon name="ai" className="w-8 h-8"/>
          </button>
      )}
    </div>
  );
};

export default App;
