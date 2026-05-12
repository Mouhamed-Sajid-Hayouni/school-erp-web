import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

type ClassOption = {
  id: string;
  name: string;
  academicYear?: string;
};

type SubjectOption = {
  id: string;
  name: string;
  coefficient?: number;
};

type TeacherOption = {
  id: string;
  specialty?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type ScheduleRow = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  class?: {
    id: string;
    name: string;
    academicYear?: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    specialty?: string;
    user?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
  };
};

type TeacherOverviewResponse = {
  schedules: ScheduleRow[];
};

type SchedulesPageProps = {
  apiBaseUrl: string;
  token: string;
};

const DAY_OPTIONS = [
  { value: "Lundi", label: "الإثنين" },
  { value: "Mardi", label: "الثلاثاء" },
  { value: "Mercredi", label: "الأربعاء" },
  { value: "Jeudi", label: "الخميس" },
  { value: "Vendredi", label: "الجمعة" },
  { value: "Samedi", label: "السبت" },
];

const INITIAL_FORM = {
  classId: "",
  subjectId: "",
  teacherId: "",
  dayOfWeek: "Lundi",
  startTime: "",
  endTime: "",
};

type SchedulePayload = {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

function translateDay(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "lundi" || normalized === "monday") return "الإثنين";
  if (normalized === "mardi" || normalized === "tuesday") return "الثلاثاء";
  if (normalized === "mercredi" || normalized === "wednesday") return "الأربعاء";
  if (normalized === "jeudi" || normalized === "thursday") return "الخميس";
  if (normalized === "vendredi" || normalized === "friday") return "الجمعة";
  if (normalized === "samedi" || normalized === "saturday") return "السبت";
  if (normalized === "dimanche" || normalized === "sunday") return "الأحد";

  return value;
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("all schedule fields")) {
    return "جميع حقول جدول الأوقات مطلوبة.";
  }

  if (normalized.includes("end time")) {
    return "يجب أن يكون وقت النهاية بعد وقت البداية.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  if (normalized.includes("delete")) {
    return "تعذر حذف الحصة.";
  }

  return message || "حدث خطأ غير متوقع.";
}

export default function SchedulesPage({
  apiBaseUrl,
  token,
}: SchedulesPageProps) {
  const { showToast } = useToast();

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";
  const isTeacher = role === "TEACHER";

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [classFilter, setClassFilter] = useState("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [teacherFilter, setTeacherFilter] = useState("ALL");

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError("");

      if (isTeacher) {
        const json = await apiGet<TeacherOverviewResponse>(
          `${apiBaseUrl}/api/my-teacher-overview`,
          token
        );
        setSchedules(Array.isArray(json?.schedules) ? json.schedules : []);
      } else {
        const json = await apiGet<ScheduleRow[]>(
          `${apiBaseUrl}/api/schedules`,
          token
        );
        setSchedules(Array.isArray(json) ? json : []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      setError("");

      if (isTeacher) {
        const [classesJson, subjectsJson] = await Promise.all([
          apiGet<ClassOption[]>(`${apiBaseUrl}/api/classes`, token),
          apiGet<SubjectOption[]>(`${apiBaseUrl}/api/subjects`, token),
        ]);

        setClasses(Array.isArray(classesJson) ? classesJson : []);
        setSubjects(Array.isArray(subjectsJson) ? subjectsJson : []);
        setTeachers([]);
      } else {
        const [classesJson, subjectsJson, teachersJson] = await Promise.all([
          apiGet<ClassOption[]>(`${apiBaseUrl}/api/classes`, token),
          apiGet<SubjectOption[]>(`${apiBaseUrl}/api/subjects`, token),
          apiGet<TeacherOption[]>(`${apiBaseUrl}/api/teachers`, token),
        ]);

        setClasses(Array.isArray(classesJson) ? classesJson : []);
        setSubjects(Array.isArray(subjectsJson) ? subjectsJson : []);
        setTeachers(Array.isArray(teachersJson) ? teachersJson : []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setLoadingLookups(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchLookups();
  }, []);

  const handleChange = (
    field:
      | "classId"
      | "subjectId"
      | "teacherId"
      | "dayOfWeek"
      | "startTime"
      | "endTime",
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingScheduleId(null);
    setError("");
  };

  const handleEdit = (schedule: ScheduleRow) => {
    setError("");
    setEditingScheduleId(schedule.id);
    setForm({
      classId: schedule.classId ?? schedule.class?.id ?? "",
      subjectId: schedule.subjectId ?? schedule.subject?.id ?? "",
      teacherId: schedule.teacherId ?? schedule.teacher?.id ?? "",
      dayOfWeek: schedule.dayOfWeek ?? "Lundi",
      startTime: schedule.startTime ?? "",
      endTime: schedule.endTime ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    if (
      !form.classId ||
      !form.subjectId ||
      !form.teacherId ||
      !form.dayOfWeek ||
      !form.startTime ||
      !form.endTime
    ) {
      const message = "جميع حقول جدول الأوقات مطلوبة.";
      setError(message);
      showToast(message, "error");
      return false;
    }

    if (form.startTime >= form.endTime) {
      const message = "يجب أن يكون وقت النهاية بعد وقت البداية.";
      setError(message);
      showToast(message, "error");
      return false;
    }

    return true;
  };

  const buildPayload = (): SchedulePayload => ({
    classId: form.classId,
    subjectId: form.subjectId,
    teacherId: form.teacherId,
    dayOfWeek: form.dayOfWeek,
    startTime: form.startTime,
    endTime: form.endTime,
  });

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError("");

      await apiPost<ScheduleRow, SchedulePayload>(
        `${apiBaseUrl}/api/schedules`,
        token,
        buildPayload()
      );

      await fetchSchedules();
      resetForm();
      showToast("تم إنشاء الحصة بنجاح.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingScheduleId) return;

    try {
      setUpdating(true);
      setError("");

      await apiPut<ScheduleRow, SchedulePayload>(
        `${apiBaseUrl}/api/schedules/${editingScheduleId}`,
        token,
        buildPayload()
      );

      await fetchSchedules();
      resetForm();
      showToast("تم تعديل الحصة بنجاح.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (editingScheduleId) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه الحصة؟");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await apiDelete(`${apiBaseUrl}/api/schedules/${id}`, token);
      setSchedules((prev) => prev.filter((item) => item.id !== id));

      if (editingScheduleId === id) {
        resetForm();
      }

      showToast("تم حذف الحصة بنجاح.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const teacherLabel = (teacher: TeacherOption) => {
    const firstName = teacher.user?.firstName ?? "";
    const lastName = teacher.user?.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || teacher.user?.email || "معلّم";
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      const matchesClass =
        classFilter === "ALL"
          ? true
          : (item.classId ?? item.class?.id ?? "") === classFilter;

      const matchesSubject =
        subjectFilter === "ALL"
          ? true
          : (item.subjectId ?? item.subject?.id ?? "") === subjectFilter;

      const matchesTeacher =
        isTeacher || teacherFilter === "ALL"
          ? true
          : (item.teacherId ?? item.teacher?.id ?? "") === teacherFilter;

      return matchesClass && matchesSubject && matchesTeacher;
    });
  }, [schedules, classFilter, subjectFilter, teacherFilter, isTeacher]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header>
        <h2 className="text-2xl font-bold">
          {isTeacher ? "جدول أوقاتي" : "جداول الأوقات"}
        </h2>
        <p className="text-sm text-slate-500">
          {isTeacher
            ? "عرض جدول التدريس حسب القسم والمادة واليوم."
            : "إدارة جداول الأقسام والمواد وتوزيع المعلّمين."}
        </p>
      </header>

      {!isTeacher ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold">
              {editingScheduleId ? "تعديل حصة" : "إنشاء حصة"}
            </h3>

            {editingScheduleId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                إلغاء التعديل
              </button>
            ) : null}
          </div>

          {error ? <ErrorState message={error} /> : null}

          {loadingLookups ? (
            <LoadingState message="جارٍ تحميل الأقسام والمواد والمعلّمين..." />
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">القسم</label>
                <select
                  value={form.classId}
                  onChange={(e) => handleChange("classId", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                >
                  <option value="">اختر قسمًا</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.academicYear ? ` (${item.academicYear})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">المادة</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => handleChange("subjectId", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                >
                  <option value="">اختر مادة</option>
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">المعلّم</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => handleChange("teacherId", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                >
                  <option value="">اختر معلّمًا</option>
                  {teachers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {teacherLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">اليوم</label>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) => handleChange("dayOfWeek", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                >
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  وقت البداية
                </label>
                <input
                  type="time"
                  dir="ltr"
                  value={form.startTime}
                  onChange={(e) => handleChange("startTime", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  وقت النهاية
                </label>
                <input
                  type="time"
                  dir="ltr"
                  value={form.endTime}
                  onChange={(e) => handleChange("endTime", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex gap-3 md:col-span-2 xl:col-span-3">
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {editingScheduleId
                    ? updating
                      ? "جارٍ التعديل..."
                      : "تعديل الحصة"
                    : creating
                      ? "جارٍ الإنشاء..."
                      : "إنشاء الحصة"}
                </button>

                {editingScheduleId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h3 className="text-lg font-semibold">
            {isTeacher ? "قائمة جدول أوقاتي" : "قائمة جداول الأوقات"}
          </h3>

          <div className={`grid gap-3 ${isTeacher ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="ALL">كل الأقسام</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="ALL">كل المواد</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            {!isTeacher ? (
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
              >
                <option value="ALL">كل المعلّمين</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {teacherLabel(item)}
                  </option>
                ))}
              </select>
            ) : null}

            <button
              onClick={() => {
                setClassFilter("ALL");
                setSubjectFilter("ALL");
                setTeacherFilter("ALL");
                fetchSchedules();
              }}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              إعادة التصفية / تحديث
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState
            message={isTeacher ? "جارٍ تحميل جدول أوقاتك..." : "جارٍ تحميل جداول الأوقات..."}
          />
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredSchedules.length === 0 ? (
          <EmptyState
            message={
              isTeacher
                ? "لا توجد حصص مطابقة للتصفية الحالية."
                : "لا توجد جداول أوقات مطابقة للتصفية الحالية."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-right text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">القسم</th>
                  <th className="px-3 py-3 font-medium">المادة</th>
                  <th className="px-3 py-3 font-medium">المعلّم</th>
                  <th className="px-3 py-3 font-medium">اليوم</th>
                  <th className="px-3 py-3 font-medium">التوقيت</th>
                  {!isTeacher ? (
                    <th className="px-3 py-3 font-medium">الإجراءات</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((item) => {
                  const teacherName = `${
                    item.teacher?.user?.firstName ?? ""
                  } ${item.teacher?.user?.lastName ?? ""}`.trim();

                  return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-3 font-medium">
                        {item.class?.name ?? "قسم غير معروف"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {item.subject?.name ?? "مادة غير معروفة"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {teacherName || "معلّم غير معروف"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {translateDay(item.dayOfWeek)}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600" dir="ltr">
                        {item.startTime} - {item.endTime}
                      </td>
                      {!isTeacher ? (
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === item.id ? "جارٍ الحذف..." : "حذف"}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}