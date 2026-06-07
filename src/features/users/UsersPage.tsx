import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  profileImage?: string | null;
  createdAt?: string;
};

type ClassOption = {
  id: string;
  name: string;
  academicYear?: string;
};

type PendingRequestRow = UserRow & {
  parentProfile?: {
    address: string | null;
  } | null;
  teacherProfile?: {
    specialty: string | null;
  } | null;
};

type UsersPageProps = {
  apiBaseUrl: string;
  token: string;
};

const roleLabels: Record<Role, string> = {
  ADMIN: "مدير النظام",
  TEACHER: "معلّم",
  STUDENT: "تلميذ",
  PARENT: "ولي",
};

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("first name") || normalized.includes("last name")) {
    return "الاسم واللقب والبريد الإلكتروني مطلوبة.";
  }

  if (normalized.includes("password")) {
    return "يرجى التحقق من كلمة المرور.";
  }

  if (normalized.includes("class")) {
    return "يرجى اختيار القسم المناسب.";
  }

  if (normalized.includes("student")) {
    return "يرجى اختيار التلميذ المرتبط بهذا الولي.";
  }


  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-TN");
}

function getInitials(user: UserRow) {
  const first = user.firstName?.trim()?.[0] ?? "";
  const last = user.lastName?.trim()?.[0] ?? "";
  const initials = `${first}${last}`.trim();

  return initials || user.email?.trim()?.[0]?.toUpperCase() || "؟";
}

function getProfileImageUrl(apiBaseUrl: string, profileImage: string | null) {
  if (!profileImage) return "";

  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
    return profileImage;
  }

  const normalizedPath = profileImage.startsWith("/")
    ? profileImage
    : `/${profileImage}`;

  return `${apiBaseUrl}${normalizedPath}`;
}


function truncateLongText(value: string, maxLength = 34) {
  const safeValue = value.trim();
  return safeValue.length > maxLength ? `${safeValue.slice(0, maxLength)}...` : safeValue;
}

function UserAvatar({
  apiBaseUrl,
  user,
  size = "md",
}: {
  apiBaseUrl: string;
  user: UserRow;
  size?: "sm" | "md";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageUrl = getProfileImageUrl(apiBaseUrl, user.profileImage);
  const sizeClass = size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";

  const imageUrlWithCacheBust = imageUrl
    ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(
        user.profileImage || ""
      )}`
    : "";

  if (imageUrlWithCacheBust && !imageFailed) {
    return (
      <img
        src={imageUrlWithCacheBust}
        alt={`${user.firstName} ${user.lastName}`}
        className={`${sizeClass} rounded-full border object-cover shadow-sm`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-slate-900 font-semibold text-white shadow-sm`}
      title={
        user.profileImage
          ? `الصورة موجودة ولكن تعذر عرضها: ${user.profileImage}`
          : "لا توجد صورة"
      }
    >
      {getInitials(user)}
    </div>
  );
}

export default function UsersPage({ apiBaseUrl, token }: UsersPageProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequestRow[]>([]);
  const [childEnrollmentRequests, setChildEnrollmentRequests] = useState<ChildEnrollmentRequestRow[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [, setLoadingClasses] = useState(true);
  const [loadingPendingRequests, setLoadingPendingRequests] = useState(true);
  const [loadingChildEnrollmentRequests, setLoadingChildEnrollmentRequests] = useState(true);
  const [error, setError] = useState("");
  const [pendingRequestsError, setPendingRequestsError] = useState("");
  const [childEnrollmentRequestsError, setChildEnrollmentRequestsError] = useState("");

  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [approvingChildRequestId, setApprovingChildRequestId] = useState<string | null>(null);
  const [rejectingChildRequestId, setRejectingChildRequestId] = useState<string | null>(null);
  const [selectedChildRequestClasses, setSelectedChildRequestClasses] = useState<Record<string, string>>({});
  const [childRequestAdminNotes, setChildRequestAdminNotes] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setError("");

      const json = await apiGet<UserRow[]>(`${apiBaseUrl}/api/users`, token);
      setUsers(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
    } finally {
      setLoadingUsers(false);
    }
  }, [apiBaseUrl, token]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      setLoadingPendingRequests(true);
      setPendingRequestsError("");

      const json = await apiGet<PendingRequestRow[]>(
        `${apiBaseUrl}/api/users/pending-requests`,
        token
      );
      setPendingRequests(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setPendingRequestsError(translateError(message));
    } finally {
      setLoadingPendingRequests(false);
    }
  }, [apiBaseUrl, token]);

  const fetchChildEnrollmentRequests = useCallback(async () => {
    try {
      setLoadingChildEnrollmentRequests(true);
      setChildEnrollmentRequestsError("");

      const json = await apiGet<ChildEnrollmentRequestRow[]>(
        `${apiBaseUrl}/api/child-enrollment-requests`,
        token
      );

      const rows = Array.isArray(json) ? json : [];
      setChildEnrollmentRequests(rows);
      setSelectedChildRequestClasses((prev) => {
        const next = { ...prev };

        rows.forEach((request) => {
          if (!next[request.id]) {
            next[request.id] = "";
          }
        });

        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setChildEnrollmentRequestsError(translateError(message));
    } finally {
      setLoadingChildEnrollmentRequests(false);
    }
  }, [apiBaseUrl, token]);

  const fetchClasses = useCallback(async () => {
    try {
      setLoadingClasses(true);
      setError("");

      const json = await apiGet<ClassOption[]>(`${apiBaseUrl}/api/classes`, token);
      setClasses(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
    } finally {
      setLoadingClasses(false);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    fetchUsers();
    fetchPendingRequests();
    fetchClasses();
  }, [fetchUsers, fetchPendingRequests, fetchClasses]);


  const handleApproveRegistrationRequest = async (id: string) => {
    const confirmed = window.confirm(pendingRequestText.confirm);

    if (!confirmed) return;

    try {
      setApprovingRequestId(id);
      setPendingRequestsError("");

      await apiPost<{ message: string }, Record<string, never>>(
        `${apiBaseUrl}/api/users/${id}/approve-request`,
        token,
        {}
      );

      await fetchPendingRequests();
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setPendingRequestsError(translateError(message));
    } finally {
      setApprovingRequestId(null);
    }
  };


  const handleRejectRegistrationRequest = async (id: string) => {
    const confirmed = window.confirm(pendingRequestText.rejectConfirm);

    if (!confirmed) return;

    try {
      setRejectingRequestId(id);
      setPendingRequestsError("");

      await apiPost<{ message: string }, Record<string, never>>(
        `${apiBaseUrl}/api/users/${id}/reject-request`,
        token,
        {}
      );

      await fetchPendingRequests();
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setPendingRequestsError(translateError(message));
    } finally {
      setRejectingRequestId(null);
    }
  };

  const handleApproveChildEnrollmentRequest = async (requestId: string) => {
    const classId = selectedChildRequestClasses[requestId] ?? "";

    if (!classId) {
      setChildEnrollmentRequestsError("يرجى اختيار القسم قبل قبول طلب تسجيل الابن.");
      return;
    }

    const confirmed = window.confirm("هل تريد قبول طلب تسجيل هذا الابن وإنشاء ملف تلميذ مرتبط بالولي؟");

    if (!confirmed) return;

    try {
      setApprovingChildRequestId(requestId);
      setChildEnrollmentRequestsError("");

      await apiPost<ChildEnrollmentRequestRow, { classId: string; adminNote: string }>(
        `${apiBaseUrl}/api/child-enrollment-requests/${requestId}/approve`,
        token,
        {
          classId,
          adminNote: childRequestAdminNotes[requestId] ?? "",
        }
      );

      await fetchChildEnrollmentRequests();
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setChildEnrollmentRequestsError(translateError(message));
    } finally {
      setApprovingChildRequestId(null);
    }
  };

  const handleRejectChildEnrollmentRequest = async (requestId: string) => {
    const confirmed = window.confirm("هل تريد رفض طلب تسجيل هذا الابن؟");

    if (!confirmed) return;

    try {
      setRejectingChildRequestId(requestId);
      setChildEnrollmentRequestsError("");

      await apiPost<ChildEnrollmentRequestRow, { adminNote: string }>(
        `${apiBaseUrl}/api/child-enrollment-requests/${requestId}/reject`,
        token,
        {
          adminNote: childRequestAdminNotes[requestId] ?? "",
        }
      );

      await fetchChildEnrollmentRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setChildEnrollmentRequestsError(translateError(message));
    } finally {
      setRejectingChildRequestId(null);
    }
  };

  const pendingChildEnrollmentRequests = childEnrollmentRequests.filter(
    (request) => request.status === "PENDING"
  );

  const pendingRequestText = {
    requestsTitle: 'طلبات الحسابات المعلّقة',
    requestsDescription: 'تفعيل حسابات الأولياء والمعلمين بعد التثبت من الطلب. لا يتم إنشاء حسابات مباشرة للتلاميذ.',
    refresh: 'تحديث الطلبات',
    loading: 'جارٍ تحميل طلبات الحساب...',
    empty: 'لا توجد طلبات حساب معلّقة.',
    approve: 'تفعيل الحساب',
    approving: 'جارٍ التفعيل...',
    reject: 'رفض الطلب',
    rejecting: 'جارٍ الرفض...',
    confirm: 'هل تريد تفعيل هذا الحساب؟',
    rejectConfirm: 'هل تريد رفض هذا الطلب؟ سيتم حذف حسابه المعلّق.',
    parent: 'ولي',
    teacher: 'معلّم',
    address: 'العنوان',
    specialty: 'الاختصاص',
    submittedAt: 'تاريخ الطلب',
    pendingLabel: 'في انتظار الموافقة',
    noExtra: 'لا توجد معلومات إضافية.',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">المستخدمون</h2>
          <p className="text-sm text-slate-500">
            عرض حسابات المنصة والأدوار. تعديل الحسابات معطّل حسب سياسة النظام.
          </p>
        </div>
      </header>

      {error ? <ErrorState message={error} /> : null}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        هذه الصفحة للعرض فقط. إنشاء المستخدمين أو تعديلهم أو حذفهم معطّل من الخادم.
      </div>



      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">طلبات تسجيل الأبناء</h3>
            <p className="mt-1 text-sm text-slate-500">
              مراجعة طلبات الأولياء، ثم قبول الطلب مع تعيين القسم أو رفضه.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchChildEnrollmentRequests}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            تحديث الطلبات
          </button>
        </div>

        {loadingChildEnrollmentRequests ? (
          <LoadingState message="جاري تحميل طلبات تسجيل الأبناء..." />
        ) : childEnrollmentRequestsError ? (
          <ErrorState message={childEnrollmentRequestsError} />
        ) : pendingChildEnrollmentRequests.length === 0 ? (
          <EmptyState message="لا توجد طلبات تسجيل أبناء معلّقة." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingChildEnrollmentRequests.map((request) => {
              const isBusy =
                approvingChildRequestId === request.id || rejectingChildRequestId === request.id;

              return (
                <article key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {request.firstName} {request.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        الولي: {request.parent?.user?.firstName} {request.parent?.user?.lastName}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                      في انتظار المراجعة
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p>
                      <span className="font-medium">تاريخ الولادة: </span>
                      {formatDate(request.dateOfBirth)}
                    </p>
                    <p>
                      <span className="font-medium">المستوى المطلوب: </span>
                      {request.requestedLevel || "غير محدد"}
                    </p>
                    <p>
                      <span className="font-medium">ملاحظة الولي: </span>
                      {request.note || "لا توجد ملاحظات."}
                    </p>
                    <p>
                      <span className="font-medium">تاريخ الطلب: </span>
                      {formatDate(request.createdAt)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <select
                      value={selectedChildRequestClasses[request.id] ?? ""}
                      onChange={(event) =>
                        setSelectedChildRequestClasses((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">اختر القسم عند القبول</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} - {item.academicYear}
                        </option>
                      ))}
                    </select>

                    <textarea
                      value={childRequestAdminNotes[request.id] ?? ""}
                      onChange={(event) =>
                        setChildRequestAdminNotes((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                      className="min-h-20 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
                      placeholder="ملاحظة إدارية اختيارية"
                    />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleApproveChildEnrollmentRequest(request.id)}
                        disabled={isBusy}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {approvingChildRequestId === request.id ? "جاري القبول..." : "قبول وإنشاء ملف"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectChildEnrollmentRequest(request.id)}
                        disabled={isBusy}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {rejectingChildRequestId === request.id ? "جاري الرفض..." : "رفض الطلب"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{pendingRequestText.requestsTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {pendingRequestText.requestsDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPendingRequests}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            {pendingRequestText.refresh}
          </button>
        </div>

        {loadingPendingRequests ? (
          <LoadingState message={pendingRequestText.loading} />
        ) : pendingRequestsError ? (
          <ErrorState message={pendingRequestsError} />
        ) : pendingRequests.length === 0 ? (
          <EmptyState message={pendingRequestText.empty} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingRequests.map((request) => {
              const isParentRequest = request.role === "PARENT";
              const extraLabel = isParentRequest
                ? pendingRequestText.address
                : pendingRequestText.specialty;
              const extraValue = isParentRequest
                ? request.parentProfile?.address
                : request.teacherProfile?.specialty;
              const isCurrentRequestBusy =
                approvingRequestId === request.id || rejectingRequestId === request.id;

              return (
                <article
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {request.firstName} {request.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isParentRequest ? pendingRequestText.parent : pendingRequestText.teacher}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                      {pendingRequestText.pendingLabel}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p>
                      <span className="font-medium">{pendingRequestText.email}: </span>
                      <span dir="ltr" className="block text-left leading-relaxed" style={{ width: "260px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={request.email}>{truncateLongText(request.email)}</span>
                    </p>
                    {request.phone ? (
                      <p>
                        <span className="font-medium">{pendingRequestText.phone}: </span>
                        <span dir="ltr">{request.phone}</span>
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium">{extraLabel}: </span>
                      {extraValue || pendingRequestText.noExtra}
                    </p>
                    <p>
                      <span className="font-medium">{pendingRequestText.submittedAt}: </span>
                      {formatDate(request.createdAt)}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleApproveRegistrationRequest(request.id)}
                      disabled={isCurrentRequestBusy}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {approvingRequestId === request.id
                        ? pendingRequestText.approving
                        : pendingRequestText.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectRegistrationRequest(request.id)}
                      disabled={isCurrentRequestBusy}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {rejectingRequestId === request.id
                        ? pendingRequestText.rejecting
                        : pendingRequestText.reject}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">قائمة المستخدمين</h3>
          <button
            onClick={fetchUsers}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            تحديث
          </button>
        </div>

        {loadingUsers ? (
          <LoadingState message="جارٍ تحميل المستخدمين..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : users.length === 0 ? (
          <EmptyState message="لا يوجد مستخدمون." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-right text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">المستخدم</th>
                  <th className="px-3 py-3 font-medium">البريد الإلكتروني</th>
                  <th className="px-3 py-3 font-medium">الدور</th>
                  <th className="px-3 py-3 font-medium">تاريخ الإنشاء</th>
                  
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar apiBaseUrl={apiBaseUrl} user={user} />
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.profileImage
                              ? "تم رفع صورة المستخدم"
                              : "لا توجد صورة"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-left text-sm text-slate-600" dir="ltr">
                      <span dir={user.role === "STUDENT" ? "rtl" : "ltr"} className="block text-left leading-relaxed" style={{ width: "260px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={user.role === "STUDENT" ? undefined : user.email}>{user.role === "STUDENT" ? "بدون بريد دخول" : truncateLongText(user.email)}</span>
                    </td>

                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {roleLabels[user.role]}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-sm text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
