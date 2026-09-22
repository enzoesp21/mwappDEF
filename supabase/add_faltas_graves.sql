-- ============================================================
-- Faltas que terminan el período de prueba
--
-- Agrega una sección nueva a la guía de Conocimientos Fundamentales, entre
-- NORMAS Y CONVIVENCIA y ROLES Y ORGANIGRAMA.
--
-- Va en esa guía porque es la primera que lee todo el mundo y la única que
-- está en el recorrido de los once puestos.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: si la sección ya
-- está cargada, no hace nada.
-- ============================================================

BEGIN;

UPDATE guides
SET content = replace(
      content,
      '## ROLES Y ORGANIGRAMA',
      '## FALTAS QUE TERMINAN EL PERÍODO DE PRUEBA

En Mirador Waikiki valoramos el aprendizaje y entendemos que al principio se cometen errores. Pero hay conductas que **no tienen margen**: cualquiera de estas implica la **finalización inmediata de la prueba**.

1. **Faltar sin avisar** o abandonar el turno antes de terminar.
2. **Salir a fumar sin avisar** a tu referente o al encargado.
3. **Usar el celular en el salón** sin autorización.
4. **Faltarle el respeto** a un compañero, superior o proveedor.
5. **Maltratar o faltarle el respeto a un cliente.**
6. **Cualquier forma de discriminación o acoso**, dentro o fuera del turno, hacia clientes o compañeros.
7. **Llegar bajo los efectos del alcohol o drogas**, o consumirlos durante el turno.
8. **Tomar dinero, productos o pertenencias** de clientes, compañeros o del lugar.
9. **Quedarse con propinas** que corresponden al pozo común.
10. **Consumir comida o bebida del restaurante sin autorización.**

> Esta lista no es una amenaza: es para que nadie se entere tarde. Todo lo demás se corrige hablando.

---

## ROLES Y ORGANIGRAMA'
    )
WHERE is_primary = true
  AND content LIKE '%## ROLES Y ORGANIGRAMA%'
  AND content NOT LIKE '%FALTAS QUE TERMINAN EL PERÍODO DE PRUEBA%';

-- Freno: si el texto de referencia no estaba, la sección no se agregó y hay
-- que revisarlo a mano en lugar de creer que quedó cargada.
DO $$
DECLARE ok int;
BEGIN
  SELECT count(*) INTO ok
  FROM guides
  WHERE is_primary = true
    AND content LIKE '%FALTAS QUE TERMINAN EL PERÍODO DE PRUEBA%';

  IF ok <> 1 THEN
    RAISE EXCEPTION 'La sección no quedó cargada en la guía principal: se cancela.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT title AS guia,
       length(content) AS caracteres,
       (content LIKE '%FALTAS QUE TERMINAN EL PERÍODO DE PRUEBA%') AS tiene_la_seccion,
       (length(content) - length(replace(content, 'FALTAS QUE TERMINAN', ''))) / length('FALTAS QUE TERMINAN') AS veces_que_aparece
FROM guides
WHERE is_primary = true;
