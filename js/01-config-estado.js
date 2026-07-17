// ============================================================
// NEXUS ERP — construído a partir do ERP_Nexus_v15.xlsx
// Estado agora é carregado/persistido no Supabase (não mais localStorage)
// ============================================================

const EMPRESAS = ['NEXUS','PANGEA','AXIA'];
const MOEDAS_PROC = ['USD','EUR','GBP'];
const MOEDAS_CAR = ['USD','EUR','GBP','BRL'];
const CENTROS_CUSTO = ['PRODUTO','VIAGEM','LOGISTICA','DESPESA ADMINISTRATIVA','DESPESA COMERCIAL','PRO LABORE MENSAL','RETIRADA DE LUCRO','SALÁRIO'];
const CATEGORIAS_ADM = ['Pró-Labore','Salário','FGTS/Impostos','Viagens','Contabilidade','Sistema/TI','Aluguel','Benefícios','Despesas Gerais','Impostos','Comissão','Outros'];
const STATUS_RECEBIMENTO_PROC = ['Pendente','Recebido Parcial','Recebido Total','Em Atraso'];
const STATUS_DESPESA = ['Pago','Pendente','Vencido','Parcial'];
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function uid(){ return 'r' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

function estadoVazio(){
  return {
    saldoInicialAno: 0,
    clientes: [], processos: [], despesas: [], contasReceber: [], contasPagar: [],
    despAdm: [], outrasEntradas: [],
    checklistDiario: {}, checklistMensal: {},
    cotacoes: [], cotacaoContadores: {},
    empresasPerfil: { NEXUS:{}, PANGEA:{}, AXIA:{} },
  };
}

let state = estadoVazio();
let ui = {
  modulo: 'dashboard',
  empresaFiltro: 'TODAS',
  dashClienteFiltro: 'TODOS',
  dashStatusFiltro: 'TODOS',
  cobrancaCliente: 'TODOS',
  fluxoAno: new Date().getFullYear(),
  modal: null,
  cotacaoEditId: null,
  empresaAba: 'NEXUS',
};
let itensRows = [];
let rascunhoCotacaoPrefill = null;

// ---------- carga inicial: busca tudo do Supabase e monta `state` ----------
async function carregarTudoDoBanco(){
  // 1) empresas primeiro (precisa dos ids para montar os mapas de referência)
  const { data: empresasRows, error: errEmp } = await sb.from('empresas').select('*');
  if(errEmp) throw errEmp;
  EMPRESA_ID_POR_CODIGO = {}; EMPRESA_CODIGO_POR_ID = {};
  empresasRows.forEach(e=>{ EMPRESA_ID_POR_CODIGO[e.codigo] = e.id; EMPRESA_CODIGO_POR_ID[e.id] = e.codigo; });
  state.empresasPerfil = {};
  empresasRows.forEach(e=>{
    state.empresasPerfil[e.codigo] = {
      nomeCompleto:e.nome_completo, endereco:e.endereco, documento:e.documento, site:e.site, email:e.email,
      logoDataUrl:e.logo_url, bancoBeneficiary:e.banco_beneficiary, bancoEndereco:e.banco_endereco,
      bancoNome:e.banco_nome, bancoConta:e.banco_conta, bancoSwift:e.banco_swift, bancoAba:e.banco_aba,
      bancoMoeda:e.banco_moeda, bancoIntermediario:e.banco_intermediario, bancoIntermediarioSwift:e.banco_intermediario_swift,
      assinanteNome:e.assinante_nome, assinanteCargo:e.assinante_cargo,
    };
  });

  // 2) processos precisa vir antes de despesas/contasReceber/contasPagar (dependem de processoNumero<->id)
  state.clientes = await dbListar('clientes');
  state.processos = await dbListar('processos');
  state.despesas = await dbListar('despesas');
  state.contasReceber = await dbListar('contasReceber');
  state.contasPagar = await dbListar('contasPagar');
  state.despAdm = await dbListar('despAdm');
  state.outrasEntradas = await dbListar('outrasEntradas');

  // 3) configuração singleton (saldo inicial do ano)
  const { data: cfg } = await sb.from('configuracoes').select('*').eq('id', 1).maybeSingle();
  state.saldoInicialAno = cfg ? Number(cfg.saldo_inicial_ano)||0 : 0;

  // 4) cotações + itens
  const { data: cotRows, error: errCot } = await sb.from('cotacoes').select('*, cotacao_itens(*)').order('created_at');
  if(errCot) throw errCot;
  state.cotacoes = cotRows.map(c => ({
    id:c.id, codigo:c.codigo, empresa: empresaCodigoDe(c.empresa_id), data:c.data, clienteId:c.cliente_id,
    consignatarioTxt:c.consignatario_txt, origem:c.origem, destino:c.destino, volumes:c.volumes, pesoBruto:c.peso_bruto,
    incoterm:c.incoterm, dimensoes:c.dimensoes, moeda:c.moeda, modal:c.modal, aodOrigem:c.aod_origem, aodDestino:c.aod_destino,
    ciaTransporte:c.cia_transporte, tt:c.tt, termosPagamento:c.termos_pagamento, observacoes:c.observacoes,
    responsavelNome:c.responsavel_nome, responsavelCargo:c.responsavel_cargo,
    freteInternacional:c.frete_internacional, despesasLogisticas:c.despesas_logisticas, seguro:c.seguro, desconto:c.desconto,
    status:c.status, processoGerado: processoNumeroDe(c.processo_gerado_id),
    itens: (c.cotacao_itens||[]).sort((a,b)=>a.ordem-b.ordem).map(it=>({
      descricao:it.descricao, disponibilidade:it.disponibilidade, ncm:it.ncm, qtd:it.qtd, unidade:it.unidade, precoUnitario:it.preco_unitario,
    })),
  }));

  // 5) checklists
  const { data: diarioRows } = await sb.from('checklist_diario').select('*');
  state.checklistDiario = {};
  (diarioRows||[]).forEach(r=>{ (state.checklistDiario[r.data_ref] ||= {})[r.item_idx] = r.done; });
  const { data: mensalRows } = await sb.from('checklist_mensal').select('*');
  state.checklistMensal = {};
  (mensalRows||[]).forEach(r=>{ (state.checklistMensal[r.mes_ref] ||= {})[r.item_idx] = r.done; });

  // 6) contadores de cotação (código sequencial por empresa/ano)
  const { data: contRows } = await sb.from('cotacao_contadores').select('*');
  state.cotacaoContadores = {};
  (contRows||[]).forEach(r=>{ state.cotacaoContadores[empresaCodigoDe(r.empresa_id) + String(r.ano)] = r.contador; });

  ui.fluxoAno = new Date().getFullYear();
}

// ---------- Helpers de data / número ----------
function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function parseDate(s){ if(!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; }
function daysBetween(a,b){ return Math.round((a-b)/86400000); }
function addDays(dateStr, n){ const d = parseDate(dateStr); if(!d) return null; d.setDate(d.getDate()+n); return d; }
function fmtDate(s){ if(!s) return '—'; const d = parseDate(s); if(!d) return '—'; return d.toLocaleDateString('pt-BR'); }
function fmtMoney(v, symbol){
  symbol = symbol || 'R$';
  if(v === null || v === undefined || v === '' || isNaN(v)) return '—';
  const n = Number(v);
  const neg = n < 0;
  const abs = Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  return (neg? '-':'') + symbol + ' ' + abs;
}
function fmtNum(v){ if(v===null||v===undefined||v==='') return '—'; return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtPct(v){ if(v===null||v===undefined||v==='' || isNaN(v)) return '—'; return (Number(v)*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + '%'; }
function esc(s){ if(s===null||s===undefined) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function clienteNome(id){ const c = state.clientes.find(x=>x.id===id); return c ? c.nome : (id||'—'); }
function porEmpresa(lista){ if(ui.empresaFiltro==='TODAS') return lista; return lista.filter(r => (r.empresa||'')===ui.empresaFiltro); }
