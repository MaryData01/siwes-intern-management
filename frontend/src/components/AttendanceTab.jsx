import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Save, History, Info, Loader, CheckCircle2, XCircle } from 'lucide-react';

const AttendanceTab = ({ showNotification }) => {
  const { authenticatedFetch } = useAuth();
  
  const dateInputRef = useRef(null);
  
  // States
  const [selectedDate, setSelectedDate] = useState('');
  const [records, setRecords] = useState([]);
  const [pastDates, setPastDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogged, setIsLogged] = useState(false);

  // Default to today or nearest Thursday
  useEffect(() => {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    
    // Find nearest Thursday (weekday index 4 in JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4...)
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -3 : 4); // Adjust for Sunday
    const nearestThursday = new Date(today.setDate(diff));
    const formattedThursday = nearestThursday.toISOString().split('T')[0];
    
    setSelectedDate(formattedThursday);
    fetchPastDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAttendanceForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchPastDates = async () => {
    try {
      const response = await authenticatedFetch('/api/supervisor/attendance/dates');
      if (response.ok) {
        const data = await response.json();
        setPastDates(data);
      }
    } catch (err) {
      console.error("Failed to fetch past attendance dates", err);
    }
  };

  const fetchAttendanceForDate = async (dateStr) => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`/api/supervisor/attendance?date=${dateStr}`);
      const data = await response.json();
      if (response.ok) {
        setRecords(data.records || []);
        setIsLogged(data.is_logged || false);
      } else {
        showNotification(data.message || 'Failed to fetch attendance records', 'error');
        setRecords([]);
      }
    } catch (err) {
      showNotification('Error loading attendance logs', 'error');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = (internId) => {
    setHasUnsaved(true);
    setRecords(prev => prev.map(rec => {
      if (rec.intern_id === internId) {
        return { ...rec, status: rec.status === 'Present' ? 'Absent' : 'Present' };
      }
      return rec;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) return;
    
    // Validate if selected date is a Thursday (JS getDay() returns 4 for Thursday)
    const dateObj = new Date(selectedDate);
    if (dateObj.getDay() !== 4) {
      showNotification('Attendance can only be logged for Thursdays!', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authenticatedFetch('/api/supervisor/attendance', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          records: records.map(r => ({ intern_id: r.intern_id, status: r.status }))
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification(`Attendance for ${selectedDate} saved successfully!`, 'success');
        setHasUnsaved(false);
        setIsLogged(true);
        fetchPastDates();
      } else {
        showNotification(data.message || 'Failed to submit attendance', 'error');
      }
    } catch (err) {
      showNotification('Connection error while saving attendance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatLongDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatSheetDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatMediumDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-title-group">
          <h1 style={{ color: '#1e3a8a', fontSize: '1.75rem', fontWeight: 700 }}>Thursday Attendance</h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Manage weekly SIWES attendance for your department</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Card 1: Select Date */}
        <div className="card" style={{ borderTop: '4px solid #1e3a8a', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: 0 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Select Date</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px 0' }}>Attendance is only recorded on Thursdays</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div 
              onClick={() => dateInputRef.current && dateInputRef.current.showPicker()}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '10px', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                padding: '10px 16px', 
                cursor: 'pointer',
                backgroundColor: 'white',
                fontWeight: 500,
                color: '#334155',
                fontSize: '0.95rem'
              }}
            >
              <Calendar size={18} style={{ color: '#64748b' }} />
              <span>{formatLongDate(selectedDate)}</span>
              <input 
                ref={dateInputRef}
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
            </div>
            
            {pastDates.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.9rem' }}>
                <span>or select a past sheet:</span>
                <select 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    padding: '10px 16px', 
                    backgroundColor: 'white',
                    color: '#334155',
                    fontWeight: 500,
                    outline: 'none',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  <option value="" disabled>Select Date</option>
                  {pastDates.map((d, i) => (
                    <option key={i} value={d}>{formatMediumDate(d)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Attendance Sheet */}
        <div className="card" style={{ borderTop: '4px solid #1e3a8a', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)', marginBottom: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Loader className="animate-spin text-primary" size={32} />
            </div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              No active interns found to log attendance. Please register active interns first.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>Attendance Sheet</h2>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{formatSheetDate(selectedDate)}</div>
                </div>
                
                <button 
                  type="submit" 
                  className="btn"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    backgroundColor: hasUnsaved ? '#1e3a8a' : '#94a3b8', 
                    transition: 'background-color 0.2s ease',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                  disabled={submitting}
                >
                  <Save size={18} />
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'6px' }}>{hasUnsaved && !submitting && <span style={{width:'8px',height:'8px',borderRadius:'50%',backgroundColor:'#fbbf24',display:'inline-block'}}/>}{submitting ? 'Saving...' : 'Save Attendance'}</span>
                </button>
              </div>

              <div style={{ padding: '12px 0 8px 0', maxWidth: '340px' }}>
                <div style={{ position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div className="table-wrapper" style={{ border: 'none', marginBottom: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 500, fontSize: '0.85rem' }}>Intern Name</th>
                      <th className="desktop-only" style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 500, fontSize: '0.85rem', width: '140px' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', color: '#64748b', fontWeight: 500, fontSize: '0.85rem', width: '100px' }}>Toggle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.filter(rec => !searchQuery.trim() || (rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((rec) => (
                      <tr key={rec.intern_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px', fontWeight: 600, color: '#0f172a' }}>{rec.name}</td>
                        <td className="desktop-only" style={{ padding: '16px', textAlign: 'center' }}>
                          {rec.status === 'Present' ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              color: '#10b981', 
                              backgroundColor: '#ecfdf5', 
                              padding: '6px 12px', 
                              borderRadius: '16px', 
                              fontSize: '0.85rem', 
                              fontWeight: 600 
                            }}>
                              <CheckCircle2 size={15} /> Present
                            </span>
                          ) : (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              color: '#ef4444', 
                              backgroundColor: '#fef2f2', 
                              padding: '6px 12px', 
                              borderRadius: '16px', 
                              fontSize: '0.85rem', 
                              fontWeight: 600 
                            }}>
                              <XCircle size={15} /> Absent
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div 
                            style={{ 
                              display: 'inline-block',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleStatusToggle(rec.intern_id)}
                          >
                            <div 
                              style={{ 
                                width: '48px', 
                                height: '24px', 
                                backgroundColor: rec.status === 'Present' ? '#1e3a8a' : '#cbd5e1', 
                                borderRadius: '12px', 
                                position: 'relative', 
                                transition: 'background-color 0.2s' 
                              }}
                            >
                              <div 
                                style={{ 
                                  width: '18px', 
                                  height: '18px', 
                                  backgroundColor: 'white', 
                                  borderRadius: '50%', 
                                  position: 'absolute', 
                                  top: '3px', 
                                  left: rec.status === 'Present' ? '27px' : '3px', 
                                  transition: 'left 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)' 
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTab;
