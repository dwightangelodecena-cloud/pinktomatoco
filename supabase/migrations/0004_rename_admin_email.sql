-- Changes the admin login to pink@tomato.admin. The account keeps its password and admin access.
-- Safe to run more than once. Run it in the Supabase SQL Editor.
update auth.identities i
   set identity_data = i.identity_data || jsonb_build_object('email', 'pink@tomato.admin')
  from auth.users u
 where i.user_id = u.id and i.provider = 'email' and u.email = 'pink@tomato.com';

update auth.users set email = 'pink@tomato.admin' where email = 'pink@tomato.com';
