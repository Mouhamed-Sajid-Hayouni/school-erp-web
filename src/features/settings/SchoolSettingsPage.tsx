import { useEffect, useState } from "react";

type GradePeriod = "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";

type SchoolSettings = {
  id: string;
  schoolName: string;
  schoolSubtitle: string;
  academicYear: string;
  defaultTrimester: GradePeriod;
  defaultReportFrom: string | null;
  defaultReportTo: string | null;
  createdAt: string;
  updatedAt: string;
};

import { API_BASE_URL } from "../../lib/config";

const toDateInputValue = (value: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

function formatPeriodLabel(period: GradePeriod) {
  if (period === "TRIMESTER_1") return "الثلاثي الأول";
  if (period === "TRIMESTER_2") return "الثلاثي الثاني";
  if (period === "TRIMESTER_3") return "الثلاثي الثالث";

  return period;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ar-TN");
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("load") || normalized.includes("settings")) {
    return "تعذر تحميل إعدادات المدرسة.";
  }

  if (normalized.includes("update") || normalized.includes("save")) {
    return "تعذر حفظ إعدادات المدرسة.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

export default function SchoolSettingsPage() {
  const token = localStorage.getItem("token") || "";

  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [schoolSubtitle, setSchoolSubtitle] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [defaultTrimester, setDefaultTrimester] =
    useState<GradePeriod>("TRIMESTER_1");
  const [defaultReportFrom, setDefaultReportFrom] = useState("");
  const [defaultReportTo, setDefaultReportTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/school`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load school settings.");
      }

      setSettings(data);
      setSchoolName(data.schoolName || "");
      setSchoolSubtitle(data.schoolSubtitle || "");
      setAcademicYear(data.academicYear || "");
      setDefaultTrimester(data.defaultTrimester || "TRIMESTER_1");
      setDefaultReportFrom(toDateInputValue(data.defaultReportFrom));
      setDefaultReportTo(toDateInputValue(data.defaultReportTo));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر تحميل إعدادات المدرسة.";
      setError(translateError(message));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings/school`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schoolName,
          schoolSubtitle,
          academicYear,
          defaultTrimester,
          defaultReportFrom: defaultReportFrom || null,
          defaultReportTo: defaultReportTo || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update school settings.");
      }

      setSettings(data);
      setSchoolName(data.schoolName || "");
      setSchoolSubtitle(data.schoolSubtitle || "");
      setAcademicYear(data.academicYear || "");
      setDefaultTrimester(data.defaultTrimester || "TRIMESTER_1");
      setDefaultReportFrom(toDateInputValue(data.defaultReportFrom));
      setDefaultReportTo(toDateInputValue(data.defaultReportTo));

      setSuccess("تم حفظ إعدادات المدرسة بنجاح.");
      window.dispatchEvent(new Event("school-settings-updated"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر حفظ إعدادات المدرسة.";
      setError(translateError(message));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">إعدادات المدرسة</h1>
        <p className="mt-1 text-slate-500">
          ضبط هوية المدرسة والسنة الدراسية والثلاثي الافتراضي وتواريخ التقارير.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">
            الإعدادات العامة
          </h2>
          <p className="text-sm text-slate-500">
            يمكن استعمال هذه القيم في التقارير وبطاقات الأعداد والوثائق المدرسية.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">جارٍ تحميل الإعدادات...</p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  اسم المدرسة
                </label>
                <input
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder="School ERP"
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  الوصف المختصر للمدرسة
                </label>
                <input
                  value={schoolSubtitle}
                  onChange={(event) => setSchoolSubtitle(event.target.value)}
                  placeholder="مدرسة عمومية تونسية"
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  السنة الدراسية
                </label>
                <input
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder="2025-2026"
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  الثلاثي الافتراضي
                </label>
                <select
                  value={defaultTrimester}
                  onChange={(event) =>
                    setDefaultTrimester(event.target.value as GradePeriod)
                  }
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="TRIMESTER_1">الثلاثي الأول</option>
                  <option value="TRIMESTER_2">الثلاثي الثاني</option>
                  <option value="TRIMESTER_3">الثلاثي الثالث</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  تاريخ بداية التقارير الافتراضي
                </label>
                <input
                  type="date"
                  dir="ltr"
                  value={defaultReportFrom}
                  onChange={(event) => setDefaultReportFrom(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  تاريخ نهاية التقارير الافتراضي
                </label>
                <input
                  type="date"
                  dir="ltr"
                  value={defaultReportTo}
                  onChange={(event) => setDefaultReportTo(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <div className="text-xs text-slate-500">
                {settings?.updatedAt
                  ? `آخر تحديث: ${formatDateTime(settings.updatedAt)}`
                  : "لم يتم حفظ الإعدادات بعد."}
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">القيم الحالية</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SettingPreview label="المدرسة" value={schoolName || "-"} />
          <SettingPreview label="الوصف المختصر" value={schoolSubtitle || "-"} />
          <SettingPreview label="السنة الدراسية" value={academicYear || "-"} />
          <SettingPreview
            label="الثلاثي"
            value={formatPeriodLabel(defaultTrimester)}
          />
          <SettingPreview
            label="تقرير من"
            value={defaultReportFrom || "-"}
          />
          <SettingPreview
            label="تقرير إلى"
            value={defaultReportTo || "-"}
          />
        </div>
      </div>
    </div>
  );
}

function SettingPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4 text-right" dir="rtl">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}