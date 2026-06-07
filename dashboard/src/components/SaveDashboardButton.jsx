import React, { useState, useEffect } from 'react';
import { conferencesAPI } from '../services/api';
import LoginPromptModal from './LoginPromptModal';
import '../styles/button.css';

export default function SaveDashboardButton({ savedUserId, isLoggedIn, onSaveSuccess }) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      checkIfSaved();
    }
  }, [isLoggedIn, savedUserId]);

  const checkIfSaved = async () => {
    try {
      const response = await conferencesAPI.getSavedDashboards();
      const isSavedDashboard = response.data.dashboards.some(d => d.id === parseInt(savedUserId));
      setIsSaved(isSavedDashboard);
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const handleSaveClick = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    saveDashboard();
  };

  const saveDashboard = async () => {
    setIsLoading(true);
    try {
      if (isSaved) {
        // Unsave
        await conferencesAPI.removeSavedDashboard(savedUserId);
        setIsSaved(false);
      } else {
        // Save
        await conferencesAPI.saveDashboard(parseInt(savedUserId));
        setIsSaved(true);
      }
      onSaveSuccess?.();
    } catch (err) {
      console.error('Error toggling save status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className={`save-dashboard-btn ${isSaved ? 'saved' : ''}`}
        onClick={handleSaveClick}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : isSaved ? '✓ Saved' : 'Save Dashboard'}
      </button>
      {showLoginPrompt && (
        <LoginPromptModal onClose={() => setShowLoginPrompt(false)} />
      )}
    </>
  );
}
