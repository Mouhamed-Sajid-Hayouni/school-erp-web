import { useEffect, useMemo, useState, type FormEvent } from "react";
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

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("subject name")) {
    return "اسم المادة مطلوب.";
  }

  if (normalized.includes("coefficient")) {
    return "يجب أن يكون المعامل عددًا أكبر من 0.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  if (normalized.includes("delete")) {
    return "تعذر حذف المادة.";
  }

  return message || "حدث خطأ غير متوقع.";
}

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
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const parsedCoefficient = Number(form.coefficient);

    if (!trimmedName) {
      const message = "اسم المادة مطلوب.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (Number.isNaN(parsedCoefficient) || parsedCoefficient <= 0) {
      const message = "يجب أن يكون المعامل عددًا أكبر من 0.";
      setError(message);
      showToast(message, "error");
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
      showToast("تم إنشاء المادة بنجاح.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذه المادة؟");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await apiDelete(`${apiBaseUrl}/api/subjects/${id}`, token);
      setSubjects((prev) => prev.filter((item) => item.id !== id));
      showToast("تم حذف المادة بنجاح.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header>
        <h2 className="text-2xl font-bold">المواد</h2>
        <p className="text-sm text-slate-500">
          إدارة المواد الدراسية ومعاملاتها.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">إنشاء مادة</h3>

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">اسم المادة</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="مثال: الرياضيات"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">المعامل</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              dir="ltr"
              value={form.coefficient}
              onChange={(e) => handleChange("coefficient", e.target.value)}
              placeholder="2"
              className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "جارٍ الإنشاء..." : "إنشاء المادة"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold">قائمة المواد</h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              placeholder="البحث باسم المادة أو المعامل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />

            <button
              onClick={fetchSubjects}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              تحديث
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="جارٍ تحميل المواد..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredSubjects.length === 0 ? (
          <EmptyState message="لا توجد مواد مطابقة للبحث الحالي." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-right text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">اسم المادة</th>
                  <th className="px-3 py-3 font-medium">المعامل</th>
                  <th className="px-3 py-3 font-medium">الإجراءات</th>
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
                        {deletingId === item.id ? "جارٍ الحذف..." : "حذف"}
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