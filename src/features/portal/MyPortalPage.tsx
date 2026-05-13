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
import AssignmentsSection from "./AssignmentsSection";
import AnnouncementsSection from "./AnnouncementsSection";
import NotificationsSection from "./NotificationsSection";

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
  subjectId?: string;
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
    id?: string;
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

type PortalResponse = ParentPortalResponse;

type MyPortalPageProps = {
  apiBaseUrl: string;
  token: string;
};

const PERIOD_OPTIONS: { value: GradePeriod; label: string }[] = [
  { value: "TRIMESTER_1", label: "الثلاثي الأول" },
  { value: "TRIMESTER_2", label: "الثلاثي الثاني" },
  { value: "TRIMESTER_3", label: "الثلاثي الثالث" },
];

function isParentPortalResponse(data: unknown): data is ParentPortalResponse {
  return !!data && Array.isArray((data as ParentPortalResponse).children);
}

function translateDay(value?: string) {
  if (!value) return "";

  const normalized = value.toLowerCase();

  if (normalized === "monday" || normalized === "lundi") return "الإثنين";
  if (normalized === "tuesday" || normalized === "mardi") return "الثلاثاء";
  if (normalized === "wednesday" || normalized === "mercredi") return "الأربعاء";
  if (normalized === "thursday" || normalized === "jeudi") return "الخميس";
  if (normalized === "friday" || normalized === "vendredi") return "الجمعة";
  if (normalized === "saturday" || normalized === "samedi") return "السبت";
  if (normalized === "sunday" || normalized === "dimanche") return "الأحد";

  return value;
}

function translateAttendanceStatus(status: string) {
  if (status === "PRESENT") return "حاضر";
  if (status === "ABSENT") return "غائب";
  if (status === "LATE") return "متأخر";

  return status;
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("student data")) {
    return "بيانات التلميذ غير متوفرة لتصدير بطاقة الأعداد.";
  }

  if (normalized.includes("bulletin")) {
    return "بيانات بطاقة الأعداد غير مكتملة.";
  }

  if (normalized.includes("export")) {
    return "تعذر تصدير بطاقة الأعداد بصيغة PDF.";
  }

  if (normalized.includes("portal")) {
    return "تعذر تحميل فضاء الولي.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-TN");
}

function buildStudentBulletinFromPortal(
  student: StudentPortalShape,
  period: GradePeriod
): StudentBulletinResponse | null {
  if (!student.id || !student.user) {
    return null;
  }

  const grades = (student.grades ?? []).filter(
    (grade) => (grade.period ?? "TRIMESTER_1") === period
  );
  const attendances = student.attendances ?? [];

  const groups = new Map<
    string,
    {
      subjectId: string;
      subjectName: string;
      coefficient: number;
      scores: number[];
    }
  >();

  for (const grade of grades) {
    const subjectId =
      grade.subjectId ??
      `${grade.subject?.name ?? "مادة غير معروفة"}-${grade.id}`;

    const subjectName = grade.subject?.name ?? "مادة غير معروفة";
    const coefficient = grade.subject?.coefficient ?? 1;

    const existing = groups.get(subjectId);

    if (existing) {
      existing.scores.push(grade.score);
    } else {
      groups.set(subjectId, {
        subjectId,
        subjectName,
        coefficient,
        scores: [grade.score],
      });
    }
  }

  const subjects = Array.from(groups.values()).map((item) => {
    const average =
      item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length;

    return {
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      coefficient: item.coefficient,
      gradesCount: item.scores.length,
      average,
    };
  });

  const coefficientSum = subjects.reduce(
    (sum, subject) => sum + subject.coefficient,
    0
  );

  const weightedSum = subjects.reduce(
    (sum, subject) => sum + subject.average * subject.coefficient,
    0
  );

  const generalAverage =
    coefficientSum > 0 ? weightedSum / coefficientSum : null;

  const bestScore =
    grades.length > 0 ? Math.max(...grades.map((grade) => grade.score)) : null;

  const absencesCount = attendances.filter(
    (attendance) => attendance.status === "ABSENT"
  ).length;

  return {
    student: {
      id: student.id,
      firstName: student.user.firstName ?? "",
      lastName: student.user.lastName ?? "",
      email: student.user.email ?? "",
    },
    class: student.class
      ? {
          id: student.class.id ?? "",
          name: student.class.name ?? "",
          academicYear: student.class.academicYear ?? "",
        }
      : null,
    period,
    gradesCount: grades.length,
    bestScore,
    generalAverage,
    coefficientSum,
    absencesCount,
    subjects: subjects.sort((a, b) => b.average - a.average),
  };
}

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
      label: "المعدل العام الموزون",
      value:
        summary?.generalAverage !== null && summary?.generalAverage !== undefined
          ? summary.generalAverage.toFixed(2)
          : "-",
    },
    {
      label: "أفضل عدد",
      value:
        summary?.bestScore !== null && summary?.bestScore !== undefined
          ? `${summary.bestScore.toFixed(2)}/20`
          : "-",
    },
    {
      label: "عدد الأعداد",
      value: String(summary?.gradesCount ?? 0),
    },
    {
      label: "مجموع الغيابات",
      value: String(absences),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-white p-5 text-right shadow-sm" dir="rtl">
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
    <div className="rounded-2xl bg-white p-6 text-right shadow-sm" dir="rtl">
      <h3 className="mb-4 text-lg font-semibold">معدلات المواد</h3>

      {loading ? (
        <LoadingState message="جارٍ تحميل الملخص الأكاديمي الموزون..." />
      ) : !summary || summary.subjects.length === 0 ? (
        <p className="text-sm text-slate-500">
          لا توجد معدلات مواد متوفرة لهذا الثلاثي.
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
                المعامل {item.coefficient} • اعتمادًا على {item.gradesCount} عدد
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
    <div className="rounded-2xl bg-white p-6 text-right shadow-sm" dir="rtl">
      <h3 className="mb-4 text-lg font-semibold">جدول الأوقات الأسبوعي</h3>

      <div className="space-y-3">
        {schedule.length === 0 ? (
          <p className="text-sm text-slate-500">لا يوجد جدول أوقات متوفر.</p>
        ) : (
          schedule.map((item) => (
            <div key={item.id} className="rounded-xl border p-3">
              <p className="font-medium">{item.subject?.name ?? "مادة"}</p>
              <p className="text-sm text-slate-500">
                {translateDay(item.dayOfWeek)} •{" "}
                <span dir="ltr">{item.startTime} - {item.endTime}</span>
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
    <div className="rounded-2xl bg-white p-6 text-right shadow-sm" dir="rtl">
      <h3 className="mb-4 text-lg font-semibold">الأعداد</h3>

      <div className="space-y-3">
        {filteredGrades.length === 0 ? (
          <p className="text-sm text-slate-500">
            لا توجد أعداد متوفرة لهذا الثلاثي.
          </p>
        ) : (
          filteredGrades.map((grade) => (
            <div key={grade.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">{grade.subject?.name ?? "مادة"}</p>
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
  title = "الغيابات / الحضور",
}: {
  attendances: PortalAttendance[];
  title?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 text-right shadow-sm" dir="rtl">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>

      <div className="space-y-3">
        {attendances.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد سجلات حضور وغياب.</p>
        ) : (
          attendances.map((attendance) => (
            <div key={attendance.id} className="rounded-xl border p-3">
              <p className="font-medium">
                {attendance.schedule?.subject?.name ?? "مادة"}
              </p>
              <p className="text-sm text-slate-500">
                {formatDate(attendance.date)} • {translateAttendanceStatus(attendance.status)}
              </p>
              {attendance.remarks ? (
                <p className="mt-2 text-sm text-slate-600">{attendance.remarks}</p>
              ) : null}
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
  const [summaryError, setSummaryError] = useState("");

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
        const message = err instanceof Error ? err.message : "تعذر تحميل فضاء الولي.";
        setPortalError(translateError(message));
      } finally {
        setLoading(false);
      }
    };

    fetchPortal();
  }, [apiBaseUrl, token]);

  const isParentResponse = isParentPortalResponse(data);


  const childSummaries = useMemo(() => {
    if (!data || !isParentResponse) return {};

    const parentData = data as ParentPortalResponse;
    const children = parentData.children ?? [];

    return children.reduce<Record<string, StudentBulletinResponse>>((acc, child) => {
      if (!child.id) return acc;

      const summary = buildStudentBulletinFromPortal(child, period);
      if (summary) {
        acc[child.id] = summary;
      }

      return acc;
    }, {});
  }, [data, isParentResponse, period]);

  useEffect(() => {
    setSummaryError("");
  }, [period, data]);

  const handleExportBulletin = async (studentId: string) => {
    try {
      setSummaryError("");

      let targetStudent: StudentPortalShape | null = null;

      const parentData = data as ParentPortalResponse;
      targetStudent =
        (parentData.children ?? []).find((child) => child.id === studentId) ?? null;

      if (!targetStudent) {
        throw new Error("Student data not available for bulletin export.");
      }

      const bulletin = buildStudentBulletinFromPortal(targetStudent, period);

      if (!bulletin) {
        throw new Error("Bulletin data is incomplete.");
      }

      await exportBulletinPdf(bulletin);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر تصدير بطاقة الأعداد بصيغة PDF.";
      setSummaryError(translateError(message));
    }
  };

  if (loading) {
    return <LoadingState message="جارٍ تحميل فضاء الولي..." />;
  }

  if (portalError) {
    return <ErrorState message={portalError} />;
  }

  if (!data) {
    return <EmptyState message="لا توجد بيانات لفضاء الولي." />;
  }

  if (!isParentResponse) {
    return (
      <ErrorState message="هذا الفضاء مخصص للأولياء فقط. الرجاء استعمال حساب الولي." />
    );
  }

  const parentData = data as ParentPortalResponse;
  const children = parentData.children ?? [];

  if (children.length === 0) {
    return <EmptyState message="لا يوجد أبناء مرتبطون بحساب هذا الولي." />;
  }

  return (
      <div className="space-y-6 text-right" dir="rtl">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">فضاء الولي</h2>
            <p className="text-sm text-slate-500">
              متابعة جدول الأوقات والمعدلات الموزونة والأعداد والحضور والغياب للأبناء.
            </p>
          </div>

          <div className="w-full md:w-56">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              الثلاثي
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
            "تلميذ";

          const summary = child.id ? childSummaries[child.id] ?? null : null;
          const targetStudentId = child.id ?? "";

          return (
            <section key={child.id ?? fullName} className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{fullName}</h3>
                    <p className="text-sm text-slate-500">
                      {child.class?.name ?? "لا يوجد قسم مسند"}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (!targetStudentId) return;
                      handleExportBulletin(targetStudentId);
                    }}
                    disabled={!targetStudentId}
                    className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
                      targetStudentId
                        ? "bg-slate-900 hover:bg-slate-800"
                        : "cursor-not-allowed bg-slate-300"
                    }`}
                  >
                    تصدير بطاقة الأعداد PDF
                  </button>
                </div>

                {!targetStudentId ? (
                  <p className="mt-3 text-xs text-amber-600">
                    لم يتم تحديد معرّف التلميذ بعد لتصدير PDF.
                  </p>
                ) : null}
              </div>

              <SummaryCards summary={summary} attendances={attendances} />

              <div className="grid gap-6 xl:grid-cols-2">
                <SubjectAverageSection summary={summary} loading={false} />
                <TimetableSection schedule={schedule} />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <GradesSection grades={grades} period={period} />
                <AttendanceSection attendances={attendances} />
              </div>
            </section>
          );
        })}

        <AssignmentsSection apiBaseUrl={apiBaseUrl} token={token} />
        <AnnouncementsSection apiBaseUrl={apiBaseUrl} token={token} />
        <NotificationsSection apiBaseUrl={apiBaseUrl} token={token} />
      </div>
    );
  }