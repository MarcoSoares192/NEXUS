// ============================================================
// CONTAS A RECEBER / CONTAS A PAGAR / DESP. ADMINISTRATIVAS
// ============================================================
function renderContasReceber(){
  const linhas = porEmpresa(state.contasReceber);
  const porMoeda = {};
  MOEDAS_CAR.forEach(m=> porMoeda[m] = linhas.filter(r=>r.moeda===m && !r.dataRecebimento).reduce((s,r)=>s+(carSaldoAberto(r)||0),0));
  const extras = [
    { label:'Saldo em Aberto', render: r => { const v=carSaldoAberto(r); return v===null?'—': `<span class="mono">${fmtNum(v)}</span>`; } },
    { label:'Dias Atraso', render: r => { const v=carDiasAtraso(r); return v===null?'—': v; } },
    { label:'Status', render: r => badge(carStatus(r), carStatusBadge(carStatus(r))) },
  ];
  return `
  <div class="grid grid-4" style="margin-bottom:18px;">
    ${MOEDAS_CAR.map(m=>kpiCard('Em aberto — '+m, fmtNum(porMoeda[m])+' '+m, '', 'var(--accent)')).join('')}
  </div>
  ${renderCrudTable('contasReceber', extras)}
  `;
}

function renderContasPagar(){
  const extras = [
    { label:'Dias Atraso', render: r => { const v=capDiasAtraso(r); return v===null?'—': v; } },
    { label:'Status', render: r => badge(capStatus(r), capStatusBadge(capStatus(r))) },
  ];
  return renderCrudTable('contasPagar', extras);
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
