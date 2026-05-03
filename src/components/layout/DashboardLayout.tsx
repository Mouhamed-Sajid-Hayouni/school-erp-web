import { useEffect, useState, type ReactNode } from "react";
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
  MessageCircle,
  Settings,
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
  | "reports"
  | "messages"
  | "settings";

type DashboardLayoutProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  role: string;
  fullName: string;
  apiBaseUrl: string;
  token: string;
  onOpenMessages?: (conversationId?: string | null) => void;
  children: ReactNode;
};

const adminTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "users",
    label: "Users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    key: "classes",
    label: "Classes",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    key: "subjects",
    label: "Subjects",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    key: "schedules",
    label: "Schedules",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    key: "attendance",
    label: "Attendance",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    key: "grades",
    label: "Grades",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    key: "assignments",
    label: "Assignments",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "announcements",
    label: "Announcements",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    key: "messages",
    label: "Messages",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    key: "reports",
    label: "Reports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

const teacherTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: "overview",
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "schedules",
    label: "My Schedule",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    key: "attendance",
    label: "Attendance",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    key: "grades",
    label: "Grades",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    key: "assignments",
    label: "Assignments",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "announcements",
    label: "Announcements",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    key: "messages",
    label: "Messages",
    icon: <MessageCircle className="h-4 w-4" />,
  },
];

export default function DashboardLayout({
  activeTab,
  onTabChange,
  onLogout,
  role,
  fullName,
  apiBaseUrl,
  token,
  onOpenMessages,
  children,
}: DashboardLayoutProps) {
  const isPortalOnly = role === "STUDENT" || role === "PARENT";
  const isTeacher = role === "TEACHER";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const visibleTabs = isTeacher ? teacherTabs : adminTabs;

  const [schoolName, setSchoolName] = useState("School ERP");
const [schoolSubtitle, setSchoolSubtitle] = useState("Tunisian Public School");

useEffect(() => {
  async function loadSchoolSettings() {
    if (!token) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/settings/school`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      setSchoolName(data.schoolName || "School ERP");
      setSchoolSubtitle(data.schoolSubtitle || "Tunisian Public School");
    } catch {
      // Keep default sidebar identity if settings fail to load.
    }
  }

  loadSchoolSettings();
}, [apiBaseUrl, token]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-white">
          <div className="border-b p-6">
            <h1 className="truncate text-xl font-bold">{schoolName}</h1>
            <p className="mt-1 truncate text-sm text-slate-500">{schoolSubtitle}</p>
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
            <NotificationsBell
              apiBaseUrl={apiBaseUrl}
              token={token}
              onOpenMessages={(conversationId) => {
                onOpenMessages?.(conversationId);
              }}
            />
          </div>

          <nav className="p-4">
            <div className="space-y-2">
              {isPortalOnly ? (
                <>
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

                  <button
                    onClick={() => onTabChange("messages")}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                      activeTab === "messages"
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </button>
                </>
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