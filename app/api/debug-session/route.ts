import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Read the raw cookie value directly
  const rawCookie = allCookies.find(c => c.name.startsWith('sb-'))
  const rawValue = rawCookie?.value ?? null

  // Try to parse it manually
  let manualParse: Record<string, unknown> | null = null
  let manualParseError: string | null = null
  let isExpired: boolean | null = null
  let currentTime: number | null = null

  if (rawValue) {
    try {
      manualParse = JSON.parse(rawValue)
      currentTime = Math.floor(Date.now() / 1000)
      const expiresAt = manualParse?.expires_at as number
      isExpired = expiresAt ? expiresAt < currentTime : null
    } catch (e) {
      manualParseError = String(e)
    }
  }

  // Try getSession() with NO decode transform to see raw behavior
  const supabaseRaw = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: rawResult, error: rawError } = await supabaseRaw.auth.getSession()

  return NextResponse.json({
    cookieFound: !!rawCookie,
    cookieName: rawCookie?.name,
    valueLength: rawValue?.length,
    valueFirst50: rawValue?.substring(0, 50),
    isUrlEncoded: rawValue?.startsWith('%') ?? false,
    manualParseOk: !!manualParse,
    manualParseError,
    expiresAt: (manualParse?.expires_at as number) ?? null,
    currentTime,
    isExpired,
    sessionFoundWithoutDecode: !!rawResult?.session,
    errorWithoutDecode: rawError?.message ?? null,
  })
}
