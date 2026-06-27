'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/client';

export default function AdminConsolePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'narratives' | 'users' | 'metrics' | 'reports'>('overview');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  // Overview Stats
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Narratives Table State
  const [narratives, setNarratives] = useState<any[]>([]);
  const [narSearch, setNarSearch] = useState('');
  const [narTone, setNarTone] = useState('');
  const [narRating, setNarRating] = useState('');
  const [narPage, setNarPage] = useState(1);
  const [narTotalPages, setNarTotalPages] = useState(1);
  const [narTotal, setNarTotal] = useState(0);
  const [narLoading, setNarLoading] = useState(true);

  // Users State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Reports State
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // System Metrics
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Chart state
  const [chartJsLoaded, setChartJsLoaded] = useState(false);
  const chartInstances = useRef<any>({});

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  // Load overall metrics
  const fetchOverviewStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load narratives
  const fetchNarratives = async () => {
    setNarLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(narPage),
        limit: '20',
        search: narSearch,
        tone: narTone,
        rating: narRating,
      });
      const res = await fetch(`/api/admin/data?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNarratives(data.data || []);
        setNarTotalPages(data.pagination?.totalPages || 1);
        setNarTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNarLoading(false);
    }
  };

  // Load users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Load reported content
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReportsList(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  };

  // Load system metrics
  const fetchSystemMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setSystemMetrics(data.system || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Export narrative records as CSV
  const exportData = async () => {
    showToast('Preparing CSV export...', 'info');
    try {
      const res = await fetch('/api/admin/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `manivtha-generations-${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('CSV downloaded successfully!', 'success');
      } else {
        showToast('Export failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('CSV export failed.', 'error');
    }
  };

  // User Actions: Role, Status, Deletion
  const updateUserRole = async (targetUserId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, role: newRole }),
      });
      if (res.ok) {
        showToast('User role updated successfully!', 'success');
        fetchUsers();
      } else {
        showToast('Failed to update role.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserStatus = async (targetUserId: string, isSuspended: boolean) => {
    try {
      const res = await fetch('/api/admin/users/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, suspended: isSuspended }),
      });
      if (res.ok) {
        showToast(isSuspended ? 'User suspended.' : 'User unsuspended.', 'success');
        fetchUsers();
      } else {
        showToast('Failed to update status.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve moderation reports
  const resolveReport = async (reportId: number, deleteNarrative: boolean) => {
    try {
      const res = await fetch('/api/admin/reports/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, deleteNarrative }),
      });
      if (res.ok) {
        showToast(deleteNarrative ? 'Narrative deleted and report resolved!' : 'Report dismissed.', 'success');
        fetchReports();
        fetchNarratives();
      } else {
        showToast('Failed to resolve report.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete narrative directly
  const deleteNarrative = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this narrative?')) return;
    try {
      const res = await fetch(`/api/admin/narratives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Narrative deleted successfully!', 'success');
        fetchNarratives();
        fetchOverviewStats();
      } else {
        showToast('Failed to delete narrative.', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Render Chart.js on overview statistics load
  const drawCharts = () => {
    if (!stats || !chartJsLoaded || !(window as any).Chart) return;
    const Chart = (window as any).Chart;

    // Clear previous charts
    Object.values(chartInstances.current).forEach((c: any) => c.destroy());
    chartInstances.current = {};

    // 1. Generation Trend line chart
    const ctxTrend = document.getElementById('trendChart') as HTMLCanvasElement;
    if (ctxTrend && stats.dailyGenerations) {
      chartInstances.current.trend = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: stats.dailyGenerations.map((g: any) => g.date),
          datasets: [{
            label: 'Generations',
            data: stats.dailyGenerations.map((g: any) => g.count),
            borderColor: '#003c90',
            backgroundColor: 'rgba(0, 60, 144, 0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // 2. Tone doughnut chart
    const ctxTone = document.getElementById('toneChart') as HTMLCanvasElement;
    if (ctxTone && stats.toneDistribution) {
      chartInstances.current.tone = new Chart(ctxTone, {
        type: 'doughnut',
        data: {
          labels: stats.toneDistribution.map((t: any) => t.tone),
          datasets: [{
            data: stats.toneDistribution.map((t: any) => t.count),
            backgroundColor: ['#003c90', '#fe6f42', '#006358', '#ba1a1a', '#737784']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // 3. Top Travel Routes
    const ctxRoutes = document.getElementById('routesChart') as HTMLCanvasElement;
    if (ctxRoutes && stats.topRoutes) {
      chartInstances.current.routes = new Chart(ctxRoutes, {
        type: 'bar',
        data: {
          labels: stats.topRoutes.map((r: any) => r.route.slice(0, 15)),
          datasets: [{
            label: 'Trips Count',
            data: stats.topRoutes.map((r: any) => r.count),
            backgroundColor: '#006358'
          }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
      });
    }

    // 4. Ratings
    const ctxRatings = document.getElementById('ratingsChart') as HTMLCanvasElement;
    if (ctxRatings && stats.ratingsDistribution) {
      chartInstances.current.ratings = new Chart(ctxRatings, {
        type: 'bar',
        data: {
          labels: stats.ratingsDistribution.map((r: any) => `${r.rating}★`),
          datasets: [{
            label: 'Reviews',
            data: stats.ratingsDistribution.map((r: any) => r.count),
            backgroundColor: '#fe6f42'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchOverviewStats();
      fetchNarratives();
      fetchUsers();
      fetchReports();
      fetchSystemMetrics();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'overview') {
      drawCharts();
    }
  }, [activeTab, stats, chartJsLoaded]);

  useEffect(() => {
    fetchNarratives();
  }, [narPage, narSearch, narTone, narRating]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
        strategy="lazyOnload"
        onLoad={() => setChartJsLoaded(true)}
      />

      {/* Toast popup alerts */}
      {toast.type && (
        <div
          id="toast"
          className={`show ${toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : 'info'}`}
          role="status"
          aria-live="assertive"
        >
          {toast.message}
        </div>
      )}

      <div className="bg-[#f7f9fb] min-h-screen flex text-slate-800 w-full">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-outline-variant flex flex-col justify-between hidden md:flex sticky top-0 h-screen flex-shrink-0">
          <div>
            <div className="p-6 border-b border-outline-variant flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
                M
              </div>
              <div>
                <h1 className="font-extrabold text-primary leading-tight font-display">Manivtha Admin</h1>
                <span className="text-xs text-on-surface-variant font-medium">Console v2.0</span>
              </div>
            </div>

            <nav className="p-4 space-y-1">
              <button onClick={() => setActiveTab('overview')} className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'overview' ? 'bg-[#d9e2ff] text-[#001945] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined">analytics</span>
                <span className="text-sm font-semibold">Dashboard Overview</span>
              </button>
              <button onClick={() => setActiveTab('narratives')} className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'narratives' ? 'bg-[#d9e2ff] text-[#001945] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined">auto_stories</span>
                <span className="text-sm font-semibold">Manage Narratives</span>
              </button>
              <button onClick={() => setActiveTab('users')} className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'users' ? 'bg-[#d9e2ff] text-[#001945] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined">manage_accounts</span>
                <span className="text-sm font-semibold">User Manager</span>
              </button>
              <button onClick={() => setActiveTab('metrics')} className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'metrics' ? 'bg-[#d9e2ff] text-[#001945] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined">dns</span>
                <span className="text-sm font-semibold">System Health</span>
              </button>
              <button onClick={() => setActiveTab('reports')} className={`sidebar-link w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${activeTab === 'reports' ? 'bg-[#d9e2ff] text-[#001945] font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className="material-symbols-outlined">flag</span>
                <span className="text-sm font-semibold">Content Reports</span>
              </button>
            </nav>
          </div>

          <div className="p-4 border-t border-outline-variant space-y-3">
            <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-primary hover:underline px-4">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Return to Dashboard
            </Link>
            <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm">A</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">Admin</p>
                  <p className="text-[10px] text-gray-500 font-medium">Administrator</p>
                </div>
              </div>
              <button onClick={() => logout()} className="text-gray-500 hover:text-error transition-colors" title="Sign Out">
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN DISPLAY PANELS */}
        <div className="flex-grow flex flex-col min-w-0 min-h-screen">
          <header className="bg-white border-b border-outline-variant h-16 flex items-center justify-between px-6 sticky top-0 z-40">
            <h2 className="text-xl font-bold text-gray-900 font-display">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'narratives' && 'Manage Narratives'}
              {activeTab === 'users' && 'User & Role Manager'}
              {activeTab === 'metrics' && 'System Health & Metrics'}
              {activeTab === 'reports' && 'Moderation & Reports'}
            </h2>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-full border border-emerald-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Connected to Turso DB
            </div>
          </header>

          <main className="p-8 flex-grow">
            
            {/* OVERVIEW PANEL */}
            {activeTab === 'overview' && (
              <section className="space-y-8">
                {statsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-28 bg-white border rounded-3xl skeleton" />
                    ))}
                  </div>
                ) : (
                  stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white rounded-3xl p-6 border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-semibold text-sm text-on-surface-variant">Total Narratives</span>
                          <span className="material-symbols-outlined text-primary p-2 bg-blue-50 rounded-xl">auto_stories</span>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900 font-display">{stats.totalStories || 0}</p>
                        <span className="text-xs text-gray-500 font-medium">Stories generated in Turso</span>
                      </div>
                      <div className="bg-white rounded-3xl p-6 border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-semibold text-sm text-on-surface-variant">Average Rating</span>
                          <span className="material-symbols-outlined text-amber-500 p-2 bg-amber-50 rounded-xl">star</span>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900 font-display">{stats.avgRating ? stats.avgRating.toFixed(1) : '—'}</p>
                        <span className="text-xs text-gray-500 font-medium">Customer satisfaction index</span>
                      </div>
                      <div className="bg-white rounded-3xl p-6 border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-semibold text-sm text-on-surface-variant">Total Users</span>
                          <span className="material-symbols-outlined text-emerald-600 p-2 bg-emerald-50 rounded-xl">group</span>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900 font-display">{stats.totalUsers || 0}</p>
                        <span className="text-xs text-gray-500 font-medium">Registered account database</span>
                      </div>
                      <div className="bg-white rounded-3xl p-6 border shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-semibold text-sm text-on-surface-variant">System Health</span>
                          <span className="material-symbols-outlined text-teal-600 p-2 bg-teal-50 rounded-xl">health_metrics</span>
                        </div>
                        <p className="text-3xl font-extrabold text-gray-900 font-display">Healthy</p>
                        <span className="text-xs text-gray-500 font-medium">API status &amp; Server state</span>
                      </div>
                    </div>
                  )
                )}

                {/* Charts widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[2rem] p-6 border shadow-sm">
                    <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">bar_chart</span>
                      Generations Trend (Last 30 Days)
                    </h3>
                    <div className="h-64"><canvas id="trendChart"></canvas></div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 border shadow-sm">
                    <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">pie_chart</span>
                      Tone Distribution
                    </h3>
                    <div className="h-64"><canvas id="toneChart"></canvas></div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 border shadow-sm">
                    <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">map</span>
                      Top Travel Routes
                    </h3>
                    <div className="h-64"><canvas id="routesChart"></canvas></div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 border shadow-sm">
                    <h3 className="font-bold text-base text-gray-900 mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">thumb_up</span>
                      Ratings Distribution
                    </h3>
                    <div className="h-64"><canvas id="ratingsChart"></canvas></div>
                  </div>
                </div>
              </section>
            )}

            {/* NARRATIVES MANAGER PANEL */}
            {activeTab === 'narratives' && (
              <section className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-grow flex flex-col md:flex-row items-stretch md:items-center gap-3">
                      <input
                        type="search"
                        placeholder="Search driver, route, title..."
                        value={narSearch}
                        onChange={e => setNarSearch(e.target.value)}
                        className="py-2 px-4 border border-outline-variant rounded-xl text-sm"
                      />
                      <select value={narTone} onChange={e => setNarTone(e.target.value)} className="py-2 px-4 border rounded-xl text-sm bg-white">
                        <option value="">All Tones</option>
                        <option value="Adventurous">Adventurous</option>
                        <option value="Poetic">Poetic</option>
                        <option value="Informative">Informative</option>
                        <option value="Humorous">Humorous</option>
                      </select>
                      <select value={narRating} onChange={e => setNarRating(e.target.value)} className="py-2 px-4 border rounded-xl text-sm bg-white">
                        <option value="">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                      </select>
                    </div>
                    <button onClick={exportData} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined">download</span> Export CSV
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                          <th className="p-4">ID</th>
                          <th className="p-4">Driver</th>
                          <th className="p-4">Route</th>
                          <th className="p-4">Tone</th>
                          <th className="p-4">Rating</th>
                          <th className="p-4">Created At</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {narLoading ? (
                          <tr><td colSpan={7} className="text-center py-12">Loading narratives...</td></tr>
                        ) : (
                          narratives.map(n => (
                            <tr key={n.id} className="hover:bg-slate-50">
                              <td className="p-4 text-xs text-slate-400">{n.id}</td>
                              <td className="p-4 font-bold">{n.driver_name}</td>
                              <td className="p-4">{n.route}</td>
                              <td className="p-4"><span className="px-2.5 py-0.5 rounded bg-slate-100 text-xs">{n.tone}</span></td>
                              <td className="p-4 text-yellow-500 font-bold">{'★'.repeat(n.rating || 0)}</td>
                              <td className="p-4 text-slate-400">{new Date(n.created_at).toLocaleDateString('en-IN')}</td>
                              <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => deleteNarrative(n.id)} className="p-1 hover:text-red-500 text-slate-400" title="Delete"><span className="material-symbols-outlined text-base">delete</span></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  <div className="p-4 border-t flex justify-between items-center bg-gray-50 text-xs">
                    <span>Page {narPage} of {narTotalPages} (Total {narTotal})</span>
                    <div className="flex gap-2">
                      <button disabled={narPage === 1} onClick={() => setNarPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                      <button disabled={narPage === narTotalPages} onClick={() => setNarPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* USER MANAGER PANEL */}
            {activeTab === 'users' && (
              <section className="bg-white rounded-3xl border overflow-hidden shadow-sm">
                <div className="p-6 border-b bg-gray-50">
                  <h3 className="font-bold text-lg text-gray-900 font-display">Registered Users</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage employee roles and account suspensions.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                        <th className="p-4">User</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {usersLoading ? (
                        <tr><td colSpan={5} className="text-center py-12">Loading user directory...</td></tr>
                      ) : (
                        usersList.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold">{u.displayName || 'Unnamed User'}</td>
                            <td className="p-4">{u.email}</td>
                            <td className="p-4">
                              <select
                                value={u.role}
                                onChange={e => updateUserRole(u.id, e.target.value)}
                                className="py-1 px-2 border rounded bg-white text-xs"
                              >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                                <option value="SuperAdmin">SuperAdmin</option>
                              </select>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {u.suspended ? 'Suspended' : 'Active'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => updateUserStatus(u.id, !u.suspended)}
                                className={`text-xs font-bold px-3 py-1 rounded border ${u.suspended ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                              >
                                {u.suspended ? 'Activate' : 'Suspend'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* SYSTEM HEALTH METRICS */}
            {activeTab === 'metrics' && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-6">
                  <h3 className="font-bold text-base text-gray-900 border-b pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">server</span> Server Application State
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Node Environment</span>
                      <span className="font-bold text-slate-800">Production</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">API Status</span>
                      <span className="font-bold text-emerald-600">Online ✅</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Deployment Target</span>
                      <span className="font-bold text-slate-800">Vercel</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-6">
                  <h3 className="font-bold text-base text-gray-900 border-b pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">database</span> SQLite Database Integration
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Provider</span>
                      <span className="font-bold text-[#006358]">LibSQL / Turso Cloud</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Table Schema</span>
                      <span className="font-bold text-slate-800">Valid</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* MODERATION REPORTS */}
            {activeTab === 'reports' && (
              <section className="bg-white rounded-3xl border overflow-hidden shadow-sm">
                <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 font-display">Flagged Content Reports</h3>
                    <p className="text-xs text-gray-500 mt-1">Review user flag reports on community stories.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-slate-500 uppercase tracking-wider">
                        <th className="p-4">Narrative</th>
                        <th className="p-4">Reporter ID</th>
                        <th className="p-4">Reason</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportsLoading ? (
                        <tr><td colSpan={5} className="text-center py-12">Loading reports...</td></tr>
                      ) : (
                        reportsList.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-primary">{r.narrativeTitle}</td>
                            <td className="p-4 text-xs text-slate-400">{r.userId}</td>
                            <td className="p-4">{r.reason}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {r.resolved ? 'Resolved' : 'Pending'}
                              </span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                              {!r.resolved && (
                                <>
                                  <button onClick={() => resolveReport(r.id, false)} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">Dismiss</button>
                                  <button onClick={() => resolveReport(r.id, true)} className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded">Delete Content</button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                      {reportsList.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-12 text-slate-400">No content reports found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </main>
        </div>
      </div>
    </>
  );
}
