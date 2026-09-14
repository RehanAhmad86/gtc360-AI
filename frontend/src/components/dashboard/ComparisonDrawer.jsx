import React from 'react';
import { X, Layers, ExternalLink, Sparkles, Building, Calendar, Trash2, Shield } from 'lucide-react';
import { getGrantDestinationUrl } from './GrantMatchCard';

export default function ComparisonDrawer({
  comparedGrants,
  isOpen,
  onClose,
  onOpenModal,
  onRemoveGrant,
  onClearAll,
  hasActiveCriteria = false,
}) {
  if (!comparedGrants || comparedGrants.length === 0) return null;

  return (
    <>
      {/* Floating Bottom Comparison Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--navy)',
        color: '#FFFFFF',
        borderRadius: '100px',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 10px 30px rgba(12, 29, 51, 0.4)',
        zIndex: 90,
        border: '1px solid rgba(255,255,255,0.2)',
      }} className="animate-slide-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'var(--brass)',
            color: '#FFFFFF',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '12px',
            fontWeight: '700',
          }}>
            {comparedGrants.length}
          </div>
          <span style={{ fontSize: '13.5px', fontWeight: '500' }}>
            {comparedGrants.length === 1 ? '1 opportunity selected' : `${comparedGrants.length} opportunities selected`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenModal}
            style={{
              background: '#FFFFFF',
              color: 'var(--navy)',
              border: 0,
              borderRadius: '100px',
              padding: '7px 18px',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            Compare Side-by-Side
          </button>
          <button
            onClick={onClearAll}
            title="Clear comparison selection"
            style={{
              background: 'transparent',
              border: 0,
              color: 'rgba(255,255,255,0.7)',
              padding: '6px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Full Side-by-Side Comparison Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(12, 29, 51, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 250,
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
        }}>
          <div className="animate-slide-up" style={{
            background: '#FFFFFF',
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            borderRadius: '12px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 28px',
              background: 'var(--navy)',
              color: '#FFFFFF',
            }}>
              <div>
                <h3 style={{
                  fontFamily: 'var(--display)',
                  fontSize: '20px',
                  fontWeight: '600',
                  letterSpacing: '-0.02em',
                }}>
                  Side-by-Side Opportunity Comparison
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--brass-light)' }}>
                  {hasActiveCriteria
                    ? `Evaluating ${comparedGrants.length} grants across fit score, issuing body, and deadlines`
                    : `Evaluating ${comparedGrants.length} grants across issuing agency, jurisdiction, and deadlines`}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 0,
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Comparison Grid */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${comparedGrants.length}, minmax(300px, 1fr))`,
                gap: '20px',
              }}>
                {comparedGrants.map((grant) => {
                  const score = grant.score;
                  const isCalifornia = grant.source === 'california';
                  return (
                    <div
                      key={grant.grant_id}
                      style={{
                        background: 'var(--mist)',
                        border: '1px solid var(--line)',
                        borderRadius: '10px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Top Card Controls */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                      }}>
                        {hasActiveCriteria && score !== null && score !== undefined && score > 0 ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: score >= 75 ? 'var(--success-wash)' : 'var(--brass-wash)',
                            border: score >= 75 ? '1px solid rgba(30,126,82,0.3)' : '1px solid var(--line-brass)',
                            color: score >= 75 ? 'var(--success)' : 'var(--brass-text)',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            fontFamily: 'var(--display)',
                            fontWeight: '700',
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                          }}>
                            <Sparkles size={13} />
                            <span>{score}% Match</span>
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '3px 8.5px',
                            borderRadius: '5px',
                            whiteSpace: 'nowrap',
                            background: isCalifornia ? '#EFF6FF' : '#F8FAFC',
                            color: isCalifornia ? '#1D4ED8' : '#1E293B',
                            border: isCalifornia ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                          }}>
                            <Shield size={11} style={{ strokeWidth: 2.5 }} />
                            <span>{isCalifornia ? 'California State' : 'Federal Grant'}</span>
                          </div>
                        )}

                        <button
                          onClick={() => onRemoveGrant(grant.grant_id)}
                          title="Remove from comparison"
                          style={{
                            background: 'transparent',
                            border: 0,
                            color: 'var(--muted)',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Title */}
                      <h4 style={{
                        fontFamily: 'var(--display)',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'var(--navy)',
                        lineHeight: '1.3',
                        marginBottom: '12px',
                        minHeight: '42px',
                      }}>
                        {grant.title}
                      </h4>

                      {/* Agency */}
                      <div style={{
                        paddingBottom: '10px',
                        borderBottom: '1px solid var(--line)',
                        marginBottom: '12px',
                        fontSize: '13px',
                      }}>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                          Issuing Agency
                        </span>
                        <span style={{ fontWeight: '600', color: 'var(--navy)' }}>
                          {grant.agency || 'Public Agency'}
                        </span>
                      </div>

                      {/* Opportunity Number */}
                      <div style={{
                        paddingBottom: '10px',
                        borderBottom: '1px solid var(--line)',
                        marginBottom: '12px',
                        fontSize: '13px',
                      }}>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                          Opp Number / ID
                        </span>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}>
                          {grant.opp_number || grant.grant_id}
                        </span>
                      </div>

                      {/* Jurisdiction */}
                      <div style={{
                        paddingBottom: '10px',
                        borderBottom: '1px solid var(--line)',
                        marginBottom: '12px',
                        fontSize: '13px',
                      }}>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                          Jurisdiction
                        </span>
                        <span style={{ fontWeight: '600' }}>
                          {grant.source === 'california' ? 'State of California' : 'Federal (Grants.gov)'}
                        </span>
                      </div>

                      {/* Deadline */}
                      <div style={{
                        paddingBottom: '10px',
                        borderBottom: '1px solid var(--line)',
                        marginBottom: '14px',
                        fontSize: '13px',
                      }}>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                          Application Deadline
                        </span>
                        <span style={{ fontWeight: '600', color: 'var(--navy)' }}>
                          {grant.close_date || 'Rolling / Unspecified'}
                        </span>
                      </div>

                      {/* Description Snippet */}
                      <div style={{ flex: 1, marginBottom: '16px' }}>
                        <span style={{ color: 'var(--muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>
                          Scope &amp; Objectives
                        </span>
                        <p style={{
                          fontSize: '12.5px',
                          color: '#526071',
                          lineHeight: '1.5',
                          maxHeight: '140px',
                          overflowY: 'auto',
                        }}>
                          {grant.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Action Link */}
                      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                        <a
                          href={getGrantDestinationUrl(grant)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: 'var(--navy)',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            padding: '10px',
                            fontSize: '13px',
                            fontWeight: '600',
                          }}
                        >
                          <span>Official Solicitation</span>
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
