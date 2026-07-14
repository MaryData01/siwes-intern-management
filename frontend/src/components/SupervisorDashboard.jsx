import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, ArrowUpRight, ShieldAlert, Loader } from 'lucide-react';

const SupervisorDashboard = ({ onViewIntern, showNotification }) => {
  const { user, authenticatedFetch } = useAuth();
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/supervisor/dashboard');
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        showNotification('Failed to fetch dashboard data', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader className="animate-spin text-primary" size={40} />
    </div>
  );

  if (!data) return (
    <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
      <ShieldAlert size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
      <h3>Error Loading Dashboard</h3>
      <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={fetchDashboardData}>Retry</button>
    </div>
  );

  const { stats, interns, attendance_chart } = data;

  // ── Chart: use real max so bars never overflow ──────────────────────────
  const chartMax     = Math.max(...attendance_chart.map(d => d.count), 1);
  const CHART_H      = 180; // px
  const yAxisTicks   = Array.from({ length: chartMax + 1 }, (_, i) => chartMax - i);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Supervisor Dashboard</h1>
          <p>SIWES Industrial Training Overview</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={fetchDashboardData}>Refresh Data</button>
          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Last updated: {lastUpdated}</span>
          )}
        </div>
      </div>

      {/* Welcome */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#475569', margin: 0 }}>
          Welcome back, {user?.name || 'Supervisor'} 👋
        </h2>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)', color: 'white', borderLeft: '4px solid #60A5FA', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', width: '48px', height: '48px' }}>
            <Users size={24} color="white" />
          </div>
          <div>
            <span style={{ color: 'white', fontSize: '2rem', fontWeight: 700, display: 'block', lineHeight: 1.1 }}>{stats.total_interns}</span>
            <span style={{ color: '#E2E8F0', fontSize: '0.85rem' }}>Active Interns</span>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'linear-gradient(135deg,#065F46 0%,#059669 100%)', color: 'white', borderLeft: '4px solid #34D399', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', width: '48px', height: '48px' }}>
            <Calendar size={24} color="white" />
          </div>
          <div>
            <span style={{ color: 'white', fontSize: '2rem', fontWeight: 700, display: 'block', lineHeight: 1.1 }}>{stats.avg_attendance}%</span>
            <span style={{ color: '#E2E8F0', fontSize: '0.85rem' }}>Avg Attendance Rate</span>
          </div>
        </div>
      </div>

      {/* Chart + Quick List */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>

        {/* ── Attendance Chart ───────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title" style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
            Thursday Attendance Trend
          </div>

          {attendance_chart.length === 0 ? (
            <div style={{ height: `${CHART_H}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No attendance records yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {/* Chart body */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>

                {/* Y-axis */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: `${CHART_H}px`, paddingRight: '8px', textAlign: 'right', flexShrink: 0 }}>
                  {yAxisTicks.map(tick => (
                    <span key={tick} style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1' }}>{tick}</span>
                  ))}
                </div>

                {/* Plot area — overflow:hidden prevents bar bleeding */}
                <div style={{ flex: 1, height: `${CHART_H}px`, position: 'relative', borderBottom: '2px solid #e2e8f0', borderLeft: '1px solid #e2e8f0', overflow: 'hidden', backgroundColor: '#f8fafc', borderRadius: '4px 4px 0 0' }}>
                  {/* Horizontal grid lines */}
                  {yAxisTicks.slice(1).map((tick, i) => (
                    <div key={i} style={{ position: 'absolute', left: 0, right: 0, bottom: `${(tick / chartMax) * 100}%`, borderTop: '1px dashed #e2e8f0' }} />
                  ))}

                  {/* Bars */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 12px' }}>
                    {attendance_chart.map((bar, idx) => {
                      const pct = Math.min((bar.count / chartMax) * 100, 100);
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '60px', height: '100%', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>{bar.count}</span>
                          <div style={{ width: '70%', height: `${pct}%`, background: 'linear-gradient(180deg,#2563EB 0%,#1e3a8a 100%)', borderRadius: '4px 4px 0 0', minHeight: bar.count > 0 ? '4px' : '0' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* X-axis labels */}
              <div style={{ display: 'flex', paddingLeft: '32px', marginTop: '6px' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', padding: '0 12px' }}>
                  {attendance_chart.map((bar, idx) => (
                    <span key={idx} style={{ flex: 1, maxWidth: '60px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                      {formatDate(bar.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick Intern List ──────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 0, overflowY: 'auto' }}>
          <div className="card-title" style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
            Quick Intern List
          </div>
          {interns.length === 0 ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No interns registered.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {interns.slice(0, 6).map(intern => (
                <div key={intern.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{intern.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{intern.school}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ backgroundColor: intern.is_active ? '#1e3a8a' : '#94a3b8', color: 'white', padding: '3px 9px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {intern.is_active ? 'active' : 'inactive'}
                    </span>
                    <button onClick={() => onViewIntern(intern.id)} style={{ background: 'none', border: 'none', color: '#1e3a8a', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: '4px 6px' }}>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Interns Table */}
      <div className="card">
        <div className="card-title">
          <span>All Registered Interns</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Showing {interns.length} total</span>
        </div>

        {interns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>No interns yet. Go to Interns Directory to register one.</div>
        ) : (
          <>
            <div className="table-wrapper desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Intern Name</th>
                    <th>School</th>
                    <th>Course of Study</th>
                    <th>Level</th>
                    <th style={{ textAlign: 'center' }}>Attendance</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interns.map(intern => (
                    <tr key={intern.id} style={{ opacity: intern.is_active ? 1 : 0.6 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{intern.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{intern.phone}</div>
                      </td>
                      <td>{intern.school}</td>
                      <td>{intern.course_of_study}</td>
                      <td style={{ fontSize: '0.82rem', color: '#475569' }}>{intern.level || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        <span className={intern.attendance_rate >= 75 ? 'text-success' : 'text-danger'}>{intern.attendance_rate}%</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${intern.is_active ? 'badge-success' : 'badge-danger'}`}>{intern.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => onViewIntern(intern.id)}>
                          View Profile <ArrowUpRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {interns.map(intern => (
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
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => onViewIntern(intern.id)}>
                      View Profile <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;
