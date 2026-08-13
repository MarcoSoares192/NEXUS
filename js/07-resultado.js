// ============================================================
// RESULTADO (view computada, somente leitura)
// ============================================================
function renderResultado(){
  const dados = calcResultado().filter(r => ui.empresaFiltro==='TODAS' || r.empresa===ui.empresaFiltro);
  if(!dados.length){
    return `<div class="empty-state"><div class="big">—</div><div>Cadastre processos para ver o resultado calculado aqui.</div></div>`;
  }
  const totalReceita = dados.reduce((s,r)=>s+r.receita,0);
  const totalDespesas = dados.reduce((s,r)=>s+r.totalDespesas,0);
  const totalLucro = dados.reduce((s,r)=>s+r.lucro,0);
  return `
  <div class="hint">Automático — cruza Processos × Despesas × Contas a Pagar para calcular lucro e margem por processo. Não editável aqui; edite nas telas de origem.</div>
  <div class="grid grid-3" style="margin-bottom:18px;">
    ${kpiCard('Receita (fechada)', fmtMoney(totalReceita), dados.length+' processo(s)', 'var(--accent)')}
    ${kpiCard('Despesas Totais', fmtMoney(totalDespesas), '', 'var(--amber)')}
    ${kpiCard('Lucro Consolidado', fmtMoney(totalLucro), 'Margem: '+fmtPct(totalReceita?totalLucro/totalReceita:0), 'var(--green)')}
  </div>
  <div class="table-wrap"><table>
    <thead><tr>
      <th>Nº Processo</th><th>Cliente</th><th>Status Processo</th><th>Status Câmbio</th>
      <th class="text-right">Receita (R$)</th><th class="text-right">Recebido (R$)</th><th class="text-right">A Receber</th>
      <th class="text-right">Desp. Totais</th><th class="text-right">Desp. Pagas</th><th class="text-right">Desp. Pendentes</th>
      <th class="text-right">Lucro</th><th class="text-right">Margem</th>
    </tr></thead>
    <tbody>
      ${dados.map(r=>`
        <tr>
          <td><b>${esc(r.numero)}</b></td>
          <td>${esc(r.cliente)}</td>
          <td>${badge(r.statusProcesso, {'Concluído':'green','Embarcado':'blue','Em prontidão':'amber','Em abertura':'slate'}[r.statusProcesso])}</td>
          <td>${badge(r.statusCambio, r.statusCambio==='Fechado'?'green':'slate')}</td>
          <td class="text-right mono">${fmtMoney(r.receita)}</td>
          <td class="text-right mono">${fmtMoney(r.recebido)}</td>
          <td class="text-right mono">US$ ${fmtNum(r.aReceber)}</td>
          <td class="text-right mono">${fmtMoney(r.totalDespesas)}</td>
          <td class="text-right mono">${fmtMoney(r.despesasPagas)}</td>
          <td class="text-right mono">${fmtMoney(r.despesasPendentes)}</td>
          <td class="text-right mono" style="font-weight:700;color:${r.lucro>=0?'#15803d':'#b91c1c'}">${fmtMoney(r.lucro)}</td>
          <td class="text-right">${fmtPct(r.margem)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table></div>
  `;
}
function badge(text, color){ if(text==null) return '—'; return `<span class="badge badge-${color||'slate'}">${esc(text)}</span>`; }

// ============================================================
// RESULTADO CONSOLIDADO (grupo NEXUS + CHALLENGE, por processo)
// ------------------------------------------------------------
// Resultado Operacional CHALLENGE (R$) = Câmbio recebido pela CHALLENGE
//   naquele processo − Despesas pagas pela CHALLENGE naquele processo.
//   Fica isolado, só em R$, pra efeito de transfer pricing.
// Resultado NEXUS (US$) = Valor NEXUS − Despesas NEXUS (ambos já em US$)
//   + [Resultado Operacional CHALLENGE (R$) ÷ Taxa de Câmbio do processo]
//   — essa divisão converte o resultado da CHALLENGE pra US$ antes de somar.
// ============================================================
function calcResultadoGrupoPorProcesso(){
  return state.processos.map(p=>{
    const cambioRecebidoChallengeRS = procValorFechCambioRS(p); // null = câmbio ainda em aberto
    const despesasNexusUSD = state.despesas.filter(d=>d.processoNumero===p.numero && d.empresa==='NEXUS' && d.status==='Pago')
      .reduce((s,d)=>s+(Number(d.valorPago)||0),0);
    const despesasChallengeRS = state.despesas.filter(d=>d.processoNumero===p.numero && d.empresa==='CHALLENGE' && d.status==='Pago')
      .reduce((s,d)=>s+(Number(d.valorPago)||0),0);
    const taxa = Number(p.taxaCambio)||0;
    const valorNexus = Number(p.valorNexus)||0;
    const resultadoOperacionalChallengeRS = cambioRecebidoChallengeRS===null ? null : (cambioRecebidoChallengeRS - despesasChallengeRS);
    const resultadoNexusUSD = (taxa>0 && resultadoOperacionalChallengeRS!==null)
      ? (valorNexus - despesasNexusUSD + (resultadoOperacionalChallengeRS/taxa)) : null;
    return { numero:p.numero, cliente: clienteNome(p.clienteId), empresa:p.empresa,
      valorNexus, cambioRecebidoChallengeRS, despesasNexusUSD, despesasChallengeRS,
      resultadoNexusUSD, resultadoOperacionalChallengeRS };
  });
}

function renderResultadoConsolidado(){
  const dados = calcResultadoGrupoPorProcesso();
  if(!dados.length){
    return `<div class="empty-state"><div class="big">—</div><div>Cadastre processos para ver o resultado consolidado aqui.</div></div>`;
  }
  const totalNexusUSD = dados.reduce((s,r)=>s+(r.resultadoNexusUSD||0),0);
  const totalOperChallengeRS = dados.reduce((s,r)=>s+(r.resultadoOperacionalChallengeRS||0),0);
  return `
  <div class="hint">Visão do grupo por processo. Resultado NEXUS = Valor NEXUS − Despesas NEXUS + (Resultado Operacional CHALLENGE ÷ Taxa de Câmbio do processo). Sem taxa de câmbio preenchida no processo, o Resultado NEXUS não pode ser calculado.</div>
  <div class="grid grid-2" style="margin-bottom:18px;">
    ${kpiCard('Resultado NEXUS (US$)', 'US$ '+fmtNum(totalNexusUSD), dados.length+' processo(s)', 'var(--green)')}
    ${kpiCard('Resultado Operacional CHALLENGE (R$)', fmtMoney(totalOperChallengeRS), 'Visão isolada para transfer pricing', 'var(--accent2)')}
  </div>
  <div class="table-wrap"><table>
    <thead><tr>
      <th>Nº Processo</th><th>Cliente</th>
      <th class="text-right">Valor NEXUS (US$)</th>
      <th class="text-right">Câmbio p/ CHALLENGE (R$)</th>
      <th class="text-right">Desp. NEXUS (US$)</th>
      <th class="text-right">Desp. CHALLENGE (R$)</th>
      <th class="text-right">Result. Operacional CHALLENGE (R$)</th>
      <th class="text-right">Resultado NEXUS (US$)</th>
    </tr></thead>
    <tbody>
      ${dados.map(r=>`
        <tr>
          <td><b>${esc(r.numero)}</b></td>
          <td>${esc(r.cliente)}</td>
          <td class="text-right mono">US$ ${fmtNum(r.valorNexus)}</td>
          <td class="text-right mono">${r.cambioRecebidoChallengeRS===null? '<span class="small-muted">Câmbio em aberto</span>' : fmtMoney(r.cambioRecebidoChallengeRS)}</td>
          <td class="text-right mono">US$ ${fmtNum(r.despesasNexusUSD)}</td>
          <td class="text-right mono">${fmtMoney(r.despesasChallengeRS)}</td>
          <td class="text-right mono" style="font-weight:700;color:${r.resultadoOperacionalChallengeRS>=0?'#15803d':'#b91c1c'}">${r.resultadoOperacionalChallengeRS===null?'—':fmtMoney(r.resultadoOperacionalChallengeRS)}</td>
          <td class="text-right mono" style="font-weight:700;color:${r.resultadoNexusUSD>=0?'#15803d':'#b91c1c'}">${r.resultadoNexusUSD===null?'—':'US$ '+fmtNum(r.resultadoNexusUSD)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table></div>
  `;
}
