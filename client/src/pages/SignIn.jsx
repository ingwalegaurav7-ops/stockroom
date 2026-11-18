import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Warehouse } from 'lucide-react';
import { useAuth } from '../hooks/useApi';
import { useAuthStore } from '../hooks/useAuthStore';

export function SignIn() {
  const navigate = useNavigate();
  const { login, loading: authLoading } = useAuth();
  const { setUser, setIsAuthenticated } = useAuthStore();

  const [email, setEmail] = useState('demo@stockroom.local');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user } = await login(email, password);
      setUser(user);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="signin-page" role="main">
      {/* Visual Panel - Desktop only */}
      <div className="signin-visual hidden lg:flex">
        <div className="signin-visual-content">
          <div className="signin-visual-icon" aria-hidden="true">
            <Warehouse size={40} />
          </div>
          <h2 className="signin-visual-title">Stockroom</h2>
          <p className="signin-visual-text">
            Complete inventory, order, and restock management for your store.
            Track stock levels, process orders, and gain actionable business insights.
          </p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="signin-form-container">
        <form className="signin-form" ref={formRef} onSubmit={handleSubmit} noValidate>
          {/* Brand */}
          <div className="signin-brand" aria-hidden="true">
            <div className="signin-brand-icon">
              <Warehouse size={20} />
            </div>
            <span>Stockroom</span>
          </div>

          {/* Heading */}
          <h1 className="signin-heading">Welcome back</h1>
          <p className="signin-subheading">Sign in to manage your inventory</p>

          {/* Error */}
          {error && (
            <div className="alert alert-danger" role="alert">
              <svg className="alert-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div className="alert-content">
                <p className="alert-message">{error}</p>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Work Email</label>
            <div className="input-with-icon">
              <svg className="icon" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
                disabled={isLoading}
                aria-describedby={error ? 'email-error' : undefined}
              />
            </div>
            {error && <p id="email-error" className="form-error" role="alert">{error}</p>}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-with-icon">
              <svg className="icon" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="form-input padded-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="icon-right btn-ghost"
                onClick={togglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading || authLoading}
          >
            {(isLoading || authLoading) ? (
              <>
                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} aria-hidden="true" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Demo Credentials */}
          <div className="signin-demo">
            <strong>Demo Credentials:</strong><br />
            Email: <code>demo@stockroom.local</code><br />
            Password: <code>demo123</code>
          </div>

          {/* Footer */}
          <div className="signin-footer">
            <p>Stockroom — Inventory Analytics & Operations</p>
          </div>
        </form>
      </div>
    </div>
  );
}