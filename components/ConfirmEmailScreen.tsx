import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import supabaseAuthService from '../services/supabaseAuth';

interface ConfirmEmailScreenProps {
  onConfirmComplete: () => void;
  onBackToLogin: () => void;
}

const ConfirmEmailScreen: React.FC<ConfirmEmailScreenProps> = ({ onConfirmComplete, onBackToLogin }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkEmailConfirmation = async () => {
      try {
        // Check if email is confirmed by looking at the session
        const session = await supabaseAuthService.getCurrentSession();
        
        if (session && session.user) {
          // Check if email is verified (email_confirmed_at is set)
          const emailConfirmed = session.user.email_confirmed_at || session.user.user_metadata?.email_verified;
          
          if (emailConfirmed) {
            setIsConfirmed(true);
            setError('');
          } else {
            // Email not confirmed yet - this could mean:
            // 1. User clicked the link but it's not processed yet
            // 2. User is still waiting for email confirmation
            setIsConfirmed(false);
            setError('');
          }
        } else {
          setIsConfirmed(false);
          setError('Link inválido ou expirado. Por favor, tente fazer login novamente.');
        }
      } catch (err) {
        console.error('Email confirmation check error:', err);
        setIsConfirmed(false);
        setError('Ocorreu um erro ao verificar o e-mail. Tente novamente.');
      } finally {
        setIsChecking(false);
      }
    };

    // Add a small delay to ensure Supabase processes the confirmation
    const timer = setTimeout(checkEmailConfirmation, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-brand-secondary flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Icon name="loader" className="h-8 w-8 text-white" />
          </div>
          <p className="text-white text-lg">Confirmando seu e-mail...</p>
          <p className="text-white text-sm mt-2 opacity-75">Por favor, aguarde um momento.</p>
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
          {isConfirmed ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <Icon name="check" className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-brand-dark">E-mail Confirmado!</h2>
              <p className="text-gray-600">
                Seu e-mail foi confirmado com sucesso. Sua conta está pronta para uso.
              </p>
              <button
                onClick={onConfirmComplete}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors"
              >
                Ir para o Dashboard
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <Icon name="mail" className="h-16 w-16 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-brand-dark">Confirme seu E-mail</h2>
              {error ? (
                <>
                  <p className="text-gray-600 text-sm">{error}</p>
                  <button
                    onClick={onBackToLogin}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors"
                  >
                    Voltar para Login
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-600 text-sm">
                    Verificamos seu e-mail. Se você não vir uma mudança em breve, tente recarregar a página.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-secondary hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors"
                    >
                      Recarregar Página
                    </button>
                    <button
                      onClick={onBackToLogin}
                      className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors"
                    >
                      Voltar para Login
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-gray-300 text-sm">
          <p>
            Não recebeu o e-mail de confirmação?{' '}
            <a href="/esqueci-senha" className="text-white hover:text-gray-100 underline">
              Enviar novamente
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmailScreen;
