import React from 'react';
import { Sliders, User, LogOut, ShieldCheck, Lock } from 'lucide-react';
import { authAPI } from '../../services/api';

export default function Navbar({
  user,
  onOpenAuth,
  onOpenPreferences,
  onOpenCompare,
  compareCount,
  onSyncGrants,
  isSyncing,
  systemStatus,
  hasSavedPreferences,
}) {
  const hasPreferences = Boolean(
    hasSavedPreferences ?? (
      user && user.preferences && (
        (user.preferences.targetCategories && user.preferences.targetCategories.length > 0) ||
        (user.preferences.targetAgencies && user.preferences.targetAgencies.length > 0) ||
        (user.preferences.customKeywords && user.preferences.customKeywords.trim().length > 0)
      )
    )
  );
  return (
    <header style={{
      background: 'var(--navy)',
      color: '#FFFFFF',
      borderBottom: '1px solid rgba(219, 225, 233, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(10px)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px',
      }}>
        {/* Brand Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              flexShrink: 0,
            }}
            title="GTC Advisors — 360° AI"
          >
            <img
              src="/blue-outline-hz-1-1536x649.png"
              alt="GTC Advisors"
              style={{
                height: '38px',
                width: 'auto',
                borderRadius: '5px',
                objectFit: 'contain',
                display: 'block',
                background: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                transition: 'transform 0.15s ease',
              }}
              className="navbar-brand-logo"
            />
          </a>

          <div
            style={{
              width: '1px',
              height: '28px',
              background: 'rgba(255, 255, 255, 0.18)',
              flexShrink: 0,
            }}
            className="brand-divider"
          />

          <div className="brand-text-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: '700',
                  fontSize: '18px',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                360° AI
              </span>
              <span
                className="brand-badge"
                style={{
                  fontSize: '10.5px',
                  background: 'rgba(255,255,255,0.12)',
                  color: 'var(--brass-light)',
                  padding: '2px 7px',
                  borderRadius: '100px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                Semantic Engine
              </span>
            </div>
            <p
              className="brand-tagline"
              style={{
                fontSize: '11.5px',
                color: 'rgba(255,255,255,0.65)',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              Executive Funding Intelligence &amp; Vector Matching
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Preferences Button */}
          <button
            onClick={() => {
              if (!user) {
                onOpenAuth();
              } else {
                onOpenPreferences();
              }
            }}
            title={!user ? 'Sign in to configure preferences' : 'Configure AI matching preferences'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#FFFFFF',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {!user ? (
              <Lock size={13} style={{ color: 'var(--brass-light)' }} />
            ) : (
              <Sliders size={14} style={{ color: 'var(--brass-light)' }} />
            )}
            <span>Preferences</span>
            {user && hasPreferences && user?.preferences?.targetCategories?.length > 0 && (
              <span
                style={{
                  background: 'var(--brass)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '1px 6px',
                  borderRadius: '100px',
                  marginLeft: '2px',
                }}
              >
                {user.preferences.targetCategories.length}
              </span>
            )}
          </button>

          {/* User Auth Section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '6px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.12)',
                padding: '6px 12px',
                borderRadius: '6px',
              }}>
                <User size={15} style={{ color: 'var(--brass-light)' }} />
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600' }}>
                    {user.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.6)' }}>
                    {user.organizationType || 'User'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => authAPI.logout()}
                title="Log out"
                style={{
                  background: 'transparent',
                  border: '0',
                  color: 'rgba(255,255,255,0.7)',
                  display: 'grid',
                  placeItems: 'center',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                background: 'var(--brass)',
                color: '#FFFFFF',
                border: '0',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13.5px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(149,128,100,0.3)',
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
