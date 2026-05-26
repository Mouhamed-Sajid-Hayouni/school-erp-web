import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";
import AdminOverviewWidgets from "./AdminOverviewWidgets";

type StatsResponse = {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalAdmins: number;
};

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  createdAt?: string;
};

type SchoolSettings = {
  id: string;
  schoolName: string;
  schoolSubtitle: string;
  academicYear: string;
  defaultTrimester: "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";
  defaultReportFrom?: string | null;
  defaultReportTo?: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
};

type AuditLogsResponse = {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type OverviewTabKey =
  | "users"
  | "classes"
  | "subjects"
  | "schedules"
  | "attendance"
  | "grades"
  | "assignments"
  | "announcements";

type OverviewPageProps = {
  apiBaseUrl: string;
  token: string;
  onNavigate: (tab: OverviewTabKey) => void;
};

const roleLabels: Record<UserRow["role"], string> = {
  ADMIN: "مدير النظام",
  TEACHER: "معلّم",
  STUDENT: "تلميذ",
  PARENT: "ولي",
};

const entityLabels: Record<string, string> = {
  User: "مستخدم",
  Class: "قسم",
  Subject: "مادة",
  Schedule: "جدول أوقات",
  Attendance: "حضور وغياب",
  Grade: "عدد",
  Assignment: "واجب",
  Announcement: "إعلان",
  Message: "رسالة",
  SchoolSettings: "إعدادات المدرسة",
};


const auditActionWordLabels: Record<string, string> = {
  CREATE: "إنشاء",
  UPDATE: "تعديل",
  DELETE: "حذف",
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  APPROVE: "قبول",
  REJECT: "رفض",
  REQUEST: "طلب",
  RESET: "إعادة تعيين",
  SEND: "إرسال",
  SUBMIT: "تسليم",
  SAVE: "حفظ",
  NOTIFY: "إشعار",
  PUBLISH: "نشر",
  EXPORT: "تصدير",
  IMPORT: "استيراد",
  VIEW: "عرض",
  OPEN: "فتح",
  CLOSE: "غلق",
  USER: "مستخدم",
  USERS: "مستخدمين",
  TEACHER: "معلّم",
  PARENT: "ولي",
  STUDENT: "تلميذ",
  CLASS: "قسم",
  CLASSES: "أقسام",
  SUBJECT: "مادة",
  SUBJECTS: "مواد",
  SCHEDULE: "جدول",
  SCHEDULES: "جداول",
  ASSIGNMENT: "واجب",
  ASSIGNMENTS: "واجبات",
  GRADE: "عدد",
  GRADES: "أعداد",
  ATTENDANCE: "حضور",
  ABSENCE: "غياب",
  ANNOUNCEMENT: "إعلان",
  ANNOUNCEMENTS: "إعلانات",
  MESSAGE: "رسالة",
  MESSAGES: "رسائل",
  SETTINGS: "إعدادات",
  SCHOOL: "مدرسة",
  PROFILE: "ملف",
  PASSWORD: "كلمة مرور",
  IMAGE: "صورة",
  BULLETIN: "بطاقة أعداد",
  REPORT: "تقرير",
  REPORTS: "تقارير",
  ACCOUNT: "حساب",
};

function formatUnknownAuditAction(action: string) {
  const translated = action
    .split("_")
    .map((part) => auditActionWordLabels[part] ?? "")
    .filter(Boolean)
    .join(" ");

  return translated || "إجراء نظام";
}

function translateAuditAction(action: string) {
  const normalized = action.toUpperCase();

  if (normalized === "CREATE_USER") return "إنشاء مستخدم";
  if (normalized === "UPDATE_USER") return "تعديل مستخدم";
  if (normalized === "DELETE_USER") return "حذف مستخدم";
  if (normalized === "UPDATE_USER_PASSWORD") return "تغيير كلمة مرور";
  if (normalized === "UPDATE_USER_PROFILE_IMAGE") return "تحديث صورة المستخدم";

  if (normalized === "CREATE_CLASS") return "إنشاء قسم";
  if (normalized === "UPDATE_CLASS") return "تعديل قسم";
  if (normalized === "DELETE_CLASS") return "حذف قسم";

  if (normalized === "CREATE_SUBJECT") return "إنشاء مادة";
  if (normalized === "UPDATE_SUBJECT") return "تعديل مادة";
  if (normalized === "DELETE_SUBJECT") return "حذف مادة";

  if (normalized === "CREATE_SCHEDULE") return "إنشاء حصة";
  if (normalized === "UPDATE_SCHEDULE") return "تعديل حصة";
  if (normalized === "DELETE_SCHEDULE") return "حذف حصة";

  if (normalized === "CREATE_ATTENDANCE") return "تسجيل حضور وغياب";
  if (normalized === "UPDATE_ATTENDANCE") return "تعديل حضور وغياب";

  if (normalized === "CREATE_GRADE") return "تسجيل عدد";
  if (normalized === "UPDATE_GRADE") return "تعديل عدد";

  if (normalized === "CREATE_ASSIGNMENT") return "إنشاء واجب";
  if (normalized === "UPDATE_ASSIGNMENT") return "تعديل واجب";
  if (normalized === "DELETE_ASSIGNMENT") return "حذف واجب";

  if (normalized === "CREATE_ANNOUNCEMENT") return "نشر إعلان";
  if (normalized === "UPDATE_SCHOOL_SETTINGS") return "تحديث إعدادات المدرسة";

  return formatUnknownAuditAction(action);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-TN");
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-TN");
}

export default function OverviewPage({
  apiBaseUrl,
  token,
  onNavigate,
}: OverviewPageProps) {
  const { showToast } = useToast();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [latestAuditLog, setLatestAuditLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [statsJson, usersJson, settingsJson, auditJson] = await Promise.all([
        apiGet<StatsResponse>(`${apiBaseUrl}/api/stats`, token),
        apiGet<UserRow[]>(`${apiBaseUrl}/api/users`, token),
        apiGet<SchoolSettings>(`${apiBaseUrl}/api/settings/school`, token),
        apiGet<AuditLogsResponse>(`${apiBaseUrl}/api/audit-logs?limit=1`, token),
      ]);

      setStats(statsJson);
      setUsers(Array.isArray(usersJson) ? usersJson : []);
      setSchoolSettings(settingsJson);
      setLatestAuditLog(
        Array.isArray(auditJson.data) ? auditJson.data[0] ?? null : null
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, showToast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [users]);

  if (loading) {
    return <LoadingState message="جارٍ تحميل لوحة القيادة..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!stats) {
    return <EmptyState message="لا توجد بيانات في لوحة القيادة." />;
  }

  const trimesterLabel =
    schoolSettings?.defaultTrimester === "TRIMESTER_1"
      ? "الثلاثي الأول"
      : schoolSettings?.defaultTrimester === "TRIMESTER_2"
        ? "الثلاثي الثاني"
        : schoolSettings?.defaultTrimester === "TRIMESTER_3"
          ? "الثلاثي الثالث"
          : "-";

  const latestAuditAction = latestAuditLog
    ? translateAuditAction(latestAuditLog.action)
    : "-";

  const latestAuditEntity = latestAuditLog
    ? entityLabels[latestAuditLog.entity] || latestAuditLog.entity
    : "-";

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">لوحة القيادة</h2>
          <p className="text-sm text-slate-500">
            متابعة حالة المنصة والوصول السريع إلى أهم وظائف النظام.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          تحديث لوحة القيادة
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">السنة الدراسية</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {schoolSettings?.academicYear || "-"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            السنة الدراسية المعتمدة في إعدادات المدرسة
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">الثلاثي الحالي</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {trimesterLabel}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            الفترة الافتراضية للأعداد والتقارير
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">مستخدمو المنصة</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.totalUsers}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {stats.totalStudents} تلميذ • {stats.totalTeachers} معلّم •{" "}
            {stats.totalAdmins} مدير
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">آخر عملية في سجل النظام</p>
          <p className="mt-2 truncate text-lg font-bold text-slate-900">
            {latestAuditAction}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {latestAuditLog
              ? `${latestAuditEntity} • ${formatDateTime(latestAuditLog.createdAt)}`
              : "لا توجد عمليات مسجلة بعد"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">آخر المستخدمين</h3>
          </div>

          {recentUsers.length === 0 ? (
            <p className="text-sm text-slate-500">لا يوجد مستخدمون حديثون.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      {roleLabels[user.role]}
                    </span>
                  </div>
                  <p className="mt-1 text-left text-sm text-slate-500" dir="ltr">
                    {user.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AdminOverviewWidgets
        apiBaseUrl={apiBaseUrl}
        token={token}
        onNavigate={onNavigate}
      />
    </div>
  );
}