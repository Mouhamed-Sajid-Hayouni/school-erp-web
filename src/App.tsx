import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';

import { API_BASE_URL } from "./lib/config";

function translateLoginError(message?: string) {
  if (!message) return 'فشل تسجيل الدخول.';

  const normalized = message.toLowerCase();

  if (normalized.includes('student accounts cannot access')) {
    return 'لا يمكن لحسابات التلاميذ الدخول مباشرة إلى النظام. يرجى استعمال حساب الولي.';
  }

  if (normalized.includes('user not found')) {
    return 'لم يتم العثور على المستخدم.';
  }

  if (normalized.includes('invalid password')) {
    return 'كلمة المرور غير صحيحة.';
  }

  if (normalized.includes('inactive')) {
    return 'هذا الحساب غير مفعل.';
  }

  if (normalized.includes('email and password are required')) {
    return 'البريد الإلكتروني وكلمة المرور مطلوبان.';
  }

  if (normalized.includes('email must be valid')) {
    return 'يجب إدخال بريد إلكتروني صحيح.';
  }

  if (normalized.includes('login failed')) {
    return 'فشل تسجيل الدخول.';
  }

  return 'فشل تسجيل الدخول.';
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(translateLoginError(data.error));
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('firstName', data.firstName || '');
      localStorage.setItem('lastName', data.lastName || '');
      localStorage.setItem('profileImage', data.profileImage || '');
      localStorage.setItem('userEmail', email.trim().toLowerCase());

      navigate('/dashboard', { replace: true });
    } catch {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة لاحقًا.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100" dir="rtl">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-blue-600">
            نظام إدارة المدرسة
          </h1>
          <p className="text-gray-500">تسجيل الدخول إلى الحساب</p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              dir="ltr"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              كلمة المرور
            </label>
            <input
              type="password"
              dir="ltr"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}

function ProtectedDashboard() {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Dashboard />;
}

export default function App() {
  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    document.title = 'نظام إدارة المدرسة';
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}