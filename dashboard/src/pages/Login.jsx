import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/auth.css';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Get redirect param from URL
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');

  const showError = (msg, duration = 2000) => {
    setError(msg);
    setTimeout(() => setError(''), duration);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        showError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        showError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }
      if (!/[A-Z]/.test(password)) {
        showError('Password must contain at least one uppercase letter');
        setLoading(false);
        return;
      }
      if (!/[0-9]/.test(password)) {
        showError('Password must contain at least one number');
        setLoading(false);
        return;
      }

      let response;
      if (isSignup) {
        if (!confirmPassword) {
          showError('Please confirm your password');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          showError('Passwords do not match');
          setLoading(false);
          return;
        }
        response = await authAPI.signup(email, password);
      } else {
        response = await authAPI.login(email, password);
      }

      if (response.data.success) {
        localStorage.setItem('authToken', response.data.token);
        if (redirect) {
          navigate(redirect);
        } else {
          navigate('/dashboard');
        }
      } else {
        showError(response.data.error || 'Authentication failed');
      }
    } catch (err) {
      showError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Conference Radar</h1>
          <p className="auth-subtitle">Track and manage conference submissions</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="text"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          )}

          {error 
          ? <div className="error-message">{error}</div> 
          : <div className="error-placeholder" />
          }

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          <p>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="toggle-btn"
              disabled={loading}
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}