import { useState } from 'react';
import '../styles/modal.css';

export default function ShareModal({ userId, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/user/${userId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Your Dashboard</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Share your conference list with others. They'll need an account to view.
          </p>

          <div className="share-url-section">
            <label htmlFor="share-url">Your Dashboard URL:</label>
            <div className="url-input-group">
              <input
                id="share-url"
                type="text"
                value={shareUrl}
                readOnly
                className="share-url-input"
              />
              <button
                onClick={handleCopy}
                className={`copy-btn ${copied ? 'copied' : ''}`}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          <div className="share-privacy">
            <p className="privacy-note">
              <strong>Privacy:</strong> Only people with an account can view your shared dashboard.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="close-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
