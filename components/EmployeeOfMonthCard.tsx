import { Trophy, Quote } from 'lucide-react'
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
  const inicial = fullName.trim().charAt(0).toUpperCase() || 'U'

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

      {compact ? (
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
                  {inicial}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-lg leading-tight">{fullName}</p>
              {puesto && <p className="text-white/70 text-sm">{puesto}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative px-5 py-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 mb-6">
            <Trophy className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span className="text-white text-[10px] font-bold uppercase tracking-widest">
              Empleado del mes · {formatPeriod(period)}
            </span>
          </div>

          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-white/15 mx-auto ring-4 ring-white/30 shadow-lg">
            {photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-5xl font-bold">
                {inicial}
              </div>
            )}
          </div>

          <h2 className="text-white font-bold text-2xl sm:text-3xl leading-tight mt-5 break-words">
            {fullName}
          </h2>
          {puesto && <p className="text-white/75 text-sm mt-1">{puesto}</p>}

          {message && (
            <div className="mt-6 pt-6 border-t border-white/20 text-left">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Quote className="w-3 h-3 flex-shrink-0" />
                El reconocimiento
              </p>
              <p className="text-white text-[15px] leading-relaxed">{message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
