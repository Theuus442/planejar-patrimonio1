import React, { useState, useMemo } from 'react';
import { NewClientData, User } from '../types';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

interface CreateClientScreenProps {
    onBack: () => void;
    onCreateClient: (projectName: string, mainClient: NewClientData, additionalClients: NewClientData[], contractFile: File) => void;
    allUsers: User[];
}

const StepIndicator: React.FC<{ number: number; title: string; active: boolean }> = ({ number, title, active }) => (
    <div className={`flex items-center space-x-2 text-sm ${active ? 'text-brand-primary font-bold' : 'text-gray-400'}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${active ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-300'}`}>
            {number}
        </div>
        <span>{title}</span>
    </div>
);

const CreateClientScreen: React.FC<CreateClientScreenProps> = ({ onBack, onCreateClient, allUsers }) => {
    const [step, setStep] = useState(1);
    const [projectName, setProjectName] = useState('');
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [mainClient, setMainClient] = useState<NewClientData>({ name: '', email: '', clientType: 'partner', password: '' });
    const [additionalClients, setAdditionalClients] = useState<NewClientData[]>([]);
    const [currentAdditional, setCurrentAdditional] = useState<NewClientData>({ name: '', email: '', clientType: 'interested', password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const existingEmails = useMemo(() => new Set(allUsers.map(u => u.email.toLowerCase())), [allUsers]);

    const validateStep = () => {
        const newErrors: Record<string, string> = {};
        if (step === 1) {
            if (!projectName.trim()) newErrors.projectName = 'O nome do projeto é obrigatório.';
            if (!contractFile) newErrors.contractFile = 'O contrato do projeto é obrigatório.';
        }
        if (step === 2) {
            if (!mainClient.name.trim()) newErrors.mainClientName = 'O nome do cliente é obrigatório.';
            if (!mainClient.email.trim()) {
                newErrors.mainClientEmail = 'O e-mail do cliente é obrigatório.';
            } else if (!/\S+@\S+\.\S+/.test(mainClient.email)) {
                newErrors.mainClientEmail = 'Formato de e-mail inválido.';
            } else if (existingEmails.has(mainClient.email.toLowerCase())) {
                newErrors.mainClientEmail = 'Este e-mail já está em uso.';
            }
            if (!mainClient.password?.trim()) {
                newErrors.mainClientPassword = 'A senha provisória é obrigatória.';
            } else if (mainClient.password.length < 6) {
                newErrors.mainClientPassword = 'A senha deve ter no mínimo 6 caracteres.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleAddAdditionalClient = () => {
        const newErrors: Record<string, string> = {};
        if (!currentAdditional.name.trim()) newErrors.addClientName = 'O nome é obrigatório.';
        if (!currentAdditional.email.trim()) {
            newErrors.addClientEmail = 'O e-mail é obrigatório.';
        } else if (!/\S+@\S+\.\S+/.test(currentAdditional.email)) {
            newErrors.addClientEmail = 'E-mail inválido.';
        } else if (existingEmails.has(currentAdditional.email.toLowerCase()) || mainClient.email === currentAdditional.email || additionalClients.some(c => c.email === currentAdditional.email)) {
            newErrors.addClientEmail = 'E-mail já está em uso neste projeto.';
        }
        if (!currentAdditional.password?.trim()) {
            newErrors.addClientPassword = 'A senha provisória é obrigatória.';
        } else if (currentAdditional.password.length < 6) {
            newErrors.addClientPassword = 'A senha deve ter no mínimo 6 caracteres.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setAdditionalClients(prev => [...prev, currentAdditional]);
        setCurrentAdditional({ name: '', email: '', clientType: 'interested', password: '' });
        setErrors({});
    };

    const handleRemoveAdditional = (email: string) => {
        setAdditionalClients(prev => prev.filter(c => c.email !== email));
    };

    const handleSubmit = async () => {
        if (!projectName || !mainClient.email || !contractFile) {
            alert('Por favor, preencha todos os campos obrigatórios (nome do projeto, cliente principal e contrato) antes de finalizar.');
            return;
        }
        setIsLoading(true);
        try {
            await onCreateClient(projectName, mainClient, additionalClients, contractFile);
        } finally {
            setIsLoading(false);
        }
    };
    
    const steps = ["Projeto", "Cliente Principal", "Membros Adicionais", "Revisão"];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <button onClick={onBack} className="flex items-center text-sm font-medium text-brand-secondary hover:text-brand-primary mb-6">
                &larr; Voltar para o Painel
            </button>
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-brand-primary mb-2">Criar Novo Projeto</h2>
                <p className="text-gray-600 mb-6">Siga as etapas para configurar uma nova holding familiar.</p>
                
                <div className="flex justify-between items-center mb-8 p-3 bg-gray-50 rounded-lg">
                    {steps.map((title, index) => (
                         <React.Fragment key={index}>
                            <StepIndicator number={index + 1} title={title} active={step >= index + 1} />
                            {index < steps.length - 1 && <div className="flex-grow h-0.5 bg-gray-300 mx-2"></div>}
                        </React.Fragment>
                    ))}
                </div>

                <div className="min-h-[300px]">
                    {step === 1 && (
                        <div className="animate-fade-in-up space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-brand-dark mb-4">1. Qual o nome do projeto?</h3>
                                <p className="text-sm text-gray-500 mb-4">Ex: "Holding Família Silva", "Planejamento Sucessório Família Costa".</p>
                                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Nome do Projeto" className="w-full rounded-md border-gray-300"/>
                                {errors.projectName && <p className="text-red-500 text-xs mt-1">{errors.projectName}</p>}
                            </div>
                             <div>
                                <label className="text-sm font-medium text-gray-700">Contrato de Prestação de Serviços (.pdf)</label>
                                <input 
                                    type="file" 
                                    accept=".pdf" 
                                    onChange={(e) => setContractFile(e.target.files ? e.target.files[0] : null)} 
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {errors.contractFile && <p className="text-red-500 text-xs mt-1">{errors.contractFile}</p>}
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="animate-fade-in-up space-y-4">
                            <h3 className="text-xl font-semibold text-brand-dark mb-4">2. Quem é o cliente principal?</h3>
                            <input type="text" value={mainClient.name} onChange={(e) => setMainClient({...mainClient, name: e.target.value})} placeholder="Nome Completo do Cliente" className="w-full rounded-md border-gray-300"/>
                            {errors.mainClientName && <p className="text-red-500 text-xs mt-1">{errors.mainClientName}</p>}
                            <input type="email" value={mainClient.email} onChange={(e) => setMainClient({...mainClient, email: e.target.value})} placeholder="E-mail do Cliente" className="w-full rounded-md border-gray-300"/>
                            {errors.mainClientEmail && <p className="text-red-500 text-xs mt-1">{errors.mainClientEmail}</p>}
                            <input type="password" value={mainClient.password || ''} onChange={(e) => setMainClient({...mainClient, password: e.target.value})} placeholder="Senha Provisória" className="w-full rounded-md border-gray-300"/>
                            {errors.mainClientPassword && <p className="text-red-500 text-xs mt-1">{errors.mainClientPassword}</p>}
                            <div>
                                <label className="text-sm font-medium text-gray-700">Tipo de Cliente</label>
                                <select value={mainClient.clientType} onChange={(e) => setMainClient({...mainClient, clientType: e.target.value as 'partner' | 'interested'})} className="w-full mt-1 rounded-md border-gray-300">
                                    <option value="partner">Sócio (participa da holding)</option>
                                    <option value="interested">Terceiro Interessado (não participa, ex: herdeiro)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Sócios podem editar e submeter dados. Interessados têm acesso de apenas visualização.</p>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="animate-fade-in-up">
                             <h3 className="text-xl font-semibold text-brand-dark mb-4">3. Adicionar outros membros (opcional)</h3>
                             <div className="p-4 border rounded-lg bg-gray-50/50 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input type="text" placeholder="Nome do membro" value={currentAdditional.name} onChange={(e) => setCurrentAdditional({...currentAdditional, name: e.target.value})} className="w-full text-sm rounded-md border-gray-300" />
                                    <input type="email" placeholder="E-mail do membro" value={currentAdditional.email} onChange={(e) => setCurrentAdditional({...currentAdditional, email: e.target.value})} className="w-full text-sm rounded-md border-gray-300" />
                                </div>
                                <div>
                                    <input type="password" placeholder="Senha provisória" value={currentAdditional.password || ''} onChange={(e) => setCurrentAdditional({...currentAdditional, password: e.target.value})} className="w-full text-sm rounded-md border-gray-300"/>
                                    {errors.addClientPassword && <p className="text-red-500 text-xs mt-1">{errors.addClientPassword}</p>}
                                </div>
                                {errors.addClientName && <p className="text-red-500 text-xs">{errors.addClientName}</p>}
                                {errors.addClientEmail && <p className="text-red-500 text-xs">{errors.addClientEmail}</p>}
                                <select value={currentAdditional.clientType} onChange={e => setCurrentAdditional({...currentAdditional, clientType: e.target.value as 'partner' | 'interested'})} className="w-full text-sm rounded-md border-gray-300">
                                    <option value="partner">Sócio (participa da holding)</option>
                                    <option value="interested">Interessado (não participa, ex: herdeiro)</option>
                                </select>
                                <button onClick={handleAddAdditionalClient} className="w-full flex items-center justify-center text-sm font-medium text-brand-secondary py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100">
                                    <Icon name="plus" className="w-4 h-4 mr-2"/>Adicionar Membro
                                </button>
                             </div>
                             {additionalClients.length > 0 && <div className="mt-4 space-y-2">
                                {additionalClients.map(client => (
                                    <div key={client.email} className="flex justify-between items-center p-2 bg-gray-100 rounded-md">
                                        <div>
                                            <p className="text-sm font-medium">{client.name} <span className="text-xs font-normal text-gray-500">({client.clientType === 'partner' ? 'Sócio' : 'Interessado'})</span></p>
                                            <p className="text-xs text-gray-500">{client.email}</p>
                                        </div>
                                        <button onClick={() => handleRemoveAdditional(client.email)}><Icon name="trash" className="w-4 h-4 text-gray-500 hover:text-red-500"/></button>
                                    </div>
                                ))}
                            </div>}
                        </div>
                    )}
                    {step === 4 && (
                        <div className="animate-fade-in-up space-y-4">
                            <h3 className="text-xl font-semibold text-brand-dark mb-4">4. Revisão Final</h3>
                            <div className="p-4 border rounded-lg space-y-3">
                                <div><p className="text-sm text-gray-500">Nome do Projeto</p><p className="font-semibold">{projectName}</p></div>
                                <div className="border-t pt-3"><p className="text-sm text-gray-500">Contrato</p><p className="font-semibold text-green-600 flex items-center"><Icon name="check" className="w-4 h-4 mr-2"/> {contractFile?.name}</p></div>
                                <div className="border-t pt-3"><p className="text-sm text-gray-500">Cliente Principal ({mainClient.clientType === 'partner' ? 'Sócio' : 'Interessado'})</p><p className="font-semibold">{mainClient.name} <span className="text-gray-600 font-normal">({mainClient.email})</span></p></div>
                                {additionalClients.length > 0 && <div className="border-t pt-3">
                                    <p className="text-sm text-gray-500">Membros Adicionais</p>
                                    {additionalClients.map(c => <p key={c.email} className="font-semibold">{c.name} <span className="text-gray-600 font-normal">({c.email} - {c.clientType === 'partner' ? 'Sócio' : 'Interessado'})</span></p>)}
                                </div>}
                            </div>
                            <p className="text-xs text-gray-500">Ao confirmar, os usuários serão criados com senhas provisórias. Eles serão solicitados a criar uma nova senha no primeiro acesso.</p>
                            {additionalClients.length > 0 && (
                                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm font-semibold text-yellow-900 mb-2">⏳ Tempo de Processamento</p>
                                    <p className="text-xs text-yellow-800">
                                        Você está criando {1 + additionalClients.length} cliente(s).
                                        Cada cliente leva até 65 segundos para ser criado (limite de segurança do Supabase).
                                        <br/>
                                        <strong>Tempo total estimado: {Math.round((additionalClients.length) * 65 / 60)} minuto(s)</strong>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-8 border-t mt-8">
                    <button onClick={handleBack} disabled={step === 1} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50">
                        Voltar
                    </button>
                    {step < 4 ? (
                        <button onClick={handleNext} className="px-6 py-3 bg-brand-secondary text-white rounded-lg font-semibold hover:bg-brand-primary">
                            Avançar
                        </button>
                    ) : (
                        <button onClick={handleSubmit} className="px-6 py-3 bg-brand-accent text-brand-dark rounded-lg font-semibold hover:opacity-90">
                            Confirmar e Criar Projeto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateClientScreen;
