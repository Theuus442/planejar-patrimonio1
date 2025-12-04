import React, { useState } from 'react';
import { UserRole } from '../types';
import Icon from './Icon';
import supabaseAuthService from '../services/supabaseAuth';

interface CreateUserScreenProps {
    onBack: () => void;
    onCreateUser?: () => void;
    selectedRole?: UserRole;
}

const CreateUserScreen: React.FC<CreateUserScreenProps> = ({ onBack, onCreateUser, selectedRole }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>(selectedRole || UserRole.AUXILIARY);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'O nome é obrigatório.';
        }

        if (!email.trim()) {
            newErrors.email = 'O e-mail é obrigatório.';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Formato de e-mail inválido.';
        }

        if (!password.trim()) {
            newErrors.password = 'A senha é obrigatória.';
        } else if (password.length < 6) {
            newErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'As senhas não correspondem.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setSuccessMessage('');

        try {
            const result = await supabaseAuthService.signUpWithEmail(
                email.trim().toLowerCase(),
                password,
                name.trim(),
                role
            );

            if (!result) {
                throw new Error('Falha ao criar usuário. Tente novamente.');
            }

            setSuccessMessage('Usuário criado com sucesso!');
            setTimeout(() => {
                onBack();
                onCreateUser?.();
            }, 1500);
        } catch (error: any) {
            console.error('Error creating user:', error);
            let errorMessage = 'Erro ao criar usuário. Tente novamente.';

            if (error?.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.code === '42501') {
                errorMessage = 'Erro de permissão ao criar usuário. Entre em contato com o suporte.';
            }

            setErrors({ submit: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleLabel = (r: UserRole) => {
        switch (r) {
            case UserRole.ADMINISTRATOR:
                return 'Administrador';
            case UserRole.CONSULTANT:
                return 'Consultor';
            case UserRole.AUXILIARY:
                return 'Auxiliar';
            case UserRole.CLIENT:
                return 'Cliente';
            default:
                return 'Desconhecido';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <button
                onClick={onBack}
                className="flex items-center text-sm font-medium text-brand-secondary hover:text-brand-primary mb-6"
            >
                <Icon name="arrow-right" className="w-4 h-4 mr-2 transform rotate-180" />
                Voltar
            </button>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 max-w-2xl">
                <h2 className="text-2xl font-bold text-brand-primary mb-2">Criar Novo Usuário</h2>
                <p className="text-gray-600 mb-8">Preencha os dados do novo usuário para adicioná-lo à plataforma.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Field */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Nome Completo
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name) setErrors({ ...errors, name: '' });
                            }}
                            placeholder="João Silva"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                                errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                    </div>

                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            E-mail
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) setErrors({ ...errors, email: '' });
                            }}
                            placeholder="joao@exemplo.com"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                                errors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                            Função
                        </label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={isLoading || !!selectedRole}
                        >
                            <option value={UserRole.CLIENT}>Cliente</option>
                            <option value={UserRole.AUXILIARY}>Auxiliar</option>
                            <option value={UserRole.CONSULTANT}>Consultor</option>
                            {/* Only admins can create other admins */}
                            <option value={UserRole.ADMINISTRATOR}>Administrador</option>
                        </select>
                    </div>

                    {/* Password Field */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Senha
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password) setErrors({ ...errors, password: '' });
                            }}
                            placeholder="••••••"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                                errors.password ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirmar Senha
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                            }}
                            placeholder="••••••"
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                            {successMessage}
                        </div>
                    )}

                    {/* Error Message */}
                    {errors.submit && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {errors.submit}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-brand-secondary text-white rounded-lg hover:bg-brand-primary font-medium flex items-center justify-center disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Usuário'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateUserScreen;
