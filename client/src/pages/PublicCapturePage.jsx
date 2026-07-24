import React, { useState } from 'react';
import { api } from '../services/api';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

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
    <div style={{ maxWidth: '640px', margin: '3rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
          <Sparkles size={16} />
          <span>Get in Touch</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          Accelerate Your Enterprise Growth
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Fill out the form below and our dedicated sales team will reach out to you within 24 hours.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Inquiry Submitted!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Thank you for contacting us, <strong>{formData.name}</strong>. One of our team members will be in touch shortly.
            </p>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setSubmitted(false);
                setFormData({ name: '', email: '', company: '', source: 'web_form' });
              }}
            >
              Submit Another Response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            {fieldErrors.length > 0 && (
              <div className="alert alert-error" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <strong>Validation Errors:</strong>
                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem' }}>
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
                placeholder="e.g. Jane Doe" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Work Email *</label>
              <input 
                type="email" 
                name="email" 
                className="form-input" 
                placeholder="jane@company.com" 
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
                placeholder="e.g. Acme Corporation" 
                value={formData.company} 
                onChange={handleChange} 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              <span>{loading ? 'Submitting...' : 'Submit Inquiry'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
