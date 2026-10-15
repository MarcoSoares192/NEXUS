// ============================================================
// CONTAS A RECEBER / CONTAS A PAGAR / DESP. ADMINISTRATIVAS
// ============================================================
function renderContasReceber(){
  const def = TABLE_DEFS.contasReceber;
  const base = porEmpresa(state.contasReceber);
  const linhas = linhasComFiltro('contasReceber', def.colunas, base); // respeita filtros ativos (ex.: cliente)
  const abertas = linhas.filter(r=>!r.dataRecebimento);
  const nProcessos = new Set(abertas.map(r=>r.processoNumero || ('t'+r.id))).size;
  const porMoeda = {};
  MOEDAS_CAR.forEach(m=> porMoeda[m] = abertas.filter(r=>r.moeda===m).reduce((s,r)=>s+(carSaldoAberto(r)||0),0));
  const extras = [
    { label:'Saldo em Aberto', render: r => { const v=carSaldoAberto(r); return v===null?'—': `<span class="mono">${fmtNum(v)}</span>`; } },
    { label:'Status', render: r => badge(carStatus(r), carStatusBadge(carStatus(r))) },
  ];
  const cards = MOEDAS_CAR.map(m => m==='EUR'
    ? kpiCard('Nº de Processos', nProcessos, 'a receber', 'var(--accent)')
    : kpiCard('Em aberto — '+m, fmtNum(porMoeda[m])+' '+m, '', 'var(--accent)'));
  return `
  <div class="grid grid-4" style="margin-bottom:18px;">
    ${cards.join('')}
  </div>
  ${renderCrudTable('contasReceber', extras)}
  `;
}

function renderContasPagar(){
  const extras = [
    { label:'Dias Atraso', render: r => { const v=capDiasAtraso(r); return v===null?'—': v; } },
    { label:'Status', render: r => badge(capStatus(r), capStatusBadge(capStatus(r))) },
  ];
  const linhas = porEmpresa(state.contasPagar);
  const abertas = linhas.filter(r=>!r.dataPagamento);
  const totalAbertoNexus = abertas.filter(r=>r.empresa==='NEXUS').reduce((s,r)=>s+(Number(r.valor)||0),0);
  const totalAbertoOutras = abertas.filter(r=>r.empresa!=='NEXUS').reduce((s,r)=>s+(Number(r.valor)||0),0);
  return `
  <div class="grid grid-3" style="margin-bottom:18px;">
    ${kpiCard('Contas em Aberto', abertas.length, `de ${linhas.length} título(s) no total`, 'var(--amber)')}
    ${kpiCard('A Pagar — NEXUS', 'US$ ' + fmtNum(totalAbertoNexus), '', 'var(--accent)')}
    ${kpiCard('A Pagar — CHALLENGE/outras (R$)', fmtMoney(totalAbertoOutras), '', 'var(--accent2)')}
  </div>
  ${renderCrudTable('contasPagar', extras)}
  `;
}

function renderDespAdm(){
  const extras = [
    { label:'Status', render: r => badge(admStatus(r), admStatus(r)==='Pago'?'green':'amber') },
  ];
  const totalMes = state.despAdm.reduce((s,a)=>s+(Number(a.valor)||0),0);
  const totalPago = state.despAdm.reduce((s,a)=>s+(Number(a.valorPago)||0),0);
  return `
  <div class="grid grid-3" style="margin-bottom:18px;">
    ${kpiCard('Total Lançado', fmtMoney(totalMes), state.despAdm.length+' lançamento(s)', 'var(--accent)')}
    ${kpiCard('Total Pago', fmtMoney(totalPago), '', 'var(--green)')}
    ${kpiCard('Pendente', fmtMoney(totalMes-totalPago), '', 'var(--amber)')}
  </div>
  ${renderCrudTable('despAdm', extras)}
  `;
}
