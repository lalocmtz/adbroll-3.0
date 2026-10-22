-- Review/apply as a migration before apply.sql. No public raw data.
create table public.kalodata_targeted_report_rows (
  market text not null check (market in ('mx','us')),
  source_scope text not null check (source_scope in ('product_videos','shop_products')),
  source_entity_id text not null check (source_entity_id ~ '^[0-9]{15,22}$'),
  report_date_range text not null check (report_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'),
  source_record_id text not null check (source_record_id ~ '^[0-9]{15,22}$'),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  source_filename text not null,
  source_url text not null check (source_url ~ '^https://(www[.])?kalodata[.]com/(product|shop)/detail[?]'),
  source_rank integer not null check (source_rank>0),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  imported_at timestamptz not null default now(),
  primary key(market,source_scope,source_entity_id,report_date_range,source_record_id,source_sha256)
);
comment on table public.kalodata_targeted_report_rows is
  'Private source observations from product/shop detail exports. Scope-local sales/ranks never replace global report metrics. Separate SHA256 versions retain provenance.';
alter table public.kalodata_targeted_report_rows enable row level security;
revoke all on public.kalodata_targeted_report_rows from public,anon,authenticated;
grant all on public.kalodata_targeted_report_rows to service_role;
