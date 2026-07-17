// ============================================================
// MOTOR GENÉRICO DE CRUD (tabela + modal)
// ============================================================
function fieldInput(col, value){
  value = value===undefined||value===null? '' : value;
  const common = `id="f_${col.key}" data-key="${col.key}"`;
  if(col.type==='select'){
    const opts = col.options || [];
    return `<select ${common}>
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
      <option value="">—</option>
      ${state.processos.map(p=>`<option value="${esc(p.numero)}" ${String(value)===String(p.numero)?'selected':''}>${esc(p.numero)} — ${esc(clienteNome(p.clienteId))}</option>`).join('')}
    </select>`;
  }
  if(col.type==='date') return `<input type="date" ${common} value="${esc(value)}">`;
  if(col.type==='number') return `<input type="number" step="any" ${common} value="${esc(value)}">`;
  if(col.type==='textarea') return `<textarea rows="2" ${common}>${esc(value)}</textarea>`;
  return `<input type="text" ${common} value="${esc(value)}">`;
}

function openModal(tabela, id){
  const def = TABLE_DEFS[tabela];
  let dados = id ? state[tabela].find(r=>r.id===id) : {};
  if(!id && tabela==='processos' && typeof nextProcessoNumero==='function'){
    dados = Object.assign({ numero: nextProcessoNumero(todayISO()) }, dados);
  }
  ui.modal = { tabela, id: id||null, def, dados: Object.assign({}, dados) };
  render();
}
function closeModal(){ ui.modal = null; render(); }

function renderModal(){
  const { def, dados, id } = ui.modal;
  return `
  <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <h3>${id? 'Editar' : 'Novo'} — ${def.titulo}</h3>
      <div class="modal-sub">${def.subtitulo||''}</div>
      <form id="modalForm" onsubmit="event.preventDefault(); salvarModal();">
        ${def.colunas.map(col => `
          <div class="field">
            <label>${col.label}${col.obrigatorio?' *':''}</label>
            ${fieldInput(col, dados[col.key])}
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

async function salvarModal(){
  const { tabela, id, def } = ui.modal;
  const novo = {};
  let erro = null;
  def.colunas.forEach(col=>{
    const el = document.getElementById('f_'+col.key);
    let v = el.value;
    if(col.type==='number') v = v===''? '' : Number(v);
    if(col.obrigatorio && !v && v!==0) erro = `Preencha o campo "${col.label}".`;
    novo[col.key] = v;
  });
  if(erro){ alert(erro); return; }
  const btn = document.querySelector('#modalForm button[type="submit"]');
  if(btn){ btn.disabled = true; btn.textContent = 'Salvando...'; }
  try{
    if(id){
      const atualizado = await dbAtualizar(tabela, id, novo);
      const idx = state[tabela].findIndex(r=>r.id===id);
      state[tabela][idx] = atualizado;
      if(tabela==='despesas'){
        await sincronizarContaAPagarDaDespesa(atualizado);
        state.contasPagar = await dbListar('contasPagar');
      }
    } else {
      const criado = await dbInserir(tabela, novo);
      state[tabela].push(criado);
      if(tabela==='despesas'){
        await sincronizarContaAPagarDaDespesa(criado);
        state.contasPagar = await dbListar('contasPagar');
      }
    }
    closeModal();
  }catch(e){
    alert('Erro ao salvar no banco: ' + e.message);
    if(btn){ btn.disabled = false; btn.textContent = 'Salvar'; }
  }
}

async function excluirLinha(tabela, id){
  if(!confirm('Excluir este registro?')) return;
  try{
    await dbExcluir(tabela, id);
    state[tabela] = state[tabela].filter(r=>r.id!==id);
    if(tabela==='despesas'){
      // a exclusão da despesa já cai em cascata no banco (contas_pagar.despesa_id)
      state.contasPagar = state.contasPagar.filter(r=>r.despesaId!==id);
    }
    render();
  }catch(e){
    alert('Erro ao excluir no banco: ' + e.message);
  }
}

function renderCrudTable(tabela, colunasExtras){
  const def = TABLE_DEFS[tabela];
  const linhas = porEmpresa(state[tabela].filter(r=> !def.temEmpresa || true));
  const colunas = def.colunas;
  if(!state[tabela].length){
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
        <tr>
          ${colunas.map(c=>`<td>${formatCellValue(c, r[c.key])}</td>`).join('')}
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
function formatCellValue(col, v){
  if(col.type==='date') return fmtDate(v);
  if(col.type==='number') return v===''||v===null||v===undefined? '—' : fmtNum(v);
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
    titulo:'Processo', subtitulo:'Cadastro de processos — câmbio, prontidão de carga e status de recebimento.',
    colunas:[
      {key:'numero', label:'Nº Processo', type:'text', obrigatorio:true},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS, obrigatorio:true},
      {key:'clienteId', label:'Cliente', type:'clienteSelect', obrigatorio:true},
      {key:'descricao', label:'Descrição', type:'text'},
      {key:'dataAbertura', label:'Data Abertura', type:'date'},
      {key:'dataProntidao', label:'Data Prontidão', type:'date'},
      {key:'dataEmbarque', label:'Data Embarque', type:'date'},
      {key:'moeda', label:'Moeda', type:'select', options:MOEDAS_PROC},
      {key:'valorMoeda', label:'Valor Moeda Estrang.', type:'number'},
      {key:'taxaCambio', label:'Taxa Câmbio', type:'number'},
      {key:'dataFechCambio', label:'Data Fech. Câmbio', type:'date'},
      {key:'statusRecebimento', label:'Status Recebimento', type:'select', options:STATUS_RECEBIMENTO_PROC},
      {key:'obs', label:'Observações', type:'textarea'},
    ]
  },
  despesas: {
    titulo:'Despesa', subtitulo:'Lance despesas assim que surgirem. Saldo e status ficam vinculados ao processo.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo', type:'processoSelect', obrigatorio:true},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'data', label:'Data', type:'date'},
      {key:'fornecedor', label:'Fornecedor', type:'text'},
      {key:'descricao', label:'Descrição', type:'text'},
      {key:'centroCusto', label:'Centro de Custo', type:'select', options:CENTROS_CUSTO},
      {key:'dataVencimento', label:'Data Vencimento', type:'date'},
      {key:'dataPagamento', label:'Data Pagamento', type:'date'},
      {key:'valorPago', label:'Valor Pago (R$)', type:'number'},
      {key:'status', label:'Status', type:'select', options:STATUS_DESPESA},
    ]
  },
  contasReceber: {
    titulo:'Título a Receber', subtitulo:'Títulos a receber por proforma/embarque. Lance previsto na proforma; baixe com Data de Recebimento. Moedas separadas, sem conversão.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo', type:'processoSelect'},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'clienteId', label:'Cliente', type:'clienteSelect'},
      {key:'ref', label:'Ref (Proforma/INV)', type:'text'},
      {key:'moeda', label:'Moeda', type:'select', options:MOEDAS_CAR},
      {key:'valor', label:'Valor', type:'number', obrigatorio:true},
      {key:'vencimento', label:'Vencimento', type:'date'},
      {key:'dataRecebimento', label:'Data Recebimento', type:'date'},
      {key:'valorRecebido', label:'Valor Recebido', type:'number'},
    ]
  },
  contasPagar: {
    titulo:'Título a Pagar', subtitulo:'Alimentado automaticamente pelas Despesas cujo pagamento não é no mesmo dia do lançamento. Quando a Despesa é marcada como "Pago", o título some daqui sozinho. Use "+ Novo registro" só para exceções não vinculadas a uma despesa.',
    colunas:[
      {key:'processoNumero', label:'Nº Processo', type:'processoSelect'},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'vencimento', label:'Vencimento', type:'date'},
      {key:'fornecedor', label:'Fornecedor', type:'text', obrigatorio:true},
      {key:'centroCusto', label:'Centro de Custo', type:'select', options:CENTROS_CUSTO},
      {key:'valor', label:'Valor (R$)', type:'number', obrigatorio:true},
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
      {key:'valor', label:'Valor (R$)', type:'number', obrigatorio:true},
      {key:'dataPagamento', label:'Data Pgto', type:'date'},
      {key:'valorPago', label:'Valor Pago (R$)', type:'number'},
    ]
  },
  outrasEntradas: {
    titulo:'Outra Entrada', subtitulo:'Entradas de caixa manuais que não vêm de Processos (ex.: aporte, empréstimo).',
    colunas:[
      {key:'data', label:'Data', type:'date', obrigatorio:true},
      {key:'empresa', label:'Empresa', type:'select', options:EMPRESAS},
      {key:'descricao', label:'Descrição', type:'text', obrigatorio:true},
      {key:'valor', label:'Valor (R$)', type:'number', obrigatorio:true},
    ]
  },
};
