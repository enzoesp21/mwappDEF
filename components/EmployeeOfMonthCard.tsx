import { Trophy } from 'lucide-react'
import { formatPeriod } from '@/lib/month-utils'

interface Props {
  period: string
  fullName: string
  puesto: string
  photoUrl: string | null
  message: string | null
  /** Compacta la tarjeta para el inicio. */
  compact?: boolean
}

export default function EmployeeOfMonthCard({
  period,
  fullName,
  puesto,
  photoUrl,
  message,
  compact,
}: Props) {
  return (
    <div className="relative bg-gradient-to-br from-[#6e8f7a] to-[#3d5747] rounded-2xl overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(/logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right -10% center',
          backgroundSize: 'auto 150%',
          mixBlendMode: 'multiply',
        }}
      />

      <div className="relative p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-white/80 flex-shrink-0" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
            Empleado del mes · {formatPeriod(period)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-white/15 flex-shrink-0 ring-2 ring-white/30">
            {photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-2xl font-bold">
                {fullName.trim().charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-lg leading-tight">{fullName}</p>
            {puesto && <p className="text-white/70 text-sm">{puesto}</p>}
          </div>
        </div>

        {message && !compact && (
          <p className="text-white/90 text-sm leading-relaxed mt-4 border-t border-white/20 pt-4">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
