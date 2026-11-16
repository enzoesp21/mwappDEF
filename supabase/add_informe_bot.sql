-- ============================================================
-- Informe del bot de WhatsApp de Nochebuena (sección "Bot" del admin)
--
-- El bot guarda cada charla en nb_conversaciones (la tabla la creó el
-- instalar.sql del bot). Hasta ahora solo la leía la función del bot: la
-- tabla tiene RLS sin políticas. Esto deja que los admins la lean desde la
-- app, para contar cuánta gente escribió, cuántas veces se mandó el PDF y
-- cuántos quisieron reservar. Nadie más la ve y nadie puede escribirla
-- desde la app.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.nb_conversaciones') IS NULL THEN
    RAISE EXCEPTION 'No está la tabla nb_conversaciones: primero hay que correr el instalar.sql del bot.';
  END IF;
END $$;

DROP POLICY IF EXISTS "admins leen las charlas del bot" ON public.nb_conversaciones;
CREATE POLICY "admins leen las charlas del bot"
  ON public.nb_conversaciones
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Verificación: tiene que aparecer la política, solo de lectura.
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'nb_conversaciones';
