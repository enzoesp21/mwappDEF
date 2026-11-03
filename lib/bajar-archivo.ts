// Bajar un archivo que arma la app (los Excel), del lado del navegador.

/** Baja un archivo de la app; si el servidor contesta un error, lo devuelve en texto. */
export async function bajarArchivo(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) {
      const cuerpo = await r.json().catch(() => null)
      return (cuerpo as { error?: string } | null)?.error ?? `No se pudo bajar (error ${r.status}).`
    }
    const disposicion = r.headers.get('Content-Disposition') ?? ''
    const nombre = decodeURIComponent(
      disposicion.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? disposicion.match(/filename="([^"]+)"/)?.[1] ?? 'planilla.xlsx'
    )
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(await r.blob())
    enlace.download = nombre
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000)
    return null
  } catch {
    return 'No se pudo bajar el archivo: revisá la conexión.'
  }
}
