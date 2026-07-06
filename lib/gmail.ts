import { google } from 'googleapis'
import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

function getRedirectUri() {
  return `${process.env.APP_URL ?? 'http://localhost:3000'}/api/gmail/callback`
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  )
}

export function getAuthUrl() {
  return getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })
}

export async function saveTokensFromCode(code: string) {
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  const gmail = google.gmail({ version: 'v1', auth: client })
  const { data: profile } = await gmail.users.getProfile({ userId: 'me' })

  // Solo se mantiene conectada una cuenta de Gmail a la vez.
  await pool.query('DELETE FROM gmail_conexion')
  await pool.query(
    'INSERT INTO gmail_conexion (email, access_token, refresh_token, expiry_date) VALUES (?, ?, ?, ?)',
    [profile.emailAddress, tokens.access_token, tokens.refresh_token, tokens.expiry_date ?? null]
  )

  return profile.emailAddress
}

export async function getConexion() {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM gmail_conexion ORDER BY id DESC LIMIT 1')
  return rows[0] ?? null
}

export async function desconectar() {
  await pool.query('DELETE FROM gmail_conexion')
}

export async function getAuthorizedClient() {
  const conexion = await getConexion()
  if (!conexion) return null

  const client = getOAuthClient()
  client.setCredentials({
    access_token: conexion.access_token,
    refresh_token: conexion.refresh_token,
    expiry_date: conexion.expiry_date,
  })

  client.on('tokens', (tokens) => {
    if (!tokens.access_token) return
    pool.query(
      'UPDATE gmail_conexion SET access_token = ?, expiry_date = ? WHERE id = ?',
      [tokens.access_token, tokens.expiry_date ?? conexion.expiry_date, conexion.id]
    ).catch(() => {})
  })

  return client
}

function getHeader(headers: { name?: string | null; value?: string | null }[] | undefined, name: string) {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function listUnreadMessages(client: any, maxResults = 10) {
  const gmail = google.gmail({ version: 'v1', auth: client })
  const { data } = await gmail.users.messages.list({ userId: 'me', q: 'in:inbox is:unread', maxResults })
  return data.messages ?? []
}

export async function getMessage(client: any, id: string) {
  const gmail = google.gmail({ version: 'v1', auth: client })
  const { data } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
  return data
}

export function parseMessage(msg: any) {
  const headers = msg.payload?.headers
  const from = getHeader(headers, 'From')
  const subject = getHeader(headers, 'Subject')
  const snippet = msg.snippet || ''

  const emailMatch = from.match(/<([^>]+)>/)
  const clienteEmail = emailMatch ? emailMatch[1] : from.trim()
  const clienteNombre = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || clienteEmail

  return {
    gmailMessageId: msg.id as string,
    gmailThreadId: msg.threadId as string,
    messageIdHeader: getHeader(headers, 'Message-ID'),
    remitente: from,
    clienteEmail,
    clienteNombre,
    asunto: subject,
    resumen: snippet,
    recibidoAt: new Date(Number(msg.internalDate || Date.now())).toISOString(),
  }
}

export async function markAsRead(client: any, id: string) {
  const gmail = google.gmail({ version: 'v1', auth: client })
  await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['UNREAD'] } })
}

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sendReply(client: any, opts: {
  threadId: string
  messageIdHeader?: string
  to: string
  subject: string
  body: string
  attachment?: { filename: string; content: Buffer; mimeType: string }
}) {
  const gmail = google.gmail({ version: 'v1', auth: client })
  const boundary = `boundary_${Date.now()}`
  const replySubject = opts.subject?.toLowerCase().startsWith('re:') ? opts.subject : `Re: ${opts.subject || ''}`

  let raw = `To: ${opts.to}\r\nSubject: ${replySubject}\r\n`
  if (opts.messageIdHeader) {
    raw += `In-Reply-To: ${opts.messageIdHeader}\r\nReferences: ${opts.messageIdHeader}\r\n`
  }
  raw += `MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`
  raw += `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${opts.body}\r\n`
  if (opts.attachment) {
    raw += `--${boundary}\r\nContent-Type: ${opts.attachment.mimeType}; name="${opts.attachment.filename}"\r\n`
    raw += `Content-Disposition: attachment; filename="${opts.attachment.filename}"\r\n`
    raw += `Content-Transfer-Encoding: base64\r\n\r\n${opts.attachment.content.toString('base64')}\r\n`
  }
  raw += `--${boundary}--`

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: base64url(Buffer.from(raw)), threadId: opts.threadId },
  })
}
