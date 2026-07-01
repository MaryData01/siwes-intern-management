import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Plus, Save, Edit2, Check, X, Award, Loader } from 'lucide-react';

const QuizzesTab = ({ showNotification }) => {
  const { authenticatedFetch } = useAuth();
  
  // Matrix data state
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditScoresModal, setShowEditScoresModal] = useState(false);
  
  // Create Quiz Form State
  const [quizName, setQuizName] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [quizDate, setQuizDate] = useState('');
  const [initialScores, setInitialScores] = useState({}); // { intern_id: score }
  
  // Edit Scores Modal State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [editScores, setEditScores] = useState({}); // { intern_id: score }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/supervisor/quizzes/matrix');
      if (response.ok) {
        const data = await response.json();
        setMatrixData(data);
      } else {
        showNotification('Failed to load quiz matrix', 'error');
      }
    } catch (err) {
      showNotification('Error loading quizzes data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    // Set default date to today
    setQuizDate(new Date().toISOString().split('T')[0]);
    setQuizName('');
    setWeekNumber('');
    
    // Initialize empty scores for all active interns in matrix
    const scores = {};
    if (matrixData && matrixData.interns) {
      matrixData.interns.forEach(intern => {
        scores[intern.id] = '';
      });
    }
    setInitialScores(scores);
    setShowAddModal(true);
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!quizName.trim() || !weekNumber || !quizDate) {
      showNotification('Please fill in quiz parameters', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Filter out empty score strings
      const scoresPayload = {};
      Object.keys(initialScores).forEach(id => {
        const val = initialScores[id];
        if (val !== '') {
          scoresPayload[id] = parseFloat(val);
        }
      });

      const response = await authenticatedFetch('/api/supervisor/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          name: quizName.trim(),
          week_number: parseInt(weekNumber),
          date: quizDate,
          scores: scoresPayload
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification(`Quiz "${quizName}" created and scores logged!`, 'success');
        setShowAddModal(false);
        fetchMatrix();
      } else {
        showNotification(data.message || 'Failed to create quiz', 'error');
      }
    } catch (err) {
      showNotification('Connection error while saving quiz', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditScores = (quiz) => {
    setActiveQuiz(quiz);
    
    // Map existing scores from matrix data
    const scores = {};
    if (matrixData && matrixData.interns) {
      matrixData.interns.forEach(intern => {
        const key = `${intern.id}_${quiz.id}`;
        scores[intern.id] = matrixData.scores[key] !== undefined ? matrixData.scores[key] : '';
      });
    }
    
    setEditScores(scores);
    setShowEditScoresModal(true);
  };

  const handleSaveScores = async (e) => {
    e.preventDefault();
    if (!activeQuiz) return;

    setSubmitting(true);
    try {
      // Filter out empty values
      const scoresPayload = {};
      Object.keys(editScores).forEach(id => {
        const val = editScores[id];
        if (val !== '') {
          scoresPayload[id] = parseFloat(val);
        }
      });

      const response = await authenticatedFetch(`/api/supervisor/quizzes/${activeQuiz.id}/scores`, {
        method: 'POST',
        body: JSON.stringify({
          scores: scoresPayload
        })
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Quiz scores updated successfully!', 'success');
        setShowEditScoresModal(false);
        fetchMatrix();
      } else {
        showNotification(data.message || 'Failed to update scores', 'error');
      }
    } catch (err) {
      showNotification('Connection error while updating scores', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitialScoreChange = (internId, value) => {
    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setInitialScores(prev => ({ ...prev, [internId]: value }));
    }
  };

  const handleEditScoreChange = (internId, value) => {
    if (value === '' || (parseFloat(value) >= 0 && parseFloat(value) <= 100)) {
      setEditScores(prev => ({ ...prev, [internId]: value }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Quiz Assessment Matrix</h1>
          <p>Create quizzes, log intern scores, and evaluate performance trends</p>
        </div>
        <button 
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onClick={handleOpenAddModal}
        >
          <Plus size={18} /> Create Quiz Entry
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader className="animate-spin text-primary" size={32} />
        </div>
      ) : !matrixData || matrixData.interns.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 0' }}>
          <BookOpen size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <h3>No active interns registered</h3>
          <p style={{ color: '#64748b' }}>Please register active interns in the directory before creating quizzes.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'visible' }}>
          <div className="card-title">Performance Scoreboard Matrix</div>
          
          {matrixData.quizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              No quizzes recorded yet. Click "Create Quiz Entry" to start recording assessment results.
            </div>
          ) : (
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: '180px' }}>Intern Name</th>
                    {matrixData.quizzes.map((quiz) => (
                      <th key={quiz.id} style={{ minWidth: '120px' }}>
                        <div style={{ fontWeight: 600 }}>{quiz.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>
                          Week {quiz.week_number} • {quiz.date}
                        </div>
                        <button 
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.65rem', marginTop: '6px' }}
                          onClick={() => handleOpenEditScores(quiz)}
                        >
                          Edit Scores
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.interns.map((intern) => (
                    <tr key={intern.id}>
                      <td style={{ textAlign: 'left', fontWeight: 600 }}>
                        <div>{intern.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>
                          Matric: {intern.matric_number}
                        </div>
                      </td>
                      {matrixData.quizzes.map((quiz) => {
                        const scoreKey = `${intern.id}_${quiz.id}`;
                        const score = matrixData.scores[scoreKey];
                        return (
                          <td key={quiz.id} style={{ fontWeight: 600 }}>
                            {score !== undefined ? (
                              <span className={score >= 70 ? 'text-success' : score < 50 ? 'text-danger' : ''}>
                                {score}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE QUIZ MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>New Quiz Assessment</h2>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreateQuiz}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Quiz / Exam Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Quiz 4: API Testing"
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group row">
                  <div>
                    <label className="form-label">Training Week Number</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="1"
                      placeholder="e.g. 4"
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(e.target.value)}
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Assessment Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={quizDate}
                      onChange={(e) => setQuizDate(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                {/* Score Input List */}
                <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <label className="form-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} /> Enter Intern Scores (0-100)
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {matrixData && matrixData.interns.map((intern) => (
                      <div key={intern.id} className="flex-between" style={{ padding: '6px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{intern.name}</span>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '80px', padding: '6px 10px', textAlign: 'center' }}
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="—"
                          value={initialScores[intern.id] || ''}
                          onChange={(e) => handleInitialScoreChange(intern.id, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
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
                  {submitting ? 'Saving...' : 'Save Quiz & Scores'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCORES MODAL */}
      {showEditScoresModal && activeQuiz && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Quiz Scores</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{activeQuiz.name}</p>
              </div>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setShowEditScoresModal(false)}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveScores}>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {matrixData && matrixData.interns.map((intern) => (
                    <div key={intern.id} className="flex-between" style={{ padding: '6px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{intern.name}</span>
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ width: '80px', padding: '6px 10px', textAlign: 'center' }}
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="—"
                        value={editScores[intern.id] === undefined ? '' : editScores[intern.id]}
                        onChange={(e) => handleEditScoreChange(intern.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEditScoresModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update Scores'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizzesTab;
