alter table public.track_b_performance_evidence
  add column if not exists commission numeric,
  add column if not exists commerce_test_id uuid references public.cornerstone_commerce_tests(id) on delete set null;

create index if not exists idx_tb_performance_commerce_test
  on public.track_b_performance_evidence(commerce_test_id, created_at desc);
