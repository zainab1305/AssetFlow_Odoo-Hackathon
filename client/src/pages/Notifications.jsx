import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, SectionCard, StatusPill } from '../components/UI';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  const load = async () => {
    setNotifications(await api.notifications());
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SectionCard title="Notifications" subtitle="Allocation, maintenance, booking, transfer, and overdue alerts">
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => api.readAllNotifications().then(load)}>Mark all read</Button>
      </div>
      <div className="space-y-3">
        {notifications.length ? notifications.map((notification) => (
          <div key={notification._id} className="flex flex-col gap-3 rounded-3xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                <StatusPill tone={notification.read ? 'slate' : notification.type === 'danger' ? 'red' : notification.type === 'warning' ? 'amber' : 'green'}>{notification.read ? 'Read' : 'New'}</StatusPill>
              </div>
              <p className="text-sm text-slate-500">{notification.message}</p>
            </div>
            {!notification.read ? <Button variant="outline" onClick={() => api.readNotification(notification._id).then(load)}>Mark read</Button> : null}
          </div>
        )) : <EmptyState title="No notifications" description="Notifications from key workflows will appear here." />}
      </div>
    </SectionCard>
  );
}