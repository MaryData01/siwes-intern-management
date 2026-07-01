import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, ArrowUpRight, ShieldAlert, Loader } from 'lucide-react';

const SupervisorDashboard = ({ onViewIntern, showNotification }) => {
  const { user, authenticatedFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/supervisor/dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        showNotification('Failed to fetch dashboard data', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Error connecting to API', 'error');
    } finally {
      setLoading(false);
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
        <h3>Error Loading Dashboard</h3>
        <p>Could not load SIWES system parameters.</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  const { stats, interns, attendance_chart } = data;

  const maxAttendanceCount = Math.max(...attendance_chart.map(d => d.count), 1);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Supervisor Dashboard</h1>
          <p>SIWES Industrial Training Overview</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={fetchDashboardData}>
            Refresh Data
          </button>
          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
              Last updated: {lastUpdated}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#475569', margin: 0 }}>
          Welcome back, {user?.name || 'Supervisor'} 👋
        </h2>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
          color: 'white',
          borderLeft: '4px solid #60A5FA',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '24px'
        }}>
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', width: '48px', height: '48px' }}>
            <Users size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value" style={{ color: 'white', fontSize: '1.8rem', fontWeight: 700, display: 'block', lineHeight: 1.2 }}>{stats.total_interns}</span>
            <span className="stat-label" style={{ color: '#E2E8F0', fontSize: '0.85rem', fontWeight: 500 }}>Active Interns</span>
          </div>
        </div>

        <div className="stat-card" style={{
          background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)',
          color: 'white',
          borderLeft: '4px solid #34D399',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '24px'
        }}>
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', width: '48px', height: '48px' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value" style={{ color: 'white', fontSize: '1.8rem', fontWeight: 700, display: 'block', lineHeight: 1.2 }}>{stats.avg_attendance}%</span>
            <span className="stat-label" style={{ color: '#E2E8F0', fontSize: '0.85rem', fontWeight: 500 }}>Avg Attendance Rate</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Card 1: Thursday Attendance Trend */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title" style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
            Thursday Attendance Trend
          </div>
          {attendance_chart.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No attendance records recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                {/* Y-axis Labels */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  height: '180px', 
                  color: '#64748b', 
                  fontSize: '0.8rem', 
                  paddingRight: '12px', 
                  textAlign: 'right', 
                  width: '24px',
                  lineHeight: '1'
                }}>
                  <span>4</span>
                  <span>3</span>
                  <span>2</span>
                  <span>1</span>
                  <span>0</span>
                </div>
                
                {/* Chart Area */}
                <div style={{ flex: 1, height: '180px', position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
                  {/* Grid Lines */}
                  <div style={{ position: 'absolute', top: '0px', left: 0, right: 0, borderBottom: '1px dashed #e2e8f0' }}></div>
                  <div style={{ position: 'absolute', top: '45px', left: 0, right: 0, borderBottom: '1px dashed #e2e8f0' }}></div>
                  <div style={{ position: 'absolute', top: '90px', left: 0, right: 0, borderBottom: '1px dashed #e2e8f0' }}></div>
                  <div style={{ position: 'absolute', top: '135px', left: 0, right: 0, borderBottom: '1px dashed #e2e8f0' }}></div>
                  
                  {/* Bars Container */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-around', 
                    alignItems: 'flex-end', 
                    height: '100%', 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    padding: '0 16px' 
                  }}>
                    {attendance_chart.map((bar, idx) => {
                      const heightPct = (bar.count / 4) * 100;
                      return (
                        <div 
                          key={idx} 
                          style={{
                            width: '40px',
                            height: `${heightPct}%`,
                            backgroundColor: '#1e3a8a',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease'
                          }} 
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* X-axis Labels */}
              <div style={{ display: 'flex', paddingLeft: '36px' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', padding: '8px 16px 0 16px' }}>
                  {attendance_chart.map((bar, idx) => (
                    <span key={idx} style={{ width: '40px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                      {formatDate(bar.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Quick Intern List */}
        <div className="card" style={{ marginBottom: 0, overflowY: 'auto' }}>
          <div className="card-title" style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
            Quick Intern List
          </div>
          
          {interns.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No interns registered.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {interns.slice(0, 5).map((intern) => (
                <div 
                  key={intern.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingBottom: '12px', 
                    borderBottom: '1px solid #f1f5f9' 
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>{intern.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{intern.school}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {intern.is_active && (
                      <span style={{ 
                        backgroundColor: '#1e3a8a', 
                        color: 'white', 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600 
                      }}>
                        active
                      </span>
                    )}
                    <button 
                      onClick={() => onViewIntern(intern.id)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#0f172a', 
                        fontWeight: 500, 
                        fontSize: '0.9rem', 
                        cursor: 'pointer',
                        padding: '4px 8px'
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interns Table Card */}
      <div className="card">
        <div className="card-title">
          <span>All Registered Interns</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>
            Showing {interns.length} total
          </span>
        </div>
        
        {interns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            No interns registered yet. Go to the "Interns Directory" to add your first intern.
          </div>
        ) : (
          <>
            <div className="table-wrapper desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Intern Details</th>
                    <th>School</th>
                    <th>Course of Study</th>
                    <th style={{ textAlign: 'center' }}>Attendance Rate</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interns.map((intern) => (
                    <tr key={intern.id} style={{ opacity: intern.is_active ? 1 : 0.6 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{intern.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Tel: {intern.phone} {intern.email_address ? `• ${intern.email_address}` : ''}
                        </div>
                      </td>
                      <td>{intern.school}</td>
                      <td>{intern.course_of_study}</td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>
                        <span className={intern.attendance_rate >= 75 ? 'text-success' : 'text-danger'}>
                          {intern.attendance_rate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${intern.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {intern.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => onViewIntern(intern.id)}
                        >
                          View Profile <ArrowUpRight size={14} />
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
                        Tel: {intern.phone}
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
                      <span style={{ color: '#64748b' }}>Course:</span>{' '}
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
                      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      onClick={() => onViewIntern(intern.id)}
                    >
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
