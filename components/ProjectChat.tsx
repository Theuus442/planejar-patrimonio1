import React, { useState, useRef, useEffect } from 'react';
import { Project, User, ChatMessage } from '../types';
import Icon from './Icon';

interface ProjectChatProps {
  project: Project;
  chatType: 'client' | 'internal';
  currentUser: User;
  onSendMessage: (content: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const ProjectChat: React.FC<ProjectChatProps> = ({ project, chatType, currentUser, onSendMessage, onClose, isLoading = false }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatHistory = chatType === 'client' ? project.clientChat : project.internalChat;
  const chatTitle = chatType === 'client' ? `Chat com Consultor` : `Chat Interno do Projeto`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      setIsSending(true);
      try {
        onSendMessage(message);
        setMessage('');
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:right-8 w-full max-w-sm h-3/4 max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-30 border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-brand-primary text-white rounded-t-2xl flex-shrink-0">
        <h3 className="font-bold text-lg">{chatTitle}</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
          <Icon name="close" className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-4">
          {chatHistory.map((msg) => {
            const isCurrentUser = msg.authorId === currentUser.id;
            return (
              <div key={msg.id} className={`flex items-end gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                {!isCurrentUser && (
                   msg.authorAvatarUrl ? (
                        <img src={msg.authorAvatarUrl} alt={msg.authorName} className="w-8 h-8 rounded-full flex-shrink-0" />
                    ) : (
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gray-300 flex items-center justify-center">
                            <span className="font-bold text-sm text-gray-600">{msg.authorName.charAt(0)}</span>
                        </div>
                    )
                )}
                <div className={`max-w-xs p-3 rounded-2xl ${isCurrentUser ? 'bg-brand-secondary text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isCurrentUser ? 'text-gray-300' : 'text-gray-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isCurrentUser && (
                    msg.authorAvatarUrl ? (
                        <img src={msg.authorAvatarUrl} alt={msg.authorName} className="w-8 h-8 rounded-full flex-shrink-0" />
                    ) : (
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-brand-accent flex items-center justify-center">
                            <span className="font-bold text-sm text-brand-dark">{msg.authorName.charAt(0)}</span>
                        </div>
                    )
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-2xl flex-shrink-0">
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
            autoComplete="off"
            disabled={isSending || isLoading}
          />
          <button type="submit" disabled={isSending || isLoading} className="bg-brand-secondary text-white rounded-full p-3 hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" title={isSending ? 'Enviando...' : ''}>
            {isSending ? (
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', borderTop: '2px solid white', borderRight: '2px solid transparent', borderBottom: '2px solid transparent', borderLeft: '2px solid transparent', animation: 'spin 1s linear infinite' }}></div>
            ) : (
              <Icon name="send" className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProjectChat;
