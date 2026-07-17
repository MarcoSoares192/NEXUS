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
