import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { exportInternReportCard } from '../utils/pdfGenerator';
import { 
  FileDown, 
  CheckCircle2, 
  XCircle, 
  Loader,
  ShieldAlert
} from 'lucide-react';

const InternDashboard = ({ showNotification }) => {
  const { authenticatedFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/intern/dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        showNotification('Failed to fetch dashboard data', 'error');
      }
    } catch (err) {
      showNotification('Error connecting to API', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!data) return;
    try {
      const reportPayload = {
        profile: {
          ...data.profile,
          is_active: true
        },
        attendance: {
          total: data.attendance_summary.total_thursdays,
          present: data.attendance_summary.attended,
          absent: data.attendance_summary.absent,
          percentage: data.attendance_summary.attendance_rate,
          records: data.attendance_history.map(r => ({ date: r.date, status: r.status }))
        }
      };

      exportInternReportCard(reportPayload);
      showNotification('PDF exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      showNotification('Failed to generate report PDF', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <ShieldAlert size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
        <h3>Profile Error</h3>
        <p>Could not retrieve intern database parameters.</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  const { profile, attendance_summary, attendance_history } = data;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>My Intern Dashboard</h1>
          <p>Welcome back, {profile.name}</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onClick={handleExportPDF}
        >
          <FileDown size={18} /> Export My Report Card
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Profile Biodata Card */}
        <div className="card grid-span-2">
          <div className="card-title">My SIWES Profile Details</div>
          <div className="profile-details-grid">
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Name</span>
              <strong style={{ fontSize: '1.2rem', color: '#1e3a8a' }}>{profile.name}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Phone Number</span>
              <strong style={{ fontSize: '1.05rem' }}>{profile.phone}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Email Address</span>
              <strong>{profile.email_address || '—'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>School / Institution</span>
              <strong>{profile.school}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Course of Study</span>
              <strong>{profile.course_of_study}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Specialization</span>
              <strong>{profile.specialization}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Industry Department</span>
              <strong>{profile.industry_department}</strong>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="card grid-span-2">
          <div className="card-title">My Attendance Metrics</div>
          
          <div className="attendance-summary-flex">
            <div style={{ 
              width: '96px', 
              height: '96px', 
              borderRadius: '50%', 
              border: '8px solid #eff6ff', 
              borderTopColor: '#1e3a8a', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 700
            }}>
              {attendance_summary.attendance_rate}%
            </div>
            <div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Thursdays Attended</span>
                  <div className="text-success" style={{ fontWeight: 700, fontSize: '1.05rem' }}>{attendance_summary.attended}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Thursdays Absent</span>
                  <div className="text-danger" style={{ fontWeight: 700, fontSize: '1.05rem' }}>{attendance_summary.absent}</div>
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Total Thursday logs logged: {attendance_summary.total_thursdays}
              </span>
            </div>
          </div>

          <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            <table style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance_history.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', color: '#94a3b8' }}>No attendance logged yet.</td>
                  </tr>
                ) : (
                  attendance_history.map((log) => (
                    <tr key={log.id}>
                      <td>{log.date}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }} className={log.status === 'Present' ? 'text-success' : 'text-danger'}>
                          {log.status === 'Present' ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {log.status}
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
  );
};

export default InternDashboard;
