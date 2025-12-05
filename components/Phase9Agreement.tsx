import React, { useState, useEffect, useRef } from 'react';
import { Phase, Phase9AgreementData, UserRole, Project, User, Document as DocType, ChatMessage } from '../types';
import Icon from './Icon';
import { generateAIDraft } from '../services/geminiService';

interface Phase9AgreementProps {
  phase: Phase;
  project: Project;
  currentUser: User;
  users: User[];
  canEdit: boolean;
  onUpdateData: (data: Partial<Phase9AgreementData>) => void;
  isReadOnly?: boolean;
}

const AI_SUGGESTIONS = [
    "Para que serve o acordo de sócios?",
    "O que acontece se um sócio quiser vender a parte dele?",
    "O fundador pode continuar administrando sozinho?",
    "Como garantir que os herdeiros não vendam a holding?",
];

const DRAFT_TEMPLATE = `Crie um rascunho de um acordo de sócios para uma holding familiar com as seguintes características:
- Nome da Holding: [Nome da Holding Família]
- Sócios e participações: [Liste os sócios e seus percentuais]
- Cláusula de Administração: [Ex: Administração exclusiva do sócio fundador, Sr. João da Silva]
- Regras para Venda de Quotas: [Ex: Direito de preferência para os demais sócios da família, seguido por herdeiros diretos]
- Distribuição de Lucros: [Ex: Proporcional às quotas, com apuração anual]
- Regras de Sucessão em caso de falecimento: [Ex: As quotas serão transferidas para os herdeiros diretos, que ingressarão na sociedade]
- Outras cláusulas importantes: [Ex: Cláusula de não concorrência, regras para aporte de capital]
`;

const getStatusChip = (status: Phase9AgreementData['status']) => {
    const statuses = {
        pending_draft: { text: 'Rascunho', color: 'gray' },
        in_review: { text: 'Em Revisão', color: 'yellow' },
        approved: { text: 'Aprovado', color: 'green' },
    };
    const s = statuses[status] || { text: 'Desconhecido', color: 'gray' };
    const colorClasses = {
      gray: 'text-gray-800 bg-gray-100',
      yellow: 'text-yellow-800 bg-yellow-100',
      blue: 'text-blue-800 bg-blue-100',
      green: 'text-green-800 bg-green-100',
    }[s.color];
    
    return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClasses}`}>{s.text}</span>;
};


const Phase9Agreement: React.FC<Phase9AgreementProps> = ({ phase, project, currentUser, users, canEdit, onUpdateData, isReadOnly }) => {
    
    const phaseData = phase.phase9Data || { drafts: [], discussion: [], status: 'pending_draft', approvals: {}, documents: { agreement: undefined }, includedClauses: [] };
    const [localData, setLocalData] = useState<Phase9AgreementData>(phaseData);
    const [newClause, setNewClause] = useState('');

    const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
    const [draftPrompt, setDraftPrompt] = useState(DRAFT_TEMPLATE);
    const [generatedDraft, setGeneratedDraft] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isConsultant = currentUser.role === UserRole.CONSULTANT || currentUser.role === UserRole.ADMINISTRATOR;

    const allPartners = project.clientIds
        .map(id => users.find(u => u.id === id))
        .filter((u): u is User => !!u && u.clientType === 'partner');
        
    const allApproved = allPartners.length > 0 && allPartners.every(p => phaseData.approvals?.[p.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    
    useEffect(scrollToBottom, [phaseData.discussion]);

    useEffect(() => {
        setLocalData(phaseData);
    }, [phaseData]);

    const handleUpdate = <K extends keyof Phase9AgreementData>(field: K, value: Phase9AgreementData[K]) => {
        const updatedData = { ...localData, [field]: value };
        setLocalData(updatedData);
        onUpdateData({ [field]: value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
             const newDraft: DocType = {
                id: `doc-agreement-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
                type: 'pdf',
                uploadedAt: new Date().toISOString(),
                uploadedBy: currentUser.name,
                phaseId: 9,
                version: (phaseData.drafts?.length || 0) + 1,
                status: 'active'
            };
            handleUpdate('drafts', [...(localData.drafts || []), newDraft]);
            handleUpdate('documents', { agreement: file });
        }
    };
    
    const handleAddClause = () => {
        if (newClause.trim()) {
            const updatedClauses = [...localData.includedClauses, newClause.trim()];
            handleUpdate('includedClauses', updatedClauses);
            setNewClause('');
        }
    };

    const handleRemoveClause = (clauseToRemove: string) => {
        const updatedClauses = localData.includedClauses.filter(c => c !== clauseToRemove);
        handleUpdate('includedClauses', updatedClauses);
    };

    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        setGeneratedDraft('');
        const draft = await generateAIDraft(draftPrompt);
        setGeneratedDraft(draft);
        setIsGenerating(false);
    };
    
    const handleClientApproval = () => {
        const newApprovals = { ...phaseData.approvals, [currentUser.id]: true };
        onUpdateData({ approvals: newApprovals });
    };

    const renderConsultantView = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium">Status do Acordo</label>
                    <select value={localData.status || ''} onChange={(e) => handleUpdate('status', e.target.value as Phase9AgreementData['status'])} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}>
                        <option value="pending_draft">Rascunho</option>
                        <option value="in_review">Em Revisão</option>
                        <option value="approved">Aprovado</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium">Data da Assinatura</label>
                    <input type="date" value={localData.signatureDate || ''} onChange={(e) => handleUpdate('signatureDate', e.target.value)} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly} />
                </div>
            </div>

            <div>
                 <label className="text-sm font-medium">Cláusulas Importantes Incluídas</label>
                 <div className="mt-1 space-y-2">
                    {localData.includedClauses.map(clause => (
                        <div key={clause} className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                            <span className="text-sm">{clause}</span>
                            {!isReadOnly && <button onClick={() => handleRemoveClause(clause)} className="text-gray-400 hover:text-red-500"><Icon name="close" className="w-4 h-4"/></button>}
                        </div>
                    ))}
                 </div>
                 {!isReadOnly && (
                    <div className="flex mt-2">
                        <input type="text" value={newClause} onChange={(e) => setNewClause(e.target.value)} placeholder="Nova cláusula..." className="flex-grow text-sm rounded-l-md border-gray-300"/>
                        <button onClick={handleAddClause} className="px-4 py-2 bg-brand-secondary text-white text-sm font-semibold rounded-r-md hover:bg-brand-primary">Adicionar</button>
                    </div>
                 )}
            </div>

            <div>
                <label className="text-sm font-medium">Observações para o Cliente</label>
                <textarea value={localData.consultantObservations || ''} onChange={(e) => handleUpdate('consultantObservations', e.target.value)} rows={3} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}></textarea>
            </div>
            
            {!isReadOnly && (
                <div>
                    <label className="text-sm font-medium">Upload do Acordo Assinado (.pdf)</label>
                    <input type="file" accept=".pdf" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
            )}
            {!isReadOnly && (
                <button onClick={() => setIsDraftModalOpen(true)} className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark">
                    <Icon name="ai" className="w-5 h-5 mr-2" />
                    Gerar Rascunho com IA
                </button>
            )}
        </div>
    );
    
    const renderClientView = () => (
        <div className="space-y-6">
            <div className="p-4 border rounded-xl bg-gray-50">
                 <h4 className="font-semibold text-lg text-brand-dark mb-3">Detalhes do Acordo</h4>
                 <div className="space-y-3">
                     <div className="flex justify-between items-center"><span className="font-medium text-sm">Status:</span>{getStatusChip(localData.status)}</div>
                     {localData.signatureDate && <div className="flex justify-between items-center"><span className="font-medium text-sm">Data de Assinatura:</span><span className="text-sm">{new Date(localData.signatureDate).toLocaleDateString('pt-BR')}</span></div>}
                     <div><span className="font-medium text-sm">Cláusulas Principais:</span>
                        <ul className="list-disc list-inside mt-1 text-sm text-gray-700">
                            {localData.includedClauses.map(c => <li key={c}>{c}</li>)}
                        </ul>
                     </div>
                      {localData.consultantObservations && <div className="p-2 bg-yellow-50 border-l-4 border-yellow-300 text-sm">{localData.consultantObservations}</div>}
                 </div>
            </div>

            {localData.documents.agreement && (
                 <a href={URL.createObjectURL(localData.documents.agreement)} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center px-6 py-3 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-primary text-base">
                    <Icon name="file-pdf" className="w-5 h-5 mr-2" />
                    Baixar Acordo de Sócios
                </a>
            )}

            {(localData.status === 'in_review' || localData.status === 'pending_draft') && (
                <div>
                     <label className="text-sm font-medium">Sugestões ou Dúvidas</label>
                     <textarea value={localData.clientFeedback || ''} onChange={(e) => handleUpdate('clientFeedback', e.target.value)} rows={4} placeholder="Deixe aqui suas sugestões de ajuste para o consultor." className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}></textarea>
                </div>
            )}
        </div>
    );
    
    const renderAIDraftModal = () => (
      <>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsDraftModalOpen(false)} aria-hidden="true"></div>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-brand-primary flex items-center"><Icon name="ai" className="w-6 h-6 mr-2"/>Gerador de Minuta com IA</h2>
                    <button onClick={() => setIsDraftModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200"><Icon name="close" className="w-6 h-6 text-gray-600" /></button>
                </div>
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-800">1. Preencha os Critérios</h3>
                        <p className="text-sm text-gray-600">Use o modelo abaixo para fornecer à IA as informações necessárias para gerar o rascunho do acordo.</p>
                        <textarea value={draftPrompt} onChange={(e) => setDraftPrompt(e.target.value)} rows={15} className="w-full text-sm rounded-md border-gray-300 font-mono"></textarea>
                        <button onClick={handleGenerateDraft} disabled={isGenerating} className="w-full px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-primary disabled:bg-gray-400">
                            {isGenerating ? 'Gerando...' : 'Gerar Rascunho'}
                        </button>
                    </div>
                    <div className="space-y-4">
                         <h3 className="font-semibold text-gray-800">2. Resultado</h3>
                         <div className="w-full h-full p-3 border rounded-md bg-gray-50 text-sm overflow-y-auto relative min-h-[300px]">
                            {isGenerating ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">Aguardando IA...</p>
                                </div>
                            ) : generatedDraft ? (
                                <>
                                <button onClick={() => navigator.clipboard.writeText(generatedDraft)} className="absolute top-2 right-2 px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded hover:bg-gray-300">Copiar</button>
                                <pre className="whitespace-pre-wrap font-sans">{generatedDraft}</pre>
                                </>
                            ) : (
                                <p className="text-gray-400">O rascunho gerado pela IA aparecerá aqui.</p>
                            )}
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h3 className="text-2xl font-bold text-brand-primary mb-2">{phase.id}. {phase.title}</h3>
                <p className="text-gray-600 mb-6">{phase.description}</p>
                
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-4 border rounded-xl">
                             <h4 className="font-semibold text-lg text-brand-dark mb-3">Minutas do Acordo</h4>
                            {canEdit && !isReadOnly && (
                                <div className="mb-4">
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Enviar nova versão</label>
                                    <input type="file" accept=".pdf" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                </div>
                            )}
                             <div className="space-y-2 max-h-60 overflow-y-auto">
                                {(phaseData.drafts || []).slice().reverse().map(draft => (
                                    <a key={draft.id} href={draft.url} target="_blank" rel="noreferrer" className="block p-3 bg-gray-50 rounded-md hover:bg-gray-100 border">
                                        <p className="font-semibold text-sm text-brand-secondary flex items-center">
                                            <Icon name="file-pdf" className="w-4 h-4 mr-2"/>
                                            {draft.name} (v{draft.version})
                                        </p>
                                    </a>
                                ))}
                                {(phaseData.drafts || []).length === 0 && <p className="text-sm text-gray-500 text-center py-4">Aguardando a primeira minuta.</p>}
                            </div>
                        </div>

                        <div className="p-4 border rounded-xl">
                            <h4 className="font-semibold text-lg text-brand-dark mb-3">Status de Aprovação</h4>
                            <div className="space-y-2">
                                {allPartners.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-md" style={{ backgroundColor: phaseData.approvals?.[p.id] ? '#f0fdf4' : '#fefce8' }}>
                                        <span>{p.name}</span>
                                        {phaseData.approvals?.[p.id] ? 
                                            <span className="flex items-center font-semibold text-green-700"><Icon name="check" className="w-4 h-4 mr-1"/>Aprovado</span> :
                                            <span className="flex items-center font-semibold text-yellow-700"><Icon name="pending" className="w-4 h-4 mr-1"/>Pendente</span>
                                        }
                                    </div>
                                ))}
                            </div>
                            {currentUser.clientType === 'partner' && !phaseData.approvals?.[currentUser.id] && (phaseData.drafts || []).length > 0 && !isReadOnly && (
                                <button onClick={handleClientApproval} className="w-full mt-4 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 text-sm">
                                    Aprovar Versão do Acordo
                                </button>
                            )}
                            {allApproved && <p className="text-center text-sm font-semibold text-green-700 mt-4">Todos os sócios aprovaram!</p>}
                        </div>

                         {isConsultant ? renderConsultantView() : renderClientView()}
                    </div>
                    
                    <div className="p-6 bg-gray-50 rounded-xl border h-fit">
                         <h4 className="font-semibold text-lg text-brand-dark mb-3">Dúvidas sobre o Acordo?</h4>
                         <p className="text-sm text-gray-500 mb-4">Entenda as regras que protegem a relação entre os sócios.</p>
                         <div className="space-y-2">
                            {AI_SUGGESTIONS.map(q => (
                                <button key={q} onClick={() => { /* onOpenChatWithQuestion(q) */ }} className="w-full text-left text-sm p-3 bg-white border rounded-md hover:bg-gray-100 hover:border-brand-secondary transition-colors">{q}</button>
                            ))}
                         </div>
                    </div>
                </div>
            </div>
            {isDraftModalOpen && renderAIDraftModal()}
        </div>
    );
};

export default Phase9Agreement;
