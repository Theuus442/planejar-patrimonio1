import { GoogleGenAI, Chat, Type } from "@google/genai";
import { ChatMessage, UserRole, AIAnalysisResult } from '../types';
import { fileToBase64 } from "../utils/fileUtils";

// Lazy initialization for the GoogleGenAI instance to prevent crashes on startup
// in environments where the API key is not immediately available.
let ai: GoogleGenAI | null = null;
let aiInitError: Error | null = null;

const getAi = (): GoogleGenAI => {
  if (!ai && !aiInitError) {
    try {
      const apiKey = process.env.API_KEY || import.meta.env.VITE_GOOGLE_GENAI_API_KEY;
      if (!apiKey) {
        throw new Error('No Google Gemini API key configured');
      }
      ai = new GoogleGenAI({ apiKey });
    } catch (error) {
      aiInitError = error instanceof Error ? error : new Error(String(error));
      console.warn('AI features disabled:', aiInitError.message);
    }
  }
  if (aiInitError) throw aiInitError;
  return ai!;
};


const AI_PERSONA = `Persona: Você é um assistente de IA para uma plataforma de gestão de holdings familiares. Seu nome é Plano. Sua personalidade é paciente, didática e você deve explicar conceitos complexos de forma simples, como se estivesse falando com alguém mais velho e sem conhecimento técnico. Use exemplos práticos, analogias e formate suas respostas com markdown para melhor legibilidade (listas, negrito). Nunca recuse uma pergunta, mas se o assunto for muito fora do escopo de holdings, finanças ou direito de família, gentilmente redirecione a conversa para o tema principal.`;

class AIChatSession {
    private chat: Chat;
    private isAvailable: boolean = false;

    constructor() {
        try {
            this.chat = getAi().chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: AI_PERSONA,
                    temperature: 0.5,
                }
            });
            this.isAvailable = true;
        } catch (error) {
            console.warn("AI Chat not available:", error instanceof Error ? error.message : String(error));
            this.isAvailable = false;
        }
    }

    async sendMessage(message: string): Promise<string> {
        if (!this.isAvailable) {
            return "Assistente de IA não está disponível. Configure a chave da API do Google Gemini para ativar este recurso.";
        }
        try {
            const response = await this.chat.sendMessage({ message });
            return response.text;
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return "Ocorreu um erro ao processar sua pergunta. Tente novamente mais tarde.";
        }
    }
}

export const createAIChatSession = () => {
    try {
        return new AIChatSession();
    } catch (error) {
        console.warn("Could not create AI chat session:", error instanceof Error ? error.message : String(error));
        return new AIChatSession(); // Return instance anyway, but it won't be available
    }
};

export const getAIHelp = async (question: string): Promise<ChatMessage> => {
  try {
    const response = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: question,
      config: {
        systemInstruction: AI_PERSONA,
        temperature: 0.5,
      }
    });

    const text = response.text;

    return {
      id: Date.now().toString(),
      authorId: 'ai',
      authorName: 'Assistente IA',
      authorAvatarUrl: '',
      authorRole: UserRole.CONSULTANT,
      content: text,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("AI help not available:", error instanceof Error ? error.message : String(error));
    return {
      id: Date.now().toString(),
      authorId: 'ai',
      authorName: 'Assistente IA',
      authorAvatarUrl: '',
      authorRole: UserRole.CONSULTANT,
      content: "Assistente de IA não está disponível no momento. Configure a chave da API do Google Gemini.",
      timestamp: new Date().toISOString(),
    };
  }
};

export const generateAIDraft = async (prompt: string): Promise<string> => {
    try {
        const response = await getAi().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: `Você é um assistente especialista em direito societário e planejamento patrimonial no Brasil. Sua tarefa é gerar minutas de documentos jurídicos, como acordos de sócios para holdings familiares. O texto deve ser formal, claro e abranger os pontos solicitados. Não inclua opiniões ou saudações, apenas o texto do documento.`,
                temperature: 0.3,
            }
        });

        return response.text;
    } catch (error) {
        console.warn("AI draft generation not available:", error instanceof Error ? error.message : String(error));
        return "Recurso de geração de rascunhos via IA não está disponível. Configure a chave da API do Google Gemini.";
    }
};

export const analyzeDocumentWithAI = async (file: File): Promise<AIAnalysisResult> => {
    const base64Data = await fileToBase64(file);
    const filePart = {
        inlineData: {
            mimeType: file.type,
            data: base64Data,
        },
    };

    const textPart = {
        text: `
          Analise este documento no contexto da criação de uma holding familiar no Brasil.
          1.  Faça um resumo conciso do propósito principal do documento.
          2.  Extraia informações chave, como nomes de pessoas, empresas, endereços de imóveis, valores monetários e cláusulas importantes.
          3.  Sugira de 3 a 5 tarefas ou próximos passos acionáveis para um consultor com base no conteúdo. As tarefas devem ser curtas e diretas.

          Retorne a resposta EXCLUSIVAMENTE em formato JSON.
        `,
    };

    try {
        const response = await getAi().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [filePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        keyInfo: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    value: { type: Type.STRING },
                                }
                            }
                        },
                        suggestedTasks: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                    },
                },
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AIAnalysisResult;

    } catch (error) {
        console.warn("Document analysis not available:", error instanceof Error ? error.message : String(error));
        throw new Error("Análise de documentos via IA não está disponível. Configure a chave da API do Google Gemini.");
    }
};
