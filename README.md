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
| **GitHub Pages** | Obsoleto, não usado em produção; o workflow falha a cada push e pode ser removido |
| **CDN da Hostinger** | Se o site travar em "Carregando…" depois de publicar, limpe o cache em hPanel → Desempenho → CDN (já houve arquivo JS guardado cortado) |

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
4. **Solicitações.** A profissional confirma, sugere outro horário ou recusa. O WhatsApp do paciente abre com a mensagem pronta e o **link de acompanhamento** (`/r/<token>`, aleatório e fora dos buscadores).
   - **Sinal por PIX:** com chave PIX em Conta → Dados de acesso, confirmar deixa o pedido em **Aguardando pagamento**. A mensagem leva o valor e a chave. No link, o paciente toca em "Já paguei", o que avisa a profissional no WhatsApp. Ela clica em **Confirmar pagamento**, o pedido vira "Triagem marcada" e o paciente recebe "tudo confirmado" no WhatsApp.
   - **Horário sugerido:** a mensagem explica o imprevisto. Pelo link, o paciente aceita a sugestão ou escolhe outro dia no calendário.
5. **Resultado da triagem.** As anotações viram a página "Triagem" da caderneta. Se o atendimento continua, ela define o horário fixo (semanal ou quinzenal) e as sessões dos próximos 90 dias entram na agenda, renovadas sozinhas. Dias bloqueados ficam sem sessão.
6. **Caderneta.** Uma página por sessão (Sessão 1, Sessão 15…), com anotações e uma linha de evolução.
7. **Evolução.** Linha do tempo de todas as sessões, com busca e "Baixar PDF". Cada abertura, edição e PDF fica no registro de acesso, visto em "Triagem e dados".
8. **Admin** (`/admin`). Painel da plataforma, só leitura, com código do Google Authenticator. Mostra o funil, as pendências e a tabela das profissionais.

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
| | `/admin` painel da plataforma (só leitura; só contas em `platform_admins`, com código do Google Authenticator) |

## Planos

Todos os recursos estão em todos os planos (`src/config/plans.ts`).

- **Grátis:** até 5 pacientes no total. Dar alta ou pausar não libera vaga (regra também no banco).
- **Profissional:** R$ 49,90/mês, sem limite.
- **Clínica:** R$ 39,90/mês por profissional (mínimo 2, máximo 100), com agenda compartilhada e secretária que vê só a agenda. **Atenção:** a equipe ainda é só uma lista; logins de colegas e da secretária não existem (ver Pendências).

Os preços de teste da Stripe ficam como padrão em `src/config/stripe.ts` e só valem com chave de teste. Com chave de produção (`sk_live_` ou a restrita `rk_live_`), o servidor precisa de `STRIPE_PRICE_PROFISSIONAL` e `STRIPE_PRICE_CLINICA`. Cada evento do webhook é gravado em `stripe_webhook_events` e aplicado uma vez só; se o banco falhar, a resposta é erro e a Stripe tenta de novo. Trocar de plano altera a assinatura existente, sem criar outra; voltar ao Grátis cancela no fim do período. O webhook trata `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.

## Banco de dados (Supabase)

O esquema completo está em `supabase/schema-saude.sql`. Rode no SQL Editor do projeto "Caso Zero"; o script pode ser executado de novo sem efeito colateral.

- **Tabelas:** `professionals`, `triage_requests`, `patients`, `appointments`, `session_notes`, `note_access_log` (quem abriu, criou, editou ou exportou a caderneta; só se acrescenta), `subscriptions` e `stripe_webhook_events` (Stripe), `platform_admins` (quem acessa o `/admin`; hoje só guedesymc@gmail.com). O `/admin` lê tudo pela função `admin_overview`, que exige sessão com código do autenticador (aal2) e devolve dos pacientes só contagens. Acesso livre sem Stripe: linha ativa em `subscriptions` sem `stripe_subscription_id` (aparece como cortesia).
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
  components/admin/       painel da plataforma (/admin)
  app/r/[token]/          link de acompanhamento do paciente
supabase/
  schema-saude.sql        tabelas, RLS, grants, funções públicas e armazenamento
  email-templates/        e-mails de confirmação e redefinição em português
```

## Segurança (auditoria de 27/10/2026)

Testado contra o banco e o site publicado, como visitante sem login, como profissional e como admin.

- **Visitante sem login:**
  - não lê nem grava nenhuma tabela (nem `subscriptions` para virar pago, nem `platform_admins`);
  - não chama as funções internas ou de admin;
  - token falso no link do paciente não devolve nada;
  - injeção de SQL no link público não tem efeito;
  - não envia arquivo nem lista fotos.
- **Página pública:** devolve só o perfil. Nada de e-mail, telefone, PIX ou configurações da conta, e os horários ocupados vão sem nomes.
- **Pedido de triagem:** valida horário, antecedência e bloqueios. Limita a 2 pedidos pendentes por telefone e a 100 por profissional, e trava pedidos simultâneos.
- **Profissional:**
  - não vê dados de outra conta;
  - não apaga paciente nem caderneta;
  - não grava atendimento sobreposto;
  - não escreve a própria assinatura;
  - não usa imagem de fora nem a pasta de outra pessoa.
- **Registro de acesso à caderneta:** não pode ser editado nem apagado.
- **Admin (`/admin`):** exige estar em `platform_admins` e o código do autenticador na sessão (aal2). Sem isso, nem a conta de admin recebe os dados.
- **Stripe:**
  - o webhook recusa chamada sem assinatura válida e não processa duas vezes o mesmo evento;
  - o checkout exige login e só volta para o próprio site;
  - a chave de produção é restrita (sem repasses nem transferências);
  - nenhum segredo aparece nos arquivos JavaScript públicos.
- **Site:**
  - cabeçalhos HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`;
  - `.env`, `.git` e o SQL dão 403;
  - o login só redireciona para caminhos do próprio site.
- **Avisos do Supabase (Security Advisor):** 0 erros. Os avisos sobre funções `SECURITY DEFINER` são a API pública planejada; cada uma valida o que recebe. A proteção contra senhas vazadas só existe no plano Pro.
- **Navegador:** cópias antigas de pacientes e caderneta guardadas no navegador são apagadas quando a conta entra.

## Pendências e próximos passos

Antes de divulgar:
- [ ] **Política de privacidade e termos de uso** (`/privacidade`, `/termos`), com aceite no cadastro. O sistema guarda dado de saúde, que a LGPD trata como dado sensível.
- [ ] **Plano Clínica:** a equipe ainda não funciona de verdade. Não há convites, logins de colegas nem de secretária, e em contas reais a agenda compartilhada fica vazia. Até existir, tirar o Clínica da venda ou marcar como "em breve".
- [ ] **Aviso de pedido novo para a profissional** (e-mail). Hoje ela só vê o pedido quando abre o painel.
- [ ] **Supabase:** senha mínima 8 com letras e números (Authentication → Sign In / Providers → Email). Corrigir o Site URL para `https://casozero.com.br`, sem `/**`.
- [ ] **Backups:** o plano grátis do Supabase não tem backup automático e pausa projetos parados. Para guardar prontuário, o plano Pro dá backup diário e proteção contra senhas vazadas.

Depois:
- [ ] Resumo diário da agenda e lembrete ao paciente.
- [ ] Pedidos novos em tempo real (hoje o painel busca ao voltar para a aba).
- [ ] Testar o webhook de produção no primeiro pagamento real (Stripe → Workbench → Webhooks → `casozero-producao`).
- [ ] Remover o workflow obsoleto do GitHub Pages (`.github/workflows/deploy-pages.yml`), que falha a cada push.
