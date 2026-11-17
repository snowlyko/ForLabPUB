import { useState } from 'react'
import { FolderUp, Code, HardDriveDownload, LogOut, User, Shield } from 'lucide-react'
import KeyAuthModal from './components/KeyAuthModal'
import RegisterModal from './components/RegisterModal'
import FileDropzone from './components/FileDropzone'
import SnippetEditor from './components/SnippetEditor'
import DriveFiles from './components/DriveFiles'
import AdminPanel from './components/AdminPanel'
import UploadSuccessModal from './components/UploadSuccessModal'
import './index.css'

export default function App() {
  const [auth, setAuth] = useState(null) // { token, slug, name, masterKey }
  const [activeTab, setActiveTab] = useState('files')
  const [uploadResults, setUploadResults] = useState(null)
  const [showRegister, setShowRegister] = useState(false)

  const handleAuthenticated = (authData) => {
    setAuth(authData)
  }

  const handleRegistered = (authData) => {
    setShowRegister(false)
    setAuth(authData)
  }

  const handleUploadSuccess = (results) => {
    setUploadResults(results)
  }

  const handleLogout = () => {
    setAuth(null)
    setActiveTab('files')
  }

  // Lock screen
  if (!auth) {
    return (
      <>
        <KeyAuthModal
          onAuthenticated={handleAuthenticated}
          onOpenRegister={() => setShowRegister(true)}
        />
        {showRegister && (
          <RegisterModal
            onClose={() => setShowRegister(false)}
            onRegistered={handleRegistered}
          />
        )}
      </>
    )
  }

  const isMaster = Boolean(auth.isMaster || auth.masterKey)

  return (
    <div className="app-container">
      {/* Dashboard */}
      <div className="dashboard">
        {/* Header */}
        <div className="glass-panel-static header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="header-logo">ForLab</h1>
              {auth.slug && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'var(--accent-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '12px',
                }}>
                  <User size={12} />
                  <span>{auth.name || auth.slug}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              title="Lock / Log Out"
              className="logout-btn"
            >
              <LogOut size={15} />
            </button>
          </div>
          <p className="header-tagline" style={{ marginTop: '8px' }}>
            {isMaster
              ? 'Admin Mode — Uploading to master Google Drive folder'
              : `Connected to Google Drive for @${auth.slug}`
            }
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FolderUp size={16} />
            Files
          </button>
          <button
            className={`tab-btn ${activeTab === 'snippet' ? 'active' : ''}`}
            onClick={() => setActiveTab('snippet')}
          >
            <Code size={16} />
            Code Snippet
          </button>
          <button
            className={`tab-btn ${activeTab === 'drive' ? 'active' : ''}`}
            onClick={() => setActiveTab('drive')}
          >
            <HardDriveDownload size={16} />
            Drive Files
          </button>
          {isMaster && (
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={16} />
              Admin Console
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="glass-panel-static" style={{ padding: '24px', minHeight: '280px' }}>
          {activeTab === 'files' && (
            <FileDropzone
              auth={auth}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
          {activeTab === 'snippet' && (
            <SnippetEditor
              auth={auth}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
          {activeTab === 'drive' && (
            <DriveFiles auth={auth} />
          )}
          {activeTab === 'admin' && isMaster && (
            <AdminPanel masterKey={auth.masterKey} />
          )}
        </div>
      </div>

      {/* Success Modal */}
      {uploadResults && (
        <UploadSuccessModal
          results={uploadResults}
          onClose={() => setUploadResults(null)}
        />
      )}
    </div>
  )
}
