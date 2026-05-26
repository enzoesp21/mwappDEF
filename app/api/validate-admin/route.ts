import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { code } = await request.json()
  const valid = code === process.env.ADMIN_SECRET_KEY
  return NextResponse.json({ valid })
}
