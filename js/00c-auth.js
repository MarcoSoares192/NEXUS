// ============================================================
// AUTENTICAÇÃO (Supabase Auth) — protege o acesso às tabelas via RLS.
// Sem login, nenhuma leitura/escrita é permitida (policies exigem "authenticated").
// ============================================================

let sessaoAtual = null;

const LOGIN_DOMINIO = '@nexusgroup-trading.com';
const LOGIN_LS_KEY = 'nexus_erp_login_salvo';

function lerLoginSalvo(){
  try{ const raw = localStorage.getItem(LOGIN_LS_KEY); if(!raw) return null; return JSON.parse(decodeURIComponent(escape(atob(raw)))); }
  catch(e){ return null; }
}
function gravarLoginSalvo(usuario, senha){
  try{ localStorage.setItem(LOGIN_LS_KEY, btoa(unescape(encodeURIComponent(JSON.stringify({u:usuario,s:senha}))))); }catch(e){}
}
function apagarLoginSalvo(){ try{ localStorage.removeItem(LOGIN_LS_KEY); }catch(e){} }

function renderLogin(erro){
  const app = document.getElementById('app');
  const salvo = lerLoginSalvo();
  app.innerHTML = `
    <div style="width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1420;">
      <div class="card" style="width:360px;padding:30px 28px;">
        <div style="text-align:center;margin-bottom:20px;">
          <img src="${LOGO_NEXUS_DATA_URL}" alt="Nexus Group Trading" style="max-width:220px;max-height:90px;object-fit:contain;">
        </div>
        <div class="small-muted" style="margin-bottom:16px;text-align:center;">Acesso restrito — entre com seu login e senha.</div>
        ${erro? `<div style="background:#fee2e2;color:#991b1b;padding:8px 10px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">${esc(erro)}</div>` : ''}
        <form id="loginForm" onsubmit="event.preventDefault(); fazerLogin();" autocomplete="on">
          <div class="field"><label>Login</label><input type="text" id="loginUsuario" name="username" autocomplete="username" autocapitalize="characters" required value="${salvo? esc(salvo.u) : ''}"></div>
          <div class="field"><label>Senha</label><input type="password" id="loginSenha" name="password" autocomplete="current-password" required value="${salvo? esc(salvo.s) : ''}"></div>
          <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px;color:#6b7280;margin:4px 0 10px;cursor:pointer;">
            <input type="checkbox" id="loginLembrar" ${salvo?'checked':''}> Salvar login e senha neste computador
          </label>
          <button class="btn btn-primary" type="submit" style="width:100%;margin-top:6px;">Entrar</button>
        </form>
      </div>
    </div>
  `;
}

async function fazerLogin(){
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const lembrar = document.getElementById('loginLembrar').checked;
  const email = (usuario.includes('@') ? usuario : usuario.toLowerCase() + LOGIN_DOMINIO);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if(error){ renderLogin(/invalid/i.test(error.message) ? 'Login ou senha incorretos.' : error.message); return; }
  if(lembrar) gravarLoginSalvo(usuario, senha); else apagarLoginSalvo();
  sessaoAtual = data.session;
  await iniciarApp();
}

async function sairApp(){
  await sb.auth.signOut();
  sessaoAtual = null;
  renderLogin();
}

async function iniciarApp(){
  const app = document.getElementById('app');
  app.innerHTML = `<div style="width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#9aa4bd;">Carregando dados...</div>`;
  try{
    await carregarTudoDoBanco();
    await reconciliarContasAPagar();
    await reconciliarContasAReceber();
    render();
  }catch(e){
    app.innerHTML = `<div style="width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#991b1b;padding:20px;text-align:center;">Erro ao carregar dados do banco: ${esc(e.message)}</div>`;
  }
}

async function bootstrap(){
  const { data } = await sb.auth.getSession();
  sessaoAtual = data.session;
  if(sessaoAtual){ await iniciarApp(); }
  else{ renderLogin(); }
}

bootstrap();
