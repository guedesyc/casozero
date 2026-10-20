# CasoZero (saúde)

Agendamento de triagem, agenda e caderneta de sessões para profissionais da saúde que atendem por conta própria: psicologia, psicanálise, fisioterapia, fonoaudiologia, nutrição, terapia ocupacional, psicopedagogia e terapias integrativas.

Este projeto nasceu do CasoZero jurídico (`guedesyc/casozero`, guardado aqui como o remoto `casozero-juridico`) e reaproveita a base dele: Next.js, login com Supabase e assinatura com Stripe.

## Fluxo

1. **Cadastro.** O profissional escolhe a profissão, a abordagem ou especialidade (ex.: Psicologia → Psicanálise) e as demandas que atende (ex.: Família, Relacionamento, Luto). O catálogo fica em `src/config/professions.ts`.
2. **Link público** (`/<slug>`, ou `/<slug>/<demanda>` para abrir já com o assunto escolhido). O paciente conta o que procura tratar e o que espera do acompanhamento, informa nome, idade e telefone (e o nome do responsável, se for menor de idade) e escolhe a data da triagem num calendário com os horários livres.
3. **Solicitações.** A profissional confirma o horário pedido, marca outro ou recusa. Um botão abre o WhatsApp com a mensagem de confirmação pronta.
4. **Resultado da triagem.** As anotações viram a página “Triagem” da caderneta. Se o atendimento continua, a profissional define o horário fixo (dia, hora, semanal ou quinzenal) e as sessões dos próximos 90 dias entram na agenda, renovadas automaticamente.
5. **Caderneta.** Uma página por sessão (Sessão 1, Sessão 15…), com anotações livres e uma linha de evolução. Sessões que já passaram e ainda não têm registro aparecem destacadas.
6. **Evolução.** Linha do tempo com o que foi escrito em todas as sessões, com busca e impressão.

## Rotas

| Público | Painel |
|---|---|
| `/` apresentação | `/app` visão geral |
| `/precos` planos | `/app/solicitacoes` pedidos de triagem |
| `/cadastro` cadastro em 2 etapas | `/app/agenda` calendário |
| `/login` | `/app/pacientes` lista, caderneta e evolução |
| `/<slug>` link do profissional | `/app/disponibilidade` horários, durações, folgas |
| | `/app/perfil` profissão, demandas, apresentação |
| | `/app/meu-link` link, QR Code e links por demanda |
| | `/app/configuracoes/assinatura` plano e uso |

## Como executar

```bash
npm install
npm run dev
```

Sem `.env.local` o sistema roda em **modo demonstração**: não pede login e os dados ficam no `localStorage` do navegador. A demonstração começa com a psicóloga fictícia de `src/mocks/data.ts` (link `http://localhost:3000/anaclara`), com pedidos, pacientes e 14 sessões já registradas. O botão “Restaurar exemplo” no painel volta ao estado inicial.

Com as variáveis de `.env.example` preenchidas, cadastro, login e checkout usam Supabase e Stripe.

## Arquitetura

```
src/
  config/professions.ts   catálogo de profissões, abordagens e demandas
  config/plans.ts         planos (limite = novas triagens por mês)
  services/clinic.ts      estado e operações (pedido, confirmação, triagem, recorrência, caderneta)
  services/scheduling.ts  horários livres e datas recorrentes
  components/public/      link público
  components/panel/       telas do painel
  components/ui/          calendário de horários e seletor de profissão
```

Todas as operações de `services/clinic.ts` são funções puras sobre `ClinicData`. Para levar ao Supabase basta trocar `loadClinic`/`saveClinic` e essas funções por consultas, sem mexer nas telas.

## Antes de usar com pacientes reais

- **Persistência no Supabase**, com RLS por profissional, em vez do `localStorage`.
- **Dados sensíveis de saúde (LGPD, art. 11).** Consentimento específico (o link já pede), criptografia, registro de acesso e política de privacidade.
- **Guarda do prontuário.** Os conselhos exigem guardar os registros por um prazo mínimo (o CFP, por exemplo, pede pelo menos 5 anos). Por isso a caderneta não deve ter exclusão definitiva.
- **Confirmação ao paciente** por WhatsApp ou e-mail automático. Hoje o envio é manual, pelo botão.
