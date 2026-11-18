import { useState, useEffect } from 'react'
import { FolderUp, Code, HardDriveDownload, LogOut, Shield, Terminal, Sun, Moon } from 'lucide-react'
import KeyAuthModal from './components/KeyAuthModal'
import RegisterModal from './components/RegisterModal'
import FileDropzone from './components/FileDropzone'
import SnippetEditor from './components/SnippetEditor'
import DriveFiles from './components/DriveFiles'
import AdminPanel from './components/AdminPanel'
import UploadSuccessModal from './components/UploadSuccessModal'
import './index.css'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('forlab_theme') || 'light')
  const [auth, setAuth] = useState(null) // { token, slug, name, masterKey }
  const [activeTab, setActiveTab] = useState('files')
  const [uploadResults, setUploadResults] = useState(null)
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('forlab_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

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

  // Full-Screen Lock / Auth Screen
  if (!auth) {
    return (
      <>
        <KeyAuthModal
          onAuthenticated={handleAuthenticated}
          onOpenRegister={() => setShowRegister(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
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
      {/* Full-Bleed Top Navigation Bar */}
      <header className="top-nav-bar">
        <div className="top-brand">
          <span className="brand-badge">FORLAB</span>
          <span className="brand-title">Drive Gateway</span>
          <div className="brand-status">
            <span className="status-dot-active" />
            <span>{isMaster ? 'ADMIN: MASTER' : `USER: @${auth.slug}`}</span>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FolderUp size={14} />
            <span>01 // Drop Files</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'snippet' ? 'active' : ''}`}
            onClick={() => setActiveTab('snippet')}
          >
            <Code size={14} />
            <span>02 // Snippet</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'drive' ? 'active' : ''}`}
            onClick={() => setActiveTab('drive')}
          >
            <HardDriveDownload size={14} />
            <span>03 // Explorer</span>
          </button>
          {isMaster && (
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Shield size={14} />
              <span>04 // Admin</span>
            </button>
          )}
        </nav>

        {/* Right Controls */}
        <div className="top-controls">
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="theme-toggle-btn"
          >
            {theme === 'dark' ? <Sun size={12} style={{ color: 'var(--amber)' }} /> : <Moon size={12} style={{ color: 'var(--primary)' }} />}
            <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
          </button>
          <div className="user-badge">
            <Terminal size={12} style={{ color: 'var(--amber)' }} />
            <span>{auth.name || `@${auth.slug}`}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Lock Session"
            className="logout-btn"
          >
            <LogOut size={12} />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Full-Screen Workspace */}
      <main className="dashboard">
        <div className={`workbench-card tab-theme-${activeTab}`}>
          <div className="workbench-header">
            <div className="workbench-title-wrap">
              <span className={`tab-indicator-badge tab-badge-${activeTab}`}>
                {activeTab.toUpperCase()}
              </span>
              <span className="workbench-title">
                {activeTab === 'files' && 'Direct Resumable File Stream & Queue'}
                {activeTab === 'snippet' && 'Text & Code Snippet Console'}
                {activeTab === 'drive' && 'Connected Google Drive File Browser'}
                {activeTab === 'admin' && 'System Admin & User Portals Console'}
              </span>
            </div>
            <div className="workbench-mode-pill">
              <span className="mode-dot" />
              <span>MODE: {isMaster ? 'MASTER_FULL_ACCESS' : `USER_SLUG_${auth.slug.toUpperCase()}`}</span>
            </div>
          </div>

          <div className="workbench-body">
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
      </main>

      {/* Upload Success Modal */}
      {uploadResults && (
        <UploadSuccessModal
          results={uploadResults}
          onClose={() => setUploadResults(null)}
        />
      )}
    </div>
  )
}
