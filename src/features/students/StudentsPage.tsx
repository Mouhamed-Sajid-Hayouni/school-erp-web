import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

type ClassRow = {
  id: string;
  name: string;
  academicYear: string;
};

type StudentRow = {
  id: string;
  dateOfBirth: string;
  enrollmentDate: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: string;
    isActive: boolean;
  };
  class?: ClassRow | null;
};

type StudentsPageProps = {
  apiBaseUrl: string;
  token: string;
};

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("required")) {
    return "الاسم واللقب وتاريخ الولادة والقسم مطلوبة.";
  }

  if (normalized.includes("dateofbirth") || normalized.includes("valid date")) {
    return "تاريخ الولادة غير صالح.";
  }

  if (normalized.includes("class not found")) {
    return "القسم المختار غير موجود.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleDateString("ar-TN");
}

function getVisibleStudentEmail(email?: string | null) {
  if (!email || email.endsWith("@internal.school.local")) {
    return "دون حساب دخول مباشر";
  }

  return email;
}

export default function StudentsPage({ apiBaseUrl, token }: StudentsPageProps) {
  const { showToast } = useToast();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    classId: "",
  });

  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [studentsJson, classesJson] = await Promise.all([
        apiGet<StudentRow[]>(`${apiBaseUrl}/api/students`, token),
        apiGet<ClassRow[]>(`${apiBaseUrl}/api/classes`, token),
      ]);

      setStudents(Array.isArray(studentsJson) ? studentsJson : []);
      setClasses(Array.isArray(classesJson) ? classesJson : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredStudents = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    return students.filter((student) => {
      const fullName = `${student.user.firstName} ${student.user.lastName}`.toLowerCase();
      const className = student.class?.name?.toLowerCase() ?? "";

      if (!value) return true;

      return fullName.includes(value) || className.includes(value);
    });
  }, [students, searchTerm]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const phone = form.phone.trim();
    const dateOfBirth = form.dateOfBirth.trim();
    const classId = form.classId.trim();

    if (!firstName || !lastName || !dateOfBirth || !classId) {
      const message = "الاسم واللقب وتاريخ الولادة والقسم مطلوبة.";
      setError(message);
      showToast(message, "error");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const created = await apiPost<
        StudentRow,
        {
          firstName: string;
          lastName: string;
          phone: string;
          dateOfBirth: string;
          classId: string;
        }
      >(`${apiBaseUrl}/api/students`, token, {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        classId,
      });

      setStudents((prev) => [created, ...prev]);
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        dateOfBirth: "",
        classId: "",
      });

      showToast("تم إنشاء ملف التلميذ بنجاح.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <LoadingState label="جاري تحميل ملفات التلاميذ..." />;
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header>
        <h2 className="text-2xl font-bold">التلاميذ</h2>
        <p className="text-sm text-slate-500">
          إدارة ملفات التلاميذ كدossiers مدرسية دون إنشاء حساب دخول مباشر للتلميذ.
        </p>
      </header>

      {error ? <ErrorState message={error} onRetry={fetchData} /> : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">إضافة تلميذ</h3>

        {classes.length === 0 ? (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            يجب إنشاء قسم واحد على الأقل قبل تسجيل التلاميذ.
          </div>
        ) : (
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الاسم</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(event) => handleChange("firstName", event.target.value)}
                placeholder="مثال: أحمد"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اللقب</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(event) => handleChange("lastName", event.target.value)}
                placeholder="مثال: بن صالح"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الهاتف اختياري</label>
              <input
                type="text"
                dir="ltr"
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
                placeholder="مثال: 22123456"
                className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">تاريخ الولادة</label>
              <input
                type="date"
                dir="ltr"
                value={form.dateOfBirth}
                onChange={(event) => handleChange("dateOfBirth", event.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">القسم</label>
              <select
                value={form.classId}
                onChange={(event) => handleChange("classId", event.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              >
                <option value="">اختر القسم</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.academicYear}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? "جاري التسجيل..." : "إضافة التلميذ"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-semibold">قائمة التلاميذ</h3>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              placeholder="البحث بالاسم أو القسم..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />

            <button
              onClick={fetchData}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              تحديث
            </button>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState title="لا توجد ملفات تلاميذ" description="يمكن للإدارة إضافة ملف تلميذ جديد من النموذج أعلاه." />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">التلميذ</th>
                  <th className="px-4 py-3 text-right">القسم</th>
                  <th className="px-4 py-3 text-right">تاريخ الولادة</th>
                  <th className="px-4 py-3 text-right">الحساب</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {student.user.firstName} {student.user.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{student.user.phone || "لا يوجد هاتف"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {student.class ? `${student.class.name} - ${student.class.academicYear}` : "غير مرتبط بقسم"}
                    </td>
                    <td className="px-4 py-3">{formatDate(student.dateOfBirth)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {getVisibleStudentEmail(student.user.email)}
                      </span>
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
