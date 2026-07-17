// ============================================================
// EMPRESAS (perfil / letterhead usado na cotação)
// ============================================================
const CAMPOS_EMPRESA = [
  {key:'nomeCompleto', label:'Nome Completo (Embarcador)'},
  {key:'endereco', label:'Endereço', area:true},
  {key:'documento', label:'Documento (EIN/CNPJ)'},
  {key:'site', label:'Site'},
  {key:'email', label:'E-mail de contato'},
  {key:'bancoBeneficiary', label:'Beneficiary (banco)'},
  {key:'bancoEndereco', label:'Endereço do Beneficiary'},
  {key:'bancoNome', label:'Beneficiary Bank'},
  {key:'bancoConta', label:'Conta (Account)'},
  {key:'bancoSwift', label:'SWIFT/BIC'},
  {key:'bancoAba', label:'ABA/Routing'},
  {key:'bancoMoeda', label:'Moeda (Currency)'},
  {key:'bancoIntermediario', label:'Intermediary Bank'},
  {key:'bancoIntermediarioSwift', label:'Intermediary SWIFT'},
  {key:'assinanteNome', label:'Assinante padrão (nome)'},
  {key:'assinanteCargo', label:'Assinante padrão (cargo)'},
];
function setEmpresaAba(e){ ui.empresaAba = e; render(); }
const CAMPO_EMPRESA_DB = {
  nomeCompleto:'nome_completo', endereco:'endereco', documento:'documento', site:'site', email:'email',
  logoDataUrl:'logo_url', bancoBeneficiary:'banco_beneficiary', bancoEndereco:'banco_endereco',
  bancoNome:'banco_nome', bancoConta:'banco_conta', bancoSwift:'banco_swift', bancoAba:'banco_aba',
  bancoMoeda:'banco_moeda', bancoIntermediario:'banco_intermediario', bancoIntermediarioSwift:'banco_intermediario_swift',
  assinanteNome:'assinante_nome', assinanteCargo:'assinante_cargo',
};
async function salvarCampoEmpresa(empresa, key, value){
  state.empresasPerfil[empresa][key] = value;
  const coluna = CAMPO_EMPRESA_DB[key];
  if(!coluna) return;
  try{
    await sb.from('empresas').update({ [coluna]: value }).eq('id', empresaIdDe(empresa));
  }catch(e){
    alert('Erro ao salvar dado da empresa: ' + e.message);
  }
}
function uploadLogoEmpresa(empresa, inputEl){
  const file = inputEl.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024){ alert('Use uma imagem de até 2MB.'); return; }
  const reader = new FileReader();
  reader.onload = e => { salvarCampoEmpresa(empresa, 'logoDataUrl', e.target.result); render(); };
  reader.readAsDataURL(file);
}
function removerLogoEmpresa(empresa){
  if(!confirm('Remover o logo desta empresa?')) return;
  salvarCampoEmpresa(empresa, 'logoDataUrl', '');
  render();
}
function renderEmpresas(){
  const emp = ui.empresaAba;
  const perfil = state.empresasPerfil[emp];
  return `
  <div class="hint">Esses dados aparecem no cabeçalho, dados bancários e assinatura do PDF de cotação de cada empresa.</div>
  <div class="pill-tabs">
    ${EMPRESAS.map(e=>`<div class="pill-tab ${ui.empresaAba===e?'active':''}" onclick="setEmpresaAba('${e}')">${e}</div>`).join('')}
  </div>

  <div class="card" style="margin-bottom:16px;">
    <div class="section-title" style="margin-top:0;">Logo</div>
    <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
      <div style="width:230px;height:90px;border:1px dashed #d1d5db;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fafafa;overflow:hidden;padding:8px;">
        ${perfil.logoDataUrl
          ? `<img src="${perfil.logoDataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;">`
          : `<span class="small-muted">Sem logo cadastrado</span>`}
      </div>
      <div>
        <label class="btn btn-ghost btn-sm" style="cursor:pointer;">Enviar logo
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" style="display:none" onchange="uploadLogoEmpresa('${emp}', this)">
        </label>
        ${perfil.logoDataUrl? `<button class="btn btn-danger btn-sm" onclick="removerLogoEmpresa('${emp}')">Remover</button>` : ''}
        <div class="small-muted" style="margin-top:8px;max-width:320px;">Usado no cabeçalho do PDF de cotação desta empresa. O menu lateral do sistema usa sempre o logo da Nexus (marca do grupo).</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="grid grid-2">
      ${CAMPOS_EMPRESA.map(f=>`
        <div class="field">
          <label>${f.label}</label>
          ${f.area
            ? `<textarea rows="2" onchange="salvarCampoEmpresa('${emp}','${f.key}',this.value)">${esc(perfil[f.key])}</textarea>`
            : `<input type="text" value="${esc(perfil[f.key])}" onchange="salvarCampoEmpresa('${emp}','${f.key}',this.value)">`}
        </div>
      `).join('')}
    </div>
  </div>
  `;
}

