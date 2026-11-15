import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { apiGet } from '@/core/api/httpClient';
import AdminPageHeader from '@/features/admin-dashboard/components/AdminPageHeader';
import AdminDataTable from '@/features/admin-dashboard/components/AdminDataTable';
import { Pagination } from '@/components/ui/Pagination';
import { fadeScaleVariants } from '@/components/ui/Skeleton';
import { auditActionLabel, auditActionNote, auditTableLabel, auditDetailRows } from '@/core/utils/auditLabels';
import '../styles/AdminAccountsPage.css';

const LIMIT = 50;

/** Map table name → accent class */
function tableAccent(tableName) {
  if (!tableName) return 'adm-table-badge adm-table-badge--default';
  const t = tableName.toLowerCase();
  if (t.includes('account') || t.includes('user')) return 'adm-table-badge adm-table-badge--blue';
  if (t.includes('reservation'))                   return 'adm-table-badge adm-table-badge--purple';
  if (t.includes('payment'))                       return 'adm-table-badge adm-table-badge--green';
  if (t.includes('order') || t.includes('kitchen'))return 'adm-table-badge adm-table-badge--amber';
  if (t.includes('role') || t.includes('staff'))   return 'adm-table-badge adm-table-badge--indigo';
  return 'adm-table-badge adm-table-badge--default';
}

function formatTimestamp(isoString) {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return isoString; }
}

export default function AuditLogs() {
  const { translateLabel, language } = useLanguage();
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchLogs = useCallback(async (p = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiGet(`/admin/audit-logs?page=${p}&limit=${LIMIT}`);
      if (res.success && res.data) {
        setLogs(res.data);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError('Failed to load audit logs.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  useEffect(() => {
    const onRefresh = () => (page === 1 ? fetchLogs(1) : setPage(1));
    window.addEventListener('phurai_admin_refresh', onRefresh);
    return () => window.removeEventListener('phurai_admin_refresh', onRefresh);
  }, [page, fetchLogs]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const columns = [
    {
      header: translateLabel('Timestamp'),
      key: 'created_at',
      render: (row) => (
        <span className="adm-col-mono">{formatTimestamp(row.created_at)}</span>
      ),
    },
    {
      header: translateLabel('Action'),
      key: 'action_name',
      render: (row) => (
        <span className="adm-col-action">
          {auditActionLabel(row.action_name, language)}
          {auditActionNote(row.action_name, language) && <small className="adm-col-muted"> ({auditActionNote(row.action_name, language)})</small>}
        </span>
      ),
    },
    {
      header: translateLabel('User'),
      key: 'full_name',
      render: (row) => (
        <span className="adm-col-name">{row.full_name || translateLabel('System Auto')}</span>
      ),
    },
    {
      header: translateLabel('Table'),
      key: 'target_table',
      render: (row) => row.target_table ? (
        <span className={tableAccent(row.target_table)}>{auditTableLabel(row.target_table, language)}</span>
      ) : <span className="adm-col-muted">—</span>,
    },
    {
      header: translateLabel('IP Address'),
      key: 'ip_address',
      render: (row) => (
        <span className="adm-col-mono adm-col-muted">{row.ip_address || '—'}</span>
      ),
    },
    {
      header: translateLabel('Changes'),
      key: 'new_value_json',
      render: (row) => {
        if (!row.new_value_json) return <span className="adm-col-muted">—</span>;
        const rows = auditDetailRows(row.new_value_json, language);
        if (!rows.length) return <span className="adm-col-muted">—</span>;
        return (
          <details className="adm-json-details">
            <summary className="adm-json-summary">{translateLabel('View details')} ({rows.length})</summary>
            <dl className="adm-detail-list">
              {rows.map((r, i) => (
                <div key={i} className="adm-detail-row">
                  {r.label && <dt>{r.label}</dt>}
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        );
      },
    },
  ];

  return (
    <motion.div
      className="adm-page"
      variants={fadeScaleVariants}
      initial="hidden"
      animate="visible"
    >
      <AdminPageHeader
        title={translateLabel("System Audit Logs")}
        description={`${translateLabel('Monitor system activities, configuration changes, and administrative operations.')} ${pagination.total ? `(${pagination.total.toLocaleString()} ${translateLabel('total entries')})` : ''}`}
      />

      {error ? (
        <div className="adm-error-banner">{error}</div>
      ) : (
        <div className="adm-table-section">
          <AdminDataTable
            columns={columns}
            data={logs}
            loading={loading}
            emptyMessage={translateLabel("No audit logs available.")}
          />
          {!loading && pagination.total > LIMIT && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalCount={pagination.total}
              onPageChange={handlePageChange}
              limit={LIMIT}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}
