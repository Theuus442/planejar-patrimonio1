import React, { useState, useEffect, useCallback } from 'react';
import { User, Project, UserRole, Notification, Task, ChatMessage, NewClientData } from './types';

// Supabase Services
import supabaseAuthService from './services/supabaseAuth';
import { usersDB, projectsDB, projectClientsDB, tasksDB, chatDB, activityLogsDB, documentsDB } from './services/supabaseDatabase';
import dataMigrationService from './services/dataMigration';

// Component Imports
import LoginScreen from './components/LoginScreen';
import ChangePasswordScreen from './components/ChangePasswordScreen';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import ConfirmEmailScreen from './components/ConfirmEmailScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConsultantDashboard from './components/ConsultantDashboard';
import AuxiliaryDashboard from './components/AuxiliaryDashboard';
import ProjectDetailView from './components/ProjectDetailView';
import CreateClientScreen from './components/CreateClientScreen';
import CreateUserScreen from './components/CreateUserScreen';
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
import Toast, { ToastMessage } from './components/Toast';

// ============================================================================
// STATE MANAGEMENT HOOK
// ============================================================================

const useStore = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userForPasswordChange, setUserForPasswordChange] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentView, setCurrentView] = useState<string>('dashboard');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeChat, setActiveChat] = useState<{ projectId: string; chatType: 'client' | 'internal' } | null>(null);
    const [targetPhaseId, setTargetPhaseId] = useState<number | null>(null);
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([]);
    const [aiChatSession, setAiChatSession] = useState<ReturnType<typeof createAIChatSession> | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);

    // ========================================================================
    // TOAST NOTIFICATIONS
    // ========================================================================

    const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) => {
        setCurrentToast({
            id: Date.now().toString(),
            message,
            type,
            duration,
        });
    };

    const closeToast = () => {
        setCurrentToast(null);
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                setIsLoading(true);

                // Note: Automatic database seeding is disabled on Fly.io due to proxy constraints
                // To create test users, use the Supabase dashboard or create them manually
                console.log('ℹ️ Ready to authenticate. Create users in Supabase dashboard to test.');

                const user = await supabaseAuthService.getCurrentUser();
                if (user) {
                    setCurrentUser(user);
                    try {
                        await loadUserData(user.id);
                    } catch (dataError) {
                        console.error('Error loading user data:', dataError);
                    }
                } else {
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

        const unsubscribe = supabaseAuthService.onAuthStateChange(
            async (event, session) => {
                console.log('Auth event:', event);

                if (event === 'PASSWORD_RECOVERY') {
                    console.log('Modo de recuperação de senha ativado');
                    setIsRecoveryMode(true);
                } else if (event === 'SIGNED_IN' && session) {
                    const user = await supabaseAuthService.getCurrentUser();
                    if (user) {
                        setCurrentUser(user);
                        try {
                            await loadUserData(user.id);
                        } catch (dataError) {
                            console.error('Error loading user data:', dataError);
                        }
                    }
                } else if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                    setAllUsers([]);
                    setProjects([]);
                    setCurrentView('dashboard');
                    setIsRecoveryMode(false);
                }
            }
        );

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, []);

    // ========================================================================
    // DATA LOADING
    // ========================================================================

    const loadUserData = useCallback(async (userId: string) => {
        try {
            const users = await usersDB.listUsers();
            setAllUsers(users);

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
        }
    }, [currentUser, projects]);

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
    // ACTIONS
    // ========================================================================

    const actions = {
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

        handleUpdateProject: async (projectId: string, data: Partial<Project>) => {
            const oldProject = projects.find(p => p.id === projectId);
            if (!oldProject) return;

            // Optimistic update - update local state immediately for better UX
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, ...data } : p
            ));

            // Log phase advancement
            if (data.currentPhaseId && data.currentPhaseId !== oldProject.currentPhaseId && currentUser) {
                await activityLogsDB.addLogEntry(projectId, currentUser.id, `avançou o projeto para a Fase ${data.currentPhaseId}.`);
            }

            // Persist to database in the background
            const updated = await projectsDB.updateProject(projectId, data);

            // If database update fails, revert to old state
            if (!updated) {
                setProjects(prev => prev.map(p =>
                    p.id === projectId ? oldProject : p
                ));
                showToast('Erro ao salvar dados. Tente novamente.', 'error');
            } else {
                showToast('Dados salvos com sucesso!', 'success');
            }
        },

        handleUpdateUser: async (userId: string, data: Partial<User>) => {
            const updated = await usersDB.updateUser(userId, data);
            
            if (updated) {
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

        handleUploadDocument: async (projectId: string, phaseId: number, file: File, description: string) => {
            if (!currentUser) return;

            try {
                const { filesDB } = await import('./services/supabaseDatabase');
                const documentUrl = await filesDB.uploadProjectDocument(projectId, phaseId, file);

                if (documentUrl) {
                    const doc = await documentsDB.uploadDocument({
                        projectId,
                        phaseId,
                        name: description || file.name,
                        url: documentUrl,
                        type: 'pdf',
                        uploadedBy: currentUser.id,
                    });

                    if (doc) {
                        console.log('Document uploaded successfully:', doc);
                        await reloadProjects();
                    }
                }
            } catch (error) {
                console.error('Error uploading document:', error);
                throw error;
            }
        },

        handleUploadAndLinkDocument: async (projectId: string, phaseId: number, file: File, onSuccess?: (documentId: string) => void) => {
            if (!currentUser) return;

            try {
                const { filesDB } = await import('./services/supabaseDatabase');
                const documentUrl = await filesDB.uploadProjectDocument(projectId, phaseId, file);

                if (documentUrl) {
                    const doc = await documentsDB.uploadDocument({
                        projectId,
                        phaseId,
                        name: file.name,
                        url: documentUrl,
                        type: 'pdf',
                        uploadedBy: currentUser.id,
                    });

                    if (doc && onSuccess) {
                        console.log('Document uploaded and linked:', doc);
                        onSuccess(doc.id);
                        await reloadProjects();
                    }
                }
            } catch (error) {
                console.error('Error uploading and linking document:', error);
                throw error;
            }
        },

        handleCreateClient: async (projectName: string, mainClientData: NewClientData, additionalClientsData: NewClientData[], contractFile: File) => {
            if (!currentUser) return;

            try {
                const allNewClientsData = [mainClientData, ...additionalClientsData];
                const createdUserIds: string[] = [];

                for (const clientData of allNewClientsData) {
                    if (!clientData.password) {
                        console.error('Password required for client:', clientData.email);
                        continue;
                    }

                    const result = await supabaseAuthService.signUpWithEmail(
                        clientData.email,
                        clientData.password,
                        clientData.name,
                        UserRole.CLIENT,
                        clientData.clientType
                    );

                    if (result) {
                        createdUserIds.push(result.user.id);
                    }
                }

                const project = await projectsDB.createProject({
                    name: projectName,
                    consultantId: currentUser.id,
                } as any);

                if (project) {
                    // Upload contract file
                    if (contractFile) {
                        try {
                            const { filesDB } = await import('./services/supabaseDatabase');
                            const contractUrl = await filesDB.uploadProjectContract(project.id, contractFile);
                            console.log('Contract uploaded:', contractUrl);
                        } catch (uploadError) {
                            console.error('Error uploading contract:', uploadError);
                        }
                    }

                    for (const clientId of createdUserIds) {
                        await projectClientsDB.addClientToProject(project.id, clientId);
                    }

                    await activityLogsDB.addLogEntry(project.id, currentUser.id, 'criou o projeto.');

                    await reloadProjects();

                    // Navigate to project detail view
                    setSelectedProjectId(project.id);
                    setCurrentView('project_detail');
                }
            } catch (error) {
                console.error('Error creating client and project:', error);
            }
        },

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
        aiChatMessages, isAiLoading, availableClients, isSidebarOpen, isRecoveryMode,
        aiChatSession, currentToast,
        actions,
        setCurrentUser, setUserForPasswordChange, setCurrentView,
        setSelectedProjectId, setNotifications, setActiveChat, setTargetPhaseId,
        setIsAiChatOpen, setAiChatMessages, setAiChatSession, setIsAiLoading, setIsRecoveryMode,
        isPartnerDataComplete, setProjects, setAllUsers, setIsSidebarOpen, reloadProjects,
        showToast, closeToast
    };
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App = () => {
  const store = useStore();
  const [currentRoute, setCurrentRoute] = useState<string>('');

  useEffect(() => {
    // Detect current route from URL pathname
    const updateRoute = () => {
      const pathname = window.location.pathname;
      setCurrentRoute(pathname);
    };

    updateRoute();

    // Listen for URL changes (browser back/forward)
    window.addEventListener('popstate', updateRoute);

    return () => {
      window.removeEventListener('popstate', updateRoute);
    };
  }, []);

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
      }
    }
  }, [store.currentUser, store.aiChatSession, store.setAiChatSession, store.setAiChatMessages]);

  if (store.isLoading) {
    return <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'sans-serif'}}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div style={{textAlign: 'center'}}>
        <p style={{fontSize: '1.25rem', color: '#374151', marginBottom: '1rem'}}>Carregando...</p>
        <div className="loading-spinner" style={{width: '3rem', height: '3rem', margin: '0 auto', borderRadius: '50%', borderTop: '2px solid #004c59', borderRight: '2px solid transparent', borderBottom: '2px solid transparent', borderLeft: '2px solid transparent'}}></div>
      </div>
    </div>;
  }

  if (store.userForPasswordChange) {
    return <ChangePasswordScreen user={store.userForPasswordChange} onPasswordChanged={store.actions.handlePasswordChanged} onCancel={store.actions.handleCancelPasswordChange} />;
  }

  // Handle password recovery mode - when user clicks the recovery link in email
  if (store.isRecoveryMode && store.currentUser) {
    return <ResetPasswordScreen onResetComplete={() => {
      store.setIsRecoveryMode(false);
      window.location.href = '/';
    }} />;
  }

  // Handle special routes (not requiring user to be logged in)
  if (!store.currentUser) {
    if (currentRoute === '/esqueci-senha') {
      return <ForgotPasswordScreen onSendReset={store.actions.handleForgotPassword} onBackToLogin={() => window.location.href = '/'} />;
    }

    if (currentRoute === '/redefinir-senha') {
      return <ResetPasswordScreen onResetComplete={() => window.location.href = '/'} />;
    }

    if (currentRoute === '/confirmar-email') {
      return <ConfirmEmailScreen onConfirmComplete={() => window.location.href = '/dashboard'} onBackToLogin={() => window.location.href = '/'} />;
    }

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
                    onUploadAndLinkDocument={store.actions.handleUploadAndLinkDocument}
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
                        onChangePassword={() => {
                            const newPassword = window.prompt('Digite sua nova senha:');
                            if (!newPassword) return { success: false, message: 'Operação cancelada' };

                            supabaseAuthService.updatePassword(newPassword).then(success => {
                                if (success) {
                                    alert('Senha alterada com sucesso!');
                                } else {
                                    alert('Erro ao alterar senha');
                                }
                            });

                            return { success: true, message: 'Processando...' };
                        }}
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
                            store.setAllUsers(u => u.filter(user => user.id !== id));
                        }}
                        onNavigateToCreate={(role) => store.actions.handleNavigate('create_user')}
                        onResetPassword={(id) => {
                            alert('A funcionalidade de reset de senha está em desenvolvimento.');
                        }}
                    />;
        case 'create_user':
            return <CreateUserScreen
                        onBack={() => store.actions.handleNavigate('manage_users')}
                        onCreateUser={async () => {
                            await loadUserData(store.currentUser.id);
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
                return store.selectedProject ? <DocumentsView project={store.selectedProject} users={store.allUsers} onUploadDocument={store.actions.handleUploadDocument} /> : <div>Selecione um projeto</div>
            }
            return <ProjectsDocumentsView projects={store.projects} onProjectClick={store.actions.handleSelectProjectForDocuments} />;
         case 'project_documents':
            return store.selectedProject ? <DocumentsView project={store.selectedProject} users={store.allUsers} onUploadDocument={store.actions.handleUploadDocument} onBack={() => store.actions.handleNavigate('documents')} /> : <div>Projeto não encontrado.</div>;
        case 'support':
            return <SupportDashboard projects={store.projects} users={store.allUsers} currentUser={store.currentUser} onUpdateProject={store.actions.handleUpdateProject} />;
        default:
            return <div>Visualização '{store.currentView}' não encontrada.</div>
    }
  }

  return (
    <div style={{display: 'flex', height: '100vh', backgroundColor: '#f8f9fa'}}>
      <Sidebar 
        userRole={store.currentUser.role} 
        onNavigate={store.actions.handleNavigate} 
        activeView={store.currentView}
        isOpen={store.isSidebarOpen}
        onClose={() => store.setIsSidebarOpen(false)}
      />
      <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
        <Header 
          user={store.currentUser} 
          onLogout={store.actions.handleLogout}
          notifications={store.notifications}
          onNotificationClick={() => {}}
          onClearAllNotifications={() => {}}
          onNavigateToMyData={() => store.actions.handleNavigate('my_data')}
          onToggleSidebar={() => store.setIsSidebarOpen(prev => !prev)}
        />
        <main style={{flex: 1, overflowX: 'hidden', overflowY: 'auto', backgroundColor: '#f8f9fa'}}>
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
            style={{position: 'fixed', bottom: '1.5rem', right: '1.5rem', backgroundColor: '#004c59', color: 'white', borderRadius: '50%', padding: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', cursor: 'pointer', border: 'none'}}
            aria-label="Abrir chat com assistente IA"
          >
              <Icon name="ai" style={{width: '2rem', height: '2rem'}}/>
          </button>
      )}

      <Toast toast={store.currentToast} onClose={store.closeToast} />
    </div>
  );
};

export default App;
