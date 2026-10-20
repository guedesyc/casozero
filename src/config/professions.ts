/**
 * Catálogo de profissões da saúde que podem atuar de forma autônoma.
 * Cada profissão define o conselho de classe, as abordagens/especialidades
 * (como o profissional trabalha) e as demandas (o que o paciente procura).
 * O profissional escolhe tudo isso no cadastro; o link público mostra ao
 * paciente apenas as demandas que aquele profissional atende.
 */
export type ProfessionId =
  | 'psicologia'
  | 'psicanalise'
  | 'fisioterapia'
  | 'fonoaudiologia'
  | 'nutricao'
  | 'terapia_ocupacional'
  | 'psicopedagogia'
  | 'terapias_integrativas';

export interface Profession {
  id: ProfessionId;
  label: string;
  /** Como o profissional é chamado ("Psicóloga(o)"). */
  title: string;
  /** Sigla do conselho, quando a profissão é regulamentada. */
  council?: string;
  /** Rótulo usado no cadastro para as especialidades. */
  specialtyLabel: string;
  specialties: string[];
  categories: string[];
  /** Como o atendimento é chamado para o paciente. */
  sessionNoun: string;
}

export const PROFESSIONS: Record<ProfessionId, Profession> = {
  psicologia: {
    id: 'psicologia', label: 'Psicologia', title: 'Psicóloga(o)', council: 'CRP', specialtyLabel: 'Abordagem',
    specialties: ['Psicanálise', 'Terapia Cognitivo-Comportamental (TCC)', 'Análise do Comportamento (ABA)', 'Gestalt-terapia', 'Humanista / Centrada na Pessoa', 'Junguiana (Analítica)', 'Sistêmica', 'Esquematerapia', 'Neuropsicologia', 'Psicodrama'],
    categories: ['Ansiedade', 'Depressão', 'Família', 'Relacionamento / Casal', 'Luto', 'Autoestima', 'Trabalho e carreira', 'Infância', 'Adolescência', 'Sexualidade', 'Traumas', 'TDAH', 'Autismo (TEA)', 'Orientação vocacional'],
    sessionNoun: 'sessão',
  },
  psicanalise: {
    id: 'psicanalise', label: 'Psicanálise', title: 'Psicanalista', specialtyLabel: 'Orientação teórica',
    specialties: ['Freudiana', 'Lacaniana', 'Winnicottiana', 'Kleiniana', 'Bioniana'],
    categories: ['Angústia', 'Família', 'Relacionamento / Casal', 'Luto', 'Sexualidade', 'Sintomas psicossomáticos', 'Autoconhecimento', 'Infância', 'Adolescência'],
    sessionNoun: 'sessão',
  },
  fisioterapia: {
    id: 'fisioterapia', label: 'Fisioterapia', title: 'Fisioterapeuta', council: 'CREFITO', specialtyLabel: 'Especialidade',
    specialties: ['Ortopédica e traumatológica', 'Esportiva', 'Neurofuncional', 'Respiratória', 'Pélvica / Uroginecológica', 'Gerontológica', 'Pediátrica', 'Pilates clínico', 'RPG', 'Dermatofuncional', 'Domiciliar'],
    categories: ['Dor nas costas / coluna', 'Dor no pescoço', 'Lesão esportiva', 'Pós-operatório', 'Joelho', 'Ombro', 'AVC e reabilitação neurológica', 'Respiração', 'Incontinência urinária', 'Gestação e pós-parto', 'Postura', 'Mobilidade do idoso'],
    sessionNoun: 'sessão',
  },
  fonoaudiologia: {
    id: 'fonoaudiologia', label: 'Fonoaudiologia', title: 'Fonoaudióloga(o)', council: 'CRFa', specialtyLabel: 'Área',
    specialties: ['Linguagem', 'Voz', 'Motricidade orofacial', 'Audiologia', 'Disfagia', 'Fluência', 'Fonoaudiologia educacional', 'Neurofuncional'],
    categories: ['Atraso de fala', 'Gagueira', 'Troca de letras', 'Voz rouca / cansaço vocal', 'Respiração oral', 'Deglutição', 'Audição', 'Dificuldade de aprendizagem', 'Autismo (TEA)', 'Oratória'],
    sessionNoun: 'sessão',
  },
  nutricao: {
    id: 'nutricao', label: 'Nutrição', title: 'Nutricionista', council: 'CRN', specialtyLabel: 'Especialidade',
    specialties: ['Clínica', 'Esportiva', 'Materno-infantil', 'Comportamental', 'Funcional', 'Vegetariana / vegana', 'Oncológica'],
    categories: ['Emagrecimento', 'Ganho de massa', 'Diabetes', 'Hipertensão', 'Gestação', 'Alimentação infantil', 'Compulsão alimentar', 'Intolerâncias alimentares', 'Performance esportiva'],
    sessionNoun: 'consulta',
  },
  terapia_ocupacional: {
    id: 'terapia_ocupacional', label: 'Terapia Ocupacional', title: 'Terapeuta Ocupacional', council: 'CREFITO', specialtyLabel: 'Área',
    specialties: ['Integração sensorial', 'Saúde mental', 'Reabilitação física', 'Gerontologia', 'Contextos escolares'],
    categories: ['Autismo (TEA)', 'TDAH', 'Desenvolvimento infantil', 'Coordenação motora', 'Autonomia nas atividades diárias', 'Reabilitação após lesão', 'Idosos'],
    sessionNoun: 'sessão',
  },
  psicopedagogia: {
    id: 'psicopedagogia', label: 'Psicopedagogia', title: 'Psicopedagoga(o)', specialtyLabel: 'Área',
    specialties: ['Clínica', 'Institucional', 'Neuropsicopedagogia'],
    categories: ['Dificuldade de aprendizagem', 'Dislexia', 'Discalculia', 'TDAH', 'Alfabetização', 'Organização dos estudos', 'Orientação vocacional'],
    sessionNoun: 'sessão',
  },
  terapias_integrativas: {
    id: 'terapias_integrativas', label: 'Terapias integrativas', title: 'Terapeuta', specialtyLabel: 'Prática',
    specialties: ['Acupuntura', 'Arteterapia', 'Musicoterapia', 'Constelação familiar', 'Hipnoterapia', 'Massoterapia', 'Mindfulness'],
    categories: ['Ansiedade', 'Estresse', 'Sono', 'Dores crônicas', 'Autoconhecimento', 'Família', 'Relacionamento'],
    sessionNoun: 'sessão',
  },
};

export const PROFESSION_LIST = Object.values(PROFESSIONS);
