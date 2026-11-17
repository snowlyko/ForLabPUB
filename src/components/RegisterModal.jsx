import { useState, useEffect } from 'react'
import { X, Copy, Check, AlertCircle, HardDrive, Sparkles } from 'lucide-react'
import axios from 'axios'

export default function RegisterModal({ onClose, onRegistered }) {
  const [serviceAccountEmail, setServiceAccountEmail] = useState('')
  const [copied, setCopied] = useState(false)

  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [folderUrl, setFolderUrl] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Fetch the sync bot email
    axios.get('/api/get-system-info')
      .then(res => {
        if (res.data.serviceAccountEmail) {
          setServiceAccountEmail(res.data.serviceAccountEmail)
        }
      })
      .catch(() => {})
  }, [])

  const copyEmail = () => {
    if (!serviceAccountEmail) return
    navigator.clipboard.writeText(serviceAccountEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!slug.trim() || !pin.trim() || !folderUrl.trim()) {
      setErrorMsg('Please fill in username, PIN, and folder link.')
      return
    }

    setLoading(true)

    try {
      const res = await axios.post('/api/register-user', {
        slug: slug.trim().toLowerCase(),
        name: name.trim() || slug.trim(),
        pin: pin.trim(),
        folderUrl: folderUrl.trim(),
      })

      if (res.data.success) {
        onRegistered({
          token: res.data.token,
          slug: res.data.slug,
          name: res.data.name,
        })
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card glass-panel-static"
        style={{ maxWidth: '480px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="modal-close-btn" title="Close">
          <X size={16} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className="auth-icon" style={{ margin: '0 auto 12px' }}>
            <Sparkles size={24} />
          </div>
          <h2 className="modal-title">Connect Your Google Drive</h2>
          <p className="modal-subtitle">Set up a private drop box in under 1 minute</p>
        </div>

        {/* Step 1: Share folder */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>1</span>
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              Share a Drive Folder as "Editor"
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
            Create an empty folder in your Google Drive and share it with this sync address:
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <code style={{
              fontSize: '11px',
              color: 'var(--accent)',
              wordBreak: 'break-all',
              flex: 1,
              fontFamily: 'monospace'
            }}>
              {serviceAccountEmail || 'Loading sync address...'}
            </code>
            <button
              type="button"
              onClick={copyEmail}
              disabled={!serviceAccountEmail}
              className={`modal-copy-btn ${copied ? 'copied' : ''}`}
              style={{ flexShrink: 0 }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Step 2: Form */}
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Your Username / Slug
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="auth-input"
                style={{ textAlign: 'left', paddingLeft: '14px', fontSize: '14px' }}
                placeholder="e.g. surya or lab-alex"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                autoComplete="off"
                required
              />
            </div>
            {slug && (
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                Your quick link: <code>/u/{slug}</code>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Display Name (optional)
              </label>
              <input
                type="text"
                className="auth-input"
                style={{ textAlign: 'left', paddingLeft: '14px', fontSize: '14px' }}
                placeholder="Surya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Drop PIN (4-6 digits)
              </label>
              <input
                type="password"
                className="auth-input"
                style={{ textAlign: 'center', fontSize: '14px' }}
                placeholder="••••"
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Google Drive Folder Link
            </label>
            <input
              type="text"
              className="auth-input"
              style={{ textAlign: 'left', paddingLeft: '14px', fontSize: '13px' }}
              placeholder="Paste Google Drive folder URL or ID"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--error-muted)',
              color: 'var(--error)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              marginBottom: '16px',
              lineHeight: 1.4
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !slug.trim() || !pin.trim() || !folderUrl.trim()}
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <>
                <HardDrive size={18} />
                Verify & Connect Folder
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
