// ============================================================
// CLIENTES / PROCESSOS / DESPESAS
// ============================================================
function renderClientes(){
  return renderCrudTable('clientes');
}

function renderProcessos(){
  const extras = [
    { label:'Valor Fech. Câmbio (R$)', render: p => { const v=procValorFechCambioRS(p); return v===null? '<span class="small-muted">Em aberto</span>' : `<span class="mono">${fmtMoney(v)}</span>`; } },
    { label:'A Receber Est. (USD)', render: p => { const v=procAReceberEstUSD(p); return v===null? '—' : `<span class="mono">US$ ${fmtNum(v)}</span>`; } },
  ];
  return renderCrudTable('processos', extras);
}

function renderDespesas(){
  const extras = [
    { label:'Saldo (R$)', render: d => { const v=despSaldo(d); return v===null? '—' : fmtMoney(v); } },
  ];
  return renderCrudTable('despesas', extras);
}
