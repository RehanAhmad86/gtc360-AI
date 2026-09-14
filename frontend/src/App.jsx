import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import StatsOverview from './components/dashboard/StatsOverview';
import GrantMatchCard from './components/dashboard/GrantMatchCard';
import ComparisonDrawer from './components/dashboard/ComparisonDrawer';
import AuthModal from './components/auth/AuthModal';
import PreferencesModal from './components/profile/PreferencesModal';
import { authAPI, matchingAPI, systemAPI } from './services/api';
import SkeletonCard from './components/dashboard/SkeletonCard';
import Pagination from './components/dashboard/Pagination';
import { Sliders, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(authAPI.getCurrentUser());
  const [activePreferences, setActivePreferences] = useState(() => {
    const userPrefs = authAPI.getCurrentUser()?.preferences;
    if (userPrefs) return userPrefs;
    try {
      const savedGuest = localStorage.getItem('gtc360_guest_preferences');
      if (savedGuest) return JSON.parse(savedGuest);
    } catch {}
    return null;
  });
  const [matches, setMatches] = useState([]);
  const [comparedGrants, setComparedGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceFilter, activePreferences]);

  // Sync user state on auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      const u = authAPI.getCurrentUser();
      setUser(u);
      if (u?.preferences) {
        setActivePreferences(u.preferences);
      }
    };
    window.addEventListener('gtc360_auth_change', handleAuthChange);
    return () => window.removeEventListener('gtc360_auth_change', handleAuthChange);
  }, []);

  // Fetch match recommendations from backend (full dataset of 3,552 grants)
  const fetchMatches = useCallback(async (customPrefs = null) => {
    setLoading(true);
    try {
      const currentUser = user || authAPI.getCurrentUser();
      let prefsToUse = null;
      if (currentUser) {
        prefsToUse = customPrefs !== null ? customPrefs : (currentUser.preferences || activePreferences || null);
      }
      const res = await matchingAPI.getMatches({
        userId: currentUser?._id || currentUser?.id || null,
        preferences: prefsToUse,
        top_k: 5000,
      });
      setMatches(res.matches || []);
    } catch (err) {
      console.error('Failed to fetch AI matches:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activePreferences]);

  // Initial load
  useEffect(() => {
    fetchMatches();
    systemAPI.getHealth()
      .then((data) => setSystemStatus(data))
      .catch((err) => console.log('System health check notice:', err));
  }, []);

  // Toggle grant in comparison tray
  const handleToggleCompare = (grant) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    if (!hasSavedPreferences) {
      setIsPreferencesOpen(true);
      return;
    }
    const exists = comparedGrants.some((g) => g.grant_id === grant.grant_id);
    if (exists) {
      setComparedGrants(comparedGrants.filter((g) => g.grant_id !== grant.grant_id));
    } else {
      if (comparedGrants.length >= 6) {
        alert('You can compare up to 6 opportunities at a time.');
        return;
      }
      setComparedGrants([...comparedGrants, grant]);
    }
  };

  const handleRemoveCompare = (grantId) => {
    setComparedGrants(comparedGrants.filter((g) => g.grant_id !== grantId));
  };

  const handleClearAllCompare = () => {
    setComparedGrants([]);
    setIsCompareOpen(false);
  };

  // Trigger sync from Grants.gov & data.ca.gov
  const handleSyncGrants = async () => {
    setIsSyncing(true);
    try {
      await systemAPI.triggerSync(true);
      await fetchMatches();
    } catch (err) {
      alert('Sync notice: External API rate limit or network delay. Baseline funding dataset remains active.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter matches based on search query and source
  const filteredMatches = useMemo(() => {
    return matches.filter((g) => {
      // Source filter
      if (sourceFilter !== 'all' && g.source !== sourceFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (g.title || '').toLowerCase().includes(q);
        const agencyMatch = (g.agency || '').toLowerCase().includes(q);
        const codeMatch = (g.agency_code || '').toLowerCase().includes(q);
        const oppMatch = (g.opp_number || '').toLowerCase().includes(q);
        const descMatch = (g.description || '').toLowerCase().includes(q);
        return titleMatch || agencyMatch || codeMatch || oppMatch || descMatch;
      }
      return true;
    });
  }, [matches, searchQuery, sourceFilter]);

  // Check if user is authenticated and has stored preferences
  const isUserAuthenticated = Boolean(user && (user._id || user.id || user.email));
  const currentPreferences = isUserAuthenticated ? (user.preferences || activePreferences || null) : null;
  const activeCategories = currentPreferences?.targetCategories || [];
  const activeAgencies = currentPreferences?.targetAgencies || [];
  const hasSavedPreferences = Boolean(
    isUserAuthenticated && (
      (activeCategories && activeCategories.length > 0) ||
      (activeAgencies && activeAgencies.length > 0) ||
      (currentPreferences?.customKeywords && currentPreferences.customKeywords.trim().length > 0)
    )
  );
  const hasActiveCriteria = hasSavedPreferences;
  const topScore = matches.length > 0 && hasActiveCriteria ? (matches[0].score || 0) : 0;

  // Reset comparison tray if user logs out or has no saved preferences
  useEffect(() => {
    if (!user || !hasSavedPreferences) {
      setComparedGrants([]);
      setIsCompareOpen(false);
    }
  }, [user, hasSavedPreferences]);

  // Paginated slice for current page view
  const paginatedGrants = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMatches.slice(startIndex, startIndex + pageSize);
  }, [filteredMatches, currentPage, pageSize]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const el = document.getElementById('grants-grid-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
        compareCount={comparedGrants.length}
        onSyncGrants={handleSyncGrants}
        isSyncing={isSyncing}
        systemStatus={systemStatus}
        hasSavedPreferences={hasSavedPreferences}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '36px 0 60px' }}>
        <div className="container">
          {/* Executive Hero Banner */}
          <section style={{
            background: '#FFFFFF',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '36px 40px 28px',
            boxShadow: '0 6px 24px rgba(20,45,76,0.05)',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ maxWidth: '780px' }}>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--brass-text)',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: 'block',
                  marginBottom: '8px',
                }}>
                  Decoupled Vector Intelligence Platform
                </span>
                <h1 style={{
                  fontFamily: 'var(--display)',
                  fontSize: '32px',
                  fontWeight: '700',
                  letterSpacing: '-0.02em',
                  color: 'var(--navy)',
                  lineHeight: '1.2',
                  marginBottom: '10px',
                }}>
                  Semantic AI Grant Matching &amp; Comparison Engine
                </h1>
                <p style={{ fontSize: '15.5px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  Connecting your institution with active federal and California state funding opportunities.
                  Our sub-10ms SentenceTransformer engine evaluates semantic topic alignment, agency affinity, and eligibility criteria.
                </p>
              </div>

              <button
                onClick={() => setIsPreferencesOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--navy)',
                  color: '#FFFFFF',
                  padding: '12px 22px',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  boxShadow: '0 4px 14px rgba(20,45,76,0.18)',
                }}
              >
                <Sliders size={16} style={{ color: 'var(--brass-light)' }} />
                <span>Configure Target Topics</span>
              </button>
            </div>
          </section>

          {/* Metrics & Filter Bar */}
          <StatsOverview
            totalMatches={filteredMatches.length}
            topScore={topScore}
            categories={activeCategories}
            agencies={activeAgencies}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenPreferences={() => setIsPreferencesOpen(true)}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            hasActiveCriteria={hasActiveCriteria}
          />

          {/* Grants Cards Grid / Loading State */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--brass-wash)',
                border: '1px solid var(--line-brass)',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--brass-text)',
                fontWeight: '500',
              }}>
                <RefreshCw size={15} className="animate-spin" />
                <span>Evaluating semantic vector similarities across federal &amp; state grant records...</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '22px', paddingTop: '15px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          ) : filteredMatches.length > 0 ? (
            <div id="grants-grid-section">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '22px', paddingTop: '15px' }}>
                {paginatedGrants.map((grant) => {
                  const isCompared = comparedGrants.some((g) => g.grant_id === grant.grant_id);
                  return (
                    <GrantMatchCard
                      key={grant.grant_id}
                      grant={grant}
                      isCompared={isCompared}
                      onToggleCompare={handleToggleCompare}
                      hasActiveCriteria={hasActiveCriteria}
                      user={user}
                    />
                  );
                })}
              </div>

              {/* Professional Industry-Standard Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalItems={filteredMatches.length}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          ) : (
            <div style={{
              background: 'var(--mist)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '60px 20px',
              textAlign: 'center',
            }}>
              <AlertCircle size={32} style={{ color: 'var(--brass)', margin: '0 auto 12px' }} />
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '19px', marginBottom: '8px' }}>
                No opportunities match these filter criteria
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 20px' }}>
                Try clearing your search query or adjusting your priority focus areas in the target criteria panel.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSourceFilter('all'); }}
                style={{
                  background: 'var(--navy)',
                  color: '#FFFFFF',
                  border: 0,
                  borderRadius: '6px',
                  padding: '9px 20px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Comparison Drawer & Side-by-Side Modal */}
      <ComparisonDrawer
        comparedGrants={comparedGrants}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onOpenModal={() => setIsCompareOpen(true)}
        onRemoveGrant={handleRemoveCompare}
        onClearAll={handleClearAllCompare}
        hasActiveCriteria={hasActiveCriteria}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          const prefs = newUser?.preferences || activePreferences;
          setActivePreferences(prefs);
          fetchMatches(prefs);
        }}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        currentPreferences={currentPreferences}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSave={(newPrefs) => {
          setActivePreferences(newPrefs);
          fetchMatches(newPrefs);
        }}
      />

      {/* Executive Footer */}
      <Footer />
    </div>
  );
}
