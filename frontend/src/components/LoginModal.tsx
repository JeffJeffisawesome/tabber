import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginModal: React.FC = () => {
  const {
    loginModalOpen,
    loginPromptMessage,
    closeLoginModal,
    signInWithOAuth,
    signInWithEmail,
    signUpWithEmail,
    signInAsDemo,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!loginModalOpen) return null;

  const handleOAuth = async (provider: 'github' | 'google') => {
    setLoadingProvider(provider);
    setErrorMessage(null);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'OAuth sign in failed');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoadingProvider('email');
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      if (authMode === 'signin') {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        }
      } else {
        const { error } = await signUpWithEmail(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessNotice('Account created! Please check your email for a confirmation link if required.');
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDemoLogin = async () => {
    setLoadingProvider('demo');
    setErrorMessage(null);
    try {
      await signInAsDemo();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Demo sign in failed');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={closeLoginModal}>
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="login-modal-close"
          onClick={closeLoginModal}
          title="Close dialog"
        >
          &times;
        </button>

        {/* Modal Header */}
        <div className="login-modal-header">
          <div className="login-modal-logo">🎸</div>
          <h2 className="login-modal-title">Sign in to Tabber</h2>
          <p className="login-modal-subtitle">
            Save, edit, and organize your favorite guitar tabs
          </p>
        </div>

        {/* Contextual Action Prompt Message */}
        {loginPromptMessage && (
          <div className="login-prompt-banner">
            <span className="prompt-icon">🔒</span>
            <span className="prompt-text">{loginPromptMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-error-alert">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="login-success-alert">
            <span>✓ {successNotice}</span>
          </div>
        )}

        {/* OAuth Buttons Section */}
        <div className="oauth-buttons-container">
          {/* GitHub OAuth Button */}
          <button
            type="button"
            className="btn-oauth btn-oauth-github"
            onClick={() => handleOAuth('github')}
            disabled={Boolean(loadingProvider)}
          >
            <svg
              className="oauth-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>
              {loadingProvider === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}
            </span>
          </button>

          {/* Google OAuth Button */}
          <button
            type="button"
            className="btn-oauth btn-oauth-google"
            onClick={() => handleOAuth('google')}
            disabled={Boolean(loadingProvider)}
          >
            <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>
              {loadingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="login-divider">
          <span>or with email</span>
        </div>

        {/* Email & Password Form */}
        <form className="email-auth-form" onSubmit={handleEmailSubmit}>
          <div className="auth-tab-selector">
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('signin');
                setErrorMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('signup');
                setErrorMessage(null);
              }}
            >
              Create Account
            </button>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-submit-auth"
            disabled={Boolean(loadingProvider)}
          >
            {loadingProvider === 'email'
              ? 'Please wait...'
              : authMode === 'signin'
              ? 'Sign In with Email'
              : 'Create Account'}
          </button>
        </form>

        {/* Quick Demo Login Option for instant testing */}
        <div className="demo-login-box">
          <button
            type="button"
            className="btn-demo-login"
            onClick={handleDemoLogin}
            disabled={Boolean(loadingProvider)}
            title="Instant one-click demo login"
          >
            ⚡ Quick Demo Login (Skip for now)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

