import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

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

type ClassRow = {
  id: string;
};

type SubjectRow = {
  id: string;
};

type ScheduleRow = {
  id: string;
};

type OverviewTabKey =
  | "users"
  | "classes"
  | "subjects"
  | "schedules"
  | "attendance"
  | "grades";

type OverviewPageProps = {
  apiBaseUrl: string;
  token: string;
  onNavigate: (tab: OverviewTabKey) => void;
};

export default function OverviewPage({
  apiBaseUrl,
  token,
  onNavigate,
}: OverviewPageProps) {
  const { showToast } = useToast();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [subjectCount, setSubjectCount] = useState(0);
  const [scheduleCount, setScheduleCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        statsJson,
        usersJson,
        classesJson,
        subjectsJson,
        schedulesJson,
      ] = await Promise.all([
        apiGet<StatsResponse>(`${apiBaseUrl}/api/stats`, token),
        apiGet<UserRow[]>(`${apiBaseUrl}/api/users`, token),
        apiGet<ClassRow[]>(`${apiBaseUrl}/api/classes`, token),
        apiGet<SubjectRow[]>(`${apiBaseUrl}/api/subjects`, token),
        apiGet<ScheduleRow[]>(`${apiBaseUrl}/api/schedules`, token),
      ]);

      setStats(statsJson);
      setUsers(Array.isArray(usersJson) ? usersJson : []);
      setClassCount(Array.isArray(classesJson) ? classesJson.length : 0);
      setSubjectCount(Array.isArray(subjectsJson) ? subjectsJson.length : 0);
      setScheduleCount(Array.isArray(schedulesJson) ? schedulesJson.length : 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [users]);

  const kpis = [
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Teachers", value: stats?.totalTeachers ?? 0 },
    { label: "Students", value: stats?.totalStudents ?? 0 },
    { label: "Admins", value: stats?.totalAdmins ?? 0 },
    { label: "Classes", value: classCount },
    { label: "Subjects", value: subjectCount },
    { label: "Schedules", value: scheduleCount },
  ];

  const shortcuts: Array<{
    label: string;
    description: string;
    tab: OverviewTabKey;
  }> = [
    {
      label: "Manage Users",
      description: "Create, edit, and organize platform accounts.",
      tab: "users",
    },
    {
      label: "Open Classes",
      description: "Manage academic classes and years.",
      tab: "classes",
    },
    {
      label: "Open Subjects",
      description: "Manage subjects and coefficients.",
      tab: "subjects",
    },
    {
      label: "Open Schedules",
      description: "Plan classes, teachers, and subjects.",
      tab: "schedules",
    },
    {
      label: "Take Attendance",
      description: "Mark present, absent, or late students.",
      tab: "attendance",
    },
    {
      label: "Enter Grades",
      description: "Record grades and comments by class and subject.",
      tab: "grades",
    },
  ];

  if (loading) {
    return <LoadingState message="Loading dashboard overview..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!stats) {
    return <EmptyState message="No dashboard data found." />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="text-sm text-slate-500">
            Monitor the platform and jump quickly into your main workflows.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Refresh Overview
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {shortcuts.map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.tab)}
                className="rounded-2xl border p-4 text-left transition hover:bg-slate-50"
              >
                <p className="font-semibold">{item.label}</p>
                <p className="mt-2 text-sm text-slate-500">{item.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">Recent Users</h3>
          </div>

          {recentUsers.length === 0 ? (
            <p className="text-sm text-slate-500">No recent users found.</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      {user.role}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}