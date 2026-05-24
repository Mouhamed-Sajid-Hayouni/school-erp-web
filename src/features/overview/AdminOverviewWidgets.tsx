import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Megaphone,
  FileText,
  ArrowLeft,
  Users,
  School,
  BookOpen,
} from "lucide-react";

type StatsResponse = {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalAdmins: number;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  audience: "ALL" | "STUDENTS" | "PARENTS" | "TEACHERS" | "CLASS";
  classId: string | null;
  createdAt: string;
  updatedAt: string;
  class?: {
    id: string;
    name: string;
    academicYear: string;
  } | null;
  createdBy?: {
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null;
};

type AssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  class?: {
    id: string;
    name: string;
    academicYear: string;
  };
  subject?: {
    id: string;
    name: string;
    coefficient: number;
  };
  _count?: {
    submissions: number;
  };
};

type AdminOverviewWidgetsProps = {
  apiBaseUrl: string;
  token: string;
  onNavigate?: (
    tab:
      | "users"
      | "classes"
      | "subjects"
      | "schedules"
      | "attendance"
      | "grades"
      | "assignments"
      | "announcements"
  ) => void;
};

async function apiRequest<T>(
  url: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "تعذر تنفيذ الطلب.");
  }

  return data as T;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ar-TN");
}

function translateAudience(audience: AnnouncementItem["audience"]) {
  if (audience === "ALL") return "الجميع";
  if (audience === "STUDENTS") return "التلاميذ عبر الأولياء";
  if (audience === "PARENTS") return "الأولياء";
  if (audience === "TEACHERS") return "المعلّمون";
  if (audience === "CLASS") return "قسم محدد";

  return "غير محدد";
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Panel({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {actionLabel}
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function AdminOverviewWidgets({
  apiBaseUrl,
  token,
  onNavigate,
}: AdminOverviewWidgetsProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const [statsData, notificationsData, announcementsData, assignmentsData] =
          await Promise.all([
            apiRequest<StatsResponse>(`${apiBaseUrl}/api/stats`, token),
            apiRequest<NotificationItem[]>(
              `${apiBaseUrl}/api/my-notifications`,
              token
            ).catch(() => []),
            apiRequest<AnnouncementItem[]>(
              `${apiBaseUrl}/api/announcements`,
              token
            ),
            apiRequest<AssignmentItem[]>(`${apiBaseUrl}/api/assignments`, token),
          ]);

        setStats(statsData);
        setNotifications(notificationsData);
        setAnnouncements(announcementsData);
        setAssignments(assignmentsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "تعذر تحميل عناصر لوحة القيادة."
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, token]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const latestAnnouncements = useMemo(
    () => announcements.slice(0, 5),
    [announcements]
  );

  const upcomingAssignments = useMemo(() => {
    const now = Date.now();

    return assignments
      .filter((item) => new Date(item.dueDate).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )
      .slice(0, 5);
  }, [assignments]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm" dir="rtl">
        <p className="text-sm text-slate-500">جارٍ تحميل عناصر لوحة القيادة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" dir="rtl">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي المستخدمين"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="التلاميذ"
          value={stats?.totalStudents ?? 0}
          icon={<School className="h-5 w-5" />}
        />
        <StatCard
          label="المعلّمون"
          value={stats?.totalTeachers ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="الإشعارات غير المقروءة"
          value={unreadCount}
          icon={<Bell className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="آخر الإعلانات"
          actionLabel="فتح الإعلانات"
          onAction={() => onNavigate?.("announcements")}
        >
          {latestAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد إعلانات حاليًا.</p>
          ) : (
            <div className="space-y-3">
              {latestAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Megaphone className="h-4 w-4 text-slate-500" />
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {translateAudience(item.audience)}
                    </span>
                    {item.class ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {item.class.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600">{item.content}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="الواجبات القادمة"
          actionLabel="فتح الواجبات"
          onAction={() => onNavigate?.("assignments")}
        >
          {upcomingAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد واجبات قادمة.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <p className="font-medium text-slate-900">{item.title}</p>
                    {item.subject ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {item.subject.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600">
                    {item.description || "لا يوجد وصف."}
                  </p>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                    <p>القسم: {item.class?.name || "-"}</p>
                    <p>الأجل: {formatDateTime(item.dueDate)}</p>
                    <p>عدد التسليمات: {item._count?.submissions ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="إجراءات سريعة">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() => onNavigate?.("users")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-right hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">متابعة الحسابات</p>
            <p className="mt-1 text-sm text-slate-500">
              عرض المستخدمين ومتابعة طلبات الحسابات دون إنشاء مباشر
            </p>
          </button>

          <button
            onClick={() => onNavigate?.("classes")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-right hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">إدارة الأقسام</p>
            <p className="mt-1 text-sm text-slate-500">
              تنظيم الأقسام والمستويات الدراسية
            </p>
          </button>

          <button
            onClick={() => onNavigate?.("assignments")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-right hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">متابعة الواجبات</p>
            <p className="mt-1 text-sm text-slate-500">
              متابعة الواجبات وآجالها دون إنشاء أو تعديل
            </p>
          </button>

          <button
            onClick={() => onNavigate?.("announcements")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-right hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">إدارة الإعلانات</p>
            <p className="mt-1 text-sm text-slate-500">
              نشر إعلانات عامة أو موجهة للأقسام
            </p>
          </button>
        </div>
      </Panel>
    </div>
  );
}