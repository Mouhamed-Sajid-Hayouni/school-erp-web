import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Megaphone,
  FileText,
  ArrowRight,
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
    throw new Error((data as { error?: string }).error || "Request failed");
  }

  return data as T;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
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
  children: React.ReactNode;
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
            <ArrowRight className="h-4 w-4" />
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
          err instanceof Error ? err.message : "Failed to load overview widgets"
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
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading overview widgets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Students"
          value={stats?.totalStudents ?? 0}
          icon={<School className="h-5 w-5" />}
        />
        <StatCard
          label="Teachers"
          value={stats?.totalTeachers ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Unread Notifications"
          value={unreadCount}
          icon={<Bell className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Latest Announcements"
          actionLabel="Open Announcements"
          onAction={() => onNavigate?.("announcements")}
        >
          {latestAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements found.</p>
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
                      {item.audience}
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
          title="Upcoming Assignments"
          actionLabel="Open Assignments"
          onAction={() => onNavigate?.("assignments")}
        >
          {upcomingAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming assignments.</p>
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
                    {item.description || "No description"}
                  </p>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                    <p>Class: {item.class?.name || "-"}</p>
                    <p>Due: {formatDateTime(item.dueDate)}</p>
                    <p>Submissions: {item._count?.submissions ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Quick Actions">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() => onNavigate?.("users")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Manage Users</p>
            <p className="mt-1 text-sm text-slate-500">
              Create and maintain platform users
            </p>
          </button>

          <button
            onClick={() => onNavigate?.("classes")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Manage Classes</p>
            <p className="mt-1 text-sm text-slate-500">
              Organize school classes and sections
            </p>
          </button>

          <button
            onClick={() => onNavigate?.("assignments")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Manage Assignments</p>
            <p className="mt-1 text-sm text-slate-500">
              Create homework and track deadlines
            </p>
          </button>

          <button
            onClick={() => onNavigate?.("announcements")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
          >
            <p className="font-semibold text-slate-900">Manage Announcements</p>
            <p className="mt-1 text-sm text-slate-500">
              Publish school-wide or class announcements
            </p>
          </button>
        </div>
      </Panel>
    </div>
  );
}