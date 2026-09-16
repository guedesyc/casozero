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

## Integrações futuras

`.env.example` indica as variáveis esperadas para OpenAI e Supabase. Nenhuma chave, documento real ou dado sensível é usado neste MVP. O upload atual é apenas uma interface de experiência; armazenamento seguro, autenticação, LGPD definitiva e notificações devem ser implementados no backend antes do uso em produção.
