import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { auditActionLabel } from '@/core/utils/auditLabels';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet } from '@/core/api/httpClient';
import {
  SkeletonPresence,
  KpiSkeleton,
  Skeleton,
  listContainerVariants,
  listItemVariants,
  fadeScaleVariants,
} from '@/components/ui/Skeleton';
import PortalKpiCard from '@/components/portal/PortalKpiCard.jsx';
import '../styles/AdminDashboardPage.css';

/**
 * Live KPI cards — mapped to PortalKpiCard format.
 * Accent color mapping (approved):
 *   blue   → neutral/info (Total Accounts, Audit Entries Today)
 *   green  → active/success (Active Staff)
 *   amber  → warning/action needed (Pending Role Requests, Staff Performance Flags)
 *   red    → critical action required (Reviews Needing Reply)
 *   purple → analytics/historical (Reservations 30d)
 *   blue   → financial (Total Revenue 30d) [user changed from green]
 */
function buildKpis(stats) {
  return [
    {
      label: "Total Accounts",
      value: stats?.totalAccounts ?? 0,
      format: "number",
      icon: "users",
      accent: "blue",
      trend: { dir: "flat", text: "System wide total" },
    },
    {
      label: "Active Staff",
      value: stats?.activeStaff ?? 0,
      format: "text",
      icon: "users",
      accent: "green",
      trend: {
        dir: "flat",
        text: "Active Staff",
      },
    },
    {
      label: "Pending Role Requests",
      value: stats?.pendingRoleRequests ?? 0,
      format: "number",
      icon: "shield",
      accent: "amber",
      trend: { dir: "flat", text: "Awaiting approval" },
    },
    {
      label: "Audit Entries Today",
      value: stats?.auditEntriesToday ?? 0,
      format: "number",
      icon: "report",
      accent: "blue",
      trend: { dir: "flat", text: "Across all staff" },
    },
    {
      label: "Reservations (30d)",
      value: stats?.reservations30d ?? 0,
      format: "number",
      icon: "calendar",
      accent: "purple",
      trend: { dir: "flat", text: "Selected period total" },
    },
    {
      label: "Total Revenue (30d)",
      value: stats?.revenue30d ?? 0,
      format: "currency",
      icon: "wallet",
      accent: "blue",
      trend: { dir: "flat", text: "System wide total" },
    },
    {
      label: "Low-rated reviews",
      value: stats?.reviewsNeedingReply ?? 0,
      format: "number",
      icon: "star",
      accent: "red",
      trend: { dir: "flat", text: "Rating ≤ 3 stars" },
    },
    {
      label: "Staff Performance Flags",
      value: stats?.staffPerformanceFlags ?? 0,
      format: "number",
      icon: "spark",
      accent: "amber",
      trend: { dir: "flat", text: "Latest rating ≤ 3" },
    },
  ].filter(card=>card.label!=="Pending Role Requests");
}

export default function AdminDashboardPage() {
  const { translateLabel, language } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, logsRes] = await Promise.all([
          apiGet('/admin/dashboard/stats'),
          apiGet('/admin/audit-logs/recent'),
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (logsRes.success) setLogs(logsRes.data);
      } catch (error) {
        setLoadError(true);
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if(loadError)return <div role="alert">{translateLabel('Could not load admin dashboard. Please refresh.')}</div>;
  const kpis = buildKpis(stats);

  return (
    <div className="adp-root">
      {/* Page title row — sits inside sfx-canvas padding from AdminLayout */}
      <div className="adp-toolbar">
        <div>
          <h2 className="adp-page-title">{translateLabel("Dashboard")}</h2>
          <p className="adp-subtitle">{translateLabel("System-wide overview · Today's snapshot")}</p>
        </div>
      </div>

      {/* KPI grid — SkeletonPresence for smooth skeleton ↔ content handoff */}
      <SkeletonPresence
        loading={loading}
        skeleton={<KpiSkeleton count={8} className="sfx-kpis adp-kpi-grid" />}
      >
        <motion.div
          className="sfx-kpis adp-kpi-grid"
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {kpis.map((card, i) => (
            <motion.div key={i} variants={listItemVariants}>
              <PortalKpiCard card={card} index={i} />
            </motion.div>
          ))}
        </motion.div>
      </SkeletonPresence>

      {/* Bottom panels */}
      <div className="adp-panels">
        {/* Audit log table */}
        <div className="adp-panel adp-panel--wide">
          <div className="adp-panel-header">
            <h3 className="adp-panel-title">{translateLabel("Recent Audit Log Activity")}</h3>
            <button
              className="sfx-btn sfx-btn--ghost sfx-btn--sm"
              onClick={() => navigate('/admin/audit-logs')}
            >
              {translateLabel("View all")}
            </button>
          </div>
          <div className="adp-table-wrap">
            <SkeletonPresence
              loading={loading}
              skeleton={
                <div className="adp-skeleton-rows">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="w-full h-8" />)}
                </div>
              }
            >
              <table className="adp-table">
                <thead>
                  <tr>
                    <th>{translateLabel("Time")}</th>
                    <th>{translateLabel("Action")}</th>
                    <th>{translateLabel("User")}</th>
                  </tr>
                </thead>
                <AnimatePresence mode="wait">
                  {logs.length > 0 ? (
                    <motion.tbody
                      key="log-rows"
                      variants={listContainerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {logs.map((log, i) => (
                        <motion.tr key={i} variants={listItemVariants}>
                          <td className="adp-table-time">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="adp-table-action">{auditActionLabel(log.action_name, language)}</td>
                          <td className="adp-table-actor">{log.full_name || translateLabel('System Auto')}</td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  ) : (
                    <tbody key="empty">
                      <tr>
                        <td colSpan="3" className="adp-table-empty">{translateLabel("No recent audit logs.")}</td>
                      </tr>
                    </tbody>
                  )}
                </AnimatePresence>
              </table>
            </SkeletonPresence>
          </div>
        </div>
      </div>
    </div>
  );
}
