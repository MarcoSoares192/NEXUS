// ============================================================
// COBRANÇA RÁPIDA
// ============================================================
function setCobrancaCliente(v){ ui.cobrancaCliente = v; render(); }

function renderCobranca(){
  const todos = porEmpresa(state.processos).map(p=>{
    const aReceber = procAReceberEstUSD(p) || 0;
    return { p, aReceber };
  }).filter(x=>x.aReceber>0 && (ui.cobrancaCliente==='TODOS' || clienteNome(x.p.clienteId)===ui.cobrancaCliente));

  const clientesUnicos = [...new Set(state.processos.map(p=>clienteNome(p.clienteId)))];
  const totalReceita = todos.reduce((s,x)=>s+(procValorFechCambioRS(x.p)||0),0);
  const totalRecebido = todos.reduce((s,x)=> s + (x.p.statusRecebimento==='Recebido Total'? (procValorFechCambioRS(x.p)||0) : 0), 0);
  const totalAReceber = todos.reduce((s,x)=>s+x.aReceber,0);

  const assunto = ui.cobrancaCliente==='TODOS' ? 'Assunto: Resumo Geral de Faturas em Aberto - Trading Nexus' : `Assunto: Cobrança - Faturas em Aberto - ${ui.cobrancaCliente}`;
  const linhasTexto = todos.map(x=>{
    const dias = x.p.dataAbertura ? daysBetween(parseDate(todayISO()), parseDate(x.p.dataAbertura)) : '—';
    return `${x.p.numero} | ${fmtDate(x.p.dataAbertura)} | ${clienteNome(x.p.clienteId)} | ${x.p.descricao||''} | Receita ${fmtMoney(procValorFechCambioRS(x.p)||0)} | A receber US$ ${fmtNum(x.aReceber)} | ${dias} dia(s) em aberto`;
  }).join('\n');
  const textoCompleto = `${assunto}\n\nPrezados,\n\nSegue resumo das faturas em aberto:\n\n${linhasTexto || '(nenhuma fatura em aberto)'}\n\nTotal em aberto: US$ ${fmtNum(totalAReceber)}\n\nAtenciosamente,\nNexus Global Trading`;

  return `
  <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;">
    <label style="font-size:12.5px;font-weight:600;">Cliente:</label>
    <select onchange="setCobrancaCliente(this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;">
      <option value="TODOS" ${ui.cobrancaCliente==='TODOS'?'selected':''}>TODOS</option>
      ${clientesUnicos.map(c=>`<option value="${esc(c)}" ${ui.cobrancaCliente===c?'selected':''}>${esc(c)}</option>`).join('')}
    </select>
    <div style="margin-left:auto;font-size:13px;"><b>Total em aberto:</b> US$ ${fmtNum(totalAReceber)}</div>
  </div>

  <div class="table-wrap" style="margin-bottom:18px;"><table>
    <thead><tr><th>Nº Processo</th><th>Data Abertura</th><th>Cliente</th><th>Descrição</th><th class="text-right">Receita (R$)</th><th class="text-right">Recebido (R$)</th><th class="text-right">A Receber (USD)</th><th class="text-right">Dias em Aberto</th></tr></thead>
    <tbody>
      ${todos.map(x=>`
        <tr>
          <td>${esc(x.p.numero)}</td><td>${fmtDate(x.p.dataAbertura)}</td><td>${esc(clienteNome(x.p.clienteId))}</td><td>${esc(x.p.descricao||'—')}</td>
          <td class="text-right mono">${fmtMoney(procValorFechCambioRS(x.p)||0)}</td>
          <td class="text-right mono">${fmtMoney(x.p.statusRecebimento==='Recebido Total'?(procValorFechCambioRS(x.p)||0):0)}</td>
          <td class="text-right mono">US$ ${fmtNum(x.aReceber)}</td>
          <td class="text-right">${x.p.dataAbertura? daysBetween(parseDate(todayISO()),parseDate(x.p.dataAbertura)) : '—'}</td>
        </tr>
      `).join('') || `<tr><td colspan="8" style="text-align:center;color:#9ca3af;">Nenhuma fatura em aberto</td></tr>`}
    </tbody>
  </table></div>

  <div class="section-title">Texto para E-mail</div>
  <div class="card">
    <textarea readonly style="width:100%;min-height:220px;font-family:ui-monospace,monospace;font-size:12.5px;border:1px solid #e5e7eb;border-radius:8px;padding:12px;" id="textoCobranca">${esc(textoCompleto)}</textarea>
    <div style="margin-top:10px;"><button class="btn btn-primary btn-sm" onclick="copiarTextoCobranca()">Copiar texto</button></div>
  </div>
  `;
}
function copiarTextoCobranca(){
  const el = document.getElementById('textoCobranca');
  el.select();
  try{ document.execCommand('copy'); alert('Texto copiado!'); }catch(e){ navigator.clipboard && navigator.clipboard.writeText(el.value); alert('Texto copiado!'); }
}

