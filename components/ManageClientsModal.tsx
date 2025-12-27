import React, { useState, useMemo } from 'react';
import { Project, User, UserRole } from '../types';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

interface ManageClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (projectId: string, updatedData: Partial<Project>) => void;
  allUsers: User[];
  onAddUser: (user: User) => void;
}

const ManageClientsModal: React.FC<ManageClientsModalProps> = ({ isOpen, onClose, project, onUpdateProject, allUsers, onAddUser }) => {
  const [newClient, setNewClient] = useState({ name: '', email: '', password: '', clientType: 'partner' as 'partner' | 'interested' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const spinnerStyles = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  const projectClients = useMemo(() => {
    return project.clientIds.map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u);
  }, [project.clientIds, allUsers]);

  const handleAddClient = async () => {
    setError('');
    if (!newClient.name.trim() || !newClient.email.trim() || !newClient.password.trim()) {
        setError('Nome, e-mail e senha são obrigatórios.');
        return;
    }
    const emailExists = allUsers.some(u => u.email.toLowerCase() === newClient.email.toLowerCase());
    if (emailExists) {
        setError('Um usuário com este e-mail já existe no sistema.');
        return;
    }

    setIsLoading(true);
    try {
        const newUser: User = {
            id: `user-${Date.now()}`,
            name: newClient.name,
            email: newClient.email,
            password: newClient.password,
            clientType: newClient.clientType,
            role: UserRole.CLIENT,
            requiresPasswordChange: true,
        };

        onAddUser(newUser);
        // Only add if not already in the project (prevent duplicates)
        if (!project.clientIds.includes(newUser.id)) {
            onUpdateProject(project.id, { clientIds: [...project.clientIds, newUser.id] });
        }
        setNewClient({ name: '', email: '', password: '', clientType: 'partner' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleRemoveClient = async (clientId: string) => {
    if (project.clientIds.length <= 1) {
        alert("O projeto deve ter pelo menos um cliente.");
        return;
    }
    if (window.confirm("Tem certeza que deseja remover este cliente do projeto? O usuário não será deletado do sistema.")) {
      setIsRemoving(clientId);
      try {
        const updatedClientIds = project.clientIds.filter(id => id !== clientId);
        onUpdateProject(project.id, { clientIds: updatedClientIds });
      } finally {
        setIsRemoving(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true"></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative bg-white w-full max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold text-brand-primary">Gerenciar Clientes do Projeto</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
              <Icon name="close" className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Clientes Atuais</h3>
              <ul className="space-y-2">
                {projectClients.map(client => (
                  <li key={client.id} className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                    <div className="flex items-center">
                        {client.avatarUrl ? (
                           <img src={client.avatarUrl} alt={client.name} className="w-8 h-8 rounded-full mr-3"/>
                        ) : (
                           <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">{client.name.charAt(0)}</div>
                        )}
                        <div>
                            <p className="text-sm font-medium">{client.name}</p>
                            <p className="text-xs text-gray-500">{client.email}</p>
                        </div>
                    </div>
                    <button
                      onClick={() => handleRemoveClient(client.id)}
                      disabled={isRemoving === client.id}
                      className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                      {isRemoving === client.id ? (
                        <>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', borderTop: '2px solid #ef4444', borderRight: '2px solid transparent', borderBottom: '2px solid transparent', borderLeft: '2px solid transparent', animation: 'spin 1s linear infinite' }}></div>
                          Removendo...
                        </>
                      ) : (
                        'Remover'
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-800 mb-4">Adicionar Novo Cliente ao Projeto</h3>
              <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nome do cliente"
                      value={newClient.name}
                      onChange={(e) => setNewClient(p => ({ ...p, name: e.target.value }))}
                      disabled={isLoading}
                      className="w-full px-3 py-2 text-sm border-gray-300 rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed"
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={newClient.email}
                      onChange={(e) => setNewClient(p => ({ ...p, email: e.target.value }))}
                      disabled={isLoading}
                      className="w-full px-3 py-2 text-sm border-gray-300 rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="password"
                      placeholder="Senha provisória"
                      value={newClient.password}
                      onChange={(e) => setNewClient(p => ({ ...p, password: e.target.value }))}
                      disabled={isLoading}
                      className="w-full px-3 py-2 text-sm border-gray-300 rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed"
                    />
                    <select
                      value={newClient.clientType}
                      onChange={(e) => setNewClient(p => ({ ...p, clientType: e.target.value as any }))}
                      disabled={isLoading}
                      className="w-full px-3 py-2 text-sm border-gray-300 rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed">
                        <option value="partner">Sócio</option>
                        <option value="interested">Interessado</option>
                    </select>
                </div>
                <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddClient}
                      disabled={isLoading}
                      className="px-4 py-2 bg-brand-secondary text-white text-sm font-medium rounded-md hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      {isLoading ? (
                        <>
                          <div style={{ width: '14px', height: '14px', borderRadius: '50%', borderTop: '2px solid white', borderRight: '2px solid transparent', borderBottom: '2px solid transparent', borderLeft: '2px solid transparent', animation: 'spin 1s linear infinite' }}></div>
                          Adicionando...
                        </>
                      ) : (
                        'Adicionar Cliente'
                      )}
                    </button>
                </div>
                {error && <p className="text-xs text-red-500 text-right">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageClientsModal;
