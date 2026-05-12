import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

type TeacherOverviewTabKey =
  | "schedules"
  | "attendance"
  | "grades"
  | "assignments"
  | "announcements";

type TeacherOverviewPageProps = {
  apiBaseUrl: string;
  token: string;
  onNavigate: (tab: TeacherOverviewTabKey) => void;
};

type TeacherOverviewResponse = {
  teacher: {
    id: string;
    specialty?: string;
    hireDate?: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
    };
  };
  schedules: TeacherScheduleRow[];
  assignments: AssignmentItem[];
  announcements: AnnouncementItem[];
  notifications: NotificationItem[];
};

type TeacherScheduleRow = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  class?: {
    id: string;
    name: string;
    academicYear?: string;
  };
  subject?: {
    id: string;
    name: string;
  };
};

type AssignmentItem = {
  id: string;
  title: string;
  dueDate: string;
  class?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  _count?: {
    submissions: number;
  };
};

type AnnouncementItem = {
  id: string;
  title: string;
  audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "CLASS";
  createdAt: string;
  class?: {
    id: string;
    name: string;
  } | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ar-TN");
}

function translateDay(value: string) {
  const normalized = value.toUpperCase();

  if (normalized === "MONDAY") return "الاثنين";
  if (normalized === "TUESDAY") return "الثلاثاء";
  if (normalized === "WEDNESDAY") return "الأربعاء";
  if (normalized === "THURSDAY") return "الخميس";
  if (normalized === "FRIDAY") return "الجمعة";
  if (normalized === "SATURDAY") return "السبت";
  if (normalized === "SUNDAY") return "الأحد";

  return value;
}

function translateAudience(audience: AnnouncementItem["audience"]) {
  if (audience === "ALL") return "الجميع";
  if (audience === "STUDENTS") return "التلاميذ";
  if (audience === "PARENTS") return "الأولياء";
  if (audience === "TEACHERS") return "المعلّمون";
  if (audience === "CLASS") return "قسم محدد";

  return "غير محدد";
}

export default function TeacherOverviewPage({
  apiBaseUrl,
  token,
  onNavigate,
}: TeacherOverviewPageProps) {
  const { showToast } = useToast();

  const [data, setData] = useState<TeacherOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const json = await apiGet<TeacherOverviewResponse>(
          `${apiBaseUrl}/api/my-teacher-overview`,
          token
        );

        setData(json);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "تعذر تحميل لوحة قيادة المعلّم.";
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, token]);

  const schedules = data?.schedules ?? [];
  const assignments = data?.assignments ?? [];
  const announcements = data?.announcements ?? [];
  const notifications = data?.notifications ?? [];

  const myClassesCount = useMemo(() => {
    return new Set(
      schedules.map((item) => item.class?.id).filter(Boolean)
    ).size;
  }, [schedules]);

  const upcomingAssignments = useMemo(() => {
    const now = Date.now();

    return [...assignments]
      .filter((item) => new Date(item.dueDate).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
      .slice(0, 5);
  }, [assignments]);

  const latestAnnouncements = useMemo(
    () => announcements.slice(0, 5),
    [announcements]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  if (loading) {
    return <LoadingState message="جارٍ تحميل لوحة قيادة المعلّم..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState message="لا توجد بيانات خاصة بالمعلّم." />;
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">لوحة قيادة المعلّم</h2>
        <p className="mt-1 text-sm text-slate-500">
          متابعة جدول الأوقات، الواجبات، الإعلانات والإشعارات في مكان واحد.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">حصص جدول الأوقات</p>
          <p className="mt-2 text-2xl font-bold">{schedules.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">الأقسام المرتبطة بي</p>
          <p className="mt-2 text-2xl font-bold">{myClassesCount}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">واجباتي</p>
          <p className="mt-2 text-2xl font-bold">{assignments.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">الإشعارات غير المقروءة</p>
          <p className="mt-2 text-2xl font-bold">{unreadNotifications}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">جدول أوقاتي</h3>
            <button
              onClick={() => onNavigate("schedules")}
              className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              فتح جدول الأوقات
            </button>
          </div>

          {schedules.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد حصص في جدول الأوقات.</p>
          ) : (
            <div className="space-y-3">
              {schedules.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <p className="font-medium text-slate-900">
                    {item.subject?.name || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.class?.name || "-"} • {translateDay(item.dayOfWeek)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.startTime} - {item.endTime}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">واجباتي</h3>
            <button
              onClick={() => onNavigate("assignments")}
              className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              فتح الواجبات
            </button>
          </div>

          {upcomingAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد واجبات قادمة.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.class?.name || "-"} • {item.subject?.name || "-"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    الأجل: {formatDateTime(item.dueDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    عدد التسليمات: {item._count?.submissions ?? 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">آخر الإعلانات</h3>
            <button
              onClick={() => onNavigate("announcements")}
              className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              فتح الإعلانات
            </button>
          </div>

          {latestAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد إعلانات حاليًا.</p>
          ) : (
            <div className="space-y-3">
              {latestAnnouncements.map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {translateAudience(item.audience)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.class?.name || "عام"} • {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">إجراءات سريعة</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => onNavigate("attendance")}
              className="rounded-2xl border p-4 text-right hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">تسجيل الحضور والغياب</p>
              <p className="mt-1 text-sm text-slate-500">
                تحديد التلاميذ الحاضرين أو الغائبين أو المتأخرين.
              </p>
            </button>

            <button
              onClick={() => onNavigate("grades")}
              className="rounded-2xl border p-4 text-right hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">إدخال الأعداد</p>
              <p className="mt-1 text-sm text-slate-500">
                تسجيل الأعداد والملاحظات حسب القسم والمادة.
              </p>
            </button>

            <button
              onClick={() => onNavigate("assignments")}
              className="rounded-2xl border p-4 text-right hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">إدارة الواجبات</p>
              <p className="mt-1 text-sm text-slate-500">
                إنشاء الواجبات وتحيينها ومتابعة آجالها.
              </p>
            </button>

            <button
              onClick={() => onNavigate("announcements")}
              className="rounded-2xl border p-4 text-right hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">عرض الإعلانات</p>
              <p className="mt-1 text-sm text-slate-500">
                قراءة إعلانات المدرسة والإعلانات الخاصة بالمعلّمين.
              </p>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}