import React, { useState, useMemo } from 'react';
import { Project, Document, Phase, User } from '../types';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

interface UploadModalProps {
  phases: Phase[];
  onClose: () => void;
  onUpload: (file: File, phaseId: number, description: string) => Promise<void>;
}

const UploadModal: React.FC<UploadModalProps> = ({ phases, onClose, onUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [phaseId, setPhaseId] = useState<number>(phases[0]?.id || 1);
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (file && phaseId) {
            setIsLoading(true);
            try {
                await onUpload(file, phaseId, description);
                onClose();
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true"></div>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-lg rounded-lg shadow-xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-brand-primary">Adicionar Novo Documento</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><Icon name="close" className="w-6 h-6 text-gray-600" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <LoadingSpinner size="medium" />
                            <p className="mt-4 text-sm text-gray-600">Enviando documento...</p>
                            <p className="mt-1 text-xs text-gray-500">Por favor, aguarde</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Arquivo</label>
                                <input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={isLoading} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"/>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Fase do Projeto</label>
                                <select value={phaseId} onChange={(e) => setPhaseId(Number(e.target.value))} disabled={isLoading} className="mt-1 w-full rounded-md border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {phases.map(p => <option key={p.id} value={p.id}>{p.id}. {p.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Contrato Social V2" disabled={isLoading} className="mt-1 w-full rounded-md border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"/>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold text-sm hover:bg-brand-primary">Enviar</button>
                </div>
            </form>
        </div>
      </>
    );
};


interface DocumentsViewProps {
  project: Project;
  users: User[];
  onBack?: () => void;
  onUploadDocument: (projectId: string, phaseId: number, file: File, description: string) => void;
}

const DocumentsView: React.FC<DocumentsViewProps> = ({ project, users, onBack, onUploadDocument }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const allDocuments = useMemo(() => {
    type DisplayDocument = Document & { phaseTitle: string; uploadedBy: string };
    const docs: DisplayDocument[] = [];

    // 1. Get documents from project phases
    project.phases.forEach(phase => {
      phase.documents.forEach(doc => {
        docs.push({ ...doc, phaseTitle: phase.title });
      });
    });

    // 2. Get documents from users linked to the project
    const projectClients = users.filter(u => project.clientIds.includes(u.id));
    projectClients.forEach(client => {
      (client.documents || []).forEach(userDoc => {
        docs.push({
          id: userDoc.id,
          name: userDoc.name,
          url: userDoc.url,
          type: 'pdf', // Assuming all user docs are pdf for simplicity
          uploadedAt: userDoc.uploadedAt,
          uploadedBy: client.name,
          phaseId: 0, // Indicates it's not from a specific phase
          phaseTitle: 'Documento Pessoal',
          version: 1,
          status: 'active',
        });
      });
    });

    return docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [project, users]);

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) {
      return allDocuments;
    }
    return allDocuments.filter(doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.phaseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allDocuments, searchTerm]);
  
  const getFileIcon = (type: Document['type']): React.ReactNode => {
    switch (type) {
      case 'pdf': return <Icon name="file-pdf" className="w-8 h-8 text-red-500" />;
      case 'doc': return <Icon name="file-doc" className="w-8 h-8 text-blue-500" />;
      default: return <Icon name="file-text" className="w-8 h-8 text-gray-500" />;
    }
  };

  const handleUpload = (file: File, phaseId: number, description: string) => {
    onUploadDocument(project.id, phaseId, file, description);
    setIsUploadModalOpen(false);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
       {onBack && <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-secondary hover:text-brand-primary mb-6"><Icon name="arrow-right" className="w-4 h-4 mr-2 transform rotate-180" />Voltar para Projetos</button>}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h2 className="text-2xl font-bold text-brand-primary mb-2">Documentos: {project.name}</h2>
                <p className="text-gray-600">Encontre e adicione todos os arquivos relacionados ao projeto.</p>
            </div>
            <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-primary transition-colors">
                <Icon name="plus" className="w-5 h-5 mr-2" />
                Adicionar Documento
            </button>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou fase..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="user-circle" className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {filteredDocuments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Documento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Upload</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                          {getFileIcon(doc.type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                          <div className="text-sm text-gray-500">Enviado por: {doc.uploadedBy}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${doc.phaseTitle === 'Documento Pessoal' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {doc.phaseTitle}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.uploadedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href={doc.url} download={doc.name} className="text-brand-secondary hover:text-brand-primary">
                        Baixar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <Icon name="folder" className="w-16 h-16 text-gray-300 mx-auto" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum documento encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Tente ajustar sua busca ou adicione o primeiro documento do projeto.</p>
          </div>
        )}
      </div>
      {isUploadModalOpen && <UploadModal phases={project.phases} onClose={() => setIsUploadModalOpen(false)} onUpload={handleUpload} />}
    </div>
  );
};

export default DocumentsView;
