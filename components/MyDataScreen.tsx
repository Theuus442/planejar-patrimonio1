import React, { useState, useEffect, useMemo } from 'react';
import { User, Project, PartnerQualificationData, UserDocumentCategory, UserDocument } from '../types';
import Icon from './Icon';

const AI_HELP_SUGGESTIONS = [
    "O que é regime de bens?",
    "Quais documentos são aceitos como comprovante de endereço?",
    "Por que preciso enviar meu Imposto de Renda?",
];

const DocumentSlot: React.FC<{
    label: string;
    doc: UserDocument | undefined;
    category: UserDocumentCategory;
    onUpload: (file: File, category: UserDocumentCategory, label: string) => void;
    onDelete: (docId: string) => void;
}> = ({ label, doc, category, onUpload, onDelete }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpload(file, category, label);
        }
    };

    return (
        <div>
            <label className="text-sm font-medium">{label}</label>
            {doc ? (
                <div className="flex items-center justify-between p-2 mt-1 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center text-sm text-green-800 font-medium">
                        <Icon name="check" className="w-4 h-4 mr-2" />
                        <a href={doc.url} target="_blank" rel="noreferrer" className="hover:underline">{doc.name}</a>
                    </div>
                    <button onClick={() => onDelete(doc.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Icon name="trash" className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            )}
        </div>
    );
};

const DataCompletionProgress: React.FC<{ user: User }> = ({ user }) => {
    const checklistItems = useMemo(() => {
        const items: { label: string; completed: boolean }[] = [];
        const q = user.qualificationData || {};
        const d = user.documents || [];

        items.push({ label: 'Dados Pessoais (CPF, RG, etc)', completed: !!(q.cpf && q.rg && q.birthDate && q.nationality && q.address) });
        items.push({ label: 'Estado Civil e Regime de Bens', completed: !!q.maritalStatus && ((q.maritalStatus !== 'casado' && q.maritalStatus !== 'uniao_estavel') || !!q.propertyRegime) });
        items.push({ label: 'Documento de Identidade', completed: d.some(doc => doc.category === 'identity') });
        items.push({ label: 'Comprovante de Endereço', completed: d.some(doc => doc.category === 'address') });
        
        if (q.maritalStatus === 'casado' || q.maritalStatus === 'uniao_estavel') {
            items.push({ label: 'Certidão de Casamento/U.E.', completed: d.some(doc => doc.category === 'marriage') });
        }
        if (q.declaresIncomeTax) {
            items.push({ label: 'Declaração de Imposto de Renda', completed: d.some(doc => doc.category === 'tax_return') });
        }
        
        return items;
    }, [user]);

    const completedCount = checklistItems.filter(item => item.completed).length;
    const totalCount = checklistItems.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;

    return (
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold text-brand-primary mb-4">Progresso do Cadastro</h2>
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-brand-dark">Checklist de Dados</span>
                <span className="text-sm font-bold text-brand-primary">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div className="bg-brand-accent h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {checklistItems.map(item => (
                    <div key={item.label} className="flex items-center text-sm">
                        <Icon name={item.completed ? 'check' : 'pending'} className={`w-5 h-5 mr-2 flex-shrink-0 ${item.completed ? 'text-green-500' : 'text-yellow-500'}`} />
                        <span className={item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}>{item.label}</span>
                    </div>
                ))}
            </div>
             {progress < 100 && <p className="text-center text-xs text-gray-500 mt-4 bg-gray-100 p-2 rounded-md">Preencha os campos e anexe os documentos abaixo para completar seu cadastro.</p>}
        </div>
    );
};

interface MyDataScreenProps {
  currentUser: User | null;
  projects: Project[];
  onUpdateUser: (userId: string, data: Partial<User>) => void;
  onUploadUserDocument: (userId: string, file: File, category: UserDocumentCategory, categoryLabel: string) => void;
  onDeleteUserDocument: (userId: string, docId: string) => void;
  onBack: () => void;
  onChangePassword: () => { success: boolean; message: string };
  onNavigateToTask: (projectId: string, phaseId: number) => void;
}

const MyDataScreen: React.FC<MyDataScreenProps> = ({ currentUser, onUpdateUser, onUploadUserDocument, onDeleteUserDocument, onBack }) => {
  if (!currentUser) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Carregando seus dados...</p>
      </div>
    );
  }

  const [userData, setUserData] = useState(currentUser);
  const [qualificationData, setQualificationData] = useState<PartnerQualificationData>(currentUser.qualificationData || {});
  
  const [infoMessage, setInfoMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setUserData(currentUser);
    setQualificationData(currentUser.qualificationData || {});
  }, [currentUser]);

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };
  
  const handleQualificationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const target = e.target as HTMLInputElement;
    const finalValue = isCheckbox ? target.checked : value;
    setQualificationData({ ...qualificationData, [name]: finalValue });
  };
  
  const handleUpdateUserInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(currentUser.id, { name: userData.name, qualificationData });
    setInfoMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
    const timeoutId = setTimeout(() => setInfoMessage({ type: '', text: '' }), 3000);
    return () => clearTimeout(timeoutId);
  };
  
  const handleUpload = (file: File, category: UserDocumentCategory, label: string) => {
    onUploadUserDocument(currentUser.id, file, category, label);
  };
  
  const handleDelete = (docId: string) => {
    onDeleteUserDocument(currentUser.id, docId);
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const newUrl = URL.createObjectURL(file);
        onUpdateUser(currentUser.id, { avatarUrl: newUrl });
        setInfoMessage({ type: 'success', text: 'Foto de perfil atualizada!' });
        setTimeout(() => setInfoMessage({ type: '', text: '' }), 3000);
    }
  };

  const canCompleteData = currentUser.clientType === 'partner' || currentUser.clientType === 'interested';
  const isMarried = qualificationData.maritalStatus === 'casado' || qualificationData.maritalStatus === 'uniao_estavel';
  
  const userDocs = currentUser.documents || [];

  const documentSlots: { label: string, category: UserDocumentCategory, condition: boolean }[] = [
      { label: 'Identificação (RG/CNH)', category: 'identity', condition: true },
      { label: 'Comprovante de Endereço', category: 'address', condition: true },
      { label: 'Certidão de Casamento/U.E.', category: 'marriage', condition: isMarried },
      { label: 'Última Declaração de IR Completa', category: 'tax_return', condition: !!qualificationData.declaresIncomeTax }
  ];
  
  const otherDocuments = userDocs.filter(d => d.category === 'other');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-secondary hover:text-brand-primary mb-6"><Icon name="arrow-right" className="w-4 h-4 mr-2 transform rotate-180" />Voltar</button>
      
      {canCompleteData && <DataCompletionProgress user={currentUser} />}

        <details className="border rounded-lg group bg-white shadow-lg" open>
            <summary className="p-4 cursor-pointer flex justify-between items-center font-semibold text-brand-dark hover:bg-gray-50 text-xl">
                <span>Meus Dados e Documentos</span>
                <Icon name="arrow-right" className="w-5 h-5 transition-transform transform group-open:rotate-90" />
            </summary>
            <form onSubmit={handleUpdateUserInfo} className="p-6 border-t">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold text-brand-dark mb-4">Informações Pessoais</h3>
                             <div className="flex items-center space-x-6 mb-6">
                                {currentUser.avatarUrl ? (
                                    <img src={currentUser.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                                        <Icon name="user-circle" className="w-16 h-16 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <input type="file" id="avatarUpload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                    <label htmlFor="avatarUpload" className="cursor-pointer text-sm font-medium text-brand-secondary hover:text-brand-primary bg-white border border-gray-300 px-3 py-2 rounded-md">
                                        Trocar foto
                                    </label>
                                    <p className="text-xs text-gray-500 mt-2">JPG, PNG ou GIF.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div><label className="text-sm font-medium">Nome Completo</label><input type="text" name="name" value={userData.name} onChange={handleUserChange} className="mt-1 w-full rounded-md border-gray-300"/></div>
                                <div><label className="text-sm font-medium">E-mail (não editável)</label><input type="email" value={currentUser.email} readOnly className="mt-1 w-full rounded-md border-gray-300 bg-gray-100"/></div>
                                <div><label className="text-sm font-medium">Telefone</label><input type="tel" name="phone" value={qualificationData.phone || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"/></div>
                            </div>
                        </div>

                        {canCompleteData && (
                            <div className="p-4 border rounded-lg">
                                <h3 className="text-lg font-semibold text-brand-dark mb-4">Dados de Qualificação</h3>
                                <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-sm">CPF</label><input type="text" name="cpf" value={qualificationData.cpf || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"/></div>
                                    <div><label className="text-sm">RG</label><input type="text" name="rg" value={qualificationData.rg || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"/></div>
                                    <div><label className="text-sm">Data de Nasc.</label><input type="date" name="birthDate" value={qualificationData.birthDate || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"/></div>
                                    <div><label className="text-sm">Nacionalidade</label><input type="text" name="nationality" value={qualificationData.nationality || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"/></div>
                                    <div className="md:col-span-2"><label className="text-sm">Endereço Completo</label><input type="text" name="address" value={qualificationData.address || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"/></div>
                                    <div><label className="text-sm">Estado Civil</label><select name="maritalStatus" value={qualificationData.maritalStatus || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"><option value="">Selecione</option><option value="solteiro">Solteiro(a)</option><option value="casado">Casado(a)</option><option value="uniao_estavel">União Estável</option><option value="divorciado">Divorciado(a)</option><option value="viuvo">Viúvo(a)</option></select></div>
                                    {isMarried && <div><label className="text-sm">Regime de Bens</label><select name="propertyRegime" value={qualificationData.propertyRegime || ''} onChange={handleQualificationChange} className="mt-1 w-full rounded-md border-gray-300"><option value="">Selecione</option><option value="comunhao_parcial">Comunhão Parcial</option><option value="comunhao_universal">Comunhão Universal</option><option value="separacao_total">Separação Total</option><option value="participacao_final_nos_aquestos">Participação Final nos Aquestos</option></select></div>}
                                    <div className="md:col-span-2 flex items-center"><input id="declaresIncomeTax" type="checkbox" name="declaresIncomeTax" checked={qualificationData.declaresIncomeTax || false} onChange={handleQualificationChange} className="h-4 w-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-accent"/><label htmlFor="declaresIncomeTax" className="ml-2 text-sm">Declaro Imposto de Renda</label></div>
                                </div>
                            </div>
                        )}
                         {infoMessage.text && <p className={`text-sm text-center font-semibold ${infoMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{infoMessage.text}</p>}
                        <button type="submit" className="w-full px-4 py-3 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-primary text-sm">Salvar Dados</button>
                    </div>

                    <div className="space-y-6">
                         {canCompleteData && (
                            <div className="p-4 border rounded-lg">
                                <h3 className="text-lg font-semibold text-brand-dark mb-4">Documentos</h3>
                                <div className="space-y-4">
                                    {documentSlots.filter(s => s.condition).map(slot => (
                                        <DocumentSlot 
                                            key={slot.category}
                                            label={slot.label}
                                            category={slot.category}
                                            doc={userDocs.find(d => d.category === slot.category)}
                                            onUpload={handleUpload}
                                            onDelete={handleDelete}
                                        />
                                    ))}

                                    <div className="pt-4 border-t">
                                        <h4 className="text-sm font-medium mb-2">Outros Documentos (ex: Matrículas)</h4>
                                        {otherDocuments.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-2 mt-1 bg-gray-50 border rounded-md">
                                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 hover:underline">{doc.name}</a>
                                                <button onClick={() => handleDelete(doc.id)} className="p-1 text-gray-400 hover:text-red-500"><Icon name="trash" className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                         <DocumentSlot label="Adicionar outro..." category="other" doc={undefined} onUpload={handleUpload} onDelete={()=>{}} />
                                    </div>
                                </div>
                            </div>
                         )}
                        <div className="p-6 bg-gray-50 rounded-xl border h-fit">
                            <h4 className="font-semibold text-lg text-brand-dark mb-3">Precisa de Ajuda?</h4>
                            <p className="text-sm text-gray-500 mb-4">Tire suas dúvidas sobre o preenchimento com nossa IA.</p>
                            <div className="space-y-2">{AI_HELP_SUGGESTIONS.map(q => (<button key={q} type="button" onClick={() => alert('Abrindo chat IA...')} className="w-full text-left text-sm p-3 bg-white border rounded-md hover:bg-gray-100">{q}</button>))}</div>
                        </div>
                    </div>
                </div>
            </form>
        </details>
    </div>
  );
};

export default MyDataScreen;
