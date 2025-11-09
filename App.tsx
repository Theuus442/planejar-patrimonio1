import React, { useState, useEffect } from 'react';
import { User, Project, UserRole, Notification, Task, ChatMessage, NewClientData, PartnerDataForPhase2, Document, ITBIProcessData, Phase6RegistrationData, RegistrationProcessData, Phase5ITBIData, UserDocument, UserDocumentCategory, LogEntry, Asset } from './types';
import { INITIAL_USERS, INITIAL_PROJECTS, getInitialProjectPhases } from './constants';

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
import MyTasksScreen from './components/MyTasksScreen'; // NEW
import ProjectChat from './components/ProjectChat';
import DocumentsView from './components/DocumentsView';
import ProjectsDocumentsView from './components/ProjectsDocumentsView';
import AIChat from './components/AIChat';
import { createAIChatSession } from './services/geminiService';
import Icon from './components/Icon';
import SupportDashboard from './components/SupportDashboard';

// A state management hook architected for in-memory data
const useStore = () => {
    const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
    const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userForPasswordChange, setUserForPasswordChange] = useState<User | null>(null);
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


    useEffect(() => {
        // Simulate loading end, as data is now synchronous
        setIsLoading(false);
    }, []);

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

    const actions = {
        handleLogin: async (email: string, password: string) => {
            const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

            if (!user) {
              throw new Error('AUTH_INVALID_CREDENTIALS');
            }
            
            if (user.requiresPasswordChange) {
              const err = new Error('PASSWORD_CHANGE_REQUIRED');
              (err as any).user = user;
              throw err;
            }

            setCurrentUser(user);
        },
        handleForgotPassword: async (email: string) => {
             const userExists = allUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
            if (userExists) {
                console.log(`(Mock) Password reset for ${email}`);
            }
            return Promise.resolve();
        },
        addLogEntry: (projectId: string, actorId: string, action: string) => {
            const actor = allUsers.find(u => u.id === actorId);
            const actorName = actor ? actor.name : (actorId === 'system' ? 'Sistema' : 'Desconhecido');
            
            const projectToUpdate = projects.find(p => p.id === projectId);
            if (!projectToUpdate) return;

            const newLogEntry: LogEntry = {
                id: `log-${Date.now()}-${Math.random()}`,
                actorId,
                actorName,
                action,
                timestamp: new Date().toISOString(),
            };
            
            const updatedLog = [newLogEntry, ...(projectToUpdate.activityLog || [])];
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, activityLog: updatedLog } : p));
        },
        handleLogout: () => {
            setCurrentUser(null);
            setSelectedProjectId(null);
            setTargetPhaseId(null);
        },
        handleRequirePasswordChange: (user: User) => setUserForPasswordChange(user),
        handleCancelPasswordChange: () => setUserForPasswordChange(null),
        handlePasswordChanged: (userId: string, newPassword: string) => {
            const userToUpdate = allUsers.find(u => u.id === userId);
            if (!userToUpdate) return;
            
            const updatedUser = { ...userToUpdate, password: newPassword, requiresPasswordChange: false };

            setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
            
            setCurrentUser(updatedUser);
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
        handleUpdateProject: (
            projectId: string,
            data: Partial<Project>
        ) => {
            const oldProject = projects.find(p => p.id === projectId);
            if (!oldProject) return;

            if (data.currentPhaseId && data.currentPhaseId !== oldProject.currentPhaseId && currentUser) {
                const newPhase = oldProject.phases.find(p => p.id === data.currentPhaseId);
                actions.addLogEntry(projectId, currentUser.id, `avançou o projeto para a Fase ${data.currentPhaseId}: ${newPhase?.title}.`);
            }

            setProjects(prev =>
                prev.map(p =>
                    p.id === projectId ? { ...p, ...data } : p
                )
            );
        },
        handleCreateTask: (projectId: string, phaseId: number, description: string, assigneeId?: string) => {
             setProjects(prev => prev.map(p => {
                if (p.id === projectId) {
                    const newPhases = p.phases.map(ph => {
                        if (ph.id === phaseId) {
                            const newTask: Task = {
                                id: `task-${Date.now()}`,
                                description,
                                phaseId,
                                status: 'pending',
                                assigneeId: assigneeId || currentUser!.id,
                                createdBy: currentUser!.id,
                                createdAt: new Date().toISOString(),
                            };
                            return { ...ph, tasks: [...ph.tasks, newTask] };
                        }
                        return ph;
                    });
                    return { ...p, phases: newPhases };
                }
                return p;
            }));
        },
        handleAdvancePhase: (projectId: string, phaseId: number) => {
            setProjects(prev => prev.map(p => {
                if (p.id === projectId && p.currentPhaseId === phaseId) {
                    const nextPhaseId = phaseId + 1;
                    const updatedPhases = p.phases.map(ph => {
                        if (ph.id === phaseId) return { ...ph, status: 'completed' as const };
                        if (ph.id === nextPhaseId) return { ...ph, status: 'in-progress' as const };
                        return ph;
                    });
                    return { ...p, currentPhaseId: nextPhaseId, phases: updatedPhases };
                }
                return p;
            }));
             actions.addLogEntry(projectId, currentUser!.id, `concluiu e avançou a Fase ${phaseId}.`);
        },
        handleUpdatePhaseChat: (projectId: string, phaseId: number, content: string) => {
            if (!currentUser) return;
            const newMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                authorAvatarUrl: currentUser.avatarUrl,
                authorRole: currentUser.role,
                content: content,
                timestamp: new Date().toISOString(),
            };
            setProjects(prev => prev.map(p => {
                if (p.id === projectId) {
                    const updatedPhases = p.phases.map(ph => {
                        if (ph.id === phaseId) {
                            const phaseDataKey = `phase${phaseId}Data` as keyof typeof ph;
                            const phaseData = (ph as any)[phaseDataKey];
                            if(phaseData && phaseData.discussion) {
                                const updatedPhaseData = { ...phaseData, discussion: [...phaseData.discussion, newMessage] };
                                return { ...ph, [phaseDataKey]: updatedPhaseData };
                            }
                        }
                        return ph;
                    });
                    return { ...p, phases: updatedPhases };
                }
                return p;
            }));
        },
        handleUpdateUser: (userId: string, data: Partial<User>) => {
            setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
             if (currentUser?.id === userId) {
                setCurrentUser(prev => prev ? { ...prev, ...data } : null);
            }
        },
        handleCreateClient: (projectName: string, mainClientData: NewClientData, additionalClientsData: NewClientData[], contractFile: File) => {
            // Create users
            const allNewClientsData = [mainClientData, ...additionalClientsData];
            const newUsers: User[] = allNewClientsData.map(clientData => ({
                id: `user-${Date.now()}-${Math.random()}`,
                name: clientData.name,
                email: clientData.email,
                password: clientData.password,
                role: UserRole.CLIENT,
                clientType: clientData.clientType,
                requiresPasswordChange: true,
            }));
            
            setAllUsers(prev => [...prev, ...newUsers]);
            
            // Create project
            const newProject: Project = {
                id: `proj-${Date.now()}`,
                name: projectName,
                status: 'in-progress',
                currentPhaseId: 1,
                consultantId: currentUser!.id,
                clientIds: newUsers.map(u => u.id),
                phases: getInitialProjectPhases(),
                internalChat: [],
                clientChat: [],
                activityLog: [],
            };
            
            setProjects(prev => [...prev, newProject]);
            actions.addLogEntry(newProject.id, currentUser!.id, 'criou o projeto.');
            
            // Go to dashboard to see the new project
            setCurrentView('dashboard');
        },
         handleOpenChat: (chatType: 'client' | 'internal') => {
            if (selectedProject) {
                setActiveChat({ projectId: selectedProject.id, chatType });
            }
        },
        handleSendProjectMessage: (content: string) => {
            if (!activeChat || !selectedProject || !currentUser) return;

            const newMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                authorId: currentUser.id,
                authorName: currentUser.name,
                authorAvatarUrl: currentUser.avatarUrl,
                authorRole: currentUser.role,
                content,
                timestamp: new Date().toISOString(),
            };
            
            setProjects(prev => prev.map(p => {
                if (p.id === selectedProject.id) {
                    const chatHistory = activeChat.chatType === 'client' ? p.clientChat : p.internalChat;
                    const updatedChat = [...chatHistory, newMessage];
                    return activeChat.chatType === 'client' 
                        ? { ...p, clientChat: updatedChat }
                        : { ...p, internalChat: updatedChat };
                }
                return p;
            }));
        },
        handleAiSendMessage: async (content: string) => {
            if (!currentUser) return;
            
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
                const responseText = await aiChatSession!.sendMessage(content);
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
        // FIX: The aiChatSession state variable was not being returned.
        aiChatSession,
        actions, setCurrentUser, setUserForPasswordChange, setCurrentView,
        setSelectedProjectId, setNotifications, setActiveChat, setTargetPhaseId,
        setIsAiChatOpen, setAiChatMessages, setAiChatSession, setIsAiLoading,
        isPartnerDataComplete, setProjects, setAllUsers, setIsSidebarOpen
    };
};

const App = () => {
  const store = useStore();

  useEffect(() => {
    if (store.currentUser && !store.aiChatSession) {
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
    }
  }, [store.currentUser, store.aiChatSession, store]);

  if (store.isLoading) {
    return <div>Carregando...</div>;
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
                            onDeleteProject={(id) => store.setProjects(p => p.filter(proj => proj.id !== id))}
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
                        onDeleteUser={(id) => store.setAllUsers(u => u.filter(user => user.id !== id))}
                        onNavigateToCreate={(role) => store.actions.handleNavigate('create_user')}
                        onResetPassword={(id) => {
                            store.setAllUsers(users => users.map(u => u.id === id ? { ...u, requiresPasswordChange: true, password: 'resetpassword' } : u));
                            alert('Senha resetada para "resetpassword". O usuário deverá alterá-la no próximo login.');
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

      {store.isAiChatOpen && (
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
