// ============================================================
// FLUXO DE CAIXA / DRE GERENCIAL
// ============================================================
function setFluxoAno(v){ ui.fluxoAno = Number(v); render(); }
async function setSaldoInicial(v){
  state.saldoInicialAno = Number(v)||0;
  render();
  try{
    await sb.from('configuracoes').upsert({ id:1, saldo_inicial_ano: state.saldoInicialAno });
  }catch(e){
    alert('Erro ao salvar saldo inicial: ' + e.message);
  }
}

function linhaFluxo(label, valores, opts){
  opts = opts || {};
  const total = valores.reduce((s,v)=>s+v,0);
  return `<tr style="${opts.bold?'font-weight:700;':''}${opts.bg?'background:'+opts.bg+';':''}">
    <td>${label}</td>
    ${valores.map(v=>`<td class="text-right mono">${fmtMoney(v)}</td>`).join('')}
    <td class="text-right mono" style="font-weight:700;">${fmtMoney(total)}</td>
  </tr>`;
}

function renderFluxoCaixa(){
  const fluxo = calcFluxoCaixa(ui.fluxoAno);
  const anos = [ui.fluxoAno-1, ui.fluxoAno, ui.fluxoAno+1];
  return `
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;">
    <label style="font-size:12.5px;font-weight:600;">Ano:</label>
    <select onchange="setFluxoAno(this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;">
      ${anos.map(a=>`<option value="${a}" ${a===ui.fluxoAno?'selected':''}>${a}</option>`).join('')}
    </select>
    <label style="font-size:12.5px;font-weight:600;margin-left:14px;">Saldo inicial do ano (R$):</label>
    <input type="number" value="${state.saldoInicialAno||0}" onchange="setSaldoInicial(this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;width:140px;">
  </div>

  <div class="table-wrap" style="margin-bottom:24px;"><table>
    <thead><tr><th>Descrição</th>${MESES.map(m=>`<th class="text-right">${m}/${String(ui.fluxoAno).slice(2)}</th>`).join('')}<th class="text-right">Total Ano</th></tr></thead>
    <tbody>
      <tr style="background:#f9fafb;"><td colspan="${MESES.length+2}" style="font-weight:700;">═══ ENTRADAS ═══</td></tr>
      ${linhaFluxo('Recebimentos de Clientes', fluxo.map(m=>m.recebClientes))}
      ${linhaFluxo('Outras Entradas', fluxo.map(m=>m.outrasEntradas))}
      ${linhaFluxo('TOTAL ENTRADAS', fluxo.map(m=>m.totalEntradas), {bold:true})}
      <tr style="background:#f9fafb;"><td colspan="${MESES.length+2}" style="font-weight:700;">═══ SAÍDAS OPERACIONAIS ═══</td></tr>
      ${linhaFluxo('Pagamento Fornecedores (processos)', fluxo.map(m=>m.pagamentoFornecedores))}
      ${linhaFluxo('Fretes e Logística', fluxo.map(m=>m.fretes))}
      ${linhaFluxo('Impostos sobre Operações', fluxo.map(m=>m.impostos))}
      ${linhaFluxo('TOTAL SAÍDAS OPERACIONAIS', fluxo.map(m=>m.totalSaidasOp), {bold:true})}
      <tr style="background:#f9fafb;"><td colspan="${MESES.length+2}" style="font-weight:700;">═══ SAÍDAS FIXAS / ADMINISTRATIVAS ═══</td></tr>
      ${linhaFluxo('Salários', fluxo.map(m=>m.salarios))}
      ${linhaFluxo('Pró-Labore', fluxo.map(m=>m.proLabore))}
      ${linhaFluxo('Contabilidade', fluxo.map(m=>m.contabilidade))}
      ${linhaFluxo('Viagens', fluxo.map(m=>m.viagens))}
      ${linhaFluxo('Outras Despesas Administrativas', fluxo.map(m=>m.outrasAdm))}
      ${linhaFluxo('TOTAL SAÍDAS FIXAS', fluxo.map(m=>m.totalSaidasFixas), {bold:true})}
      ${linhaFluxo('FLUXO OPERACIONAL DO MÊS', fluxo.map(m=>m.fluxoOperacional), {bold:true, bg:'#eef2ff'})}
      ${linhaFluxo('Saldo Inicial do Mês', fluxo.map(m=>m.saldoInicial))}
      ${linhaFluxo('SALDO FINAL DO MÊS', fluxo.map(m=>m.saldoFinal), {bold:true, bg:'#ecfdf5'})}
    </tbody>
  </table></div>

  <div class="section-title">Outras Entradas (lançamento manual)</div>
  ${renderCrudTable('outrasEntradas')}

  <div class="section-title">Resultado Consolidado — ${ui.fluxoAno}</div>
  ${renderResultadoConsolidadoCard(calcResultadoConsolidado(ui.fluxoAno))}
  `;
}

function renderResultadoConsolidadoCard(c){
  return `
  <div class="table-wrap"><table>
    <tbody>
      <tr><td>Receita Bruta (R$)</td><td class="text-right mono">${fmtMoney(c.receitaBruta)}</td></tr>
      <tr><td>Custos de Processos (Fornecedores)</td><td class="text-right mono">${fmtMoney(c.custosProcessos)}</td></tr>
      <tr style="font-weight:700;background:#f9fafb;"><td>Lucro Bruto</td><td class="text-right mono">${fmtMoney(c.lucroBruto)}</td></tr>
      <tr><td>Margem Bruta %</td><td class="text-right">${fmtPct(c.margemBruta)}</td></tr>
      <tr><td>Despesas Administrativas &amp; Impostos</td><td class="text-right mono">${fmtMoney(c.despAdmTotal)}</td></tr>
      <tr style="font-weight:700;background:#ecfdf5;"><td>Lucro Líquido</td><td class="text-right mono">${fmtMoney(c.lucroLiquido)}</td></tr>
      <tr><td>Margem Líquida %</td><td class="text-right">${fmtPct(c.margemLiquida)}</td></tr>
    </tbody>
  </table></div>`;
}

function renderDRE(){
  const dre = calcDRE(ui.fluxoAno);
  return `
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;">
    <label style="font-size:12.5px;font-weight:600;">Ano:</label>
    <select onchange="setFluxoAno(this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;">
      ${[ui.fluxoAno-1, ui.fluxoAno, ui.fluxoAno+1].map(a=>`<option value="${a}" ${a===ui.fluxoAno?'selected':''}>${a}</option>`).join('')}
    </select>
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>Descrição</th>${MESES.map(m=>`<th class="text-right">${m}</th>`).join('')}<th class="text-right">Total Ano</th></tr></thead>
    <tbody>
      ${linhaFluxo('Receita Bruta (Recebimentos)', dre.map(m=>m.recebClientes))}
      ${linhaFluxo('Outras Entradas', dre.map(m=>m.outrasEntradas))}
      ${linhaFluxo('(=) RECEITA TOTAL', dre.map(m=>m.receitaTotal), {bold:true, bg:'#f9fafb'})}
      ${linhaFluxo('(-) Fornecedores (Produto)', dre.map(m=>m.fornecedores))}
      ${linhaFluxo('(-) Fretes e Logística', dre.map(m=>m.fretes))}
      ${linhaFluxo('(-) Impostos s/ Operações', dre.map(m=>m.impostos))}
      ${linhaFluxo('(=) LUCRO BRUTO', dre.map(m=>m.lucroBruto), {bold:true, bg:'#eef2ff'})}
      <tr><td>Margem Bruta %</td>${dre.map(m=>`<td class="text-right">${fmtPct(m.margemBruta)}</td>`).join('')}<td></td></tr>
      ${linhaFluxo('(-) Salários', dre.map(m=>m.salarios))}
      ${linhaFluxo('(-) Pró-Labore', dre.map(m=>m.proLabore))}
      ${linhaFluxo('(-) Contabilidade', dre.map(m=>m.contabilidade))}
      ${linhaFluxo('(-) Viagens', dre.map(m=>m.viagens))}
      ${linhaFluxo('(-) Outras Desp. Administrativas', dre.map(m=>m.outrasAdm))}
      ${linhaFluxo('(=) LUCRO LÍQUIDO', dre.map(m=>m.lucroLiquido), {bold:true, bg:'#ecfdf5'})}
      <tr><td>Margem Líquida %</td>${dre.map(m=>`<td class="text-right">${fmtPct(m.margemLiquida)}</td>`).join('')}<td></td></tr>
    </tbody>
  </table></div>
  `;
}
