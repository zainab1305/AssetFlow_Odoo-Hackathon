import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpDown,
  BadgeCheck,
  BellRing,
  CalendarDays,
  Clock3,
  Laptop2,
  RefreshCw,
  Search,
  ShieldAlert,
  Wrench,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { Button, EmptyState, Spinner, StatusPill } from '../components/UI';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'bookings', label: 'Bookings' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const CATEGORY_META = {
  asset_assignment: {
    group: 'all',
    label: 'Asset Assignment',
    icon: Laptop2,
    indicator: 'bg-sky-300',
    badge: 'bg-sky-100 text-sky-700',
  },
  maintenance_approved: {
    group: 'approvals',
    label: 'Maintenance Approved',
    icon: Wrench,
    indicator: 'bg-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  transfer_approved: {
    group: 'approvals',
    label: 'Transfer Approved',
    icon: ArrowLeftRight,
    indicator: 'bg-rose-300',
    badge: 'bg-rose-100 text-rose-700',
  },
  asset_approval: {
    group: 'approvals',
    label: 'Asset Approval',
    icon: BadgeCheck,
    indicator: 'bg-amber-300',
    badge: 'bg-amber-100 text-amber-700',
  },
  booking_created: {
    group: 'bookings',
    label: 'Booking Created',
    icon: CalendarDays,
    indicator: 'bg-sky-300',
    badge: 'bg-sky-100 text-sky-700',
  },
  booking_confirmed: {
    group: 'bookings',
    label: 'Booking Confirmed',
    icon: CalendarDays,
    indicator: 'bg-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  booking_cancelled: {
    group: 'bookings',
    label: 'Booking Cancelled',
    icon: CalendarDays,
    indicator: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-700',
  },
  overdue_return: {
    group: 'alerts',
    label: 'Overdue Return',
    icon: AlertTriangle,
    indicator: 'bg-amber-300',
    badge: 'bg-amber-100 text-amber-700',
  },
  audit_issue: {
    group: 'alerts',
    label: 'Audit Issue',
    icon: ShieldAlert,
    indicator: 'bg-rose-300',
    badge: 'bg-rose-100 text-rose-700',
  },
  system_alert: {
    group: 'alerts',
    label: 'System Alert',
    icon: BellRing,
    indicator: 'bg-violet-300',
    badge: 'bg-violet-100 text-violet-700',
  },
};

const inferCategory = (notification) => {
  if (notification.category) return notification.category;

  const text = `${notification.title || ''} ${notification.message || ''}`.toLowerCase();
  if (text.includes('overdue')) return 'overdue_return';
  if (text.includes('audit') && (text.includes('discrep') || text.includes('flagged') || text.includes('damaged'))) return 'audit_issue';
  if (text.includes('maintenance') && text.includes('approved')) return 'maintenance_approved';
  if (text.includes('transfer') && text.includes('approved')) return 'transfer_approved';
  if (text.includes('asset') && text.includes('approved')) return 'asset_approval';
  if (text.includes('booking') && text.includes('cancel')) return 'booking_cancelled';
  if (text.includes('booking') && text.includes('confirm')) return 'booking_confirmed';
  if (text.includes('booking') && text.includes('created')) return 'booking_created';
  if (text.includes('assigned')) return 'asset_assignment';
  return 'system_alert';
};

const extractAssetTag = (notification) => {
  if (notification.assetTag) return notification.assetTag;
  const text = `${notification.title || ''} ${notification.message || ''}`;
  const match = text.match(/AF-\d{3,4}/i);
  return match ? match[0].toUpperCase() : '';
};

const normalizeNotification = (notification) => {
  const category = inferCategory(notification);
  const meta = CATEGORY_META[category] || CATEGORY_META.system_alert;

  return {
    ...notification,
    id: notification.id || notification._id,
    category,
    group: meta.group,
    assetTag: extractAssetTag(notification),
    triggeredByName: notification.triggeredBy?.name || notification.metadata?.triggeredByName || 'System',
    moduleName: notification.module || meta.label.replace(/ /g, ' '),
    metadata: notification.metadata || {},
  };
};

const relativeTime = (value) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const formatTimestamp = (value) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatSearchValue = (value) => value.trim().toLowerCase();

export default function Notifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedNotificationId, setSelectedNotificationId] = useState('');

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications(),
    refetchInterval: 30000,
  });

  const activityLogsQuery = useQuery({
    queryKey: ['activityLogs'],
    queryFn: () => api.activityLogs(),
    refetchInterval: 45000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.readNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.readAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const cleaned = searchTerm.trim();
    if (cleaned.length > 80) {
      setSearchError('Search must be 80 characters or fewer.');
      return;
    }

    if (/[<>]/.test(cleaned)) {
      setSearchError('Search cannot include angle brackets.');
      return;
    }

    setSearchError('');
  }, [searchTerm]);

  useEffect(() => {
    document.body.style.overflow = selectedNotificationId ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedNotificationId]);

  const notifications = (notificationsQuery.data || []).map(normalizeNotification);
  const activityLogs = activityLogsQuery.data || [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const filteredNotifications = notifications
    .filter((notification) => {
      if (activeTab === 'all') return true;
      return notification.group === activeTab;
    })
    .filter((notification) => {
      const search = formatSearchValue(searchTerm);
      if (!search) return true;

      return [
        notification.title,
        notification.message,
        notification.assetTag,
        notification.triggeredByName,
        notification.module,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortOrder === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
    });

  const selectedNotification = notifications.find((notification) => notification.id === selectedNotificationId) || null;
  const drawerMeta = selectedNotification ? CATEGORY_META[selectedNotification.category] || CATEGORY_META.system_alert : null;

  const openNotification = (notification) => {
    setSelectedNotificationId(notification.id);
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
  };

  const closeDrawer = () => setSelectedNotificationId('');

  return (
    <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white/95 shadow-soft">
      <div className="border-b border-slate-200 bg-white px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Activity logs & notifications</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Activity Logs & Notifications</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Keep users informed about approvals, bookings, transfers, and system activity without leaving the ERP shell.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <StatusPill tone={unreadCount > 0 ? 'amber' : 'green'}>{unreadCount} unread</StatusPill>
            <Button
              variant="secondary"
              className="h-10 px-3 py-2 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={!unreadCount || markAllReadMutation.isPending}
            >
              <CheckIcon />
              Mark All as Read
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search asset tag, employee name, or message"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
            />
          </label>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <ArrowUpDown className="h-4 w-4 shrink-0" />
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="bg-transparent text-sm text-slate-700 outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            className="h-12 px-4 py-3 text-sm"
            onClick={() => {
              notificationsQuery.refetch();
              activityLogsQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {searchError ? <p className="mt-2 text-sm text-rose-500">{searchError}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`min-w-[96px] rounded-2xl border px-5 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'border-emerald-200 bg-emerald-100/80 text-emerald-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4 md:px-6">
        {notificationsQuery.isLoading ? (
          <Spinner />
        ) : notificationsQuery.isError ? (
          <EmptyState
            title="Unable to load notifications"
            description={notificationsQuery.error?.message || 'The notifications feed could not be loaded.'}
            action={
              <Button variant="secondary" onClick={() => notificationsQuery.refetch()}>
                Retry
              </Button>
            }
          />
        ) : filteredNotifications.length ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {filteredNotifications.map((notification) => {
              const meta = CATEGORY_META[inferCategory(notification)] || CATEGORY_META.system_alert;
              const Icon = meta.icon;

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full items-start gap-4 border-b border-slate-200 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50 ${
                    notification.read ? 'bg-white' : 'bg-emerald-50/45'
                  }`}
                >
                  <span className={`mt-1 h-3 w-3 rounded-sm ${meta.indicator}`} />
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${meta.badge}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <p className={`min-w-0 flex-1 text-[15px] leading-6 ${notification.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                          {notification.message}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{notification.title}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 pl-2 text-sm text-slate-500">
                    {!notification.read ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" /> : null}
                    <span className="whitespace-nowrap">{relativeTime(notification.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No notifications match your filters"
            description="Try another tab, clear the search, or wait for the next live refresh."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveTab('all');
                  setSearchTerm('');
                  setSortOrder('newest');
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/75 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Activity logs</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">Newest first</h3>
            </div>
            <p className="text-xs text-slate-400">{activityLogs.length} entries</p>
          </div>

          {activityLogsQuery.isLoading ? (
            <Spinner className="py-8" />
          ) : activityLogsQuery.isError ? (
            <p className="mt-4 text-sm text-rose-500">{activityLogsQuery.error?.message || 'Unable to load activity logs.'}</p>
          ) : activityLogs.length ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="hidden bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 md:grid md:grid-cols-[1.2fr_1fr_0.8fr_1fr_2fr] md:gap-4">
                <span>User</span>
                <span>Action</span>
                <span>Module</span>
                <span>Timestamp</span>
                <span>Description</span>
              </div>
              <div className="divide-y divide-slate-200">
                {activityLogs.map((activity) => (
                  <div
                    key={activity.id}
                    className="grid gap-2 px-4 py-4 text-sm text-slate-700 md:grid-cols-[1.2fr_1fr_0.8fr_1fr_2fr] md:items-center md:gap-4"
                  >
                    <div className="font-medium text-slate-900">{activity.user}</div>
                    <div>{activity.action}</div>
                    <div className="capitalize text-slate-500">{activity.module}</div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{relativeTime(activity.timestamp)}</span>
                    </div>
                    <div className="text-slate-500">{activity.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-900">No activity logs yet</p>
              <p className="mt-1 text-sm text-slate-500">New ERP actions will appear here as they happen.</p>
            </div>
          )}
        </section>
      </div>

      {selectedNotification ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close notification details" className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Notification details</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedNotification.title}</h3>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className={`rounded-3xl border px-4 py-4 ${selectedNotification.read ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50/60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${drawerMeta?.badge || 'bg-slate-100 text-slate-600'}`}>
                      {drawerMeta?.icon ? <drawerMeta.icon className="h-5 w-5" /> : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{drawerMeta?.label || 'Notification'}</p>
                      <p className="text-xs text-slate-500">{selectedNotification.read ? 'Read' : 'Unread'}</p>
                    </div>
                  </div>
                  <StatusPill tone={selectedNotification.read ? 'green' : 'amber'}>{selectedNotification.read ? 'Read' : 'Unread'}</StatusPill>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">{selectedNotification.message}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard label="Notification Type" value={drawerMeta?.label || selectedNotification.category} />
                <DetailCard label="Message" value={selectedNotification.message} />
                <DetailCard label="Triggered By" value={selectedNotification.triggeredBy?.name || selectedNotification.triggeredByName || 'System'} />
                <DetailCard label="Module" value={selectedNotification.module || 'System'} />
                <DetailCard label="Asset" value={selectedNotification.assetTag || selectedNotification.entityId || 'N/A'} />
                <DetailCard label="Timestamp" value={formatTimestamp(selectedNotification.createdAt)} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-slate-900">Additional Metadata</h4>
                  <p className="text-xs text-slate-400">{selectedNotification.entityId || 'No entity link'}</p>
                </div>
                {Object.keys(selectedNotification.metadata || {}).length ? (
                  <dl className="mt-4 space-y-3">
                    {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                        <dt className="font-medium text-slate-500">{key}</dt>
                        <dd className="text-right text-slate-900">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No additional metadata is available for this notification.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

const DetailCard = ({ label, value }) => (
  <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
  </div>
);

const CheckIcon = () => <BadgeCheck className="h-4 w-4" />;