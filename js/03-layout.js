// ============================================================
// LAYOUT / ROTEAMENTO
// ============================================================
const NAV = [
  {group:'Visão Geral', items:[
    {id:'dashboard', label:'Dashboard'},
  ]},
  {group:'Operação', items:[
    {id:'clientes', label:'Clientes'},
    {id:'cotacoes', label:'Cotações'},
    {id:'processos', label:'Processos'},
    {id:'despesas', label:'Despesas'},
    {id:'resultado', label:'Resultado'},
  ]},
  {group:'Financeiro', items:[
    {id:'contasReceber', label:'Contas a Receber'},
    {id:'contasPagar', label:'Contas a Pagar'},
    {id:'despAdm', label:'Desp. Administrativas'},
    {id:'fluxoCaixa', label:'Fluxo de Caixa'},
    {id:'dreGerencial', label:'DRE Gerencial'},
  ]},
  {group:'Ferramentas', items:[
    {id:'cobranca', label:'Cobrança Rápida'},
    {id:'checklists', label:'Checklists'},
  ]},
  {group:'Configurações', items:[
    {id:'empresas', label:'Empresas'},
  ]},
];
const MODULE_TITLES = {
  dashboard:['Dashboard','Visão consolidada de receita, caixa e performance por cliente'],
  clientes:['Clientes','Cadastro de clientes — alimenta os dropdowns de Processos'],
  cotacoes:['Cotações','Monte a proforma, exporte em PDF e gere a venda quando o cliente aprovar'],
  processos:['Processos','Cadastro operacional de processos de importação/exportação'],
  despesas:['Despesas por Processo','Lance despesas assim que surgirem — saldo e status calculados automaticamente'],
  resultado:['Resultado por Processo','Automático — cruza Processos × Despesas × Contas a Pagar (não editável)'],
  contasReceber:['Contas a Receber','Títulos a receber por proforma/embarque, multimoeda'],
  contasPagar:['Contas a Pagar','Títulos de fornecedores pendentes'],
  despAdm:['Despesas Administrativas','Folha, pró-labore e despesas fixas da operação'],
  fluxoCaixa:['Fluxo de Caixa','Visão mensal alimentada automaticamente por Processos, Contas a Pagar e Desp. Administrativas'],
  dreGerencial:['DRE Gerencial Mensal','Gerado automaticamente a partir do Fluxo de Caixa'],
  cobranca:['Cobrança Rápida','Monte o texto de cobrança e copie para e-mail'],
  checklists:['Checklists Operacionais (SOP)','Rotina diária e fechamento mensal'],
  empresas:['Empresas','Dados de letterhead e bancários usados nas cotações (por empresa)'],
};

function render(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="sidebar">
      <div class="sidebar-brand">
        <div class="logo-card"><img src="${LOGO_NEXUS_DATA_URL}" alt="Nexus Group Trading" class="logo-img"></div>
        <div class="sub">ERP · Protótipo v1</div>
      </div>
      ${NAV.map(g => `
        <div class="nav-group-label">${g.group}</div>
        ${g.items.map(it => `
          <div class="nav-item ${ui.modulo===it.id?'active':''}" onclick="goTo('${it.id}')">
            <span class="nav-dot"></span>${it.label}
          </div>
        `).join('')}
      `).join('')}
      <div style="margin-top:auto;padding:16px 18px;border-top:1px solid #1c2334;">
        <div class="small-muted" style="color:#5b6478;line-height:1.5;margin-bottom:10px;">Dados salvos no banco (Supabase). Conectado como <b style="color:#9aa4bd;">${(sessaoAtual && sessaoAtual.user && sessaoAtual.user.email) || ''}</b>.</div>
        <button class="btn btn-ghost btn-sm" onclick="sairApp()">Sair</button>
      </div>
    </div>
    <div class="main">
      <div class="topbar">
        <div>
          <h1>${MODULE_TITLES[ui.modulo][0]}</h1>
          <div class="desc">${MODULE_TITLES[ui.modulo][1]}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <select onchange="setEmpresaFiltro(this.value)" style="padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:12.5px;font-weight:600;">
            <option ${ui.empresaFiltro==='TODAS'?'selected':''} value="TODAS">Todas as empresas</option>
            ${EMPRESAS.map(e=>`<option ${ui.empresaFiltro===e?'selected':''} value="${e}">${e}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" onclick="exportarJSON()">Exportar backup</button>
          <label class="btn btn-ghost btn-sm" style="margin:0;cursor:pointer;">Importar
            <input type="file" accept=".json" style="display:none" onchange="importarJSON(event)">
          </label>
          <button class="btn btn-ghost btn-sm" onclick="carregarDemo()">Carregar exemplo</button>
          <button class="btn btn-danger btn-sm" onclick="limparTudo()">Limpar tudo</button>
        </div>
      </div>
      <div class="content" id="content"></div>
    </div>
    ${ui.modal ? renderModal() : ''}
  `;
  renderContent();
}

function goTo(mod){ ui.modulo = mod; render(); }
function setEmpresaFiltro(v){ ui.empresaFiltro = v; render(); }

function renderContent(){
  const map = {
    dashboard: renderDashboard, clientes: renderClientes, cotacoes: renderCotacoesModulo, processos: renderProcessos,
    despesas: renderDespesas, resultado: renderResultado, contasReceber: renderContasReceber,
    contasPagar: renderContasPagar, despAdm: renderDespAdm, fluxoCaixa: renderFluxoCaixa,
    dreGerencial: renderDRE, cobranca: renderCobranca, checklists: renderChecklists, empresas: renderEmpresas,
  };
  document.getElementById('content').innerHTML = (map[ui.modulo] || renderDashboard)();
  if(ui.modulo==='cotacoes' && ui.cotacaoEditId && document.getElementById('itensBody')){
    setTimeout(recalcFooterTotals, 0);
  }
}

