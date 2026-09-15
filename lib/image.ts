/**
 * Prepara una foto para usar como avatar: la recorta al cuadrado del centro,
 * la achica y la comprime, todo en el navegador. Asi se sube poco peso aunque
 * la persona elija una foto de 4 MB de la galería del celular.
 */
export async function prepareSquarePhoto(file: File, maxSide = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = Math.round((bitmap.width - side) / 2)
  const sy = Math.round((bitmap.height - side) / 2)
  const out = Math.min(maxSide, side)

  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('No se pudo procesar la imagen')
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))),
      'image/jpeg',
      0.85
    )
  })
}
