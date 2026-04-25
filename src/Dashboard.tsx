import { useMemo, useState } from "react";
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Dashboard() {
  const token = localStorage.getItem("token") || "";
  const role = localStorage.getItem("role") || "";
  const firstName = localStorage.getItem("firstName") || "";
  const lastName = localStorage.getItem("lastName") || "";

  const defaultTab: TabKey =
    role === "STUDENT" || role === "PARENT" ? "portal" : "overview";

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  const fullName = useMemo(() => {
    const value = `${firstName} ${lastName}`.trim();
    return value || "User";
  }, [firstName, lastName]);

  const isStudentOrParent = role === "STUDENT" || role === "PARENT";
  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    window.location.reload();
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
      return <MyPortalPage apiBaseUrl={API_BASE_URL} token={token} />;
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
        return <AttendancePage apiBaseUrl={API_BASE_URL} token={token} />;

      case "grades":
        return <GradesPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "assignments":
        return <AssignmentsPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "announcements":
        return <AnnouncementsPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "reports":
        return isAdmin ? (
          <ReportsPage />
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
      apiBaseUrl={API_BASE_URL}
      token={token}
    >
      {renderContent()}
    </DashboardLayout>
  );
}