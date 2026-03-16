import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";

type ClassRow = {
  id: string;
  name: string;
  academicYear: string;
};

type ClassesPageProps = {
  apiBaseUrl: string;
  token: string;
};

export default function ClassesPage({ apiBaseUrl, token }: ClassesPageProps) {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    academicYear: "",
  });

  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError("");

      const json = await apiGet<ClassRow[]>(`${apiBaseUrl}/api/classes`, token);
      setClasses(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleChange = (field: "name" | "academicYear", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedAcademicYear = form.academicYear.trim();

    if (!trimmedName || !trimmedAcademicYear) {
      setError("Class name and academic year are required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const created = await apiPost<
        ClassRow,
        { name: string; academicYear: string }
      >(`${apiBaseUrl}/api/classes`, token, {
        name: trimmedName,
        academicYear: trimmedAcademicYear,
      });

      setClasses((prev) => [created, ...prev]);
      setForm({
        name: "",
        academicYear: "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this class?");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await apiDelete(`${apiBaseUrl}/api/classes/${id}`, token);
      setClasses((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Classes</h2>
        <p className="text-sm text-slate-500">
          Manage school classes and academic years.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Create Class</h3>

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Class Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. 1ère Année A"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Academic Year</label>
            <input
              type="text"
              value={form.academicYear}
              onChange={(e) => handleChange("academicYear", e.target.value)}
              placeholder="e.g. 2025-2026"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Class"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Class List</h3>
          <button
            onClick={fetchClasses}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading classes..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : classes.length === 0 ? (
          <EmptyState message="No classes found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">Class Name</th>
                  <th className="px-3 py-3 font-medium">Academic Year</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{item.name}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {item.academicYear}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
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