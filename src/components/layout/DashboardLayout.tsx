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
  | "teacherAbsences"
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
  ADMIN: "Ù…Ø¯ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù…",
  TEACHER: "Ù…Ø¹Ù„Ù‘Ù…",
  PARENT: "ÙˆÙ„ÙŠ",
  STUDENT: "ØªÙ„Ù…ÙŠØ° - Ø¨Ø¯ÙˆÙ† Ø¯Ø®ÙˆÙ„ Ù…Ø¨Ø§Ø´Ø±",
};

const adminTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: "overview",
    label: "Ù„ÙˆØ­Ø© Ø§Ù„Ù‚ÙŠØ§Ø¯Ø©",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "users",
    label: "Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†",
    icon: <Users className="h-4 w-4" />,
  },
  {
    key: "classes",
    label: "Ø§Ù„Ø£Ù‚Ø³Ø§Ù…",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    key: "subjects",
    label: "Ø§Ù„Ù…ÙˆØ§Ø¯",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    key: "schedules",
    label: "Ø¬Ø¯Ø§ÙˆÙ„ Ø§Ù„Ø£ÙˆÙ‚Ø§Øª",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    key: "assignments",
    label: "Ø§Ù„ÙˆØ§Ø¬Ø¨Ø§Øª",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "announcements",
    label: "Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    key: "messages",
    label: "Ø§Ù„Ø±Ø³Ø§Ø¦Ù„",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    key: "teacherAbsences",
    label: "غيابات المدرسين",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    key: "reports",
    label: "Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    key: "auditLogs",
    label: "Ø³Ø¬Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    key: "settings",
    label: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª",
    icon: <Settings className="h-4 w-4" />,
  },
];

const teacherTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: "overview",
    label: "Ù„ÙˆØ­Ø© Ø§Ù„Ù‚ÙŠØ§Ø¯Ø©",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "schedules",
    label: "Ø¬Ø¯ÙˆÙ„ Ø£ÙˆÙ‚Ø§ØªÙŠ",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    key: "attendance",
    label: "Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„ØºÙŠØ§Ø¨",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    key: "grades",
    label: "Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¯",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    key: "assignments",
    label: "Ø§Ù„ÙˆØ§Ø¬Ø¨Ø§Øª",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "announcements",
    label: "Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†Ø§Øª",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    key: "messages",
    label: "Ø§Ù„Ø±Ø³Ø§Ø¦Ù„",
    icon: <MessageCircle className="h-4 w-4" />,
  },
];

const studentParentTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
  {
    key: "portal",
    label: "Ø§Ù„Ø¨ÙˆØ§Ø¨Ø©",
    icon: <User className="h-4 w-4" />,
  },
  {
    key: "messages",
    label: "Ø§Ù„Ø±Ø³Ø§Ø¦Ù„",
    icon: <MessageCircle className="h-4 w-4" />,
  },
];

function normalizeSchoolName(value?: string) {
  if (!value || value === "School ERP") return "Ù†Ø¸Ø§Ù… Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©";
  return value;
}

function normalizeSchoolSubtitle(value?: string) {
  if (!value || value === "Tunisian Public School") return "Ù…Ø¯Ø±Ø³Ø© Ø¹Ù…ÙˆÙ…ÙŠØ© ØªÙˆÙ†Ø³ÙŠØ©";
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
      .join("") || "ØŸ";

  const visibleTabs =
    role === "ADMIN"
      ? adminTabs
      : isTeacher
        ? teacherTabs
        : studentParentTabs;

  const sidebarProfileImageUrl = profileImage
    ? profileImage.startsWith("http://") || profileImage.startsWith("https://")
      ? profileImage
      : `${apiBaseUrl}${profileImage}`
    : "";

  const [schoolName, setSchoolName] = useState("Ù†Ø¸Ø§Ù… Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©");
  const [schoolSubtitle, setSchoolSubtitle] = useState("Ù…Ø¯Ø±Ø³Ø© Ø¹Ù…ÙˆÙ…ÙŠØ© ØªÙˆÙ†Ø³ÙŠØ©");

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
                  Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„ØªÙ„Ø§Ù…ÙŠØ° Ù„Ø§ ØªØ³ØªØ¹Ù…Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ø¥Ù„Ù‰ Ø§Ù„Ù†Ø¸Ø§Ù….
                  Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø§Ø³ØªØ¹Ù…Ø§Ù„ Ø­Ø³Ø§Ø¨ Ø§Ù„ÙˆÙ„ÙŠ.
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
                    Ø¨ÙˆØ§Ø¨Ø© Ø§Ù„ÙˆÙ„ÙŠ
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
                    Ø§Ù„Ø±Ø³Ø§Ø¦Ù„
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
              ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬
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