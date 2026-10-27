import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LegalPage, LegalSection } from '@/components/ui/legal';

export const metadata: Metadata = { title: 'Termos de uso | CasoZero' };

export default function TermsPage() {
  return <LegalPage eyebrow="Contrato" title="Termos de uso" intro={<>
    <p>Estes termos valem para quem cria conta no CasoZero (a &quot;profissional&quot;) e para quem usa a página pública de uma profissional para pedir atendimento (o &quot;paciente&quot;). Ao criar a conta ou enviar um pedido, você concorda com eles e com a <Link href="/privacidade">Política de privacidade</Link>.</p>
  </>}>
    <LegalSection title="1. O que é o CasoZero">
      <p>O CasoZero é uma ferramenta de organização: página pública com pedido de triagem, agenda, horários fixos, caderneta de sessões e evolução. <b>O CasoZero não presta serviço de saúde</b>, não indica profissionais, não avalia pacientes e não participa do atendimento. Todo atendimento é responsabilidade da profissional.</p>
      <p><b>O CasoZero não é um canal de emergência.</b> Em crise ou risco, procure o SAMU (192), o CVV (188) ou o pronto-socorro mais próximo.</p>
    </LegalSection>

    <LegalSection title="2. Conta da profissional">
      <ul>
        <li>Você precisa ter 18 anos ou mais e ser habilitada para exercer a profissão que informa, incluindo o registro no conselho quando a profissão exigir.</li>
        <li>Os dados do cadastro precisam ser verdadeiros. A senha é pessoal; avise-nos se suspeitar de acesso indevido.</li>
        <li>Cada conta é de uma pessoa. Não compartilhe o acesso.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Responsabilidades da profissional">
      <ul>
        <li>Cumprir o código de ética e as normas do seu conselho, inclusive sobre sigilo, publicidade e prontuário.</li>
        <li>Usar os dados dos pacientes só para o atendimento, como controladora desses dados (veja a Política de privacidade).</li>
        <li>Guardar o prontuário pelo prazo que o conselho exige. O CasoZero guarda a caderneta enquanto a conta existir; antes de encerrar a conta, baixe a evolução em PDF e o relatório dos pacientes.</li>
        <li>Responder pelo conteúdo que publica na página pública e pelas mensagens que envia aos pacientes.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. Pedido de triagem e sinal por PIX">
      <ul>
        <li>O pedido de triagem é uma solicitação: o horário só fica marcado quando a profissional confirma.</li>
        <li>Quando a profissional pede um sinal por PIX, o pagamento é feito direto para a chave dela. <b>O CasoZero não recebe, não intermedeia e não devolve esses valores.</b> Combinados de preço, remarcação e reembolso são entre paciente e profissional.</li>
      </ul>
    </LegalSection>

    <LegalSection title="5. Planos, cobrança e cancelamento">
      <ul>
        <li><b>Grátis:</b> todos os recursos, para até 5 pacientes cadastrados no total. Dar alta ou pausar um paciente não libera vaga.</li>
        <li><b>Planos pagos:</b> cobrança mensal e automática no cartão, pela Stripe, até você cancelar. Os preços estão na página de <Link href="/precos">planos</Link>.</li>
        <li><b>Cancelamento:</b> pelo painel, em Assinatura, a qualquer momento. O plano continua até o fim do período já pago e depois volta para o Grátis. Nenhum dado é apagado ao cancelar.</li>
        <li><b>Arrependimento:</b> você pode desistir da primeira contratação em até 7 dias e receber o valor de volta (Código de Defesa do Consumidor, art. 49), pelo e-mail <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
        <li>Mudanças de preço são avisadas com pelo menos 30 dias de antecedência e valem a partir da cobrança seguinte.</li>
      </ul>
    </LegalSection>

    <LegalSection title="6. Uso proibido">
      <p>Não é permitido usar o CasoZero para atividade ilegal, para se passar por outra pessoa ou profissional, para enviar spam, para tentar acessar dados de outras contas, para sobrecarregar ou atacar o sistema, ou para publicar conteúdo enganoso sobre tratamentos.</p>
      <p>Em caso de violação, podemos suspender ou encerrar a conta, avisando a profissional sempre que possível.</p>
    </LegalSection>

    <LegalSection title="7. Disponibilidade e responsabilidade">
      <ul>
        <li>Trabalhamos para manter o CasoZero no ar e os dados seguros, mas o serviço pode ter interrupções por manutenção ou falhas de fornecedores.</li>
        <li>O CasoZero não responde pelo atendimento, pelas decisões clínicas, pelos combinados entre paciente e profissional nem por pagamentos feitos direto entre eles.</li>
        <li>Nada nestes termos limita direitos que a lei garante ao consumidor.</li>
      </ul>
    </LegalSection>

    <LegalSection title="8. Encerramento da conta">
      <p>Você pode pedir o encerramento da conta pelo e-mail <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Antes, baixe seus dados. Os prazos de exclusão estão na Política de privacidade.</p>
    </LegalSection>

    <LegalSection title="9. Mudanças nos termos">
      <p>Se estes termos mudarem, publicamos a nova versão aqui e avisamos as profissionais por e-mail. Continuar usando o CasoZero depois do aviso significa concordar com a nova versão.</p>
    </LegalSection>

    <LegalSection title="10. Lei e foro">
      <p>Estes termos seguem a lei brasileira. Fica eleito o foro do domicílio do consumidor.</p>
    </LegalSection>
  </LegalPage>;
}
