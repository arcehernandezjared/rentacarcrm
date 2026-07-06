const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const { loadEnv } = require('./load-env')

loadEnv()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD en .env.local antes de correr este script.')
    process.exit(1)
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'rentacar_crm',
  })

  try {
    const hash = await bcrypt.hash(password, 10)
    const [existing] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [email])

    if (existing.length > 0) {
      await conn.query('UPDATE usuarios SET password_hash = ? WHERE email = ?', [hash, email])
      console.log(`Usuario actualizado: ${email}`)
    } else {
      await conn.query(
        `INSERT INTO usuarios (name, email, password_hash) VALUES ('Administrador', ?, ?)`,
        [email, hash]
      )
      console.log(`Usuario creado: ${email}`)
    }
  } finally {
    await conn.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
