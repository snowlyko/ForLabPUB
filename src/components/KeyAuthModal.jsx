import { useState, useRef, useEffect } from 'react'
import { ShieldCheck, User, Key, ArrowRight, Lock, Sun, Moon } from 'lucide-react'
import axios from 'axios'

export default function KeyAuthModal({ onAuthenticated, onOpenRegister, theme, onToggleTheme }) {
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
        triggerError(res.data?.error || 'Invalid master key')
      }
    } catch (err) {
      triggerError(err.response?.data?.error || 'Invalid master key')
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
    <div className="auth-full-screen">
      {/* Left Pane: Technical Hero (Full-Screen Split) */}
      <div className="auth-hero-pane">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-badge">FORLAB v2</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--emerald)', letterSpacing: '0.05em' }}>
                [GATEWAY_ONLINE]
              </span>
            </div>
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="theme-toggle-btn"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? <Sun size={12} style={{ color: 'var(--amber)' }} /> : <Moon size={12} style={{ color: 'var(--primary)' }} />}
                <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
              </button>
            )}
          </div>

          <div className="auth-hero-brand">
            <h1 className="auth-hero-logo">Public Lab File & Drive Bridge.</h1>
            <p className="auth-hero-desc">
              Zero-login direct streaming from shared lab PCs directly into your personal Google Drive storage. High-throughput resumable chunks with PIN access control.
            </p>
          </div>

          {/* Technical Specs 2x2 Grid with vibrant accents */}
          <div className="auth-spec-grid">
            <div className="spec-box spec-box-1">
              <div className="spec-key">// UPLOAD STREAM</div>
              <div className="spec-val">Resumable Cloud Stream</div>
              <div className="spec-desc">High-speed chunked direct upload</div>
            </div>
            <div className="spec-box spec-box-2">
              <div className="spec-key">// AUTHENTICATION</div>
              <div className="spec-val">Isolated PIN Credentials</div>
              <div className="spec-desc">Zero lab PC credentials stored</div>
            </div>
            <div className="spec-box spec-box-3">
              <div className="spec-key">// STORAGE BACKEND</div>
              <div className="spec-val">Google Drive API v3</div>
              <div className="spec-desc">Direct sync to your Drive folder</div>
            </div>
            <div className="spec-box spec-box-4">
              <div className="spec-key">// SNIPPET VAULT</div>
              <div className="spec-val">Code & Text Sharing</div>
              <div className="spec-desc">Syntax highlight & instant save</div>
            </div>
          </div>
        </div>

        <div className="auth-hero-footer">
          <span>FORLAB WORKBENCH &bull; SHARP INDUSTRIAL UI</span>
          <span>PORT: 3001 &bull; PROTOCOL: HTTP/2</span>
        </div>
      </div>

      {/* Right Pane: Auth Terminal Console */}
      <div className="auth-console-pane">
        <div className="auth-console-box">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={15} style={{ color: 'var(--primary)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                ACCESS_CONSOLE
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--emerald)', fontWeight: 700 }}>
              [READY]
            </span>
          </div>

          <div className="auth-header-block">
            <p className="auth-console-sub">
              {isLockedToSlug
                ? `Portal locked to @${slug}. Enter PIN to proceed.`
                : 'Enter your credentials to unlock your Google Drive workspace.'
              }
            </p>
          </div>

          {!isLockedToSlug && (
            <div className="auth-mode-switch">
              <button
                type="button"
                className={`auth-mode-btn ${mode === 'pin' ? 'active' : ''}`}
                onClick={() => { setMode('pin'); setErrorMsg('') }}
              >
                <User size={13} />
                <span>User PIN</span>
              </button>
              <button
                type="button"
                className={`auth-mode-btn ${mode === 'master' ? 'active' : ''}`}
                onClick={() => { setMode('master'); setErrorMsg('') }}
              >
                <Key size={13} />
                <span>Master Passcode</span>
              </button>
            </div>
          )}

          {/* Form: User Drop PIN */}
          {mode === 'pin' && (
            <form onSubmit={handleUserAuth}>
              {!isLockedToSlug && (
                <div className="field-group">
                  <label className="field-label">Username / Portal Slug</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="e.g. surya or lab-alex"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    autoComplete="username"
                    required
                  />
                </div>
              )}

              <div className="field-group">
                <label className="field-label">Access PIN (4-6 digits)</label>
                <input
                  ref={inputRef}
                  type="password"
                  className={`auth-input ${error ? 'error' : ''}`}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className={`auth-error-text ${errorMsg ? 'visible' : ''}`}>
                {errorMsg || '\u00A0'}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!slug.trim() || !pin.trim() || loading}
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Unlock Workspace</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form: Master Key */}
          {mode === 'master' && (
            <form onSubmit={handleMasterAuth}>
              <div className="field-group">
                <label className="field-label">System Master Passcode</label>
                <input
                  ref={inputRef}
                  type="password"
                  className={`auth-input ${error ? 'error' : ''}`}
                  placeholder="Enter master key"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  required
                />
              </div>

              <div className={`auth-error-text ${errorMsg ? 'visible' : ''}`}>
                {errorMsg || '\u00A0'}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!masterKey.trim() || loading}
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Unlock Master Console</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Connect New Folder Link */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={onOpenRegister}
              style={{
                width: '100%',
                background: 'var(--primary-muted)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                color: 'var(--primary)',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)'
                e.currentTarget.style.borderColor = 'var(--primary)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--primary-muted)'
                e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.2)'
              }}
            >
              <span>+ Connect New Google Drive Folder</span>
              <ArrowRight size={13} style={{ color: 'var(--primary)' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
