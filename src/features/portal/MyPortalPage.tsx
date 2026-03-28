import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import {
  exportBulletinPdf,
  type StudentBulletinResponse,
  type GradePeriod,
} from "./exportBulletinPdf";

type PortalSchedule = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject?: { name?: string; coefficient?: number };
};

type PortalGrade = {
  id: string;
  examType: string;
  period?: GradePeriod;
  score: number;
  comments?: string | null;
  subject?: { name?: string; coefficient?: number };
  createdAt?: string;
};

type PortalAttendance = {
  id: string;
  date: string;
  status: string;
  remarks?: string | null;
  schedule?: {
    subject?: { name?: string };
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
  };
};

type StudentPortalShape = {
  id?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  class?: {
    name?: string;
    academicYear?: string;
    schedules?: PortalSchedule[];
  };
  grades?: PortalGrade[];
  attendances?: PortalAttendance[];
};

type ParentPortalResponse = {
  id: string;
  userId: string;
  children?: StudentPortalShape[];
};

type PortalResponse = StudentPortalShape | ParentPortalResponse;

type MyPortalPageProps = {
  apiBaseUrl: string;
  token: string;
};

const PERIOD_OPTIONS: { value: GradePeriod; label: string }[] = [
  { value: "TRIMESTER_1", label: "Trimester 1" },
  { value: "TRIMESTER_2", label: "Trimester 2" },
  { value: "TRIMESTER_3", label: "Trimester 3" },
];

function SummaryCards({
  summary,
  attendances,
}: {
  summary: StudentBulletinResponse | null;
  attendances: PortalAttendance[];
}) {
  const absences = attendances.filter((item) => item.status === "ABSENT").length;

  const cards = [
    {
      label: "Weighted Average",
      value:
        summary?.generalAverage !== null && summary?.generalAverage !== undefined
          ? summary.generalAverage.toFixed(2)
          : "-",
    },
    {
      label: "Best Score",
      value:
        summary?.bestScore !== null && summary?.bestScore !== undefined
          ? `${summary.bestScore.toFixed(2)}/20`
          : "-",
    },
    {
      label: "Grades Count",
      value: String(summary?.gradesCount ?? 0),
    },
    {
      label: "Total Absences",
      value: String(absences),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function SubjectAverageSection({
  summary,
  loading,
}: {
  summary: StudentBulletinResponse | null;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Subject Averages</h3>

      {loading ? (
        <LoadingState message="Loading weighted academic summary..." />
      ) : !summary || summary.subjects.length === 0 ? (
        <p className="text-sm text-slate-500">
          No subject averages available for this period.
        </p>
      ) : (
        <div className="space-y-3">
          {summary.subjects.map((item) => (
            <div key={item.subjectId} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">{item.subjectName}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                  {item.average.toFixed(2)}/20
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Coefficient {item.coefficient} • Based on {item.gradesCount} grade
                {item.gradesCount > 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimetableSection({ schedule }: { schedule: PortalSchedule[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Weekly Timetable</h3>

      <div className="space-y-3">
        {schedule.length === 0 ? (
          <p className="text-sm text-slate-500">No timetable available.</p>
        ) : (
          schedule.map((item) => (
            <div key={item.id} className="rounded-xl border p-3">
              <p className="font-medium">{item.subject?.name ?? "Subject"}</p>
              <p className="text-sm text-slate-500">
                {item.dayOfWeek} • {item.startTime} - {item.endTime}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GradesSection({
  grades,
  period,
}: {
  grades: PortalGrade[];
  period: GradePeriod;
}) {
  const filteredGrades = grades.filter(
    (grade) => (grade.period ?? "TRIMESTER_1") === period
  );

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Grades</h3>

      <div className="space-y-3">
        {filteredGrades.length === 0 ? (
          <p className="text-sm text-slate-500">
            No grades available for this period.
          </p>
        ) : (
          filteredGrades.map((grade) => (
            <div key={grade.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">{grade.subject?.name ?? "Subject"}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                  {grade.score}/20
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{grade.examType}</p>
              {grade.comments ? (
                <p className="mt-2 text-sm text-slate-600">{grade.comments}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AttendanceSection({
  attendances,
  title = "Absences / Attendance",
}: {
  attendances: PortalAttendance[];
  title?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>

      <div className="space-y-3">
        {attendances.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance records.</p>
        ) : (
          attendances.map((attendance) => (
            <div key={attendance.id} className="rounded-xl border p-3">
              <p className="font-medium">
                {attendance.schedule?.subject?.name ?? "Subject"}
              </p>
              <p className="text-sm text-slate-500">
                {new Date(attendance.date).toLocaleDateString()} •{" "}
                {attendance.status}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MyPortalPage({ apiBaseUrl, token }: MyPortalPageProps) {
  const [data, setData] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalError, setPortalError] = useState("");

  const [period, setPeriod] = useState<GradePeriod>("TRIMESTER_1");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [studentSummary, setStudentSummary] =
    useState<StudentBulletinResponse | null>(null);
  const [childSummaries, setChildSummaries] = useState<
    Record<string, StudentBulletinResponse>
  >({});

  const isParentResponse = useMemo(
    () => !!data && Array.isArray((data as ParentPortalResponse).children),
    [data]
  );

  useEffect(() => {
    const fetchPortal = async () => {
      try {
        setLoading(true);
        setPortalError("");

        const json = await apiGet<PortalResponse>(
          `${apiBaseUrl}/api/my-portal`,
          token
        );

        setData(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error.";
        setPortalError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortal();
  }, [apiBaseUrl, token]);

  useEffect(() => {
    const fetchSummaries = async () => {
      if (!data) return;

      try {
        setSummaryLoading(true);
        setSummaryError("");

        if (isParentResponse) {
          const parentData = data as ParentPortalResponse;
          const children = parentData.children ?? [];

          const settled = await Promise.allSettled(
            children.map((child) =>
              apiGet<StudentBulletinResponse>(
                `${apiBaseUrl}/api/student-summary/${child.id}?period=${period}`,
                token
              )
            )
          );

          const nextMap: Record<string, StudentBulletinResponse> = {};

          children.forEach((child, index) => {
            const result = settled[index];
            if (result.status === "fulfilled") {
              nextMap[child.id!] = result.value;
            }
          });

          setChildSummaries(nextMap);

          if (settled.some((item) => item.status === "rejected")) {
            setSummaryError("Some weighted summaries could not be loaded.");
          }
        } else {
          const studentData = data as StudentPortalShape;

          if (!studentData.id) {
            setStudentSummary(null);
            return;
          }

          const response = await apiGet<StudentBulletinResponse>(
            `${apiBaseUrl}/api/student-summary/${studentData.id}?period=${period}`,
            token
          );

          setStudentSummary(response);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load academic summary.";
        setSummaryError(message);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummaries();
  }, [data, isParentResponse, apiBaseUrl, token, period]);

  const handleExportBulletin = async (studentId: string) => {
    try {
      const bulletin = await apiGet<StudentBulletinResponse>(
        `${apiBaseUrl}/api/student-bulletin/${studentId}?period=${period}`,
        token
      );

      exportBulletinPdf(bulletin);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to export bulletin PDF.";
      setSummaryError(message);
    }
  };

  if (loading) {
    return <LoadingState message="Loading portal..." />;
  }

  if (portalError) {
    return <ErrorState message={portalError} />;
  }

  if (!data) {
    return <EmptyState message="No portal data found." />;
  }

  if (isParentResponse) {
    const parentData = data as ParentPortalResponse;
    const children = parentData.children ?? [];

    if (children.length === 0) {
      return <EmptyState message="No linked children found for this parent account." />;
    }

    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Parent Portal</h2>
            <p className="text-sm text-slate-500">
              View your children’s timetable, weighted averages, grades, and attendance.
            </p>
          </div>

          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as GradePeriod)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            >
              {PERIOD_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {summaryError ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {summaryError}
          </div>
        ) : null}

        {children.map((child) => {
          const schedule = child.class?.schedules ?? [];
          const grades = child.grades ?? [];
          const attendances = child.attendances ?? [];
          const fullName =
            `${child.user?.firstName ?? ""} ${child.user?.lastName ?? ""}`.trim() ||
            "Student";

          const summary = child.id ? childSummaries[child.id] ?? null : null;

          const targetStudentId = child.id ?? summary?.student.id ?? "";

          return (
            <section key={child.id ?? fullName} className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{fullName}</h3>
                    <p className="text-sm text-slate-500">
                      {child.class?.name ?? "No class assigned"}
                    </p>
                  </div>

                  {targetStudentId ? (
  <button
    onClick={() => handleExportBulletin(targetStudentId)}
    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
  >
    Export Bulletin PDF
  </button>
) : null}
                </div>
              </div>

              <SummaryCards summary={summary} attendances={attendances} />

              <div className="grid gap-6 xl:grid-cols-2">
                <SubjectAverageSection summary={summary} loading={summaryLoading} />
                <TimetableSection schedule={schedule} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <GradesSection grades={grades} period={period} />
                <AttendanceSection attendances={attendances} />
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const studentData = data as StudentPortalShape;
  const schedule = studentData.class?.schedules ?? [];
  const grades = studentData.grades ?? [];
  const attendances = studentData.attendances ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Portal</h2>
          <p className="text-sm text-slate-500">
            Your weighted academic summary, timetable, grades, and absences.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as GradePeriod)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            >
              {PERIOD_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {studentData.id ? (
            <button
              onClick={() => handleExportBulletin(studentData.id!)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Export Bulletin PDF
            </button>
          ) : null}
        </div>
      </header>

      {summaryError ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {summaryError}
        </div>
      ) : null}

      <SummaryCards summary={studentSummary} attendances={attendances} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SubjectAverageSection summary={studentSummary} loading={summaryLoading} />
        <TimetableSection schedule={schedule} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GradesSection grades={grades} period={period} />
        <AttendanceSection attendances={attendances} title="Absences" />
      </div>
    </div>
  );
}