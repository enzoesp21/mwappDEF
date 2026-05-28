import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return NextResponse.json({
    totalCookies: allCookies.length,
    supabaseCookie: allCookies
      .filter(c => c.name.startsWith('sb-'))
      .map(c => ({
        name: c.name,
        length: c.value.length,
        first30chars: c.value.substring(0, 30),
        isUrlEncoded: c.value.startsWith('%'),
      })),
    sessionFound: !!session,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
  })
}
