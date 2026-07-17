// ============================================================
// AUTENTICAÇÃO (Supabase Auth) — protege o acesso às tabelas via RLS.
// Sem login, nenhuma leitura/escrita é permitida (policies exigem "authenticated").
// ============================================================

let sessaoAtual = null;

function renderLogin(erro){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f1420;">
      <div class="card" style="width:340px;padding:28px;">
        <h3 style="margin-top:0;margin-bottom:4px;">Nexus ERP</h3>
        <div class="small-muted" style="margin-bottom:18px;">Entre com seu e-mail e senha cadastrados no Supabase.</div>
        ${erro? `<div style="background:#fee2e2;color:#991b1b;padding:8px 10px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">${esc(erro)}</div>` : ''}
        <form id="loginForm" onsubmit="event.preventDefault(); fazerLogin();">
          <div class="field"><label>E-mail</label><input type="email" id="loginEmail" required></div>
          <div class="field"><label>Senha</label><input type="password" id="loginSenha" required></div>
          <button class="btn btn-primary" type="submit" style="width:100%;margin-top:6px;">Entrar</button>
        </form>
      </div>
    </div>
  `;
}

async function fazerLogin(){
  const email = document.getElementById('loginEmail').value;
  const senha = document.getElementById('loginSenha').value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if(error){ renderLogin(error.message); return; }
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
