// ============================================================
// CHECKLISTS
// ============================================================
const CHECKLIST_DIARIO = [
  'Download dos extratos bancários (bancos/contas cadastrados)',
  'Identificação de entradas e saídas do dia',
  'Registro da taxa de câmbio real de cada operação internacional',
  'Lançamento de contas a pagar novas (CAP)',
  'Lançamento de contas a receber novas (CAR) — proformas / embarques',
  'Baixa dos títulos pagos (CAP: Data Pgto) e recebidos (CAR: Data Recebimento)',
  'Atualização do fluxo de caixa multimoeda',
  'Conferência dos dashboards (caixa e contas em aberto)',
];
const CHECKLIST_MENSAL = [
  'Lançamentos do mês conferidos contra extrato (zero divergência)',
  'Taxas de câmbio de todas as operações registradas',
  'Extratos do mês salvos em pasta única por empresa',
  'Pasta documental por processo: AWB/BL + invoice + comprovantes',
  'Consolidação enviada ao contador responsável (US/exterior)',
  'Consolidação enviada ao contador do Brasil',
  'Snapshot do ERP salvo em backup/nuvem',
  'DRE Gerencial do mês revisada',
];

async function toggleChecklist(tipo, key, idx){
  const bucket = tipo==='diario' ? state.checklistDiario : state.checklistMensal;
  if(!bucket[key]) bucket[key] = {};
  const novoValor = !bucket[key][idx];
  bucket[key][idx] = novoValor;
  render();
  const tabela = tipo==='diario' ? 'checklist_diario' : 'checklist_mensal';
  const colChave = tipo==='diario' ? 'data_ref' : 'mes_ref';
  try{
    await sb.from(tabela).upsert({ [colChave]: key, item_idx: idx, done: novoValor }, { onConflict: `${colChave},item_idx` });
  }catch(e){
    alert('Erro ao salvar checklist: ' + e.message);
  }
}

function renderChecklists(){
  const hojeKey = todayISO();
  const mesKey = hojeKey.slice(0,7);
  const diario = state.checklistDiario[hojeKey] || {};
  const mensal = state.checklistMensal[mesKey] || {};
  const doneDiario = CHECKLIST_DIARIO.filter((_,i)=>diario[i]).length;
  const doneMensal = CHECKLIST_MENSAL.filter((_,i)=>mensal[i]).length;

  const hoje = parseDate(todayISO());
  const capVenc3 = state.contasPagar.filter(c=>c.vencimento && !c.dataPagamento && Number(c.valor)>0).filter(c=>{ const d=parseDate(c.vencimento); const diff=daysBetween(d,hoje); return diff>=0 && diff<=3; });
  const capVenc3RS = capVenc3.reduce((s,c)=>s+(Number(c.valor)||0),0);
  const capVencidos = state.contasPagar.filter(c=>capStatus(c)==='Vencido').length;
  const carVencidos = state.contasReceber.filter(c=>carStatus(c)==='Vencido').length;
  const carAbertoUSD = state.contasReceber.filter(r=>r.moeda==='USD' && !r.dataRecebimento).reduce((s,r)=>s+(carSaldoAberto(r)||0),0);

  return `
  <div class="grid grid-4" style="margin-bottom:22px;">
    ${kpiCard('CAP vencendo em até 3 dias', capVenc3.length, fmtMoney(capVenc3RS), 'var(--amber)')}
    ${kpiCard('CAP vencidos sem pagamento', capVencidos, 'contas a pagar', 'var(--red)')}
    ${kpiCard('CAR vencidos sem recebimento', carVencidos, 'contas a receber', 'var(--red)')}
    ${kpiCard('CAR em aberto (USD)', 'US$ '+fmtNum(carAbertoUSD), '', 'var(--accent)')}
  </div>

  <div class="grid grid-2">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <b style="font-size:13.5px;">Rotina Diária</b><span class="small-muted">${doneDiario}/${CHECKLIST_DIARIO.length}</span>
      </div>
      <div class="progress-bar" style="margin-bottom:10px;"><div style="width:${(doneDiario/CHECKLIST_DIARIO.length*100)||0}%"></div></div>
      ${CHECKLIST_DIARIO.map((item,i)=>`
        <div class="checklist-row">
          <input type="checkbox" ${diario[i]?'checked':''} onchange="toggleChecklist('diario','${hojeKey}',${i})">
          <span style="${diario[i]?'text-decoration:line-through;color:#9ca3af;':''}">${i+1}. ${esc(item)}</span>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <b style="font-size:13.5px;">Fechamento Mensal — até dia 15</b><span class="small-muted">${doneMensal}/${CHECKLIST_MENSAL.length}</span>
      </div>
      <div class="progress-bar" style="margin-bottom:10px;"><div style="width:${(doneMensal/CHECKLIST_MENSAL.length*100)||0}%"></div></div>
      ${CHECKLIST_MENSAL.map((item,i)=>`
        <div class="checklist-row">
          <input type="checkbox" ${mensal[i]?'checked':''} onchange="toggleChecklist('mensal','${mesKey}',${i})">
          <span style="${mensal[i]?'text-decoration:line-through;color:#9ca3af;':''}">${i+1}. ${esc(item)}</span>
        </div>
      `).join('')}
    </div>
  </div>
  `;
}
