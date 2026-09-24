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
  ];
  return renderCrudTable('processos', extras);
}

function renderDespesasPorEmpresa(tabela, empresa, simbolo){
  const extras = [
    { label:'Saldo', render: d => { const v=despSaldo(d); return v===null? '—' : `${simbolo} ${fmtNum(v)}`; } },
  ];
  const linhas = state.despesas.filter(d=>d.empresa===empresa);
  const totalPago = linhas.reduce((s,d)=>s+(Number(d.valorPago)||0),0);
  const porCC = {};
  linhas.forEach(d=>{ if(!d.centroCusto) return; porCC[d.centroCusto] = (porCC[d.centroCusto]||0) + (Number(d.valorPago)||0); });
  const top3 = Object.entries(porCC).map(([centro,valor])=>({centro,valor})).sort((a,b)=>b.valor-a.valor).slice(0,3);
  setTimeout(()=>desenharChartTop3CentroCusto(top3, simbolo), 0);
  return `
  <div class="grid grid-2" style="margin-bottom:18px;">
    ${kpiCard('Total Pago', simbolo + ' ' + fmtNum(totalPago), `${linhas.length} despesa(s)`, 'var(--green)')}
    <div class="card"><canvas id="chartTop3CC" height="100"></canvas></div>
  </div>
  ${renderCrudTable(tabela, extras)}
  `;
}
function renderFecharCambio(){
  const pendentes = state.processos.filter(p => !p.valorMoedaSemDue && (p.valorCambio===null||p.valorCambio===undefined||p.valorCambio===''));
  if(!pendentes.length){
    return `<div class="empty-state"><div class="big">✓</div><div>Nenhum processo com Valor Câmbio em aberto. Tudo fechado.</div></div>`;
  }
  return `
  <div class="hint">Processos com Valor Câmbio ainda em branco (exceto os marcados como SEM DUE). Dê duplo clique na linha, ou clique em Editar, pra abrir o processo e preencher o Valor Câmbio.</div>
  <div class="table-wrap"><table>
    <thead><tr>
      <th>Nº Processo</th><th>Cliente</th><th>Descrição</th>
      <th class="text-right">Valor CH</th><th class="text-right">Valor NEXUS (US$)</th><th></th>
    </tr></thead>
    <tbody>
      ${pendentes.map(p=>`
        <tr ondblclick="openModal('processos','${p.id}')" style="cursor:pointer;">
          <td><b>${esc(p.numero)}</b></td>
          <td>${esc(clienteNome(p.clienteId))}</td>
          <td>${esc(p.descricao||'—')}</td>
          <td class="text-right mono">${p.valorMoeda? fmtNum(p.valorMoeda) : '—'}</td>
          <td class="text-right mono">US$ ${fmtNum(p.valorNexus||0)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="openModal('processos','${p.id}')">Editar</button></td>
        </tr>
      `).join('')}
    </tbody>
  </table></div>
  `;
}

function renderContasBancarias(){
  const extras = [
    { label:'Saldo Atual', render: c => {
      const saldo = saldoContaBancaria(c);
      const simbolo = c.moeda==='USD'?'US$':(c.moeda==='BRL'?'R$':c.moeda);
      return `<span class="mono" style="font-weight:700;color:${saldo>=0?'#15803d':'#b91c1c'}">${simbolo} ${fmtNum(saldo)}</span>`;
    } },
  ];
  return renderCrudTable('contasBancarias', extras);
}

function renderDespesasNexus(){ return renderDespesasPorEmpresa('despesasNexus', 'NEXUS', 'US$'); }
function renderDespesasCH(){ return renderDespesasPorEmpresa('despesasCH', 'CHALLENGE', 'R$'); }

let chartTop3CCRef = null;
function desenharChartTop3CentroCusto(top3, simbolo){
  const c = document.getElementById('chartTop3CC');
  if(!c) return;
  if(chartTop3CCRef) chartTop3CCRef.destroy();
  chartTop3CCRef = new Chart(c, { type:'bar', data:{ labels: top3.map(t=>t.centro), datasets:[{ label:`Pago (${simbolo||'R$'})`, data: top3.map(t=>t.valor), backgroundColor:['#4f7cff','#22d3ee','#f59e0b'] }] },
    options:{ indexAxis:'y', plugins:{legend:{display:false}, title:{display:true,text:'Top 3 Centro de Custo (pago)',font:{size:12}}}, scales:{x:{beginAtZero:true}} } });
}
