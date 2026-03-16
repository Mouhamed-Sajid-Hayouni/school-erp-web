import { useEffect, useState } from "react";

type PortalSchedule = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject?: { name: string };
  class?: { name: string };
  teacher?: {
    user?: {
      firstName: string;
      lastName: string;
    };
  };
};

type PortalGrade = {
  id: string;
  examType: string;
  score: number;
  comments?: string | null;
  subject?: {
    name: string;
    coefficient?: number;
  };
  createdAt?: string;
};

type PortalAbsence = {
  id: string;
  date: string;
  status: string;
  schedule?: {
    subject?: { name: string };
  };
};

type PortalData = {
  schedule: PortalSchedule[];
  grades: PortalGrade[];
  absences: PortalAbsence[];
};

type MyPortalPageProps = {
  apiBaseUrl: string;
  token: string;
};

export default function MyPortalPage({ apiBaseUrl, token }: MyPortalPageProps) {
  const [data, setData] = useState<PortalData>({
    schedule: [],
    grades: [],
    absences: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPortal = async () => {
      try {
        setLoading(true);
        setError("");

        console.log("Fetching:", `${apiBaseUrl}/api/my-portal`);

        const response = await fetch(`${apiBaseUrl}/api/my-portal`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load portal data.");
        }

        const json = await response.json();
        setData({
          schedule: json.schedule ?? [],
          grades: json.grades ?? [],
          absences: json.absences ?? [],
        });
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
    return <div className="rounded-2xl bg-white p-6 shadow-sm">Loading portal...</div>;
  }

  if (error) {
    return <div className="rounded-2xl bg-red-50 p-6 text-red-700 shadow-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">My Portal</h2>
        <p className="text-sm text-slate-500">Your timetable, grades, and absences.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold">Weekly Timetable</h3>
          <div className="space-y-3">
            {data.schedule.length === 0 ? (
              <p className="text-sm text-slate-500">No timetable available.</p>
            ) : (
              data.schedule.map((item) => (
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

        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold">Grades</h3>
          <div className="space-y-3">
            {data.grades.length === 0 ? (
              <p className="text-sm text-slate-500">No grades available.</p>
            ) : (
              data.grades.map((grade) => (
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

        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold">Absences</h3>
          <div className="space-y-3">
            {data.absences.length === 0 ? (
              <p className="text-sm text-slate-500">No absences recorded.</p>
            ) : (
              data.absences.map((absence) => (
                <div key={absence.id} className="rounded-xl border p-3">
                  <p className="font-medium">{absence.schedule?.subject?.name ?? "Subject"}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(absence.date).toLocaleDateString()} • {absence.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}