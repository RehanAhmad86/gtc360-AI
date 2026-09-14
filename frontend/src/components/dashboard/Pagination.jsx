import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48, 96],
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate intelligent pagination window
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageClick = (page) => {
    if (page === '...' || page === currentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '24px 0 10px',
        marginTop: '20px',
        borderTop: '1px solid var(--line)',
      }}
    >
      {/* Left: Summary and Page Size Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
          Showing{' '}
          <strong style={{ color: 'var(--navy)', fontWeight: '700' }}>
            {startItem.toLocaleString()}–{endItem.toLocaleString()}
          </strong>{' '}
          of{' '}
          <strong style={{ color: 'var(--navy)', fontWeight: '700' }}>
            {totalItems.toLocaleString()}
          </strong>{' '}
          opportunities
        </span>

        {/* Page Size Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#64748B' }}>
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '12.5px',
              color: 'var(--navy)',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Modern Pagination Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={currentPage === 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            background: '#FFFFFF',
            color: currentPage === 1 ? '#CBD5E1' : 'var(--navy)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="First Page"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            background: '#FFFFFF',
            color: currentPage === 1 ? '#CBD5E1' : 'var(--navy)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Previous Page"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Numbered Page Buttons */}
        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  width: '28px',
                  textAlign: 'center',
                  color: '#94A3B8',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                …
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              onClick={() => handlePageClick(page)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                borderRadius: '6px',
                border: isActive ? '1px solid var(--navy)' : '1px solid var(--line)',
                background: isActive ? 'var(--navy)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                fontSize: '12.5px',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {page}
            </button>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            background: '#FFFFFF',
            color: currentPage === totalPages ? '#CBD5E1' : 'var(--navy)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Next Page"
        >
          <ChevronRight size={15} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            background: '#FFFFFF',
            color: currentPage === totalPages ? '#CBD5E1' : 'var(--navy)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Last Page"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
