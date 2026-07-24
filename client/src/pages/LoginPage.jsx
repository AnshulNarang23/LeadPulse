import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, ShieldCheck, UserCheck, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@example.com');
    setPassword('AdminPass123!');
  };

  const fillDemoMember = () => {
    setEmail('member@example.com');
    setPassword('MemberPass123!');
  };

  return (
    <div style={{ maxWidth: '960px', margin: '2.5rem auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'center' }}>
        
        {/* Left Column: B2B Value Proposition */}
        <div style={{ paddingRight: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div className="brand-icon">
              <Layers size={18} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>LeadPulse</span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', color: 'var(--text-main)', marginBottom: '1rem' }}>
            Streamline your sales pipeline with zero friction.
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Unified lead capture, automated audit activity logs, and strict role-based access control built for high-velocity sales teams.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>
              <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
              <span>Role-Based Access Control (Admin & Member permissions)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>
              <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
              <span>Immutable activity audit logs on all status changes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>
              <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
              <span>Public lead capture with rate-limiting & input validation</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Form */}
        <div className="card">
          <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Sign in to LeadPulse
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Enter your credentials to access your sales workspace.
            </p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="user@example.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Reviewer Quick-Fill Bar */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
              Reviewer Quick-Fill Accounts
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={fillDemoAdmin}>
                <ShieldCheck size={14} style={{ color: 'var(--role-admin-text)' }} />
                <span>Fill Admin</span>
              </button>

              <button type="button" className="btn btn-secondary btn-sm" onClick={fillDemoMember}>
                <UserCheck size={14} style={{ color: 'var(--role-member-text)' }} />
                <span>Fill Member</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
