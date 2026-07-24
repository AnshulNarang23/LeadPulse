import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Activity } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
          <Activity size={24} style={{ color: 'var(--primary)', strokeWidth: 2.5 }} />
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--primary)' }}>Lead</span>
            <span style={{ color: 'var(--text-main)' }}>Pulse</span>
          </span>
        </Link>

        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            Public Form
          </Link>
          
          {user && (
            <Link 
              to="/dashboard" 
              className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          )}

          {user && isAdmin && (
            <Link 
              to="/users" 
              className={`nav-item ${location.pathname === '/users' ? 'active' : ''}`}
            >
              User Management
            </Link>
          )}
        </div>

        <div className="user-section">
          {user ? (
            <>
              <div className="user-badge">
                <User size={16} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
                <span className={`role-tag ${user.role}`}>
                  {user.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Staff Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
