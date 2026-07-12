import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { api } from '../api/client';
import { Button, Field, Input, Select, StatusPill, Textarea } from '../components/UI';

const getBookingStatus = (booking) => {
  if (booking.status === 'Cancelled') return 'Cancelled';
  const start = new Date(booking.startTime).getTime();
  const end = new Date(booking.endTime).getTime();
  const now = Date.now();
  if (now < start) return 'Upcoming';
  if (now >= start && now < end) return 'Ongoing';
  return 'Completed';
};

const statusTone = {
  Upcoming: 'blue',
  Ongoing: 'green',
  Completed: 'slate',
  Cancelled: 'red',
};

const hourLabel = (hour) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 || 12;
  return `${normalized}:00`;
};

const toDateTimeLocal = (value) => new Date(value).toISOString().slice(0, 16);

const emptyForm = {
  resourceName: 'Conference Room B2',
  resourceType: 'Meeting Room',
  startTime: '',
  endTime: '',
  purpose: '',
  department: '',
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedResource, setSelectedResource] = useState('Conference Room B2');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [bookingData, departmentData] = await Promise.all([api.bookings(), api.departments()]);
    setBookings(bookingData);
    setDepartments(departmentData);
    setForm((current) => ({
      ...current,
      department: current.department || departmentData[0]?._id || '',
    }));
  };

  useEffect(() => {
    load();
  }, []);

  const resources = useMemo(() => {
    const resourceSet = new Set(['Conference Room B2', 'Conference Room A', 'Vehicle', 'Equipment']);
    bookings.forEach((booking) => resourceSet.add(booking.resourceName));
    return Array.from(resourceSet);
  }, [bookings]);

  const resourceBookings = useMemo(
    () => bookings.filter((booking) => booking.resourceName === selectedResource),
    [bookings, selectedResource]
  );

  const sortedTimeline = useMemo(
    () => [...resourceBookings].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [resourceBookings]
  );

  const timelineHours = useMemo(() => Array.from({ length: 9 }, (_, index) => 8 + index), []);

  const draftConflict = useMemo(() => {
    if (!form.startTime || !form.endTime) return null;
    const draftStart = new Date(form.startTime).getTime();
    const draftEnd = new Date(form.endTime).getTime();

    return sortedTimeline.find((booking) => {
      if (selectedBooking && booking._id === selectedBooking._id) return false;
      const bookingStart = new Date(booking.startTime).getTime();
      const bookingEnd = new Date(booking.endTime).getTime();
      return bookingStart < draftEnd && bookingEnd > draftStart;
    });
  }, [form.endTime, form.startTime, selectedBooking, sortedTimeline]);

  const openNewBooking = () => {
    setError('');
    setSelectedBooking(null);
    setForm({
      ...emptyForm,
      resourceName: selectedResource,
      department: departments[0]?._id || '',
    });
    setShowBookingForm(true);
  };

  const openEditBooking = (booking) => {
    setError('');
    setSelectedBooking(booking);
    setSelectedResource(booking.resourceName);
    setForm({
      resourceName: booking.resourceName,
      resourceType: booking.resourceType,
      startTime: toDateTimeLocal(booking.startTime),
      endTime: toDateTimeLocal(booking.endTime),
      purpose: booking.purpose || '',
      department: booking.department?._id || '',
    });
    setShowBookingForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createBooking({
        ...form,
        resourceName: selectedResource,
      });
      setShowBookingForm(false);
      setSelectedBooking(null);
      await load();
    } catch (bookingError) {
      setError(bookingError.message);
    } finally {
      setSaving(false);
    }
  };

  const rescheduleBooking = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    setError('');
    try {
      await api.rescheduleBooking(selectedBooking._id, {
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setShowBookingForm(false);
      setSelectedBooking(null);
      await load();
    } catch (bookingError) {
      setError(bookingError.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    await api.cancelBooking(bookingId);
    await load();
    if (selectedBooking?._id === bookingId) {
      setSelectedBooking(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Resource Booking</h2>
            <p className="mt-1 text-sm text-slate-500">Calendar view of a resource with overlap protection, cancel, and reschedule.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Resource</p>
            <div className="mt-2 flex items-center gap-2 text-slate-900">
              <CalendarDays className="h-5 w-5 text-teal-600" />
              <h3 className="text-2xl font-semibold">{selectedResource}</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">{resourceBookings[0]?.resourceType || 'Meeting Room'} · schedule</p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap gap-2">
                {resources.map((resource) => (
                  <button
                    key={resource}
                    type="button"
                    onClick={() => {
                      setSelectedResource(resource);
                      setSelectedBooking(null);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedResource === resource ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {resource}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Action</p>
                  <h4 className="mt-1 text-base font-semibold text-slate-900">Book a slot</h4>
                </div>
                <Button type="button" onClick={openNewBooking} className="rounded-full px-5">
                  Book slot
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Rules</p>
              <ul className="mt-2 space-y-1.5">
                <li>• Overlapping bookings for the same resource are rejected.</li>
                <li>• A booking starting exactly when another ends is allowed.</li>
                <li>• Status is Upcoming, Ongoing, Completed, or Cancelled.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Calendar</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedResource}</h3>
                <p className="mt-1 text-sm text-slate-500">Time-slot schedule for the selected resource.</p>
              </div>
              <StatusPill tone="teal">{sortedTimeline.length} booked</StatusPill>
            </div>

            <div className="mt-4 space-y-0">
              {timelineHours.map((hour) => {
                const slot = sortedTimeline.find((booking) => {
                  const bookingStart = new Date(booking.startTime);
                  const bookingMinutes = bookingStart.getHours() * 60 + bookingStart.getMinutes();
                  return bookingMinutes >= hour * 60 && bookingMinutes < hour * 60 + 60;
                });

                return (
                  <div key={hour} className="grid grid-cols-[68px_1fr] items-start gap-3">
                    <div className="pt-3 text-right text-sm font-medium text-slate-500">{hourLabel(hour)}</div>
                    <div className="min-h-16 border-b border-slate-200 px-0 py-2">
                      {slot ? (
                        <button
                          type="button"
                          onClick={() => openEditBooking(slot)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition ${selectedBooking?._id === slot._id ? 'border-slate-900 bg-slate-50' : 'border-sky-200 bg-sky-50 hover:bg-sky-100'}`}
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{slot.purpose || 'Booked slot'}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {slot.department?.name || 'General'} · {new Date(slot.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(slot.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                          <StatusPill tone={statusTone[getBookingStatus(slot)]}>{getBookingStatus(slot)}</StatusPill>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {draftConflict && showBookingForm ? (
                <div className="grid grid-cols-[68px_1fr] items-start gap-3">
                  <div className="pt-3 text-right text-sm font-medium text-slate-500">Draft</div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Requested {new Date(form.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(form.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} conflicts with an existing booking.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {showBookingForm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:items-center">
          <div className="relative w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowBookingForm(false)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close booking form"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Book a slot</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedResource}</h3>
              <p className="mt-1 text-sm text-slate-500">Choose the slot details and submit. Overlaps are blocked automatically.</p>
            </div>

            <form
              onSubmit={selectedBooking ? (event) => {
                event.preventDefault();
                rescheduleBooking();
              } : submit}
              className="grid gap-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Resource name">
                  <Input value={selectedResource} readOnly />
                </Field>
                <Field label="Resource type">
                  <Select value={form.resourceType} onChange={(e) => setForm((current) => ({ ...current, resourceType: e.target.value }))}>
                    <option>Meeting Room</option>
                    <option>Vehicle</option>
                    <option>Equipment</option>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Start time">
                  <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))} />
                </Field>
                <Field label="End time">
                  <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm((current) => ({ ...current, endTime: e.target.value }))} />
                </Field>
              </div>
              <Field label="Department">
                <Select value={form.department} onChange={(e) => setForm((current) => ({ ...current, department: e.target.value }))}>
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Purpose">
                <Textarea rows="4" value={form.purpose} onChange={(e) => setForm((current) => ({ ...current, purpose: e.target.value }))} />
              </Field>

              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              {draftConflict ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This slot overlaps with an existing booking.</div> : null}

              <div className="mt-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={saving}>
                  {selectedBooking ? 'Save reschedule' : 'Book slot'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowBookingForm(false)}>
                  Cancel
                </Button>
                {selectedBooking ? (
                  <Button type="button" variant="outline" onClick={() => cancelBooking(selectedBooking._id)}>
                    Cancel booking
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
