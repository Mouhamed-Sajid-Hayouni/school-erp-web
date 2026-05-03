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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const toDateInputValue = (value: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

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
      setError(
        err instanceof Error ? err.message : "Failed to load school settings."
      );
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

      setSuccess("School settings updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update school settings."
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">School Settings</h1>
        <p className="mt-1 text-slate-500">
          Configure school identity, academic year, default trimester, and report
          dates.
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
            General Settings
          </h2>
          <p className="text-sm text-slate-500">
            These values can be reused across reports, bulletins, and school
            documents.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading settings...</p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  School name
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
                  School subtitle
                </label>
                <input
                  value={schoolSubtitle}
                  onChange={(event) => setSchoolSubtitle(event.target.value)}
                  placeholder="Tunisian Public School"
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Academic year
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
                  Default trimester
                </label>
                <select
                  value={defaultTrimester}
                  onChange={(event) =>
                    setDefaultTrimester(event.target.value as GradePeriod)
                  }
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="TRIMESTER_1">Trimester 1</option>
                  <option value="TRIMESTER_2">Trimester 2</option>
                  <option value="TRIMESTER_3">Trimester 3</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Default report from
                </label>
                <input
                  type="date"
                  value={defaultReportFrom}
                  onChange={(event) => setDefaultReportFrom(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Default report to
                </label>
                <input
                  type="date"
                  value={defaultReportTo}
                  onChange={(event) => setDefaultReportTo(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <div className="text-xs text-slate-500">
                {settings?.updatedAt
                  ? `Last updated: ${new Date(
                      settings.updatedAt
                    ).toLocaleString()}`
                  : "Settings not saved yet."}
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Current values</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SettingPreview label="School" value={schoolName || "-"} />
          <SettingPreview label="Subtitle" value={schoolSubtitle || "-"} />
          <SettingPreview label="Academic year" value={academicYear || "-"} />
          <SettingPreview label="Trimester" value={defaultTrimester} />
          <SettingPreview label="Report from" value={defaultReportFrom || "-"} />
          <SettingPreview label="Report to" value={defaultReportTo || "-"} />
        </div>
      </div>
    </div>
  );
}

function SettingPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}