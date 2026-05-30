import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import MyPortalPage from "./features/portal/MyPortalPage";
import UsersPage from "./features/users/UsersPage";
import ClassesPage from "./features/classes/ClassesPage";
import SubjectsPage from "./features/subjects/SubjectsPage";
import SchedulesPage from "./features/schedules/SchedulesPage";
import AttendancePage from "./features/attendance/AttendancePage";
import GradesPage from "./features/grades/GradesPage";
import OverviewPage from "./features/overview/OverviewPage";
import TeacherOverviewPage from "./features/overview/TeacherOverviewPage";
import AssignmentsPage from "./features/assignments/AssignmentsPage";
import AnnouncementsPage from "./features/announcements/AnnouncementsPage";
import ReportsPage from "./features/reports/ReportsPage";
import MessagesPage from "./features/messages/MessagesPage";
import SchoolSettingsPage from "./features/settings/SchoolSettingsPage";
import AuditLogsPage from "./features/audit/AuditLogsPage";
import TeacherAbsencesPage from "./features/teacher-absences/TeacherAbsencesPage";

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

import { API_BASE_URL } from "./lib/config";

export default function Dashboard() {
  const token = localStorage.getItem("token") || "";
  const role = localStorage.getItem("role") || "";
  const firstName = localStorage.getItem("firstName") || "";
  const lastName = localStorage.getItem("lastName") || "";

  const [profileImage, setProfileImage] = useState(
  localStorage.getItem("profileImage") || ""
);

useEffect(() => {
  const handleProfileImageUpdated = () => {
    setProfileImage(localStorage.getItem("profileImage") || "");
  };

  window.addEventListener("profile-image-updated", handleProfileImageUpdated);

  return () => {
    window.removeEventListener(
      "profile-image-updated",
      handleProfileImageUpdated
    );
  };
}, []);

  const defaultTab: TabKey =
    role === "STUDENT" || role === "PARENT" ? "portal" : "overview";

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [messageConversationToOpen, setMessageConversationToOpen] =
    useState<string | null>(null);

  const fullName = useMemo(() => {
    const value = `${firstName} ${lastName}`.trim();
    return value || "مستخدم";
  }, [firstName, lastName]);

  const isStudentOrParent = role === "STUDENT" || role === "PARENT";
  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    localStorage.removeItem("profileImage");
    localStorage.removeItem("userEmail");
    window.location.reload();
  };

  const handleOpenMessages = (conversationId?: string | null) => {
    setMessageConversationToOpen(conversationId || null);
    setActiveTab("messages");
  };

  const renderMessagesPage = () => {
    return (
      <MessagesPage
        initialConversationId={messageConversationToOpen}
        onInitialConversationOpened={() => setMessageConversationToOpen(null)}
      />
    );
  };

  const renderOverview = () => {
    if (isTeacher) {
      return (
        <TeacherOverviewPage
          apiBaseUrl={API_BASE_URL}
          token={token}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      );
    }

    return (
      <OverviewPage
        apiBaseUrl={API_BASE_URL}
        token={token}
        onNavigate={(tab) => setActiveTab(tab)}
      />
    );
  };

  const renderContent = () => {
    if (isStudentOrParent) {
      switch (activeTab) {
        case "portal":
          return <MyPortalPage apiBaseUrl={API_BASE_URL} token={token} />;

        case "messages":
          return renderMessagesPage();

        default:
          return <MyPortalPage apiBaseUrl={API_BASE_URL} token={token} />;
      }
    }

    switch (activeTab) {
      case "overview":
        return renderOverview();

      case "users":
        return isAdmin ? (
          <UsersPage apiBaseUrl={API_BASE_URL} token={token} />
        ) : (
          renderOverview()
        );

      case "classes":
        return isAdmin ? (
          <ClassesPage apiBaseUrl={API_BASE_URL} token={token} />
        ) : (
          renderOverview()
        );

      case "subjects":
        return isAdmin ? (
          <SubjectsPage apiBaseUrl={API_BASE_URL} token={token} />
        ) : (
          renderOverview()
        );

      case "schedules":
        return <SchedulesPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "attendance":
        return isTeacher ? (
          <AttendancePage apiBaseUrl={API_BASE_URL} token={token} />
        ) : (
          renderOverview()
        );

      

      case "teacherAbsences":
        return isAdmin ? (
          <TeacherAbsencesPage apiBaseUrl={API_BASE_URL} token={token} />
        ) : (
          renderOverview()
        );
      case "grades":
        return isTeacher ? (
          <GradesPage apiBaseUrl={API_BASE_URL} token={token} />
        ) : (
          renderOverview()
        );

      

      case "assignments":
        return <AssignmentsPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "announcements":
        return <AnnouncementsPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "messages":
        return renderMessagesPage();

      case "reports":
        return isAdmin ? <ReportsPage /> : renderOverview();

      case "settings":
        return isAdmin ? <SchoolSettingsPage /> : renderOverview();

      case "auditLogs":
        return isAdmin ? (
          <AuditLogsPage apiBaseUrl={API_BASE_URL} token={token} />
        ) : (
          renderOverview()
        );

      default:
        return renderOverview();
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      role={role}
      fullName={fullName}
      profileImage={profileImage}
      apiBaseUrl={API_BASE_URL}
      token={token}
      onOpenMessages={handleOpenMessages}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
