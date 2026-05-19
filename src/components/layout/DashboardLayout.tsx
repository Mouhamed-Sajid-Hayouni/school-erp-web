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
  ScrollText,
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
  | "settings"
  | "auditLogs";

type DashboardLayoutProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLogout: () => void;
  role: string;
  fullName: string;
  profileImage?: string;
  apiBaseUrl: string;
  token: string;
  onOpenMessages?: (conversationId?: string | null) => void;
  children: ReactNode;
};

const roleLabels: Record<string, string> = {
  ADMIN: "مدير النظام",
  TEACHER: "معلّم",
  PARENT: "ولي",
  STUDENT: "تلميذ - بدون دخول مباشر",
};

const adminTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: "overview",
    label: "لوحة القيادة",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "users",
    label: "المستخدمون",
    icon: <Users className="h-4 w-4" />,
  },
  {
    key: "classes",
    label: "الأقسام",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    key: "subjects",
    label: "المواد",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    key: "schedules",
    label: "جداول الأوقات",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    key: "assignments",
    label: "الواجبات",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "announcements",
    label: "الإعلانات",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    key: "messages",
    label: "الرسائل",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    key: "reports",
    label: "التقارير",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    key: "auditLogs",
    label: "سجل العمليات",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    key: "settings",
    label: "الإعدادات",
    icon: <Settings className="h-4 w-4" />,
  },
];

const teacherTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: "overview",
    label: "لوحة القيادة",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "schedules",
    label: "جدول أوقاتي",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    key: "attendance",
    label: "الحضور والغياب",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    key: "grades",
    label: "الأعداد",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    key: "assignments",
    label: "الواجبات",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "announcements",
    label: "الإعلانات",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    key: "messages",
    label: "الرسائل",
    icon: <MessageCircle className="h-4 w-4" />,
  },
];

function normalizeSchoolName(value?: string) {
  if (!value || value === "School ERP") return "نظام إدارة المدرسة";
  return value;
}

function normalizeSchoolSubtitle(value?: string) {
  if (!value || value === "Tunisian Public School") return "مدرسة عمومية تونسية";
  return value;
}

export default function DashboardLayout({
  activeTab,
  onTabChange,
  onLogout,
  role,
  fullName,
  profileImage,
  apiBaseUrl,
  token,
  onOpenMessages,
  children,
}: DashboardLayoutProps) {
  const isParentPortal = role === "PARENT";
  const isStudentBlocked = role === "STUDENT";
  const isTeacher = role === "TEACHER";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "؟";

  const visibleTabs = isTeacher ? teacherTabs : adminTabs;

  const sidebarProfileImageUrl = profileImage
    ? profileImage.startsWith("http://") || profileImage.startsWith("https://")
      ? profileImage
      : `${apiBaseUrl}${profileImage}`
    : "";

  const [schoolName, setSchoolName] = useState("نظام إدارة المدرسة");
  const [schoolSubtitle, setSchoolSubtitle] = useState("مدرسة عمومية تونسية");

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

        setSchoolName(normalizeSchoolName(data.schoolName));
        setSchoolSubtitle(normalizeSchoolSubtitle(data.schoolSubtitle));
      } catch {
        // Keep Arabic default sidebar identity if settings fail to load.
      }
    }

    loadSchoolSettings();

    window.addEventListener("school-settings-updated", loadSchoolSettings);

    return () => {
      window.removeEventListener("school-settings-updated", loadSchoolSettings);
    };
  }, [apiBaseUrl, token]);

  return (
    <div className="min-h-screen bg-slate-50 text-right text-slate-900" dir="rtl">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="border-l bg-white">
          <div className="border-b p-6">
            <h1 className="truncate text-xl font-bold">{schoolName}</h1>
            <p className="mt-1 truncate text-sm text-slate-500">{schoolSubtitle}</p>
          </div>

          <div className="border-b p-6">
            <div className="flex items-center gap-3">
              {sidebarProfileImageUrl ? (
                <img
                  src={sidebarProfileImageUrl}
                  alt={fullName}
                  className="h-11 w-11 rounded-full border object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {initials}
                </div>
              )}

              <div>
                <p className="font-medium">{fullName}</p>
                <p className="text-sm text-slate-500">
                  {roleLabels[role] || role}
                </p>
              </div>
            </div>
          </div>

          {!isStudentBlocked && (
            <div className="border-b p-4">
              <NotificationsBell
                apiBaseUrl={apiBaseUrl}
                token={token}
                onOpenMessages={(conversationId) => {
                  onOpenMessages?.(conversationId);
                }}
              />
            </div>
          )}

          <nav className="p-4">
            <div className="space-y-2">
              {isStudentBlocked ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  حسابات التلاميذ لا تستعمل الدخول المباشر إلى النظام.
                  الرجاء استعمال حساب الولي.
                </div>
              ) : isParentPortal ? (
                <>
                  <button
                    onClick={() => onTabChange("portal")}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-medium transition ${
                      activeTab === "portal"
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    بوابة الولي
                  </button>

                  <button
                    onClick={() => onTabChange("messages")}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-medium transition ${
                      activeTab === "messages"
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    الرسائل
                  </button>
                </>
              ) : (
                visibleTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm font-medium transition ${
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
              تسجيل الخروج
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