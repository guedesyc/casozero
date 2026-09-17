# CasoZero

MVP de uma plataforma de pré-atendimento inteligente para advogados. O potencial cliente acessa o link público do escritório, descreve seu caso em uma conversa breve e o advogado recebe um caso estruturado no painel.

## Tecnologias

- Next.js, React e TypeScript
- Interface responsiva com CSS e componentes reutilizáveis
- `localStorage` para persistência local no MVP
- `MockAIService` isolado para simular a condução da entrevista

## Como executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000/muriloguedes`. O painel está disponível em `http://localhost:3000/app`.

## Fluxo demonstrável

1. Consentir e iniciar o pré-atendimento público.
2. Responder à conversa do CasoZero.
3. Ao concluir, um novo caso é salvo localmente.
4. Abrir o painel para visualizar, analisar e alterar o status do caso.

## Arquitetura

```
src/
  app/          rotas Next.js
  components/   experiências pública e do advogado
  mocks/        dados fictícios
  services/     contratos de dados e IA mockada
  types/        tipos de domínio
```

Componentes acessam dados por `services/cases.ts`; os mocks não estão acoplados à interface. Para integrar Supabase, substitua a implementação de `casesService` por chamadas à API. Para IA real, implemente um `OpenAIAIService` no lugar de `mockAIService` e chame-o somente por um endpoint de servidor, como `POST /api/interview/message`.

O endpoint `POST /api/interview/message` já existe como fronteira segura e usa o mock enquanto não houver credencial de provedor configurada. A troca para IA real deve acontecer dentro dessa rota, mantendo a chave exclusivamente no servidor.

## Validação no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente a versão estática a cada push na branch `master`. Depois de habilitar **Settings → Pages → Source: GitHub Actions** no repositório, a demonstração ficará disponível em `https://guedesyc.github.io/casozero/`. A versão Pages usa mocks e `localStorage`; endpoints de API e Firebase entram quando houver hospedagem com servidor.

## Planos e operação

Os planos estão centralizados em `src/config/plans.ts`: CasoUm (50 atendimentos), CasoDois (200) e CasoTres (1.000 e até 10 advogados). A assinatura usa dados demonstrativos e está disponível em `/app/configuracoes/assinatura`. Os fluxos de equipe, caixa de entrada e analytics do CasoTres ficam em `/app/equipe`, `/app/caixa-de-entrada` e `/app/analytics`. Nenhuma tela realiza cobrança real.

## Integrações futuras

`.env.example` indica as variáveis esperadas para OpenAI e Supabase. Nenhuma chave, documento real ou dado sensível é usado neste MVP. O upload atual é apenas uma interface de experiência; armazenamento seguro, autenticação, LGPD definitiva e notificações devem ser implementados no backend antes do uso em produção.
