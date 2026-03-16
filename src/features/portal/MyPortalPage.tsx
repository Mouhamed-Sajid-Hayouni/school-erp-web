import { useEffect, useState } from "react";

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
  schedule?: PortalSchedule[];
  grades?: PortalGrade[];
  absences?: PortalAttendance[];
  attendances?: PortalAttendance[];
};

type PortalResponse = ParentPortalResponse | StudentPortalResponse;

type MyPortalPageProps = {
  apiBaseUrl: string;
  token: string;
};

export default function MyPortalPage({ apiBaseUrl, token }: MyPortalPageProps) {
  const [data, setData] = useState<PortalResponse | null>(null);
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

        const json = await response.json();

        console.log("my-portal status:", response.status);
        console.log("my-portal json:", json);

        if (!response.ok) {
          throw new Error(json?.message || "Failed to load portal data.");
        }

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
    return <div className="rounded-2xl bg-white p-6 shadow-sm">Loading portal...</div>;
  }

  if (error) {
    return <div className="rounded-2xl bg-red-50 p-6 text-red-700 shadow-sm">{error}</div>;
  }

  if (!data) {
    return <div className="rounded-2xl bg-white p-6 shadow-sm">No portal data found.</div>;
  }

  const isParentResponse = Array.isArray((data as ParentPortalResponse).children);

  if (isParentResponse) {
    const parentData = data as ParentPortalResponse;
    const children = parentData.children ?? [];

    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-bold">Parent Portal</h2>
          <p className="text-sm text-slate-500">
            View your children’s timetable, grades, and attendances.
          </p>
        </header>

        {children.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            No linked children found for this parent account.
          </div>
        ) : (
          children.map((child) => {
            const schedules = child.class?.schedules ?? [];
            const grades = child.grades ?? [];
            const attendances = child.attendances ?? [];
            const fullName = `${child.user?.firstName ?? ""} ${child.user?.lastName ?? ""}`.trim() || "Student";

            return (
              <section key={child.id} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-semibold">{fullName}</h3>
                  <p className="text-sm text-slate-500">
                    {child.class?.name ?? "No class assigned"}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <div>
                    <h4 className="mb-3 text-base font-semibold">Weekly Timetable</h4>
                    <div className="space-y-3">
                      {schedules.length === 0 ? (
                        <p className="text-sm text-slate-500">No timetable available.</p>
                      ) : (
                        schedules.map((item) => (
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

                  <div>
                    <h4 className="mb-3 text-base font-semibold">Grades</h4>
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

                  <div>
                    <h4 className="mb-3 text-base font-semibold">Attendances / Absences</h4>
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
                </div>
              </section>
            );
          })
        )}
      </div>
    );
  }

  const studentData = data as StudentPortalResponse;
  const schedule = studentData.schedule ?? [];
  const grades = studentData.grades ?? [];
  const absences = studentData.absences ?? studentData.attendances ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">My Portal</h2>
        <p className="text-sm text-slate-500">Your timetable, grades, and absences.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
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

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Absences</h3>
          <div className="space-y-3">
            {absences.length === 0 ? (
              <p className="text-sm text-slate-500">No absences recorded.</p>
            ) : (
              absences.map((absence) => (
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