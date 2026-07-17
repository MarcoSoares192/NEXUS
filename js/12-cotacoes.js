// ============================================================
// COTAÇÕES (PROFORMA) — código sequencial, itens, PDF, gerar venda
// ============================================================
const INCOTERMS = ['EXW','FOB','FCA','CPT','CIP','CFR','CIF','DAP','DDP'];
const MODAIS = ['AÉREO','MARÍTIMO','RODOVIÁRIO'];

function anoCurto(dataISO){ const d = dataISO? parseDate(dataISO) : new Date(); return String((d||new Date()).getFullYear()).slice(2); }

async function nextCotacaoCodigo(empresa, dataISO){
  const ano2 = anoCurto(dataISO);
  const ano = 2000 + Number(ano2);
  const empresaId = empresaIdDe(empresa);
  const { data: existente } = await sb.from('cotacao_contadores').select('*').eq('empresa_id', empresaId).eq('ano', ano).maybeSingle();
  const atual = existente ? existente.contador : 108;
  await sb.from('cotacao_contadores').upsert({ empresa_id: empresaId, ano, contador: atual + 1 });
  state.cotacaoContadores[empresa + ano2] = atual + 1;
  return `${empresa}${ano2}/${atual}`;
}

function nextProcessoNumero(dataISO){
  const ano2 = anoCurto(dataISO);
  let max = 0;
  state.processos.forEach(p=>{
    const m = /^(\d{2})\/(\d+)/.exec(p.numero||'');
    if(m && m[1]===ano2) max = Math.max(max, parseInt(m[2],10));
  });
  return `${ano2}/${String(max+1).padStart(3,'0')}`;
}

function fmtCot(v, moeda){ if(v===null||v===undefined||v==='') return '—'; return `${moeda||'USD'} ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`; }

function blankItem(){ return { descricao:'', disponibilidade:'', ncm:'', qtd:'', unidade:'UN', precoUnitario:'' }; }

function cotacaoTotais(c){
  const valorItens = (c.itens||[]).reduce((s,it)=> s + ((Number(it.qtd)||0) * (Number(it.precoUnitario)||0)), 0);
  const valorFrete = (Number(c.freteInternacional)||0) + (Number(c.despesasLogisticas)||0) + (Number(c.seguro)||0);
  const valorFatura = valorItens + valorFrete - (Number(c.desconto)||0);
  return { valorItens, valorFrete, valorFatura };
}

function renderCotacoesModulo(){
  if(ui.cotacaoEditId) return renderCotacaoForm();
  return renderCotacoesLista();
}

function renderCotacoesLista(){
  const lista = porEmpresa(state.cotacoes);
  if(!lista.length){
    return `
    <div class="hint">Gere cotações (proforma) numeradas automaticamente, exporte em PDF para enviar ao cliente e, quando aprovado, converta direto em processo de venda.</div>
    <div style="margin-bottom:14px;"><button class="btn btn-primary" onclick="abrirNovaCotacao()">+ Nova Cotação</button></div>
    <div class="empty-state"><div class="big">—</div><div>Nenhuma cotação cadastrada ainda.</div></div>`;
  }
  return `
  <div class="hint">Gere cotações (proforma) numeradas automaticamente, exporte em PDF para enviar ao cliente e, quando aprovado, converta direto em processo de venda.</div>
  <div style="margin-bottom:14px;"><button class="btn btn-primary" onclick="abrirNovaCotacao()">+ Nova Cotação</button></div>
  <div class="table-wrap"><table>
    <thead><tr>
      <th>Código</th><th>Empresa</th><th>Data</th><th>Cliente</th><th>Destino</th>
      <th class="text-right">Valor Total</th><th>Status</th><th>Processo Gerado</th><th></th>
    </tr></thead>
    <tbody>
      ${lista.map(c=>{
        const t = cotacaoTotais(c);
        return `
        <tr>
          <td><b>${esc(c.codigo)}</b></td>
          <td>${esc(c.empresa)}</td>
          <td>${fmtDate(c.data)}</td>
          <td>${esc(clienteNome(c.clienteId))}</td>
          <td>${esc(c.destino||'—')}</td>
          <td class="text-right mono">${fmtCot(t.valorFatura, c.moeda)}</td>
          <td>${badge(c.status, {'Em aberto':'slate','Enviada':'blue','Aprovada':'amber','Convertida em Venda':'green','Cancelada':'red'}[c.status]||'slate')}</td>
          <td>${c.processoGerado? `<span class="badge badge-green">${esc(c.processoGerado)}</span>` : '—'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-ghost btn-sm" onclick="abrirEditarCotacao('${c.id}')">Editar</button>
            <button class="btn btn-ghost btn-sm" onclick="gerarPDFCotacao('${c.id}')">Gerar PDF</button>
            ${!c.processoGerado? `<button class="btn btn-primary btn-sm" onclick="gerarVendaDeCotacao('${c.id}')">Gerar Venda</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="excluirCotacao('${c.id}')">Excluir</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>
  `;
}

function abrirNovaCotacao(){
  itensRows = [blankItem()];
  ui.cotacaoEditId = 'new';
  render();
}
function abrirEditarCotacao(id){
  const c = state.cotacoes.find(x=>x.id===id);
  itensRows = (c.itens && c.itens.length) ? JSON.parse(JSON.stringify(c.itens)) : [blankItem()];
  ui.cotacaoEditId = id;
  render();
}
function cancelarCotacao(){ ui.cotacaoEditId = null; itensRows = []; render(); }

function campo(label, inputHtml, obrigatorio){
  return `<div class="field"><label>${label}${obrigatorio?' *':''}</label>${inputHtml}</div>`;
}
function inputTxt(id, value){ return `<input type="text" id="${id}" value="${esc(value||'')}">`; }
function inputNum(id, value){ return `<input type="number" step="any" id="${id}" value="${esc(value===undefined||value===null?'':value)}">`; }
function inputDate(id, value){ return `<input type="date" id="${id}" value="${esc(value||'')}">`; }
function inputArea(id, value){ return `<textarea rows="2" id="${id}">${esc(value||'')}</textarea>`; }
function selectHtml(id, opts, value, onchange){
  return `<select id="${id}" ${onchange?`onchange="${onchange}"`:''}>
    <option value="">—</option>
    ${opts.map(o=>`<option value="${esc(o)}" ${String(value)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}
  </select>`;
}
function selectCliente(id, value){
  return `<select id="${id}" onchange="preencherConsignatario()">
    <option value="">—</option>
    ${state.clientes.map(c=>`<option value="${c.id}" ${String(value)===String(c.id)?'selected':''}>${esc(c.nome)}</option>`).join('')}
  </select>`;
}

function renderCotacaoForm(){
  const isNew = ui.cotacaoEditId==='new';
  const c = isNew ? {
    empresa:'NEXUS', data: todayISO(), clienteId:'', consignatarioTxt:'', origem:'', destino:'', volumes:'', pesoBruto:'',
    incoterm:'', dimensoes:'', moeda:'USD', freteInternacional:'', despesasLogisticas:'', seguro:'', desconto:'',
    modal:'AÉREO', aodOrigem:'', aodDestino:'', ciaTransporte:'', tt:'', termosPagamento:'100% ANTECIPADO', observacoes:'',
    responsavelNome:'', responsavelCargo:'', status:'Em aberto',
  } : state.cotacoes.find(x=>x.id===ui.cotacaoEditId);
  const salvo = !isNew;
  const perfil = state.empresasPerfil[c.empresa] || {};

  return `
  <div style="margin-bottom:14px;"><button class="btn btn-ghost btn-sm" onclick="cancelarCotacao()">‹ Voltar para lista</button></div>
  <div class="card" style="margin-bottom:16px;">
    <div class="section-title" style="margin-top:0;">Identificação ${salvo? '— <span class="mono">'+esc(c.codigo)+'</span>' : '(código gerado ao salvar)'}</div>
    <div class="grid grid-3">
      ${campo('Empresa', selectHtml('cf_empresa', EMPRESAS, c.empresa, 'onEmpresaCotacaoChange()'), true)}
      ${campo('Data', inputDate('cf_data', c.data), true)}
      ${campo('Status', selectHtml('cf_status', ['Em aberto','Enviada','Aprovada','Convertida em Venda','Cancelada'], c.status))}
    </div>
    <div class="grid grid-2">
      ${campo('Cliente', selectCliente('cf_clienteId', c.clienteId), true)}
      ${campo('Consignatário (nome/endereço na proforma)', inputArea('cf_consignatarioTxt', c.consignatarioTxt))}
    </div>
  </div>

  <div class="card" style="margin-bottom:16px;">
    <div class="section-title" style="margin-top:0;">Rota &amp; Carga</div>
    <div class="grid grid-3">
      ${campo('Origem', inputTxt('cf_origem', c.origem))}
      ${campo('Destino', inputTxt('cf_destino', c.destino))}
      ${campo('Volumes', inputTxt('cf_volumes', c.volumes))}
      ${campo('Peso Bruto', inputTxt('cf_pesoBruto', c.pesoBruto))}
      ${campo('Incoterm', selectHtml('cf_incoterm', INCOTERMS, c.incoterm))}
      ${campo('Modal', selectHtml('cf_modal', MODAIS, c.modal))}
      ${campo('AOD Origem', inputTxt('cf_aodOrigem', c.aodOrigem))}
      ${campo('AOD Destino', inputTxt('cf_aodDestino', c.aodDestino))}
      ${campo('Cia / Transportadora', inputTxt('cf_ciaTransporte', c.ciaTransporte))}
      ${campo('TT (tempo de trânsito)', inputTxt('cf_tt', c.tt))}
      ${campo('Dimensões', inputArea('cf_dimensoes', c.dimensoes))}
      ${campo('Moeda', selectHtml('cf_moeda', MOEDAS_PROC, c.moeda))}
    </div>
  </div>

  <div class="card" style="margin-bottom:16px;">
    <div class="section-title" style="margin-top:0;">Itens</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th style="min-width:220px;">Descrição</th><th>Disponibilidade</th><th>NCM</th><th>Qtd</th><th>Un.</th>
          <th>Preço Unitário</th><th class="text-right">Total</th><th></th>
        </tr></thead>
        <tbody id="itensBody">${itensRows.map((it,i)=>itemRowHTML(it,i)).join('')}</tbody>
      </table>
    </div>
    <div style="margin-top:10px;"><button type="button" class="btn btn-ghost btn-sm" onclick="addItemRow()">+ Adicionar item</button></div>
  </div>

  <div class="card" style="margin-bottom:16px;">
    <div class="section-title" style="margin-top:0;">Financeiro</div>
    <div class="grid grid-2">
      <div>
        ${campo('Frete Internacional', inputNum('cf_freteInternacional', c.freteInternacional) .replace('<input','<input oninput="recalcFooterTotals()"'))}
        ${campo('Despesas Logísticas', inputNum('cf_despesasLogisticas', c.despesasLogisticas).replace('<input','<input oninput="recalcFooterTotals()"'))}
        ${campo('Seguro', inputNum('cf_seguro', c.seguro).replace('<input','<input oninput="recalcFooterTotals()"'))}
        ${campo('Desconto', inputNum('cf_desconto', c.desconto).replace('<input','<input oninput="recalcFooterTotals()"'))}
      </div>
      <div class="table-wrap">
        <table>
          <tbody>
            <tr><td>Valor Total Itens</td><td class="text-right mono" id="totalItensDisplay">—</td></tr>
            <tr><td>Valor Total Frete</td><td class="text-right mono" id="totalFreteDisplay">—</td></tr>
            <tr style="font-weight:700;background:#eef2ff;"><td>VALOR TOTAL FATURA</td><td class="text-right mono" id="totalFaturaDisplay">—</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px;">
    <div class="section-title" style="margin-top:0;">Pagamento &amp; Observações</div>
    <div class="grid grid-2">
      ${campo('Termos de Pagamento', inputTxt('cf_termosPagamento', c.termosPagamento))}
      ${campo('Observações', inputTxt('cf_observacoes', c.observacoes))}
      ${campo('Responsável (nome)', inputTxt('cf_responsavelNome', c.responsavelNome || perfil.assinanteNome))}
      ${campo('Responsável (cargo)', inputTxt('cf_responsavelCargo', c.responsavelCargo || perfil.assinanteCargo))}
    </div>
  </div>

  <div class="modal-actions" style="justify-content:flex-start;">
    <button class="btn btn-primary" onclick="salvarCotacao()">Salvar Cotação</button>
    <button class="btn btn-ghost" onclick="cancelarCotacao()">Cancelar</button>
    ${salvo? `<button class="btn btn-ghost" onclick="gerarPDFCotacao('${c.id}')">Gerar PDF</button>` : ''}
    ${salvo && !c.processoGerado? `<button class="btn btn-ghost" onclick="gerarVendaDeCotacao('${c.id}')">Gerar Venda</button>` : ''}
  </div>
  `;
}

function onEmpresaCotacaoChange(){ /* apenas para futura extensão (ex.: pré-carregar dados por empresa) */ }

function preencherConsignatario(){
  const sel = document.getElementById('cf_clienteId');
  const txt = document.getElementById('cf_consignatarioTxt');
  if(!sel || !txt) return;
  const c = state.clientes.find(x=>x.id===sel.value);
  if(c && !txt.value.trim()) txt.value = c.nome + (c.pais? ('\n'+c.pais):'');
}

function itemRowHTML(it, idx){
  const st = 'width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12.5px;';
  return `<tr>
    <td><input type="text" style="${st}min-width:200px;" id="it_descricao_${idx}" value="${esc(it.descricao)}"></td>
    <td><input type="text" style="${st}width:90px;" id="it_disponibilidade_${idx}" value="${esc(it.disponibilidade)}"></td>
    <td><input type="text" style="${st}width:90px;" id="it_ncm_${idx}" value="${esc(it.ncm)}"></td>
    <td><input type="number" step="any" style="${st}width:65px;" id="it_qtd_${idx}" value="${esc(it.qtd)}" oninput="recalcRowAndFooter(${idx})"></td>
    <td><input type="text" style="${st}width:55px;" id="it_unidade_${idx}" value="${esc(it.unidade||'UN')}"></td>
    <td><input type="number" step="any" style="${st}width:100px;" id="it_preco_${idx}" value="${esc(it.precoUnitario)}" oninput="recalcRowAndFooter(${idx})"></td>
    <td class="text-right mono" id="it_total_${idx}">—</td>
    <td><button type="button" class="btn btn-danger btn-sm" onclick="removeItemRow(${idx})">×</button></td>
  </tr>`;
}

function syncItensRowsFromDOM(){
  itensRows = itensRows.map((_,i)=>{
    const g = (k)=>{ const el = document.getElementById('it_'+k+'_'+i); return el? el.value : ''; };
    return { descricao:g('descricao'), disponibilidade:g('disponibilidade'), ncm:g('ncm'), qtd:g('qtd'), unidade:g('unidade')||'UN', precoUnitario:g('preco') };
  });
}

function addItemRow(){
  syncItensRowsFromDOM();
  itensRows.push(blankItem());
  document.getElementById('itensBody').innerHTML = itensRows.map((it,i)=>itemRowHTML(it,i)).join('');
  recalcFooterTotals();
}
function removeItemRow(idx){
  syncItensRowsFromDOM();
  if(itensRows.length<=1){ itensRows = [blankItem()]; }
  else { itensRows.splice(idx,1); }
  document.getElementById('itensBody').innerHTML = itensRows.map((it,i)=>itemRowHTML(it,i)).join('');
  recalcFooterTotals();
}

function recalcRowAndFooter(idx){
  const qtd = Number(document.getElementById('it_qtd_'+idx).value)||0;
  const preco = Number(document.getElementById('it_preco_'+idx).value)||0;
  const moedaEl = document.getElementById('cf_moeda');
  const moeda = moedaEl? moedaEl.value : 'USD';
  document.getElementById('it_total_'+idx).textContent = fmtCot(qtd*preco, moeda);
  recalcFooterTotals();
}

function recalcFooterTotals(){
  const moedaEl = document.getElementById('cf_moeda');
  const moeda = moedaEl? moedaEl.value : 'USD';
  let valorItens = 0;
  itensRows.forEach((_,i)=>{
    const qtdEl = document.getElementById('it_qtd_'+i), precoEl = document.getElementById('it_preco_'+i), totalEl = document.getElementById('it_total_'+i);
    const qtd = qtdEl? (Number(qtdEl.value)||0) : 0;
    const preco = precoEl? (Number(precoEl.value)||0) : 0;
    if(totalEl) totalEl.textContent = fmtCot(qtd*preco, moeda);
    valorItens += qtd*preco;
  });
  const g = (id)=>{ const el = document.getElementById(id); return el? (Number(el.value)||0) : 0; };
  const valorFrete = g('cf_freteInternacional') + g('cf_despesasLogisticas') + g('cf_seguro');
  const valorFatura = valorItens + valorFrete - g('cf_desconto');
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = fmtCot(v, moeda); };
  set('totalItensDisplay', valorItens);
  set('totalFreteDisplay', valorFrete);
  set('totalFaturaDisplay', valorFatura);
}

const COTACAO_TO_DB = (registro) => ({
  codigo: registro.codigo, empresa_id: empresaIdDe(registro.empresa), data: dOrNull(registro.data),
  cliente_id: registro.clienteId || null, consignatario_txt: registro.consignatarioTxt,
  origem: registro.origem, destino: registro.destino, volumes: registro.volumes, peso_bruto: registro.pesoBruto,
  incoterm: dOrNull(registro.incoterm), dimensoes: registro.dimensoes, moeda: dOrNull(registro.moeda), modal: dOrNull(registro.modal),
  aod_origem: registro.aodOrigem, aod_destino: registro.aodDestino, cia_transporte: registro.ciaTransporte, tt: registro.tt,
  termos_pagamento: registro.termosPagamento, observacoes: registro.observacoes,
  responsavel_nome: registro.responsavelNome, responsavel_cargo: registro.responsavelCargo,
  frete_internacional: registro.freteInternacional, despesas_logisticas: registro.despesasLogisticas,
  seguro: registro.seguro, desconto: registro.desconto, status: dOrNull(registro.status) || 'Em aberto',
});

async function salvarCotacao(){
  syncItensRowsFromDOM();
  const g = (id)=>{ const el = document.getElementById(id); return el? el.value : ''; };
  const empresa = g('cf_empresa'), clienteId = g('cf_clienteId'), data = g('cf_data');
  if(!empresa || !clienteId){ alert('Preencha Empresa e Cliente.'); return; }
  const itensLimpos = itensRows.filter(it => it.descricao || it.qtd || it.precoUnitario).map((it,i)=>({
    ordem:i, descricao: it.descricao, disponibilidade: it.disponibilidade, ncm: it.ncm,
    qtd: it.qtd===''? null : Number(it.qtd), unidade: it.unidade||'UN', precoUnitario: it.precoUnitario===''? null : Number(it.precoUnitario),
  }));
  const isNew = ui.cotacaoEditId==='new';
  try{
    const registro = {
      empresa, data, clienteId, consignatarioTxt: g('cf_consignatarioTxt'),
      origem: g('cf_origem'), destino: g('cf_destino'), volumes: g('cf_volumes'), pesoBruto: g('cf_pesoBruto'),
      incoterm: g('cf_incoterm'), dimensoes: g('cf_dimensoes'), moeda: g('cf_moeda'),
      freteInternacional: Number(g('cf_freteInternacional'))||0, despesasLogisticas: Number(g('cf_despesasLogisticas'))||0,
      seguro: Number(g('cf_seguro'))||0, desconto: Number(g('cf_desconto'))||0,
      modal: g('cf_modal'), aodOrigem: g('cf_aodOrigem'), aodDestino: g('cf_aodDestino'), ciaTransporte: g('cf_ciaTransporte'), tt: g('cf_tt'),
      termosPagamento: g('cf_termosPagamento'), observacoes: g('cf_observacoes'),
      responsavelNome: g('cf_responsavelNome'), responsavelCargo: g('cf_responsavelCargo'),
      status: g('cf_status') || 'Em aberto',
    };
    let cotacaoId, codigo, processoGerado;
    if(isNew){
      codigo = await nextCotacaoCodigo(empresa, data);
      registro.codigo = codigo;
      const { data: inserida, error } = await sb.from('cotacoes').insert(COTACAO_TO_DB(registro)).select().single();
      if(error) throw error;
      cotacaoId = inserida.id; processoGerado = null;
    } else {
      cotacaoId = ui.cotacaoEditId;
      const existente = state.cotacoes.find(x=>x.id===cotacaoId);
      codigo = existente.codigo; processoGerado = existente.processoGerado;
      registro.codigo = codigo;
      const { error } = await sb.from('cotacoes').update(COTACAO_TO_DB(registro)).eq('id', cotacaoId);
      if(error) throw error;
      await sb.from('cotacao_itens').delete().eq('cotacao_id', cotacaoId);
    }
    if(itensLimpos.length){
      const { error: errItens } = await sb.from('cotacao_itens').insert(itensLimpos.map(it=>({ ...it, cotacao_id: cotacaoId })));
      if(errItens) throw errItens;
    }
    const salva = { id:cotacaoId, codigo, ...registro, itens: itensLimpos.map(({ordem, ...rest})=>rest), processoGerado };
    if(isNew){ state.cotacoes.push(salva); }
    else { const idx = state.cotacoes.findIndex(x=>x.id===cotacaoId); state.cotacoes[idx] = salva; }
    ui.cotacaoEditId = null; itensRows = [];
    render();
  }catch(e){
    alert('Erro ao salvar cotação: ' + e.message);
  }
}

async function excluirCotacao(id){
  if(!confirm('Excluir esta cotação?')) return;
  try{
    await sb.from('cotacoes').delete().eq('id', id); // cotacao_itens cai em cascata (ON DELETE CASCADE)
    state.cotacoes = state.cotacoes.filter(c=>c.id!==id);
    render();
  }catch(e){
    alert('Erro ao excluir cotação: ' + e.message);
  }
}

async function gerarVendaDeCotacao(id){
  const c = state.cotacoes.find(x=>x.id===id);
  if(!c) return;
  if(c.processoGerado){ alert('Esta cotação já gerou o processo ' + c.processoGerado + '.'); return; }
  if(state.processos.some(p=>p.numero===c.codigo)){ alert('Já existe um processo com o número ' + c.codigo + '. Verifique os processos cadastrados antes de continuar.'); return; }
  if(!confirm(`Gerar o processo de venda ${c.codigo} a partir desta cotação?`)) return;
  const t = cotacaoTotais(c);
  const numero = c.codigo;
  const descricao = (c.itens||[]).map(it=>it.descricao).filter(Boolean).join(' / ') || `Conforme cotação ${c.codigo}`;
  try{
    const novoProcesso = await dbInserir('processos', {
      numero, empresa: c.empresa, clienteId: c.clienteId, descricao,
      dataAbertura: todayISO(), dataProntidao:'', dataEmbarque:'',
      moeda: c.moeda, valorMoeda: t.valorFatura, taxaCambio:'', dataFechCambio:'',
      statusRecebimento:'Pendente', obs: `Gerado a partir da cotação ${c.codigo}`,
    });
    state.processos.push(novoProcesso);
    await sb.from('cotacoes').update({ status:'Convertida em Venda', processo_gerado_id: novoProcesso.id }).eq('id', id);
    c.status = 'Convertida em Venda';
    c.processoGerado = numero;
    render();
  }catch(e){
    alert('Erro ao gerar venda: ' + e.message);
  }
}

// ---------- Geração de PDF (janela de impressão) ----------
function buildCotacaoDocumentoHTML(c){
  const perfil = state.empresasPerfil[c.empresa] || {};
  const t = cotacaoTotais(c);
  const itens = (c.itens && c.itens.length) ? c.itens : [];
  const minRows = 10;
  let linhas = itens.map((it,i)=>`
    <tr>
      <td style="text-align:center;">${i+1}</td>
      <td>${esc(it.descricao)}</td>
      <td style="text-align:center;">${esc(it.disponibilidade)}</td>
      <td style="text-align:center;">${esc(it.ncm)}</td>
      <td style="text-align:center;">${esc(it.qtd)}</td>
      <td style="text-align:center;">${esc(it.unidade)}</td>
      <td style="text-align:right;">${c.moeda} ${fmtNum(it.precoUnitario)}</td>
      <td style="text-align:right;">${c.moeda} ${fmtNum((Number(it.qtd)||0)*(Number(it.precoUnitario)||0))}</td>
    </tr>`).join('');
  for(let i=itens.length; i<minRows; i++){ linhas += `<tr>${'<td>&nbsp;</td>'.repeat(8)}</tr>`; }

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(c.codigo)} — Proforma Invoice</title>
  <style>
    @page{ size:A4; margin:14mm; }
    *{box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:0;}
    .doc{border:1.5px solid #111;}
    .row{display:flex;border-bottom:1px solid #111;}
    .row:last-child{border-bottom:none;}
    .cell{padding:8px 10px;border-right:1px solid #111;}
    .cell:last-child{border-right:none;}
    .lbl{font-weight:700;font-size:9.5px;text-transform:uppercase;color:#333;margin-bottom:2px;}
    .val{font-size:11.5px;}
    table.itens{width:100%;border-collapse:collapse;}
    table.itens th{background:#f3f4f6;border:1px solid #111;padding:6px;font-size:9.5px;text-transform:uppercase;}
    table.itens td{border:1px solid #111;padding:6px;font-size:10.5px;height:20px;}
    .totalFatura{background:#dbeafe;font-weight:800;font-size:13px;}
    .logo{font-weight:800;font-size:22px;letter-spacing:.5px;}
    .logo span{color:#4f7cff;}
    .tagline{font-size:9px;color:#666;}
    .doc-logo{max-width:230px;max-height:80px;width:auto;height:auto;}
    .sign{margin-top:50px;text-align:center;width:260px;border-top:1px solid #111;padding-top:4px;font-size:10px;font-weight:700;}
    @media print{ .no-print{display:none;} }
  </style></head>
  <body>
    <div class="no-print" style="padding:10px;background:#111;color:#fff;text-align:center;">
      <button onclick="window.print()" style="padding:8px 16px;font-weight:700;border-radius:6px;border:none;background:#4f7cff;color:#fff;cursor:pointer;">Imprimir / Salvar como PDF</button>
    </div>
    <div class="doc">
      <div class="row">
        <div class="cell" style="flex:1;">
          <div class="lbl">Embarcador</div>
          <div class="val" style="font-weight:700;">${esc(perfil.nomeCompleto||c.empresa)}</div>
          <div class="val" style="white-space:pre-line;">${esc(perfil.endereco||'')}</div>
          <div class="val">${esc(perfil.documento||'')}</div>
          <div class="val">${esc(perfil.site||'')}</div>
        </div>
        <div class="cell" style="flex:1;text-align:right;">
          ${perfil.logoDataUrl
            ? `<img src="${perfil.logoDataUrl}" alt="${esc(perfil.nomeCompleto||c.empresa)}" class="doc-logo">`
            : `<div class="logo">${esc(c.empresa)} <span>GROUP TRADING</span></div><div class="tagline">Connecting the world</div>`}
        </div>
      </div>
      <div class="row">
        <div class="cell" style="flex:1;"><div class="lbl">Proforma Invoice</div></div>
        <div class="cell" style="flex:1;text-align:right;"><div class="lbl">Nº</div><div class="val" style="font-weight:700;">${esc(c.codigo)}</div></div>
      </div>
      <div class="row">
        <div class="cell" style="flex:1;"><div class="lbl">Data</div><div class="val">${fmtDate(c.data)}</div>
          <div class="lbl" style="margin-top:6px;">Consignatário</div><div class="val" style="white-space:pre-line;">${esc(c.consignatarioTxt||clienteNome(c.clienteId))}</div>
        </div>
        <div class="cell" style="flex:1;">
          <div class="lbl">Origem</div><div class="val">${esc(c.origem)}</div>
          <div class="lbl" style="margin-top:6px;">Incoterm</div><div class="val">${esc(c.incoterm)}</div>
        </div>
        <div class="cell" style="flex:1;">
          <div class="lbl">Destino</div><div class="val">${esc(c.destino)}</div>
          <div class="lbl" style="margin-top:6px;">Dimensões</div><div class="val" style="white-space:pre-line;">${esc(c.dimensoes)}</div>
        </div>
        <div class="cell" style="flex:1;">
          <div class="lbl">Volumes</div><div class="val">${esc(c.volumes)}</div>
          <div class="lbl" style="margin-top:6px;">Peso Bruto</div><div class="val">${esc(c.pesoBruto)}</div>
        </div>
      </div>
    </div>

    <table class="itens" style="margin-top:10px;">
      <thead><tr><th>Item</th><th>Descrição</th><th>Disponibilidade</th><th>NCM</th><th>Qtd</th><th>Un. Medida</th><th>Preço Unitário</th><th>Total</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>

    <div class="doc" style="margin-top:10px;">
      <div class="row">
        <div class="cell" style="flex:1;">
          <div class="lbl">Frete Internacional</div><div class="val">${fmtCot(c.freteInternacional,c.moeda)}</div>
          <div class="lbl" style="margin-top:6px;">Despesas Logísticas</div><div class="val">${fmtCot(c.despesasLogisticas,c.moeda)}</div>
          <div class="lbl" style="margin-top:6px;">Seguro</div><div class="val">${fmtCot(c.seguro,c.moeda)}</div>
          <div class="lbl" style="margin-top:6px;">Modal</div><div class="val">${esc(c.modal)}</div>
          <div class="lbl" style="margin-top:6px;">AOD Origem</div><div class="val">${esc(c.aodOrigem)}</div>
          <div class="lbl" style="margin-top:6px;">Cia / Transportadora</div><div class="val">${esc(c.ciaTransporte)}</div>
        </div>
        <div class="cell" style="flex:1;">
          <div class="lbl">Valor Total Itens</div><div class="val">${fmtCot(t.valorItens,c.moeda)}</div>
          <div class="lbl" style="margin-top:6px;">Valor Total Frete</div><div class="val">${fmtCot(t.valorFrete,c.moeda)}</div>
          <div class="lbl" style="margin-top:6px;">Desconto</div><div class="val">${fmtCot(c.desconto,c.moeda)}</div>
          <div class="lbl" style="margin-top:6px;">AOD Destino</div><div class="val">${esc(c.aodDestino)}</div>
          <div class="lbl" style="margin-top:6px;">TT</div><div class="val">${esc(c.tt)}</div>
          <div class="lbl totalFatura" style="margin-top:10px;padding:8px;border-radius:4px;">VALOR TOTAL FATURA: ${fmtCot(t.valorFatura,c.moeda)}</div>
        </div>
      </div>
      <div class="row">
        <div class="cell" style="flex:1;">
          <div class="lbl">Dados para Pagamento</div>
          <div class="val">BENEFICIARY: ${esc(perfil.bancoBeneficiary||'')}</div>
          <div class="val">${esc(perfil.bancoEndereco||'')}</div>
          <div class="val">BANK: ${esc(perfil.bancoNome||'')}</div>
          <div class="val">ACCOUNT: ${esc(perfil.bancoConta||'')} | SWIFT: ${esc(perfil.bancoSwift||'')}</div>
          <div class="val">ABA/ROUTING: ${esc(perfil.bancoAba||'')} | CURRENCY: ${esc(perfil.bancoMoeda||'')}</div>
          <div class="val">INTERMEDIARY: ${esc(perfil.bancoIntermediario||'')} | SWIFT: ${esc(perfil.bancoIntermediarioSwift||'')}</div>
        </div>
        <div class="cell" style="flex:1;">
          <div class="lbl">Termos de Pagamento</div><div class="val">${esc(c.termosPagamento)}</div>
        </div>
        <div class="cell" style="flex:1;">
          <div class="lbl">Observações</div><div class="val">${esc(c.observacoes)}</div>
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:center;">
      <div class="sign">${esc(c.responsavelNome||perfil.assinanteNome||'')}<br><span style="font-weight:400;">${esc(c.responsavelCargo||perfil.assinanteCargo||'')}</span></div>
    </div>
    <div style="text-align:center;font-size:9px;color:#666;margin-top:16px;">${esc(perfil.nomeCompleto||c.empresa)} | ${esc(perfil.site||'')} | ${esc(perfil.email||'')}</div>
  </body></html>`;
}

function gerarPDFCotacao(id){
  const c = state.cotacoes.find(x=>x.id===id);
  if(!c){ alert('Salve a cotação antes de gerar o PDF.'); return; }
  const html = buildCotacaoDocumentoHTML(c);
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if(!win || win.closed || typeof win.closed==='undefined'){
    // Pop-up bloqueado pelo navegador: baixa o arquivo para abrir manualmente
    const a = document.createElement('a');
    a.href = url; a.download = 'Proforma_' + String(c.codigo).replace('/','-') + '.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    alert('Seu navegador bloqueou a janela automática. Baixamos o arquivo da proforma (HTML) — abra-o e use "Imprimir / Salvar como PDF".');
  }
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}

