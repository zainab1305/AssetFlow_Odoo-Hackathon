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
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
};

export const Field = ({ label, children, helper }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {children}
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