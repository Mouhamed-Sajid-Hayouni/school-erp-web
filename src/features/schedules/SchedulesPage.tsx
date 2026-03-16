import { useEffect, useState } from "react";

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
      firstName?: string;
      lastName?: string;
    };
  };
};

type SchedulesPageProps = {
  apiBaseUrl: string;
  token: string;
};

const DAY_OPTIONS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const INITIAL_FORM = {
  classId: "",
  subjectId: "",
  teacherId: "",
  dayOfWeek: "Lundi",
  startTime: "",
  endTime: "",
};

export default function SchedulesPage({
  apiBaseUrl,
  token,
}: SchedulesPageProps) {
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

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${apiBaseUrl}/api/schedules`, {
        headers: authHeaders,
      });

      if (!response.ok) {
        throw new Error("Failed to load schedules.");
      }

      const json = await response.json();
      setSchedules(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      setError("");

      const [classesResponse, subjectsResponse, teachersResponse] =
        await Promise.all([
          fetch(`${apiBaseUrl}/api/classes`, {
            headers: authHeaders,
          }),
          fetch(`${apiBaseUrl}/api/subjects`, {
            headers: authHeaders,
          }),
          fetch(`${apiBaseUrl}/api/teachers`, {
            headers: authHeaders,
          }),
        ]);

      if (!classesResponse.ok) {
        throw new Error("Failed to load classes.");
      }

      if (!subjectsResponse.ok) {
        throw new Error("Failed to load subjects.");
      }

      if (!teachersResponse.ok) {
        throw new Error("Failed to load teachers.");
      }

      const [classesJson, subjectsJson, teachersJson] = await Promise.all([
        classesResponse.json(),
        subjectsResponse.json(),
        teachersResponse.json(),
      ]);

      setClasses(Array.isArray(classesJson) ? classesJson : []);
      setSubjects(Array.isArray(subjectsJson) ? subjectsJson : []);
      setTeachers(Array.isArray(teachersJson) ? teachersJson : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
      setError("All schedule fields are required.");
      return false;
    }

    if (form.startTime >= form.endTime) {
      setError("End time must be later than start time.");
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError("");

      const response = await fetch(`${apiBaseUrl}/api/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          classId: form.classId,
          subjectId: form.subjectId,
          teacherId: form.teacherId,
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create schedule.");
      }

      await fetchSchedules();
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingScheduleId) return;

    try {
      setUpdating(true);
      setError("");

      const response = await fetch(
        `${apiBaseUrl}/api/schedules/${editingScheduleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            classId: form.classId,
            subjectId: form.subjectId,
            teacherId: form.teacherId,
            dayOfWeek: form.dayOfWeek,
            startTime: form.startTime,
            endTime: form.endTime,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update schedule.");
      }

      await fetchSchedules();
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (editingScheduleId) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this schedule?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      const response = await fetch(`${apiBaseUrl}/api/schedules/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete schedule.");
      }

      setSchedules((prev) => prev.filter((item) => item.id !== id));

      if (editingScheduleId === id) {
        resetForm();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const teacherLabel = (teacher: TeacherOption) => {
    const firstName = teacher.user?.firstName ?? "";
    const lastName = teacher.user?.lastName ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || teacher.user?.email || "Teacher";
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Schedules</h2>
        <p className="text-sm text-slate-500">
          Manage class timetables, subjects, and teacher assignments.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">
            {editingScheduleId ? "Edit Schedule" : "Create Schedule"}
          </h3>

          {editingScheduleId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loadingLookups ? (
          <p>Loading classes, subjects, and teachers...</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Class</label>
              <select
                value={form.classId}
                onChange={(e) => handleChange("classId", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              >
                <option value="">Select a class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.academicYear ? ` (${item.academicYear})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Subject</label>
              <select
                value={form.subjectId}
                onChange={(e) => handleChange("subjectId", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              >
                <option value="">Select a subject</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Teacher</label>
              <select
                value={form.teacherId}
                onChange={(e) => handleChange("teacherId", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              >
                <option value="">Select a teacher</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {teacherLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Day</label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => handleChange("dayOfWeek", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              >
                {DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={creating || updating}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {editingScheduleId
                  ? updating
                    ? "Updating..."
                    : "Update Schedule"
                  : creating
                  ? "Creating..."
                  : "Create Schedule"}
              </button>

              {editingScheduleId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Schedule List</h3>
          <button
            onClick={fetchSchedules}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading schedules...</p>
        ) : schedules.length === 0 ? (
          <p className="text-slate-500">No schedules found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">Class</th>
                  <th className="px-3 py-3 font-medium">Subject</th>
                  <th className="px-3 py-3 font-medium">Teacher</th>
                  <th className="px-3 py-3 font-medium">Day</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((item) => {
                  const teacherName = `${
                    item.teacher?.user?.firstName ?? ""
                  } ${item.teacher?.user?.lastName ?? ""}`.trim();

                  return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-3 font-medium">
                        {item.class?.name ?? "Unknown class"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {item.subject?.name ?? "Unknown subject"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {teacherName || "Unknown teacher"}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {item.dayOfWeek}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === item.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
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