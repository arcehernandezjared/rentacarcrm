import { NextRequest } from 'next/server'
import { saveTokensFromCode } from '@/lib/gmail'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

  if (!code) {
    return Response.redirect(`${appUrl}/dashboard?gmail=error`)
  }

  try {
    await saveTokensFromCode(code)
    return Response.redirect(`${appUrl}/dashboard?gmail=conectado`)
  } catch (err) {
    console.error('[gmail callback]', err)
    return Response.redirect(`${appUrl}/dashboard?gmail=error`)
  }
}
