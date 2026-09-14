import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Plus,
  Sliders,
  Building,
  DollarSign,
  Tag,
  Search,
  Shield,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { userAPI, authAPI } from '../../services/api';

export const CATEGORIES_LOOKUP = [
  { id: 'agriculture-farming', name: 'Agriculture & Farming' },
  { id: 'performing-arts-culture', name: 'Performing Arts & Culture' },
  { id: 'small-business', name: 'Small Business' },
  { id: 'community-services-economic-development-municipal', name: 'Community Services & Municipal' },
  { id: 'consumer-protection', name: 'Consumer Protection' },
  { id: 'disaster-relief-ems-homeland-security', name: 'Disaster Relief & EMS' },
  { id: 'education-services', name: 'Education Services' },
  { id: 'employment-labor-and-training', name: 'Employment & Training' },
  { id: 'energy', name: 'Energy' },
  { id: 'environment', name: 'Environment' },
  { id: 'food-and-nutrition', name: 'Food and Nutrition' },
  { id: 'health', name: 'Health' },
  { id: 'housing', name: 'Housing' },
  { id: 'humanities', name: 'Humanities' },
  { id: 'income-security-and-social-services', name: 'Income Security & Social Services' },
  { id: 'information-and-statistics', name: 'Information and Statistics' },
  { id: 'infrastructure-investment-and-jobs-act', name: 'Infrastructure - IIJA' },
  { id: 'law-justice-and-legal-services', name: 'Law, Justice & Legal Services' },
  { id: 'natural-resources', name: 'Natural Resources' },
  { id: 'opportunity-zone-benefits', name: 'Opportunity Zone Benefits' },
  { id: 'regional-development', name: 'Regional Development' },
  { id: 'science-and-technology', name: 'Science and Technology' },
  { id: 'transportation', name: 'Transportation' },
];

export const AGENCIES_LOOKUP = [
  { id: 'ca-state', code: 'CA-STATE', name: 'State of California / All CA Departments', jurisdiction: 'State' },
  { id: 'denali', code: 'DENALI', name: 'Denali Commission', jurisdiction: 'Federal' },
  { id: 'usda', code: 'USDA', name: 'Department of Agriculture - USDA', jurisdiction: 'Federal' },
  { id: 'doc', code: 'DOC', name: 'Department of Commerce - DOC / NOAA / NIST / EDA', jurisdiction: 'Federal' },
  { id: 'dod', code: 'DOD', name: 'Department of Defense - DOD / Army / Navy / Air Force / DARPA', jurisdiction: 'Federal' },
  { id: 'ed', code: 'ED', name: 'Department of Education - ED', jurisdiction: 'Federal' },
  { id: 'doe', code: 'DOE', name: 'Department of Energy - DOE', jurisdiction: 'Federal' },
  { id: 'doe-sc', code: 'DOE-SC', name: 'Department of Energy — Office of Science', jurisdiction: 'Federal' },
  { id: 'hhs', code: 'HHS', name: 'Department of Health and Human Services - HHS / NIH / CDC / FDA', jurisdiction: 'Federal' },
  { id: 'dhs', code: 'DHS', name: 'Department of Homeland Security - DHS / FEMA', jurisdiction: 'Federal' },
  { id: 'hud', code: 'HUD', name: 'Department of Housing and Urban Development - HUD', jurisdiction: 'Federal' },
  { id: 'doj', code: 'DOJ', name: 'Department of Justice - DOJ / BJA / OJP', jurisdiction: 'Federal' },
  { id: 'dol', code: 'DOL', name: 'Department of Labor - DOL / ETA / OSHA', jurisdiction: 'Federal' },
  { id: 'state', code: 'DOS', name: 'Department of State - DOS', jurisdiction: 'Federal' },
  { id: 'doi', code: 'DOI', name: 'Department of the Interior - DOI / USGS / Fish & Wildlife', jurisdiction: 'Federal' },
  { id: 'treasury', code: 'TREAS', name: 'Department of the Treasury - TREAS / IRS', jurisdiction: 'Federal' },
  { id: 'dot', code: 'DOT', name: 'Department of Transportation - DOT / FAA / FHWA / FTA', jurisdiction: 'Federal' },
  { id: 'va', code: 'VA', name: 'Department of Veterans Affairs - VA', jurisdiction: 'Federal' },
  { id: 'epa', code: 'EPA', name: 'Environmental Protection Agency - EPA', jurisdiction: 'Federal' },
  { id: 'imls', code: 'IMLS', name: 'Institute of Museum and Library Services - IMLS', jurisdiction: 'Federal' },
  { id: 'mcc', code: 'MCC', name: 'Millennium Challenge Corporation - MCC', jurisdiction: 'Federal' },
  { id: 'nasa', code: 'NASA', name: 'National Aeronautics and Space Administration - NASA', jurisdiction: 'Federal' },
  { id: 'nara', code: 'NARA', name: 'National Archives and Records Administration - NARA', jurisdiction: 'Federal' },
  { id: 'neh', code: 'NEH', name: 'National Endowment for the Humanities - NEH', jurisdiction: 'Federal' },
  { id: 'ondcp', code: 'ONDCP', name: 'Office of National Drug Control Policy - ONDCP', jurisdiction: 'Federal' },
  { id: 'nsf', code: 'NSF', name: 'U.S. National Science Foundation - NSF', jurisdiction: 'Federal' },
];

const ORG_TYPES = [
  { id: 'higher_ed', name: 'Higher Education Institution (University / College)' },
  { id: 'nonprofit', name: '501(c)(3) Non-Profit Organization' },
  { id: 'small_business', name: 'Small Business / Commercial Enterprise' },
  { id: 'municipality', name: 'Municipal / Local / State Government Agency' },
  { id: 'tribal', name: 'Native American Tribal Government / Organization' },
  { id: 'healthcare', name: 'Public Health / Healthcare Hospital System' },
];

const AWARD_MIN_PRESETS = [0, 50000, 100000, 250000, 500000, 1000000];
const AWARD_MAX_PRESETS = [100000, 250000, 500000, 1000000, 5000000, 10000000, 0];

export default function PreferencesModal({ isOpen, onClose, currentPreferences, user, onOpenAuth, onSave }) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'agencies' | 'awards'
  const [selectedCategories, setSelectedCategories] = useState(currentPreferences?.targetCategories || []);
  const [selectedAgencies, setSelectedAgencies] = useState(currentPreferences?.targetAgencies || []);
  const [selectedOrgType, setSelectedOrgType] = useState(currentPreferences?.organizationType || '');
  const [minAward, setMinAward] = useState(currentPreferences?.minAward || 0);
  const [maxAward, setMaxAward] = useState(currentPreferences?.maxAward || 0);
  const [customKeyword, setCustomKeyword] = useState(currentPreferences?.customKeywords || '');
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state whenever modal opens or preferences change
  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(currentPreferences?.targetCategories || []);
      setSelectedAgencies(currentPreferences?.targetAgencies || []);
      setSelectedOrgType(currentPreferences?.organizationType || user?.organizationType || '');
      setMinAward(currentPreferences?.minAward || 0);
      setMaxAward(currentPreferences?.maxAward || 0);
      setCustomKeyword(currentPreferences?.customKeywords || '');
      setFilterQuery('');
    }
  }, [isOpen, currentPreferences, user]);

  if (!isOpen) return null;

  const isCategorySelected = (cat) => {
    return selectedCategories.includes(cat.name) || selectedCategories.includes(cat.id);
  };

  const toggleCategory = (cat) => {
    const isSelected = isCategorySelected(cat);
    if (isSelected) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat.name && c !== cat.id));
    } else {
      setSelectedCategories([...selectedCategories, cat.name]);
    }
  };

  const isAgencySelected = (agency) => {
    return (
      selectedAgencies.includes(agency.id) ||
      selectedAgencies.includes(agency.code) ||
      selectedAgencies.includes(agency.name)
    );
  };

  const toggleAgency = (agency) => {
    const isSelected = isAgencySelected(agency);
    if (isSelected) {
      setSelectedAgencies(
        selectedAgencies.filter((a) => a !== agency.id && a !== agency.code && a !== agency.name)
      );
    } else {
      setSelectedAgencies([...selectedAgencies, agency.id]);
    }
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedAgencies([]);
    setMinAward(0);
    setMaxAward(0);
    setSelectedOrgType('');
    setCustomKeyword('');
  };

  const handleSave = async () => {
    setLoading(true);
    const updated = {
      targetCategories: selectedCategories,
      targetAgencies: selectedAgencies,
      organizationType: selectedOrgType,
      minAward: Number(minAward) || 0,
      maxAward: Number(maxAward) || 0,
      customKeywords: customKeyword.trim(),
      userId: user?._id || user?.id || null,
    };

    // If user is authenticated, save directly to MongoDB Atlas via API
    const token = authAPI.getToken();
    if (user || token) {
      try {
        await userAPI.updatePreferences(updated);
      } catch (err) {
        console.error('Failed to save preferences to MongoDB:', err);
      }
    }

    // Always mirror to local browser cache for immediate responsiveness
    try {
      localStorage.setItem('gtc360_guest_preferences', JSON.stringify(updated));
    } catch {}

    if (onSave) onSave(updated);
    setLoading(false);
    onClose();
  };

  const filteredCategories = CATEGORIES_LOOKUP.filter((c) =>
    c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredAgencies = AGENCIES_LOOKUP.filter(
    (a) =>
      a.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalSelectedCount = selectedCategories.length + selectedAgencies.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 29, 51, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
        padding: '20px',
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          background: '#FFFFFF',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          borderRadius: '14px',
          border: '1px solid var(--line)',
          boxShadow: '0 24px 48px rgba(20,45,76,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--mist)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3
                style={{
                  fontFamily: 'var(--display)',
                  fontSize: '19px',
                  fontWeight: '700',
                  color: 'var(--navy)',
                  margin: 0,
                }}
              >
                Target Matching Criteria
              </h3>
              {totalSelectedCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'var(--brass)',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '100px',
                  }}
                >
                  {totalSelectedCount} active
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              Tailor semantic vector weights, agency affinities, and funding award limits
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Guest Mode Notification (only when not signed in) */}
        {!user && (
          <div
            style={{
              padding: '9px 24px',
              background: '#FFFBEB',
              borderBottom: '1px solid #FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>
                <strong>Guest Mode:</strong> You are not signed in. Preferences are active for this session. Sign in to save them permanently to your account.
              </span>
            </div>
            {onOpenAuth && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                style={{
                  background: 'var(--brass)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: '#FFFFFF',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              setFilterQuery('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeTab === 'categories' ? '700' : '500',
              background: activeTab === 'categories' ? 'var(--navy)' : 'transparent',
              color: activeTab === 'categories' ? '#FFFFFF' : '#475569',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Tag size={13} />
            <span>Focus Areas ({selectedCategories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('agencies');
              setFilterQuery('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeTab === 'agencies' ? '700' : '500',
              background: activeTab === 'agencies' ? 'var(--navy)' : 'transparent',
              color: activeTab === 'agencies' ? '#FFFFFF' : '#475569',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Building size={13} />
            <span>Agencies &amp; Depts ({selectedAgencies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('awards');
              setFilterQuery('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: activeTab === 'awards' ? '700' : '500',
              background: activeTab === 'awards' ? 'var(--navy)' : 'transparent',
              color: activeTab === 'awards' ? '#FFFFFF' : '#475569',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <DollarSign size={13} />
            <span>Award Limits &amp; Org Type</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: Categories / Focus Areas */}
          {activeTab === 'categories' && (
            <div>
              {/* Filter search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--mist)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '16px',
                }}
              >
                <Search size={15} style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Search focus areas and grant topics..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    width: '100%',
                    color: 'var(--navy)',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                {filteredCategories.map((cat) => {
                  const isSelected = isCategorySelected(cat);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid var(--brass)' : '1px solid var(--line)',
                        background: isSelected ? 'var(--brass-wash)' : '#FFFFFF',
                        color: isSelected ? 'var(--brass-text)' : '#334155',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{cat.name}</span>
                      {isSelected ? (
                        <Check size={14} style={{ color: 'var(--brass-text)', flexShrink: 0 }} />
                      ) : (
                        <Plus size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Keywords input */}
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--navy)' }}>
                  Specific Target Keywords / Solicitation Terms (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. quantum computing, EV charging, wildfire sensors, bilingual education..."
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '13px',
                    outline: 'none',
                    color: 'var(--navy)',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Semantic embeddings incorporate these terms directly to elevate matched solicitations.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Agencies & Departments */}
          {activeTab === 'agencies' && (
            <div>
              {/* Filter search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--mist)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '16px',
                }}
              >
                <Search size={15} style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Filter by agency code (NSF, NIH, CEC...) or department name..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    width: '100%',
                    color: 'var(--navy)',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: '10px',
                }}
              >
                {filteredAgencies.map((agency) => {
                  const isSelected = isAgencySelected(agency);
                  return (
                    <button
                      key={agency.id}
                      type="button"
                      onClick={() => toggleAgency(agency)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid var(--brass)' : '1px solid var(--line)',
                        background: isSelected ? 'var(--brass-wash)' : '#FFFFFF',
                        color: isSelected ? 'var(--brass-text)' : '#334155',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'ui-monospace, monospace',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: agency.jurisdiction === 'State' ? '#EFF6FF' : '#F1F5F9',
                              color: agency.jurisdiction === 'State' ? '#1D4ED8' : '#0F172A',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            {agency.code}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase' }}>
                            {agency.jurisdiction === 'State' ? 'CA State' : 'Federal'}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', lineHeight: '1.3' }}>{agency.name}</span>
                      </div>
                      {isSelected ? (
                        <Check size={14} style={{ color: 'var(--brass-text)', flexShrink: 0, marginTop: '2px' }} />
                      ) : (
                        <Plus size={14} style={{ color: '#94A3B8', flexShrink: 0, marginTop: '2px' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Award Limits & Org Type */}
          {activeTab === 'awards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Organization Type */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '8px' }}>
                  Applicant Organization Structure
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                  {ORG_TYPES.map((org) => {
                    const isSelected = selectedOrgType === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => setSelectedOrgType(isSelected ? '' : org.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid var(--brass)' : '1px solid var(--line)',
                          background: isSelected ? 'var(--brass-wash)' : '#FFFFFF',
                          color: isSelected ? 'var(--brass-text)' : '#334155',
                          fontSize: '12.5px',
                          fontWeight: isSelected ? '700' : '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{org.name}</span>
                        {isSelected && <Check size={14} style={{ color: 'var(--brass-text)' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Award Floor / Min Amount */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)' }}>
                    Minimum Target Award ($ USD)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brass-text)' }}>
                    {minAward > 0 ? `$${Number(minAward).toLocaleString()}` : '$0 (Any)'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {AWARD_MIN_PRESETS.map((amt) => (
                    <button
                      key={`min-${amt}`}
                      type="button"
                      onClick={() => setMinAward(amt)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: minAward === amt ? '1.5px solid var(--navy)' : '1px solid var(--line)',
                        background: minAward === amt ? 'var(--navy)' : '#FFFFFF',
                        color: minAward === amt ? '#FFFFFF' : '#334155',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {amt === 0 ? '$0 Floor' : `$${(amt / 1000).toFixed(0)}k`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom minimum dollar amount..."
                  value={minAward || ''}
                  onChange={(e) => setMinAward(Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '13px',
                    color: 'var(--navy)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Award Ceiling / Max Amount */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)' }}>
                    Maximum Target Award ($ USD)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brass-text)' }}>
                    {maxAward > 0 ? `$${Number(maxAward).toLocaleString()}` : 'No Ceiling (Any)'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {AWARD_MAX_PRESETS.map((amt) => (
                    <button
                      key={`max-${amt}`}
                      type="button"
                      onClick={() => setMaxAward(amt)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: maxAward === amt ? '1.5px solid var(--navy)' : '1px solid var(--line)',
                        background: maxAward === amt ? 'var(--navy)' : '#FFFFFF',
                        color: maxAward === amt ? '#FFFFFF' : '#334155',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {amt === 0 ? 'No Ceiling' : `$${(amt / 1000).toFixed(0)}k`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom maximum dollar amount..."
                  value={maxAward || ''}
                  onChange={(e) => setMaxAward(Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '13px',
                    color: 'var(--navy)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--line)',
            background: 'var(--mist)',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset All Criteria</span>
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--line)',
                color: 'var(--navy)',
                borderRadius: '6px',
                padding: '9px 18px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              style={{
                background: 'var(--navy)',
                border: '1px solid var(--navy)',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '9px 22px',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Reranking Cache...' : 'Apply & Rerank Matches'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
