-- ============================================================
-- Arreglar el freno de profiles y normalizar el puesto "Recepcion"
--
-- EL PROBLEMA
-- El trigger que agregue para que nadie se cambie el rol a si mismo
-- tambien bloquea al editor SQL de Supabase: ahi no hay usuario logueado,
-- entonces is_admin() da falso y el freno salta contra vos.
--
-- LA CORRECCION
-- El trigger deja pasar cuando no hay usuario logueado (el editor SQL y la
-- service_role). Para llegar a esa consola ya hay que ser dueño del
-- proyecto, asi que no se pierde nada: el freno sigue siendo contra el
-- navegador de un empleado, que es de donde venia el riesgo.
-- Un anonimo tampoco se cuela: la politica de RLS de profiles ya exige
-- id = auth.uid() para poder escribir una fila.
--
-- Ademas corrige el puesto que quedo sin tilde: esa persona veia solo 3
-- guias de las 6, porque las guias por sector estan asignadas a
-- "Recepción" con tilde.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El admin puede cambiar cualquier cosa de cualquiera.
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- El editor SQL y la service_role tampoco se frenan.
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'No podés cambiarte el rol.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'No podés cambiarte el estado de la cuenta.';
  END IF;

  IF NEW.puesto IS DISTINCT FROM OLD.puesto THEN
    RAISE EXCEPTION 'El puesto lo cambia un encargado.';
  END IF;

  RETURN NEW;
END;
$$;

-- El puesto sin tilde, que dejaba a esa persona sin la mitad de las guias.
UPDATE profiles SET puesto = 'Recepción' WHERE puesto = 'Recepcion';

-- ------------------------------------------------------------
-- Verificacion: ya no tiene que quedar ningun "Recepcion" sin tilde,
-- y cada puesto tiene que ver las guias que le corresponden.
-- ------------------------------------------------------------
SELECT p.puesto,
       count(*) AS personas,
       (SELECT count(*) FROM guides g
        WHERE g.puestos @> ARRAY[p.puesto]::text[]
           OR g.puestos @> ARRAY['todos']::text[]) AS guias_que_ve
FROM profiles p
GROUP BY p.puesto
ORDER BY p.puesto;
