import { useState } from 'react'
import { Send, FileCode } from 'lucide-react'
import axios from 'axios'

const LANGUAGES = [
  { value: 'cpp', label: 'C++', ext: '.cpp' },
  { value: 'python', label: 'Python', ext: '.py' },
  { value: 'java', label: 'Java', ext: '.java' },
  { value: 'javascript', label: 'JavaScript', ext: '.js' },
  { value: 'typescript', label: 'TypeScript', ext: '.ts' },
  { value: 'html', label: 'HTML', ext: '.html' },
  { value: 'css', label: 'CSS', ext: '.css' },
  { value: 'json', label: 'JSON', ext: '.json' },
  { value: 'text', label: 'Plain Text', ext: '.txt' },
]

export default function SnippetEditor({ auth, masterKey, onUploadSuccess }) {
  const authHeaders = auth?.token ? { 'x-drop-token': auth.token } : { 'x-master-key': auth?.masterKey || masterKey }
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('text')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const value = e.target.value
      setContent(value.substring(0, start) + '    ' + value.substring(end))
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4
      }, 0)
    }
  }

  const handleUpload = async () => {
    if (!content.trim() || uploading) return

    setUploading(true)

    try {
      const { data } = await axios.post('/api/upload-snippet', {
        content: content,
        language,
        fileName: fileName.trim() || undefined,
      }, {
        headers: authHeaders,
      })

      onUploadSuccess([{
        fileName: data.fileName,
        webViewLink: data.webViewLink,
      }])

      setContent('')
      setFileName('')
    } catch (err) {
      console.error('Snippet upload failed:', err)
      alert(err.response?.data?.error || 'Failed to upload snippet')
    } finally {
      setUploading(false)
    }
  }

  const selectedLang = LANGUAGES.find(l => l.value === language)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Sharp Toolbar */}
      <div className="snippet-toolbar">
        <select
          className="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          title="Select syntax language"
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
              SYNTAX: {lang.label.toUpperCase()}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="filename-input"
          placeholder={`FILENAME (OPTIONAL, E.G. SNIPPET${selectedLang ? selectedLang.ext.toUpperCase() : '.TXT'})`}
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
      </div>

      {/* Code Textarea */}
      <div className="snippet-editor-wrap">
        <textarea
          className="snippet-textarea"
          placeholder="// Paste or write source code, terminal logs, or lab text here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <div className="snippet-footer">
          <div className="snippet-footer-left">
            <FileCode size={13} style={{ color: 'var(--amber)' }} />
            <span>
              {content ? `${content.split('\n').length} LINES • ` : '0 LINES • '}
              {content.length.toLocaleString()} BYTES
            </span>
          </div>
          <div className="snippet-footer-right">
            <span>UTF-8 • {selectedLang ? selectedLang.label.toUpperCase() : 'PLAIN TEXT'}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        className="btn-primary"
        style={{ marginTop: '14px' }}
        onClick={handleUpload}
        disabled={!content.trim() || uploading}
      >
        {uploading ? (
          <div className="spinner" />
        ) : (
          <>
            <Send size={14} />
            <span>Save Snippet File to Google Drive</span>
          </>
        )}
      </button>
    </div>
  )
}
