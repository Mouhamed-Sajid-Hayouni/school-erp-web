import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "../../components/common/ToastProvider";

type ClassItem = {
  id: string;
  name: string;
  academicYear: string;
};

type AnnouncementAudience =
  | "ALL"
  | "STUDENTS"
  | "PARENTS"
  | "TEACHERS"
  | "CLASS";

type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  classId: string | null;
  createdAt: string;
  updatedAt: string;
  class?: ClassItem | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};

type AnnouncementsPageProps = {
  apiBaseUrl: string;
  token: string;
};

type FormState = {
  title: string;
  content: string;
  audience: AnnouncementAudience;
  classId: string;
};

type TeacherOverviewResponse = {
  schedules?: Array<{
    class?: ClassItem | null;
  }>;
};

const emptyForm: FormState = {
  title: "",
  content: "",
  audience: "ALL",
  classId: "",
};

const audienceLabels: Record<AnnouncementAudience, string> = {
  ALL: "الجميع",
  STUDENTS: "التلاميذ عبر الأولياء",
  PARENTS: "الأولياء",
  TEACHERS: "المعلّمون",
  CLASS: "قسم محدد",
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

  if (normalized.includes("title") || normalized.includes("content")) {
    return "العنوان والمحتوى مطلوبان.";
  }

  if (normalized.includes("class") && normalized.includes("audience")) {
    return "القسم مطلوب عند اختيار جمهور قسم محدد.";
  }

  if (normalized.includes("load")) {
    return "تعذر تحميل الإعلانات.";
  }

  if (normalized.includes("save")) {
    return "تعذر حفظ الإعلان.";
  }

  if (normalized.includes("delete")) {
    return "تعذر حذف الإعلان.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ar-TN");
}

function authorLabel(item: AnnouncementItem) {
  const fullName = `${item.createdBy?.firstName ?? ""} ${
    item.createdBy?.lastName ?? ""
  }`.trim();

  return fullName || item.createdBy?.email || "-";
}

export default function AnnouncementsPage({
  apiBaseUrl,
  token,
}: AnnouncementsPageProps) {
  const { showToast } = useToast();

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";
  const isTeacher = role === "TEACHER";
  const defaultForm: FormState = {
    ...emptyForm,
    audience: isTeacher ? "CLASS" : "ALL",
  };

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const announcementsData = await apiRequest<AnnouncementItem[]>(
      `${apiBaseUrl}/api/announcements`,
      token
    );

    let classesData: ClassItem[] = [];

    if (isTeacher) {
      const teacherOverview = await apiRequest<TeacherOverviewResponse>(
        `${apiBaseUrl}/api/my-teacher-overview`,
        token
      );

      const classMap = new Map<string, ClassItem>();

      for (const schedule of teacherOverview.schedules ?? []) {
        if (schedule.class?.id) {
          classMap.set(schedule.class.id, schedule.class);
        }
      }

      classesData = Array.from(classMap.values());
    } else {
      classesData = await apiRequest<ClassItem[]>(
        `${apiBaseUrl}/api/classes`,
        token
      );
    }

    setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
    setClasses(Array.isArray(classesData) ? classesData : []);
  }, [apiBaseUrl, token, isTeacher]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await fetchData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "تعذر تحميل الإعلانات.";
        const translated = translateError(message);
        setError(translated);
        showToast(translated, "error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [fetchData, showToast]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!form.title.trim() || !form.content.trim()) {
        throw new Error("العنوان والمحتوى مطلوبان.");
      }

      const audience = isTeacher ? "CLASS" : form.audience;

      if (audience === "CLASS" && !form.classId) {
        throw new Error("يرجى اختيار القسم.");
      }

      if (isTeacher && editingId) {
        throw new Error("المعلّمون لا يمكنهم تعديل الإعلانات من هذه الصفحة.");
      }

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        audience,
        classId: audience === "CLASS" ? form.classId : null,
      };

      if (editingId) {
        await apiRequest<AnnouncementItem>(
          `${apiBaseUrl}/api/announcements/${editingId}`,
          token,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
        showToast("تم تعديل الإعلان بنجاح.", "success");
      } else {
        await apiRequest<AnnouncementItem>(
          `${apiBaseUrl}/api/announcements`,
          token,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        showToast("تم إنشاء الإعلان بنجاح.", "success");
      }

      resetForm();
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر حفظ الإعلان.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: AnnouncementItem) => {
    if (isTeacher) {
      setError("المعلّمون لا يمكنهم تعديل الإعلانات من هذه الصفحة.");
      return;
    }

    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      audience: item.audience,
      classId: item.classId ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    if (isTeacher) {
      setError("المعلّمون لا يمكنهم حذف الإعلانات.");
      return;
    }

    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      setError("");

      await apiRequest<{ message: string }>(
        `${apiBaseUrl}/api/announcements/${pendingDeleteId}`,
        token,
        {
          method: "DELETE",
        }
      );

      showToast("تم حذف الإعلان بنجاح.", "success");
      setPendingDeleteId(null);

      if (editingId === pendingDeleteId) {
        resetForm();
      }

      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر حذف الإعلان.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">الإعلانات</h2>
        <p className="mt-1 text-sm text-slate-500">
          إنشاء وإدارة الإعلانات الموجهة إلى الأولياء بخصوص التلاميذ أو الأولياء أو المعلّمين أو قسم محدد.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? "تعديل إعلان" : "إنشاء إعلان"}
            </h3>

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
                العنوان
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                placeholder="عنوان الإعلان"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                المحتوى
              </label>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, content: e.target.value }))
                }
                className="min-h-[140px] w-full rounded-xl border px-3 py-2"
                placeholder="محتوى الإعلان"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                الجمهور
              </label>
              <select
                value={form.audience}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    audience: e.target.value as AnnouncementAudience,
                    classId: e.target.value === "CLASS" ? prev.classId : "",
                  }))
                }
                className="w-full rounded-xl border px-3 py-2"
              >
                {isTeacher ? (
                  <option value="CLASS">قسم محدد</option>
                ) : (
                  <>
                    <option value="ALL">الجميع</option>
                    <option value="STUDENTS">التلاميذ عبر الأولياء</option>
                    <option value="PARENTS">الأولياء</option>
                    <option value="TEACHERS">المعلّمون</option>
                    <option value="CLASS">قسم محدد</option>
                  </>
                )}
              </select>
            </div>

            {form.audience === "CLASS" ? (
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
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving
                ? "جارٍ الحفظ..."
                : editingId
                  ? "تعديل الإعلان"
                  : "إنشاء الإعلان"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              قائمة الإعلانات
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {announcements.length} عنصر
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">جارٍ تحميل الإعلانات...</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد إعلانات.</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-slate-900">
                          {item.title}
                        </h4>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {audienceLabels[item.audience]}
                        </span>

                        {item.class ? (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            {item.class.name}
                          </span>
                        ) : null}
                      </div>

                      <p className="text-sm text-slate-600">{item.content}</p>

                      <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-slate-700">
                            تاريخ الإنشاء:
                          </span>{" "}
                          {formatDateTime(item.createdAt)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">
                            الكاتب:
                          </span>{" "}
                          {authorLabel(item)}
                        </p>
                      </div>
                    </div>

                    {!isTeacher ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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

      {pendingDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-right shadow-xl" dir="rtl">
            <h3 className="text-lg font-semibold text-slate-900">
              تأكيد الحذف
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              سيتم حذف هذا الإعلان نهائيًا.
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