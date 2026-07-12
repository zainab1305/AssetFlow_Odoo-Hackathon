import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, Field, Input, SectionCard, StatusPill, Select, Textarea } from '../components/UI';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ resourceName: 'Conference Room A', resourceType: 'Meeting Room', startTime: '', endTime: '', purpose: '', department: '' });

  const load = async () => {
    const [bookingData, departmentData] = await Promise.all([api.bookings(), api.departments()]);
    setBookings(bookingData);
    setDepartments(departmentData);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    await api.createBooking(form);
    setForm((current) => ({ ...current, purpose: '' }));
    load();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="Book a resource" subtitle="Rooms, vehicles, and shared equipment">
        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Resource name"><Input value={form.resourceName} onChange={(e) => setForm({ ...form, resourceName: e.target.value })} /></Field>
          <Field label="Resource type"><Select value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value })}><option>Meeting Room</option><option>Vehicle</option><option>Equipment</option></Select></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start time"><Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
            <Field label="End time"><Input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
          </div>
          <Field label="Department"><Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}</Select></Field>
          <Field label="Purpose"><Textarea rows="4" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></Field>
          <Button type="submit">Book slot</Button>
        </form>
      </SectionCard>

      <SectionCard title="Booking list" subtitle="Overlapping bookings are blocked by the API">
        <div className="space-y-4">
          {bookings.length ? bookings.map((booking) => (
            <div key={booking._id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{booking.resourceName}</h3>
                    <StatusPill tone={booking.status === 'Confirmed' ? 'green' : 'slate'}>{booking.status}</StatusPill>
                  </div>
                  <p className="text-sm text-slate-500">{booking.resourceType} · {booking.department?.name || 'General'}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(booking.startTime).toLocaleString()} - {new Date(booking.endTime).toLocaleString()}</p>
                </div>
                <Button variant="secondary" onClick={() => api.cancelBooking(booking._id).then(load)}>Cancel</Button>
              </div>
            </div>
          )) : <EmptyState title="No bookings" description="Create the first resource reservation." />}
        </div>
      </SectionCard>
    </div>
  );
}