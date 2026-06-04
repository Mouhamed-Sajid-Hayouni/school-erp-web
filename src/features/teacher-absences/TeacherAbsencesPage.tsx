import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Teacher = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type TeacherAbsenceStatus = "JUSTIFIED" | "UNJUSTIFIED";

type TeacherAbsence = {
  id: string;
  teacherId: string;
  date: string;
  status: TeacherAbsenceStatus;
  reason?: string | null;
  teacher: Teacher;
};

type TeacherAbsencesPageProps = {
  apiBaseUrl: string;
  token: string | null;
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const teacherName = (teacher: Teacher) => {
  const fullName = `${teacher.user.firstName} ${teacher.user.lastName}`.trim();
  return fullName || teacher.user.email;
};

const teacherAbsenceStatusLabel = (status: TeacherAbsenceStatus) =>
  status === "JUSTIFIED" ? "مبرر" : "غير مبرر";

const teacherAbsenceStatusBadgeClass = (status: TeacherAbsenceStatus) =>
  status === "JUSTIFIED"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";

export default function TeacherAbsencesPage({
  apiBaseUrl,
  token,
}: TeacherAbsencesPageProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [absences, setAbsences] = useState<TeacherAbsence[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [status, setStatus] = useState<TeacherAbsenceStatus>("UNJUSTIFIED");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const authHeaders = useMemo(() => {
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined;
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;

    setError("");

    try {
      const [teachersResponse, absencesResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/teachers`, { headers: authHeaders }),
        fetch(`${apiBaseUrl}/api/teacher-absences`, { headers: authHeaders }),
      ]);

      if (!teachersResponse.ok || !absencesResponse.ok) {
        throw new Error("تعذر تحميل البيانات.");
      }

      setTeachers(await teachersResponse.json());
      setAbsences(await absencesResponse.json());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "حدث خطأ أثناء تحميل البيانات."
      );
    }
  }, [apiBaseUrl, authHeaders, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setError("جلسة الدخول غير متوفرة.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/teacher-absences`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          date,
          status,
          reason,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تسجيل الغياب.");
      }

      setMessage("تم تسجيل غياب المدرس بنجاح.");
      setReason("");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "حدث خطأ أثناء تسجيل الغياب."
      );
    }
  };

  const justifiedAbsencesCount = absences.filter(
    (absence) => absence.status === "JUSTIFIED"
  ).length;
  const unjustifiedAbsencesCount = absences.length - justifiedAbsencesCount;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">غيابات المدرسين</h1>
        <p className="mt-2 text-sm text-slate-600">
          تسجيل ومتابعة غيابات المدرسين من طرف الإدارة.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">ملخص غيابات المدرسين</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{absences.length}</p>
          <p className="mt-1 text-xs text-slate-500">إجمالي الغيابات المسجلة</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">الغيابات المبررة</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{justifiedAbsencesCount}</p>
          <p className="mt-1 text-xs text-slate-500">حالات لها سبب أو تبرير</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">الغيابات غير المبررة</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{unjustifiedAbsencesCount}</p>
          <p className="mt-1 text-xs text-slate-500">حالات تحتاج متابعة إدارية</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          تسجيل غياب مدرس
        </h2>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">المدرس</span>
            <select
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              required
            >
              <option value="">اختر المدرس</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacherName(teacher)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">التاريخ</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">الحالة</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TeacherAbsenceStatus)
              }
              className="w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="UNJUSTIFIED">غير مبرر</option>
              <option value="JUSTIFIED">مبرر</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">السبب</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="اختياري"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            تسجيل الغياب
          </button>
        </div>
      </form>

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            قائمة غيابات المدرسين
          </h2>
        </div>

        {absences.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            لا توجد غيابات مدرسين مسجلة حاليا.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">المدرس</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">السبب</th>
                </tr>
              </thead>
              <tbody>
                {absences.map((absence) => (
                  <tr key={absence.id} className="border-t">
                    <td className="px-4 py-3">{teacherName(absence.teacher)}</td>
                    <td className="px-4 py-3">
                      {new Date(absence.date).toLocaleDateString("ar-TN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${teacherAbsenceStatusBadgeClass(
                          absence.status
                        )}`}
                      >
                        {teacherAbsenceStatusLabel(absence.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{absence.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}