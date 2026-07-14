import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import SupervisorDashboard from './components/SupervisorDashboard';
import InternsTab from './components/InternsTab';
import AttendanceTab from './components/AttendanceTab';
import SupervisorProfile from './components/SupervisorProfile';
import AccountSecurity from './components/AccountSecurity';
import InternDashboard from './components/InternDashboard';
import { AlertTriangle, Menu, X, Loader } from 'lucide-react';

const MainLayout = ({ showNotification }) => {
  const { user, isDefaultPassword } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedInternId, setSelectedInternId] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    setSelectedInternId(null);
    setMobileSidebarOpen(false);
  };

  const handleViewInternProfile = (internId) => {
    setSelectedInternId(internId);
    setCurrentTab('interns');
  };

  const renderContent = () => {
    if (user.role === 'supervisor' || user.role === 'superuser') {
      switch (currentTab) {
        case 'dashboard':
          return (
            <SupervisorDashboard 
              onViewIntern={handleViewInternProfile} 
              showNotification={showNotification} 
            />
          );
        case 'interns':
          return (
            <InternsTab 
              selectedInternId={selectedInternId}
              setSelectedInternId={setSelectedInternId}
              showNotification={showNotification} 
            />
          );
        case 'attendance':
          return <AttendanceTab showNotification={showNotification} />;
        case 'profile':
          return <SupervisorProfile showNotification={showNotification} />;
        default:
          return <SupervisorDashboard onViewIntern={handleViewInternProfile} showNotification={showNotification} />;
      }
    } else {
      switch (currentTab) {
        case 'dashboard':
          return <InternDashboard showNotification={showNotification} />;
        case 'password':
          return <AccountSecurity showNotification={showNotification} />;
        default:
          return <InternDashboard showNotification={showNotification} />;
      }
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: '#0f172a',
        display: 'none',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between',
        zIndex: 200,
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }} className="mobile-header">
        <span style={{ color: 'white', fontWeight: 600 }}>SIWES Portal</span>
        <button 
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          {mobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>



      {/* Sidebar Navigation */}
      {mobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div className={`sidebar-wrapper ${mobileSidebarOpen ? 'open' : ''}`}>
        <Sidebar currentTab={currentTab} setCurrentTab={handleTabChange} onClose={() => setMobileSidebarOpen(false)} />
      </div>

      <div className="main-content">
        {/* Supervisor Default Password Banner */}
        {(user.role === 'supervisor' || user.role === 'superuser') && isDefaultPassword && (
          <div className="security-warning-banner">
            <AlertTriangle size={24} className="text-warning" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>Security Alert: Default Credentials Active</strong>
              <p className="banner-description" style={{ color: '#b45309', fontSize: '0.85rem', marginTop: '2px' }}>
                You are using the default password 'supervisor123'. Please configure your profile settings, security question, and update password.
              </p>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
              onClick={() => handleTabChange('profile')}
            >
              Update Profile settings
            </button>
          </div>
        )}

        {/* Intern Default Password Banner */}
        {user.role === 'intern' && isDefaultPassword && (
          <div className="security-warning-banner">
            <AlertTriangle size={24} className="text-warning" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>Security Warning: Default Password Active</strong>
              <p className="banner-description" style={{ color: '#b45309', fontSize: '0.85rem', marginTop: '2px' }}>
                You are logged in with your default password. Change your password and configure recovery questions.
              </p>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
              onClick={() => handleTabChange('password')}
            >
              Configure Account Security
            </button>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
};

const AppContent = ({ showNotification }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px'
      }}>
        <Loader className="animate-spin text-primary" size={48} />
        <p style={{ color: '#475569', fontWeight: 500 }}>Initializing portal configurations...</p>
      </div>
    );
  }

  return user ? (
    <MainLayout showNotification={showNotification} />
  ) : (
    <Login showNotification={showNotification} />
  );
};

export default function App() {
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <AuthProvider>
      <AppContent showNotification={showNotification} />
      
      {/* Toast Notification Rendering */}
      {notification && (
        <div className={`toast ${notification.type}`}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: notification.type === 'success' ? 'var(--success)' : 'var(--danger)' 
          }}></div>
          <span>{notification.message}</span>
        </div>
      )}
    </AuthProvider>
  );
}
