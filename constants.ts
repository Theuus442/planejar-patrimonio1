import { User, Project, Phase, Task, UserRole, CompanyData, PartnerDataForPhase2, Asset, ITBIProcessData, RegistrationProcessData, QuotaTransferProcess, SupportRequest, Document, ChatMessage, LogEntry, UserDocument, PartnerQualificationData } from './types';

// ============================================================================
// NOTE: All user and project data now comes from Supabase
// ============================================================================
// INITIAL_USERS and INITIAL_PROJECTS have been removed.
// Data is loaded dynamically from the database on app startup.
//
// For development/testing, use dataMigrationService.initializeDatabase()
// to seed the database with test users and projects.
// See: services/dataMigration.ts
// ============================================================================

/**
 * Template for initial project phases
 * Returns a blank phase structure for new projects.
 * Actual project data is loaded from Supabase.
 */
export const getInitialProjectPhases = (): Phase[] => {
    return [
        { id: 1, title: 'Diagnóstico e Planejamento', description: 'Coleta de informações iniciais e definição dos objetivos da holding.', status: 'in-progress', tasks: [], documents: [], phase1Data: { isFormCompleted: false, meetingScheduled: false }},
        { id: 2, title: 'Constituição da Holding', description: 'Definição do quadro societário, elaboração do contrato social e registro da empresa.', status: 'pending', tasks: [], documents: [], phase2Data: { companyData: { name: '', capital: '', type: '', address: '', cnaes: '' }, partners: [], documents: {}, status: 'pending_client', processStatus: 'pending_start' }},
        { id: 3, title: 'Coleta de Dados para Integralização', description: 'Declaração dos bens que serão transferidos para o capital social da holding.', status: 'pending', tasks: [], documents: [], phase3Data: { assets: [], documents: [], status: 'pending_client' }},
        { id: 4, title: 'Minuta de Integralização', description: 'Elaboração e revisão da minuta do contrato de integralização dos bens.', status: 'pending', tasks: [], documents: [], phase4Data: { analysisDrafts: [], discussion: [], status: 'pending_draft', approvals: {} }},
        { id: 5, title: 'Pagamento do ITBI', description: 'Processamento do Imposto sobre Transmissão de Bens Imóveis (ITBI), se aplicável.', status: 'pending', tasks: [], documents: [], phase5Data: { itbiProcesses: [] }},
        { id: 6, title: 'Registro da Integralização', description: 'Registro da transferência dos bens no cartório de registro de imóveis competente.', status: 'pending', tasks: [], documents: [], phase6Data: { registrationProcesses: [] }},
        { id: 7, title: 'Conclusão e Entrega', description: 'Entrega do dossiê final com todos os documentos e registros concluídos.', status: 'pending', tasks: [], documents: [], phase7Data: { status: 'pending' }},
        { id: 8, title: 'Transferência de Quotas', description: 'Processo de doação ou venda de quotas sociais para herdeiros ou terceiros.', status: 'pending', tasks: [], documents: [], phase8Data: { transferProcesses: [] }},
        { id: 9, title: 'Acordo de Sócios', description: 'Elaboração do acordo para regular as relações entre os sócios da holding.', status: 'pending', tasks: [], documents: [], phase9Data: { drafts: [], discussion: [], status: 'pending_draft', approvals: {}, documents: { agreement: undefined }, includedClauses: [] }},
        { id: 10, title: 'Suporte e Alterações', description: 'Canal para solicitações de alterações, dúvidas e suporte contínuo após a conclusão do projeto.', status: 'pending', tasks: [], documents: [], phase10Data: { requests: [] }},
    ];
};

// ============================================================================
// NOTE: All project data now comes from Supabase
// ============================================================================
// Project data including phases, documents, chat, and activity logs
// are loaded dynamically from the database.
//
// For development/testing, use dataMigrationService.initializeDatabase()
// to seed the database with a sample project.
// ============================================================================
