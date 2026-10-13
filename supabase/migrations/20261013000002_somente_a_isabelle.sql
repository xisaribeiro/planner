-- Só a conta xisaribeiro@gmail.com pode existir neste projeto.
-- Qualquer outra conta que tente entrar (com Google ou por e-mail) é recusada antes de ser criada.
create or replace function public.somente_a_isabelle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) <> 'xisaribeiro@gmail.com' then
    raise exception 'Este planner é de uso pessoal.';
  end if;
  return new;
end;
$$;

revoke all on function public.somente_a_isabelle() from public, anon, authenticated;

create trigger somente_a_isabelle
  before insert on auth.users
  for each row execute function public.somente_a_isabelle();
