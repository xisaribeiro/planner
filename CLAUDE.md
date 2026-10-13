# Planner da Isabelle

App web instalável (PWA), offline first, em português do Brasil. Vite + TypeScript, sem framework de interface.
O briefing completo e aprovado por ela é o prompt que originou o projeto. Em caso de dúvida entre o esboço (`esboco/`) e o briefing, vale o briefing.

## Regras de ouro
- Começa vazio. Nunca inventar conteúdo nem deixar dado de exemplo. O único conteúdo que já nasce no app é o da seção 13 do briefing.
- Nenhum uso de IA em tempo de execução. Todo texto automático sai de regras e bancos de frases no código.
- Todo texto que ela vê mora em `src/strings.ts`. Sem travessão (U+2014, U+2013) e sem ponto e vírgula nos textos. Um teste confere.
- Linguagem de palavras nas análises: sem porcentagem nem número solto nos textos de análise.
- O Google Calendar só é lido, nunca escrito. O planner não envia notificações.
- Só o projeto Supabase `planner-isabelle` (ref `zvrofbqtoijtvmdleurp`) pode ser tocado. Segredos nunca vão para o front nem para o repositório.
- Ela não programa. Quando precisar de uma ação dela, explicar passo a passo, uma de cada vez.

## Estrutura
- `src/` um módulo por assunto: `dates` (fuso America/Sao_Paulo, semana de domingo), `strings`, `router` (hash), `theme`, `tabs`, `db` (IndexedDB, fonte da verdade da tela), `sync` (fila e última escrita vence), `remoto` (Supabase), `auth` (login Google), `ids`, `tipos`. Vêm depois: `grades`, `gcal`, `phrases`.
- `supabase/migrations` esquema e RLS (aplicados no projeto `planner-isabelle`), `supabase/functions/gcal` Edge Function. Dados iniciais da seção 13 NÃO ficam no repositório: são gravados direto no Supabase.
- `src/styles/` tokens, fontes locais, base e estrutura. Cores só por variáveis CSS.
- `dados/` frases do dia, SQLBolt e Power BI. `esboco/` é só referência visual, não vai para o app.
- `tests/unit` (Vitest, regras puras) e `tests/e2e` (Playwright em 390, 820 e 1280, claro e escuro, com a rede cortada).
- `legado/` guarda a versão antiga do planner, só para consulta.

## Comandos
- `npm run dev`, `npm run build`, `npm run preview`
- `npm test` (unitários), `npm run test:e2e` (constrói e roda o preview com a CSP real)
- `npm run icones` regenera os ícones

## Dados e sincronização
- A interface lê e grava só no `BancoLocal`. Nunca esperar a rede. Apagar é marcar `deleted_at`.
- Linhas com chave natural (check de hábito por dia, semana de respiro) usam `idPorChave`, para dois aparelhos não duplicarem.
- Toda tabela nova entra em `tipos.ts` (`MapaDeTabelas` e `TABELAS`, pais antes de filhos), numa migração e na lista da migração de RLS.
- O build `--mode e2e` aceita `localStorage['e2e-usuario']` para simular a conta nos testes. O build de produção não tem esse caminho.

## Convenções
- Datas de calendário são texto `AAAA-MM-DD`, contas de dia em UTC. Nunca `new Date()` direto para "hoje", usar `hojeSP()`.
- CSP estrita (`public/_headers`): sem script nem estilo inline em HTML. Estilos dinâmicos via CSSOM (`style.setProperty`).
- Alvos de toque de pelo menos 40px no celular, foco visível, `prefers-reduced-motion` respeitado.
- Um commit por fase, depois de rodar os testes e olhar as telas nos dois temas.
