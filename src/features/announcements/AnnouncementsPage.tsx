import { useEffect, useState } from "react";
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

const emptyForm: FormState = {
  title: "",
  content: "",
  audience: "ALL",
  classId: "",
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

export default function AnnouncementsPage({
  apiBaseUrl,
  token,
}: AnnouncementsPageProps) {
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const [announcementsData, classesData] = await Promise.all([
      apiRequest<AnnouncementItem[]>(`${apiBaseUrl}/api/announcements`, token),
      apiRequest<ClassItem[]>(`${apiBaseUrl}/api/classes`, token),
    ]);

    setAnnouncements(announcementsData);
    setClasses(classesData);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await fetchData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load announcements";
        setError(message);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, token]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!form.title.trim() || !form.content.trim()) {
        throw new Error("Title and content are required.");
      }

      if (form.audience === "CLASS" && !form.classId) {
        throw new Error("Class is required when audience is CLASS.");
      }

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        audience: form.audience,
        classId: form.audience === "CLASS" ? form.classId : null,
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
        showToast("Announcement updated successfully.", "success");
      } else {
        await apiRequest<AnnouncementItem>(
          `${apiBaseUrl}/api/announcements`,
          token,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        showToast("Announcement created successfully.", "success");
      }

      resetForm();
      await fetchData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save announcement";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: AnnouncementItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      audience: item.audience,
      classId: item.classId ?? "",
    });
    setError("");
  };

  const handleDelete = (id: string) => {
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

    showToast("Announcement deleted successfully.", "success");
    setPendingDeleteId(null);
    await fetchData();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete announcement";
    setError(message);
    showToast(message, "error");
  }
};

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage announcements for students, parents, teachers, or a
          specific class.
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
              {editingId ? "Edit Announcement" : "Create Announcement"}
            </h3>

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
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-xl border px-3 py-2"
                placeholder="Announcement title"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Content
              </label>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, content: e.target.value }))
                }
                className="min-h-[140px] w-full rounded-xl border px-3 py-2"
                placeholder="Announcement content"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Audience
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
                <option value="ALL">All</option>
                <option value="STUDENTS">Students</option>
                <option value="PARENTS">Parents</option>
                <option value="TEACHERS">Teachers</option>
                <option value="CLASS">Specific Class</option>
              </select>
            </div>

            {form.audience === "CLASS" ? (
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
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Announcement"
                : "Create Announcement"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Announcement List
            </h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {announcements.length} item(s)
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading announcements...</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements found.</p>
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
                          {item.audience}
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
                            Created:
                          </span>{" "}
                          {formatDateTime(item.createdAt)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">
                            Author:
                          </span>{" "}
                          {item.createdBy?.firstName} {item.createdBy?.lastName}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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
        This action will permanently delete this announcement.
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