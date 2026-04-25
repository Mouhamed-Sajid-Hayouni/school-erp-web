import type { ReactNode } from "react";
import {
  LogOut,
  Shield,
  User,
  Users,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  FileText,
  Megaphone,
  BarChart3,
} from "lucide-react";
import NotificationsBell from "../common/NotificationsBell";

type TabKey =
  | "overview"
  | "portal"
  | "users"
  | "classes"
  | "subjects"
  | "schedules"
  | "attendance"
  | "grades"
  | "assignments"
  | "announcements"
  | "reports";

type DashboardLayoutProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  role: string;
  fullName: string;
  apiBaseUrl: string;
  token: string;
  children: ReactNode;
};

const adminTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { key: "classes", label: "Classes", icon: <Shield className="h-4 w-4" /> },
  { key: "subjects", label: "Subjects", icon: <BookOpen className="h-4 w-4" /> },
  { key: "schedules", label: "Schedules", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: "grades", label: "Grades", icon: <GraduationCap className="h-4 w-4" /> },
  { key: "assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { key: "announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
  { key: "reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
];

const teacherTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "schedules", label: "My Schedule", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "attendance", label: "Attendance", icon: <ClipboardCheck className="h-4 w-4" /> },
  { key: "grades", label: "Grades", icon: <GraduationCap className="h-4 w-4" /> },
  { key: "assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { key: "announcements", label: "Announcements", icon: <Megaphone className="h-4 w-4" /> },
];

export default function DashboardLayout({
  activeTab,
  onTabChange,
  onLogout,
  role,
  fullName,
  apiBaseUrl,
  token,
  children,
}: DashboardLayoutProps) {
  const isPortalOnly = role === "STUDENT" || role === "PARENT";
  const isTeacher = role === "TEACHER";

  const initials = fullName
  .split(" ")
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? "")
  .join("") || "U";

  const visibleTabs = isTeacher ? teacherTabs : adminTabs;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-white">
          <div className="border-b p-6">
            <h1 className="text-xl font-bold">School ERP</h1>
            <p className="mt-1 text-sm text-slate-500">Tunisian Public School</p>
          </div>

          <div className="border-b p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
  {initials}
</div>
              <div>
                <p className="font-medium">{fullName}</p>
                <p className="text-sm text-slate-500">{role}</p>
              </div>
            </div>
          </div>

          <div className="border-b p-4">
            <NotificationsBell apiBaseUrl={apiBaseUrl} token={token} />
          </div>

          <nav className="p-4">
            <div className="space-y-2">
              {isPortalOnly ? (
                <button
                  onClick={() => onTabChange("portal")}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    activeTab === "portal"
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <User className="h-4 w-4" />
                  My Portal
                </button>
              ) : (
                visibleTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                      activeTab === tab.key
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))
              )}
            </div>
          </nav>

          <div className="p-4">
            <button
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}