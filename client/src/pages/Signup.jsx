import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Field, Input } from '../components/UI';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.signup(form);
      saveSession(data);
      navigate('/dashboard');
    } catch (signupError) {
      setError(signupError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-900">Create employee account</h1>
        <p className="mt-2 text-sm text-slate-500">Signup is locked to Employee role as shown in the problem statement.</p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            <UserPlus className="h-4 w-4" />
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have access?{' '}
          <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}