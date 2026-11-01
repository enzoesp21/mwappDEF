// Se pasa con --import al correr las pruebas (ver "test" en package.json).
import { register } from 'node:module'

register('./resolver.mjs', import.meta.url)
