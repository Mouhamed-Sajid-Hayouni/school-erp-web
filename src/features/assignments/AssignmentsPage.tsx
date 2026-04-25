import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../components/common/ToastProvider";
import { apiGet } from "../../lib/api";

type ClassItem = {
  id: string;
  name: string;
  academicYear: string;
};

type SubjectItem = {
  id: string;
  name: string;
  coefficient: number;
};

type TeacherItem = {
  id: string;
  specialty: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type AssignmentItem = {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  class: ClassItem;
  subject: SubjectItem;
  teacher: TeacherItem | null;
  _count?: {
    submissions: number;
  };
};

type TeacherOverviewResponse = {
  teacher: {
    id: string;
    specialty?: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
    };
  };
  assignments: AssignmentItem[];
};

type AssignmentsPageProps = {
  apiBaseUrl: string;
  token: string;
};

type FormState = {
  classId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: string;
};

const emptyForm: FormState = {
  classId: "",
  subjectId: "",
  teacherId: "",
  title: "",
  description: "",
  dueDate: "",
};

async function apiRequest<T>(
  url: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }

  return data as T;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AssignmentsPage({
  apiBaseUrl,
  token,
}: AssignmentsPageProps) {
  const { showToast } = useToast();

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";
  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [myTeacherId, setMyTeacherId] = useState("");

  const [filters, setFilters] = useState({
    classId: "",
    subjectId: "",
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pageTitle = useMemo(
    () => (editingId ? "Edit Assignment" : "Create Assignment"),
    [editingId]
  );

  const fetchLookups = async () => {
    if (isTeacher) {
      const [classesData, subjectsData, teacherOverview] = await Promise.all([
        apiRequest<ClassItem[]>(`${apiBaseUrl}/api/classes`, token),
        apiRequest<SubjectItem[]>(`${apiBaseUrl}/api/subjects`, token),
        apiGet<TeacherOverviewResponse>(`${apiBaseUrl}/api/my-teacher-overview`, token),
      ]);

      setClasses(Array.isArray(classesData) ? classesData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setTeachers([]);
      setMyTeacherId(teacherOverview?.teacher?.id ?? "");
      setForm((prev) => ({
        ...prev,
        teacherId: teacherOverview?.teacher?.id ?? "",
      }));
      return;
    }

    const [classesData, subjectsData, teachersData] = await Promise.all([
      apiRequest<ClassItem[]>(`${apiBaseUrl}/api/classes`, token),
      apiRequest<SubjectItem[]>(`${apiBaseUrl}/api/subjects`, token),
      apiRequest<TeacherItem[]>(`${apiBaseUrl}/api/teachers`, token),
    ]);

    setClasses(Array.isArray(classesData) ? classesData : []);
    setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    setTeachers(Array.isArray(teachersData) ? teachersData : []);
  };

  const fetchAssignments = async () => {
    if (isTeacher) {
      const json = await apiGet<TeacherOverviewResponse>(
        `${apiBaseUrl}/api/my-teacher-overview`,
        token
      );
      setAssignments(Array.isArray(json?.assignments) ? json.assignments : []);
      if (json?.teacher?.id) {
        setMyTeacherId(json.teacher.id);
      }
      return;
    }

    const params = new URLSearchParams();
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.subjectId) params.set("subjectId", filters.subjectId);

    const url =
      params.toString().length > 0
        ? `${apiBaseUrl}/api/assignments?${params.toString()}`
        : `${apiBaseUrl}/api/assignments`;

    const assignmentsData = await apiRequest<AssignmentItem[]>(url, token);
    setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await fetchLookups();
        await fetchAssignments();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load assignments";
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (isTeacher) return;

    const run = async () => {
      try {
        setError("");
        await fetchAssignments();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load assignments";
        setError(message);
        showToast(message, "error");
      }
    };

    run();
  }, [filters.classId, filters.subjectId, isTeacher]);

  const resetForm = () => {
    setForm({
      ...emptyForm,
      teacherId: isTeacher ? myTeacherId : "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const resolvedTeacherId = isTeacher ? myTeacherId : form.teacherId;

      if (!form.classId || !form.subjectId || !form.title || !form.dueDate) {
        throw new Error("Class, subject, title and due date are required.");
      }

      if (!resolvedTeacherId) {
        throw new Error("Teacher is required.");
      }

      const payload = {
        classId: form.classId,
        subjectId: form.subjectId,
        teacherId: resolvedTeacherId,
        title: form.title,
        description: form.description || null,
        dueDate: new Date(form.dueDate).toISOString(),
      };

      if (editingId) {
        await apiRequest<AssignmentItem>(
          `${apiBaseUrl}/api/assignments/${editingId}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify({
              title: payload.title,
              description: payload.description,
              dueDate: payload.dueDate,
            }),
          }
        );
        showToast("Assignment updated successfully.", "success");
      } else {
        await apiRequest<AssignmentItem>(`${apiBaseUrl}/api/assignments`, token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("Assignment created successfully.", "success");
      }

      resetForm();
      await fetchAssignments();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save assignment";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (assignment: AssignmentItem) => {
    setEditingId(assignment.id);
    setForm({
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      teacherId: isTeacher ? myTeacherId : assignment.teacherId ?? "",
      title: assignment.title,
      description: assignment.description ?? "",
      dueDate: toInputDateTime(assignment.dueDate),
    });
    setError("");
  };

  const handleDelete = (assignmentId: string) => {
    setPendingDeleteId(assignmentId);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      setError("");

      await apiRequest<{ message: string }>(
        `${apiBaseUrl}/api/assignments/${pendingDeleteId}`,
        token,
        {
          method: "DELETE",
        }
      );

      showToast("Assignment deleted successfully.", "success");
      setPendingDeleteId(null);

      if (editingId === pendingDeleteId) {
        resetForm();
      }

      await fetchAssignments();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete assignment";
      setError(message);
      showToast(message, "error");
    }
  };

  const visibleAssignments = useMemo(() => {
    if (isTeacher) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const matchesClass = !filters.classId || assignment.classId === filters.classId;
      const matchesSubject =
        !filters.subjectId || assignment.subjectId === filters.subjectId;

      return matchesClass && matchesSubject;
    });
  }, [assignments, filters.classId, filters.subjectId, isTeacher]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isTeacher ? "My Assignments" : "Assignments"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isTeacher
                ? "Create and manage your own homework assignments."
                : "Create, update, filter, and manage homework assignments."}
            </p>
          </div>

          {!isTeacher ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Filter by Class
                </label>
                <select
                  value={filters.classId}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, classId: e.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">All classes</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Filter by Subject
                </label>
                <select
                  value={filters.subjectId}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, subjectId: e.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">All subjects</option>
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{pageTitle}</h3>
            {editingId ? (
              <button
                onClick={resetForm}
                className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Class
              </label>
              <select
                value={form.classId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, classId: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                required
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Subject
              </label>
              <select
                value={form.subjectId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subjectId: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {!isTeacher ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Teacher
                </label>
                <select
                  value={form.teacherId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, teacherId: e.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">No teacher</option>
                  {teachers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.user?.firstName} {item.user?.lastName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Teacher
                </label>
                <input
                  type="text"
                  value="Assigned to me"
                  disabled
                  className="w-full rounded-xl border px-3 py-2 bg-slate-50 text-slate-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                placeholder="Assignment title"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="min-h-[110px] w-full rounded-xl border px-3 py-2"
                placeholder="Assignment instructions"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Due date
              </label>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Assignment" : "Create Assignment"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {isTeacher ? "My Assignment List" : "Assignment List"}
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {visibleAssignments.length} item(s)
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading assignments...</p>
          ) : visibleAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">No assignments found.</p>
          ) : (
            <div className="space-y-4">
              {visibleAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-slate-900">
                          {assignment.title}
                        </h4>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {assignment.subject?.name}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600">
                        {assignment.description || "No description"}
                      </p>

                      <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-700">Class:</span>{" "}
                          {assignment.class?.name}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Teacher:</span>{" "}
                          {assignment.teacher?.user?.firstName}{" "}
                          {assignment.teacher?.user?.lastName || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Due:</span>{" "}
                          {formatDateTime(assignment.dueDate)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">
                            Submissions:
                          </span>{" "}
                          {assignment._count?.submissions ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Confirm deletion
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This action will permanently delete this assignment.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}