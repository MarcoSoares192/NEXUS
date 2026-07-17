// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard(){
  const processos = porEmpresa(state.processos);
  const resultado = calcResultado().filter(r => ui.empresaFiltro==='TODAS' || r.empresa===ui.empresaFiltro);

  if(!processos.length){
    return `
    <div class="empty-state">
      <div class="big">—</div>
      <div style="font-size:15px;font-weight:600;color:#374151;margin-bottom:4px;">Ainda não há processos cadastrados</div>
      <div>Cadastre clientes e processos, ou clique em "Carregar exemplo" no topo para ver o sistema em ação.</div>
    </div>`;
  }

  const receitaTotal = processos.reduce((s,p)=>{ const f=procValorFechCambioRS(p); return s+(f||0); },0);
  const recebido = receitaTotal;
  const aReceberUSD = processos.filter(p=>!p.statusRecebimento).reduce((s,p)=>0,0); // placeholder unused
  const aReceberUSDCalc = processos.reduce((s,p)=>{ const est = procAReceberEstUSD(p); return s + (est && p.moeda==='USD'? est : 0); },0);
  const lucroBruto = resultado.reduce((s,r)=>s+r.lucro,0);
  const fluxo = calcFluxoCaixa(ui.fluxoAno);
  const saldoCaixa = fluxo.length? fluxo[fluxo.length-1].saldoFinal : 0;
  const consolidado = calcResultadoConsolidado();
  const margemGeral = receitaTotal? lucroBruto/receitaTotal : 0;
  const emAberto = processos.filter(p=>p.statusRecebimento!=='Recebido Total').reduce((s,p)=>{ const f=procValorFechCambioRS(p); return s+(f||0); },0);
  const emAbertoCount = processos.filter(p=>p.statusRecebimento==='Pendente'||p.statusRecebimento==='Recebido Parcial').length;
  const hoje = parseDate(todayISO());
  const em7dias = processos.filter(p=>{ if(!p.dataProntidao) return false; const d=parseDate(p.dataProntidao); const diff=daysBetween(d,hoje); return diff<=0 && diff>=-7; });
  const totalAReceber7d = em7dias.reduce((s,p)=>s+(procAReceberEstUSD(p)||0),0);

  // agrupar por cliente
  const porCliente = {};
  resultado.forEach(r=>{
    if(!porCliente[r.cliente]) porCliente[r.cliente] = { cliente:r.cliente, proc:0, receita:0, recebido:0, aReceber:0, lucro:0 };
    const g = porCliente[r.cliente];
    g.proc++; g.receita+=r.receita; g.recebido+=r.recebido; g.aReceber+=r.aReceber; g.lucro+=r.lucro;
  });
  let clientesArr = Object.values(porCliente);
  if(ui.dashClienteFiltro!=='TODOS') clientesArr = clientesArr.filter(c=>c.cliente===ui.dashClienteFiltro);
  clientesArr.sort((a,b)=>b.receita-a.receita);

  setTimeout(()=>desenharGraficosDashboard(fluxo), 0);

  return `
  <div class="grid grid-5">
    ${kpiCard('Receita Total', fmtMoney(receitaTotal), `Margem geral: ${fmtPct(margemGeral)}`, 'var(--accent)')}
    ${kpiCard('Recebido', fmtMoney(recebido), `% recebido: ${fmtPct(receitaTotal? recebido/receitaTotal:0)}`, 'var(--green)')}
    ${kpiCard('A Receber (USD)', 'US$ ' + fmtNum(aReceberUSDCalc), `Em aberto: ${fmtMoney(emAberto)} • ${emAbertoCount} processo(s)`, 'var(--amber)')}
    ${kpiCard('Lucro Bruto', fmtMoney(lucroBruto), `Processos ativos: ${processos.length}`, 'var(--accent2)')}
    ${kpiCard('Saldo de Caixa', fmtMoney(saldoCaixa), `Lucro líq. ano: ${fmtMoney(consolidado.lucroLiquido)}`, 'var(--slate)')}
  </div>

  <div class="section-title">Fluxo de recebimentos — ${ui.fluxoAno}</div>
  <div class="grid grid-2">
    <div class="card"><canvas id="chartRecebimentos" height="160"></canvas></div>
    <div class="card"><canvas id="chartSaldo" height="160"></canvas></div>
  </div>

  <div class="section-title">Detalhamento por Cliente</div>
  <div style="display:flex;gap:10px;margin-bottom:12px;">
    <select onchange="ui.dashClienteFiltro=this.value; render();" style="padding:7px 10px;border-radius:8px;border:1px solid #d1d5db;font-size:12.5px;">
      <option value="TODOS">Todos os clientes</option>
      ${Object.keys(porCliente).map(c=>`<option value="${esc(c)}" ${ui.dashClienteFiltro===c?'selected':''}>${esc(c)}</option>`).join('')}
    </select>
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>Cliente</th><th>Proc.</th><th class="text-right">Receita</th><th class="text-right">Recebido</th><th class="text-right">A Receber</th><th class="text-right">Lucro</th><th class="text-right">Margem</th></tr></thead>
    <tbody>
      ${clientesArr.map(c=>`
        <tr>
          <td><b>${esc(c.cliente)}</b></td>
          <td>${c.proc}</td>
          <td class="text-right mono">${fmtMoney(c.receita)}</td>
          <td class="text-right mono">${fmtMoney(c.recebido)}</td>
          <td class="text-right mono">US$ ${fmtNum(c.aReceber)}</td>
          <td class="text-right mono">${fmtMoney(c.lucro)}</td>
          <td class="text-right">${fmtPct(c.receita? c.lucro/c.receita:0)}</td>
        </tr>
      `).join('') || `<tr><td colspan="7" style="text-align:center;color:#9ca3af;">Sem dados</td></tr>`}
    </tbody>
  </table></div>

  <div class="section-title">Prontidão de Carga — Próximos 7 dias</div>
  <div class="hint">${em7dias.length} processo(s) com prontidão nos próximos 7 dias • Total a receber: US$ ${fmtNum(totalAReceber7d)}</div>
  <div class="table-wrap"><table>
    <thead><tr><th>Nº Processo</th><th>Cliente</th><th>Descrição</th><th>Data Prontidão</th><th class="text-right">A Receber (USD)</th></tr></thead>
    <tbody>
      ${em7dias.map(p=>`
        <tr><td>${esc(p.numero)}</td><td>${esc(clienteNome(p.clienteId))}</td><td>${esc(p.descricao||'—')}</td><td>${fmtDate(p.dataProntidao)}</td><td class="text-right mono">US$ ${fmtNum(procAReceberEstUSD(p)||0)}</td></tr>
      `).join('') || `<tr><td colspan="5" style="text-align:center;color:#9ca3af;">Nenhum processo com prontidão nos próximos 7 dias</td></tr>`}
    </tbody>
  </table></div>
  `;
}

function kpiCard(label, value, sub, color){
  return `<div class="kpi"><div class="accent-bar" style="background:${color}"></div>
    <div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
}

let chartRecebimentosRef=null, chartSaldoRef=null;
function desenharGraficosDashboard(fluxo){
  const c1 = document.getElementById('chartRecebimentos');
  const c2 = document.getElementById('chartSaldo');
  if(!c1||!c2) return;
  if(chartRecebimentosRef) chartRecebimentosRef.destroy();
  if(chartSaldoRef) chartSaldoRef.destroy();
  chartRecebimentosRef = new Chart(c1, { type:'bar', data:{ labels: fluxo.map(m=>m.label), datasets:[{ label:'Recebimentos de clientes (R$)', data: fluxo.map(m=>m.recebClientes), backgroundColor:'#4f7cff' }] },
    options:{ plugins:{legend:{display:true, labels:{boxWidth:10,font:{size:11}}}, title:{display:true,text:'Recebimentos mensais',font:{size:12}}}, scales:{y:{beginAtZero:true}} } });
  chartSaldoRef = new Chart(c2, { type:'line', data:{ labels: fluxo.map(m=>m.label), datasets:[{ label:'Saldo final de caixa (R$)', data: fluxo.map(m=>m.saldoFinal), borderColor:'#22d3ee', backgroundColor:'rgba(34,211,238,.15)', fill:true, tension:.3 }] },
    options:{ plugins:{legend:{display:true, labels:{boxWidth:10,font:{size:11}}}, title:{display:true,text:'Evolução do saldo de caixa',font:{size:12}}} } });
}
