import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

type SubjectRow = {
  id: string;
  name: string;
  coefficient: number;
};

type SubjectsPageProps = {
  apiBaseUrl: string;
  token: string;
};

export default function SubjectsPage({ apiBaseUrl, token }: SubjectsPageProps) {
  const { showToast } = useToast();

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    coefficient: "1",
  });

  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError("");

      const json = await apiGet<SubjectRow[]>(`${apiBaseUrl}/api/subjects`, token);
      setSubjects(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const filteredSubjects = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    return subjects.filter((item) => {
      if (!value) return true;
      return (
        item.name.toLowerCase().includes(value) ||
        String(item.coefficient).includes(value)
      );
    });
  }, [subjects, searchTerm]);

  const handleChange = (field: "name" | "coefficient", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const parsedCoefficient = Number(form.coefficient);

    if (!trimmedName) {
      setError("Subject name is required.");
      showToast("Subject name is required.", "error");
      return;
    }

    if (Number.isNaN(parsedCoefficient) || parsedCoefficient <= 0) {
      setError("Coefficient must be a number greater than 0.");
      showToast("Coefficient must be a number greater than 0.", "error");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const created = await apiPost<
        SubjectRow,
        { name: string; coefficient: number }
      >(`${apiBaseUrl}/api/subjects`, token, {
        name: trimmedName,
        coefficient: parsedCoefficient,
      });

      setSubjects((prev) => [created, ...prev]);
      setForm({
        name: "",
        coefficient: "1",
      });
      showToast("Subject created successfully.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      showToast(message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this subject?");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await apiDelete(`${apiBaseUrl}/api/subjects/${id}`, token);
      setSubjects((prev) => prev.filter((item) => item.id !== id));
      showToast("Subject deleted successfully.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Subjects</h2>
        <p className="text-sm text-slate-500">
          Manage academic subjects and their coefficients.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Create Subject</h3>

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Subject Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Mathématiques"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Coefficient</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.coefficient}
              onChange={(e) => handleChange("coefficient", e.target.value)}
              placeholder="e.g. 2"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Subject"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold">Subject List</h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              placeholder="Search by subject or coefficient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />

            <button
              onClick={fetchSubjects}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading subjects..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredSubjects.length === 0 ? (
          <EmptyState message="No subjects found for the current search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">Subject Name</th>
                  <th className="px-3 py-3 font-medium">Coefficient</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{item.name}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {item.coefficient}
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