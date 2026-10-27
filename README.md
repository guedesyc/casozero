# CasoZero

Agendamento de triagem, agenda e caderneta de sessões para profissionais da saúde que atendem por conta própria: psicologia, psicanálise, fisioterapia, fonoaudiologia, nutrição, terapia ocupacional, psicopedagogia e terapias integrativas.

O paciente acessa a página do profissional, conta o que procura tratar e pede um horário de triagem. A profissional confirma, faz a triagem, define o horário fixo dos atendimentos e registra cada sessão numa caderneta, que forma a evolução do paciente.

## Onde está cada coisa

| Serviço | Detalhe |
|---|---|
| **Código** | GitHub `guedesyc/casozero`, branch `master` |
| **Site no ar** | `casozero.com.br`, na Hostinger (Node.js). A Hostinger publica sozinha cada push na `master`, em cerca de 2 minutos |
| **Banco e login** | Supabase, projeto **"Caso Zero"**, ref `rlxaninumfevbectpbub`. O projeto do Tá Marcado (`hifxnpoobgtxoifdsvtz`) é outro e fica na mesma organização: não mexer nele por engano |
| **Pagamentos** | Stripe, conta "CasoZero" (separada do Tá Marcado). Produção: Profissional `price_1UV1XqRFq8zWjSshhFu3jAsy`, Clínica `price_1UV1YGRFq8zWjSshNwnFxL1y`, webhook `casozero-producao` em `https://casozero.com.br/api/stripe/webhook`. Testes: "Área restrita de CasoZero" |
| **E-mails de login** | SMTP da Hostinger, remetente `contato@casozero.com.br`. Modelos em português em `supabase/email-templates/` (colados no Supabase em Authentication → Emails) |
| **GitHub Pages** | Só vitrine estática; não é usado em produção |

## Como executar

```bash
npm install
npm run dev
```

- **Sem `.env.local`: modo demonstração.** Não pede login e os dados ficam no `localStorage` do navegador. Começa com a psicóloga fictícia de `src/mocks/data.ts` (`http://localhost:3000/anaclara`), com pedidos, pacientes e sessões já registradas. O botão "Restaurar exemplo" volta ao início.
- **Com `.env.local`: conta real.** Copie `.env.example` e preencha URL e chave publicável do Supabase, chaves de teste da Stripe e, se quiser, os preços. Cadastro, login, dados e checkout passam a usar Supabase e Stripe. O `.env.local` não vai para o Git.
- **Validar:** `npm run lint` e `npm run build`.

## Fluxo

1. **Cadastro.** Nome, e-mail, celular (WhatsApp) e senha. Depois: profissão, abordagem ou especialidade (ex.: Psicologia → Psicanálise) e as demandas atendidas (ex.: Família, Luto). O catálogo fica em `src/config/professions.ts`. A conta só funciona depois de confirmar o e-mail.
2. **Página pública** (`/<slug>`). Foto, capa, descrição, biografia, serviços (com "Triagem · R$ …") e demandas, com o botão **Marcar consulta!**.
3. **Pedido de triagem** (`/<slug>/agendar`, ou `/<slug>/agendar/<demanda>` com o assunto já escolhido). O paciente conta o que procura tratar e o que espera, informa nome, idade e telefone (e o responsável, se for menor) e escolhe um horário livre.
4. **Solicitações.** A profissional confirma, marca outro horário ou recusa. Um botão abre o WhatsApp com a confirmação pronta.
5. **Resultado da triagem.** As anotações viram a página "Triagem" da caderneta. Se o atendimento continua, ela define o horário fixo (semanal ou quinzenal) e as sessões dos próximos 90 dias entram na agenda, renovadas sozinhas. Dias bloqueados ficam sem sessão.
6. **Caderneta.** Uma página por sessão (Sessão 1, Sessão 15…), com anotações e uma linha de evolução.
7. **Evolução.** Linha do tempo de todas as sessões, com busca e "Baixar PDF".

Nenhuma marcação se sobrepõe a outra. O app checa antes de salvar (`findConflict`, em `src/services/scheduling.ts`) e o banco recusa sobreposição de qualquer forma.

## Rotas

| Público | Painel |
|---|---|
| `/` apresentação | `/app` visão geral (inclui triagens e sessões sem registro) |
| `/precos` planos | `/app/solicitacoes` pedidos de triagem |
| `/cadastro` cadastro em 2 etapas + confirmação de e-mail | `/app/agenda` calendário |
| `/cadastro/confirmado` recebe o link de confirmação | `/app/pacientes` lista, caderneta e evolução |
| `/login`, `/esqueci-senha`, `/redefinir-senha` | `/app/disponibilidade` horários, durações, bloqueios |
| `/<slug>` página do profissional | `/app/pagina` foto, capa, serviços, biografia, texto do agendamento |
| `/<slug>/agendar` pedido de triagem (não indexado) | `/app/perfil` profissão e demandas |
| | `/app/meu-link` link, QR Code e links por demanda |
| | `/app/equipe` equipe (plano Clínica) |
| | `/app/configuracoes/assinatura` plano e uso |
| | `/app/configuracoes` dados de acesso e relatório dos pacientes |

## Planos

Todos os recursos estão em todos os planos (`src/config/plans.ts`).

- **Grátis:** até 5 pacientes no total. Dar alta ou pausar não libera vaga (regra também no banco).
- **Profissional:** R$ 49,90/mês, sem limite.
- **Clínica:** R$ 39,90/mês por profissional (mínimo 2, máximo 100), com agenda compartilhada e secretária que vê só a agenda.

Os preços de teste da Stripe ficam como padrão em `src/config/stripe.ts` e só valem com chave de teste. Com chave de produção (`sk_live_`), o servidor precisa de `STRIPE_PRICE_PROFISSIONAL` e `STRIPE_PRICE_CLINICA`. Cada evento do webhook é gravado em `stripe_webhook_events` e aplicado uma vez só; se o banco falhar, a resposta é erro e a Stripe tenta de novo. Trocar de plano altera a assinatura existente, sem criar outra; voltar ao Grátis cancela no fim do período. O webhook trata `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.

## Banco de dados (Supabase)

O esquema completo está em `supabase/schema-saude.sql`. Rode no SQL Editor do projeto "Caso Zero"; o script pode ser executado de novo sem efeito colateral.

- **Tabelas:** `professionals`, `triage_requests`, `patients`, `appointments`, `session_notes`, `note_access_log` (quem abriu, criou, editou ou exportou a caderneta; só se acrescenta), `subscriptions` e `stripe_webhook_events` (Stripe).
- **Acesso:** RLS em todas; cada profissional só lê e grava o que é seu. Permissões (GRANT) explícitas em cada tabela, como o Supabase exige para tabelas novas a partir de 30/10/2026.
- **Visitante anônimo:** sem acesso a tabelas. A página pública usa só `get_public_profile` (sem e-mail, telefone ou motivo de bloqueio), `get_busy_slots` (horários sem nomes) e `submit_triage_request`. Esta valida horário, janela do dia, bloqueios, antecedência, horizonte e limite de 2 pedidos pendentes por telefone.
- **Regras no banco:**
  - atendimentos sobrepostos são recusados;
  - o Grátis aceita até 5 pacientes;
  - o endereço do link é único e não pode usar palavras do sistema (`app`, `login`, …);
  - foto e capa só aceitam o armazenamento `perfis` do próprio projeto;
  - assinaturas só são gravadas pelo webhook.
- **Prontuário:** pacientes, pedidos e caderneta não podem ser apagados pelo app.
- **Fotos:** bucket público `perfis` (até 2 MB, JPG/PNG/WebP). Cada profissional grava só na própria pasta, e a imagem antiga é apagada ao trocar.

No app, `src/services/remote.ts` converte os dados e grava só o que mudou, e `src/services/clinic.ts` mantém o mesmo estado e as mesmas operações nos dois modos (Supabase e demonstração). As telas não sabem de onde vêm os dados.

## Arquitetura

```
src/
  app/                    rotas (Next.js App Router)
  config/professions.ts   profissões, abordagens, demandas e exemplos de texto
  config/plans.ts         planos e formatação de valores
  config/stripe.ts        preços da Stripe
  services/clinic.ts      estado e operações (pedido, confirmação, triagem, recorrência, caderneta)
  services/remote.ts      leitura e gravação no Supabase
  services/scheduling.ts  horários livres, conflitos e datas recorrentes
  components/public/      página do profissional e pedido de triagem
  components/panel/       telas do painel
  components/ui/          calendário, seletor de profissão, confirmação de e-mail, marca
supabase/
  schema-saude.sql        tabelas, RLS, grants, funções públicas e armazenamento
  email-templates/        e-mails de confirmação e redefinição em português
```

## Segurança (revisada na migração para o Supabase)

- **Testado como visitante:** não lê nem grava tabelas; não burla as regras do pedido.
- **Testado como profissional:**
  - não vê dados de outra conta;
  - não apaga paciente nem caderneta;
  - não grava atendimento sobreposto, nem pela tela nem direto no banco;
  - não escreve a própria assinatura;
  - não usa imagem de fora nem a pasta de outra pessoa.
- **Cabeçalhos de segurança:** em `next.config.ts` (impede abrir o site dentro de outro, entre outros).
- **Navegador:** cópias antigas de pacientes e caderneta guardadas no navegador são apagadas quando a conta entra.

## Pendências e próximos passos

- [ ] **Senha mínima no Supabase:** hoje 6; o app pede 8. Em Authentication → Sign In / Providers → Email, usar 8 e "Letters and digits".
- [ ] **Proteção contra senhas vazadas:** só no plano Pro do Supabase.
- [ ] **Avisos automáticos:** novo pedido por e-mail, resumo diário da agenda e lembrete por WhatsApp. Foram tirados da tela até existirem de verdade.
- [ ] **Plano Clínica com vários logins:** convites, colegas e secretária com acesso próprio. Hoje a equipe é só uma lista salva.
- [ ] **Pedidos novos em tempo real:** hoje o painel busca novidades ao voltar para a aba.
- [ ] **Stripe em produção:** produtos e webhook já criados; falta colocar na Hostinger `STRIPE_SECRET_KEY` (sk_live), `STRIPE_WEBHOOK_SECRET` do webhook `casozero-producao`, `STRIPE_PRICE_PROFISSIONAL` e `STRIPE_PRICE_CLINICA`.
- [ ] **LGPD:** política de privacidade e termos de uso publicados, e registro de acesso à caderneta.
