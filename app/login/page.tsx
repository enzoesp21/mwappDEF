'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { loginAction } from '@/app/actions/auth'
import Logo from '@/components/Logo'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    const result = await loginAction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Server Action set the cookies — now do a hard reload so the server reads them
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-brand-text mb-1">Iniciar sesión</h1>
          <p className="text-brand-muted text-sm mb-6">Accedé con tu cuenta del personal</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-text mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className={cn(
                  'w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3',
                  'text-brand-text placeholder-brand-muted text-sm',
                  'transition-colors duration-200'
                )}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full bg-brand-dark border border-brand-border rounded-xl px-4 py-3 pr-12',
                    'text-brand-text placeholder-brand-muted text-sm',
                    'transition-colors duration-200'
                  )}
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
                  <LogIn className="w-4 h-4" />
                  Ingresar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-brand-muted text-sm mt-6">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-brand-accent hover:text-brand-accent-hover transition-colors cursor-pointer font-medium">
            Registrarte
          </Link>
        </p>
      </div>
    </div>
  )
}
