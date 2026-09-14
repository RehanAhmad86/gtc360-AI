import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ marginTop: '60px' }}>
      {/* Executive Call to Action Banner */}
      <section style={{
        background: 'var(--navy)',
        color: '#FFFFFF',
        padding: '56px 24px',
        textAlign: 'center',
        borderTop: '1px solid rgba(219, 225, 233, 0.15)',
      }}>
        <div className="container" style={{ maxWidth: '720px' }}>
          <span style={{
            color: 'var(--brass-light)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: '600',
            display: 'block',
            marginBottom: '10px',
          }}>
            Advisory & Proposal Development
          </span>
          <h2 style={{
            fontFamily: 'var(--display)',
            fontSize: '28px',
            fontWeight: '600',
            lineHeight: '1.25',
            marginBottom: '14px',
          }}>
            The signal is the start. We help you win the award.
          </h2>
          <p style={{
            fontSize: '15px',
            color: 'var(--brass-light)',
            lineHeight: '1.6',
            marginBottom: '28px',
          }}>
            GTC 360° Advisors builds your grant strategy, recruits partner organizations, writes the proposal, manages the budget, and submits on time.
          </p>
          <div>
            <a
              href="https://gtc360.com/join-our-network/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#FFFFFF',
                color: 'var(--navy)',
                padding: '12px 28px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '14px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              Request grant support
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Sub-footer copyright */}
      <div style={{
        background: 'var(--navy-deep)',
        color: 'rgba(255,255,255,0.5)',
        padding: '20px 24px',
        fontSize: '12.5px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/blue-outline-hz-1-1536x649.png"
              alt="GTC Advisors"
              style={{
                height: '24px',
                width: 'auto',
                borderRadius: '3px',
                background: '#FFFFFF',
                display: 'block',
                opacity: 0.9,
              }}
            />
            <span>&copy; {new Date().getFullYear()} GTC 360° Advisors LLC. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="https://gtc360.com" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Main Portal
            </a>
            <span>·</span>
            <span>Federal &amp; State Vector Intelligence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
