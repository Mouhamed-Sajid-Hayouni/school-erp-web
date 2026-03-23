import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

type StudentRow = {
  id: string;
  user?: {
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
  class?: {
    id: string;
    name: string;
    students?: StudentRow[];
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

export default function AttendancePage({
  apiBaseUrl,
  token,
}: AttendancePageProps) {
  const { showToast } = useToast();

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate());

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>("ALL");

  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchSchedules = async () => {
    try {
      setLoadingSchedules(true);
      setError("");

      const json = await apiGet<ScheduleRow[]>(`${apiBaseUrl}/api/schedules`, token);
      const list = Array.isArray(json) ? json : [];
      setSchedules(list);

      if (!selectedScheduleId && list.length > 0) {
        setSelectedScheduleId(list[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoadingSchedules(false);
    }
  };

  const fetchAttendance = async (scheduleId: string, date: string) => {
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
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setStatuses({});
      showToast(message, "error");
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (selectedScheduleId && selectedDate) {
      fetchAttendance(selectedScheduleId, selectedDate);
    }
  }, [selectedScheduleId, selectedDate]);

  const selectedSchedule = useMemo(
    () => schedules.find((item) => item.id === selectedScheduleId) ?? null,
    [schedules, selectedScheduleId]
  );

  const classStudents = selectedSchedule?.class?.students ?? [];

  const attendanceSheet = useMemo(() => {
    return classStudents.map((student) => ({
      studentId: student.id,
      fullName:
        `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim() ||
        "Unknown Student",
      email: student.user?.email ?? "",
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
      setError("Please select a schedule and date.");
      showToast("Please select a schedule and date.", "error");
      return;
    }

    if (attendanceSheet.length === 0) {
      setError("No students found for the selected schedule.");
      showToast("No students found for the selected schedule.", "error");
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

      setSuccessMessage("Attendance saved successfully.");
      showToast("Attendance saved successfully.", "success");
      await fetchAttendance(selectedScheduleId, selectedDate);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setSuccessMessage("");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const scheduleLabel = (schedule: ScheduleRow) => {
    const className = schedule.class?.name ?? "Unknown class";
    const subjectName = schedule.subject?.name ?? "Unknown subject";
    return `${className} • ${subjectName} • ${schedule.dayOfWeek} • ${schedule.startTime}-${schedule.endTime}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Attendance</h2>
        <p className="text-sm text-slate-500">
          Select a schedule and date, then mark students as present, absent, or late.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Schedule</label>
            <select
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              disabled={loadingSchedules}
            >
              <option value="">Select a schedule</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {scheduleLabel(schedule)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              onClick={fetchSchedules}
              className="w-full rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Refresh Schedules
            </button>
          </div>
        </div>

        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}
      </section>

      {!loadingAttendance && attendanceSheet.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Students</p>
            <p className="mt-2 text-2xl font-bold">{summary.total}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Present</p>
            <p className="mt-2 text-2xl font-bold">{summary.present}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Absent</p>
            <p className="mt-2 text-2xl font-bold">{summary.absent}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Late</p>
            <p className="mt-2 text-2xl font-bold">{summary.late}</p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Attendance Sheet</h3>
            {selectedSchedule ? (
              <p className="text-sm text-slate-500">
                {selectedSchedule.class?.name ?? "Unknown class"} •{" "}
                {selectedSchedule.subject?.name ?? "Unknown subject"} •{" "}
                {selectedDate}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Select a schedule to begin.</p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceFilter)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="ALL">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>

            <button
              onClick={handleSaveAll}
              disabled={saving || !selectedScheduleId || attendanceSheet.length === 0}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>

        {loadingSchedules ? (
          <LoadingState message="Loading schedules..." />
        ) : loadingAttendance ? (
          <LoadingState message="Loading attendance records..." />
        ) : !selectedScheduleId ? (
          <EmptyState message="Please select a schedule." />
        ) : attendanceSheet.length === 0 ? (
          <EmptyState message="No students found for the selected schedule." />
        ) : filteredAttendanceSheet.length === 0 ? (
          <EmptyState message="No students found for the current status filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">Student</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendanceSheet.map((row) => (
                  <tr key={row.studentId} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{row.fullName}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">
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
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                {statusOption}
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