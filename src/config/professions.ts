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
  | 'terapias_integrativas'
  | 'educacao_fisica';

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
  /** Exemplos usados como placeholder, para não sugerir coisas de outra área. */
  examples: { concern: string; expectation: string; serviceName: string; serviceDescription: string; headline: string };
}

export const PROFESSIONS: Record<ProfessionId, Profession> = {
  psicologia: {
    id: 'psicologia', label: 'Psicologia', title: 'Psicóloga(o)', council: 'CRP', specialtyLabel: 'Abordagem',
    specialties: ['Psicanálise', 'Terapia Cognitivo-Comportamental (TCC)', 'Análise do Comportamento (ABA)', 'Gestalt-terapia', 'Humanista / Centrada na Pessoa', 'Junguiana (Analítica)', 'Sistêmica', 'Esquematerapia', 'Neuropsicologia', 'Psicodrama'],
    categories: ['Ansiedade', 'Depressão', 'Família', 'Relacionamento / Casal', 'Luto', 'Autoestima', 'Trabalho e carreira', 'Infância', 'Adolescência', 'Sexualidade', 'Traumas', 'TDAH', 'Autismo (TEA)', 'Orientação vocacional'],
    sessionNoun: 'sessão',
    examples: { concern: 'tenho tido crises de ansiedade e dificuldade para dormir.', expectation: 'entender melhor o que sinto e aprender a lidar com as crises.', serviceName: 'Psicoterapia individual', serviceDescription: 'Sessões semanais para adultos, online ou presenciais.', headline: 'Psicoterapia para adultos, online e presencial.' },
  },
  psicanalise: {
    id: 'psicanalise', label: 'Psicanálise', title: 'Psicanalista', specialtyLabel: 'Orientação teórica',
    specialties: ['Freudiana', 'Lacaniana', 'Winnicottiana', 'Kleiniana', 'Bioniana'],
    categories: ['Angústia', 'Família', 'Relacionamento / Casal', 'Luto', 'Sexualidade', 'Sintomas psicossomáticos', 'Autoconhecimento', 'Infância', 'Adolescência'],
    sessionNoun: 'sessão',
    examples: { concern: 'tenho repetido os mesmos conflitos nos meus relacionamentos.', expectation: 'entender de onde vem o que sinto.', serviceName: 'Análise individual', serviceDescription: 'Sessões semanais, presenciais ou online.', headline: 'Psicanálise para adultos. Um espaço para falar, no seu tempo.' },
  },
  fisioterapia: {
    id: 'fisioterapia', label: 'Fisioterapia', title: 'Fisioterapeuta', council: 'CREFITO', specialtyLabel: 'Especialidade',
    specialties: ['Ortopédica e traumatológica', 'Esportiva', 'Neurofuncional', 'Respiratória', 'Pélvica / Uroginecológica', 'Gerontológica', 'Pediátrica', 'Pilates clínico', 'RPG', 'Dermatofuncional', 'Domiciliar'],
    categories: ['Dor nas costas / coluna', 'Dor no pescoço', 'Lesão esportiva', 'Pós-operatório', 'Joelho', 'Ombro', 'AVC e reabilitação neurológica', 'Respiração', 'Incontinência urinária', 'Gestação e pós-parto', 'Postura', 'Mobilidade do idoso'],
    sessionNoun: 'sessão',
    examples: { concern: 'sinto dor no joelho ao subir escadas há três meses.', expectation: 'voltar a caminhar e correr sem dor.', serviceName: 'Fisioterapia ortopédica', serviceDescription: 'Avaliação e sessões para dores, lesões e pós-operatório.', headline: 'Fisioterapia ortopédica e esportiva para voltar a se mexer sem dor.' },
  },
  fonoaudiologia: {
    id: 'fonoaudiologia', label: 'Fonoaudiologia', title: 'Fonoaudióloga(o)', council: 'CRFa', specialtyLabel: 'Área',
    specialties: ['Linguagem', 'Voz', 'Motricidade orofacial', 'Audiologia', 'Disfagia', 'Fluência', 'Fonoaudiologia educacional', 'Neurofuncional'],
    categories: ['Atraso de fala', 'Gagueira', 'Troca de letras', 'Voz rouca / cansaço vocal', 'Respiração oral', 'Deglutição', 'Audição', 'Dificuldade de aprendizagem', 'Autismo (TEA)', 'Oratória'],
    sessionNoun: 'sessão',
    examples: { concern: 'meu filho de 3 anos ainda fala poucas palavras.', expectation: 'ajudar no desenvolvimento da fala.', serviceName: 'Terapia de linguagem infantil', serviceDescription: 'Sessões para atraso de fala, trocas de letras e gagueira.', headline: 'Fonoaudiologia infantil: fala, linguagem e audição.' },
  },
  nutricao: {
    id: 'nutricao', label: 'Nutrição', title: 'Nutricionista', council: 'CRN', specialtyLabel: 'Especialidade',
    specialties: ['Clínica', 'Esportiva', 'Materno-infantil', 'Comportamental', 'Funcional', 'Vegetariana / vegana', 'Oncológica'],
    categories: ['Emagrecimento', 'Ganho de massa', 'Diabetes', 'Hipertensão', 'Gestação', 'Alimentação infantil', 'Compulsão alimentar', 'Intolerâncias alimentares', 'Performance esportiva'],
    sessionNoun: 'consulta',
    examples: { concern: 'quero emagrecer sem fazer dietas muito restritivas.', expectation: 'ter uma alimentação equilibrada que caiba na minha rotina.', serviceName: 'Consulta nutricional', serviceDescription: 'Avaliação, plano alimentar personalizado e retorno em 30 dias.', headline: 'Nutrição clínica e esportiva, com plano alimentar sob medida.' },
  },
  terapia_ocupacional: {
    id: 'terapia_ocupacional', label: 'Terapia Ocupacional', title: 'Terapeuta Ocupacional', council: 'CREFITO', specialtyLabel: 'Área',
    specialties: ['Integração sensorial', 'Saúde mental', 'Reabilitação física', 'Gerontologia', 'Contextos escolares'],
    categories: ['Autismo (TEA)', 'TDAH', 'Desenvolvimento infantil', 'Coordenação motora', 'Autonomia nas atividades diárias', 'Reabilitação após lesão', 'Idosos'],
    sessionNoun: 'sessão',
    examples: { concern: 'meu filho se incomoda muito com barulhos e texturas.', expectation: 'mais autonomia nas atividades do dia a dia.', serviceName: 'Terapia de integração sensorial', serviceDescription: 'Sessões para crianças com dificuldades sensoriais e motoras.', headline: 'Terapia ocupacional infantil e integração sensorial.' },
  },
  psicopedagogia: {
    id: 'psicopedagogia', label: 'Psicopedagogia', title: 'Psicopedagoga(o)', specialtyLabel: 'Área',
    specialties: ['Clínica', 'Institucional', 'Neuropsicopedagogia'],
    categories: ['Dificuldade de aprendizagem', 'Dislexia', 'Discalculia', 'TDAH', 'Alfabetização', 'Organização dos estudos', 'Orientação vocacional'],
    sessionNoun: 'sessão',
    examples: { concern: 'minha filha tem dificuldade para ler e manter a concentração.', expectation: 'melhorar o aprendizado e o desempenho na escola.', serviceName: 'Avaliação psicopedagógica', serviceDescription: 'Avaliação das dificuldades de aprendizagem e plano de intervenção.', headline: 'Psicopedagogia para crianças e adolescentes com dificuldades de aprendizagem.' },
  },
  terapias_integrativas: {
    id: 'terapias_integrativas', label: 'Terapias integrativas', title: 'Terapeuta', specialtyLabel: 'Prática',
    specialties: ['Acupuntura', 'Arteterapia', 'Musicoterapia', 'Constelação familiar', 'Hipnoterapia', 'Massoterapia', 'Mindfulness'],
    categories: ['Ansiedade', 'Estresse', 'Sono', 'Dores crônicas', 'Autoconhecimento', 'Família', 'Relacionamento'],
    sessionNoun: 'sessão',
    examples: { concern: 'ando muito estressado e com dores nas costas.', expectation: 'me sentir mais calmo e dormir melhor.', serviceName: 'Sessão de acupuntura', serviceDescription: 'Atendimento individual para dores, estresse e sono.', headline: 'Terapias integrativas para estresse, dor e sono.' },
  },
  educacao_fisica: {
    id: 'educacao_fisica', label: 'Educador Físico', title: 'Educador(a) físico(a)', council: 'CREF', specialtyLabel: 'Especialidade',
    specialties: ['Personal trainer', 'Musculação', 'Treinamento funcional', 'Pilates', 'Corrida', 'Treinamento esportivo', 'Exercício para idosos', 'Condicionamento e reabilitação', 'Ginástica laboral', 'Natação e hidroginástica', 'Yoga'],
    categories: ['Emagrecimento', 'Ganho de massa muscular', 'Condicionamento físico', 'Saúde do idoso', 'Postura e mobilidade', 'Preparação para corrida', 'Performance esportiva', 'Gestação e pós-parto', 'Qualidade de vida', 'Treino em casa'],
    sessionNoun: 'aula',
    examples: { concern: 'quero perder peso e ganhar disposição, mas não consigo manter uma rotina de treinos.', expectation: 'treinar com acompanhamento e ver resultado sem me machucar.', serviceName: 'Personal trainer', serviceDescription: 'Treino individual planejado para o seu objetivo, presencial ou online.', headline: 'Treino personalizado para emagrecer, ganhar força e cuidar da saúde.' },
  },
};

export const PROFESSION_LIST = Object.values(PROFESSIONS);
