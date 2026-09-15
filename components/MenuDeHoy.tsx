import { Leaf, UtensilsCrossed } from 'lucide-react'
import { semanaDelCiclo, type Plato } from '@/lib/menu-semanal'

interface Props {
  fecha: string
  almuerzo: Plato | null
  cena: Plato | null
}

function Turno({ nombre, plato }: { nombre: string; plato: Plato }) {
  return (
    <div>
      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">
        {nombre}
      </p>
      <p className="text-white text-[15px] leading-snug">
        {plato.principal}
        {plato.nota && <span className="text-white/60"> · {plato.nota}</span>}
      </p>
      {plato.vegetariano && (
        <p className="flex items-start gap-1.5 text-white/75 text-xs leading-snug mt-1">
          <Leaf className="w-3 h-3 flex-shrink-0 mt-0.5" />
          {plato.vegetariano}
        </p>
      )}
    </div>
  )
}

export default function MenuDeHoy({ fecha, almuerzo, cena }: Props) {
  if (!almuerzo && !cena) return null

  const dia = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="relative bg-gradient-to-br from-[#6e8f7a] to-[#3d5747] rounded-2xl overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'url(/logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right -15% center',
          backgroundSize: 'auto 160%',
          mixBlendMode: 'multiply',
        }}
      />

      <div className="relative p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-white/80 flex-shrink-0" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
            Hoy se come · Semana {semanaDelCiclo(fecha)}
          </span>
        </div>

        <p className="text-white/70 text-xs capitalize -mt-2">{dia}</p>

        <div className="space-y-4 border-t border-white/20 pt-4">
          {almuerzo && <Turno nombre="Almuerzo" plato={almuerzo} />}
          {cena && <Turno nombre="Cena" plato={cena} />}
        </div>
      </div>
    </div>
  )
}
