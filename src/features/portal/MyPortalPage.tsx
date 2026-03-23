import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";

type PortalSchedule = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject?: { name: string; coefficient?: number };
};

type PortalGrade = {
  id: string;
  examType: string;
  score: number;
  comments?: string | null;
  subject?: { name: string; coefficient?: number };
  createdAt?: string;
};

type PortalAttendance = {
  id: string;
  date: string;
  status: string;
  remarks?: string | null;
  schedule?: {
    subject?: { name: string };
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
  };
};

type ParentChild = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
  class?: {
    name?: string;
    schedules?: PortalSchedule[];
  };
  grades?: PortalGrade[];
  attendances?: PortalAttendance[];
};

type ParentPortalResponse = {
  id: string;
  userId: string;
  children?: ParentChild[];
};

type StudentPortalResponse = {
  class?: {
    name?: string;
    schedules?: PortalSchedule[];
  };
  grades?: PortalGrade[];
  attendances?: PortalAttendance[];
};

type PortalResponse = ParentPortalResponse | StudentPortalResponse;

type MyPortalPageProps = {
  apiBaseUrl: string;
  token: string;
};

type SubjectAverage = {
  subjectName: string;
  average: number;
  count: number;
};

function computeSubjectAverages(grades: PortalGrade[]): SubjectAverage[] {
  const grouped = new Map<string, number[]>();

  for (const grade of grades) {
    const subjectName = grade.subject?.name ?? "Unknown Subject";
    const current = grouped.get(subjectName) ?? [];
    current.push(grade.score);
    grouped.set(subjectName, current);
  }

  return [...grouped.entries()]
    .map(([subjectName, scores]) => ({
      subjectName,
      average: scores.reduce((sum, value) => sum + value, 0) / scores.length,
      count: scores.length,
    }))
    .sort((a, b) => b.average - a.average);
}

function computeSummary(grades: PortalGrade[], attendances: PortalAttendance[]) {
  const scores = grades.map((grade) => grade.score);
  const average =
    scores.length > 0
      ? scores.reduce((sum, value) => sum + value, 0) / scores.length
      : null;

  const bestScore = scores.length > 0 ? Math.max(...scores) : null;
  const absences = attendances.filter((item) => item.status === "ABSENT").length;

  return {
    gradesCount: grades.length,
    average,
    bestScore,
    absences,
    subjectAverages: computeSubjectAverages(grades),
  };
}

function SummaryCards({
  grades,
  attendances,
}: {
  grades: PortalGrade[];
  attendances: PortalAttendance[];
}) {
  const summary = computeSummary(grades, attendances);

  const cards = [
    {
      label: "General Average",
      value: summary.average !== null ? summary.average.toFixed(2) : "-",
    },
    {
      label: "Best Score",
      value: summary.bestScore !== null ? `${summary.bestScore.toFixed(2)}/20` : "-",
    },
    {
      label: "Grades Count",
      value: String(summary.gradesCount),
    },
    {
      label: "Absences",
      value: String(summary.absences),
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

function SubjectAverageSection({ grades }: { grades: PortalGrade[] }) {
  const subjectAverages = useMemo(() => computeSubjectAverages(grades), [grades]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Subject Averages</h3>

      {subjectAverages.length === 0 ? (
        <p className="text-sm text-slate-500">No subject averages available yet.</p>
      ) : (
        <div className="space-y-3">
          {subjectAverages.map((item) => (
            <div key={item.subjectName} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">{item.subjectName}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                  {item.average.toFixed(2)}/20
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Based on {item.count} grade{item.count > 1 ? "s" : ""}
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

function GradesSection({ grades }: { grades: PortalGrade[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Grades</h3>
      <div className="space-y-3">
        {grades.length === 0 ? (
          <p className="text-sm text-slate-500">No grades available.</p>
        ) : (
          grades.map((grade) => (
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
                {new Date(attendance.date).toLocaleDateString()} • {attendance.status}
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
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPortal = async () => {
      try {
        setLoading(true);
        setError("");

        const json = await apiGet<PortalResponse>(
          `${apiBaseUrl}/api/my-portal`,
          token
        );

        setData(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortal();
  }, [apiBaseUrl, token]);

  if (loading) {
    return <LoadingState message="Loading portal..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState message="No portal data found." />;
  }

  const isParentResponse = Array.isArray((data as ParentPortalResponse).children);

  if (isParentResponse) {
    const parentData = data as ParentPortalResponse;
    const children = parentData.children ?? [];

    if (children.length === 0) {
      return <EmptyState message="No linked children found for this parent account." />;
    }

    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-bold">Parent Portal</h2>
          <p className="text-sm text-slate-500">
            View your children’s timetable, grades, and attendance summary.
          </p>
        </header>

        {children.map((child) => {
          const schedule = child.class?.schedules ?? [];
          const grades = child.grades ?? [];
          const attendances = child.attendances ?? [];
          const fullName =
            `${child.user?.firstName ?? ""} ${child.user?.lastName ?? ""}`.trim() ||
            "Student";

          return (
            <section key={child.id} className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold">{fullName}</h3>
                <p className="text-sm text-slate-500">
                  {child.class?.name ?? "No class assigned"}
                </p>
              </div>

              <SummaryCards grades={grades} attendances={attendances} />

              <div className="grid gap-6 xl:grid-cols-2">
                <SubjectAverageSection grades={grades} />
                <TimetableSection schedule={schedule} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <GradesSection grades={grades} />
                <AttendanceSection attendances={attendances} />
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const studentData = data as StudentPortalResponse;
  const schedule = studentData.class?.schedules ?? [];
  const grades = studentData.grades ?? [];
  const attendances = studentData.attendances ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">My Portal</h2>
        <p className="text-sm text-slate-500">
          Your timetable, grades, averages, and absences.
        </p>
      </header>

      <SummaryCards grades={grades} attendances={attendances} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SubjectAverageSection grades={grades} />
        <TimetableSection schedule={schedule} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GradesSection grades={grades} />
        <AttendanceSection attendances={attendances} title="Absences" />
      </div>
    </div>
  );
}