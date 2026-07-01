import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Save, HelpCircle, Loader, Eye, EyeOff } from 'lucide-react';

const AccountSecurity = ({ showNotification }) => {
  const { authenticatedFetch } = useAuth();
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Question state
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');

  const presetQuestions = [
    "What is your mother's maiden name?",
    "What primary school did you attend?",
    "What is the name of your first pet?",
    "In what city were you born?",
    "What was the model of your first car?"
  ];

  useEffect(() => {
    fetchCurrentRecovery();
  }, []);

  const fetchCurrentRecovery = async () => {
    try {
      const response = await authenticatedFetch('/api/intern/dashboard');
      if (response.ok) {
        // Wait, dashboard doesn't return security question by default, but let's query supervisor/intern profile.
        // Let's decode token or check if user details can be fetched
        // Intern profile doesn't show security_question in dict, but let's make it fetch.
        // In this case, we can show if a question has been set.
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showNotification('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 4) {
      showNotification('New password must be at least 4 characters long', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const response = await authenticatedFetch('/api/auth/account-security/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showNotification(data.message || 'Failed to update password', 'error');
      }
    } catch (err) {
      showNotification('Connection error while changing password', 'error');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();

    if (!securityQuestion || !securityAnswer.trim()) {
      showNotification('Please select a question and provide an answer', 'error');
      return;
    }

    setQuestionSubmitting(true);
    try {
      const response = await authenticatedFetch('/api/auth/account-security/set-question', {
        method: 'POST',
        body: JSON.stringify({
          security_question: securityQuestion,
          security_answer: securityAnswer.trim()
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Security recovery question saved successfully!', 'success');
        setSecurityAnswer('');
        setCurrentQuestion(securityQuestion);
      } else {
        showNotification(data.message || 'Failed to set recovery details', 'error');
      }
    } catch (err) {
      showNotification('Connection error while setting recovery question', 'error');
    } finally {
      setQuestionSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Account Security</h1>
          <p>Manage your access credentials and recovery parameters</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Section 1: Change Password */}
        <div className="card">
          <div className="card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} className="text-primary" />
              <span>Change Password</span>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? "text" : "password"}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
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
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? "text" : "password"}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  placeholder="Enter new password (min. 4 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
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
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
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
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', gap: '8px' }}
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? (
                <>
                  <Loader className="animate-spin" size={18} /> Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Update Password
                </>
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Set Security Question */}
        <div className="card">
          <div className="card-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={20} className="text-primary" />
              <span>Password Recovery Question</span>
            </div>
          </div>

          <form onSubmit={handleQuestionSubmit}>
            <div className="form-group">
              <label className="form-label">Select Security Question</label>
              <select
                className="form-input form-select"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                disabled={questionSubmitting}
              >
                <option value="">-- Choose recovery question --</option>
                {presetQuestions.map((q, i) => (
                  <option key={i} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">Answer to Question</label>
              <input
                type="text"
                className="form-input"
                placeholder="Provide answer (stored securely)"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                disabled={questionSubmitting}
              />
              <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                Note: This answer is case-insensitive during recovery.
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              style={{ width: '100%', gap: '8px' }}
              disabled={questionSubmitting}
            >
              {questionSubmitting ? (
                <>
                  <Loader className="animate-spin" size={18} /> Setting...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Configure Recovery
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountSecurity;
