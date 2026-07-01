import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Star, Save, Info, Check, Loader } from 'lucide-react';

const ReviewsTab = ({ showNotification }) => {
  const { authenticatedFetch } = useAuth();
  
  // States
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [loading, setLoading] = useState(false);
  const [internsReviews, setInternsReviews] = useState([]);
  
  // Track input states locally per intern ID to support editing
  // { [internId]: { presentation_summary, supervisor_notes, rating, submitting } }
  const [formStates, setFormStates] = useState({});

  useEffect(() => {
    if (selectedWeek) {
      fetchReviews(selectedWeek);
    }
  }, [selectedWeek]);

  const fetchReviews = async (weekNum) => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`/api/supervisor/reviews?week_number=${weekNum}`);
      if (response.ok) {
        const data = await response.json();
        setInternsReviews(data);
        
        // Populate local form states from fetched data
        const initialFormStates = {};
        data.forEach(item => {
          initialFormStates[item.intern_id] = {
            presentation_summary: item.presentation_summary,
            supervisor_notes: item.supervisor_notes,
            rating: item.rating || 5,
            submitting: false
          };
        });
        setFormStates(initialFormStates);
      } else {
        showNotification('Failed to fetch reviews', 'error');
      }
    } catch (err) {
      showNotification('Error connecting to review endpoint', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (internId, field, value) => {
    setFormStates(prev => ({
      ...prev,
      [internId]: {
        ...prev[internId],
        [field]: value
      }
    }));
  };

  const handleStarClick = (internId, ratingValue) => {
    handleInputChange(internId, 'rating', ratingValue);
  };

  const handleSaveReview = async (internId) => {
    const formState = formStates[internId];
    if (!formState) return;

    if (!formState.presentation_summary.trim() || !formState.supervisor_notes.trim()) {
      showNotification('Please fill in both the presentation summary and supervisor feedback notes', 'error');
      return;
    }

    // Set submitting flag for this specific intern card
    setFormStates(prev => ({
      ...prev,
      [internId]: { ...prev[internId], submitting: true }
    }));

    try {
      const response = await authenticatedFetch('/api/supervisor/reviews', {
        method: 'POST',
        body: JSON.stringify({
          week_number: parseInt(selectedWeek),
          intern_id: internId,
          presentation_summary: formState.presentation_summary.trim(),
          supervisor_notes: formState.supervisor_notes.trim(),
          rating: formState.rating
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification(`Review for ${internsReviews.find(i => i.intern_id === internId)?.name} saved successfully!`, 'success');
        // Refresh list to show logged status
        fetchReviews(selectedWeek);
      } else {
        showNotification(data.message || 'Failed to log review', 'error');
        // Reset submitting flag
        setFormStates(prev => ({
          ...prev,
          [internId]: { ...prev[internId], submitting: false }
        }));
      }
    } catch (err) {
      showNotification('Connection error while logging review', 'error');
      setFormStates(prev => ({
        ...prev,
        [internId]: { ...prev[internId], submitting: false }
      }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Weekly Progress Reviews</h1>
          <p>Evaluate intern presentations, log critical supervisor feedback, and set weekly ratings</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '260px 1fr' }}>
        {/* Left selector */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title" style={{ fontSize: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
            Select Training Week
          </div>
          <div className="form-group">
            <label className="form-label">SIWES Training Week</label>
            <select 
              className="form-input form-select"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {[...Array(12).keys()].map((num) => (
                <option key={num + 1} value={num + 1}>Week {num + 1}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, display: 'flex', gap: '6px', marginTop: '16px' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>You can log ratings from 1 to 5 stars. High ratings (4-5) denote exceptional performance.</span>
          </div>
        </div>

        {/* Right Listing Panel */}
        <div>
          {loading ? (
            <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Loader className="animate-spin text-primary" size={32} />
            </div>
          ) : internsReviews.length === 0 ? (
            <div className="card text-center" style={{ padding: '48px 0', color: '#94a3b8' }}>
              No active interns registered. Registration must occur before evaluations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {internsReviews.map((intern) => {
                const fs = formStates[intern.intern_id] || { presentation_summary: '', supervisor_notes: '', rating: 5, submitting: false };
                return (
                  <div key={intern.intern_id} className="card" style={{ marginBottom: 0 }}>
                    <div className="flex-between" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{intern.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>Matric: {intern.matric_number}</p>
                      </div>
                      
                      <div className="flex-between" style={{ gap: '12px' }}>
                        {intern.is_logged && (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> Logged
                          </span>
                        )}
                        
                        {/* Star widget */}
                        <div className="rating-stars">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <Star 
                              key={starVal}
                              size={20}
                              className={`star ${starVal <= fs.rating ? 'active' : ''}`}
                              onClick={() => handleStarClick(intern.intern_id, starVal)}
                              style={{ cursor: 'pointer', fill: starVal <= fs.rating ? '#f59e0b' : 'none' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Presentation Summary</label>
                      <textarea 
                        className="form-input" 
                        rows="2"
                        placeholder="Detail what technical achievements or topics the intern presented this week..."
                        value={fs.presentation_summary}
                        onChange={(e) => handleInputChange(intern.intern_id, 'presentation_summary', e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Supervisor Notes & Feedback</label>
                      <textarea 
                        className="form-input" 
                        rows="2"
                        placeholder="Log constructive evaluation notes, mentoring advice, and feedback..."
                        value={fs.supervisor_notes}
                        onChange={(e) => handleInputChange(intern.intern_id, 'supervisor_notes', e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleSaveReview(intern.intern_id)}
                        disabled={fs.submitting}
                      >
                        <Save size={14} /> {fs.submitting ? 'Saving Review...' : intern.is_logged ? 'Update Evaluation Log' : 'Save Evaluation Log'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsTab;
