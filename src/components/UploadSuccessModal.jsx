import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Copy, Check, ExternalLink, X } from 'lucide-react'

export default function UploadSuccessModal({ results, onClose }) {
  const [copiedIndex, setCopiedIndex] = useState(null)

  const copyLink = async (link, index) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const singleResult = results.length === 1
  const primaryLink = results[0]?.webViewLink

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        <button onClick={onClose} className="modal-close-btn" title="Close">
          <X size={14} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--emerald)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 700,
            marginBottom: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>[UPLOAD_STREAM_VERIFIED]</span>
          </div>

          <h2 className="modal-title">
            {singleResult ? 'File Stream Complete' : `${results.length} Files Streamed`}
          </h2>
          <p className="modal-subtitle">
            {singleResult
              ? results[0].fileName
              : 'All files safely committed to Google Drive'
            }
          </p>
        </div>

        {/* QR Code */}
        {singleResult && primaryLink && (
          <div className="modal-qr-wrap">
            <div className="modal-qr">
              <QRCodeSVG
                value={primaryLink}
                size={140}
                level="M"
                bgColor="#ffffff"
                fgColor="#060709"
              />
            </div>
          </div>
        )}

        {/* Links */}
        <div style={{ marginBottom: '16px' }}>
          {results.map((result, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              {!singleResult && (
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {result.fileName}
                </div>
              )}
              <div className="modal-link-box">
                <span className="modal-link-text">
                  {result.webViewLink}
                </span>
                <button
                  className={`modal-copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                  onClick={() => copyLink(result.webViewLink, i)}
                >
                  {copiedIndex === i ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedIndex === i ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {singleResult && primaryLink && (
            <a
              href={primaryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <ExternalLink size={13} />
              <span>Drive Link</span>
            </a>
          )}

          <button className="btn-primary" style={{ flex: 1 }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
