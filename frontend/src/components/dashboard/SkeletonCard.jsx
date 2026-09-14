import React from 'react';

export default function SkeletonCard() {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        padding: '22px 24px',
        boxShadow: '0 2px 10px rgba(20, 45, 76, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: '340px',
      }}
    >
      <div>
        {/* Tier 1 Header: Source pill & Compare button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div className="skeleton-shimmer" style={{ width: '100px', height: '22px', borderRadius: '5px' }} />
          <div className="skeleton-shimmer" style={{ width: '80px', height: '24px', borderRadius: '6px' }} />
        </div>

        {/* Tier 2: Match pill & Opp # */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div className="skeleton-shimmer" style={{ width: '95px', height: '24px', borderRadius: '100px' }} />
          <div className="skeleton-shimmer" style={{ width: '75px', height: '20px', borderRadius: '4px' }} />
        </div>

        {/* Title (2 lines) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <div className="skeleton-shimmer" style={{ width: '92%', height: '17px' }} />
          <div className="skeleton-shimmer" style={{ width: '68%', height: '17px' }} />
        </div>

        {/* Agency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div className="skeleton-shimmer" style={{ width: '16px', height: '16px', borderRadius: '3px' }} />
          <div className="skeleton-shimmer" style={{ width: '160px', height: '14px' }} />
        </div>

        {/* Description Snippet (2 lines) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          <div className="skeleton-shimmer" style={{ width: '100%', height: '13px' }} />
          <div className="skeleton-shimmer" style={{ width: '85%', height: '13px' }} />
        </div>
      </div>

      {/* Footer Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '14px',
          borderTop: '1px solid var(--line)',
          marginTop: 'auto',
        }}
      >
        <div className="skeleton-shimmer" style={{ width: '120px', height: '14px' }} />
        <div className="skeleton-shimmer" style={{ width: '90px', height: '14px' }} />
      </div>
    </div>
  );
}
