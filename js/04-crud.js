// ============================================================
// MOTOR GENÉRICO DE CRUD (tabela + modal)
// ============================================================
function fieldInput(col, value, extra){
  extra = extra || '';
  value = value===undefined||value===null? '' : value;
  const common = `id="f_${col.key}" data-key="${col.key}"`;
  if(col.type==='select'){
    const opts = col.options || [];
    return `<select ${common} ${extra}>
      <option value="">—</option>
      ${opts.map(o=>`<option value="${esc(o)}" ${String(value)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}
    </select>`;
  }
  if(col.type==='clienteSelect'){
    return `<select ${common}>
      <option value="">—</option>
      ${state.clientes.map(c=>`<option value="${c.id}" ${String(value)===String(c.id)?'selected':''}>${esc(c.nome)}</option>`).join('')}
    </select>`;
  }
  if(col.type==='processoSelect'){
    return `<select ${common}>
      <option value="">${col.placeholderAdm? 'ADMINISTRATIVO (sem processo vinculado)' : '—'}</option>
      ${state.processos.map(p=>`<option value="${esc(p.numero)}" ${String(value)===String(p.numero)?'selected':''}>${esc(p.numero)} — ${esc(clienteNome(p.clienteId))}</option>`).join('')}
    </select>`;
  }
  if(col.type==='date') return `<input type="date" ${common} value="${esc(value)}">`;
  if(col.type==='number') return `<input type="number" step="any" ${common} value="${esc(value)}">`;
  if(col.type==='moeda'){
    const raw = (value===''||value===null||value===undefined) ? '' : Number(value).toFixed(2);
    const display = raw===''? '' : fmtMoedaMascara(raw);
    return `<input type="text" inputmode="decimal" ${common} data-raw="${raw}" value="${display}" oninput="maskMoedaInput(this)">`;
  }
  if(col.type==='textarea') return `<textarea rows="2" ${common}>${esc(value)}</textarea>`;
  return `<input type="text" ${common} value="${esc(value)}">`;
}

// Máscara de digitação estilo contábil: usuário digita só números, os últimos 2 viram centavos.
function fmtMoedaMascara(rawStr){
  const n = Number(rawStr)||0;
  const negativo = n<0;
  const abs = Math.abs(n).toFixed(2);
  const [intPart, centPart] = abs.split('.');
  const intFmt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return (negativo?'-':'') + intFmt + ',' + centPart;
}
function maskMoedaInput(el){
  let digits = el.value.replace(/\D/g,'');
  if(!digits){ el.dataset.raw=''; el.value=''; return; }
  digits = digits.replace(/^0+(?=\d)/,'');
  while(digits.length<3) digits = '0'+digits;
  const intPart = digits.slice(0,-2), centPart = digits.slice(-2);
  el.dataset.raw = intPart + '.' + centPart;
  el.value = fmtMoedaMascara(el.dataset.raw);
}

function openModal(tabela, id){
  const def = TABLE_DEFS[tabela];
  const tabelaReal = def.tabelaReal || tabela;
  let dados = id ? state[tabelaReal].find(r=>r.id===id) : {};
  if(!id && tabela==='processos' && typeof nextProcessoNumero==='function'){
    dados = Object.assign({ numero: nextProcessoNumero(todayISO()) }, dados);
  }
  if(!id && def.empresaFixa){ dados = Object.assign({ empresa: def.empresaFixa }, dados); }
  ui.modal = { tabela, id: id||null, def, dados: Object.assign({}, dados) };
  render();
}
function closeModal(){ ui.modal = null; render(); }

function renderModal(){
  const { def, dados, id, tabela } = ui.modal;
  return `
  <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <h3>${id? 'Editar' : 'Novo'} — ${def.titulo}</h3>
      <div class="modal-sub">${def.subtitulo||''}</div>
      <form id="modalForm" onsubmit="event.preventDefault(); salvarModal();">
        ${def.colunas.map(col => `
          <div class="field">
            <label ${tabela==='contasPagar' && col.key==='valor' ? 'id="lbl_valor_cap"' : ''}>${tabela==='contasPagar' && col.key==='valor' ? (dados.empresa==='NEXUS'?'Valor (US$)':'Valor (R$)') : col.label}${col.obrigatorio?' *':''}</label>
            ${fieldInput(col, dados[col.key], (tabela==='contasPagar' && col.key==='empresa') ? `onchange="atualizarLabelValorCAP(this.value)"` : '')}
          </div>
        `).join('')}
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  </div>`;
}

function atualizarLabelValorCAP(empresa){
  const lbl = document.getElementById('lbl_valor_cap');
  if(lbl) lbl.textContent = (empresa==='NEXUS' ? 'Valor (US$)' : 'Valor (R$)') + ' *';
}

async function salvarModal(){
  const { tabela, id, def } = ui.modal;
  const tabelaReal = def.tabelaReal || tabela;
  const novo = {};
  let erro = null;
  def.colunas.forEach(col=>{
    const el = document.getElementById('f_'+col.key);
    let v = el.value;
    if(col.type==='number') v = v===''? '' : Number(v);
    if(col.type==='moeda') v = (el.dataset.raw===undefined || el.dataset.raw==='') ? '' : Number(el.dataset.raw);
    if(col.obrigatorio && !v && v!==0) erro = `Preencha o campo "${col.label}".`;
    novo[col.key] = v;
  });
  if(def.empresaFixa) novo.empresa = def.empresaFixa;
  if(erro){ alert(erro); return; }
  const btn = document.querySelector('#modalForm button[type="submit"]');
  if(btn){ btn.disabled = true; btn.textContent = 'Salvando...'; }
  try{
    let salvo;
    if(id){
      salvo = await dbAtualizar(tabelaReal, id, novo);
      const idx = state[tabelaReal].findIndex(r=>r.id===id);
      state[tabelaReal][idx] = salvo;
    } else {
      salvo = await dbInserir(tabelaReal, novo);
      state[tabelaReal].push(salvo);
    }
    if(tabelaReal==='despesas'){
      await sincronizarContaAPagarDaDespesa(salvo);
      state.contasPagar = await dbListar('contasPagar');
    }
    if(tabelaReal==='despAdm'){
      await sincronizarContaAPagarDoDespAdm(salvo);
      state.contasPagar = await dbListar('contasPagar');
    }
    if(tabelaReal==='processos'){
      await sincronizarContaAReceberDoProcesso(salvo);
      state.contasReceber = await dbListar('contasReceber');
    }
    if(tabelaReal==='contasPagar'){
      await sincronizarDespesaDaContaPagar(salvo);
      state.despesas = await dbListar('despesas');
    }
    closeModal();
  }catch(e){
    alert('Erro ao salvar no banco: ' + e.message);
    if(btn){ btn.disabled = false; btn.textContent = 'Salvar'; }
  }
}

async function excluirLinha(tabela, id){
  if(!confirm('Excluir este registro?')) return;
  const def = TABLE_DEFS[tabela];
  const tabelaReal = def.tabelaReal || tabela;
  try{
    if(tabelaReal==='processos'){
      await sb.from('contas_receber').delete().eq('processo_id', id).eq('ref','VALOR NEXUS (auto)');
    }
    await dbExcluir(tabelaReal, id);
    state[tabelaReal] = state[tabelaReal].filter(r=>r.id!==id);
    if(tabelaReal==='despesas'){
      // a exclusão da despesa já cai em cascata no banco (contas_pagar.despesa_id)
      state.contasPagar = state.contasPagar.filter(r=>r.despesaId!==id);
    }
    if(tabelaReal==='despAdm'){
      state.contasPagar = state.contasPagar.filter(r=>r.despAdmId!==id);
    }
    if(tabelaReal==='processos'){
      // já removemos o título automático de Contas a Receber acima; recarrega pra refletir
      state.contasReceber = await dbListar('contasReceber');
    }
    render();
  }catch(e){
    alert('Erro ao excluir no banco: ' + e.message);
  }
}

function renderCrudTable(tabela, colunasExtras){
  const def = TABLE_DEFS[tabela];
  const tabelaReal = def.tabelaReal || tabela;
  let linhas = def.empresaFixa ? state[tabelaReal].filter(r=>r.empresa===def.empresaFixa) : porEmpresa(state[tabelaReal]);
  const colunas = def.colunas;
  if(!linhas.length){
    return `
    <div class="hint">${def.subtitulo||''}</div>
    <div style="margin-bottom:14px;"><button class="btn btn-primary" onclick="openModal('${tabela}')">+ Novo registro</button></div>
    <div class="empty-state">
      <div class="big">—</div>
      <div>Nenhum registro cadastrado ainda.</div>
    </div>`;
  }
  return `
  <div class="hint">${def.subtitulo||''}</div>
  <div style="margin-bottom:14px;"><button class="btn btn-primary" onclick="openModal('${tabela}')">+ Novo registro</button></div>
  <div class="table-wrap"><table>
    <thead><tr>
      ${colunas.map(c=>`<th>${c.label}</th>`).join('')}
      ${(colunasExtras||[]).map(c=>`<th>${c.label}</th>`).join('')}
      <th></th>
    </tr></thead>
    <tbody>
      ${linhas.map(r=>`
        <tr class="${def.linhaClass ? def.linhaClass(r) : ''}">
          ${colunas.map(c=>`<td class="${c.alertaSeVazio && !r[c.key] ? 'cell-alert' : ''}">${formatCellValue(c, r[c.key], r)}</td>`).join('')}
          ${(colunasExtras||[]).map(c=>`<td>${c.render(r)}</td>`).join('')}
          <td>
            <button class="btn btn-ghost btn-sm" onclick="openModal('${tabela}','${r.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="excluirLinha('${tabela}','${r.id}')">Excluir</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table></div>`;
}
function formatCellValue(col, v, row){
  if(col.type==='date') return fmtDate(v);
  if(col.type==='number') return v===''||v===null||v===undefined? '—' : fmtNum(v);
  if(col.type==='moeda'){
    if(v===''||v===null||v===undefined) return '—';
    const simbolo = col.moedaPorEmpresa ? (row && row.empresa==='NEXUS' ? 'US$' : 'R$') : (col.moedaSimbolo || 'R$');
    return `<span class="mono">${simbolo} ${fmtMoedaMascara(Number(v).toFixed(2))}</span>`;
  }
  if(col.type==='clienteSelect') return esc(clienteNome(v));
  if(v===''||v===null||v===undefined) return '—';
  return esc(v);
}

const TABLE_DEFS = {
  clientes: {
    titulo:'Cliente', subtitulo:'Cadastre novos clientes aqui. Eles aparecem automaticamente nos dropdowns de Processos e na tabela do Dashboard.',
    colunas:[
      {key:'nome', label:'Cliente (Nome)', type:'text', obrigatorio:true},
      {key:'pais', label:'País / Região', type:'text'},
      {key:'tipoOperacao', label:'Tipo de Operação', type:'text'},
      {key:'vendedor', label:'Vendedor Responsável', type:'text'},
      {key:'obs', label:'Observações', type:'textarea'},
    ]
  },
  processos: {
    titulo:'Processo', subtitulo:'Cadastro de processos — câmbio, prontidão de carga e status de recebimento. Linha em vermelho = status Pendente/Recebido Parcial (o Valor NEXUS vai automaticamente para Contas a Receber). Célula em vermelho = câmbio ainda não fechado.',
    linhaClass: r => (r.statusRecebimento==='Pendente' || r.statusRecebimento==='Recebido Parcial') ? 'row-alert' : '',
    colunas:[
      {key:'numero', label:'Nº Processo', type:'text', obrigatorio:true},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS, obrigatorio:true},
      {key:'clienteId', label:'Cliente', type:'clienteSelect', obrigatorio:true},
      {key:'descricao', label:'Descrição', type:'text'},
      {key:'dataAbertura', label:'Data Abertura', type:'date'},
      {key:'dataProntidao', label:'Data Prontidão', type:'date'},
      {key:'dataEmbarque', label:'Data Embarque', type:'date'},
      {key:'moeda', label:'Moeda', type:'select', options:MOEDAS_PROC},
      {key:'valorMoeda', label:'Valor Moeda Estrang.', type:'moeda', moedaSimbolo:''},
      {key:'valorNexus', label:'Valor NEXUS (US$)', type:'moeda', moedaSimbolo:'US$'},
      {key:'taxaCambio', label:'Taxa Câmbio', type:'number'},
      {key:'dataFechCambio', label:'Data Fech. Câmbio', type:'date', alertaSeVazio:true},
      {key:'statusRecebimento', label:'Status Recebimento', type:'select', options:STATUS_RECEBIMENTO_PROC},
      {key:'obs', label:'Observações', type:'textarea'},
    ]
  },
  despesas: {
    titulo:'Despesa', subtitulo:'Lance despesas assim que surgirem. Saldo e status ficam vinculados ao processo.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo', type:'processoSelect', obrigatorio:true, placeholderAdm:true},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'data', label:'Data', type:'date'},
      {key:'fornecedor', label:'Fornecedor', type:'text'},
      {key:'descricao', label:'Descrição', type:'text'},
      {key:'centroCusto', label:'Centro de Custo', type:'select', options:CENTROS_CUSTO},
      {key:'dataVencimento', label:'Data Vencimento', type:'date'},
      {key:'dataPagamento', label:'Data Pagamento', type:'date'},
      {key:'valorPago', label:'Valor Pago (R$)', type:'moeda', moedaSimbolo:'R$'},
      {key:'status', label:'Status', type:'select', options:STATUS_DESPESA},
    ]
  },
  despesasNexus: {
    titulo:'Despesa (NEXUS)', tabelaReal:'despesas', empresaFixa:'NEXUS',
    subtitulo:'Despesas pagas pela NEXUS (matriz nos EUA). Selecione o processo vinculado ou "ADMINISTRATIVO" para despesas sem processo.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo / Administrativo', type:'processoSelect', obrigatorio:true, placeholderAdm:true},
      {key:'data', label:'Data', type:'date'},
      {key:'fornecedor', label:'Fornecedor', type:'text'},
      {key:'descricao', label:'Descrição', type:'text'},
      {key:'centroCusto', label:'Centro de Custo', type:'select', options:CENTROS_CUSTO},
      {key:'dataPagamento', label:'Data Pagamento', type:'date'},
      {key:'valorPago', label:'Valor Pago (US$)', type:'moeda', moedaSimbolo:'US$'},
      {key:'status', label:'Status', type:'select', options:STATUS_DESPESA},
    ]
  },
  despesasCH: {
    titulo:'Despesa (CHALLENGE)', tabelaReal:'despesas', empresaFixa:'CHALLENGE',
    subtitulo:'Despesas pagas pela CHALLENGE (trading operacional no Brasil). Selecione o processo vinculado ou "ADMINISTRATIVO" para despesas sem processo.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo / Administrativo', type:'processoSelect', obrigatorio:true, placeholderAdm:true},
      {key:'data', label:'Data', type:'date'},
      {key:'fornecedor', label:'Fornecedor', type:'text'},
      {key:'descricao', label:'Descrição', type:'text'},
      {key:'centroCusto', label:'Centro de Custo', type:'select', options:CENTROS_CUSTO},
      {key:'dataPagamento', label:'Data Pagamento', type:'date'},
      {key:'valorPago', label:'Valor Pago (R$)', type:'moeda', moedaSimbolo:'R$'},
      {key:'status', label:'Status', type:'select', options:STATUS_DESPESA},
    ]
  },
  contasReceber: {
    titulo:'Título a Receber', subtitulo:'Títulos a receber por proforma/embarque. Lance previsto na proforma; baixe com Data de Recebimento. Moedas separadas, sem conversão. Os títulos com "VALOR NEXUS (auto)" na referência são gerados automaticamente pelos Processos pendentes — não precisam ser criados manualmente.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo', type:'processoSelect'},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'clienteId', label:'Cliente', type:'clienteSelect'},
      {key:'ref', label:'Ref (Proforma/INV)', type:'text'},
      {key:'moeda', label:'Moeda', type:'select', options:MOEDAS_CAR},
      {key:'valor', label:'Valor', type:'moeda', moedaSimbolo:'', obrigatorio:true},
      {key:'vencimento', label:'Vencimento', type:'date'},
      {key:'dataRecebimento', label:'Data Recebimento', type:'date'},
      {key:'valorRecebido', label:'Valor Recebido', type:'moeda', moedaSimbolo:''},
    ]
  },
  contasPagar: {
    titulo:'Título a Pagar', subtitulo:'Alimentado automaticamente pelas Despesas (quando o pagamento não é no mesmo dia do lançamento) e pelas Despesas Administrativas em aberto. Quando o status vira "Pago" (ou a data de pagamento é preenchida), o título some daqui — e, se for um lançamento manual (empresa NEXUS ou CHALLENGE), vira automaticamente uma Despesa daquela empresa assim que a Data de Pgto for preenchida.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo', type:'processoSelect', placeholderAdm:true},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'vencimento', label:'Vencimento', type:'date'},
      {key:'fornecedor', label:'Fornecedor', type:'text', obrigatorio:true},
      {key:'centroCusto', label:'Centro de Custo', type:'select', options:CENTROS_CUSTO},
      {key:'valor', label:'Valor', type:'moeda', moedaPorEmpresa:true, obrigatorio:true},
      {key:'dataPagamento', label:'Data Pgto', type:'date'},
    ]
  },
  despAdm: {
    titulo:'Despesa Administrativa', subtitulo:'Folha, pró-labore, contabilidade e demais despesas fixas.',
    colunas:[
      {key:'data', label:'Data', type:'date', obrigatorio:true},
      {key:'categoria', label:'Categoria', type:'select', options:CATEGORIAS_ADM, obrigatorio:true},
      {key:'descricao', label:'Descrição', type:'text'},
      {key:'beneficiario', label:'Beneficiário', type:'text'},
      {key:'valor', label:'Valor (R$)', type:'moeda', moedaSimbolo:'R$', obrigatorio:true},
      {key:'dataPagamento', label:'Data Pgto', type:'date'},
      {key:'valorPago', label:'Valor Pago (R$)', type:'moeda', moedaSimbolo:'R$'},
    ]
  },
  outrasEntradas: {
    titulo:'Outra Entrada', subtitulo:'Entradas de caixa manuais que não vêm de Processos (ex.: aporte, empréstimo).',
    colunas:[
      {key:'data', label:'Data', type:'date', obrigatorio:true},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'descricao', label:'Descrição', type:'text', obrigatorio:true},
      {key:'valor', label:'Valor (R$)', type:'moeda', moedaSimbolo:'R$', obrigatorio:true},
    ]
  },
};
