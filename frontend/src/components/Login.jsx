import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Loader, ArrowLeft, ShieldAlert, Eye, EyeOff } from 'lucide-react';

const Login = ({ showNotification }) => {
  const { login, apiBaseUrl } = useAuth();
  
  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password States
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = enter identifier, 2 = answer question & reset
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [officialUsername, setOfficialUsername] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showRecoveryNew, setShowRecoveryNew] = useState(false);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      showNotification('Logged in successfully', 'success');
    } catch (err) {
      showNotification(err.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    if (!recoveryIdentifier.trim()) {
      showNotification('Please enter your email address or full name', 'error');
      return;
    }

    setRecoveryLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: recoveryIdentifier.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setRecoveryQuestion(data.security_question);
        setOfficialUsername(data.username);
        setForgotStep(2);
      } else {
        showNotification(data.message || 'Account not found', 'error');
      }
    } catch (err) {
      showNotification('Connection error while fetching question', 'error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!recoveryAnswer.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showNotification('All recovery fields are required', 'error');
      return;
    }

    if (newPassword.length < 4) {
      showNotification('Password must be at least 4 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    setRecoveryLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: officialUsername,
          security_answer: recoveryAnswer.trim(),
          new_password: newPassword.trim()
        })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('Password updated successfully! Log in now.', 'success');
        setForgotMode(false);
        setForgotStep(1);
        setRecoveryIdentifier('');
        setRecoveryAnswer('');
        setNewPassword('');
        setConfirmPassword('');
        // Autofill username
        setUsername(officialUsername);
      } else {
        showNotification(data.message || 'Incorrect recovery details', 'error');
      }
    } catch (err) {
      showNotification('Connection error during password reset', 'error');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            display: 'inline-flex',
            width: '52px',
            height: '52px',
            backgroundColor: '#eff6ff',
            color: '#1e3a8a',
            borderRadius: '14px',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>SIWES Portal</h2>
          <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '4px' }}>Intern Management System</p>
        </div>

        {/* 1. FORGOT PASSWORD MODE */}
        {forgotMode ? (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <button 
                type="button" 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#1e3a8a', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600
                }}
                onClick={() => { setForgotMode(false); setForgotStep(1); }}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Account Recovery</h3>

            {forgotStep === 1 ? (
              <form onSubmit={handleFetchQuestion}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your full name as registered"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '6px', display: 'block' }}>
                    Enter your full name as registered.
                  </small>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? 'Searching...' : 'Retrieve Security Question'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#eff6ff', 
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#1e3a8a', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                    Security Recovery Question
                  </span>
                  <strong style={{ color: '#172554' }}>{recoveryQuestion}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Security Answer</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter answer"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    required
                    disabled={recoveryLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRecoveryNew ? "text" : "password"}
                      className="form-input"
                      style={{ paddingRight: '40px' }}
                      placeholder="Minimum 4 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={recoveryLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryNew(!showRecoveryNew)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      {showRecoveryNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRecoveryConfirm ? "text" : "password"}
                      className="form-input"
                      style={{ paddingRight: '40px' }}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={recoveryLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryConfirm(!showRecoveryConfirm)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      {showRecoveryConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={recoveryLoading}
                >
                  {recoveryLoading ? 'Updating password...' : 'Reset & Save Password'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* 2. SIGN IN MODE */
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username / Email / Phone</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <UserIcon size={18} />
                </span>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  placeholder="e.g. Mary Johnson or supervisor@siwes.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--primary)', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onClick={() => setForgotMode(true)}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ paddingLeft: '44px', paddingRight: '40px' }}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', gap: '10px', marginTop: '12px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} /> Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* Testing credentials box removed */}
      </div>
    </div>
  );
};

export default Login;
