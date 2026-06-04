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
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [registerForm, setRegisterForm] = useState({
    role: 'PARENT' as 'PARENT' | 'TEACHER',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    specialty: '',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registering, setRegistering] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const t = {
    systemName: '\u0646\u0638\u0627\u0645 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629',
    loginTitle: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u062d\u0633\u0627\u0628',
    registerTitle: '\u0637\u0644\u0628 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062c\u062f\u064a\u062f',
    login: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    requestAccount: '\u0637\u0644\u0628 \u062d\u0633\u0627\u0628',
    email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    connectionError: '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0644\u0627\u062d\u0642\u064b\u0627.',
    studentBlocked: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u062a\u0644\u0645\u064a\u0630. \u0627\u0644\u062a\u0644\u0627\u0645\u064a\u0630 \u064a\u0628\u0642\u0648\u0646 \u0645\u0644\u0641\u0627\u062a \u0645\u062f\u0631\u0633\u064a\u0629 \u0641\u0642\u0637.',
    duplicateEmail: '\u064a\u0648\u062c\u062f \u062d\u0633\u0627\u0628 \u0645\u0633\u062c\u0644 \u0628\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.',
    passwordLength: '\u064a\u062c\u0628 \u0623\u0646 \u062a\u062d\u062a\u0648\u064a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0639\u0644\u0649 8 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.',
    emailInvalid: '\u064a\u062c\u0628 \u0625\u062f\u062e\u0627\u0644 \u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0635\u062d\u064a\u062d.',
    required: '\u064a\u0631\u062c\u0649 \u062a\u0639\u0645\u064a\u0631 \u0643\u0644 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.',
    onlyParentsTeachers: '\u064a\u0645\u0643\u0646 \u0644\u0644\u0623\u0648\u0644\u064a\u0627\u0621 \u0648\u0627\u0644\u0645\u0639\u0644\u0651\u0645\u064a\u0646 \u0641\u0642\u0637 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u062d\u0633\u0627\u0628.',
    submitFailed: '\u062a\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628.',
    fillRequired: '\u064a\u0631\u062c\u0649 \u062a\u0639\u0645\u064a\u0631 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0644\u0642\u0628 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.',
    success: '\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0646\u062c\u0627\u062d. \u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0642\u0628\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644.',
    accountType: '\u0646\u0648\u0639 \u0627\u0644\u062d\u0633\u0627\u0628',
    parent: '\u0648\u0644\u064a',
    teacher: '\u0645\u0639\u0644\u0651\u0645',
    noStudentDirect: '\u0644\u0627 \u064a\u0645\u0643\u0646 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u062a\u0644\u0645\u064a\u0630.',
    firstName: '\u0627\u0644\u0627\u0633\u0645',
    lastName: '\u0627\u0644\u0644\u0642\u0628',
    phone: '\u0627\u0644\u0647\u0627\u062a\u0641',
    address: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646',
    specialty: '\u0627\u0644\u0627\u062e\u062a\u0635\u0627\u0635',
    sending: '\u062c\u0627\u0631\u064d \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628...',
    sendRequest: '\u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062d\u0633\u0627\u0628',
    approvalNote: '\u064a\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0639\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0645\u0648\u0627\u0641\u0642\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629.',
    forgotPassword: '\u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f',
    forgotTitle: '\u0637\u0644\u0628 \u0627\u0633\u062a\u0631\u062c\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
    forgotDescription: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0627\u0644\u0645\u0631\u062a\u0628\u0637 \u0628\u062d\u0633\u0627\u0628 \u0625\u062f\u0627\u0631\u064a \u0623\u0648 \u0648\u0644\u064a \u0623\u0648 \u0645\u0639\u0644\u0651\u0645. \u0633\u062a\u062a\u0645 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u0637\u0631\u0641 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629.',
    sendResetRequest: '\u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u0627\u0633\u062a\u0631\u062c\u0627\u0639',
    sendingReset: '\u062c\u0627\u0631\u064d \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628...',
    resetRequestSent: '\u0625\u0646 \u0643\u0627\u0646 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u0645\u0631\u062a\u0628\u0637\u064b\u0627 \u0628\u062d\u0633\u0627\u0628 \u0625\u062f\u0627\u0631\u064a \u0623\u0648 \u0648\u0644\u064a \u0623\u0648 \u0645\u0639\u0644\u0651\u0645 \u0645\u0641\u0639\u0651\u0644\u060c \u0641\u0642\u062f \u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0633\u062a\u0631\u062c\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629.',
    resetRequestError: '\u062a\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0633\u062a\u0631\u062c\u0627\u0639 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.',
    backToLogin: '\u0627\u0644\u0631\u062c\u0648\u0639 \u0625\u0644\u0649 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
  };

  const translateRegisterError = (message?: string) => {
    const normalized = String(message ?? '').toLowerCase();

    if (normalized.includes('student')) return t.studentBlocked;
    if (normalized.includes('already exists')) return t.duplicateEmail;
    if (normalized.includes('password')) return t.passwordLength;
    if (normalized.includes('email must be valid')) return t.emailInvalid;
    if (normalized.includes('required')) return t.required;
    if (normalized.includes('only parents and teachers')) return t.onlyParentsTeachers;

    return t.submitFailed;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(API_BASE_URL + '/api/login', {
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
      setError(t.connectionError);
    }
  };

  const handleRegisterChange = (field: keyof typeof registerForm, value: string) => {
    setRegisterForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (
      !registerForm.email.trim() ||
      !registerForm.password ||
      !registerForm.firstName.trim() ||
      !registerForm.lastName.trim()
    ) {
      setRegisterError(t.fillRequired);
      return;
    }

    if (registerForm.password.length < 8) {
      setRegisterError(t.passwordLength);
      return;
    }

    try {
      setRegistering(true);

      const response = await fetch(API_BASE_URL + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
          firstName: registerForm.firstName.trim(),
          lastName: registerForm.lastName.trim(),
          phone: registerForm.phone.trim(),
          role: registerForm.role,
          address: registerForm.role === 'PARENT' ? registerForm.address.trim() : undefined,
          specialty: registerForm.role === 'TEACHER' ? registerForm.specialty.trim() : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setRegisterError(translateRegisterError(data.error));
        return;
      }

      setRegisterSuccess(t.success);
      setRegisterForm({
        role: 'PARENT',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        specialty: '',
      });
    } catch {
      setRegisterError(t.connectionError);
    } finally {
      setRegistering(false);
    }
  };


  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const normalizedEmail = forgotEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setForgotError(t.emailInvalid);
      return;
    }

    try {
      setRequestingReset(true);

      const response = await fetch(API_BASE_URL + '/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const normalizedMessage = String(data.error ?? '').toLowerCase();
        setForgotError(
          normalizedMessage.includes('email must be valid')
            ? t.emailInvalid
            : t.resetRequestError
        );
        return;
      }

      setForgotSuccess(t.resetRequestSent);
      setForgotEmail('');
    } catch {
      setForgotError(t.connectionError);
    } finally {
      setRequestingReset(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4" dir="rtl">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-blue-600">
            {t.systemName}
          </h1>
          <p className="text-gray-500">
            {mode === 'login' ? t.loginTitle : mode === 'register' ? t.registerTitle : t.forgotTitle}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setForgotError('');
              setForgotSuccess('');
            }}
            className={
              mode === 'login'
                ? 'rounded-md bg-white px-3 py-2 text-blue-700 shadow-sm'
                : 'rounded-md px-3 py-2 text-slate-600 hover:text-slate-900'
            }
          >
            {t.login}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRegisterError('');
              setRegisterSuccess('');
              setForgotError('');
              setForgotSuccess('');
            }}
            className={
              mode === 'register'
                ? 'rounded-md bg-white px-3 py-2 text-blue-700 shadow-sm'
                : 'rounded-md px-3 py-2 text-slate-600 hover:text-slate-900'
            }
          >
            {t.requestAccount}
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            {error ? (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.email}
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
                {t.password}
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
              {t.login}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError('');
                setForgotError('');
                setForgotSuccess('');
                setForgotEmail(email);
              }}
              className="w-full text-center text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              {t.forgotPassword}
            </button>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handlePasswordResetRequest} className="space-y-5">
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {t.forgotDescription}
            </p>

            {forgotError ? (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {forgotError}
              </div>
            ) : null}

            {forgotSuccess ? (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {forgotSuccess}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.email}
              </label>
              <input
                type="email"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={requestingReset}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {requestingReset ? t.sendingReset : t.sendResetRequest}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setForgotError('');
                setForgotSuccess('');
              }}
              className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {t.backToLogin}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            {registerError ? (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {registerError}
              </div>
            ) : null}

            {registerSuccess ? (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {registerSuccess}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.accountType}
              </label>
              <select
                value={registerForm.role}
                onChange={(e) =>
                  handleRegisterChange('role', e.target.value as 'PARENT' | 'TEACHER')
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="PARENT">{t.parent}</option>
                <option value="TEACHER">{t.teacher}</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {t.noStudentDirect}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.firstName}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  value={registerForm.firstName}
                  onChange={(e) => handleRegisterChange('firstName', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.lastName}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  value={registerForm.lastName}
                  onChange={(e) => handleRegisterChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.email}
              </label>
              <input
                type="email"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
                value={registerForm.email}
                onChange={(e) => handleRegisterChange('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.password}
              </label>
              <input
                type="password"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
                value={registerForm.password}
                onChange={(e) => handleRegisterChange('password', e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">{t.passwordLength}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.phone}
              </label>
              <input
                type="text"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
                value={registerForm.phone}
                onChange={(e) => handleRegisterChange('phone', e.target.value)}
              />
            </div>

            {registerForm.role === 'PARENT' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.address}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  value={registerForm.address}
                  onChange={(e) => handleRegisterChange('address', e.target.value)}
                />
              </div>
            ) : null}

            {registerForm.role === 'TEACHER' ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.specialty}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  value={registerForm.specialty}
                  onChange={(e) => handleRegisterChange('specialty', e.target.value)}
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={registering}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {registering ? t.sending : t.sendRequest}
            </button>

            <p className="text-center text-xs text-slate-500">
              {t.approvalNote}
            </p>
          </form>
        )}
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