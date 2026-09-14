import React, { useState } from 'react';
import { X, Lock, Mail, Building2, AlertCircle } from 'lucide-react';
import { authAPI, userAPI } from '../../services/api';

const ORG_TYPES = [
  'Nonprofit 501(c)(3)',
  'Higher Education - Public',
  'Higher Education - Private',
  'Municipality / Local Government',
  'Small Business (SBIR / STTR)',
  'Tribal Government / Organization',
  'School District / Educational Agency',
  'For-Profit Enterprise',
];

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationType, setOrganizationType] = useState(ORG_TYPES[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await authAPI.login({ email, password });
        let finalUser = data.user;

        // Auto-sync guest preferences if local selections exist and DB preferences are unconfigured
        try {
          const guestPrefsStr = localStorage.getItem('gtc360_guest_preferences');
          if (guestPrefsStr) {
            const guestPrefs = JSON.parse(guestPrefsStr);
            const hasLocalPrefs =
              (guestPrefs.targetCategories && guestPrefs.targetCategories.length > 0) ||
              (guestPrefs.targetAgencies && guestPrefs.targetAgencies.length > 0);
            const dbPrefsEmpty =
              !finalUser?.preferences ||
              (!finalUser.preferences.targetCategories?.length &&
                !finalUser.preferences.targetAgencies?.length);

            if (hasLocalPrefs && dbPrefsEmpty) {
              const updatedUser = await userAPI.updatePreferences(guestPrefs);
              if (updatedUser) finalUser = updatedUser;
            }
          }
        } catch (syncErr) {
          console.error('Failed to sync guest preferences upon login:', syncErr);
        }

        if (onSuccess) onSuccess(finalUser);
        onClose();
      } else {
        // Sign up: pass any existing guest preferences directly into signup
        let initialCategories = [];
        let initialAgencies = [];
        let initialMinAward = 0;
        let initialMaxAward = 0;
        let customKeywords = '';

        try {
          const guestPrefsStr = localStorage.getItem('gtc360_guest_preferences');
          if (guestPrefsStr) {
            const guestPrefs = JSON.parse(guestPrefsStr);
            if (guestPrefs.targetCategories) initialCategories = guestPrefs.targetCategories;
            if (guestPrefs.targetAgencies) initialAgencies = guestPrefs.targetAgencies;
            if (guestPrefs.minAward) initialMinAward = Number(guestPrefs.minAward) || 0;
            if (guestPrefs.maxAward) initialMaxAward = Number(guestPrefs.maxAward) || 0;
            if (guestPrefs.customKeywords) customKeywords = guestPrefs.customKeywords;
          }
        } catch {}

        const data = await authAPI.signup({
          email,
          password,
          organizationType,
          targetCategories: initialCategories,
          targetAgencies: initialAgencies,
        });

        let finalUser = data.user;
        if (initialMinAward > 0 || initialMaxAward > 0 || customKeywords) {
          try {
            const updated = await userAPI.updatePreferences({
              targetCategories: initialCategories,
              targetAgencies: initialAgencies,
              minAward: initialMinAward,
              maxAward: initialMaxAward,
              customKeywords,
            });
            if (updated) finalUser = updated;
          } catch {}
        }

        if (onSuccess) onSuccess(finalUser);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check your details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(12, 29, 51, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 200,
      padding: '20px',
    }}>
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        width: '100%',
        maxWidth: '440px',
        borderRadius: '12px',
        border: '1px solid var(--line)',
        boxShadow: '0 20px 40px rgba(20,45,76,0.2)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--mist)',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--display)',
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--navy)',
            }}>
              {mode === 'login' ? 'Sign In to GTC360 AI' : 'Create Organization Profile'}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
              {mode === 'login' ? 'Access your saved criteria and vector matches' : 'Configure tailored semantic funding feeds'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--line)',
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '13.5px',
              fontWeight: '600',
              color: mode === 'login' ? 'var(--navy)' : 'var(--muted)',
              borderBottom: mode === 'login' ? '2px solid var(--brass)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 0,
              borderLeft: 0,
              borderRight: 0,
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '13.5px',
              fontWeight: '600',
              color: mode === 'signup' ? 'var(--navy)' : 'var(--muted)',
              borderBottom: mode === 'signup' ? '2px solid var(--brass)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 0,
              borderLeft: 0,
              borderRight: 0,
            }}
          >
            New Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--urgent-wash)',
              color: 'var(--urgent)',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              border: '1px solid rgba(166, 58, 46, 0.2)',
            }}>
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--navy)', marginBottom: '6px' }}>
                Organization Entity Type
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '13px',
                    color: 'var(--navy)',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--navy)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.org"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  fontSize: '13.5px',
                  color: 'var(--navy)',
                  outline: 'none',
                }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--navy)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  fontSize: '13.5px',
                  color: 'var(--navy)',
                  outline: 'none',
                }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--navy)',
              color: '#FFFFFF',
              border: 0,
              borderRadius: '6px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(20,45,76,0.2)',
            }}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
