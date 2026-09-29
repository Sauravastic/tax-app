-- Run this once in Supabase SQL Editor before using the full browser-data migration.
create table if not exists smartbill_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  record_type text not null check (record_type in (
    'profile',
    'customer',
    'product',
    'invoice',
    'payment',
    'inventory_log',
    'audit_log'
  )),
  legacy_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, record_type, legacy_id)
);

create index if not exists smartbill_records_business_type_idx
  on smartbill_records (business_id, record_type);

alter table smartbill_records enable row level security;
