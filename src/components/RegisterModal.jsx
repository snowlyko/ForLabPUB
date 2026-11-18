import { useState, useEffect } from 'react'
import { X, Copy, Check, AlertCircle } from 'lucide-react'
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
      setErrorMsg('Please enter a username, PIN, and Google Drive folder link.')
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
        className="modal-card"
        style={{ maxWidth: '480px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="modal-close-btn" title="Close">
          <X size={14} />
        </button>

        <div style={{ marginBottom: '18px' }}>
          <h2 className="modal-title">// CONNECT_GOOGLE_DRIVE</h2>
          <p className="modal-subtitle">Configure private drop gateway in two steps</p>
        </div>

        {/* Step 1 */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          padding: '12px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: 'var(--amber)',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px'
            }}>STEP_01</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
              Share folder as "Editor" with sync bot:
            </span>
          </div>

          <div className="modal-link-box" style={{ marginTop: '6px' }}>
            <span className="modal-link-text">
              {serviceAccountEmail || 'QUERYING_SERVICE_ACCOUNT...'}
            </span>
            <button
              type="button"
              onClick={copyEmail}
              disabled={!serviceAccountEmail}
              className={`modal-copy-btn ${copied ? 'copied' : ''}`}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <form onSubmit={handleRegister}>
          <div className="field-group">
            <label className="field-label">Portal Slug (URL /u/slug)</label>
            <input
              type="text"
              className="auth-input"
              placeholder="e.g. surya or lab-alex"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              autoComplete="off"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="field-group">
              <label className="field-label">Display Name (Optional)</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Drop PIN (4-6 digits)</label>
              <input
                type="password"
                className="auth-input"
                placeholder="••••"
                maxLength={10}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Google Drive Folder Link or ID</label>
            <input
              type="text"
              className="auth-input"
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
              gap: '6px',
              background: 'var(--red-muted)',
              border: '1px solid var(--red)',
              color: 'var(--red)',
              padding: '8px 10px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              marginBottom: '14px',
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
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
              <span>Verify & Connect Google Drive</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
