// ============================================================
// CONEXÃO SUPABASE + CAMADA DE DADOS (DAL)
// Substitui o antigo localStorage. Toda leitura/escrita passa por aqui.
// ============================================================

// >>> PREENCHA com Project Settings > API do seu projeto Supabase <<<
const SUPABASE_URL = 'https://whfilqkdfgdemctuqtbq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZmlscWtkZmdkZW1jdHVxdGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNDM2NDYsImV4cCI6MjA5OTgxOTY0Nn0.lRWqk-q5jn-S0CtmNjihS93Jm2_ACdhH_tzNSVEWnnM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- referência local empresa(codigo) <-> empresa_id (uuid) ----------
let EMPRESA_ID_POR_CODIGO = {};
let EMPRESA_CODIGO_POR_ID = {};
function empresaIdDe(codigo){ return codigo ? (EMPRESA_ID_POR_CODIGO[codigo] || null) : null; }
function empresaCodigoDe(id){ return id ? (EMPRESA_CODIGO_POR_ID[id] || '') : ''; }

// ---------- helpers de tipo ----------
function dOrNull(v){ return (v===''||v===undefined) ? null : v; }
function nOrNull(v){ return (v===''||v===undefined||v===null) ? null : Number(v); }

// processos: numero (chave usada na UI) <-> id (chave usada no banco)
function processoIdDe(numero){ const p = state.processos.find(x=>x.numero===numero); return p ? p.id : null; }
function processoNumeroDe(id){ const p = state.processos.find(x=>x.id===id); return p ? p.numero : null; }

// ---------- mapeamento camelCase (app) <-> snake_case (banco) por tabela ----------
const TABLE_MAP = {
  clientes: {
    db: 'clientes',
    toDb: (o) => ({ nome:o.nome, pais:o.pais, tipo_operacao:o.tipoOperacao, vendedor:o.vendedor, obs:o.obs }),
    fromDb: (r) => ({ id:r.id, nome:r.nome, pais:r.pais, tipoOperacao:r.tipo_operacao, vendedor:r.vendedor, obs:r.obs }),
  },
  processos: {
    db: 'processos',
    toDb: (o) => ({
      numero:o.numero, empresa_id: empresaIdDe(o.empresa), cliente_id: o.clienteId || null,
      descricao:o.descricao, data_abertura: dOrNull(o.dataAbertura), data_prontidao: dOrNull(o.dataProntidao),
      data_embarque: dOrNull(o.dataEmbarque), moeda: dOrNull(o.moeda), valor_moeda: nOrNull(o.valorMoeda),
      taxa_cambio: nOrNull(o.taxaCambio), data_fech_cambio: dOrNull(o.dataFechCambio),
      status_recebimento: dOrNull(o.statusRecebimento), obs:o.obs,
    }),
    fromDb: (r) => ({
      id:r.id, numero:r.numero, empresa: empresaCodigoDe(r.empresa_id), clienteId:r.cliente_id,
      descricao:r.descricao, dataAbertura:r.data_abertura, dataProntidao:r.data_prontidao, dataEmbarque:r.data_embarque,
      moeda:r.moeda, valorMoeda:r.valor_moeda, taxaCambio:r.taxa_cambio, dataFechCambio:r.data_fech_cambio,
      statusRecebimento:r.status_recebimento, obs:r.obs,
    }),
  },
  despesas: {
    db: 'despesas', processoRefKey: 'processoNumero',
    toDb: (o) => ({
      empresa_id: empresaIdDe(o.empresa), data: dOrNull(o.data), fornecedor:o.fornecedor, descricao:o.descricao,
      centro_custo: dOrNull(o.centroCusto), data_vencimento: dOrNull(o.dataVencimento), data_pagamento: dOrNull(o.dataPagamento),
      valor_pago: nOrNull(o.valorPago), status: dOrNull(o.status),
    }),
    fromDb: (r) => ({
      id:r.id, processoNumero: processoNumeroDe(r.processo_id), empresa: empresaCodigoDe(r.empresa_id),
      data:r.data, fornecedor:r.fornecedor, descricao:r.descricao, centroCusto:r.centro_custo,
      dataVencimento:r.data_vencimento, dataPagamento:r.data_pagamento, valorPago:r.valor_pago, status:r.status,
    }),
  },
  contasReceber: {
    db: 'contas_receber', processoRefKey: 'processoNumero',
    toDb: (o) => ({
      empresa_id: empresaIdDe(o.empresa), cliente_id: o.clienteId || null, ref:o.ref, moeda: dOrNull(o.moeda),
      valor: nOrNull(o.valor), vencimento: dOrNull(o.vencimento), data_recebimento: dOrNull(o.dataRecebimento),
      valor_recebido: nOrNull(o.valorRecebido),
    }),
    fromDb: (r) => ({
      id:r.id, processoNumero: processoNumeroDe(r.processo_id), empresa: empresaCodigoDe(r.empresa_id),
      clienteId:r.cliente_id, ref:r.ref, moeda:r.moeda, valor:r.valor, vencimento:r.vencimento,
      dataRecebimento:r.data_recebimento, valorRecebido:r.valor_recebido,
    }),
  },
  contasPagar: {
    db: 'contas_pagar', processoRefKey: 'processoNumero',
    toDb: (o) => ({
      empresa_id: empresaIdDe(o.empresa), vencimento: dOrNull(o.vencimento), fornecedor:o.fornecedor,
      centro_custo: dOrNull(o.centroCusto), valor: nOrNull(o.valor), data_pagamento: dOrNull(o.dataPagamento),
    }),
    fromDb: (r) => ({
      id:r.id, processoNumero: processoNumeroDe(r.processo_id), empresa: empresaCodigoDe(r.empresa_id),
      vencimento:r.vencimento, fornecedor:r.fornecedor, centroCusto:r.centro_custo, valor:r.valor,
      dataPagamento:r.data_pagamento, despesaId:r.despesa_id, despAdmId:r.desp_adm_id,
    }),
  },
  despAdm: {
    db: 'desp_adm',
    toDb: (o) => ({
      data: dOrNull(o.data), categoria:o.categoria, descricao:o.descricao, beneficiario:o.beneficiario,
      valor: nOrNull(o.valor), data_pagamento: dOrNull(o.dataPagamento), valor_pago: nOrNull(o.valorPago),
    }),
    fromDb: (r) => ({
      id:r.id, data:r.data, categoria:r.categoria, descricao:r.descricao, beneficiario:r.beneficiario,
      valor:r.valor, dataPagamento:r.data_pagamento, valorPago:r.valor_pago,
    }),
  },
  outrasEntradas: {
    db: 'outras_entradas',
    toDb: (o) => ({ data: dOrNull(o.data), empresa_id: empresaIdDe(o.empresa), descricao:o.descricao, valor: nOrNull(o.valor) }),
    fromDb: (r) => ({ id:r.id, data:r.data, empresa: empresaCodigoDe(r.empresa_id), descricao:r.descricao, valor:r.valor }),
  },
};

// ---------- DAL genérico usado pelo motor de CRUD (04-crud.js) ----------
async function dbInserir(tabela, objApp){
  const map = TABLE_MAP[tabela];
  const row = map.toDb(objApp);
  if(map.processoRefKey) row.processo_id = processoIdDe(objApp[map.processoRefKey]);
  const { data, error } = await sb.from(map.db).insert(row).select().single();
  if(error) throw error;
  return map.fromDb(data);
}
async function dbAtualizar(tabela, id, objApp){
  const map = TABLE_MAP[tabela];
  const row = map.toDb(objApp);
  if(map.processoRefKey) row.processo_id = processoIdDe(objApp[map.processoRefKey]);
  const { data, error } = await sb.from(map.db).update(row).eq('id', id).select().single();
  if(error) throw error;
  return map.fromDb(data);
}
async function dbExcluir(tabela, id){
  const map = TABLE_MAP[tabela];
  const { error } = await sb.from(map.db).delete().eq('id', id);
  if(error) throw error;
}
async function dbListar(tabela){
  const map = TABLE_MAP[tabela];
  const { data, error } = await sb.from(map.db).select('*').order('created_at', { ascending:true });
  if(error) throw error;
  return data.map(map.fromDb);
}

// ---------- Regra: Despesas alimenta Contas a Pagar automaticamente ----------
// Se a despesa não é paga no mesmo dia (dataPagamento vazia ou diferente da data
// de lançamento) e ainda não está com status "Pago", ela precisa aparecer em
// Contas a Pagar. Quando o status vira "Pago" (ou é paga no mesmo dia), o
// registro espelhado é removido de Contas a Pagar automaticamente.
async function sincronizarContaAPagarDaDespesa(despesa){
  const precisaCAP = despesa.status !== 'Pago' && (!despesa.dataPagamento || despesa.dataPagamento !== despesa.data);
  const { data: existente } = await sb.from('contas_pagar').select('*').eq('despesa_id', despesa.id).maybeSingle();
  if(precisaCAP){
    const row = {
      despesa_id: despesa.id, empresa_id: empresaIdDe(despesa.empresa), processo_id: processoIdDe(despesa.processoNumero),
      vencimento: dOrNull(despesa.dataVencimento), fornecedor: despesa.fornecedor, centro_custo: dOrNull(despesa.centroCusto),
      valor: nOrNull(despesa.valorPago) || 0, data_pagamento: dOrNull(despesa.dataPagamento),
    };
    if(existente) await sb.from('contas_pagar').update(row).eq('id', existente.id);
    else await sb.from('contas_pagar').insert(row);
  } else if(existente){
    await sb.from('contas_pagar').delete().eq('id', existente.id);
  }
}

// Despesas Administrativas: "pendente" = ainda sem data de pagamento preenchida.
async function sincronizarContaAPagarDoDespAdm(despAdm){
  const precisaCAP = !despAdm.dataPagamento;
  const { data: existente } = await sb.from('contas_pagar').select('*').eq('desp_adm_id', despAdm.id).maybeSingle();
  if(precisaCAP){
    const row = {
      desp_adm_id: despAdm.id, empresa_id: null, processo_id: null,
      vencimento: dOrNull(despAdm.data), fornecedor: despAdm.beneficiario || despAdm.categoria,
      centro_custo: 'DESPESA ADMINISTRATIVA', valor: nOrNull(despAdm.valor) || 0, data_pagamento: null,
    };
    if(existente) await sb.from('contas_pagar').update(row).eq('id', existente.id);
    else await sb.from('contas_pagar').insert(row);
  } else if(existente){
    await sb.from('contas_pagar').delete().eq('id', existente.id);
  }
}

// Roda no boot: garante que Contas a Pagar reflita o estado atual de Despesas e
// Despesas Administrativas, mesmo para registros lançados fora do app (ex.: via SQL Editor).
async function reconciliarContasAPagar(){
  for(const d of state.despesas) await sincronizarContaAPagarDaDespesa(d);
  for(const da of state.despAdm) await sincronizarContaAPagarDoDespAdm(da);
  state.contasPagar = await dbListar('contasPagar');
}
