import React, { useState } from 'react';
import { api } from '../services/api';
import { CheckCircle2, ArrowRight, Building2 } from 'lucide-react';

export const PublicCapturePage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    source: 'web_form'
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors([]);

    try {
      await api.captureLead(formData);
      setSubmitted(true);
    } catch (err) {
      if (err.data && err.data.errors) {
        setFieldErrors(err.data.errors);
      } else {
        setError(err.message || 'Failed to submit inquiry.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '580px', margin: '2.5rem auto' }}>
      <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
          <Building2 size={16} />
          <span>Contact Sales</span>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Schedule a product demonstration
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Fill out the form below and a LeadPulse sales specialist will reach out to discuss your pipeline workflow.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {submitted ? (
          <div style={{ textAlign: 'left', padding: '1rem 0' }}>
            <div style={{ width: '44px', height: '44px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle2 size={24} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Inquiry Received</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Thank you for getting in touch, <strong>{formData.name}</strong>. Your inquiry has been routed to our team.
            </p>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSubmitted(false);
                setFormData({ name: '', email: '', company: '', source: 'web_form' });
              }}
            >
              Submit Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            {fieldErrors.length > 0 && (
              <div className="alert alert-error" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <strong>Validation Errors:</strong>
                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
                  {fieldErrors.map((fe, i) => (
                    <li key={i}>{fe.field}: {fe.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input 
                type="text" 
                name="name" 
                className="form-input" 
                placeholder="e.g. Akshay Kumar" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Work Email Address *</label>
              <input 
                type="email" 
                name="email" 
                className="form-input" 
                placeholder="akshay@company.com" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input 
                type="text" 
                name="company" 
                className="form-input" 
                placeholder="e.g. Cape of Good Films" 
                value={formData.company} 
                onChange={handleChange} 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              <span>{loading ? 'Submitting...' : 'Submit Demo Request'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
