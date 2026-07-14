import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Settings,
  ShieldCheck,
  LogOut,
  X
} from 'lucide-react';

const Sidebar = ({ currentTab, setCurrentTab, onClose }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const supervisorMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'interns', label: 'Interns Directory', icon: <Users size={20} /> },
    { id: 'attendance', label: 'Thursday Attendance', icon: <CalendarCheck size={20} /> },
    { id: 'profile', label: 'Profile Settings', icon: <Settings size={20} /> },
  ];

  const internMenu = [
    { id: 'dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'password', label: 'Account Security', icon: <ShieldCheck size={20} /> },
  ];

  const isSupervisorView = user.role === 'supervisor' || user.role === 'superuser';
  const menuItems = isSupervisorView ? supervisorMenu : internMenu;

  return (
    <div className="sidebar">
      <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="sidebar-logo">S</div>
          <div className="sidebar-title">SIWES Portal</div>
        </div>
        {onClose && (
          <button 
            className="sidebar-close-btn" 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#94a3b8', 
              cursor: 'pointer', 
              display: 'none', 
              padding: '4px' 
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li 
            key={item.id} 
            className={`sidebar-item ${currentTab === item.id ? 'active' : ''}`}
          >
            <button onClick={() => setCurrentTab(item.id)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="user-profile-badge">
          <div className="user-avatar">
            {getInitials(user.name)}
          </div>
          <div className="user-info">
            <span className="user-name" title={user.name}>{user.name}</span>
            <span className="user-role">
              {user.role === 'superuser' ? 'System Admin' : user.role === 'supervisor' ? 'Supervisor' : 'SIWES Intern'}
            </span>
          </div>
        </div>
        
        <button className="logout-btn" onClick={logout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
