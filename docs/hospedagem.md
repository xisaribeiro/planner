# Hospedagem (HTTPS gratuito)

O app é estático. Qualquer hospedagem estática com HTTPS serve. A recomendada é o Cloudflare Pages, porque é gratuito, funciona com repositório privado e lê o arquivo `public/_headers` (a política de segurança do app).

Configuração do projeto no Cloudflare Pages:
- Repositório: `xisaribeiro/planner`
- Branch de produção: a branch principal do repositório
- Comando de build: `npm run build`
- Pasta de saída: `dist`
- Variável de ambiente `NODE_VERSION`: `22`

O app usa caminhos relativos e roteamento por hash, então não precisa de regra de redirecionamento.

Depois do primeiro deploy, o endereço (algo como `planner-xxxx.pages.dev`) será usado:
- como URL de retorno do login com Google no Supabase (fase 2),
- como a página que ela instala na tela inicial do iPhone, do iPad e do notebook.
