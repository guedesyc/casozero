import type { Metadata } from 'next';
import { CONTACT_EMAIL, LegalPage, LegalSection } from '@/components/ui/legal';

export const metadata: Metadata = { title: 'Política de privacidade | CasoZero' };

export default function PrivacyPage() {
  return <LegalPage eyebrow="LGPD" title="Política de privacidade" intro={<>
    <p>O CasoZero é um sistema de agendamento, agenda e caderneta de sessões para profissionais da saúde que atendem por conta própria. Esta política explica quais dados tratamos, para quê, com quem compartilhamos e como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
  </>}>
    <LegalSection title="1. Quem é responsável por cada dado">
      <ul>
        <li><b>Dados das profissionais</b> (quem cria conta no CasoZero): o CasoZero é o <b>controlador</b>.</li>
        <li><b>Dados dos pacientes</b> (pedido de triagem, agenda e caderneta): a <b>profissional</b> que atende é a controladora, porque é ela quem decide como usar esses dados no atendimento. O CasoZero é o <b>operador</b>: guarda e processa esses dados só para prestar o serviço à profissional, conforme as instruções dela.</li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Dados que tratamos">
      <p><b>Da profissional:</b> nome, e-mail, celular, senha (guardada de forma irreversível), profissão, especialidades, demandas atendidas, registro no conselho, cidade, foto, capa, textos da página pública, serviços e preços, horários de atendimento, chave PIX e valor do sinal (quando informados), plano contratado e registros de acesso. Os dados do cartão de crédito são informados direto à Stripe e não passam pelo CasoZero.</p>
      <p><b>Do paciente:</b> nome, idade, telefone, nome do responsável (se menor de idade), o que procura tratar e o que espera do atendimento, modalidade, horários pedidos e marcados, aviso de pagamento do sinal e as anotações e registros de evolução que a profissional escreve na caderneta. Esses dados incluem <b>dados sobre a saúde</b>, que a LGPD trata como dados pessoais sensíveis.</p>
      <p><b>De uso:</b> data de cadastro e do último acesso, e quem abriu, criou, editou ou exportou cada caderneta.</p>
    </LegalSection>

    <LegalSection title="3. Para que usamos e com qual base legal">
      <ul>
        <li><b>Criar e manter a conta da profissional, cobrar a assinatura e dar suporte:</b> execução do contrato (art. 7º, V).</li>
        <li><b>Receber o pedido de triagem do paciente e repassá-lo à profissional:</b> consentimento do paciente, dado no formulário antes do envio (art. 11, I). A profissional usa esses dados também para a tutela da saúde (art. 11, II, f).</li>
        <li><b>Guardar a caderneta:</b> tutela da saúde, por profissional da saúde (art. 11, II, f), e cumprimento das obrigações de guarda de prontuário do conselho de cada profissão (art. 11, II, a).</li>
        <li><b>Segurança, prevenção a fraude e registro de acesso:</b> legítimo interesse (art. 7º, IX).</li>
      </ul>
      <p>Não vendemos dados, não usamos dados de pacientes para publicidade e não usamos o conteúdo da caderneta para nenhum fim além de guardá-lo e exibi-lo para a profissional.</p>
    </LegalSection>

    <LegalSection title="4. Com quem compartilhamos">
      <ul>
        <li><b>Supabase:</b> banco de dados, login e armazenamento de fotos.</li>
        <li><b>Hostinger:</b> hospedagem do site e envio de e-mails.</li>
        <li><b>Stripe:</b> cobrança das assinaturas.</li>
        <li><b>WhatsApp:</b> as mensagens para o paciente são abertas no WhatsApp da própria profissional, que decide enviá-las.</li>
      </ul>
      <p>Esses fornecedores tratam os dados só para prestar o serviço ao CasoZero e podem manter servidores fora do Brasil, com as garantias previstas no art. 33 da LGPD. Também podemos fornecer dados quando a lei ou uma ordem judicial exigir.</p>
    </LegalSection>

    <LegalSection title="5. Como protegemos">
      <ul>
        <li>Conexão sempre criptografada (HTTPS).</li>
        <li>Cada profissional só acessa os próprios dados; isso é garantido no banco, não só na tela.</li>
        <li>A página pública mostra só o perfil da profissional e os horários ocupados, sem nomes de pacientes.</li>
        <li>O link de acompanhamento do paciente é aleatório e não aparece em buscadores.</li>
        <li>Pacientes e caderneta não podem ser apagados pelo sistema, e cada acesso à caderneta fica registrado.</li>
        <li>O acesso administrativo exige senha e código de verificação em duas etapas, e mostra dos pacientes só números.</li>
      </ul>
    </LegalSection>

    <LegalSection title="6. Por quanto tempo guardamos">
      <ul>
        <li><b>Conta da profissional:</b> enquanto estiver ativa. Depois do pedido de exclusão, apagamos em até 90 dias, salvo o que a lei obriga a manter.</li>
        <li><b>Dados de pacientes e caderneta:</b> enquanto a conta da profissional existir. A guarda do prontuário pelo prazo exigido pelo conselho (por exemplo, 5 anos na psicologia) é responsabilidade da profissional, que pode baixar a evolução em PDF e o relatório dos pacientes antes de encerrar a conta.</li>
        <li><b>Registro de acesso à caderneta:</b> enquanto a conta da profissional existir.</li>
      </ul>
    </LegalSection>

    <LegalSection title="7. Seus direitos">
      <p>Você pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação do consentimento (art. 18 da LGPD).</p>
      <ul>
        <li><b>Profissionais:</b> peça pelo e-mail <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Parte disso você mesma faz no painel, em Conta.</li>
        <li><b>Pacientes:</b> como a profissional é a controladora dos seus dados, fale primeiro com ela. Se precisar, escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> e encaminhamos o pedido.</li>
      </ul>
      <p>Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
    </LegalSection>

    <LegalSection title="8. Cookies e armazenamento no navegador">
      <p>Usamos só o armazenamento necessário para manter você conectada e lembrar preferências da tela. Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.</p>
    </LegalSection>

    <LegalSection title="9. Menores de idade">
      <p>Pedidos de triagem para menores de 18 anos exigem o nome do responsável, que deve acompanhar o envio. As contas de profissional são só para maiores de 18 anos.</p>
    </LegalSection>

    <LegalSection title="10. Mudanças nesta política">
      <p>Se esta política mudar, publicamos a nova versão aqui, com a data no topo. Mudanças importantes são avisadas às profissionais por e-mail.</p>
    </LegalSection>
  </LegalPage>;
}
