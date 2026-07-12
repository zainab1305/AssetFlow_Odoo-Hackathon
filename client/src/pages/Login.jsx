import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Field, Input } from '../components/UI';

export default function Login() {
  const [form, setForm] = useState({ email: 'admin@assetflow.com', password: 'password123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(form);
      saveSession(data);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="hidden flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
        <div>
          <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight">
            Manage assets, bookings, maintenance, and audits from one clean workspace.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-slate-300">
            Built for a hackathon demo with role-based workflows, responsive UI, and seeded data ready to explore.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm text-slate-300">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Role access</div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Live workflows</div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Fast demo setup</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-semibold text-slate-900">AssetFlow login</h2>
          <p className="mt-2 text-center text-sm text-slate-500">Sign in with a seeded account to explore the demo.</p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Password">
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New employee?{' '}
            <Link to="/signup" className="font-semibold text-teal-600 hover:text-teal-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}