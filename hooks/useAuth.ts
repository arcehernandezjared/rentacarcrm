'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface UserProfile {
  userId: number
  name: string
  email: string
}

export function useAuth() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      setProfile(res.ok ? await res.json() : null)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Error al iniciar sesión')
    }
    const data = await res.json()
    setProfile(data)
    return data
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setProfile(null)
    router.replace('/login')
  }

  return { profile, loading, login, logout }
}
