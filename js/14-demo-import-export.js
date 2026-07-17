// ============================================================
// DADOS DE DEMONSTRAÇÃO / EXPORTAR / LIMPAR
// (Importação de JSON foi desativada nesta versão conectada ao banco —
//  ver observação em importarJSON)
// ============================================================
async function carregarDemo(){
  if(state.clientes.length && !confirm('Isso vai adicionar registros de exemplo (fictícios) ao banco atual. Continuar?')) return;
  try{
    const c1 = await dbInserir('clientes', { nome:'Cliente Demo A', pais:'Guiana', tipoOperacao:'Importação', vendedor:'Vendedor 1', obs:'' });
    const c2 = await dbInserir('clientes', { nome:'Cliente Demo B', pais:'Angola', tipoOperacao:'Exportação', vendedor:'Vendedor 2', obs:'' });
    const c3 = await dbInserir('clientes', { nome:'Cliente Demo C', pais:'Brasil', tipoOperacao:'Importação', vendedor:'Vendedor 1', obs:'' });
    state.clientes.push(c1, c2, c3);

    const hoje = new Date(); const ano = hoje.getFullYear();
    const iso = (y,m,d)=> new Date(y,m-1,d).toISOString().slice(0,10);
    const p1='DEMO-001', p2='DEMO-002', p3='DEMO-003';
    const proc1 = await dbInserir('processos', { numero:p1, empresa:'NEXUS', clienteId:c1.id, descricao:'Equipamentos industriais', dataAbertura:iso(ano,1,10), dataProntidao:iso(ano,1,25), dataEmbarque:iso(ano,2,2), moeda:'USD', valorMoeda:120000, taxaCambio:5.1, dataFechCambio:iso(ano,2,5), statusRecebimento:'Recebido Total', obs:'' });
    const proc2 = await dbInserir('processos', { numero:p2, empresa:'PANGEA', clienteId:c2.id, descricao:'Materiais de construção', dataAbertura:iso(ano,3,3), dataProntidao:iso(ano,3,20), dataEmbarque:'', moeda:'USD', valorMoeda:85000, taxaCambio:'', dataFechCambio:'', statusRecebimento:'Pendente', obs:'' });
    const proc3 = await dbInserir('processos', { numero:p3, empresa:'NEXUS', clienteId:c3.id, descricao:'Peças automotivas', dataAbertura:iso(ano,4,1), dataProntidao:iso(ano,4,18), dataEmbarque:iso(ano,4,22), moeda:'EUR', valorMoeda:40000, taxaCambio:5.6, dataFechCambio:iso(ano,5,1), statusRecebimento:'Recebido Parcial', obs:'' });
    state.processos.push(proc1, proc2, proc3);

    const desp1 = await dbInserir('despesas', { processoNumero:p1, empresa:'NEXUS', data:iso(ano,2,1), fornecedor:'Fornecedor Demo 1', descricao:'Frete internacional', centroCusto:'LOGISTICA', dataVencimento:iso(ano,2,10), dataPagamento:iso(ano,2,10), valorPago:8500, status:'Pago' });
    const desp2 = await dbInserir('despesas', { processoNumero:p3, empresa:'NEXUS', data:iso(ano,4,15), fornecedor:'Fornecedor Demo 2', descricao:'Taxas portuárias', centroCusto:'LOGISTICA', dataVencimento:iso(ano,4,20), dataPagamento:'', valorPago:'', status:'Pendente' });
    state.despesas.push(desp1, desp2);

    const car1 = await dbInserir('contasReceber', { processoNumero:p2, empresa:'PANGEA', clienteId:c2.id, ref:'PI-2201', moeda:'USD', valor:85000, vencimento:iso(ano,4,30), dataRecebimento:'', valorRecebido:'' });
    const car2 = await dbInserir('contasReceber', { processoNumero:p3, empresa:'NEXUS', clienteId:c3.id, ref:'INV-3390', moeda:'EUR', valor:40000, vencimento:iso(ano,5,15), dataRecebimento:'', valorRecebido:15000 });
    state.contasReceber.push(car1, car2);

    const cap1 = await dbInserir('contasPagar', { processoNumero:p2, empresa:'PANGEA', vencimento:iso(ano,3,25), fornecedor:'Transportadora Demo', centroCusto:'LOGISTICA', valor:6200, dataPagamento:'' });
    const cap2 = await dbInserir('contasPagar', { processoNumero:p1, empresa:'NEXUS', vencimento:iso(ano,2,8), fornecedor:'Despachante Demo', centroCusto:'PRODUTO', valor:112000, dataPagamento:iso(ano,2,8) });
    state.contasPagar.push(cap1, cap2);

    const da1 = await dbInserir('despAdm', { data:iso(ano,1,5), categoria:'Salário', descricao:'Folha mensal', beneficiario:'Equipe', valor:10000, dataPagamento:iso(ano,1,5), valorPago:10000 });
    const da2 = await dbInserir('despAdm', { data:iso(ano,1,5), categoria:'Pró-Labore', descricao:'Pró-labore sócios', beneficiario:'Sócios', valor:15000, dataPagamento:iso(ano,1,5), valorPago:15000 });
    const da3 = await dbInserir('despAdm', { data:iso(ano,2,10), categoria:'Contabilidade', descricao:'Honorários contábeis', beneficiario:'Escritório Demo', valor:2500, dataPagamento:iso(ano,2,10), valorPago:2500 });
    state.despAdm.push(da1, da2, da3);

    const oe1 = await dbInserir('outrasEntradas', { data:iso(ano,1,15), empresa:'NEXUS', descricao:'Aporte de capital', valor:20000 });
    state.outrasEntradas.push(oe1);

    render();
  }catch(e){
    alert('Erro ao carregar dados de exemplo: ' + e.message);
  }
}

async function limparTudo(){
  if(!confirm('Isso vai apagar TODOS os dados cadastrados no banco (exceto os cadastros das empresas). Esta ação não pode ser desfeita. Continuar?')) return;
  const tabelasComId = ['cotacao_itens','cotacoes','despesas','contas_receber','contas_pagar','desp_adm',
    'outras_entradas','processos','clientes'];
  try{
    for(const t of tabelasComId){
      await sb.from(t).delete().not('id','is', null);
    }
    await sb.from('checklist_diario').delete().not('data_ref','is', null);
    await sb.from('checklist_mensal').delete().not('mes_ref','is', null);
    await sb.from('cotacao_contadores').delete().not('ano','is', null);
    await sb.from('configuracoes').upsert({ id:1, saldo_inicial_ano: 0 });
    await carregarTudoDoBanco();
    render();
  }catch(e){
    alert('Erro ao limpar dados: ' + e.message);
  }
}

function exportarJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'nexus_erp_backup_' + todayISO() + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importarJSON(evt){
  // Desativado: um JSON antigo (do protótipo local) não carrega ids/relacionamentos
  // válidos para o banco relacional. Restaurar a partir de um backup exige um
  // script dedicado — chame o Claude para gerar um quando precisar.
  evt.target.value = '';
  alert('Importação de backup JSON não está disponível nesta versão conectada ao Supabase. Peça para o Claude preparar um script de importação se precisar restaurar um backup.');
}
