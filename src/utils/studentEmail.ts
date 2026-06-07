export function isInternalStudentEmail(email?: string | null) {
  const value = String(email ?? "").trim().toLowerCase();

  return (
    value.startsWith("student-") &&
    value.endsWith("@internal.school.local")
  );
}

export function getVisibleStudentEmail(email?: string | null) {
  void email;
  return "";
}

export function getStudentEmailDisplay(email?: string | null) {
  return (
    getVisibleStudentEmail(email) ||
    "بدون بريد دخول"
  );
}
