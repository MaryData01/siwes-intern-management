import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { exportInternReportCard } from '../utils/pdfGenerator';
import { FileDown, CheckCircle2, XCircle, Loader } from 'lucide-react';

const InternDashboard = ({ showNotification }) => {
  const { authenticatedFetch } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/intern/dashboard');
      if (res.ok) setData(await res.json());
      else showNotification('Failed to load dashboard', 'error');
    } catch { showNotification('Connection error', 'error'); }
    finally   { setLoading(false); }
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      const p = data.profile;
      const s = data.attendance_summary;
      exportInternReportCard({
        profile: { ...p, is_active: true },
        attendance: {
          total:      s.total_thursdays,
          present:    s.attended,
          absent:     s.absent,
          percentage: s.attendance_rate,
          records:    data.attendance_history.map(r => ({ date: r.date, status: r.status })),
        },
      });
      showNotification('Report exported!', 'success');
    } catch { showNotification('Export failed', 'error'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader className="animate-spin text-primary" size={40} />
    </div>
  );
  if (!data) return <div className="card" style={{ padding: '40px', textAlign: 'center' }}>Could not load profile.</div>;

  const { profile: p, attendance_summary: s, attendance_history: history } = data;

  const bioFields = [
    ['Name',                p.name],
    ['Sex',                 p.sex || '-'],
    ['Phone Number',        p.phone],
    ['Email Address',       p.email_address || '-'],
    ['School / Institution', p.school],
    ['Course of Study',     p.course_of_study],
    ['Level',               p.level || '-'],
    ['Specialization',      p.specialization],
    ['Industry Department', p.industry_department],
    ['Start Date',          p.start_date || '-'],
    ['End Date',            p.end_date || '-'],
    ['Duration',            p.duration || '-'],
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>My Intern Dashboard</h1>
          <p>Welcome back, {p.name}</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={handleExport}>
          <FileDown size={18} /> Export My Report
        </button>
      </div>

      {/* Profile card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title">My SIWES Profile Details</div>
        <div className="profile-details-grid">
          {bioFields.map(([label, val]) => (
            <div key={label}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>{label}</span>
              <strong style={label === 'Name' ? { fontSize: '1.05rem', color: '#1e3a8a' } : {}}>{val}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance */}
      <div className="card">
        <div className="card-title">My Attendance Metrics</div>
        <div className="attendance-summary-flex">
          <div style={{ width: '92px', height: '92px', borderRadius: '50%', border: '8px solid #eff6ff', borderTopColor: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700 }}>
            {s.attendance_rate}%
          </div>
          <div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '8px' }}>
              <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Thursdays Attended</span><div className="text-success" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.attended}</div></div>
              <div><span style={{ fontSize: '0.75rem', color: '#64748b' }}>Thursdays Absent</span><div className="text-danger" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.absent}</div></div>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Thursday logs: {s.total_thursdays}</span>
          </div>
        </div>
        <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto', marginTop: '16px' }}>
          <table style={{ fontSize: '0.85rem' }}>
            <thead><tr><th>Date</th><th style={{ textAlign: 'right' }}>Status</th></tr></thead>
            <tbody>
              {history.length === 0
                ? <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>No attendance logged yet.</td></tr>
                : history.map((log, i) => (
                  <tr key={i}>
                    <td>{log.date}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={log.status === 'Present' ? 'text-success' : 'text-danger'} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        {log.status === 'Present' ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InternDashboard;
