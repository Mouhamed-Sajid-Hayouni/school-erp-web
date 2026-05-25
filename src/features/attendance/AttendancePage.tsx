import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";
import { getVisibleStudentEmail } from "../../utils/studentEmail";

type StudentRow = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type ClassDetails = {
  id: string;
  name: string;
  students?: StudentRow[];
};

type ScheduleRow = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  class?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  teacher?: {
    id: string;
    user?: {
      firstName?: string;
      lastName?: string;
    };
  };
};

type TeacherOverviewResponse = {
  schedules: ScheduleRow[];
};

type AttendanceRecord = {
  id: string;
  studentId: string;
  scheduleId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
};

type AttendancePageProps = {
  apiBaseUrl: string;
  token: string;
};

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
type AttendanceFilter = "ALL" | AttendanceStatus;

type AttendancePayload = {
  studentId: string;
  scheduleId: string;
  status: AttendanceStatus;
  date: string;
};

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

function translateStatus(status: AttendanceStatus) {
  if (status === "PRESENT") return "حاضر";
  if (status === "ABSENT") return "غائب";
  if (status === "LATE") return "متأخر";

  return status;
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("select a schedule") || normalized.includes("schedule and date")) {
    return "يرجى اختيار الحصة والتاريخ.";
  }

  if (normalized.includes("no students")) {
    return "لا يوجد تلاميذ للحصة المختارة.";
  }

  if (normalized.includes("class students")) {
    return "تعذر تحميل تلاميذ القسم.";
  }

  if (normalized.includes("attendance")) {
    return "تعذر تحميل أو حفظ الحضور والغياب.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

export default function AttendancePage({
  apiBaseUrl,
  token,
}: AttendancePageProps) {
  const { showToast } = useToast();

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";
  const isTeacher = role === "TEACHER";

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [classStudents, setClassStudents] = useState<StudentRow[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate());

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>("ALL");

  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      setError("");

      if (isTeacher) {
        const json = await apiGet<TeacherOverviewResponse>(
          `${apiBaseUrl}/api/my-teacher-overview`,
          token
        );
        const list = Array.isArray(json?.schedules) ? json.schedules : [];
        setSchedules(list);

        if (list.length > 0) {
          setSelectedScheduleId((current) => current || list[0].id);
        }

        return;
      }

      const json = await apiGet<ScheduleRow[]>(`${apiBaseUrl}/api/schedules`, token);
      const list = Array.isArray(json) ? json : [];
      setSchedules(list);

      if (list.length > 0) {
        setSelectedScheduleId((current) => current || list[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setLoadingSchedules(false);
    }
  }, [apiBaseUrl, token, isTeacher, showToast]);

  const fetchClassStudents = useCallback(async (scheduleId: string) => {
    const selected = schedules.find((item) => item.id === scheduleId);
    const classId = selected?.class?.id;

    if (!classId) {
      setClassStudents([]);
      return;
    }

    try {
      const classJson = await apiGet<ClassDetails>(
        `${apiBaseUrl}/api/classes/${classId}`,
        token
      );

      setClassStudents(Array.isArray(classJson?.students) ? classJson.students : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذر تحميل تلاميذ القسم.";
      const translated = translateError(message);
      setError(translated);
      setClassStudents([]);
      showToast(translated, "error");
    }
  }, [apiBaseUrl, token, schedules, showToast]);

  const fetchAttendance = useCallback(async (scheduleId: string, date: string) => {
    if (!scheduleId || !date) return;

    try {
      setLoadingAttendance(true);
      setError("");
      setSuccessMessage("");

      const json = await apiGet<AttendanceRecord[]>(
        `${apiBaseUrl}/api/attendance/${scheduleId}?date=${date}`,
        token
      );

      const records = Array.isArray(json) ? json : [];
      const nextStatuses: Record<string, AttendanceStatus> = {};

      for (const record of records) {
        nextStatuses[record.studentId] = record.status;
      }

      setStatuses(nextStatuses);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      setStatuses({});
      showToast(translated, "error");
    } finally {
      setLoadingAttendance(false);
    }
  }, [apiBaseUrl, token, showToast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    if (selectedScheduleId) {
      fetchClassStudents(selectedScheduleId);
    } else {
      setClassStudents([]);
    }
  }, [selectedScheduleId, fetchClassStudents]);

  useEffect(() => {
    if (selectedScheduleId && selectedDate) {
      fetchAttendance(selectedScheduleId, selectedDate);
    }
  }, [selectedScheduleId, selectedDate, fetchAttendance]);

  const selectedSchedule = useMemo(
    () => schedules.find((item) => item.id === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId]
  );

  const attendanceSheet = useMemo(() => {
    return classStudents.map((student) => ({
      studentId: student.id,
      fullName:
        `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim() ||
        "تلميذ غير معروف",
      email: getVisibleStudentEmail(student.user?.email),
      status: statuses[student.id] ?? "PRESENT",
    }));
  }, [classStudents, statuses]);

  const filteredAttendanceSheet = useMemo(() => {
    return attendanceSheet.filter((row) => {
      if (statusFilter === "ALL") return true;
      return row.status === statusFilter;
    });
  }, [attendanceSheet, statusFilter]);

  const summary = useMemo(() => {
    const total = attendanceSheet.length;
    const present = attendanceSheet.filter((row) => row.status === "PRESENT").length;
    const absent = attendanceSheet.filter((row) => row.status === "ABSENT").length;
    const late = attendanceSheet.filter((row) => row.status === "LATE").length;

    return { total, present, absent, late };
  }, [attendanceSheet]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedScheduleId || !selectedDate) {
      const message = "يرجى اختيار الحصة والتاريخ.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (attendanceSheet.length === 0) {
      const message = "لا يوجد تلاميذ للحصة المختارة.";
      setError(message);
      showToast(message, "error");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      await Promise.all(
        attendanceSheet.map((row) =>
          apiPost<{ message: string }, AttendancePayload>(
            `${apiBaseUrl}/api/attendance`,
            token,
            {
              studentId: row.studentId,
              scheduleId: selectedScheduleId,
              status: row.status,
              date: selectedDate,
            }
          )
        )
      );

      const message = "تم حفظ الحضور والغياب بنجاح.";
      setSuccessMessage(message);
      showToast(message, "success");
      await fetchAttendance(selectedScheduleId, selectedDate);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      setSuccessMessage("");
      showToast(translated, "error");
    } finally {
      setSaving(false);
    }
  };

  const scheduleLabel = (schedule: ScheduleRow) => {
    const className = schedule.class?.name ?? "قسم غير معروف";
    const subjectName = schedule.subject?.name ?? "مادة غير معروفة";
    return `${className} • ${subjectName} • ${translateDay(schedule.dayOfWeek)} • ${schedule.startTime}-${schedule.endTime}`;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header>
        <h2 className="text-2xl font-bold">
          {isTeacher ? "الحضور والغياب الخاص بي" : "الحضور والغياب"}
        </h2>
        <p className="text-sm text-slate-500">
          {isTeacher
            ? "اختر إحدى حصصك وحدد حالة التلاميذ: حاضر أو غائب أو متأخر."
            : "اختر الحصة والتاريخ ثم حدد حالة التلاميذ: حاضر أو غائب أو متأخر."}
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الحصة</label>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              disabled={loadingSchedules}
            >
              <option value="">اختر حصة</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {scheduleLabel(schedule)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">التاريخ</label>
            <input
              type="date"
              dir="ltr"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              onClick={fetchSchedules}
              className="w-full rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {isTeacher ? "تحديث حصصي" : "تحديث الحصص"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorState message={error} />
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}
      </section>

      {!loadingAttendance && attendanceSheet.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">مجموع التلاميذ</p>
            <p className="mt-2 text-2xl font-bold">{summary.total}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">الحاضرون</p>
            <p className="mt-2 text-2xl font-bold">{summary.present}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">الغائبون</p>
            <p className="mt-2 text-2xl font-bold">{summary.absent}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">المتأخرون</p>
            <p className="mt-2 text-2xl font-bold">{summary.late}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">ورقة الحضور والغياب</h3>
            {selectedSchedule ? (
              <p className="text-sm text-slate-500">
                {selectedSchedule.class?.name ?? "قسم غير معروف"} •{" "}
                {selectedSchedule.subject?.name ?? "مادة غير معروفة"} •{" "}
                <span dir="ltr">{selectedDate}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">اختر حصة للبدء.</p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceFilter)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="ALL">كل الحالات</option>
              <option value="PRESENT">حاضر</option>
              <option value="ABSENT">غائب</option>
              <option value="LATE">متأخر</option>
            </select>

            <button
              onClick={handleSaveAll}
              disabled={saving || !selectedScheduleId || attendanceSheet.length === 0}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الحضور والغياب"}
            </button>
          </div>
        </div>

        {loadingSchedules ? (
          <LoadingState
            message={isTeacher ? "جارٍ تحميل حصصك..." : "جارٍ تحميل الحصص..."}
          />
        ) : loadingAttendance ? (
          <LoadingState message="جارٍ تحميل سجلات الحضور والغياب..." />
        ) : !selectedScheduleId ? (
          <EmptyState message="يرجى اختيار حصة." />
        ) : attendanceSheet.length === 0 ? (
          <EmptyState message="لا يوجد تلاميذ للحصة المختارة." />
        ) : filteredAttendanceSheet.length === 0 ? (
          <EmptyState message="لا يوجد تلاميذ مطابقون لتصفية الحالة الحالية." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-right text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">التلميذ</th>
                  <th className="px-3 py-3 font-medium">البريد الإلكتروني</th>
                  <th className="px-3 py-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendanceSheet.map((row) => (
                  <tr key={row.studentId} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{row.fullName}</td>
                    <td className="px-3 py-3 text-left text-sm text-slate-600" dir="ltr">
                      {row.email || "-"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {(["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map(
                          (statusOption) => {
                            const isActive = row.status === statusOption;

                            return (
                              <button
                                key={statusOption}
                                type="button"
                                onClick={() =>
                                  handleStatusChange(row.studentId, statusOption)
                                }
                                className={`rounded-lg border px-3 py-1 text-sm font-medium transition ${
                                  isActive
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                {translateStatus(statusOption)}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}