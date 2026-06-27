'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/client';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'reviews' | 'analytics' | 'notifications' | 'profile' | 'activity'>('home');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  // Home Stats
  const [homeStats, setHomeStats] = useState<any>(null);
  const [homeLoading, setHomeLoading] = useState(true);

  // Reviews State
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Notifications State
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  // Activity Log State
  const [activities, setActivities] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Profile Inputs
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Analytics Chart State
  const [chartJsLoaded, setChartJsLoaded] = useState(false);
  const chartInstances = useRef<any>({});

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: null }), 3000);
  };

  // ── 1. Fetch Dashboard Stats on load ──
  const fetchHomeStats = async () => {
    setHomeLoading(true);
    try {
      const res = await fetch('/api/user/dashboard-stats');
      if (res.ok) {
        const data = await res.json();
        setHomeStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHomeLoading(false);
    }
  };

  // ── 2. Fetch Reviews ──
  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch('/api/user/reviews');
      if (res.ok) {
        const data = await res.json();
        setReviewsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // ── 3. Fetch Notifications ──
  const fetchNotifications = async () => {
    setNotifsLoading(true);
    try {
      const res = await fetch('/api/user/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotifsLoading(false);
    }
  };

  const markNotificationsRead = async () => {
    try {
      const res = await fetch('/api/user/notifications/read', { method: 'POST' });
      if (res.ok) {
        fetchNotifications();
        fetchHomeStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── 4. Fetch Activity Logs ──
  const fetchActivities = async () => {
    setActivityLoading(true);
    try {
      const res = await fetch('/api/user/activity');
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  // ── 5. Fetch Profile ──
  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
        setPhotoURL(data.photoURL || '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── 6. Save Profile Settings ──
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio, photoURL }),
      });
      if (res.ok) {
        showToast('Profile settings saved successfully!', 'success');
        fetchProfile();
      } else {
        showToast('Failed to save profile.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving profile settings.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── 7. Render Charts inside Analytics tab ──
  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/user/analytics');
      if (res.ok && chartJsLoaded && (window as any).Chart) {
        const data = await res.json();
        const Chart = (window as any).Chart;

        // Destroy previous charts
        Object.values(chartInstances.current).forEach((c: any) => c.destroy());
        chartInstances.current = {};

        // Chart: Creations Trend
        const ctxCreations = document.getElementById('chartCreations') as HTMLCanvasElement;
        if (ctxCreations && data.dailyGenerations) {
          chartInstances.current.creations = new Chart(ctxCreations, {
            type: 'line',
            data: {
              labels: data.dailyGenerations.map((g: any) => g.date),
              datasets: [{
                label: 'Generations',
                data: data.dailyGenerations.map((g: any) => g.count),
                borderColor: '#003c90',
                backgroundColor: 'rgba(0, 60, 144, 0.1)',
                tension: 0.3,
                fill: true
              }]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }

        // Chart: Rating Trend distribution
        const ctxRatings = document.getElementById('chartRatingTrend') as HTMLCanvasElement;
        if (ctxRatings && data.ratings) {
          chartInstances.current.ratings = new Chart(ctxRatings, {
            type: 'bar',
            data: {
              labels: data.ratings.map((r: any) => `${r.rating}★`),
              datasets: [{
                label: 'My Narrative Ratings',
                data: data.ratings.map((r: any) => r.count),
                backgroundColor: '#fe6f42'
              }]
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHomeStats();
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
    if (activeTab === 'notifications') {
      fetchNotifications();
      markNotificationsRead();
    }
    if (activeTab === 'activity') fetchActivities();
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, chartJsLoaded]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
        strategy="lazyOnload"
        onLoad={() => setChartJsLoaded(true)}
      />

      {/* Toast Alert */}
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

      <div className="flex min-h-screen bg-[#f7f9fb] w-full text-slate-800">
        
        {/* COLLAPSIBLE SIDEBAR */}
        <aside className={`bg-[#0b1526] text-white flex flex-col justify-between p-6 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              {!sidebarCollapsed && <span className="font-bold text-lg font-display">Manivtha Panel</span>}
              <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1 hover:bg-slate-800 rounded">
                <span className="material-symbols-outlined">{sidebarCollapsed ? 'menu_open' : 'menu'}</span>
              </button>
            </div>

            {/* Sidebar navigation links */}
            <nav className="flex flex-col gap-2">
              <button onClick={() => setActiveTab('home')} className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'home' ? 'bg-[#d9e2ff] text-[#001945]' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span className="material-symbols-outlined">dashboard</span>
                {!sidebarCollapsed && <span>Dashboard</span>}
              </button>
              <button onClick={() => setActiveTab('reviews')} className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'reviews' ? 'bg-[#d9e2ff] text-[#001945]' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span className="material-symbols-outlined">reviews</span>
                {!sidebarCollapsed && <span>Reviews</span>}
              </button>
              <button onClick={() => setActiveTab('analytics')} className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'analytics' ? 'bg-[#d9e2ff] text-[#001945]' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span className="material-symbols-outlined">bar_chart</span>
                {!sidebarCollapsed && <span>Analytics</span>}
              </button>
              <button onClick={() => setActiveTab('notifications')} className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'notifications' ? 'bg-[#d9e2ff] text-[#001945]' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span className="material-symbols-outlined">notifications</span>
                {!sidebarCollapsed && (
                  <span className="flex-1 flex justify-between items-center">
                    <span>Notifications</span>
                    {homeStats?.unreadNotificationsCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {homeStats.unreadNotificationsCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab('profile')} className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'profile' ? 'bg-[#d9e2ff] text-[#001945]' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span className="material-symbols-outlined">person</span>
                {!sidebarCollapsed && <span>Profile Settings</span>}
              </button>
              <button onClick={() => setActiveTab('activity')} className={`sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'activity' ? 'bg-[#d9e2ff] text-[#001945]' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span className="material-symbols-outlined">list_alt</span>
                {!sidebarCollapsed && <span>Activity Logs</span>}
              </button>
            </nav>
          </div>

          <div className="space-y-4">
            <Link href="/" className="sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-800">
              <span className="material-symbols-outlined">home</span>
              {!sidebarCollapsed && <span>Go to Home</span>}
            </Link>
            <button onClick={() => logout()} className="w-full sidebar-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10">
              <span className="material-symbols-outlined">logout</span>
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT PANELS */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* HEADER ROW */}
          <header className="flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="font-bold text-2xl text-slate-800 font-display">
              {activeTab === 'home' && 'Dashboard Overview'}
              {activeTab === 'reviews' && 'Ratings & Reviews Feedback'}
              {activeTab === 'analytics' && 'Analytics Insight'}
              {activeTab === 'notifications' && 'Notifications log'}
              {activeTab === 'profile' && 'Profile Settings'}
              {activeTab === 'activity' && 'Activity timeline log'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#003c90] bg-[#d9e2ff] px-4 py-1.5 rounded-full uppercase tracking-wider">
                {user?.role || 'User'}
              </span>
            </div>
          </header>

          {/* TAB 1: DASHBOARD HOME */}
          {activeTab === 'home' && (
            <div className="space-y-8">
              {/* Welcome banner */}
              <div className="bg-gradient-to-r from-primary to-[#0f52ba] p-8 rounded-3xl text-white shadow-lg">
                <h2 className="font-bold text-2xl font-display">
                  Welcome Back, {user?.displayName || user?.email.split('@')[0]}!
                </h2>
                <p className="text-sm opacity-90 mt-2">Check out the performative reach of your travel narratives today.</p>
              </div>

              {/* KPI cards */}
              {homeLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 bg-white rounded-2xl border skeleton" />
                  ))}
                </div>
              ) : (
                homeStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
                      <span className="material-symbols-outlined text-primary text-3xl">auto_stories</span>
                      <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Total Narratives</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{homeStats.totalNarratives}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
                      <span className="material-symbols-outlined text-secondary text-3xl">visibility</span>
                      <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Total Views</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{homeStats.totalViews}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
                      <span className="material-symbols-outlined text-tertiary text-3xl">bookmark</span>
                      <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Total Saves</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{homeStats.totalSaves}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
                      <span className="material-symbols-outlined text-yellow-500 text-3xl">star</span>
                      <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Avg Rating</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{homeStats.avgRating.toFixed(1)} ★</p>
                    </div>
                  </div>
                )
              )}

              {/* Activity logs preview */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-6 font-display">Recent Account Activity</h3>
                {homeLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6 pl-6 border-l-2 border-slate-100 relative">
                    {homeStats?.recentActivity?.map((act: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[35px] top-1 w-4.5 h-4.5 rounded-full bg-primary border-4 border-white"></div>
                        <p className="font-bold text-sm text-slate-800">{act.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{act.detail}</p>
                        <span className="text-[10px] text-slate-400 block mt-1">{new Date(act.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RATINGS AND REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-8">
              {reviewsLoading ? (
                <div className="h-64 bg-white rounded-2xl border skeleton" />
              ) : (
                reviewsData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                      <p className="text-5xl font-bold text-[#fe6f42]">{reviewsData.avgScore.toFixed(1)}</p>
                      <p className="text-yellow-500 text-lg mt-2">{'★'.repeat(Math.round(reviewsData.avgScore))}</p>
                      <p className="text-xs text-slate-400 mt-2 uppercase font-bold">Average rating Score</p>
                    </div>

                    <div className="md:col-span-2 bg-white p-6 rounded-2xl border shadow-sm space-y-3">
                      <p className="font-bold text-slate-800 font-display">Rating Distribution</p>
                      {[5,4,3,2,1].map(stars => {
                        const count = reviewsData.distribution[stars] || 0;
                        const pct = reviewsData.totalReviews > 0 ? (count / reviewsData.totalReviews) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-4 text-xs font-semibold">
                            <span className="w-12 text-slate-500">{stars} Stars</span>
                            <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-yellow-500 h-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="w-8 text-right text-slate-500">{count}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback reviews table list */}
                    <div className="col-span-full bg-white p-6 rounded-2xl border shadow-sm">
                      <p className="font-bold text-lg text-slate-800 mb-4 font-display">Customer Comments and Reviews</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b">
                              <th className="p-3 font-bold text-slate-500">Narrative Title</th>
                              <th className="p-3 font-bold text-slate-500">Reviewer</th>
                              <th className="p-3 font-bold text-slate-500">Rating</th>
                              <th className="p-3 font-bold text-slate-500">Comment</th>
                              <th className="p-3 font-bold text-slate-500">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewsData.reviews?.map((r: any) => (
                              <tr key={r.id} className="border-b hover:bg-slate-50">
                                <td className="p-3 font-semibold text-primary">{r.narrativeTitle}</td>
                                <td className="p-3">{r.userName}</td>
                                <td className="p-3 text-yellow-500 font-bold">{'★'.repeat(r.rating)}</td>
                                <td className="p-3 text-slate-600 max-w-xs truncate">{r.review}</td>
                                <td className="p-3 text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: USER ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 font-display">📈 Generations trend</h3>
                  <div className="h-64"><canvas id="chartCreations"></canvas></div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 font-display">⭐ Star Ratings Dist.</h3>
                  <div className="h-64"><canvas id="chartRatingTrend"></canvas></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <p className="font-bold text-lg text-slate-800 font-display">System Notifications Log</p>
                <button onClick={markNotificationsRead} className="text-xs text-primary font-bold hover:underline">Mark all as read</button>
              </div>
              {notifsLoading ? (
                <div className="h-44 bg-slate-50 animate-pulse rounded-xl" />
              ) : (
                <div className="divide-y text-sm">
                  {notifs.map(n => (
                    <div key={n.id} className={`py-4 flex gap-4 ${!n.read ? 'bg-slate-50/55 font-semibold' : ''}`}>
                      <span className="material-symbols-outlined text-primary text-lg">info</span>
                      <div>
                        <p className="text-slate-800">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                  {notifs.length === 0 && <p className="text-slate-400 py-8 text-center">No notifications found.</p>}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="bg-white p-6 rounded-2xl border shadow-sm max-w-xl">
              <p className="font-bold text-lg text-slate-800 mb-6 font-display">Update Profile Info</p>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required className="w-full px-4 py-3 border rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">Avatar URL</label>
                  <input type="url" value={photoURL} onChange={e => setPhotoURL(e.target.value)} className="w-full px-4 py-3 border rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">Bio (Short Description)</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full px-4 py-3 border rounded-xl resize-none" />
                </div>
                <button type="submit" disabled={profileSaving} className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-[#0f52ba] shadow-md transition-all">
                  {profileSaving ? 'Saving Changes...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: ACTIVITY LOGS */}
          {activeTab === 'activity' && (
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <p className="font-bold text-lg text-slate-800 mb-6 font-display">Timeline Activity Log</p>
              {activityLoading ? (
                <div className="h-64 bg-slate-50 animate-pulse rounded" />
              ) : (
                <div className="space-y-6">
                  {activities.map((act, idx) => (
                    <div key={idx} className="flex gap-4 items-start text-sm">
                      <span className="material-symbols-outlined text-slate-400">history</span>
                      <div>
                        <p className="font-bold text-slate-800">{act.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{act.detail}</p>
                        <span className="text-[10px] text-slate-400 block mt-1">{new Date(act.createdAt).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>

      </div>
    </>
  );
}
