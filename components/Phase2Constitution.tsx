import React, { useState, useMemo } from 'react';
import { Phase, Phase2Data, UserRole, Project, User, NewClientData, PartnerDataForPhase2, Document as DocType, PartnerQualificationData, UserDocument } from '../types';
import Icon from './Icon';
import Modal from './Modal';


const PartnerDataDisplay: React.FC<{ partner: User }> = ({ partner }) => {
    if (!partner.qualificationData) {
        return <p>Dados de qualificação não disponíveis.</p>;
    }
    const q = partner.qualificationData;
    const dataPairs = [
        { label: 'CPF', value: q.cpf },
        { label: 'RG', value: q.rg },
        { label: 'Data de Nascimento', value: q.birthDate ? new Date(q.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '' },
        { label: 'Nacionalidade', value: q.nationality },
        { label: 'Estado Civil', value: q.maritalStatus },
        { label: 'Regime de Bens', value: (q.maritalStatus === 'casado' || q.maritalStatus === 'uniao_estavel') ? q.propertyRegime : 'N/A' },
        { label: 'Endereço', value: q.address },
        { label: 'Telefone', value: q.phone },
        { label: 'Declara Imposto de Renda?', value: q.declaresIncomeTax ? 'Sim' : 'Não' },
    ];

    const documents = partner.documents || [];

    return (
        <div>
            <dl className="divide-y divide-gray-200">
                {dataPairs.map(item => (
                    <div key={item.label} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                        <dt className="text-sm font-medium text-gray-500">{item.label}</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{item.value || 'Não informado'}</dd>
                    </div>
                ))}
            </dl>
            
            {documents.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                    <h3 className="text-lg font-semibold text-brand-dark mb-3">Documentos Anexados</h3>
                    <ul className="space-y-2">
                        {documents.map(doc => (
                             <li key={doc.id} className="flex items-center p-2 bg-gray-50 rounded-md border">
                                <Icon name="file-pdf" className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-secondary hover:underline">
                                    {doc.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const ConsultantActionsPanel: React.FC<{
    onUpdateData: (data: Partial<Phase2Data>) => void;
    phaseData: Phase2Data;
    currentUser: User;
    isReadOnly?: boolean;
}> = ({ onUpdateData, phaseData, currentUser, isReadOnly }) => {

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: 'contract' | 'cnpj') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const newDoc: DocType = {
            id: `doc-${docType}-${Date.now()}`,
            name: file.name,
            url: URL.createObjectURL(file),
            type: 'pdf',
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser.name,
            phaseId: 2,
            version: 1,
            status: 'active',
        };

        const updatedDocuments = {
            ...phaseData.documents,
            [docType]: newDoc,
        };
        
        const hasContract = !!updatedDocuments.contract;
        const hasCnpj = !!updatedDocuments.cnpj;
        
        let newProcessStatus = phaseData.processStatus;
        if (hasContract && hasCnpj) {
            newProcessStatus = 'completed';
        }

        onUpdateData({ ...phaseData, documents: updatedDocuments, processStatus: newProcessStatus });
    };

    return (
        <div className="p-6 bg-blue-50/50 border border-blue-200 rounded-lg mt-8">
            <h4 className="font-semibold text-lg text-brand-dark mb-4">Painel do Consultor/Auxiliar</h4>
            <p className="text-sm text-gray-600 mb-4">Após elaborar os documentos da empresa, anexe-os abaixo para que o cliente possa visualizá-los e para que o projeto possa ser aprovado.</p>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">Contrato Social Final (.pdf)</label>
                    <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'contract')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" disabled={isReadOnly} />
                </div>
                 <div>
                    <label className="text-sm font-medium text-gray-700">Cartão CNPJ (.pdf)</label>
                    <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'cnpj')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" disabled={isReadOnly} />
                </div>
            </div>
        </div>
    );
};

// ... (previous imports)

// FIX: Renamed to avoid conflict with the component export.
interface Phase2ConstitutionProps {
  phase: Phase;
  project: Project;
  currentUser: User;
  users: User[];
  canEdit: boolean;
  onBackToDashboard: () => void;
  onUpdateData: (data: Partial<Phase2Data>) => void;
  isReadOnly?: boolean;
  onRemoveMember: (memberId: string) => void;
  availableClients: User[];
  onCreateAndAddMember: (newClientData: NewClientData) => void;
  onAddExistingMember: (userId: string, clientType: 'partner' | 'interested') => void;
}

// FIX: This component must be exported to be used in ProjectDetailView.
export const Phase2Constitution: React.FC<Phase2ConstitutionProps> = ({ phase, project, currentUser, users, canEdit, onBackToDashboard, onUpdateData, isReadOnly, onRemoveMember, availableClients, onCreateAndAddMember, onAddExistingMember }) => {

    const phaseData = useMemo(() => {
        const defaultData: Phase2Data = {
            companyData: { name: '', capital: '', type: '', address: '', cnaes: '' },
            partners: [],
            documents: {},
            status: 'pending_client',
            processStatus: 'pending_start',
        };
        return { ...defaultData, ...(phase.phase2Data || {}) };
    }, [phase.phase2Data]);

    const [isDataModalOpen, setIsDataModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<User | null>(null);

    const isClientView = !canEdit;

    const handleDataChange = (field: keyof Phase2Data['companyData'], value: string | number) => {
        const updatedCompanyData = { ...phaseData.companyData, [field]: value };
        onUpdateData({ ...phaseData, companyData: updatedCompanyData });
    };

    const handlePartnerChange = (userId: string, field: keyof PartnerDataForPhase2, value: any) => {
        const updatedPartners = phaseData.partners.map(p => {
            if (p.userId === userId) {
                return { ...p, [field]: value };
            }
            return p;
        });
        onUpdateData({ ...phaseData, partners: updatedPartners });
    };
    
    const handleViewPartnerData = (partnerUserId: string) => {
        const partner = users.find(u => u.id === partnerUserId);
        if(partner) {
            setSelectedPartner(partner);
            setIsDataModalOpen(true);
        }
    };
    
    // FIX: Define the missing `handleSubmitForReview` function.
    const handleSubmitForReview = () => {
        if (window.confirm("Tem certeza que deseja enviar estes dados para o consultor? Após o envio, os campos não poderão ser editados.")) {
            onUpdateData({ ...phaseData, status: 'pending_consultant_review' });
        }
    };

    const isFormReadOnly = isReadOnly || (isClientView && phaseData.status === 'approved');

    return (
        <div className="p-4 sm:p-6 lg:p-8">
             <Modal isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)} title={`Dados de ${selectedPartner?.name}`}>
                {selectedPartner && <PartnerDataDisplay partner={selectedPartner} />}
            </Modal>
            
            <button onClick={onBackToDashboard} className="flex items-center text-sm font-medium text-brand-secondary hover:text-brand-primary mb-6">
                <Icon name="arrow-right" className="w-4 h-4 mr-2 transform rotate-180" />
                Voltar
            </button>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h3 className="text-2xl font-bold text-brand-primary mb-2">{phase.id}. {phase.title}</h3>
                <p className="text-gray-600 mb-8">{phase.description}</p>
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                    <div className="p-4 border rounded-xl">
                        <h4 className="font-semibold text-lg text-brand-dark mb-4">Dados da Empresa</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium">Nome / Razão Social</label>
                                <input
                                    type="text"
                                    value={phaseData.companyData.name || ''}
                                    onChange={(e) => handleDataChange('name', e.target.value)}
                                    className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900"
                                    disabled={isFormReadOnly}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Capital Social (R$)</label>
                                <input
                                    type="number"
                                    value={phaseData.companyData.capital ?? ''}
                                    onChange={(e) => handleDataChange('capital', e.target.value === '' ? '' : Number(e.target.value))}
                                    className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900"
                                    disabled={isFormReadOnly}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Tipo Societário</label>
                                <select
                                    value={phaseData.companyData.type || ''}
                                    onChange={(e) => handleDataChange('type', e.target.value)}
                                    className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900"
                                    disabled={isFormReadOnly}
                                >
                                    <option value="">Selecione</option>
                                    <option value="LTDA">LTDA</option>
                                    <option value="S/A">S/A</option>
                                    <option value="SLU">SLU</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium">Endereço da Sede</label>
                                <input
                                    type="text"
                                    value={phaseData.companyData.address || ''}
                                    onChange={(e) => handleDataChange('address', e.target.value)}
                                    className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900"
                                    disabled={isFormReadOnly}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium">CNAEs (principal e secundários)</label>
                                <input
                                    type="text"
                                    value={phaseData.companyData.cnaes || ''}
                                    onChange={(e) => handleDataChange('cnaes', e.target.value)}
                                    className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900"
                                    disabled={isFormReadOnly}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border rounded-xl">
                        <h4 className="font-semibold text-lg text-brand-dark mb-4">Quadro Societário</h4>
                        <div className="space-y-3">
                            {phaseData.partners.map((partner) => (
                                <div key={partner.userId} className="p-3 border rounded-lg bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div className="flex-grow mb-2 md:mb-0">
                                        <p className="font-semibold">{partner.name}</p>
                                        <button onClick={() => handleViewPartnerData(partner.userId)} className="text-xs text-blue-600 hover:underline">Ver dados completos</button>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-32">
                                            <label className="text-xs">Participação (%)</label>
                                            <input type="number" value={partner.participation ?? ''} onChange={(e) => handlePartnerChange(partner.userId, 'participation', e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-sm rounded-md border border-gray-300" disabled={isFormReadOnly} />
                                        </div>
                                        <div className="flex items-center pt-4">
                                            <input type="checkbox" id={`admin-${partner.userId}`} checked={partner.isAdministrator} onChange={(e) => handlePartnerChange(partner.userId, 'isAdministrator', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-accent" disabled={isFormReadOnly} />
                                            <label htmlFor={`admin-${partner.userId}`} className="ml-2 text-sm">Admin?</label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {canEdit && (
                        <ConsultantActionsPanel
                            onUpdateData={onUpdateData}
                            phaseData={phaseData}
                            currentUser={currentUser}
                            isReadOnly={isReadOnly}
                        />
                    )}

                    {phaseData.status === 'pending_client' && !canEdit && !isReadOnly && (
                        <div className="pt-6 border-t">
                            <button
                                type="button"
                                onClick={handleSubmitForReview}
                                className="w-full px-6 py-3 bg-brand-accent text-brand-dark rounded-lg font-semibold hover:opacity-90 flex items-center justify-center text-base"
                            >
                                <Icon name="send" className="w-5 h-5 mr-2" />
                                Enviar Dados para Constituição
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};
