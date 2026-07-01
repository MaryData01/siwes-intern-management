import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Building, ShieldCheck, Lock, Save, HelpCircle, Loader, Eye, EyeOff } from 'lucide-react';

const SupervisorProfile = ({ showNotification }) => {
  const { authenticatedFetch, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Profile fields
  const [name, setName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [industryDepartment, setIndustryDepartment] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Recovery fields
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const presetQuestions = [
    "What is your mother's maiden name?",
    "What primary school did you attend?",
    "What is the name of your first pet?",
    "In what city were you born?",
    "What was the model of your first car?"
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/supervisor/profile');
      if (response.ok) {
        const data = await response.json();
        setName(data.name || '');
        setEmailAddress(data.email_address || '');
        setPhone(data.phone || '');
        setIndustryDepartment(data.industry_department || '');
        setSecurityQuestion(data.security_question || '');
      } else {
        showNotification('Failed to fetch profile settings', 'error');
      }
    } catch (err) {
      showNotification('Error loading profile settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBiodataSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !industryDepartment.trim()) {
      showNotification('Name, Phone Number, and Industry Department are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email_address: emailAddress.trim() || null,
        phone: phone.trim(),
        industry_department: industryDepartment.trim()
      };

      const response = await authenticatedFetch('/api/supervisor/profile', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Profile settings updated successfully!', 'success');
        // Update user context name immediately!
        setUser(prev => ({
          ...prev,
          name: name.trim(),
          email: emailAddress.trim() || prev.email
        }));
        fetchProfile(); // reload settings
      } else {
        showNotification(data.message || 'Failed to update profile settings', 'error');
      }
    } catch (err) {
      showNotification('Connection error while saving settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('All password fields (current, new, confirm) are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showNotification('New password must be at least 4 characters long', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        industry_department: industryDepartment.trim(),
        current_password: currentPassword,
        new_password: newPassword
      };

      const response = await authenticatedFetch('/api/supervisor/profile', {
        method: 'POST',
        body: JSON.stringify(payload)
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
      setSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();

    if (!securityQuestion || !securityAnswer.trim()) {
      showNotification('Both security question and answer are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        industry_department: industryDepartment.trim(),
        security_question: securityQuestion,
        security_answer: securityAnswer.trim()
      };

      const response = await authenticatedFetch('/api/supervisor/profile', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Security recovery question updated successfully!', 'success');
        setSecurityAnswer('');
        fetchProfile();
      } else {
        showNotification(data.message || 'Failed to update recovery settings', 'error');
      }
    } catch (err) {
      showNotification('Connection error while saving recovery settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Profile Settings</h1>
          <p>Configure supervisor profile, access credentials, and security recovery parameters</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Box 1: Biodata Settings */}
        <div className="card grid-span-2">
          <form onSubmit={handleBiodataSubmit}>
            <div className="card-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} className="text-primary" />
                <span>Biodata Information</span>
              </div>
            </div>

            <div className="form-group row">
              <div>
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Email Address (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="e.g. supervisor@siwes.com"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            <div className="form-group row" style={{ marginBottom: '16px' }}>
              <div>
                <label className="form-label">Phone Number (Required)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Phone size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Industry Department</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Building size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    value={industryDepartment}
                    onChange={(e) => setIndustryDepartment(e.target.value)}
                    placeholder="e.g. Software Department"
                    required
                    disabled={submitting}
                  />
                </div>
                <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  * Applies to all SIWES interns registered under you.
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ gap: '8px' }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="animate-spin" size={18} /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

          {/* Box 2: Password reset */}
          <div className="card">
            <form onSubmit={handlePasswordSubmit}>
              <div className="card-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} className="text-primary" />
                  <span>Reset Portal Password</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="Required if changing password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={submitting}
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
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={submitting}
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

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="form-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader className="animate-spin" size={18} /> Updating...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Box 3: Forgot password security questions */}
          <div className="card">
            <form onSubmit={handleRecoverySubmit}>
              <div className="card-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={20} className="text-primary" />
                  <span>Forgot Password Recovery</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Select Security Question</label>
                <select
                  className="form-input form-select"
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">-- Choose security question --</option>
                  {presetQuestions.map((q, i) => (
                    <option key={i} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Answer to Question</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Provide answer (stored hashed)"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  disabled={submitting}
                />
                <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  * Case-insensitive. Used to recover password if forgotten.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ gap: '8px' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader className="animate-spin" size={18} /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Save Recovery Settings
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
    </div>
  );
};

export default SupervisorProfile;
