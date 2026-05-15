export function isInternalStudentEmail(email?: string | null) {
  const value = String(email ?? "").trim().toLowerCase();

  return (
    value.startsWith("student-") &&
    value.endsWith("@internal.school.local")
  );
}

export function getVisibleStudentEmail(email?: string | null) {
  const value = String(email ?? "").trim();

  if (!value || isInternalStudentEmail(value)) {
    return "";
  }

  return value;
}

export function getStudentEmailDisplay(email?: string | null) {
  return (
    getVisibleStudentEmail(email) ||
    "\u0628\u062f\u0648\u0646 \u0628\u0631\u064a\u062f \u062f\u062e\u0648\u0644"
  );
}
