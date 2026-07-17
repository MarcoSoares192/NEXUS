# Nexus ERP — configurar e publicar

## 1. Rodar o complemento de schema
No SQL Editor do Supabase, rode também `supabase_schema_addendum.sql` (cria a tabela `configuracoes`, usada pelo saldo inicial do fluxo de caixa). O `supabase_schema.sql` original você já rodou.

## 2. Conectar o app ao seu projeto
Abra `js/00b-supabase.js` e preencha as duas linhas do topo com os dados de **Project Settings → API**:
```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```
A anon key é pública por design (é o que o navegador do usuário usa) — quem protege os dados é o RLS que já está habilitado em todas as tabelas, exigindo login.

## 3. Criar os usuários que vão acessar o app
Vá em **Authentication → Users → Add user** no painel do Supabase e crie um e-mail/senha para cada pessoa que vai usar o sistema (você, sócios, quem mais precisar). O app agora exige login (tela nova antes do dashboard) — sem isso, ninguém consegue ler nem gravar nada, mesmo com a anon key em mãos.

## 4. Subir pro GitHub
```bash
cd nexus-erp
git init
git add .
git commit -m "ERP conectado ao Supabase"
git remote add origin <URL-do-seu-repo-no-GitHub>
git push -u origin main
```

## 5. Publicar na Vercel
Na Vercel: **Add New → Project → Import** o repositório do GitHub. Como é um site estático (sem build step), pode deixar tudo em branco em "Build & Output Settings" — a Vercel serve o `index.html` direto. Não precisa configurar nenhuma env var, pois a URL/key do Supabase já estão no arquivo `js/00b-supabase.js`.

## O que mudou no código
- `js/00b-supabase.js` (novo) — cliente Supabase + camada de dados que traduz os nomes de campo do app (camelCase) para as colunas do banco (snake_case).
- `js/00c-auth.js` (novo) — tela de login e logout via Supabase Auth.
- `js/01-config-estado.js` — não usa mais `localStorage`; `carregarTudoDoBanco()` busca tudo do Supabase na abertura do app.
- `04-crud.js`, `11-checklists.js`, `12-cotacoes.js`, `13-empresas.js`, `09-fluxo-dre.js` — cada `salvar/excluir/toggle` agora grava direto no Supabase em vez de reescrever um blob no localStorage.
- `14-demo-import-export.js` — "Carregar exemplo" e "Limpar tudo" passaram a operar no banco. **Importar backup JSON foi desativado** (um JSON do protótipo local não tem os relacionamentos válidos para o banco relacional — me chame se precisar restaurar um backup antigo, preparo um script pontual para isso).

## Limitação conhecida
O contador de código de cotação (`cotacao_contadores`) faz leitura-depois-escrita simples — perfeitamente ok pra um time pequeno usando um de cada vez, mas se duas pessoas gerarem uma cotação da mesma empresa no exato mesmo segundo, existe uma chance mínima de colisão de número. Se isso virar um problema real no dia a dia, dá pra resolver com uma função de banco atômica — é uma mudança pequena.
