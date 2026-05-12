import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiDelete, apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

type ClassRow = {
  id: string;
  name: string;
  academicYear: string;
};

type ClassesPageProps = {
  apiBaseUrl: string;
  token: string;
};

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("class name") || normalized.includes("academic year")) {
    return "اسم القسم والسنة الدراسية مطلوبان.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  if (normalized.includes("delete")) {
    return "تعذر حذف القسم.";
  }

  return message || "حدث خطأ غير متوقع.";
}

export default function ClassesPage({ apiBaseUrl, token }: ClassesPageProps) {
  const { showToast } = useToast();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    academicYear: "",
  });

  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError("");

      const json = await apiGet<ClassRow[]>(`${apiBaseUrl}/api/classes`, token);
      setClasses(Array.isArray(json) ? json : []);
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
    fetchClasses();
  }, []);

  const filteredClasses = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    return classes.filter((item) => {
      if (!value) return true;
      return (
        item.name.toLowerCase().includes(value) ||
        item.academicYear.toLowerCase().includes(value)
      );
    });
  }, [classes, searchTerm]);

  const handleChange = (field: "name" | "academicYear", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedAcademicYear = form.academicYear.trim();

    if (!trimmedName || !trimmedAcademicYear) {
      const message = "اسم القسم والسنة الدراسية مطلوبان.";
      setError(message);
      showToast(message, "error");
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
      showToast("تم إنشاء القسم بنجاح.", "success");
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
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا القسم؟");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await apiDelete(`${apiBaseUrl}/api/classes/${id}`, token);
      setClasses((prev) => prev.filter((item) => item.id !== id));
      showToast("تم حذف القسم بنجاح.", "success");
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
        <h2 className="text-2xl font-bold">الأقسام</h2>
        <p className="text-sm text-slate-500">
          إدارة الأقسام المدرسية والسنوات الدراسية.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">إنشاء قسم</h3>

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">اسم القسم</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="مثال: السنة الأولى أ"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              السنة الدراسية
            </label>
            <input
              type="text"
              dir="ltr"
              value={form.academicYear}
              onChange={(e) => handleChange("academicYear", e.target.value)}
              placeholder="2025-2026"
              className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "جارٍ الإنشاء..." : "إنشاء القسم"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold">قائمة الأقسام</h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              placeholder="البحث باسم القسم أو السنة الدراسية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />

            <button
              onClick={fetchClasses}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              تحديث
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="جارٍ تحميل الأقسام..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : filteredClasses.length === 0 ? (
          <EmptyState message="لا توجد أقسام مطابقة للبحث الحالي." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-right text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">اسم القسم</th>
                  <th className="px-3 py-3 font-medium">السنة الدراسية</th>
                  <th className="px-3 py-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((item) => (
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