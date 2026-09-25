-- ============================================================
-- Propinas: los mozos y runners ven el reparto de todos
--
-- Hasta ahora cada mozo veía solo lo suyo. Enzo decidió que el puesto
-- Mozos (en la app: "Mozos y Runners") vea el reparto completo de cada día,
-- igual que el reporte que ya les llega por el grupo de WhatsApp.
--
-- Los demás puestos siguen viendo solo lo suyo. Cargar y editar sigue siendo
-- solo para quien carga propinas y los admin.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

-- Quién ve el reparto de todos: quien carga y el puesto Mozos, con la cuenta
-- aprobada (también quien está en prueba: el grupo de WhatsApp lo recibe igual).
CREATE OR REPLACE FUNCTION ve_propinas_de_todos()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT puede_cargar_propinas() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND puesto = 'Mozos' AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION ve_propinas_de_todos() TO authenticated;

DROP POLICY IF EXISTS tip_entries_read ON tip_entries;
CREATE POLICY tip_entries_read ON tip_entries
  FOR SELECT TO authenticated
  USING (ve_propinas_de_todos() OR user_id = auth.uid());

DROP POLICY IF EXISTS tip_days_read ON tip_days;
CREATE POLICY tip_days_read ON tip_days
  FOR SELECT TO authenticated
  USING (
    ve_propinas_de_todos()
    OR EXISTS (SELECT 1 FROM tip_entries e WHERE e.day_id = tip_days.id AND e.user_id = auth.uid())
  );

-- Freno: las dos políticas de lectura tienen que usar la función nueva.
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies
      WHERE policyname IN ('tip_entries_read', 'tip_days_read')
        AND qual LIKE '%ve_propinas_de_todos%') <> 2 THEN
    RAISE EXCEPTION 'Las políticas de lectura de propinas no quedaron bien: se cancela.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: quiénes ven el reparto de todos (además de los admin).
-- ------------------------------------------------------------
SELECT full_name AS persona,
       CASE WHEN carga_propinas THEN 'carga propinas' ELSE puesto END AS por_que
FROM profiles
WHERE status = 'approved' AND role <> 'admin' AND (puesto = 'Mozos' OR carga_propinas)
ORDER BY full_name;
