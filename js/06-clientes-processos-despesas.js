// ============================================================
// CLIENTES / PROCESSOS / DESPESAS
// ============================================================
function renderClientes(){
  return renderCrudTable('clientes');
}

function renderProcessos(){
  const extras = [
    { label:'Valor Fech. Câmbio (R$)', render: p => { const v=procValorFechCambioRS(p); return v===null? '<span class="small-muted">Em aberto</span>' : `<span class="mono">${fmtMoney(v)}</span>`; } },
    { label:'A Receber Est. (USD)', render: p => { const v=procAReceberEstUSD(p); return v===null? '—' : `<span class="mono">US$ ${fmtNum(v)}</span>`; } },
    { label:'Invoice', render: p => `<button class="btn btn-ghost btn-sm" onclick="gerarInvoiceDoProcesso('${p.id}')">Gerar Invoice</button>` },
  ];
  return renderCrudTable('processos', extras);
}

function renderDespesas(){
  const extras = [
    { label:'Saldo (R$)', render: d => { const v=despSaldo(d); return v===null? '—' : fmtMoney(v); } },
  ];
  const linhas = porEmpresa(state.despesas);
  const totalPago = linhas.reduce((s,d)=>s+(Number(d.valorPago)||0),0);
  const porCC = {};
  linhas.forEach(d=>{ if(!d.centroCusto) return; porCC[d.centroCusto] = (porCC[d.centroCusto]||0) + (Number(d.valorPago)||0); });
  const top3 = Object.entries(porCC).map(([centro,valor])=>({centro,valor})).sort((a,b)=>b.valor-a.valor).slice(0,3);
  setTimeout(()=>desenharChartTop3CentroCusto(top3), 0);
  return `
  <div class="grid grid-2" style="margin-bottom:18px;">
    ${kpiCard('Total Pago', fmtMoney(totalPago), `${linhas.length} despesa(s)`, 'var(--green)')}
    <div class="card"><canvas id="chartTop3CC" height="100"></canvas></div>
  </div>
  ${renderCrudTable('despesas', extras)}
  `;
}

let chartTop3CCRef = null;
function desenharChartTop3CentroCusto(top3){
  const c = document.getElementById('chartTop3CC');
  if(!c) return;
  if(chartTop3CCRef) chartTop3CCRef.destroy();
  chartTop3CCRef = new Chart(c, { type:'bar', data:{ labels: top3.map(t=>t.centro), datasets:[{ label:'Pago (R$)', data: top3.map(t=>t.valor), backgroundColor:['#4f7cff','#22d3ee','#f59e0b'] }] },
    options:{ indexAxis:'y', plugins:{legend:{display:false}, title:{display:true,text:'Top 3 Centro de Custo (pago)',font:{size:12}}}, scales:{x:{beginAtZero:true}} } });
}
