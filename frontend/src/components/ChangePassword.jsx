import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Lock, Save, Loader } from 'lucide-react';

const ChangePassword = ({ showNotification }) => {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      showNotification('Please fill in all fields', 'error');
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

    setSubmitting(true);
    try {
      await changePassword(newPassword);
      showNotification('Password changed successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showNotification(err.message || 'Failed to update password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Security Settings</h1>
          <p>Update your SIWES portal access password</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '480px' }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={20} className="text-primary" />
            <span>Update Password</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#94a3b8' 
              }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="Enter new password (min. 4 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#94a3b8' 
              }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', gap: '8px' }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader className="animate-spin" size={18} /> Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Change Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
