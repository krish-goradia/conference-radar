import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/modal.css';


export default function LoginPromptModal({ onClose }) {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Pass current path as redirect param
    const redirect = window.location.pathname;
    navigate(`/?redirect=${encodeURIComponent(redirect)}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '24px' }}>
          <h2>Save Dashboard</h2>
          <p>You need to be logged in to save dashboards.</p>
          <p>Create an account or log in to save your favorite dashboards for quick access later.</p>
          <div className="modal-buttons">
            <button className="btn-primary" onClick={handleLogin}>
              Go to Login
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
