-- ============================================================
-- COMPLEMENTO ao supabase_schema.sql
-- Rode isso também no SQL Editor (tabela nova: configuracoes)
-- ============================================================

create table configuracoes (
  id smallint primary key default 1,
  saldo_inicial_ano numeric(14,2) not null default 0,
  constraint singleton check (id = 1)
);
insert into configuracoes (id, saldo_inicial_ano) values (1, 0);

alter table configuracoes enable row level security;
create policy configuracoes_authenticated_all on configuracoes
  for all to authenticated using (true) with check (true);

-- ============================================================
-- Vínculo automático Despesas -> Contas a Pagar
-- ============================================================
alter table contas_pagar add column despesa_id uuid references despesas(id) on delete cascade;
create index idx_cap_despesa on contas_pagar(despesa_id);

alter table contas_pagar add column desp_adm_id uuid references desp_adm(id) on delete cascade;
create index idx_cap_desp_adm on contas_pagar(desp_adm_id);
