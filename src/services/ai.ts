import { AIInterviewState, PracticeArea } from '@/types';
export type AIReply = { action: 'ask_question' | 'finish_interview' | 'outside_profile'; message: string; state: AIInterviewState; };
const questions = ['Qual era aproximadamente seu salário?', 'Seu vínculo com a empresa já terminou?', 'Como era sua jornada habitual de trabalho?', 'Você registrava seu horário por algum sistema de ponto?', 'Você possui documentos, como holerites ou termo de rescisão?'];
export const mockAIService = {
 reply(answer: string, state: AIInterviewState): AIReply { const text=answer.toLowerCase(); const area: PracticeArea = text.includes('produto') || text.includes('cartão') || text.includes('cobrança') ? 'Consumidor' : 'Trabalhista'; const next={...state,area,step:state.step+1,alreadyAsked:[...state.alreadyAsked,questions[state.step] || 'relato']}; if (state.step >= questions.length) return {action:'finish_interview',message:'Pronto! Organizamos as principais informações do seu relato.',state:next}; return {action:'ask_question',message:questions[state.step],state:next}; }
};
