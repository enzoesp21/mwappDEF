// Para correr las pruebas con Node sin instalar nada: entiende "@/lib/..." y los
// imports sin extensión, igual que los resuelve Next. Lo carga registrar.mjs.

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export async function resolve(especificador, contexto, siguiente) {
  let ruta = null
  if (especificador.startsWith('@/')) ruta = path.join(raiz, especificador.slice(2))
  else if (especificador.startsWith('.') && contexto.parentURL?.startsWith('file:')) {
    ruta = path.resolve(path.dirname(fileURLToPath(contexto.parentURL)), especificador)
  }
  if (ruta && !path.extname(ruta)) {
    for (const extension of ['.ts', '.tsx', '/index.ts']) {
      if (existsSync(ruta + extension)) return siguiente(pathToFileURL(ruta + extension).href, contexto)
    }
  }
  return siguiente(ruta ? pathToFileURL(ruta).href : especificador, contexto)
}
