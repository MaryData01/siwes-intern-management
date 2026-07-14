import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { exportInternReportCard } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/excelExport';
import InternForm from './InternForm';
import {
  UserPlus, ArrowLeft, FileDown, Edit3, UserX, UserCheck,
  CheckCircle, XCircle, Loader, Trash2, Download, Search
} from 'lucide-react';

const EMPTY_FORM = {
  first_name: '', middle_name: '', surname: '', phone: '',
  email_address: '', school: '', course_of_study: '', specialization: '',
  level: '', sex: '', start_date: '', end_date: '',
};

const InternsTab = ({ selectedInternId, setSelectedInternId, showNotification }) => {
  const { authenticatedFetch } = useAuth();

  const [interns,        setInterns]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [profileData,    setProfileData]    = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editMode,       setEditMode]       = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');

  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [reg,  setReg]  = useState({ ...EMPTY_FORM });
  const [edit, setEdit] = useState({ ...EMPTY_FORM });

  const [exportMode,  setExportMode]  = useState('all');
  const [exportStart, setExportStart] = useState('');
  const [exportEnd,   setExportEnd]   = useState('');
  const [exporting,   setExporting]   = useState(false);

  // ── Stable onChange handlers (useCallback avoids new refs on every render)
  const handleRegChange  = useCallback((field, value) => setReg(prev  => ({ ...prev, [field]: value })), []);
  const handleEditChange = useCallback((field, value) => setEdit(prev => ({ ...prev, [field]: value })), []);

  // ── Client-side search
  const filteredInterns = useMemo(() => {
    if (!searchQuery.trim()) return interns;
    const q = searchQuery.toLowerCase();
    return interns.filter(i => i.name.toLowerCase().includes(q));
  }, [interns, searchQuery]);

  useEffect(() => { fetchInterns(); }, []);

  useEffect(() => {
    if (selectedInternId) fetchInternProfile(selectedInternId);
    else { setProfileData(null); setEditMode(false); }
  }, [selectedInternId]);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/supervisor/interns');
      if (res.ok) setInterns(await res.json());
    } catch { showNotification('Failed to load interns', 'error'); }
    finally   { setLoading(false); }
  };

  const fetchInternProfile = async (id) => {
    setLoadingProfile(true);
    try {
      const res = await authenticatedFetch(`/api/interns/${id}/report`);
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        const p = data.profile;
        setEdit({
          first_name:    p.first_name    || '',
          middle_name:   p.middle_name   || '',
          surname:       p.surname       || '',
          phone:         p.phone         || '',
          email_address: p.email_address || '',
          school:        p.school        || '',
          course_of_study: p.course_of_study || '',
          specialization:  p.specialization  || '',
          level:         p.level         || '',
          sex:           p.sex           || '',
          start_date:    p.start_date    || '',
          end_date:      p.end_date      || '',
        });
      } else {
        showNotification('Failed to load profile', 'error');
        setSelectedInternId(null);
      }
    } catch { showNotification('Connection error', 'error'); setSelectedInternId(null); }
    finally   { setLoadingProfile(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!reg.first_name || !reg.surname || !reg.phone || !reg.school || !reg.course_of_study || !reg.specialization) {
      showNotification('Please fill all required fields', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res  = await authenticatedFetch('/api/supervisor/interns', { method: 'POST', body: JSON.stringify(reg) });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        showNotification('Intern registered successfully!', 'success');
        setShowAddModal(false);
        setReg({ ...EMPTY_FORM });
        fetchInterns();
      } else {
        showNotification(data.message || 'Registration failed', 'error');
      }
    } catch { showNotification('Connection failed', 'error'); }
    finally   { setSubmitting(false); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!edit.first_name || !edit.surname || !edit.phone || !edit.school || !edit.course_of_study || !edit.specialization) {
      showNotification('Please fill all required fields', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res  = await authenticatedFetch(`/api/supervisor/interns/${selectedInternId}`, { method: 'PUT', body: JSON.stringify(edit) });
      const data = await res.json();
      if (res.ok) {
        showNotification('Profile updated!', 'success');
        setEditMode(false);
        fetchInternProfile(selectedInternId);
        fetchInterns();
      } else {
        showNotification(data.message || 'Update failed', 'error');
      }
    } catch { showNotification('Connection failed', 'error'); }
    finally   { setSubmitting(false); }
  };

  const handleToggleActive = async () => {
    try {
      const res  = await authenticatedFetch(`/api/supervisor/interns/${selectedInternId}/toggle-active`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, 'success');
        fetchInternProfile(selectedInternId);
        fetchInterns();
      } else { showNotification(data.message || 'Failed', 'error'); }
    } catch { showNotification('Connection error', 'error'); }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const res  = await authenticatedFetch(`/api/supervisor/interns/${selectedInternId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showNotification('Intern deleted', 'success');
        setShowDeleteModal(false);
        setSelectedInternId(null);
        fetchInterns();
      } else { showNotification(data.message || 'Delete failed', 'error'); }
    } catch { showNotification('Connection failed', 'error'); }
    finally   { setSubmitting(false); }
  };

  const handleExportPDF = () => {
    if (!profileData) return;
    try { exportInternReportCard(profileData); showNotification('PDF exported!', 'success'); }
    catch { showNotification('PDF failed', 'error'); }
  };

  const handleExportSpreadsheet = async () => {
    setExporting(true);
    try {
      let url = '/api/supervisor/interns/export';
      if (exportMode === 'range' && exportStart && exportEnd)
        url += `?start_date=${exportStart}&end_date=${exportEnd}`;
      const res  = await authenticatedFetch(url);
      const data = await res.json();
      if (res.ok) {
        if (!data.length) { showNotification('No interns in that range', 'error'); return; }
        exportToExcel(data, exportMode === 'range' ? `SIWES_Interns_${exportStart}_to_${exportEnd}` : 'SIWES_All_Interns');
        showNotification(`Exported ${data.length} intern(s)`, 'success');
        setShowExportModal(false);
      } else { showNotification('Export failed', 'error'); }
    } catch { showNotification('Export error', 'error'); }
    finally   { setExporting(false); }
  };

  const cancelEdit = useCallback(() => setEditMode(false), []);

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedInternId) {
    if (loadingProfile) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <Loader className="animate-spin" size={36} />
      </div>
    );

    if (!profileData) return null;

    const p = profileData.profile;
    const a = profileData.attendance;

    return (
      <div>
        {/* Top action bar */}
        <div className="page-header">
          <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setSelectedInternId(null)}>
            <ArrowLeft size={16} /> Back to Directory
          </button>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${p.is_active ? 'btn-danger' : 'btn-success'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleToggleActive}>
              {p.is_active ? <><UserX size={16} /> Deactivate</> : <><UserCheck size={16} /> Activate</>}
            </button>
            <button className="btn btn-sm" style={{ background: '#dc2626', color: 'white', border: '1px solid #dc2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={16} /> Delete
            </button>
            <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleExportPDF}>
              <FileDown size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Profile card */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-title">
            <span>Intern Profile Details</span>
            {!editMode && (
              <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setEditMode(true)}>
                <Edit3 size={14} /> Edit profile
              </button>
            )}
          </div>

          {editMode ? (
            <InternForm
              values={edit}
              onChange={handleEditChange}
              onSubmit={handleUpdateProfile}
              onCancel={cancelEdit}
              submitting={submitting}
              isEdit={true}
            />
          ) : (
            <div className="profile-biodata-grid">
              {[
                ['Name',               p.name],
                ['Sex',                p.sex || '-'],
                ['Phone Number',       p.phone],
                ['Email Address',      p.email_address || '-'],
                ['School',             p.school],
                ['Course of Study',    p.course_of_study],
                ['Level',              p.level || '-'],
                ['Specialization',     p.specialization],
                ['Industry Department', p.industry_department],
                ['Start Date',         p.start_date || '-'],
                ['End Date',           p.end_date || '-'],
                ['Duration',           p.duration || '-'],
              ].map(([label, val]) => (
                <div key={label}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Status</span>
                <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`}>{p.is_active ? 'Active' : 'Deactivated'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Attendance card */}
        <div className="card">
          <div className="card-title">Thursday Attendance Logs</div>
          <div className="attendance-summary-flex">
            <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: '8px solid #eff6ff', borderTopColor: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
              {a.percentage}%
            </div>
            <div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '6px' }}>
                <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Attended</span><div className="text-success" style={{ fontWeight: 700 }}>{a.present} Present</div></div>
                <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Absent</span><div className="text-danger" style={{ fontWeight: 700 }}>{a.absent} Absent</div></div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Based on {a.total} Thursday entries.</span>
            </div>
          </div>
          <div className="table-wrapper" style={{ maxHeight: '260px', overflowY: 'auto', marginTop: '12px' }}>
            <table style={{ fontSize: '0.85rem' }}>
              <thead><tr><th>Thursday Date</th><th style={{ textAlign: 'right' }}>Status</th></tr></thead>
              <tbody>
                {a.records.length === 0
                  ? <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>No logs yet</td></tr>
                  : a.records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.date}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={r.status === 'Present' ? 'text-success' : 'text-danger'} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          {r.status === 'Present' ? <CheckCircle size={14} /> : <XCircle size={14} />} {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete modal */}
        {showDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#991b1b' }}>Delete Intern</h2>
                <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowDeleteModal(false)}>&times;</button>
              </div>
              <div className="modal-body" style={{ padding: '16px 20px' }}>
                Are you sure you want to permanently delete <strong>{p.name}</strong>? This cannot be undone.
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteModal(false)} disabled={submitting}>Cancel</button>
                <button className="btn btn-sm" style={{ background: '#dc2626', color: 'white', border: '1px solid #dc2626' }} onClick={handleDelete} disabled={submitting}>
                  {submitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DIRECTORY VIEW
  // ─────────────────────────────────────────────────────────────────────────
  const INP = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit' };
  const LBL = { fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Interns Directory</h1>
          <p>Manage, edit, and export reports for SIWES interns</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowExportModal(true)}>
            <Download size={18} /> Export to Excel
          </button>
          <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} /> Register Intern
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px', position: 'relative', maxWidth: '380px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Search interns by name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ ...INP, paddingLeft: '36px' }}
        />
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Loader className="animate-spin text-primary" size={32} /></div>
        ) : filteredInterns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
            {searchQuery ? `No interns matching "${searchQuery}"` : 'No interns yet. Click Register Intern to add one.'}
          </div>
        ) : (
          <>
            <div className="table-wrapper desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Intern Name</th>
                    <th>Phone / Email</th>
                    <th>School</th>
                    <th>Course of Study</th>
                    <th>Level</th>
                    <th>Attendance</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterns.map(intern => (
                    <tr key={intern.id} style={{ opacity: intern.is_active ? 1 : 0.6 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{intern.name}</div>
                        {intern.sex && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{intern.sex}</div>}
                      </td>
                      <td>
                        <div>{intern.phone}</div>
                        {intern.email_address && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{intern.email_address}</div>}
                      </td>
                      <td>{intern.school}</td>
                      <td>{intern.course_of_study}</td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>{intern.level || '-'}</td>
                      <td><span className={intern.attendance_rate >= 75 ? 'text-success' : 'text-danger'} style={{ fontWeight: 600 }}>{intern.attendance_rate}%</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${intern.is_active ? 'badge-success' : 'badge-danger'}`}>{intern.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInternId(intern.id)}>View Profile</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredInterns.map(intern => (
                <div key={intern.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', opacity: intern.is_active ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{intern.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{intern.phone}</div>
                    </div>
                    <span className={`badge ${intern.is_active ? 'badge-success' : 'badge-danger'}`}>{intern.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><span style={{ color: '#64748b' }}>School:</span> <strong>{intern.school}</strong></div>
                    <div><span style={{ color: '#64748b' }}>Course:</span> <strong>{intern.course_of_study}</strong></div>
                    {intern.level && <div><span style={{ color: '#64748b' }}>Level:</span> <strong>{intern.level}</strong></div>}
                    <div><span style={{ color: '#64748b' }}>Attendance:</span> <strong className={intern.attendance_rate >= 75 ? 'text-success' : 'text-danger'}>{intern.attendance_rate}%</strong></div>
                  </div>
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => setSelectedInternId(intern.id)}>View Profile</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* REGISTER MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Register New SIWES Intern</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <InternForm
                values={reg}
                onChange={handleRegChange}
                onSubmit={handleRegister}
                onCancel={() => setShowAddModal(false)}
                submitting={submitting}
                isEdit={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Export Interns to Excel</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowExportModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                {[['all', 'All Interns'], ['range', 'Filter by Date Range']].map(([val, lbl]) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: exportMode === val ? 600 : 400 }}>
                    <input type="radio" name="exportMode" value={val} checked={exportMode === val} onChange={() => setExportMode(val)} /> {lbl}
                  </label>
                ))}
              </div>
              {exportMode === 'range' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div><label style={LBL}>From</label><input type="date" style={INP} value={exportStart} onChange={e => setExportStart(e.target.value)} /></div>
                  <div><label style={LBL}>To</label><input type="date" style={INP} value={exportEnd} onChange={e => setExportEnd(e.target.value)} /></div>
                  <p style={{ gridColumn: '1/-1', fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Exports interns whose internship overlaps this range.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={handleExportSpreadsheet}
                disabled={exporting || (exportMode === 'range' && (!exportStart || !exportEnd))}>
                <Download size={16} /> {exporting ? 'Exporting...' : 'Download Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternsTab;
