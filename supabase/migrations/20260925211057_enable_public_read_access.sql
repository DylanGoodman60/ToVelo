alter table trips enable row level security;
alter table stations enable row level security;

create policy "Allow public read access" on trips for select using (true);
create policy "Allow public read access" on stations for select using (true);
