import React, { useState, useEffect } from 'react';
import { Phase, Phase1Data, UserRole, AIAnalysisResult, Project, Task, User, PartnerQualificationData } from '../types';
import Icon from './Icon';
import { analyzeDocumentWithAI } from '../services/geminiService';

const AI_SUGGESTIONS = [
    "O que é uma holding?",
    "Qual a diferença entre doação e venda de quotas?",
    "Como a holding protege meus bens?",
];

const AIAnalysisSection: React.FC<{
    onUpdateData: (data: Partial<Phase1Data>) => void;
    phaseData: Phase1Data;
    onCreateTask: (description: string) => void;
}> = ({ onUpdateData, phaseData, onCreateTask }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [addedTasks, setAddedTasks] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files?.[0] || null);
        onUpdateData({ aiAnalysisResult: undefined }); // Clear previous results
        setError('');
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setIsLoading(true);
        setError('');
        try {
            const result = await analyzeDocumentWithAI(file);
            onUpdateData({ aiAnalysisResult: result });
            setAddedTasks([]);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddTask = (taskDescription: string) => {
        onCreateTask(taskDescription);
        setAddedTasks(prev => [...prev, taskDescription]);
    };

    return (
        <div className="p-6 bg-gray-50 rounded-xl border">
            <h4 className="font-semibold text-lg text-brand-dark mb-3">Análise Inteligente de Documentos</h4>
            <p className="text-sm text-gray-500 mb-4">Envie um documento (contrato social, matrícula, etc.) para que a IA extraia informações e sugira tarefas.</p>
            
            <div className="space-y-3">
                <input type="file" accept=".pdf,.txt,.docx" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                <button onClick={handleAnalyze} disabled={!file || isLoading} className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-400">
                    <Icon name="ai" className="w-5 h-5 mr-2" />
                    {isLoading ? 'Analisando...' : 'Analisar com IA'}
                </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
            
            {phaseData.aiAnalysisResult && (
                <div className="mt-6 space-y-4 animate-fade-in-up">
                    <details open><summary className="font-semibold cursor-pointer">Resumo</summary><p className="mt-2 text-sm p-3 bg-white border rounded-md">{phaseData.aiAnalysisResult.summary}</p></details>
                    <details open><summary className="font-semibold cursor-pointer">Informações Chave</summary><div className="mt-2 text-sm p-3 bg-white border rounded-md space-y-1">{phaseData.aiAnalysisResult.keyInfo.map(info => <div key={info.label}><strong>{info.label}:</strong> {info.value}</div>)}</div></details>
                    <details open><summary className="font-semibold cursor-pointer">Tarefas Sugeridas</summary><div className="mt-2 space-y-2">{phaseData.aiAnalysisResult.suggestedTasks.map(task => {
                        const isAdded = addedTasks.includes(task);
                        return (
                            <div key={task} className="flex items-center justify-between p-2 bg-white border rounded-md">
                                <span className={`text-sm ${isAdded ? 'line-through text-gray-500' : ''}`}>{task}</span>
                                <button onClick={() => handleAddTask(task)} disabled={isAdded} className="p-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 disabled:bg-gray-200 disabled:text-gray-400"><Icon name={isAdded ? "check" : "plus"} className="w-4 h-4"/></button>
                            </div>
                        )
                    })}</div></details>
                </div>
            )}
        </div>
    );
};

const StepIndicator: React.FC<{ number: number; title: string; isComplete: boolean; isActive: boolean }> = ({ number, title, isComplete, isActive }) => (
    <div className={`flex items-center p-3 rounded-lg border-l-4 ${isActive ? 'bg-blue-50 border-brand-secondary' : isComplete ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${isActive ? 'bg-brand-secondary text-white' : isComplete ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            {isComplete ? <Icon name="check" className="w-5 h-5" /> : <span className="font-bold">{number}</span>}
        </div>
        <div>
            <p className={`font-semibold ${isActive ? 'text-brand-primary' : 'text-gray-800'}`}>{title}</p>
            <p className="text-sm text-gray-500">{isActive ? 'Ação necessária' : isComplete ? 'Concluído' : 'Pendente'}</p>
        </div>
    </div>
);

const FormSection: React.FC<{ onFormSubmit: (data: Omit<Phase1Data, 'isFormCompleted' | 'meetingScheduled' | 'meetingDateTime' | 'diagnosticSummary' | 'objectives' | 'consultantChecklist' | 'meetingLink' | 'meetingMinutes'>) => void; isReadOnly?: boolean; initialData?: Partial<Phase1Data> }> = ({ onFormSubmit, isReadOnly, initialData }) => {
    const [formData, setFormData] = React.useState({
        objective: initialData?.objective || '',
        familyComposition: initialData?.familyComposition || '',
        mainAssets: initialData?.mainAssets || '',
        partners: initialData?.partners || '',
        existingCompanies: initialData?.existingCompanies || '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFormSubmit(formData);
    };

    const isFormValid = Object.values(formData).every((val: string) => val.trim() !== '');

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
                <label className="text-sm font-medium text-gray-700">1. Objetivo com a holding (proteção, sucessão, etc.)</label>
                <textarea name="objective" value={formData.objective} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-secondary focus:ring-brand-secondary sm:text-sm disabled:bg-gray-100" disabled={isReadOnly}></textarea>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">2. Composição familiar</label>
                <textarea name="familyComposition" value={formData.familyComposition} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-secondary focus:ring-brand-secondary sm:text-sm disabled:bg-gray-100" disabled={isReadOnly}></textarea>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">3. Bens principais (imóveis, empresas, etc.)</label>
                <textarea name="mainAssets" value={formData.mainAssets} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-secondary focus:ring-brand-secondary sm:text-sm disabled:bg-gray-100" disabled={isReadOnly}></textarea>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">4. Sócios prováveis</label>
                <textarea name="partners" value={formData.partners} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-secondary focus:ring-brand-secondary sm:text-sm disabled:bg-gray-100" disabled={isReadOnly}></textarea>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">5. Empresas existentes em nome da família</label>
                <textarea name="existingCompanies" value={formData.existingCompanies} onChange={handleInputChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-secondary focus:ring-brand-secondary sm:text-sm disabled:bg-gray-100" disabled={isReadOnly}></textarea>
            </div>
            {!isReadOnly && (
                <button type="submit" disabled={!isFormValid} className="w-full px-4 py-3 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-primary transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Enviar Pré-Diagnóstico
                </button>
            )}
        </form>
    );
}

interface MeetingMinutesModalProps {
  initialMinutes: string;
  onSave: (minutes: string) => void;
  onClose: () => void;
}

const MeetingMinutesModal: React.FC<MeetingMinutesModalProps> = ({ initialMinutes, onSave, onClose }) => {
  const [minutes, setMinutes] = useState(initialMinutes || '');

  const handleSave = () => {
    onSave(minutes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-brand-primary">Ata da Reunião</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <Icon name="close" className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          <textarea
            rows={15}
            placeholder="Digite aqui os pontos discutidos, decisões tomadas e próximos passos..."
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm sm:text-sm focus:border-brand-secondary focus:ring-brand-secondary"
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-300">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold text-sm hover:bg-brand-primary">
            Salvar Ata
          </button>
        </div>
      </div>
    </div>
  );
};

const isPartnerDataComplete = (user: User): boolean => {
    if (!user || user.clientType !== 'partner' || !user.qualificationData) return false;
    const q = user.qualificationData;
    const hasBaseData = q.cpf && q.rg && q.maritalStatus && q.birthDate && q.nationality && q.address;
    if (!hasBaseData) return false;
    if ((q.maritalStatus === 'casado' || q.maritalStatus === 'uniao_estavel') && !q.propertyRegime) return false;
    return true;
};

const PartnerDataForm: React.FC<{
    partner: User;
    onSave: (userId: string, data: Partial<User>) => void;
    onCancel: () => void;
    isReadOnly: boolean;
}> = ({ partner, onSave, onCancel, isReadOnly }) => {
    const [qualificationData, setQualificationData] = useState<PartnerQualificationData>(partner.qualificationData || {});
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setQualificationData(partner.qualificationData || {});
    }, [partner]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        // @ts-ignore
        const finalValue = isCheckbox ? e.target.checked : value;
        setQualificationData({ ...qualificationData, [name]: finalValue });
        setIsDirty(true);
    };

    const handleSave = () => {
        onSave(partner.id, { qualificationData });
        setIsDirty(false);
    };

    const isMarried = qualificationData.maritalStatus === 'casado' || qualificationData.maritalStatus === 'uniao_estavel';

    return (
        <div className="mt-4 pt-4 border-t space-y-4 animate-fade-in-up bg-white p-4 rounded-b-lg">
            <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-medium">CPF</label><input type="text" name="cpf" value={qualificationData.cpf || ''} onChange={handleChange} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}/></div>
                <div><label className="text-xs font-medium">RG</label><input type="text" name="rg" value={qualificationData.rg || ''} onChange={handleChange} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}/></div>
                <div><label className="text-xs font-medium">Data de Nasc.</label><input type="date" name="birthDate" value={qualificationData.birthDate || ''} onChange={handleChange} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}/></div>
                <div><label className="text-xs font-medium">Nacionalidade</label><input type="text" name="nationality" value={qualificationData.nationality || ''} onChange={handleChange} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}/></div>
                <div className="md:col-span-2"><label className="text-xs font-medium">Endereço Completo</label><input type="text" name="address" value={qualificationData.address || ''} onChange={handleChange} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}/></div>
                <div><label className="text-xs font-medium">Estado Civil</label><select name="maritalStatus" value={qualificationData.maritalStatus || ''} onChange={handleChange} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}><option value="">Selecione</option><option value="solteiro">Solteiro(a)</option><option value="casado">Casado(a)</option><option value="uniao_estavel">União Estável</option><option value="divorciado">Divorciado(a)</option><option value="viuvo">Viúvo(a)</option></select></div>
                {isMarried && <div><label className="text-xs font-medium">Regime de Bens</label><select name="propertyRegime" value={qualificationData.propertyRegime || ''} onChange={handleChange} className="mt-1 w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isReadOnly}><option value="">Selecione</option><option value="comunhao_parcial">Comunhão Parcial</option><option value="comunhao_universal">Comunhão Universal</option><option value="separacao_total">Separação Total</option><option value="participacao_final_nos_aquestos">Participação Final nos Aquestos</option></select></div>}
                <div className="md:col-span-2 flex items-center"><input id={`declaresIncomeTax-${partner.id}`} type="checkbox" name="declaresIncomeTax" checked={qualificationData.declaresIncomeTax || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-accent" disabled={isReadOnly}/><label htmlFor={`declaresIncomeTax-${partner.id}`} className="ml-2 text-sm">Declaro Imposto de Renda</label></div>
            </div>
            {!isReadOnly && (
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onCancel} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg font-semibold text-xs hover:bg-gray-300">Cancelar</button>
                    <button type="button" onClick={handleSave} disabled={!isDirty} className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold text-sm hover:bg-brand-primary disabled:opacity-50">Salvar Dados</button>
                </div>
            )}
        </div>
    );
};


interface Phase1DiagnosticProps {
  project: Project;
  phase: Phase;
  userRole: UserRole;
  canEdit: boolean;
  onBackToDashboard: () => void;
  onUpdateData: (data: Partial<Phase1Data>) => void;
  onOpenChatWithQuestion: (question: string) => void;
  onCreateTask: (description: string) => void;
  isReadOnly?: boolean;
  users: User[];
  onUpdateUser: (userId: string, data: Partial<User>) => void;
  currentUser: User;
  onRemoveMember: (memberId: string) => void;
  onUpdateProject: (data: Partial<Project>) => void;
}

const Phase1Diagnostic: React.FC<Phase1DiagnosticProps> = ({ project, phase, userRole, canEdit, onBackToDashboard, onUpdateData, onOpenChatWithQuestion, isReadOnly, onCreateTask, users, onUpdateUser, currentUser, onRemoveMember, onUpdateProject }) => {
    
    const diagnosticData = phase.phase1Data || {};
    const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);
    
    const [isScheduling, setIsScheduling] = useState(false);
    const [meetingDate, setMeetingDate] = useState(diagnosticData.meetingDateTime ? new Date(diagnosticData.meetingDateTime).toISOString().split('T')[0] : '');
    const [meetingTime, setMeetingTime] = useState(diagnosticData.meetingDateTime ? new Date(diagnosticData.meetingDateTime).toTimeString().substring(0, 5) : '');
    const [meetingLink, setMeetingLink] = useState(diagnosticData.meetingLink || '');
    const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);

    const allMembers = users.filter(u => project.clientIds.includes(u.id));
    const partners = allMembers.filter(u => u.clientType === 'partner');
    const allPartnersDataComplete = partners.every(isPartnerDataComplete);

    const availableAuxiliaries = users.filter(u => u.role === UserRole.AUXILIARY);
    const consultant = users.find(u => u.id === project.consultantId);

    const handleFormSubmit = (data: Omit<Phase1Data, 'isFormCompleted' | 'meetingScheduled' | 'meetingDateTime' | 'diagnosticSummary' | 'objectives' | 'consultantChecklist' | 'meetingLink' | 'meetingMinutes' >) => {
        onUpdateData({ ...data, isFormCompleted: true });
    };
    
    const handleScheduleMeeting = () => {
        if (!meetingDate || !meetingTime) {
            alert("Por favor, preencha a data e a hora da reunião.");
            return;
        }
        const dateTime = new Date(`${meetingDate}T${meetingTime}`).toISOString();
        onUpdateData({
            meetingScheduled: true,
            meetingDateTime: dateTime,
            meetingLink: meetingLink
        });
        setIsScheduling(false);
    };

    const handleSavePartnerData = (userId: string, data: Partial<User>) => {
        onUpdateUser(userId, data);
        setEditingPartnerId(null);
    };

    const handleAuxiliaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newAuxiliaryId = e.target.value;
        onUpdateProject({ auxiliaryId: newAuxiliaryId === 'none' ? undefined : newAuxiliaryId });
    };

    // Corrected read-only logic for the form section
    const isFormSectionReadOnly = canEdit 
        ? isReadOnly 
        : (isReadOnly || !!diagnosticData.isFormCompleted);

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                <button onClick={onBackToDashboard} className="flex items-center text-sm font-medium text-brand-secondary hover:text-brand-primary mb-6">
                    <Icon name="arrow-right" className="w-4 h-4 mr-2 transform rotate-180" />
                    Voltar para o Dashboard
                </button>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h3 className="text-2xl font-bold text-brand-primary mb-2">{phase.id}. {phase.title}</h3>
                    <p className="text-gray-600 mb-8">{phase.description}</p>
                    
                    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8`}>
                        {/* Coluna Principal: Ações */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Passo 1: Verificação de Dados */}
                            <div className="p-4 border rounded-xl">
                                <StepIndicator number={1} title="Verificação de Dados dos Membros" isComplete={allPartnersDataComplete} isActive={!allPartnersDataComplete} />
                                {canEdit && (
                                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                                        <h4 className="font-semibold text-brand-dark mb-3">Equipe de Gestão</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-medium">Consultor Responsável</label>
                                                <p className="font-medium p-2 bg-gray-200 rounded-md text-sm">{consultant?.name || 'Não definido'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium">Auxiliar de Serviços</label>
                                                <select value={project.auxiliaryId || 'none'} onChange={handleAuxiliaryChange} className="w-full mt-1 text-sm rounded-md border-gray-300" disabled={isReadOnly}>
                                                    <option value="none">Nenhum</option>
                                                    {availableAuxiliaries.map(aux => (
                                                        <option key={aux.id} value={aux.id}>{aux.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4 space-y-3">
                                    {allMembers.map(member => {
                                        const isPartner = member.clientType === 'partner';
                                        const isComplete = isPartner ? isPartnerDataComplete(member) : true;
                                        const isEditing = editingPartnerId === member.id;

                                        return (
                                            <div key={member.id}>
                                                <div className="p-3 bg-gray-50 border rounded-lg flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <Icon name={isComplete ? "check" : "pending"} className={`w-5 h-5 mr-3 ${isComplete ? 'text-green-500' : 'text-yellow-500'}`} />
                                                        <span className="font-medium">{member.name}</span>
                                                        {!isPartner && <span className="text-xs text-gray-500 ml-2 font-normal">(Interessado)</span>}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        {isPartner && (
                                                            <button onClick={() => setEditingPartnerId(isEditing ? null : member.id)} className="text-sm font-semibold text-brand-secondary hover:underline disabled:text-gray-400 disabled:cursor-not-allowed" disabled={isReadOnly && !canEdit}>
                                                                {isEditing ? 'Fechar' : 'Editar / Ver Dados'}
                                                            </button>
                                                        )}
                                                        {canEdit && !isReadOnly && (
                                                            <button 
                                                                onClick={() => {
                                                                    if (window.confirm(`Tem certeza que deseja remover "${member.name}" do projeto?`)) {
                                                                        onRemoveMember(member.id);
                                                                    }
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-red-600"
                                                                title="Remover membro do projeto"
                                                            >
                                                                <Icon name="trash" className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {isEditing && isPartner && (
                                                    <PartnerDataForm partner={member} onSave={handleSavePartnerData} onCancel={() => setEditingPartnerId(null)} isReadOnly={isReadOnly && !canEdit && currentUser.id !== member.id} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Passo 2: Pré-Diagnóstico */}
                            <div className={`p-4 border rounded-xl ${!allPartnersDataComplete && !canEdit ? 'opacity-50 pointer-events-none' : ''}`}>
                                <StepIndicator 
                                    number={2} 
                                    title="Preencher Pré-Diagnóstico" 
                                    isComplete={!!diagnosticData.isFormCompleted} 
                                    isActive={(allPartnersDataComplete || canEdit) && !diagnosticData.isFormCompleted} 
                                />
                                {(allPartnersDataComplete || canEdit) ? (
                                    <FormSection 
                                        onFormSubmit={handleFormSubmit} 
                                        isReadOnly={isFormSectionReadOnly} 
                                        initialData={diagnosticData} 
                                    />
                                ) : (
                                    <div className="mt-4 p-3 bg-gray-100 text-gray-700 rounded-md">
                                        <p className="text-sm text-center">O pré-diagnóstico estará disponível após todos os sócios completarem seus dados na etapa 1.</p>
                                    </div>
                                )}
                            </div>


                            {/* Passo 3: Agendamento */}
                            <div className={`p-4 border rounded-xl ${!diagnosticData.isFormCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
                                 <StepIndicator number={3} title="Reunião de Diagnóstico" isComplete={!!diagnosticData.meetingScheduled} isActive={!!diagnosticData.isFormCompleted && !diagnosticData.meetingScheduled} />
                                 {diagnosticData.isFormCompleted && (
                                    diagnosticData.meetingScheduled && !isScheduling ? (
                                        <div className="mt-4 p-3 bg-blue-50 text-blue-800 border-l-4 border-blue-400">
                                            <p className="font-semibold">Reunião agendada!</p>
                                            <p className="text-sm">Data: {new Date(diagnosticData.meetingDateTime!).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                            {diagnosticData.meetingLink && <a href={diagnosticData.meetingLink} target="_blank" rel="noreferrer" className="text-sm font-bold hover:underline">Acessar link da chamada</a>}
                                            {canEdit && !isReadOnly && (
                                                <button onClick={() => setIsScheduling(true)} className="text-xs font-semibold mt-2 px-2 py-1 bg-white border border-blue-400 rounded-md hover:bg-blue-100">Editar Agendamento</button>
                                            )}
                                        </div>
                                    ) : canEdit && !isReadOnly ? (
                                        <div className="mt-4 space-y-3 animate-fade-in-up">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs font-medium">Data</label>
                                                    <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full text-sm rounded-md border-gray-300" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium">Hora</label>
                                                    <input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} className="w-full text-sm rounded-md border-gray-300" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium">Link da Chamada (Opcional)</label>
                                                <input type="url" placeholder="https://meet.google.com/..." value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} className="w-full text-sm rounded-md border-gray-300" />
                                            </div>
                                            <div className="flex justify-end space-x-2">
                                                {isScheduling && <button type="button" onClick={() => setIsScheduling(false)} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg font-semibold text-xs hover:bg-gray-300">Cancelar</button>}
                                                <button type="button" onClick={handleScheduleMeeting} className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold text-sm hover:bg-brand-primary">
                                                    {isScheduling ? 'Salvar Alterações' : 'Agendar Reunião'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 p-3 bg-gray-100 text-gray-700 rounded-md">
                                            <p className="text-sm text-center">Aguardando o agendamento da reunião pelo seu consultor.</p>
                                        </div>
                                    )
                                 )}
                            </div>
                            
                            {/* Passo 4: Ata da Reunião */}
                             <div className={`p-4 border rounded-xl ${!diagnosticData.meetingScheduled ? 'opacity-50 pointer-events-none' : ''}`}>
                                <StepIndicator number={4} title="Ata da Reunião" isComplete={!!diagnosticData.meetingMinutes} isActive={!!diagnosticData.meetingScheduled && !diagnosticData.meetingMinutes} />
                                 {diagnosticData.meetingScheduled && (
                                    <div className="mt-4">
                                        {diagnosticData.meetingMinutes ? (
                                            <div className="p-4 bg-gray-50 border rounded-md max-h-60 overflow-y-auto">
                                                <h5 className="font-semibold mb-2 text-gray-800">Ata da Reunião:</h5>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{diagnosticData.meetingMinutes}</p>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-gray-100 text-gray-700 rounded-md">
                                                <p className="text-sm text-center">A ata da reunião será disponibilizada aqui pelo seu consultor após o encontro.</p>
                                            </div>
                                        )}
                                        {canEdit && !isReadOnly && (
                                            <button onClick={() => setIsMinutesModalOpen(true)} className="w-full mt-3 text-sm p-2 bg-white border rounded-md hover:bg-gray-100 font-semibold text-brand-secondary">
                                                {diagnosticData.meetingMinutes ? 'Editar Ata' : 'Adicionar Ata da Reunião'}
                                            </button>
                                        )}
                                    </div>
                                 )}
                             </div>
                        </div>

                        {/* Coluna Lateral: Ajuda e Visão do Consultor */}
                        <div className="space-y-6">
                            {canEdit && (
                                <AIAnalysisSection
                                    phaseData={diagnosticData}
                                    onUpdateData={onUpdateData}
                                    onCreateTask={onCreateTask}
                                />
                            )}
                            <div className="p-6 bg-gray-50 rounded-xl border">
                                <h4 className="font-semibold text-lg text-brand-dark mb-3">Ajuda Rápida com IA</h4>
                                <p className="text-sm text-gray-500 mb-4">Tire suas dúvidas sobre o preenchimento com nossa IA.</p>
                                <div className="space-y-2">
                                    {AI_SUGGESTIONS.map(q => (
                                        <button key={q} onClick={() => onOpenChatWithQuestion(q)} className="w-full text-left text-sm p-3 bg-white border rounded-md hover:bg-gray-100">{q}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isMinutesModalOpen && <MeetingMinutesModal initialMinutes={diagnosticData.meetingMinutes || ''} onSave={(minutes) => { onUpdateData({ meetingMinutes: minutes }); setIsMinutesModalOpen(false); }} onClose={() => setIsMinutesModalOpen(false)} />}
        </>
    );
};
export default Phase1Diagnostic;
