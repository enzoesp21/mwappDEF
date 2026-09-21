/**
 * Ordena un nombre escrito de cualquier manera.
 *
 * Saca los espacios de sobra, pone mayúscula inicial en cada palabra y deja
 * en minúscula las partículas que van así en castellano ("de", "del", "la"),
 * salvo cuando abren el nombre.
 *
 * No toca lo que no puede saber: si alguien se escribe "McCarthy" o "D'Angelo",
 * el resultado va a ser "Mccarthy" o "D'angelo". Por eso en el panel esto es
 * una sugerencia que se puede editar a mano, no un cambio automático.
 */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'di', 'van', 'von'])

export function formatearNombre(valor: string): string {
  const palabras = valor
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-AR')
    .split(' ')
    .filter(Boolean)

  return palabras
    .map((palabra, i) => {
      if (i > 0 && PARTICULAS.has(palabra)) return palabra
      // Los guiones también separan nombres: "ana-maria" -> "Ana-Maria".
      return palabra
        .split('-')
        .map((parte) =>
          parte ? parte.charAt(0).toLocaleUpperCase('es-AR') + parte.slice(1) : parte
        )
        .join('-')
    })
    .join(' ')
}

/** Si el nombre guardado no está prolijo y conviene sugerir un cambio. */
export function necesitaFormato(valor: string): boolean {
  return valor !== formatearNombre(valor)
}
