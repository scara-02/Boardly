import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { KanbanSquare } from 'lucide-react';

const Signup = () => {
  const [tenantName, setTenantName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signup(tenantName, email, password, name);
      navigate('/board');
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create workspace. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={authContainerStyle}>
      <div className="auth-card" style={authCardStyle}>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="logo-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: 'var(--primary)' }}>
            <KanbanSquare size={40} />
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>Boardly</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Create a new workspace for your team.</p>
        </div>

        {error && <div className="auth-error" style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div className="form-group" style={formGroupStyle}>
            <label htmlFor="tenantName" style={labelStyle}>Workspace Name</label>
            <input 
              type="text" 
              id="tenantName" 
              value={tenantName} 
              onChange={(e) => setTenantName(e.target.value)} 
              required 
              placeholder="Acme Corp"
              style={inputStyle}
            />
          </div>

          <div className="form-group" style={formGroupStyle}>
            <label htmlFor="name" style={labelStyle}>Your Name</label>
            <input 
              type="text" 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              placeholder="Jane Doe"
              style={inputStyle}
            />
          </div>

          <div className="form-group" style={formGroupStyle}>
            <label htmlFor="email" style={labelStyle}>Email Address</label>
            <input 
              type="email" 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="jane@acme.com"
              style={inputStyle}
            />
          </div>

          <div className="form-group" style={formGroupStyle}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              minLength={6}
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Creating Workspace...' : 'Create Workspace'}
          </button>
        </form>
        
        <div className="auth-footer" style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have a workspace? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
};

// Inline styles for auth components mapping to the premium dynamic design from Boardly
const authContainerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: 'var(--bg-primary)',
  background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
  fontFamily: 'var(--font-family)',
  padding: '2rem',
};

const authCardStyle = {
  backgroundColor: 'var(--card-bg)',
  padding: '3rem',
  borderRadius: '16px',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
  width: '100%',
  maxWidth: '450px',
  border: '1px solid var(--border-color)',
  backdropFilter: 'blur(10px)',
};

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const labelStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: 'var(--text-primary)',
};

const inputStyle = {
  padding: '0.8rem 1rem',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: '1rem',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const buttonStyle = {
  padding: '1rem',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--primary)',
  color: 'white',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s, transform 0.1s',
  marginTop: '1rem',
};

const errorStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  color: 'var(--urgent)',
  padding: '1rem',
  borderRadius: '8px',
  marginBottom: '1.5rem',
  fontSize: '0.9rem',
  border: '1px solid rgba(239, 68, 68, 0.2)',
};

export default Signup;
