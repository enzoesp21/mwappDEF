/**
 * Secciones en fase beta (Enzo, 03/11: "se van a empezar a registrar el
 * personal"). El personal las ve en el menú, pero adentro dice que se habilitan
 * próximamente y no se muestra nada de lo que tienen. Los encargados las siguen
 * usando desde el panel de admin.
 *
 * Para habilitar una, ponerla en false.
 */
export const EN_BETA = {
  /** El ranking de exámenes (/dashboard/resultados). */
  resultados: true,
  /** Los niveles de los mozos (/dashboard/progresion y la tarjeta de Inicio). */
  progresion: true,
} as const
