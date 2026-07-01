import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { exportInternReportCard } from '../utils/pdfGenerator';
import { 
  UserPlus, 
  ArrowLeft, 
  FileDown, 
  Edit3, 
  UserX, 
  UserCheck, 
  CheckCircle, 
  XCircle,
  Loader,
  Trash2
} from 'lucide-react';

const InternsTab = ({ selectedInternId, setSelectedInternId, showNotification }) => {
  const { authenticatedFetch } = useAuth();
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Modals & Edit Mode States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Add Form Inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [school, setSchool] = useState('');
  const [courseOfStudy, setCourseOfStudy] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Form Inputs
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmailAddress, setEditEmailAddress] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editCourseOfStudy, setEditCourseOfStudy] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    if (selectedInternId) {
      fetchInternProfile(selectedInternId);
    } else {
      setProfileData(null);
      setEditMode(false);
    }
  }, [selectedInternId]);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/supervisor/interns');
      if (response.ok) {
        const data = await response.json();
        setInterns(data);
      }
    } catch (err) {
      showNotification('Failed to fetch interns list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInternProfile = async (id) => {
    setLoadingProfile(true);
    try {
      const response = await authenticatedFetch(`/api/interns/${id}/report`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        // Pre-fill edit fields
        setEditName(data.profile.name);
        setEditPhone(data.profile.phone);
        setEditEmailAddress(data.profile.email_address || '');
        setEditSchool(data.profile.school);
        setEditCourseOfStudy(data.profile.course_of_study);
        setEditSpecialization(data.profile.specialization);
      } else {
        showNotification('Failed to fetch intern profile', 'error');
        setSelectedInternId(null);
      }
    } catch (err) {
      showNotification('Error loading profile', 'error');
      setSelectedInternId(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !school.trim() || !courseOfStudy.trim() || !specialization.trim()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authenticatedFetch('/api/supervisor/interns', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email_address: emailAddress.trim() || null,
          school: school.trim(),
          course_of_study: courseOfStudy.trim(),
          specialization: specialization.trim()
        })
      });

      const data = await response.json();
      if (response.ok || response.status === 210) {
        showNotification('Intern registered successfully!', 'success');
        setShowAddModal(false);
        // Reset fields
        setName('');
        setPhone('');
        setEmailAddress('');
        setSchool('');
        setCourseOfStudy('');
        setSpecialization('');
        fetchInterns();
      } else {
        showNotification(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      showNotification('Connection failed during registration', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim() || !editSchool.trim() || !editCourseOfStudy.trim() || !editSpecialization.trim()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authenticatedFetch(`/api/supervisor/interns/${selectedInternId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email_address: editEmailAddress.trim() || null,
          school: editSchool.trim(),
          course_of_study: editCourseOfStudy.trim(),
          specialization: editSpecialization.trim()
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Intern profile updated successfully', 'success');
        setEditMode(false);
        fetchInternProfile(selectedInternId);
        fetchInterns();
      } else {
        showNotification(data.message || 'Update failed', 'error');
      }
    } catch (err) {
      showNotification('Connection failed during profile update', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const response = await authenticatedFetch(`/api/supervisor/interns/${selectedInternId}/toggle-active`, {
        method: 'POST'
      });

      const data = await response.json();
      if (response.ok) {
        const actionStr = data.is_active ? 'activated' : 'deactivated';
        showNotification(`Intern successfully ${actionStr}`, 'success');
        fetchInternProfile(selectedInternId);
        fetchInterns();
      } else {
        showNotification(data.message || 'Toggle failed', 'error');
      }
    } catch (err) {
      showNotification('Connection error while toggling status', 'error');
    }
  };

  const handleDeleteIntern = async () => {
    setSubmitting(true);
    try {
      const response = await authenticatedFetch(`/api/supervisor/interns/${selectedInternId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Intern permanently deleted successfully', 'success');
        setShowDeleteModal(false);
        setSelectedInternId(null);
        fetchInterns();
      } else {
        showNotification(data.message || 'Deletion failed', 'error');
      }
    } catch (err) {
      showNotification('Connection failed during deletion', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    if (!profileData) return;
    try {
      exportInternReportCard(profileData);
      showNotification('PDF exported successfully', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to export PDF', 'error');
    }
  };

  return (
    <div>
      {/* 1. DETAIL PROFILE VIEW */}
      {selectedInternId && profileData ? (
        <div>
          <div className="page-header">
            <button 
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setSelectedInternId(null)}
            >
              <ArrowLeft size={16} /> Back to Directory
            </button>
            <div className="profile-actions-wrapper" style={{ display: 'flex', gap: '12px' }}>
              <button 
                className={`btn btn-sm ${profileData.profile.is_active ? 'btn-danger' : 'btn-success'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleToggleActive}
              >
                {profileData.profile.is_active ? (
                  <>
                    <UserX size={16} /> Deactivate Intern
                  </>
                ) : (
                  <>
                    <UserCheck size={16} /> Activate Intern
                  </>
                )}
              </button>
              
              <button 
                className="btn btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }}
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 size={16} /> Delete Intern
              </button>

              <button 
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleExportPDF}
              >
                <FileDown size={16} /> Export PDF Report
              </button>
            </div>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            {/* Bio Card */}
            <div className="card">
              <div className="card-title">
                <span>Intern Profile Details</span>
                {!editMode && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setEditMode(true)}
                  >
                    <Edit3 size={14} /> Edit profile
                  </button>
                )}
              </div>

              {editMode ? (
                <form onSubmit={handleUpdateProfile}>
                  <div className="form-group row">
                    <div>
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone Number (Required)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group row">
                    <div>
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        value={editEmailAddress}
                        onChange={(e) => setEditEmailAddress(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="form-label">School / Institution</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editSchool}
                        onChange={(e) => setEditSchool(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group row">
                    <div>
                      <label className="form-label">Course of Study</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editCourseOfStudy}
                        onChange={(e) => setEditCourseOfStudy(e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label className="form-label">Area of Specialization</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editSpecialization}
                        onChange={(e) => setEditSpecialization(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setEditMode(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-biodata-grid" style={{ gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Name</span>
                    <strong style={{ fontSize: '1.1rem' }}>{profileData.profile.name}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Phone Number</span>
                    <strong>{profileData.profile.phone}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Email Address</span>
                    <strong>{profileData.profile.email_address || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>School</span>
                    <strong>{profileData.profile.school}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Course of Study</span>
                    <strong>{profileData.profile.course_of_study}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Specialization</span>
                    <strong>{profileData.profile.specialization}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Industry Department</span>
                    <strong>{profileData.profile.industry_department}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Status</span>
                    <span className={`badge ${profileData.profile.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {profileData.profile.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Evaluator Box */}
            <div className="card">
              <div className="card-title">Thursday Attendance Logs</div>
              <div className="attendance-summary-flex">
                <div style={{ 
                  width: '90px', 
                  height: '90px', 
                  borderRadius: '50%', 
                  border: '8px solid #eff6ff', 
                  borderTopColor: '#1e3a8a', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 700
                }}>
                  {profileData.attendance.percentage}%
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Attended</span>
                      <div className="text-success" style={{ fontWeight: 700 }}>{profileData.attendance.present} Present</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Absent</span>
                      <div className="text-danger" style={{ fontWeight: 700 }}>{profileData.attendance.absent} Absent</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Based on {profileData.attendance.total} Thursday entries recorded.
                  </span>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="table-wrapper" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Thursday Date</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData.attendance.records.length === 0 ? (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>No logs yet</td>
                      </tr>
                    ) : (
                      profileData.attendance.records.map((r, i) => (
                        <tr key={i}>
                          <td>{r.date}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }} className={r.status === 'Present' ? 'text-success' : 'text-danger'}>
                              {r.status === 'Present' ? <CheckCircle size={14} /> : <XCircle size={14} />} {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. MAIN LIST OF INTERNS */
        <div>
          <div className="page-header">
            <div className="page-title-group">
              <h1>Interns Directory</h1>
              <p>Manage, edit, and export reports for SIWES interns</p>
            </div>
            <button 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus size={18} /> Register Intern
            </button>
          </div>

          <div className="card">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                <Loader className="animate-spin text-primary" size={32} />
              </div>
            ) : interns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                No interns registered in the database. Click "Register Intern" to add one.
              </div>
            ) : (
              <>
                <div className="table-wrapper desktop-only">
                  <table>
                    <thead>
                      <tr>
                        <th>Intern Name</th>
                        <th>Phone / Email</th>
                        <th>School / Institution</th>
                        <th>Course of Study</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interns.map((intern) => (
                        <tr key={intern.id} style={{ opacity: intern.is_active ? 1 : 0.6 }}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{intern.name}</div>
                          </td>
                          <td>
                            <div>{intern.phone}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{intern.email_address || 'No Email'}</div>
                          </td>
                          <td>{intern.school}</td>
                          <td>{intern.course_of_study}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${intern.is_active ? 'badge-success' : 'badge-danger'}`}>
                              {intern.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedInternId(intern.id)}
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {interns.map((intern) => (
                    <div 
                      key={intern.id} 
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        opacity: intern.is_active ? 1 : 0.6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '1rem', color: '#0f172a' }}>{intern.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            Tel: {intern.phone} {intern.email_address ? `• ${intern.email_address}` : ''}
                          </div>
                        </div>
                        <span className={`badge ${intern.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {intern.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>School:</span>{' '}
                          <span style={{ fontWeight: 500 }}>{intern.school}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Course of Study:</span>{' '}
                          <span style={{ fontWeight: 500 }}>{intern.course_of_study}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Attendance:</span>{' '}
                          <span style={{ fontWeight: 600 }} className={intern.attendance_rate >= 75 ? 'text-success' : 'text-danger'}>
                            {intern.attendance_rate}%
                          </span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => setSelectedInternId(intern.id)}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. ADD INTERN MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Register New SIWES Intern</h2>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleRegister}>
              <div className="modal-body">
                <div className="form-group row">
                  <div>
                    <label className="form-label">Full Name (Username)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Mary Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                    />
                    <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      * Surname will serve as default password.
                    </small>
                  </div>
                  
                  <div>
                    <label className="form-label">Phone Number (Required)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 08011112222"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="e.g. mary@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                </div>

                <div className="form-group row">
                  <div>
                    <label className="form-label">School / Institution</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. University of Lagos"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Course of Study</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Computer Science"
                      value={courseOfStudy}
                      onChange={(e) => setCourseOfStudy(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Area of Specialization</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Software Engineering"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    required 
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#991b1b' }}>Delete Intern</h2>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowDeleteModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px', fontSize: '0.95rem', color: '#334155' }}>
              Are you sure you want to permanently delete <strong>{profileData?.profile?.name}</strong>? This action cannot be undone.
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', padding: '12px 20px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-sm"
                style={{ backgroundColor: '#dc2626', color: 'white', borderColor: '#dc2626' }}
                onClick={handleDeleteIntern}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternsTab;
