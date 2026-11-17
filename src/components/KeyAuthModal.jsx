import { useState, useRef, useEffect } from 'react'
import { Lock, ShieldCheck, User, Key, UserPlus } from 'lucide-react'
import axios from 'axios'

export default function KeyAuthModal({ onAuthenticated, onOpenRegister }) {
  // Extract slug from URL if present (e.g. /u/surya, ?u=surya, #u=surya)
  const getInitialSlug = () => {
    const pathMatch = window.location.pathname.match(/\/u\/([a-zA-Z0-9_-]+)/)
    if (pathMatch) return pathMatch[1]

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('u')) return urlParams.get('u')

    const hashMatch = window.location.hash.match(/[#&]u=([a-zA-Z0-9_-]+)/)
    if (hashMatch) return hashMatch[1]

    return localStorage.getItem('forlab_last_slug') || ''
  }

  const [slug, setSlug] = useState(getInitialSlug)
  const [pin, setPin] = useState('')
  const [mode, setMode] = useState('pin') // 'pin' | 'master'
  const [masterKey, setMasterKey] = useState('')

  const [error, setError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const isLockedToSlug = Boolean(
    window.location.pathname.match(/\/u\/([a-zA-Z0-9_-]+)/) ||
    new URLSearchParams(window.location.search).get('u')
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode, isLockedToSlug])

  const handleUserAuth = async (e) => {
    e.preventDefault()
    if (!slug.trim() || !pin.trim() || loading) return

    setLoading(true)
    setError(false)
    setErrorMsg('')

    try {
      const res = await axios.post('/api/auth-user', {
        slug: slug.trim().toLowerCase(),
        pin: pin.trim(),
      })

      if (res.data.valid) {
        localStorage.setItem('forlab_last_slug', slug.trim().toLowerCase())
        onAuthenticated({
          token: res.data.token,
          slug: res.data.slug,
          name: res.data.name,
        })
      } else {
        triggerError('Invalid username or PIN')
      }
    } catch (err) {
      triggerError(err.response?.data?.error || 'Invalid username or PIN')
    } finally {
      setLoading(false)
    }
  }

  const handleMasterAuth = async (e) => {
    e.preventDefault()
    if (!masterKey.trim() || loading) return

    setLoading(true)
    setError(false)
    setErrorMsg('')

    try {
      const res = await axios.post('/api/verify-key', { key: masterKey.trim() })
      if (res.data.valid) {
        onAuthenticated({
          masterKey: masterKey.trim(),
          slug: 'master',
          name: 'Master Admin',
          isMaster: true,
        })
      } else {
        triggerError('Invalid master key')
      }
    } catch {
      triggerError('Invalid master key')
    } finally {
      setLoading(false)
    }
  }

  const triggerError = (msg) => {
    setError(true)
    setErrorMsg(msg)
    setPin('')
    setMasterKey('')
    setTimeout(() => inputRef.current?.focus(), 100)
    setTimeout(() => setError(false), 2000)
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card glass-panel-static">
        <div className="auth-icon">
          <Lock size={28} />
        </div>
        <h1 className="auth-title">ForLab</h1>

        {isLockedToSlug ? (
          <p className="auth-subtitle">
            Welcome back, <strong style={{ color: 'var(--accent)' }}>{slug}</strong>
          </p>
        ) : (
          <div style={{
            display: 'flex',
            gap: '6px',
            background: 'var(--bg-input)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            margin: '12px 0 16px',
            border: '1px solid var(--border)'
          }}>
            <button
              type="button"
              className={`tab-btn ${mode === 'pin' ? 'active' : ''}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
              onClick={() => { setMode('pin'); setErrorMsg('') }}
            >
              <User size={13} />
              User PIN
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === 'master' ? 'active' : ''}`}
              style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
              onClick={() => { setMode('master'); setErrorMsg('') }}
            >
              <Key size={13} />
              Master Key
            </button>
          </div>
        )}

        {/* Form: User Drop PIN */}
        {mode === 'pin' && (
          <form onSubmit={handleUserAuth}>
            {!isLockedToSlug && (
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Username (e.g. surya)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  autoComplete="username"
                  required
                />
              </div>
            )}
            <input
              ref={inputRef}
              type="password"
              className={`auth-input ${error ? 'error' : ''}`}
              placeholder="Drop PIN (••••)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              autoComplete="current-password"
              required
            />
            <p className={`auth-error-text ${errorMsg ? 'visible' : ''}`}>
              {errorMsg || '\u00A0'}
            </p>
            <button
              type="submit"
              className="btn-primary"
              disabled={!slug.trim() || !pin.trim() || loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Unlock Drop Box
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: Master Key */}
        {mode === 'master' && (
          <form onSubmit={handleMasterAuth}>
            <input
              ref={inputRef}
              type="password"
              className={`auth-input ${error ? 'error' : ''}`}
              placeholder="Master Passcode"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              autoFocus
              autoComplete="off"
              required
            />
            <p className={`auth-error-text ${errorMsg ? 'visible' : ''}`}>
              {errorMsg || '\u00A0'}
            </p>
            <button
              type="submit"
              className="btn-primary"
              disabled={!masterKey.trim() || loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Unlock
                </>
              )}
            </button>
          </form>
        )}

        {/* Bottom CTAs */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onOpenRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <UserPlus size={14} />
            Connect your own Google Drive
          </button>
        </div>
      </div>
    </div>
  )
}
