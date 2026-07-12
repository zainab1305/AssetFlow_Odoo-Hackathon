import { useEffect, useRef } from 'react';
import { X, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from './helpers';

export const StatCard = ({ label, value, hint, icon: Icon, tone = 'teal' }) => {
  const tones = {
    teal: 'from-cyan-500/15 to-emerald-500/15 border-cyan-200',
    amber: 'from-amber-500/15 to-orange-500/15 border-amber-200',
    blue: 'from-sky-500/15 to-indigo-500/15 border-sky-200',
    rose: 'from-rose-500/15 to-pink-500/15 border-rose-200',
  };

  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${tones[tone]} p-5 shadow-soft`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">{value}</h3>
          {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-white/80 p-3 text-slate-800 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const SectionCard = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-soft ${className}`}>
    {(title || subtitle || action) && (
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const StatusPill = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    blue: 'bg-sky-100 text-sky-700',
    teal: 'bg-cyan-100 text-cyan-700',
    purple: 'bg-violet-100 text-violet-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
};

export const Field = ({ label, children, helper, error }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {children}
    {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
  </label>
);

export const Input = (props) => (
  <input
    {...props}
    className={cn(
      'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100',
      props.className
    )}
  />
);

export const Textarea = (props) => (
  <textarea
    {...props}
    className={cn(
      'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100',
      props.className
    )}
  />
);

export const Select = (props) => (
  <select
    {...props}
    className={cn(
      'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100',
      props.className
    )}
  />
);

export const Button = ({ variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    accent: 'bg-teal-500 text-white hover:bg-teal-600',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    />
  );
};

export const EmptyState = ({ title, description, action }) => (
  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

/* ──────────────────────────────────────────────
   New components for Assets module
   ────────────────────────────────────────────── */

export const Modal = ({ open, onClose, title, children, wide = false }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-12 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className={`relative w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Checkbox = ({ label, checked, onChange, className = '' }) => (
  <label className={`inline-flex cursor-pointer items-center gap-3 ${className}`}>
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-teal-500" />
      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
    </div>
    {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
  </label>
);

export const FileUpload = ({ onFileSelect, accept, label = 'Upload file', uploading = false }) => {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center transition hover:border-teal-300 hover:bg-teal-50/30"
    >
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
      ) : (
        <Upload className="h-6 w-6 text-slate-400" />
      )}
      <p className="text-sm font-medium text-slate-600">{uploading ? 'Uploading...' : label}</p>
      <p className="text-xs text-slate-400">Click or drag and drop</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export const Spinner = ({ className = '' }) => (
  <div className={`flex items-center justify-center py-12 ${className}`}>
    <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
  </div>
);

export const Toast = ({ message, type = 'error', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const tones = {
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-lg ${tones[type]}`}>
      {type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : null}
      <p className="text-sm font-medium">{message}</p>
      <button type="button" onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
};