// components/Phase10Support.tsx (repurposed from AccountingView.tsx)
import React, { useState } from 'react';
import { Phase, User, UserRole, SupportRequest, Document, ChatMessage, Project } from '../types';
import Icon from './Icon';

interface Phase10SupportProps {
  phase: Phase;
  currentUser: User;
  onUpdateData: (data: Partial<{ requests: SupportRequest[] }>) => void;
  project?: Project;
}

// FIX: Extracted the NewRequestModal component outside of the Phase10Support component.
// This prevents the modal from being re-created on every state change of the parent,
// which was causing the input fields to lose focus after every character typed.
interface NewRequestModalProps {
  onClose: () => void;
  onCreateRequest: (title: string, description: string) => void;
}

const NewRequestModal: React.FC<NewRequestModalProps> = ({ onClose, onCreateRequest }) => {
  // State for the form is now managed locally within the modal.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      alert("Título e descrição são obrigatórios.");
      return;
    }
    onCreateRequest(title, description);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-brand-primary">Nova Solicitação</h3>
          <button onClick={onClose}><Icon name="close" className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <input type="text" placeholder="Título da solicitação (ex: Alteração de endereço)" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border-gray-300" autoFocus />
          <textarea rows={5} placeholder="Descreva sua necessidade em detalhes..." value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border-gray-300"></textarea>
        </div>
        <div className="p-4 bg-gray-50 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg font-semibold">Cancelar</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold">Abrir Chamado</button>
        </div>
      </div>
    </div>
  );
};

const Phase10Support: React.FC<Phase10SupportProps> = ({ phase, currentUser, onUpdateData, project }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  
  const { requests = [] } = phase.phase10Data || { requests: [] };
  const canEdit = currentUser.role !== UserRole.CLIENT;

  const handleCreateRequest = (title: string, description: string) => {
    const newRequest: SupportRequest = {
      id: `req-${Date.now()}`,
      title: title,
      description: description,
      status: 'open',
      requesterId: currentUser.id,
      createdAt: new Date().toISOString(),
      messages: [],
      documents: [],
      category: 'other',
      priority: 'medium',
    };
    onUpdateData({ requests: [...requests, newRequest] });
    setIsModalOpen(false);
  };

  const handleUpdateRequest = (reqId: string, data: Partial<SupportRequest>) => {
      const updatedRequests = requests.map(r => r.id === reqId ? { ...r, ...data } : r);
      onUpdateData({ requests: updatedRequests });
  };
  
  const getStatusChip = (status: SupportRequest['status']) => {
    const statuses = {
      open: { text: 'Aberto', color: 'yellow' },
      'in-progress': { text: 'Em Andamento', color: 'blue' },
      closed: { text: 'Fechado', color: 'gray' },
    };
    const s = statuses[status];
    const colorClasses = {
      yellow: 'text-yellow-800 bg-yellow-100',
      blue: 'text-blue-800 bg-blue-100',
      gray: 'text-gray-800 bg-gray-100',
    }[s.color];
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClasses}`}>{s.text}</span>;
  }

    const getPriorityChip = (priority: SupportRequest['priority']) => {
    const priorities = {
      low: { text: 'Baixa', color: 'gray' },
      medium: { text: 'Média', color: 'yellow' },
      high: { text: 'Alta', color: 'red' },
    };
    const p = priorities[priority];
     const colorClasses = {
      gray: 'text-gray-800 bg-gray-200',
      yellow: 'text-yellow-800 bg-yellow-200',
      red: 'text-red-800 bg-red-200',
    }[p.color];
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClasses}`}>{p.text}</span>;
  }

  const RequestDetailView: React.FC<{request: SupportRequest}> = ({ request }) => (
    <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Details Column */}
        <div className="md:col-span-1 space-y-4">
             <h4 className="font-semibold text-brand-dark">Detalhes</h4>
             <dl className="text-sm space-y-2">
                 <div><dt className="text-gray-500">Solicitante:</dt><dd className="font-medium">{currentUser.name}</dd></div>
                 <div><dt className="text-gray-500">Data:</dt><dd>{new Date(request.createdAt).toLocaleDateString('pt-BR')}</dd></div>
                 <div>
                    <dt className="text-gray-500">Status:</dt>
                    {canEdit ?
                        <select value={request.status || ''} onChange={e => handleUpdateRequest(request.id, {status: e.target.value as SupportRequest['status']})} className="w-full text-sm rounded-md border-gray-300">
                            <option value="open">Aberto</option>
                            <option value="in-progress">Em Andamento</option>
                            <option value="closed">Fechado</option>
                        </select> 
                        : <dd>{getStatusChip(request.status)}</dd>
                    }
                 </div>
                 <div>
                     <dt className="text-gray-500">Prioridade:</dt>
                    {canEdit ?
                        <select value={request.priority || ''} onChange={e => handleUpdateRequest(request.id, {priority: e.target.value as SupportRequest['priority']})} className="w-full text-sm rounded-md border-gray-300">
                            <option value="low">Baixa</option>
                            <option value="medium">Média</option>
                            <option value="high">Alta</option>
                        </select> 
                        : <dd>{getPriorityChip(request.priority)}</dd>
                    }
                 </div>
             </dl>
             <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 border rounded-md">{request.description}</p>
        </div>

        {/* Chat & Docs Column */}
        <div className="md:col-span-2 space-y-4">
            <div>
                <h4 className="font-semibold text-brand-dark mb-2">Documentos do Ticket</h4>
                {request.documents.length > 0 ? request.documents.map(doc => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center p-2 bg-gray-50 rounded-md border text-sm hover:bg-gray-100">
                        <Icon name="file-pdf" className="w-5 h-5 mr-2 text-red-500" />
                        <span className="font-medium text-brand-secondary">{doc.name}</span>
                    </a>
                )) : <p className="text-xs text-gray-500">Nenhum documento anexado.</p>}
                 {canEdit && <input type="file" className="mt-2 block w-full text-xs" />}
            </div>
             <div>
                <h4 className="font-semibold text-brand-dark mb-2">Discussão</h4>
                <div className="border rounded-lg flex flex-col h-64">
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-2 space-y-3">
                        {request.messages.map(msg => (
                             <div key={msg.id} className={`flex items-end gap-2 ${msg.authorId === currentUser.id ? 'justify-end' : ''}`}>
                                 <div className={`p-2 rounded-lg max-w-xs ${msg.authorId === currentUser.id ? 'bg-brand-secondary text-white' : 'bg-white border'}`}>
                                     <p className="text-xs font-bold mb-1">{msg.authorName}</p>
                                     <p className="text-sm">{msg.content}</p>
                                 </div>
                             </div>
                        ))}
                    </div>
                    <div className="p-2 border-t"><input type="text" placeholder="Escreva uma resposta..." className="w-full text-sm border-gray-200 rounded-md"/></div>
                </div>
            </div>
        </div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {isModalOpen && <NewRequestModal onClose={() => setIsModalOpen(false)} onCreateRequest={handleCreateRequest} />}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-brand-primary">
                {project ? `${project.name}: ` : ''}{phase.id}. {phase.title}
            </h3>
            <p className="text-gray-600">{phase.description}</p>
          </div>
          {!canEdit && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-primary">
              <Icon name="plus" className="w-5 h-5 mr-2" />
              Nova Solicitação
            </button>
          )}
        </div>

        <div className="space-y-3">
          {requests.length > 0 ? (
            requests.slice().reverse().map(req => (
              <details key={req.id} className="p-4 border rounded-lg group bg-gray-50/50" open={selectedRequestId === req.id} onToggle={(e) => e.currentTarget.open ? setSelectedRequestId(req.id) : setSelectedRequestId(null)}>
                <summary className="cursor-pointer flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-brand-dark">{req.title}</span>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 capitalize">{req.category.replace('_', ' ')}</span>
                        {getPriorityChip(req.priority)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusChip(req.status)}
                    <Icon name="arrow-right" className="w-5 h-5 transition-transform transform group-open:rotate-90" />
                  </div>
                </summary>
                {selectedRequestId === req.id && <RequestDetailView request={req} />}
              </details>
            ))
          ) : (
            <div className="text-center p-10 border-2 border-dashed rounded-lg">
              <Icon name="folder" className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-4 font-semibold text-gray-600">Nenhuma solicitação encontrada.</p>
              {!canEdit && <p className="text-sm text-gray-500">Clique em "Nova Solicitação" para iniciar.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Phase10Support;
