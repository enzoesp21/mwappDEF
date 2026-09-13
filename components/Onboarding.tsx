'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Clock3,
  BookOpen,
  Users,
  ScrollText,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Logo from '@/components/Logo'
import { cn } from '@/lib/utils'
import { setExperienceAction } from '@/app/actions/users'

type Choice = 'nuevo' | 'experimentado'

interface Props {
  fullName: string
  guideId: string | null
}

const HIGHLIGHTS = [
  { icon: Users, title: 'Los roles del salón', desc: 'Qué hace un mozo, un runner y un commis, y cómo se apoyan entre sí.' },
  { icon: ScrollText, title: 'Las reglas básicas', desc: 'Horarios, presentación, celular, descansos y convivencia.' },
  { icon: ClipboardCheck, title: 'Cómo se evalúa', desc: 'Los 21 criterios del día a día, con ejemplos de qué suma y qué no.' },
]

export default function Onboarding({ fullName, guideId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const firstName = fullName.trim().split(' ')[0] || ''
  const isNuevo = choice === 'nuevo'

  function pick(value: Choice) {
    setChoice(value)
    setStep(2)
  }

  async function finish(target: 'guide' | 'dashboard') {
    if (!choice || saving) return
    setSaving(true)
    setError(null)

    const result = await setExperienceAction(choice)
    if (!result.ok) {
      setSaving(false)
      setError(result.error)
      return
    }

    if (target === 'guide' && guideId) {
      router.push('/dashboard/guides/' + guideId)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <header className="px-4 pt-6 pb-2 flex justify-center">
        <Logo size="md" />
      </header>

      <div className="flex items-center justify-center gap-2 py-4">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              step === n ? 'w-8 bg-brand-accent' : 'w-1.5 bg-brand-border'
            )}
          />
        ))}
      </div>

      <main className="flex-1 px-4 pb-10 max-w-lg mx-auto w-full">
        {step === 1 ? (
          <div className="animate-slide-up space-y-6">
            <div className="text-center space-y-2">
              <p className="text-brand-accent text-sm font-semibold tracking-wide uppercase">
                Bienvenido/a
              </p>
              <h1 className="text-3xl font-display font-bold text-brand-text leading-tight">
                Hola{firstName ? ' ' + firstName : ''}
              </h1>
              <p className="text-brand-muted text-sm leading-relaxed">
                Antes de arrancar, contanos una cosa así te mostramos lo más útil para vos.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider text-center">
                ¿Hace cuánto estás en Mirador Waikiki?
              </p>

              <button
                onClick={() => pick('nuevo')}
                className="w-full text-left bg-brand-card border-2 border-brand-border hover:border-brand-accent rounded-2xl p-5 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-brand-text">Soy nuevo/a</p>
                    <p className="text-sm text-brand-muted mt-0.5">
                      Recién arranco o llevo menos de 3 meses.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-muted group-hover:text-brand-accent transition-colors flex-shrink-0 mt-3" />
                </div>
              </button>

              <button
                onClick={() => pick('experimentado')}
                className="w-full text-left bg-brand-card border-2 border-brand-border hover:border-brand-accent rounded-2xl p-5 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                    <Clock3 className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-brand-text">Ya llevo tiempo</p>
                    <p className="text-sm text-brand-muted mt-0.5">
                      Trabajo acá hace más de 3 meses.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-muted group-hover:text-brand-accent transition-colors flex-shrink-0 mt-3" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up space-y-5">
            <button
              onClick={() => setStep(1)}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver
            </button>

            <div className="bg-brand-card border-2 border-brand-accent rounded-2xl overflow-hidden">
              <div className="bg-brand-accent px-5 py-2.5">
                <p className="text-white text-[11px] font-bold uppercase tracking-widest text-center">
                  {isNuevo ? 'Empezá por acá' : 'Vale el repaso'}
                </p>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-brand-accent" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-display font-bold text-brand-text leading-tight">
                      Guía para Nuevos y No Tan Nuevos
                    </h2>
                    <p className="text-xs text-brand-muted mt-0.5">
                      Mozos · Runners · Comisses
                    </p>
                  </div>
                </div>

                <p className="text-sm text-brand-text leading-relaxed">
                  {isNuevo ? (
                    <>
                      Esta es <strong>la guía fundamental</strong>. Si vas a leer una sola cosa,
                      que sea esta: acá está todo lo que necesitás para entender cómo funciona
                      Mirador Waikiki y cuáles son las reglas básicas del trabajo.
                    </>
                  ) : (
                    <>
                      Aunque ya lleves tiempo, <strong>esta sigue siendo la guía base</strong> de
                      cómo trabajamos. Se actualizó con los criterios de evaluación completos, así
                      que conviene darle una repasada.
                    </>
                  )}
                </p>

                <div className="space-y-2.5 pt-1">
                  {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3">
                      <Icon className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-text">{title}</p>
                        <p className="text-xs text-brand-muted leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              {guideId && (
                <button
                  onClick={() => finish('guide')}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-brand-accent text-white font-bold text-sm hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[52px] disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                  Abrir la guía
                </button>
              )}

              <button
                onClick={() => finish('dashboard')}
                disabled={saving}
                className="w-full py-3 px-4 rounded-xl bg-brand-card border border-brand-border text-brand-muted font-medium text-sm hover:text-brand-text hover:border-brand-accent/50 transition-colors cursor-pointer min-h-[48px] disabled:opacity-60"
              >
                {guideId ? 'La leo después, ir al inicio' : 'Ir al inicio'}
              </button>
            </div>

            <div className="text-center pt-2">
              <p className="text-brand-accent font-display font-bold text-lg">
                ¡ÉXITOS en este camino!
              </p>
              <p className="text-brand-muted text-xs mt-1">
                Nos alegra tenerte en el equipo de Mirador Waikiki.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
