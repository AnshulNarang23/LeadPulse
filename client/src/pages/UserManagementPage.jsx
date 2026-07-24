import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, Users, CheckCircle2 } from 'lucide-react';

export const UserManagementPage = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err) {
      setError(err.message || 'Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.createUser(formData);
      setSuccess(`User ${res.user.name} (${res.user.email}) created successfully!`);
      setFormData({ name: '', email: '', password: '', role: 'member' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="alert alert-error" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        Forbidden: You do not have permission to view User Management.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Staff User Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Admin Portal: Provision team members and manage access permissions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Users List */}
        <div>
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 700 }}>{u.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <span className={`role-tag ${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Form */}
        <div>
          <div className="card">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} style={{ color: 'var(--primary)' }} />
              <span>Create New Staff Account</span>
            </h2>

            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="form-input" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input 
                  type="email" 
                  name="email" 
                  className="form-input" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Password *</label>
                <input 
                  type="password" 
                  name="password" 
                  className="form-input" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Assignment *</label>
                <select 
                  name="role" 
                  className="form-select" 
                  value={formData.role} 
                  onChange={handleChange}
                >
                  <option value="member">Member (Sales Representative)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={creating}>
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
