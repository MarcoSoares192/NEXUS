// ============================================================
// CÁLCULOS (equivalentes às fórmulas do Excel)
// ============================================================

// --- PROCESSOS ---
function procValorFechCambioRS(p){
  if(p.valorMoeda!=null && p.valorMoeda!=='' && p.taxaCambio!=null && p.taxaCambio!=='' && p.dataFechCambio){
    return Number(p.valorMoeda) * Number(p.taxaCambio);
  }
  return null; // câmbio ainda em aberto
}
function procAReceberEstUSD(p){
  if(p.valorMoeda==null || p.valorMoeda==='') return null;
  const fech = procValorFechCambioRS(p);
  return fech===null ? Number(p.valorMoeda) : 0;
}

// --- DESPESAS (por processo) ---
function despSaldo(d){ return (d.valorPago!=null && d.valorPago!=='') ? 0 : null; }

// --- CONTAS A RECEBER ---
function carSaldoAberto(r){
  if(r.valor==null || r.valor==='') return null;
  return Number(r.valor) - (r.valorRecebido? Number(r.valorRecebido):0);
}
function carDiasAtraso(r){
  if(!r.vencimento || r.dataRecebimento) return null;
  const d = daysBetween(parseDate(todayISO()), parseDate(r.vencimento));
  return Math.max(0, d);
}
function carStatus(r){
  if(r.valor==null || r.valor==='') return null;
  const saldo = carSaldoAberto(r);
  if(r.dataRecebimento || saldo<=0) return 'Recebido';
  if(r.valorRecebido && Number(r.valorRecebido)>0) return 'Parcial';
  if(!r.vencimento) return 'A vencer';
  const venc = parseDate(r.vencimento), hoje = parseDate(todayISO());
  if(venc < hoje) return 'Vencido';
  if(daysBetween(venc,hoje) >= -7) return 'Vence em breve';
  return 'A vencer';
}
function carStatusBadge(s){
  if(s==='Recebido') return 'green'; if(s==='Parcial') return 'blue';
  if(s==='Vencido') return 'red'; if(s==='Vence em breve') return 'amber'; return 'slate';
}

// --- CONTAS A PAGAR ---
function capDiasAtraso(r){
  if(!r.vencimento || r.dataPagamento) return null;
  return Math.max(0, daysBetween(parseDate(todayISO()), parseDate(r.vencimento)));
}
function capStatus(r){
  if(r.valor==null || r.valor==='') return null;
  if(r.dataPagamento) return 'Pago';
  if(!r.vencimento) return 'A vencer';
  const venc = parseDate(r.vencimento), hoje = parseDate(todayISO());
  if(venc < hoje) return 'Vencido';
  if(daysBetween(venc,hoje) >= -7) return 'Vence em breve';
  return 'A vencer';
}
function capStatusBadge(s){
  if(s==='Pago') return 'green'; if(s==='Vencido') return 'red';
  if(s==='Vence em breve') return 'amber'; return 'slate';
}

// --- DESP. ADMINISTRATIVAS ---
function admStatus(r){
  if(r.valor==null || r.valor==='') return null;
  return (r.valorPago && Number(r.valorPago) >= Number(r.valor)) ? 'Pago' : 'Pendente';
}

// --- RESULTADO (por processo, cruza PROCESSOS x DESPESAS x CONTAS A PAGAR) ---
function calcResultado(){
  return state.processos.map(p => {
    const fech = procValorFechCambioRS(p);
    const receita = fech===null? 0 : fech;
    const recebido = receita; // mesma lógica do Excel original
    const aReceber = procAReceberEstUSD(p) || 0;
    const despesasProc = state.despesas.filter(d=>d.processoNumero===p.numero);
    const capProc = state.contasPagar.filter(c=>c.processoNumero===p.numero);
    const totalDespesas = despesasProc.reduce((s,d)=>s+(Number(d.valorPago)||0),0) + capProc.reduce((s,c)=>s+(Number(c.valor)||0),0);
    const despesasPagas = despesasProc.reduce((s,d)=>s+(Number(d.valorPago)||0),0) + capProc.filter(c=>c.dataPagamento).reduce((s,c)=>s+(Number(c.valor)||0),0);
    const despesasPendentes = totalDespesas - despesasPagas;
    const lucro = receita - totalDespesas;
    const margem = receita? (lucro/receita) : null;
    let statusProcesso = 'Em abertura';
    if(p.statusRecebimento==='Recebido Total') statusProcesso='Concluído';
    else if(p.dataEmbarque) statusProcesso='Embarcado';
    else if(p.dataProntidao) statusProcesso='Em prontidão';
    const statusCambio = fech!==null ? 'Fechado' : 'Em aberto';
    return { numero:p.numero, cliente: clienteNome(p.clienteId), statusProcesso, statusCambio,
      receita, recebido, aReceber, totalDespesas, despesasPagas, despesasPendentes, lucro, margem, empresa:p.empresa };
  });
}

// --- FLUXO DE CAIXA (mensal) ---
function calcFluxoCaixa(ano){
  const meses = MESES.map((label, idx)=>{
    const m = idx+1;
    const inMonth = (dateStr)=>{ const d=parseDate(dateStr); return d && d.getFullYear()===ano && (d.getMonth()+1)===m; };

    const recebClientes = porEmpresa(state.processos).reduce((s,p)=>{
      const fech = procValorFechCambioRS(p);
      return s + (fech!==null && inMonth(p.dataFechCambio) ? fech : 0);
    },0);
    const outrasEntradas = porEmpresa(state.outrasEntradas).reduce((s,o)=> s + (inMonth(o.data)? (Number(o.valor)||0):0), 0);
    const totalEntradas = recebClientes + outrasEntradas;

    const pagamentoFornecedores =
      porEmpresa(state.contasPagar).filter(c=>c.centroCusto==='PRODUTO' && c.dataPagamento && inMonth(c.dataPagamento)).reduce((s,c)=>s+(Number(c.valor)||0),0) +
      porEmpresa(state.despesas).filter(d=>d.centroCusto==='PRODUTO' && d.dataPagamento && inMonth(d.dataPagamento)).reduce((s,d)=>s+(Number(d.valorPago)||0),0);
    const fretes =
      porEmpresa(state.contasPagar).filter(c=>c.centroCusto==='LOGISTICA' && c.dataPagamento && inMonth(c.dataPagamento)).reduce((s,c)=>s+(Number(c.valor)||0),0) +
      porEmpresa(state.despesas).filter(d=>d.centroCusto==='LOGISTICA' && d.dataPagamento && inMonth(d.dataPagamento)).reduce((s,d)=>s+(Number(d.valorPago)||0),0);
    const impostos =
      porEmpresa(state.contasPagar).filter(c=> c.dataPagamento && inMonth(c.dataPagamento) && /IMPOST/i.test(c.fornecedor||'')).reduce((s,c)=>s+(Number(c.valor)||0),0);
    const totalSaidasOp = pagamentoFornecedores + fretes + impostos;

    const admDoMes = (categoria)=> porEmpresa(state.despAdm.map(x=>({...x,empresa:x.empresa||''}))).filter(a=>a.categoria===categoria && inMonth(a.data)).reduce((s,a)=>s+(Number(a.valor)||0),0);
    const salarios = state.despAdm.filter(a=>a.categoria==='Salário' && inMonth(a.data)).reduce((s,a)=>s+(Number(a.valor)||0),0);
    const proLabore = state.despAdm.filter(a=>a.categoria==='Pró-Labore' && inMonth(a.data)).reduce((s,a)=>s+(Number(a.valor)||0),0);
    const contabilidade = state.despAdm.filter(a=>a.categoria==='Contabilidade' && inMonth(a.data)).reduce((s,a)=>s+(Number(a.valor)||0),0);
    const viagens = state.despAdm.filter(a=>a.categoria==='Viagens' && inMonth(a.data)).reduce((s,a)=>s+(Number(a.valor)||0),0);
    const outrasAdm = state.despAdm.filter(a=>!['Salário','Pró-Labore','Contabilidade','Viagens'].includes(a.categoria) && inMonth(a.data)).reduce((s,a)=>s+(Number(a.valor)||0),0)
      + porEmpresa(state.contasPagar).filter(c=>c.centroCusto==='DESPESA ADMINISTRATIVA' && c.dataPagamento && inMonth(c.dataPagamento) && !/IMPOST/i.test(c.fornecedor||'')).reduce((s,c)=>s+(Number(c.valor)||0),0);
    const totalSaidasFixas = salarios + proLabore + contabilidade + viagens + outrasAdm;

    const fluxoOperacional = totalEntradas - totalSaidasOp - totalSaidasFixas;

    return { label, recebClientes, outrasEntradas, totalEntradas, pagamentoFornecedores, fretes, impostos, totalSaidasOp,
      salarios, proLabore, contabilidade, viagens, outrasAdm, totalSaidasFixas, fluxoOperacional, saldoInicial:0, saldoFinal:0 };
  });
  let saldo = Number(state.saldoInicialAno)||0;
  meses.forEach(m=>{ m.saldoInicial = saldo; m.saldoFinal = saldo + m.fluxoOperacional; saldo = m.saldoFinal; });
  return meses;
}

function calcResultadoConsolidado(ano){
  const receitaBruta = porEmpresa(state.processos).reduce((s,p)=>{ const f=procValorFechCambioRS(p); const d=parseDate(p.dataFechCambio); return s + ((f!==null && (!ano || (d && d.getFullYear()===ano)))? f:0); },0);
  const custosProcessos = -( porEmpresa(state.despesas).reduce((s,d)=>s+(Number(d.valorPago)||0),0) + porEmpresa(state.contasPagar).filter(c=>c.centroCusto==='PRODUTO').reduce((s,c)=>s+(Number(c.valor)||0),0) );
  const lucroBruto = receitaBruta + custosProcessos;
  const margemBruta = receitaBruta? lucroBruto/receitaBruta : 0;
  const despAdmTotal = -( state.despAdm.reduce((s,a)=>s+(Number(a.valor)||0),0) + porEmpresa(state.contasPagar).filter(c=>c.centroCusto==='DESPESA ADMINISTRATIVA').reduce((s,c)=>s+(Number(c.valor)||0),0) );
  const lucroLiquido = lucroBruto + despAdmTotal;
  const margemLiquida = receitaBruta? lucroLiquido/receitaBruta : 0;
  return { receitaBruta, custosProcessos, lucroBruto, margemBruta, despAdmTotal, lucroLiquido, margemLiquida };
}

function calcDRE(ano){
  const fluxo = calcFluxoCaixa(ano);
  return fluxo.map(m=>{
    const receitaTotal = m.recebClientes + m.outrasEntradas;
    const lucroBruto = receitaTotal - m.pagamentoFornecedores - m.fretes - m.impostos;
    const margemBruta = receitaTotal? lucroBruto/receitaTotal : null;
    const lucroLiquido = lucroBruto - m.salarios - m.proLabore - m.contabilidade - m.viagens - m.outrasAdm;
    const margemLiquida = receitaTotal? lucroLiquido/receitaTotal : null;
    return { label:m.label, recebClientes:m.recebClientes, outrasEntradas:m.outrasEntradas, receitaTotal,
      fornecedores:-m.pagamentoFornecedores, fretes:-m.fretes, impostos:-m.impostos, lucroBruto, margemBruta,
      salarios:-m.salarios, proLabore:-m.proLabore, contabilidade:-m.contabilidade, viagens:-m.viagens, outrasAdm:-m.outrasAdm,
      lucroLiquido, margemLiquida };
  });
}
