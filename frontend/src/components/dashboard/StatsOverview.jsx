import React from 'react';
import { Target, Sparkles, Building, Search, X, SlidersHorizontal, Info } from 'lucide-react';

export default function StatsOverview({
  totalMatches,
  topScore,
  categories = [],
  agencies = [],
  searchQuery,
  onSearchChange,
  onOpenPreferences,
  sourceFilter,
  onSourceFilterChange,
  hasActiveCriteria = false,
}) {
  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Informative Activation Banner if criteria not yet configured */}
      {!hasActiveCriteria && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            background: 'var(--brass-wash)',
            border: '1px solid var(--line-brass)',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={18} style={{ color: 'var(--brass-text)', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--brass-text)', lineHeight: 1.4 }}>
              <strong>Personalize Your Matching:</strong> You are currently exploring all live funding opportunities. Click <strong>Preferences</strong> to set your focus areas (e.g. Clean Energy, Public Health, STEM) and activate personalized AI vector scores.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPreferences}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--navy)',
              color: '#FFFFFF',
              border: 0,
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <SlidersHorizontal size={13} style={{ color: 'var(--brass-light)' }} />
            <span>Set Preferences</span>
          </button>
        </div>
      )}

      {/* 4 Executive Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Total Opportunities */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(20,45,76,0.03)',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              fontWeight: '700',
              letterSpacing: '0.05em',
            }}
          >
            {hasActiveCriteria ? 'Personalized Matches' : 'Live Opportunities'}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--display)',
                fontSize: '28px',
                fontWeight: '700',
                color: 'var(--navy)',
              }}
            >
              {totalMatches.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {hasActiveCriteria ? 'ranked by AI' : 'total in database'}
            </span>
          </div>
        </div>

        {/* Card 2: Highest Fit Score */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(20,45,76,0.03)',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              fontWeight: '700',
              letterSpacing: '0.05em',
            }}
          >
            {hasActiveCriteria ? 'Top AI Match Score' : 'AI Scoring Engine'}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            {hasActiveCriteria ? (
              <>
                <span
                  style={{
                    fontFamily: 'var(--display)',
                    fontSize: '28px',
                    fontWeight: '700',
                    color: topScore >= 75 ? 'var(--success)' : 'var(--brass-text)',
                  }}
                >
                  {topScore ? `${topScore}%` : '—'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>cosine alignment</span>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontFamily: 'var(--display)',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--brass-text)',
                  }}
                >
                  Sub-10ms
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>vector latency</span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Active Focus Categories */}
        <div
          onClick={onOpenPreferences}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(20,45,76,0.03)',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          className="metric-card-hover"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                fontWeight: '700',
                letterSpacing: '0.05em',
              }}
            >
              Focus Domains
            </span>
            <span style={{ fontSize: '11px', color: 'var(--brass-text)', fontWeight: '600' }}>
              {categories.length > 0 ? 'Edit' : 'Configure'}
            </span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--navy)' }}>
            {categories.length > 0 ? `${categories.length} areas active` : 'General Catalog Scope'}
          </div>
          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--muted)',
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {categories.length > 0
              ? categories.slice(0, 2).join(', ') + (categories.length > 2 ? '...' : '')
              : 'Click to set preferences'}
          </div>
        </div>

        {/* Card 4: Agency Boost */}
        <div
          onClick={onOpenPreferences}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(20,45,76,0.03)',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          className="metric-card-hover"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                fontWeight: '700',
                letterSpacing: '0.05em',
              }}
            >
              Target Agencies
            </span>
            <span style={{ fontSize: '11px', color: 'var(--brass-text)', fontWeight: '600' }}>
              {agencies.length > 0 ? 'Edit' : 'Set'}
            </span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: '600', color: 'var(--navy)' }}>
            {agencies.length > 0 ? `${agencies.length} agencies targeted` : 'All Federal & State'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
            {agencies.length > 0 ? agencies.join(', ') : '+12% boost on preferred sponsors'}
          </div>
        </div>
      </div>

      {/* Filter and Instant Search Bar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--line)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(20,45,76,0.03)',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by keyword, agency, opportunity number, or subject..."
            style={{
              width: '100%',
              padding: '9px 32px 9px 36px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              background: 'var(--mist)',
              fontSize: '13.5px',
              color: 'var(--navy)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 0,
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Source Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: '500' }}>Jurisdiction:</span>
          <select
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid var(--line)',
              fontSize: '13px',
              color: 'var(--navy)',
              background: '#FFFFFF',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            <option value="all">All Jurisdictions (Federal + CA)</option>
            <option value="federal">Federal Grants (Grants.gov)</option>
            <option value="california">State of California</option>
          </select>
        </div>
      </div>
    </div>
  );
}
