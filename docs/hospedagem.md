# Hospedagem (HTTPS gratuito)

O app é estático e fica no GitHub Pages, que já faz parte do repositório dela e não exige conta nova.
O arquivo `.github/workflows/publicar.yml` roda os testes, constrói o app e publica a cada alteração na branch `main`.

Ajuste único, feito por ela no GitHub:
1. Abrir o repositório `planner`, aba Settings, menu Pages.
2. Em "Build and deployment", escolher Source: "GitHub Actions".

O endereço será `https://xisaribeiro.github.io/planner/`. O app usa caminhos relativos e roteamento por hash, então funciona nesse subcaminho.
Esse endereço será usado como URL de retorno do login com Google no Supabase (fase 2) e é o que ela instala na tela inicial.

Observação: o GitHub Pages não lê `public/_headers`. Por isso o build também coloca a política de segurança (CSP) no HTML, a partir do mesmo arquivo.
O repositório é público, então nenhum segredo entra nele. Os dados dela ficam no Supabase, protegidos por login e RLS.
