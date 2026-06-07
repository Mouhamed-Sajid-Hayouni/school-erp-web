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
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

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
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);

  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken');

    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setResetError('');
      setResetSuccess('');
      setResetPassword('');
      setResetConfirmPassword('');
      setMode('reset');
    }
  }, []);

  const token = localStorage.getItem('token');

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const t = {
    systemName: 'نظام إدارة المدرسة',
    loginTitle: 'تسجيل الدخول إلى الحساب',
    registerTitle: 'طلب إنشاء حساب جديد',
    login: 'تسجيل الدخول',
    requestAccount: 'طلب حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    connectionError: 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقًا.',
    studentBlocked: 'لا يمكن إنشاء حساب مباشر للتلميذ. التلاميذ يبقون ملفات مدرسية فقط.',
    duplicateEmail: 'يوجد حساب مسجل بهذا البريد الإلكتروني.',
    passwordLength: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل.',
    emailInvalid: 'يجب إدخال بريد إلكتروني صحيح.',
    required: 'يرجى تعمير كل الحقول المطلوبة.',
    onlyParentsTeachers: 'يمكن للأولياء والمعلّمين فقط إرسال طلب حساب.',
    submitFailed: 'تعذر إرسال طلب إنشاء الحساب.',
    fillRequired: 'يرجى تعمير الاسم واللقب والبريد الإلكتروني وكلمة المرور.',
    success: 'تم إرسال طلب إنشاء الحساب بنجاح. الرجاء انتظار موافقة إدارة المدرسة قبل تسجيل الدخول.',
    accountType: 'نوع الحساب',
    parent: 'ولي',
    teacher: 'معلّم',
    noStudentDirect: 'لا يمكن إنشاء حساب مباشر للتلميذ.',
    firstName: 'الاسم',
    lastName: 'اللقب',
    phone: 'الهاتف',
    address: 'العنوان',
    specialty: 'الاختصاص',
    sending: 'جارٍ إرسال الطلب...',
    sendRequest: 'إرسال طلب الحساب',
    approvalNote: 'يتم تفعيل الحساب بعد مراجعة وموافقة إدارة المدرسة.',
    forgotPassword: 'نسيت كلمة المرور؟',
    forgotTitle: 'طلب استرجاع كلمة المرور',
    forgotDescription: 'أدخل البريد الإلكتروني المرتبط بحساب إداري أو ولي أو معلّم. سيتم إنشاء رابط آمن لاسترجاع كلمة المرور.',
    sendResetRequest: 'إرسال طلب الاسترجاع',
    sendingReset: 'جارٍ إرسال الطلب...',
    resetRequestSent: 'إن كان هذا البريد مرتبطًا بحساب إداري أو ولي أو معلّم مفعّل، فسيتم إنشاء رابط آمن لاسترجاع كلمة المرور. في العرض المحلي، يظهر الرابط في سجلات الخادم.',
    resetRequestError: 'تعذر إرسال طلب استرجاع كلمة المرور.',
    resetTitle: 'تعيين كلمة مرور جديدة',
    resetDescription: 'أدخل كلمة مرور جديدة لإتمام عملية الاسترجاع.',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    saveNewPassword: 'حفظ كلمة المرور الجديدة',
    savingNewPassword: 'جارٍ حفظ كلمة المرور...',
    resetPasswordSuccess: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.',
    resetPasswordError: 'تعذر تغيير كلمة المرور.',
    passwordTooShort: 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.',
    passwordMismatch: 'تأكيد كلمة المرور غير مطابق.',
    resetLinkInvalid: 'رابط استرجاع كلمة المرور غير صالح أو منتهي.',
    backToLogin: 'الرجوع إلى تسجيل الدخول',
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

  const handlePasswordResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetToken) {
      setResetError(t.resetLinkInvalid);
      return;
    }

    if (!resetPassword || resetPassword.length < 6) {
      setResetError(t.passwordTooShort);
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetError(t.passwordMismatch);
      return;
    }

    setResettingPassword(true);

    try {
      const response = await fetch(API_BASE_URL + '/api/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          password: resetPassword,
          confirmPassword: resetConfirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const normalizedMessage = String(data.error || '').toLowerCase();
        setResetError(
          normalizedMessage.includes('invalid') || normalizedMessage.includes('expired')
            ? t.resetLinkInvalid
            : normalizedMessage.includes('confirmation')
              ? t.passwordMismatch
              : normalizedMessage.includes('6 characters')
                ? t.passwordTooShort
                : t.resetPasswordError
        );
        return;
      }

      setResetSuccess(t.resetPasswordSuccess);
      setResetPassword('');
      setResetConfirmPassword('');
      setResetToken('');
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch {
      setResetError(t.connectionError);
    } finally {
      setResettingPassword(false);
    }
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
            {mode === 'login' ? t.loginTitle : mode === 'register' ? t.registerTitle : mode === 'forgot' ? t.forgotTitle : t.resetTitle}
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
        ) : mode === 'reset' ? (
          <form onSubmit={handlePasswordResetConfirm} className="space-y-5">
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {t.resetDescription}
            </p>

            {resetError ? (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {resetError}
              </div>
            ) : null}

            {resetSuccess ? (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {resetSuccess}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.newPassword}
              </label>
              <input
                type="password"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.confirmPassword}
              </label>
              <input
                type="password"
                dir="ltr"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left focus:ring-2 focus:ring-blue-500"
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={resettingPassword || Boolean(resetSuccess)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {resettingPassword ? t.savingNewPassword : t.saveNewPassword}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setResetError('');
                setResetSuccess('');
                setResetPassword('');
                setResetConfirmPassword('');
                setResetToken('');
                window.history.replaceState({}, document.title, window.location.pathname);
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