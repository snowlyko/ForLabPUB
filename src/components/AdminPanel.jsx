import { useState, useEffect, useCallback } from 'react'
import {
  Users, Key, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Shield, HardDrive, Check
} from 'lucide-react'
import axios from 'axios'

export default function AdminPanel({ masterKey }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncEmail, setSyncEmail] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const [pinTargetUser, setPinTargetUser] = useState(null)
  const [newPin, setNewPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinSuccessMsg, setPinSuccessMsg] = useState('')

  const [deleteTargetUser, setDeleteTargetUser] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [folderStatuses, setFolderStatuses] = useState({})

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const res = await axios.post('/api/admin-manage', { action: 'list' }, {
        headers: { 'x-master-key': masterKey },
      })
      setUsers(res.data.users || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load user list')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [masterKey])

  useEffect(() => {
    fetchUsers(false)
    axios.get('/api/get-system-info')
      .then(res => setSyncEmail(res.data.serviceAccountEmail || ''))
      .catch(() => {})
  }, [fetchUsers])

  const handleTestFolder = async (user) => {
    setFolderStatuses(prev => ({
      ...prev,
      [user.slug]: { loading: true }
    }))

    try {
      const res = await axios.post('/api/admin-manage', {
        action: 'test-folder',
        folderId: user.drive_folder_id,
      }, {
        headers: { 'x-master-key': masterKey },
      })

      if (res.data.valid) {
        setFolderStatuses(prev => ({
          ...prev,
          [user.slug]: { loading: false, ok: true, folderName: res.data.folderName }
        }))
      } else {
        setFolderStatuses(prev => ({
          ...prev,
          [user.slug]: { loading: false, ok: false, error: res.data.error || 'Access denied' }
        }))
      }
    } catch (err) {
      setFolderStatuses(prev => ({
        ...prev,
        [user.slug]: { loading: false, ok: false, error: err.message }
      }))
    }
  }

  const handleResetPinSubmit = async (e) => {
    e.preventDefault()
    if (!pinTargetUser || !newPin.trim() || newPin.trim().length < 4) return

    setPinLoading(true)
    setPinSuccessMsg('')

    try {
      await axios.post('/api/admin-manage', {
        action: 'reset-pin',
        slug: pinTargetUser.slug,
        newPin: newPin.trim(),
      }, {
        headers: { 'x-master-key': masterKey },
      })

      setPinSuccessMsg(`PIN for @${pinTargetUser.slug} updated successfully!`)
      setTimeout(() => {
        setPinTargetUser(null)
        setNewPin('')
        setPinSuccessMsg('')
      }, 1500)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset PIN')
    } finally {
      setPinLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return
    setDeleteLoading(true)

    try {
      await axios.post('/api/admin-manage', {
        action: 'delete-user',
        slug: deleteTargetUser.slug,
      }, {
        headers: { 'x-master-key': masterKey },
      })

      setUsers(prev => prev.filter(u => u.slug !== deleteTargetUser.slug))
      setDeleteTargetUser(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Metrics Row */}
      <div className="admin-metrics-grid">
        <div className="admin-stat-card admin-stat-card-1">
          <div className="stat-card-header" style={{ color: 'var(--emerald)' }}>
            <Users size={14} style={{ color: 'var(--emerald)' }} />
            <span>// REGISTERED_USERS</span>
          </div>
          <div className="stat-val-large">
            {users.length}
          </div>
          <div className="stat-sub-text">Active User Gateways</div>
        </div>

        <div className="admin-stat-card admin-stat-card-2">
          <div className="stat-card-header" style={{ color: 'var(--cyan)' }}>
            <Shield size={14} style={{ color: 'var(--cyan)' }} />
            <span>// SYNC_BOT_ACCOUNT</span>
          </div>
          <div className="stat-val-mono" title={syncEmail}>
            {syncEmail || 'ONLINE'}
          </div>
          <div className="stat-sub-text">Google Service Account</div>
        </div>

        <div className="admin-stat-card admin-stat-card-3">
          <div className="stat-card-header" style={{ color: 'var(--purple)' }}>
            <HardDrive size={14} style={{ color: 'var(--purple)' }} />
            <span>// METADATA_DATABASE</span>
          </div>
          <div className="stat-val-mono">
            SQLite (forlab.db)
          </div>
          <div className="stat-sub-text">Local Storage Engine</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          // USER_GATEWAY_PORTALS ({users.length})
        </h3>
        <button
          className="btn-secondary"
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
        >
          <RefreshCw size={12} className={refreshing ? 'drive-spin' : ''} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Users List */}
      {loading ? (
        <div style={{ padding: '36px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          // QUERYING_USER_REGISTRY...
        </div>
      ) : error ? (
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px', marginBottom: '8px' }}>{error}</p>
          <button className="btn-secondary" onClick={() => fetchUsers(false)}>Retry</button>
        </div>
      ) : users.length === 0 ? (
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '36px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
          [ NO REGISTERED USER PORTALS ]
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {users.map(u => {
            const status = folderStatuses[u.slug]
            const folderDriveUrl = `https://drive.google.com/drive/folders/${u.drive_folder_id}`

            return (
              <div key={u.slug} className="admin-user-card">
                <div style={{ minWidth: '200px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--amber)' }}>
                      @{u.slug}
                    </span>
                    {u.name && u.name !== u.slug && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ({u.name})
                      </span>
                    )}
                    <a
                      href={`/u/${u.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open user portal"
                      style={{ color: 'var(--cyan)', fontSize: '11px', fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                    >
                      <span>/u/{u.slug}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                    <span>FOLDER:</span>
                    <a
                      href={folderDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                    >
                      {u.drive_folder_id.substring(0, 14)}...
                    </a>
                    <span>&bull;</span>
                    <span>REGISTERED: {new Date(u.created_at).toLocaleDateString()}</span>
                  </div>

                  {status && (
                    <div style={{ marginTop: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      {status.loading ? (
                        <span style={{ color: 'var(--text-secondary)' }}>// TESTING_WRITE_ACCESS...</span>
                      ) : status.ok ? (
                        <span style={{ color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> VERIFIED: {status.folderName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} /> ACCESS_ERROR: {status.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => handleTestFolder(u)}
                    disabled={status?.loading}
                  >
                    <RefreshCw size={11} className={status?.loading ? 'drive-spin' : ''} />
                    <span>Test</span>
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => { setPinTargetUser(u); setNewPin(''); setPinSuccessMsg('') }}
                  >
                    <Key size={11} />
                    <span>Reset PIN</span>
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => setDeleteTargetUser(u)}
                    title="Delete user"
                    style={{ color: 'var(--red)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reset PIN Modal */}
      {pinTargetUser && (
        <div className="modal-overlay" onClick={() => !pinLoading && setPinTargetUser(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="modal-title" style={{ marginBottom: '8px' }}>// RESET_PORTAL_PIN</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Assign new PIN for <strong style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>@{pinTargetUser.slug}</strong>
            </p>

            {pinSuccessMsg ? (
              <div style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} />
                <span>{pinSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleResetPinSubmit}>
                <div className="field-group">
                  <label className="field-label">New PIN (4-6 Digits)</label>
                  <input
                    type="password"
                    className="auth-input"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setPinTargetUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={pinLoading || newPin.trim().length < 4}>
                    {pinLoading ? <div className="spinner" /> : 'Save PIN'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteTargetUser && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setDeleteTargetUser(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="modal-title" style={{ color: 'var(--red)', marginBottom: '8px' }}>// REMOVE_PORTAL_USER</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Are you sure you want to delete user <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>@{deleteTargetUser.slug}</strong> from ForLab? Their Google Drive folder will not be touched.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteTargetUser(null)} disabled={deleteLoading}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)', color: '#ffffff' }}
                onClick={handleDeleteUser}
                disabled={deleteLoading}
              >
                {deleteLoading ? <div className="spinner" /> : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
