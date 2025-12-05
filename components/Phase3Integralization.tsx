import React, { useState, useMemo, useEffect } from 'react';
import { Phase, Phase3Data, PartnerData, UserRole, Asset, Document as DocType, User } from '../types';
import Icon from './Icon';

const AI_SUGGESTIONS = [
    "O que é matrícula do imóvel?",
    "Como pego a certidão atualizada?",
    "É possível integralizar um imóvel com financiamento?",
    "Qual a diferença entre integralização e doação de quotas?",
];

const AssetForm: React.FC<{
    partners: PartnerData[];
    onSave: (asset: Omit<Asset, 'id' | 'status'>, documentFile?: File | null) => void;
    onCancel: () => void;
    isConsultant: boolean;
}> = ({ partners, onSave, onCancel, isConsultant }) => {
    
    const [type, setType] = useState<Asset['type']>('property');
    const [ownerPartnerId, setOwnerPartnerId] = useState('');
    const [description, setDescription] = useState('');
    const [value, setValue] = useState<number | ''>('');
    const [marketValue, setMarketValue] = useState<number | ''>('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ownerPartnerId || !description || value === '') {
            alert('Sócio, Descrição e Valor são obrigatórios.');
            return;
        }
        if (type !== 'cash' && !documentFile) {
            alert('O documento comprobatório é obrigatório para este tipo de bem.');
            return;
        }
        const newAsset: Omit<Asset, 'id' | 'status'> = { 
            type, ownerPartnerId, description, value, documentId: '' 
        };
        if (marketValue !== '') {
            (newAsset as any).marketValue = marketValue;
        }
        onSave(newAsset, documentFile);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border rounded-lg space-y-4 mb-6 animate-fade-in-up">
            <h4 className="font-semibold text-lg text-brand-dark">Adicionar Novo Bem Documentado</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs">Sócio Proprietário</label><select value={ownerPartnerId} onChange={e => setOwnerPartnerId(e.target.value)} className="w-full text-sm rounded-md border-gray-300"><option value="">Selecione</option>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label className="text-xs">Tipo de Bem</label><select value={type} onChange={e => setType(e.target.value as Asset['type'])} className="w-full text-sm rounded-md border-gray-300"><option value="property">Imóvel</option><option value="vehicle">Veículo</option><option value="other">Outro</option></select></div>
                <div className="md:col-span-2"><label className="text-xs">Descrição Simples</label><input type="text" placeholder="Ex: Apto Leblon, Toyota Hilux 2023" value={description} onChange={e => setDescription(e.target.value)} className="w-full text-sm rounded-md border-gray-300" /></div>
                <div><label className="text-xs">Valor de Integralização (R$) (Histórico do IR)</label><input type="number" placeholder="Valor declarado no IR" value={value} onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-sm rounded-md border-gray-300" /></div>
                <div>
                    <label className="text-xs">Valor de Mercado (R$)</label>
                    <input type="number" placeholder="Valor de avaliação atual" value={marketValue} onChange={e => setMarketValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-sm rounded-md border-gray-300" />
                </div>
                <div><label className="text-xs">Documento (Certidão, CRLV, etc.)</label><input type="file" onChange={e => setDocumentFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold text-sm hover:bg-brand-primary">Salvar Bem</button>
            </div>
        </form>
    );
};

const AssetEditForm: React.FC<{
    assetToEdit: Asset;
    partners: PartnerData[];
    onSave: (asset: Asset) => void;
    onCancel: () => void;
    isConsultant: boolean;
    phaseStatus?: Phase3Data['status'];
}> = ({ assetToEdit, partners, onSave, onCancel, isConsultant, phaseStatus }) => {
    const [formData, setFormData] = useState(assetToEdit);

    useEffect(() => {
        setFormData(assetToEdit);
    }, [assetToEdit]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: (name === 'value' || name === 'marketValue') && value !== '' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const isClient = !isConsultant;
    // Client can edit all fields only when phase is pending for them.
    const canClientEditAllFields = isClient && phaseStatus === 'pending_client';
    // Consultant can always edit all fields.
    const canConsultantEditAllFields = isConsultant;

    // A client can't edit description/value after submitting.
    const isDescriptionDisabled = !canConsultantEditAllFields && !canClientEditAllFields;
    const isValueDisabled = !canConsultantEditAllFields && !canClientEditAllFields;
    // Client can edit market value, unless consultant has validated the asset.
    const isMarketValueDisabled = isClient && assetToEdit.status === 'validado';

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-fade-in-up">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-brand-primary">Editar Bem</h3>
              <button type="button" onClick={onCancel}><Icon name="close" className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs">Descrição Simples</label>
                <input type="text" name="description" value={formData.description || ''} onChange={handleChange} className="w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isDescriptionDisabled}/>
              </div>
              <div>
                <label className="text-xs">Valor de Integralização (R$) (Histórico do IR)</label>
                <input type="number" name="value" value={formData.value ?? ''} onChange={handleChange} className="w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isValueDisabled} />
              </div>
              <div>
                <label className="text-xs">Valor de Mercado (R$)</label>
                <input type="number" name="marketValue" placeholder="Valor de avaliação atual" value={formData.marketValue || ''} onChange={handleChange} className="w-full text-sm rounded-md border-gray-300 disabled:bg-gray-100" disabled={isMarketValueDisabled} />
              </div>
              {isConsultant && (
                  <div>
                    <label className="text-xs">Observações do Consultor</label>
                    <textarea name="consultantObservations" value={formData.consultantObservations || ''} onChange={handleChange} rows={2} className="w-full text-sm rounded-md border-gray-300" />
                  </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 flex justify-end space-x-3">
              <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold">Salvar Alterações</button>
            </div>
          </form>
        </div>
    );
};

const CashAssetForm: React.FC<{
    partners: PartnerData[];
    ownerId: string;
    isConsultant: boolean;
    onSave: (asset: Omit<Asset, 'id' | 'status'>) => void;
    onCancel: () => void;
}> = ({ partners, ownerId, isConsultant, onSave, onCancel }) => {
    const [value, setValue] = useState<number | ''>('');
    const [selectedOwner, setSelectedOwner] = useState(ownerId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value === '' || !selectedOwner) {
            alert('Sócio e Valor são obrigatórios.');
            return;
        }
        onSave({
            type: 'cash',
            ownerPartnerId: selectedOwner,
            description: 'Recursos Financeiros',
            value: value,
        });
    };
    
    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border rounded-lg space-y-4 mb-6 animate-fade-in-up">
            <h4 className="font-semibold text-lg text-brand-dark">Adicionar Valor em Dinheiro</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isConsultant && (
                    <div>
                        <label className="text-xs">Sócio</label>
                        <select value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)} className="w-full text-sm rounded-md border-gray-300">
                            <option value="">Selecione o Sócio</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className="text-xs">Valor a Integralizar (R$)</label>
                    <input type="number" placeholder="Ex: 50000" value={value} onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-sm rounded-md border-gray-300" />
                </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold text-sm hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-secondary text-white rounded-lg font-semibold text-sm hover:bg-brand-primary">Adicionar Valor</button>
            </div>
        </form>
    );
};


interface Phase3IntegralizationProps {
  phase: Phase;
  partners: PartnerData[];
  declaredCapital: number;
  userRole: UserRole;
  currentUser: User;
  canEdit: boolean;
  onBackToDashboard: () => void;
  onUpdateData: (data: Partial<Phase3Data>) => void;
  onOpenChatWithQuestion: (question: string) => void;
  isReadOnly?: boolean;
}

const Phase3Integralization: React.FC<Phase3IntegralizationProps> = ({ phase, partners, declaredCapital, userRole, currentUser, canEdit, onBackToDashboard, onUpdateData, onOpenChatWithQuestion, isReadOnly }) => {
    const phaseData = useMemo(() => ({
        assets: [],
        documents: [],
        status: 'pending_client' as const,
        ...phase.phase3Data
    }), [phase.phase3Data]);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isCashFormVisible, setIsCashFormVisible] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    
    const canClientSubmit = userRole === UserRole.CLIENT && phaseData.status === 'pending_client';
    const userCanSubmit = canEdit || canClientSubmit;

    const totalIntegralizedValue = useMemo(() => phaseData.assets.reduce((sum, p) => sum + (Number(p.value) || 0), 0), [phaseData.assets]);
    const totalMarketValue = useMemo(() => phaseData.assets.reduce((sum, p) => sum + (Number(p.marketValue) || 0), 0), [phaseData.assets]);
    const progress = declaredCapital > 0 ? (totalIntegralizedValue / declaredCapital) * 100 : 0;
    
    const handleSaveAsset = (assetData: Omit<Asset, 'id' | 'status'>, documentFile?: File | null) => {
        let newDoc: DocType | null = null;
        let newDocId: string | undefined = undefined;
        const updatedDocuments = [...phaseData.documents];

        if (documentFile) {
            newDoc = {
                id: `doc-asset-${Date.now()}`,
                name: documentFile.name,
                url: URL.createObjectURL(documentFile),
                type: 'pdf', // Assuming pdf for now
                uploadedAt: new Date().toISOString(),
                uploadedBy: partners.find(p => p.id === assetData.ownerPartnerId)?.name || 'Cliente',
                phaseId: 3,
                version: 1,
                status: 'active',
            };
            newDocId = newDoc.id;
            updatedDocuments.push(newDoc);
        }

        const newAsset: Asset = {
            ...assetData,
            id: `asset-${Date.now()}`,
            status: 'pendente',
            documentId: newDocId,
        };

        onUpdateData({
            ...phaseData,
            assets: [...phaseData.assets, newAsset],
            documents: updatedDocuments
        });
        setIsFormVisible(false);
    };
    
    const handleSaveCashAsset = (assetData: Omit<Asset, 'id' | 'status'>) => {
        const newAsset: Asset = {
            ...assetData,
            id: `asset-cash-${Date.now()}`,
            status: 'pendente',
        };
        onUpdateData({
            ...phaseData,
            assets: [...phaseData.assets, newAsset],
        });
        setIsCashFormVisible(false);
    };

    const handleUpdateAsset = (updatedAsset: Asset) => {
        const updatedAssets = phaseData.assets.map(a => a.id === updatedAsset.id ? updatedAsset : a);
        onUpdateData({ ...phaseData, assets: updatedAssets });
        setEditingAsset(null);
    };

    const handleRemoveAsset = (assetId: string) => {
        if (window.confirm("Tem certeza que deseja remover este bem?")) {
            const assetToRemove = phaseData.assets.find(a => a.id === assetId);
            const updatedAssets = phaseData.assets.filter(a => a.id !== assetId);
            const updatedDocuments = phaseData.documents.filter(d => d.id !== assetToRemove?.documentId);
            onUpdateData({ ...phaseData, assets: updatedAssets, documents: updatedDocuments });
        }
    };
    
    const handleSubmitForReview = () => {
        onUpdateData({ ...phaseData, status: 'pending_consultant_review' });
    };

    const getStatusChip = (status: Asset['status']) => {
        const statuses = { pendente: 'yellow', em_correcao: 'red', validado: 'blue' };
        const color = statuses[status] || 'gray';
        return <span className={`text-xs font-medium text-${color}-800 bg-${color}-100 px-2 py-1 rounded-full`}>{status.replace('_', ' ')}</span>;
    };

    const isConsultant = userRole !== UserRole.CLIENT;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {editingAsset && (
                <AssetEditForm 
                    assetToEdit={editingAsset}
                    partners={partners}
                    onSave={handleUpdateAsset}
                    onCancel={() => setEditingAsset(null)}
                    isConsultant={isConsultant}
                    phaseStatus={phaseData.status}
                />
            )}
            <button onClick={onBackToDashboard} className="flex items-center text-sm font-medium text-brand-secondary hover:text-brand-primary mb-6"><Icon name="arrow-right" className="w-4 h-4 mr-2 transform rotate-180" />Voltar</button>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h3 className="text-2xl font-bold text-brand-primary mb-2">{phase.id}. {phase.title}</h3>
                <p className="text-gray-600 mb-6">{phase.description}</p>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-4 border rounded-xl"><h4 className="font-semibold text-lg text-brand-dark mb-3">Resumo da Integralização</h4><div className="space-y-2"><p><strong>Capital Social Declarado:</strong> {declaredCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><p><strong>Total em Bens Adicionados:</strong> {totalIntegralizedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>{(isConsultant || totalMarketValue > 0) && <p className="text-sm"><strong>Valor de Mercado dos Bens:</strong> {totalMarketValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}<div><div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-brand-accent h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div></div><p className="text-sm text-right font-medium text-brand-secondary mt-1">{progress.toFixed(0)}% do capital integralizado</p></div></div></div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-4"><h4 className="font-semibold text-lg text-brand-dark">Bens para Integralização</h4></div>
                             {!isFormVisible && !isCashFormVisible && userCanSubmit && !isReadOnly && (
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                    <button onClick={() => setIsFormVisible(true)} className="w-full flex items-center justify-center p-3 border-2 border-dashed rounded-lg text-sm hover:bg-gray-100 text-brand-secondary font-semibold">
                                        <Icon name="plus" className="w-5 h-5 mr-2" /> Adicionar Bem (Imóvel, Veículo, etc.)
                                    </button>
                                     <button onClick={() => setIsCashFormVisible(true)} className="w-full flex items-center justify-center p-3 border-2 border-dashed rounded-lg text-sm hover:bg-gray-100 text-brand-secondary font-semibold">
                                        <Icon name="plus" className="w-5 h-5 mr-2" /> Adicionar Dinheiro
                                    </button>
                                </div>
                            )}
                            
                            {isFormVisible && <AssetForm partners={partners} onSave={handleSaveAsset} onCancel={() => setIsFormVisible(false)} isConsultant={isConsultant} />}
                            {isCashFormVisible && <CashAssetForm partners={partners} ownerId={currentUser.id} isConsultant={isConsultant} onSave={handleSaveCashAsset} onCancel={() => setIsCashFormVisible(false)} />}

                            <div className="space-y-3 mt-4">
                                {phaseData.assets.length > 0 ? phaseData.assets.map(asset => {
                                    const doc = phaseData.documents.find(d => d.id === asset.documentId);
                                    
                                    const clientCanEditThisAsset = userRole === UserRole.CLIENT && asset.status !== 'validado';
                                    const consultantCanEditThisAsset = canEdit && !isReadOnly;
                                    const userCanEditThisAsset = clientCanEditThisAsset || consultantCanEditThisAsset;

                                    return (
                                        <div key={asset.id} className="p-3 border rounded-lg">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-grow">
                                                    <p className="font-semibold">{asset.description}</p>
                                                    <div className="mt-1 space-y-1 text-sm">
                                                        <p className="text-gray-600">
                                                            <span className="font-medium">Valor (IR):</span> {Number(asset.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </p>
                                                        <p className="text-gray-600 flex items-center">
                                                            <span className="font-medium">Valor de Mercado:</span>
                                                            {asset.marketValue != null && asset.marketValue !== '' ?
                                                                <span className="ml-1">{Number(asset.marketValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                :
                                                                (userCanEditThisAsset ?
                                                                    <button onClick={() => setEditingAsset(asset)} className="ml-1 text-blue-600 hover:underline text-xs font-semibold">(Adicionar)</button>
                                                                    :
                                                                    <span className="ml-1 text-gray-400 italic">Não informado</span>
                                                                )
                                                            }
                                                        </p>
                                                        <p className="text-gray-500">
                                                            <span className="font-medium">Sócio:</span> {partners.find(p => p.id === asset.ownerPartnerId)?.name || 'N/D'}
                                                        </p>
                                                    </div>
                                                    {doc && <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center mt-2"><Icon name="file-pdf" className="w-3 h-3 mr-1" />{doc.name}</a>}
                                                </div>
                                                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                                                    {getStatusChip(asset.status)}
                                                    <div className="flex items-center space-x-1">
                                                        {userCanEditThisAsset && <button onClick={() => setEditingAsset(asset)} className="p-1 text-gray-400 hover:text-blue-500" title="Editar"><Icon name="edit" className="w-4 h-4"/></button>}
                                                        {userCanSubmit && !isReadOnly && <button onClick={() => handleRemoveAsset(asset.id)} className="p-1 text-gray-400 hover:text-red-500" title="Remover"><Icon name="trash" className="w-4 h-4"/></button>}
                                                    </div>
                                                </div>
                                            </div>
                                            {asset.consultantObservations && <p className="text-sm mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-300"><strong>Consultor:</strong> {asset.consultantObservations}</p>}
                                        </div>
                                    )
                                }) : !isFormVisible && !isCashFormVisible && <div className="text-center p-6 border-2 border-dashed rounded-lg"><p className="text-sm text-gray-500">Nenhum bem adicionado. Clique em um dos botões acima para começar.</p></div>}
                            </div>
                        </div>
                        {userCanSubmit && !isReadOnly && phaseData.status === 'pending_client' && phaseData.assets.length > 0 && !isFormVisible && !isCashFormVisible && <div className="pt-6 border-t"><button onClick={handleSubmitForReview} className="w-full px-6 py-3 bg-brand-accent text-brand-dark rounded-lg font-semibold hover:opacity-90 flex items-center justify-center text-base"><Icon name="check" className="w-5 h-5 mr-2" />Enviar Bens para Análise</button></div>}
                    </div>
                    <div className="p-6 bg-gray-50 rounded-xl border h-fit"><h4 className="font-semibold text-lg text-brand-dark mb-3">Dúvidas?</h4><p className="text-sm text-gray-500 mb-4">Pergunte à nossa IA para entender melhor os termos e processos.</p><div className="space-y-2">{AI_SUGGESTIONS.map(q => (<button key={q} onClick={() => onOpenChatWithQuestion(q)} className="w-full text-left text-sm p-3 bg-white border rounded-md hover:bg-gray-100">{q}</button>))}</div></div>
                 </div>
            </div>
        </div>
    );
};

export default Phase3Integralization;
