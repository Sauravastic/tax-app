-- Run once in Supabase SQL Editor.
-- The existing customers table is reused by the application.

create table if not exists smartbill_business_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists smartbill_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  legacy_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, legacy_id)
);

create table if not exists smartbill_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  legacy_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, legacy_id)
);

create table if not exists smartbill_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  legacy_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, legacy_id)
);

create table if not exists smartbill_inventory_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  legacy_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, legacy_id)
);

create table if not exists smartbill_audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  legacy_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, legacy_id)
);

create index if not exists smartbill_products_business_id_idx on smartbill_products (business_id);
create index if not exists smartbill_invoices_business_id_idx on smartbill_invoices (business_id);
create index if not exists smartbill_payments_business_id_idx on smartbill_payments (business_id);
create index if not exists smartbill_inventory_logs_business_id_idx on smartbill_inventory_logs (business_id);
create index if not exists smartbill_audit_logs_business_id_idx on smartbill_audit_logs (business_id);
