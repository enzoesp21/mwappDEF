'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { PUESTOS } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    puesto: '',
    adminCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.puesto) {
      setError('Seleccioná tu puesto de trabajo.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    // Validate admin code server-side
    if (form.adminCode.trim() !== '') {
      const res = await fetch('/api/validate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.adminCode.trim() }),
      })
      const data = await res.json()
      if (!data.valid) {
        setError('Código de administrador incorrecto.')
        setLoading(false)
        return
      }
    }

    const role = form.adminCode.trim() !== '' ? 'admin' : 'staff'

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          puesto: form.puesto,
          role,
        },
      },
    })

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Este email ya está registrado.'
          : 'Error al registrarse. Intentá de nuevo.'
      )
      setLoading(false)
      return
    }

    router.push(role === 'admin' ? '/admin' : '/dashboard')
    router.refresh()
  }

  const inputClass = cn(
    'w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3',
    'text-brand-text placeholder-brand-muted text-sm',
    'transition-colors duration-200'
  )

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-brand-text mb-1">Crear cuenta</h1>
          <p className="text-brand-muted text-sm mb-6">Completá tus datos para registrarte</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-brand-text mb-1.5">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                required
                placeholder="Ej: Juan García"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-text mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                required
                placeholder="tu@email.com"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-text mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className={cn(inputClass, 'pr-12')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="puesto" className="block text-sm font-medium text-brand-text mb-1.5">
                Puesto de trabajo
              </label>
              <div className="relative">
                <select
                  id="puesto"
                  value={form.puesto}
                  onChange={handleChange('puesto')}
                  required
                  className={cn(inputClass, 'appearance-none cursor-pointer pr-10')}
                >
                  <option value="" disabled>Seleccioná tu puesto</option>
                  {PUESTOS.map((p) => (
                    <option key={p} value={p} className="bg-brand-card">
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="adminCode" className="block text-sm font-medium text-brand-text mb-1.5">
                Código de administrador{' '}
                <span className="text-brand-muted font-normal">(opcional)</span>
              </label>
              <input
                id="adminCode"
                type="password"
                value={form.adminCode}
                onChange={handleChange('adminCode')}
                placeholder="Solo si sos administrador"
                autoComplete="off"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-brand-error/10 border border-brand-error/30 rounded-lg px-4 py-3 text-brand-error text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl',
                'bg-brand-accent text-brand-dark font-semibold text-sm',
                'transition-all duration-200 cursor-pointer',
                'hover:bg-brand-accent-hover active:scale-[0.98]',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100',
                'min-h-[48px]'
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear cuenta
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-brand-muted text-sm mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-brand-accent hover:text-brand-accent-hover transition-colors cursor-pointer font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
