import React from 'react';
import { ExternalLink, Check, Plus, Sparkles, Building2, Calendar, Shield } from 'lucide-react';

/**
 * Generate clean URL slug from opportunity title
 */
function slugify(text) {
  if (!text) return 'grant-opportunity';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format destination URL according to GTC360 routing structure:
 * - Federal: https://gtc360.com/grants/{title-slug}/{id}/
 * - California: https://gtc360.com/grants/california/{title-slug}/{id}/
 */
export function getGrantDestinationUrl(grant) {
  const isCalifornia = grant.source === 'california';
  const slug = slugify(grant.title);
  let id = (grant.grant_id || grant.opp_number || '').toString().trim();

  if (isCalifornia) {
    id = id.replace(/^CA-/, '').trim();
    return `https://gtc360.com/grants/california/${slug}/${id}/`;
  }

  return `https://gtc360.com/grants/${slug}/${id}/`;
}

/**
 * Format date string into executive format (e.g., "Nov 16, 2026") or "Rolling"
 */
function formatDueDate(dateStr) {
  if (!dateStr) return 'Rolling';
  const clean = dateStr.trim();
  const lower = clean.toLowerCase();
  if (
    lower.includes('ongoing') ||
    lower.includes('rolling') ||
    lower.includes('unspecified') ||
    lower.includes('n/a')
  ) {
    return 'Rolling';
  }

  // Handle MM/DD/YYYY format from Grants.gov
  const parts = clean.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // Handle ISO or standard date formats
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return clean;
}

/**
 * Determine if opportunity is closing soon (<7 days or <30 days)
 */
function getUrgencyStatus(dateStr) {
  if (!dateStr) return null;
  const lower = dateStr.trim().toLowerCase();
  if (
    lower.includes('ongoing') ||
    lower.includes('rolling') ||
    lower.includes('unspecified') ||
    lower.includes('n/a')
  ) {
    return null;
  }

  let dateObj = null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
  } else {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) dateObj = new Date(parsed);
  }

  if (!dateObj || isNaN(dateObj.getTime())) return null;

  const diffMs = dateObj.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 0 && diffDays <= 7) {
    return { label: 'Closing Soon', type: 'urgent' };
  }
  if (diffDays > 7 && diffDays <= 30) {
    return { label: 'Under 30 Days', type: 'soon' };
  }
  return null;
}

export default function GrantMatchCard({
  grant,
  isCompared,
  onToggleCompare,
  hasActiveCriteria = false,
  user = null,
}) {
  const score = grant.score || 0;
  const isHighMatch = score >= 75;
  const isMediumMatch = score >= 50 && score < 75;

  const isCalifornia = grant.source === 'california';
  const formattedDueDate = formatDueDate(grant.close_date);
  const urgency = getUrgencyStatus(grant.close_date);
  const destinationUrl = getGrantDestinationUrl(grant);

  return (
    <article
      style={{
        background: '#FFFFFF',
        border: isCompared ? '1.5px solid var(--brass)' : '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '24px 22px 14px',
        boxShadow: isCompared
          ? '0 6px 20px rgba(149, 128, 100, 0.16)'
          : '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
      }}
      className="grant-card-hover"
    >
      {/* Floating AI Match Score Badge: Half outside, half inside, horizontally dead-center */}
      {hasActiveCriteria && grant.score !== null && grant.score !== undefined && (
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            background: isHighMatch ? '#ECFDF5' : isMediumMatch ? '#FFFBEB' : '#F8FAFC',
            border: isHighMatch
              ? '1.5px solid #10B981'
              : isMediumMatch
              ? '1.5px solid #F59E0B'
              : '1.5px solid #94A3B8',
            color: isHighMatch ? '#065F46' : isMediumMatch ? '#92400E' : '#334155',
            padding: '4px 12px',
            borderRadius: '100px',
            fontFamily: 'var(--display)',
            fontWeight: '700',
            fontSize: '12.5px',
            lineHeight: '1.2',
            letterSpacing: '-0.01em',
            boxShadow: isHighMatch
              ? '0 2px 8px rgba(16, 185, 129, 0.2), 0 1px 3px rgba(0,0,0,0.06)'
              : isMediumMatch
              ? '0 2px 8px rgba(245, 158, 11, 0.2), 0 1px 3px rgba(0,0,0,0.06)'
              : '0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0,0,0,0.04)',
            pointerEvents: 'none',
          }}
        >
          <Sparkles size={13} style={{ flexShrink: 0 }} />
          <span>{score}% Match</span>
        </div>
      )}

      {/* Top Body Section */}
      <div>
        {/* Row 1: Source Jurisdiction & Compare Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '10px',
            flexWrap: 'nowrap',
          }}
        >
          {/* Left: Jurisdiction Source Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4.5px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '2.5px 7.5px',
              borderRadius: '5px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: isCalifornia ? '#EFF6FF' : '#F8FAFC',
              color: isCalifornia ? '#1D4ED8' : '#1E293B',
              border: isCalifornia ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
            }}
          >
            <Shield size={11} style={{ strokeWidth: 2.5 }} />
            <span>{isCalifornia ? 'California State' : 'Federal Grant'}</span>
          </span>

          {/* Right: Compare Toggle Action - Available for logged in users */}
          {user && (
            <button
              type="button"
              onClick={() => onToggleCompare(grant)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: isCompared ? 'var(--navy)' : '#FFFFFF',
                border: isCompared ? '1px solid var(--navy)' : '1px solid #E2E8F0',
                color: isCompared ? '#FFFFFF' : '#475569',
                borderRadius: '5px',
                padding: '3px 8.5px',
                fontSize: '11px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              className="compare-btn"
            >
              {isCompared ? (
                <>
                  <Check size={11} style={{ strokeWidth: 3 }} />
                  <span>In Compare</span>
                </>
              ) : (
                <>
                  <Plus size={11} />
                  <span>Compare</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Row 2: Opp ID & Opp Status Badge */}
        {(grant.opp_number || grant.opp_status) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            {grant.opp_number && (
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '2px 7.5px',
                  borderRadius: '4px',
                  color: '#475569',
                  whiteSpace: 'nowrap',
                }}
                title={`Opportunity Number: ${grant.opp_number}`}
              >
                #{grant.opp_number}
              </span>
            )}

            {grant.opp_status && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4.5px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  padding: '2px 7.5px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  background:
                    grant.opp_status.toLowerCase() === 'forecasted'
                      ? '#FFFBEB'
                      : '#ECFDF5',
                  color:
                    grant.opp_status.toLowerCase() === 'forecasted'
                      ? '#B45309'
                      : '#047857',
                  border:
                    grant.opp_status.toLowerCase() === 'forecasted'
                      ? '1px solid #FDE68A'
                      : '1px solid #A7F3D0',
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background:
                      grant.opp_status.toLowerCase() === 'forecasted'
                        ? '#D97706'
                        : '#10B981',
                  }}
                />
                <span>{grant.opp_status}</span>
              </span>
            )}
          </div>
        )}

        {/* Row 3: Opportunity Title (Consistent 2-line height baseline) */}
        <h3
          style={{
            fontFamily: 'var(--display)',
            fontSize: '15.5px',
            fontWeight: '600',
            lineHeight: '1.4',
            color: 'var(--navy)',
            marginBottom: '8px',
            minHeight: '44px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <a
            href={destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            className="grant-title-link"
            title={grant.title}
          >
            {grant.title}
          </a>
        </h3>

        {/* Row 4: Funding Agency Information */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            color: '#475569',
            marginBottom: '10px',
            lineHeight: '1.35',
            minWidth: 0,
          }}
        >
          <Building2 size={13.5} style={{ color: 'var(--brass-text)', flexShrink: 0 }} />
          <span
            style={{
              fontWeight: '500',
              color: '#334155',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={grant.agency}
          >
            {grant.agency || 'Public Agency'}
          </span>
          {grant.agency_code && grant.agency_code !== 'CA-STATE' && (
            <span
              style={{
                fontWeight: '700',
                color: 'var(--navy)',
                fontSize: '11px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '1px 5px',
                borderRadius: '3px',
                flexShrink: 0,
              }}
            >
              {grant.agency_code}
            </span>
          )}
        </div>

        {/* Row 5: Opportunity Description Excerpt (Expanded to 3 lines, eliminates dead space) */}
        {grant.description ? (
          <p
            style={{
              fontSize: '12.5px',
              color: '#64748B',
              lineHeight: '1.5',
              marginBottom: '14px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '56px',
            }}
          >
            {grant.description}
          </p>
        ) : (
          <div style={{ minHeight: '56px', marginBottom: '14px' }} />
        )}
      </div>

      {/* Card Footer: Balanced top & bottom spacing */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingTop: '13px',
          paddingBottom: '2px',
          borderTop: '1px solid #F1F5F9',
          fontSize: '12px',
          marginTop: 'auto',
          flexWrap: 'nowrap',
        }}
      >
        {/* Left: Due Date and Urgency Flag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <Calendar size={13.5} style={{ color: 'var(--brass)', flexShrink: 0 }} />
          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Due:</span>
          <span
            style={{
              fontWeight: '600',
              color: 'var(--navy)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '12px',
            }}
          >
            {formattedDueDate}
          </span>

          {urgency && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                background: urgency.type === 'urgent' ? '#FEF2F2' : '#FFFBEB',
                color: urgency.type === 'urgent' ? '#DC2626' : '#B45309',
                border: urgency.type === 'urgent' ? '1px solid #FECACA' : '1px solid #FDE68A',
              }}
            >
              {urgency.label}
            </span>
          )}
        </div>

        {/* Right: View Grant Link with target URL */}
        <a
          href={destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--brass-text)',
            fontWeight: '600',
            fontSize: '12.5px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            textDecoration: 'none',
          }}
          className="grant-view-link"
        >
          <span>View opportunity</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </article>
  );
}
