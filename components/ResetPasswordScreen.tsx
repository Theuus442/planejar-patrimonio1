import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import supabaseAuthService from '../services/supabaseAuth';

interface ResetPasswordScreenProps {
  onResetComplete: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onResetComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    // Check if there's a valid recovery token in the URL
    const checkToken = async () => {
      try {
        const session = await supabaseAuthService.getCurrentSession();
        if (session && session.user) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setError('Link inválido ou expirado. Por favor, solicite um novo link de recuperação.');
        }
      } catch (err) {
        setIsValidToken(false);
        setError('Não foi possível validar o link. Tente novamente.');
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkToken();
  }, []);

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 6) {
      return { valid: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
    }
    return { valid: true, message: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Por favor, preencha ambos os campos de senha.');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await supabaseAuthService.updatePassword(password);
      if (result) {
        setSuccess(true);
        setTimeout(async () => {
          // Make sure to sign out after password reset before redirecting
          await supabaseAuthService.signOut();
          onResetComplete();
        }, 2000);
      } else {
        setError('Não foi possível redefinir a senha. Tente novamente.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Ocorreu um erro ao redefinir a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-brand-secondary flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Icon name="loader" className="h-8 w-8 text-white" />
          </div>
          <p className="text-white">Validando link...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-brand-secondary flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex justify-center mb-4">
              <Icon name="alert-circle" className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-center text-brand-dark mb-4">Link Inválido</h2>
            <p className="text-center text-gray-600 mb-6">
              {error || 'O link de recuperação é inválido ou expirou. Por favor, solicite um novo link.'}
            </p>
            <a
              href="/esqueci-senha"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors"
            >
              Solicitar Novo Link
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-secondary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <svg viewBox="0 0 250 80" xmlns="http://www.w3.org/2000/svg" className="mx-auto w-64 h-auto" role="img" aria-labelledby="logoTitle">
            <title id="logoTitle">Planejar Patrimônio Logo</title>
            <g>
              <path d="M44 11V36C44 43.2 38.3 51 30.7 51C23 51 17.3 43.2 17.3 36V11H44ZM46.7 8H14.7V36C14.7 44.5 21.8 53.5 30.7 53.5C39.5 53.5 46.7 44.5 46.7 36V8Z" fill="white"/>
              <path d="M22.7 23.3H38.7V20.7H22.7V23.3Z" fill="white"/>
              <path d="M26.7 39.3H34.7V23.3H26.7V39.3Z" fill="white"/>
              <path d="M22.7 43.3H38.7V40.7H22.7V43.3Z" fill="white"/>
            </g>
            <g>
              <text x="60" y="27" fontFamily="Book Antiqua, serif" fontSize="18" fill="white">PLANEJAR</text>
              <text x="60" y="50" fontFamily="Book Antiqua, serif" fontSize="18" fill="white" fontWeight="bold">PATRIMÔNIO</text>
              <text x="60" y="65" fontFamily="Book Antiqua, serif" fontSize="11" fill="white">Proteja sua família</text>
            </g>
          </svg>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 mt-4">
          {!success ? (
            <>
              <h2 className="text-2xl font-bold text-center text-brand-dark mb-2">Redefinir Senha</h2>
              <p className="text-center text-gray-600 mb-6 text-sm">
                Digite sua nova senha para recuperar o acesso à sua conta.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="text-sm font-medium text-gray-700 text-left block">
                    Nova Senha
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Icon name="lock" className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <Icon name={showPassword ? 'eye-slash' : 'eye'} className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 text-left block">
                    Confirmar Nova Senha
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Icon name="lock" className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        <Icon name={showConfirmPassword ? 'eye-slash' : 'eye'} className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors disabled:bg-gray-400"
                >
                  {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <Icon name="check" className="h-16 w-16 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-brand-dark">Senha Redefinida!</h3>
              <p className="text-gray-600 text-sm">
                Sua senha foi redefinida com sucesso. Você será redirecionado para a página de login.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
