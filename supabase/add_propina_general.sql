-- ============================================================
-- Propina del resto del personal: en qué parte va cada uno
--
-- La propina del resto del personal (todos menos los camareros) se reparte por
-- quincena: 60 % Salón y 40 % Cocina, según las horas de la planilla. Cada uno
-- va solo en su parte por su sector de Horarios o su cargo. Esta columna es
-- para fijarlo a mano cuando eso no alcanza (un nuevo sin sector, alguien que
-- figura en un sector pero cobra en el otro):
--   'salon' | 'cocina' | 'afuera' (no entra) | vacía (automático).
-- Se cambia desde Fichadas → Planilla del mes → Propina del resto del personal.
-- La tabla ya es solo de admin. No toca nada más. Se puede correr dos veces.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.planilla_empleados') IS NULL THEN
    RAISE EXCEPTION 'Falta la planilla maestra: corré primero supabase/add_fichadas_planilla.sql.';
  END IF;
END $$;

ALTER TABLE planilla_empleados ADD COLUMN IF NOT EXISTS grupo_propina_general text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planilla_empleados_grupo_propina_general_check') THEN
    ALTER TABLE planilla_empleados
      ADD CONSTRAINT planilla_empleados_grupo_propina_general_check
      CHECK (grupo_propina_general IN ('salon', 'cocina', 'afuera'));
  END IF;
END $$;

-- Verificación: "lista" y "solo salon, cocina o afuera". La primera vez, nadie
-- fijado a mano (0).
SELECT 'columna grupo_propina_general' AS que,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema = 'public' AND table_name = 'planilla_empleados'
                           AND column_name = 'grupo_propina_general')
            THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'valores permitidos',
       CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planilla_empleados_grupo_propina_general_check')
            THEN 'solo salon, cocina o afuera' ELSE 'FALTA' END
UNION ALL
SELECT 'fijados a mano', count(*)::text FROM planilla_empleados WHERE grupo_propina_general IS NOT NULL;
