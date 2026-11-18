import { useState } from 'react'
import { X, Copy, Check, Download, ExternalLink, Code2 } from 'lucide-react'

export default function FilePreviewModal({ file, content, truncated, loading, onClose }) {
  const [copied, setCopied] = useState(false)

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadUrl = `https://drive.google.com/uc?id=${file.id}&export=download`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', width: '94%', padding: 0, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <Code2 size={16} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
              {file.name}
            </span>
          </div>
          <button onClick={onClose} className="modal-close-btn" style={{ position: 'static' }} title="Close">
            <X size={14} />
          </button>
        </div>

        {truncated && (
          <div style={{ padding: '6px 16px', background: 'var(--amber-muted)', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '11px', borderBottom: '1px solid var(--border)' }}>
            [NOTICE: TRUNCATED_VIEW — DISPLAYING FIRST 500 KB]
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg-input)' }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              // STREAMING_FILE_FROM_GOOGLE_DRIVE...
            </div>
          ) : (
            <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {content}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={copyContent}
            disabled={loading || !content}
            style={{ flex: 1 }}
          >
            {copied ? <Check size={12} style={{ color: 'var(--emerald)' }} /> : <Copy size={12} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Content'}</span>
          </button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <Download size={12} />
            <span>Download</span>
          </a>
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <ExternalLink size={12} />
            <span>Open in Drive</span>
          </a>
        </div>
      </div>
    </div>
  )
}
