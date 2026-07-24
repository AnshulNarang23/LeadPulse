import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, Layers, Users, FormInput } from 'lucide-react';

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
        <Link to="/" className="brand">
          <div className="brand-icon">
            <Layers size={20} />
          </div>
          <span>LeadPulse</span>
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
