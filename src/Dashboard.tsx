import { useMemo, useState } from "react";
import DashboardLayout from "./components/layout/DashboardLayout";
import MyPortalPage from "./features/portal/MyPortalPage";
import UsersPage from "./features/users/UsersPage";
import ClassesPage from "./features/classes/ClassesPage";
import SubjectsPage from "./features/subjects/SubjectsPage";

type TabKey =
  | "portal"
  | "users"
  | "classes"
  | "subjects"
  | "schedules"
  | "attendance"
  | "grades";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://school-erp-api-3l16.onrender.com";

export default function Dashboard() {
  const token = localStorage.getItem("token") || "";
  const role = localStorage.getItem("role") || "";
  const firstName = localStorage.getItem("firstName") || "";
  const lastName = localStorage.getItem("lastName") || "";

  const defaultTab: TabKey =
    role === "STUDENT" || role === "PARENT" ? "portal" : "users";

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  const fullName = useMemo(() => {
    const value = `${firstName} ${lastName}`.trim();
    return value || "User";
  }, [firstName, lastName]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("lastName");
    window.location.reload();
  };

  const renderContent = () => {
    if (role === "STUDENT" || role === "PARENT") {
      return <MyPortalPage apiBaseUrl={API_BASE_URL} token={token} />;
    }

    switch (activeTab) {
      case "users":
        return <UsersPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "classes":
        return <ClassesPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "subjects":
        return <SubjectsPage apiBaseUrl={API_BASE_URL} token={token} />;

      case "schedules":
        return <div className="rounded-2xl bg-white p-6 shadow-sm">Schedules page next.</div>;

      case "attendance":
        return <div className="rounded-2xl bg-white p-6 shadow-sm">Attendance page next.</div>;

      case "grades":
        return <div className="rounded-2xl bg-white p-6 shadow-sm">Grades page next.</div>;

      default:
        return <UsersPage apiBaseUrl={API_BASE_URL} token={token} />;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      role={role}
      fullName={fullName}
    >
      {renderContent()}
    </DashboardLayout>
  );
}