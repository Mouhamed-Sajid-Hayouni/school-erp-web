import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  schedules?: {
    id: string;
    classId?: string;
    subjectId?: string;
    class?: ClassItem | null;
    subject?: SubjectItem | null;
  }[];
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
    throw new Error((data as { error?: string }).error || "تعذر تنفيذ الطلب.");
  }

  return data as T;
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("class") ||
    normalized.includes("subject") ||
    normalized.includes("title") ||
    normalized.includes("due date")
  ) {
    return "القسم والمادة والعنوان والأجل مطلوبة.";
  }

  if (normalized.includes("teacher")) {
    return "يرجى اختيار المعلّم.";
  }

  if (normalized.includes("load")) {
    return "تعذر تحميل الواجبات.";
  }

  if (normalized.includes("save")) {
    return "تعذر حفظ الواجب.";
  }

  if (normalized.includes("delete")) {
    return "تعذر حذف الواجب.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ar-TN");
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function teacherLabel(teacher: TeacherItem) {
  const fullName = `${teacher.user?.firstName ?? ""} ${
    teacher.user?.lastName ?? ""
  }`.trim();

  return fullName || teacher.user?.email || "معلّم";
}

export default function AssignmentsPage({
  apiBaseUrl,
  token,
}: AssignmentsPageProps) {
  const { showToast } = useToast();

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";
  const isTeacher = role === "TEACHER";

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
    () => (editingId ? "تعديل واجب" : "إنشاء واجب"),
    [editingId]
  );

  const fetchLookups = async () => {
    if (isTeacher) {
      const teacherOverview = await apiGet<TeacherOverviewResponse>(
        `${apiBaseUrl}/api/my-teacher-overview`,
        token
      );

      const classMap = new Map<string, ClassItem>();
      const subjectMap = new Map<string, SubjectItem>();

      for (const schedule of teacherOverview?.schedules ?? []) {
        if (schedule.class?.id) {
          classMap.set(schedule.class.id, schedule.class);
        }

        if (schedule.subject?.id) {
          subjectMap.set(schedule.subject.id, schedule.subject);
        }
      }

      setClasses(Array.from(classMap.values()));
      setSubjects(Array.from(subjectMap.values()));
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
          err instanceof Error ? err.message : "تعذر تحميل الواجبات.";
        const translated = translateError(message);
        setError(translated);
        showToast(translated, "error");
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
          err instanceof Error ? err.message : "تعذر تحميل الواجبات.";
        const translated = translateError(message);
        setError(translated);
        showToast(translated, "error");
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const resolvedTeacherId = isTeacher ? myTeacherId : form.teacherId;

      if (!form.classId || !form.subjectId || !form.title || !form.dueDate) {
        throw new Error("القسم والمادة والعنوان والأجل مطلوبة.");
      }

      if (!resolvedTeacherId) {
        throw new Error("يرجى اختيار المعلّم.");
      }

      const payload = {
        classId: form.classId,
        subjectId: form.subjectId,
        teacherId: resolvedTeacherId,
        title: form.title.trim(),
        description: form.description.trim() || null,
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
        showToast("تم تعديل الواجب بنجاح.", "success");
      } else {
        await apiRequest<AssignmentItem>(`${apiBaseUrl}/api/assignments`, token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("تم إنشاء الواجب بنجاح.", "success");
      }

      resetForm();
      await fetchAssignments();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر حفظ الواجب.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      showToast("تم حذف الواجب بنجاح.", "success");
      setPendingDeleteId(null);

      if (editingId === pendingDeleteId) {
        resetForm();
      }

      await fetchAssignments();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر حذف الواجب.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
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
    <div className="space-y-6 text-right" dir="rtl">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isTeacher ? "واجباتي" : "الواجبات"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isTeacher
                ? "إنشاء واجباتك وتعديلها ومتابعة آجالها."
                : "عرض الواجبات وتصفيتها حسب القسم والمادة."}
            </p>
          </div>

          {!isTeacher ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  التصفية حسب القسم
                </label>
                <select
                  value={filters.classId}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, classId: e.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">كل الأقسام</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  التصفية حسب المادة
                </label>
                <select
                  value={filters.subjectId}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, subjectId: e.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">كل المواد</option>
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

      <div className={`grid gap-6 ${isTeacher ? "xl:grid-cols-[420px_1fr]" : ""}`}>
        {isTeacher ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{pageTitle}</h3>
            {editingId ? (
              <button
                onClick={resetForm}
                className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
              >
                إلغاء
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                القسم
              </label>
              <select
                value={form.classId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, classId: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                required
              >
                <option value="">اختر قسمًا</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                المادة
              </label>
              <select
                value={form.subjectId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subjectId: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                required
              >
                <option value="">اختر مادة</option>
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
                  المعلّم
                </label>
                <select
                  value={form.teacherId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, teacherId: e.target.value }))
                  }
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">اختر معلّمًا</option>
                  {teachers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {teacherLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  المعلّم
                </label>
                <input
                  type="text"
                  value="مسند إليّ"
                  disabled
                  className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-slate-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                العنوان
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                placeholder="عنوان الواجب"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                الوصف
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="min-h-[110px] w-full rounded-xl border px-3 py-2"
                placeholder="تعليمات الواجب"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                الأجل
              </label>
              <input
                type="datetime-local"
                dir="ltr"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2 text-left"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving
                ? "جارٍ الحفظ..."
                : editingId
                  ? "تعديل الواجب"
                  : "إنشاء الواجب"}
            </button>
          </form>
        </div>
        ) : null}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {isTeacher ? "قائمة واجباتي" : "قائمة الواجبات"}
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {visibleAssignments.length} عنصر
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">جارٍ تحميل الواجبات...</p>
          ) : visibleAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد واجبات.</p>
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
                        {assignment.description || "لا يوجد وصف."}
                      </p>

                      <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-700">القسم:</span>{" "}
                          {assignment.class?.name}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">المعلّم:</span>{" "}
                          {assignment.teacher
                            ? teacherLabel(assignment.teacher)
                            : "-"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">الأجل:</span>{" "}
                          {formatDateTime(assignment.dueDate)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">
                            عدد التسليمات:
                          </span>{" "}
                          {assignment._count?.submissions ?? 0}
                        </p>
                      </div>
                    </div>

                    {isTeacher ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleEdit(assignment)}
                        className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        حذف
                      </button>
                    </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isTeacher && pendingDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-right shadow-xl" dir="rtl">
            <h3 className="text-lg font-semibold text-slate-900">
              تأكيد الحذف
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              سيتم حذف هذا الواجب نهائيًا.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}