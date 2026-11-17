import { useState, useEffect, useCallback } from 'react'
import {
  Users, Key, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  ExternalLink, Shield, HardDrive, Check, X
} from 'lucide-react'
import axios from 'axios'

export default function AdminPanel({ masterKey }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncEmail, setSyncEmail] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Reset PIN modal state
  const [pinTargetUser, setPinTargetUser] = useState(null)
  const [newPin, setNewPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinSuccessMsg, setPinSuccessMsg] = useState('')

  // Delete modal state
  const [deleteTargetUser, setDeleteTargetUser] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Test folder status per user { [slug]: { loading, ok, folderName, error } }
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

      setPinSuccessMsg(`PIN for @${pinTargetUser.slug} updated!`)
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
    <div className="fade-enter">
      {/* Top Banner / Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
            <Users size={14} />
            <span>Registered Users</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {users.length}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
            <Shield size={14} />
            <span>Sync Account</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {syncEmail || 'Google Drive Connected'}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
            <HardDrive size={14} />
            <span>Storage Database</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
            SQLite (forlab.db)
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} />
          User Management
        </h3>
        <button
          className="drive-refresh-btn"
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
          title="Refresh User List"
        >
          <RefreshCw size={14} className={refreshing ? 'drive-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="drive-loading">
          {[1, 2].map(i => <div key={i} className="drive-skeleton" />)}
        </div>
      ) : error ? (
        <div className="drive-empty">
          <AlertCircle size={24} color="var(--error)" />
          <p className="drive-empty-title">{error}</p>
          <button className="btn-secondary mt-12" onClick={() => fetchUsers(false)}>
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="drive-empty">
          <Users size={32} strokeWidth={1.2} />
          <p className="drive-empty-title">No users registered yet</p>
          <p className="drive-empty-sub">Users will show up here when they connect their Google Drive.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {users.map(u => {
            const status = folderStatuses[u.slug]
            const folderDriveUrl = `https://drive.google.com/drive/folders/${u.drive_folder_id}`

            return (
              <div
                key={u.slug}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                      @{u.slug}
                    </span>
                    {u.name && u.name !== u.slug && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        ({u.name})
                      </span>
                    )}
                    <a
                      href={`/u/${u.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open user drop portal"
                      style={{ color: 'var(--accent)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                    >
                      /u/{u.slug}
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>Folder ID:</span>
                    <a
                      href={folderDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', fontFamily: 'monospace', textDecoration: 'none' }}
                      title="Open in Google Drive"
                    >
                      {u.drive_folder_id.substring(0, 14)}...
                    </a>
                    <span>&middot;</span>
                    <span>Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                  </div>

                  {status && (
                    <div style={{ marginTop: '6px', fontSize: '11px' }}>
                      {status.loading ? (
                        <span style={{ color: 'var(--text-secondary)' }}>Testing write access...</span>
                      ) : status.ok ? (
                        <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Connected: {status.folderName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} /> {status.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => handleTestFolder(u)}
                    disabled={status?.loading}
                    title="Test if sync bot can write to this folder"
                  >
                    <RefreshCw size={12} className={status?.loading ? 'drive-spin' : ''} />
                    Test Access
                  </button>

                  <button
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => { setPinTargetUser(u); setNewPin(''); setPinSuccessMsg('') }}
                    title="Reset forgotten PIN"
                  >
                    <Key size={12} />
                    Reset PIN
                  </button>

                  <button
                    className="drive-action-btn drive-delete-btn"
                    onClick={() => setDeleteTargetUser(u)}
                    title="Delete user from database"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <Trash2 size={14} />
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
          <div className="modal-card glass-panel-static" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <button className="modal-close-btn" onClick={() => setPinTargetUser(null)}>
              <X size={14} />
            </button>
            <div className="auth-icon" style={{ margin: '0 auto 12px' }}>
              <Key size={22} />
            </div>
            <h3 className="modal-title" style={{ fontSize: '18px' }}>Reset PIN</h3>
            <p className="modal-subtitle">
              Set a new Drop PIN for <strong style={{ color: 'var(--accent)' }}>@{pinTargetUser.slug}</strong>
            </p>

            {pinSuccessMsg ? (
              <div style={{ color: 'var(--success)', textAlign: 'center', padding: '16px 0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Check size={18} />
                {pinSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleResetPinSubmit} style={{ marginTop: '14px' }}>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="New 4-6 digit PIN"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="btn-primary mt-12"
                  disabled={pinLoading || newPin.trim().length < 4}
                >
                  {pinLoading ? <div className="spinner" /> : 'Save New PIN'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteTargetUser && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setDeleteTargetUser(null)}>
          <div className="delete-confirm glass-panel-static" onClick={e => e.stopPropagation()}>
            <Trash2 size={24} style={{ color: 'var(--error)', marginBottom: '14px' }} />
            <h3 className="delete-confirm-title">Remove User</h3>
            <p className="delete-confirm-text">
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>@{deleteTargetUser.slug}</strong> from ForLab?
              Their Google Drive folder and files will NOT be deleted.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-secondary"
                onClick={() => setDeleteTargetUser(null)}
                disabled={deleteLoading}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="drive-confirm-delete-btn"
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
