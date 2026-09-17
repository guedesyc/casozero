export type PracticeArea = 'Trabalhista' | 'Consumidor' | 'Família' | 'Previdenciário' | 'Cível' | 'Empresarial';
export type CaseStatus = 'new' | 'reviewing' | 'waiting_information' | 'interested' | 'not_a_fit' | 'converted' | 'archived';
export type Compatibility = 'Alta' | 'Média' | 'Baixa';
export interface Document { id: string; name: string; type: string; size: string; }
export interface InterviewMessage { id: string; role: 'assistant' | 'user'; content: string; createdAt: string; }
export interface LegalCase { id: string; code: string; name: string; area: PracticeArea; topics: string[]; status: CaseStatus; compatibility: Compatibility; createdAt: string; summary: string; phone?: string; leadSource?: LeadSource; assignedTo?: string; company?: string; admission?: string; dismissal?: string; salary?: string; schedule?: string; documents: Document[]; missing: string[]; messages: InterviewMessage[]; }
export interface Lawyer { slug: string; name: string; firm: string; city: string; areas: PracticeArea[]; profile: string; preferences: string[]; }
export interface AIInterviewState { step: number; area?: PracticeArea; facts: Record<string, string>; alreadyAsked: string[]; }
export type Role = 'administrator' | 'lawyer' | 'collaborator';
export type LeadSource = 'instagram' | 'whatsapp' | 'google' | 'site' | 'qrcode';
export interface Subscription { planId: string; status: 'trial'|'active'|'paused'; used: number; limit: number; nextBilling?: string; }
export interface LawFirm { id: string; name: string; slug: string; members: string[]; }
export interface LawFirmMember { id: string; name: string; email: string; area: PracticeArea; role: Role; status: 'active'|'invited'; assignedCases: number; }
export interface CaseAssignment { caseId: string; memberId?: string; }
export interface CaseComment { id: string; author: string; content: string; createdAt: string; }
export interface CaseActivity { id: string; type: 'created'|'status'|'assignment'|'comment'|'information'|'converted'|'archived'; description: string; createdAt: string; }
