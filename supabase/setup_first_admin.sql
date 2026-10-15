-- Execute uma vez no SQL Editor como proprietário do projeto Supabase.
-- 1. Crie primeiro o usuário em Authentication > Users (desative o cadastro público).
-- 2. Copie o UUID desse usuário e substitua o valor abaixo.
-- 3. Execute e confirme que uma linha foi inserida.
-- Nunca disponibilize este procedimento em telas ou endpoints públicos.
insert into public.admins (user_id)
values ('SUBSTITUA-PELO-UUID-DO-USUARIO-AUTH');
