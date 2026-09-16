export type PracticeArea = 'Trabalhista' | 'Consumidor' | 'Família' | 'Previdenciário' | 'Cível' | 'Empresarial';
export type CaseStatus = 'new' | 'reviewing' | 'waiting_information' | 'interested' | 'not_a_fit' | 'converted' | 'archived';
export type Compatibility = 'Alta' | 'Média' | 'Baixa';
export interface Document { id: string; name: string; type: string; size: string; }
export interface InterviewMessage { id: string; role: 'assistant' | 'user'; content: string; createdAt: string; }
export interface LegalCase { id: string; code: string; name: string; area: PracticeArea; topics: string[]; status: CaseStatus; compatibility: Compatibility; createdAt: string; summary: string; company?: string; admission?: string; dismissal?: string; salary?: string; schedule?: string; documents: Document[]; missing: string[]; messages: InterviewMessage[]; }
export interface Lawyer { slug: string; name: string; firm: string; city: string; areas: PracticeArea[]; profile: string; preferences: string[]; }
export interface AIInterviewState { step: number; area?: PracticeArea; facts: Record<string, string>; alreadyAsked: string[]; }
