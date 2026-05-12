import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiGet, apiPost } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../components/common/ToastProvider";

type ClassOption = {
  id: string;
  name: string;
  academicYear?: string;
};

type SubjectOption = {
  id: string;
  name: string;
  coefficient?: number;
};

type GradeRow = {
  id: string;
  examType: string;
  period?: "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";
  score: number;
  comments?: string | null;
};

type StudentRow = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  grades?: GradeRow[];
};

type TeacherScheduleRow = {
  id: string;
  class?: {
    id: string;
    name: string;
    academicYear?: string;
  };
  subject?: {
    id: string;
    name: string;
    coefficient?: number;
  };
};

type TeacherOverviewResponse = {
  schedules: TeacherScheduleRow[];
};

type GradesPageProps = {
  apiBaseUrl: string;
  token: string;
};

type GradeFormRow = {
  score: string;
  comments: string;
};

type GradePayload = {
  studentId: string;
  subjectId: string;
  examType: string;
  period: GradePeriod;
  score: number;
  comments: string;
};

type BulletinNotifyPayload = {
  period: GradePeriod;
};

type GradePeriod = "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";

const DEFAULT_EXAM_TYPE = "فرض مراقبة عدد 1";
const DEFAULT_PERIOD: GradePeriod = "TRIMESTER_1";

const PERIOD_OPTIONS: { value: GradePeriod; label: string }[] = [
  { value: "TRIMESTER_1", label: "الثلاثي الأول" },
  { value: "TRIMESTER_2", label: "الثلاثي الثاني" },
  { value: "TRIMESTER_3", label: "الثلاثي الثالث" },
];

const EXAM_TYPE_OPTIONS = [
  "فرض مراقبة عدد 1",
  "فرض مراقبة عدد 2",
  "فرض تأليفي",
  "شفوي",
  "أعمال تطبيقية",
  "مشروع",
];

async function notifyBulletin(
  apiBaseUrl: string,
  token: string,
  studentId: string,
  period: GradePeriod
) {
  return apiPost<{ message: string }, BulletinNotifyPayload>(
    `${apiBaseUrl}/api/notify-bulletin/${studentId}`,
    token,
    { period }
  );
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("class") && normalized.includes("subject")) {
    return "يرجى اختيار القسم والمادة.";
  }

  if (normalized.includes("exam type")) {
    return "نوع الامتحان مطلوب.";
  }

  if (normalized.includes("score")) {
    return "يجب أن تكون الأعداد بين 0 و20.";
  }

  if (normalized.includes("bulletin")) {
    return "تعذر إرسال إشعار بطاقة الأعداد.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function getPeriodLabel(period: GradePeriod) {
  return PERIOD_OPTIONS.find((item) => item.value === period)?.label ?? period;
}

export default function GradesPage({ apiBaseUrl, token }: GradesPageProps) {
  const { showToast } = useToast();

  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";
  const isTeacher = role === "TEACHER";

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherScheduleRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [examType, setExamType] = useState(DEFAULT_EXAM_TYPE);
  const [period, setPeriod] = useState<GradePeriod>(DEFAULT_PERIOD);

  const [gradeMap, setGradeMap] = useState<Record<string, GradeFormRow>>({});

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifyingStudentId, setNotifyingStudentId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const teacherClasses = useMemo(() => {
    return uniqueById(
      teacherSchedules
        .map((item) => item.class)
        .filter(Boolean) as ClassOption[]
    );
  }, [teacherSchedules]);

  const teacherSubjects = useMemo(() => {
    const filteredSchedules = selectedClassId
      ? teacherSchedules.filter((item) => item.class?.id === selectedClassId)
      : teacherSchedules;

    return uniqueById(
      filteredSchedules
        .map((item) => item.subject)
        .filter(Boolean)
        .map((subject) => ({
          id: subject!.id,
          name: subject!.name,
          coefficient: subject!.coefficient,
        })) as SubjectOption[]
    );
  }, [teacherSchedules, selectedClassId]);

  const visibleClasses = isTeacher ? teacherClasses : classes;
  const visibleSubjects = isTeacher ? teacherSubjects : subjects;

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      setError("");

      if (isTeacher) {
        const teacherOverview = await apiGet<TeacherOverviewResponse>(
          `${apiBaseUrl}/api/my-teacher-overview`,
          token
        );

        const scheduleList = Array.isArray(teacherOverview?.schedules)
          ? teacherOverview.schedules
          : [];

        setTeacherSchedules(scheduleList);
        setClasses([]);
        setSubjects([]);
        return;
      }

      const [classesJson, subjectsJson] = await Promise.all([
        apiGet<ClassOption[]>(`${apiBaseUrl}/api/classes`, token),
        apiGet<SubjectOption[]>(`${apiBaseUrl}/api/subjects`, token),
      ]);

      setClasses(Array.isArray(classesJson) ? classesJson : []);
      setSubjects(Array.isArray(subjectsJson) ? subjectsJson : []);
      setTeacherSchedules([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      showToast(translated, "error");
    } finally {
      setLoadingLookups(false);
    }
  };

  const buildGradeMap = (
    studentList: StudentRow[],
    currentExamType: string
  ): Record<string, GradeFormRow> => {
    const nextMap: Record<string, GradeFormRow> = {};

    for (const student of studentList) {
      const matchedGrade = (student.grades ?? []).find(
        (grade) => grade.examType === currentExamType
      );

      nextMap[student.id] = {
        score:
          matchedGrade && typeof matchedGrade.score === "number"
            ? String(matchedGrade.score)
            : "",
        comments: matchedGrade?.comments ?? "",
      };
    }

    return nextMap;
  };

  const fetchGrades = async (
    classId: string,
    subjectId: string,
    currentPeriod: GradePeriod
  ) => {
    if (!classId || !subjectId) return;

    try {
      setLoadingGrades(true);
      setError("");
      setSuccessMessage("");

      const json = await apiGet<StudentRow[]>(
        `${apiBaseUrl}/api/grades/${classId}/${subjectId}?period=${currentPeriod}`,
        token
      );

      const studentList = Array.isArray(json) ? json : [];
      setStudents(studentList);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      setStudents([]);
      setGradeMap({});
      showToast(translated, "error");
    } finally {
      setLoadingGrades(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    if (visibleClasses.length === 0) return;

    const classStillValid = visibleClasses.some(
      (item) => item.id === selectedClassId
    );

    if (!selectedClassId || !classStillValid) {
      setSelectedClassId(visibleClasses[0].id);
    }
  }, [visibleClasses, selectedClassId]);

  useEffect(() => {
    if (visibleSubjects.length === 0) {
      setSelectedSubjectId("");
      return;
    }

    const subjectStillValid = visibleSubjects.some(
      (item) => item.id === selectedSubjectId
    );

    if (!selectedSubjectId || !subjectStillValid) {
      setSelectedSubjectId(visibleSubjects[0].id);
    }
  }, [visibleSubjects, selectedSubjectId]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      fetchGrades(selectedClassId, selectedSubjectId, period);
    }
  }, [selectedClassId, selectedSubjectId, period]);

  useEffect(() => {
    setGradeMap(buildGradeMap(students, examType));
  }, [students, examType]);

  const selectedSubject = useMemo(
    () => visibleSubjects.find((item) => item.id === selectedSubjectId) ?? null,
    [visibleSubjects, selectedSubjectId]
  );

  const handleReloadGrades = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      const message = "يرجى اختيار القسم والمادة أولًا.";
      setError(message);
      showToast(message, "error");
      return;
    }

    await fetchGrades(selectedClassId, selectedSubjectId, period);
  };

  const handleRowChange = (
    studentId: string,
    field: "score" | "comments",
    value: string
  ) => {
    setGradeMap((prev) => ({
      ...prev,
      [studentId]: {
        score: prev[studentId]?.score ?? "",
        comments: prev[studentId]?.comments ?? "",
        [field]: value,
      },
    }));
  };

  const validateRows = () => {
    if (!examType.trim()) {
      const message = "نوع الامتحان مطلوب.";
      setError(message);
      showToast(message, "error");
      return false;
    }

    for (const student of students) {
      const row = gradeMap[student.id];
      const scoreText = row?.score?.trim() ?? "";

      if (!scoreText) continue;

      const numericScore = Number(scoreText);

      if (Number.isNaN(numericScore)) {
        const studentName =
          `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim() ||
          "تلميذ";

        const message = `العدد غير صالح للتلميذ ${studentName}.`;
        setError(message);
        showToast("يوجد عدد أو أكثر غير صالح.", "error");
        return false;
      }

      if (numericScore < 0 || numericScore > 20) {
        const message = "يجب أن تكون الأعداد بين 0 و20.";
        setError(message);
        showToast(message, "error");
        return false;
      }
    }

    return true;
  };

  const handleSaveAll = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      const message = "يرجى اختيار القسم والمادة.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!validateRows()) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const filledRows = students.filter((student) => {
        const value = gradeMap[student.id]?.score?.trim() ?? "";
        return value !== "";
      });

      if (filledRows.length === 0) {
        const message = "يرجى إدخال عدد واحد على الأقل قبل الحفظ.";
        setError(message);
        showToast(message, "error");
        return;
      }

      await Promise.all(
        filledRows.map((student) => {
          const row = gradeMap[student.id];

          return apiPost<{ message: string }, GradePayload>(
            `${apiBaseUrl}/api/grades`,
            token,
            {
              studentId: student.id,
              subjectId: selectedSubjectId,
              examType: examType.trim(),
              period,
              score: Number(row.score),
              comments: row.comments.trim(),
            }
          );
        })
      );

      const message = "تم حفظ الأعداد بنجاح.";
      setSuccessMessage(message);
      showToast(message, "success");
      await fetchGrades(selectedClassId, selectedSubjectId, period);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      const translated = translateError(message);
      setError(translated);
      setSuccessMessage("");
      showToast(translated, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleNotifyBulletin = async (studentId: string) => {
    try {
      setNotifyingStudentId(studentId);
      setError("");
      setSuccessMessage("");

      await notifyBulletin(apiBaseUrl, token, studentId, period);

      const message = "تم إرسال إشعار بطاقة الأعداد بنجاح.";
      setSuccessMessage(message);
      showToast(message, "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر إرسال إشعار بطاقة الأعداد.";
      const translated = translateError(message);
      setError(translated);
      setSuccessMessage("");
      showToast(translated, "error");
    } finally {
      setNotifyingStudentId(null);
    }
  };

  const rows = useMemo(() => {
    return students.map((student) => {
      const fullName =
        `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim() ||
        "تلميذ غير معروف";

      return {
        studentId: student.id,
        fullName,
        email: student.user?.email ?? "",
        score: gradeMap[student.id]?.score ?? "",
        comments: gradeMap[student.id]?.comments ?? "",
      };
    });
  }, [students, gradeMap]);

  const filteredRows = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      if (!value) return true;

      return (
        row.fullName.toLowerCase().includes(value) ||
        row.email.toLowerCase().includes(value)
      );
    });
  }, [rows, searchTerm]);

  const summary = useMemo(() => {
    const enteredScores = rows
      .map((row) => row.score.trim())
      .filter((value) => value !== "")
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));

    const totalStudents = rows.length;
    const enteredCount = enteredScores.length;
    const average =
      enteredCount > 0
        ? enteredScores.reduce((sum, value) => sum + value, 0) / enteredCount
        : null;
    const highest = enteredCount > 0 ? Math.max(...enteredScores) : null;

    return {
      totalStudents,
      enteredCount,
      average,
      highest,
    };
  }, [rows]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header>
        <h2 className="text-2xl font-bold">
          {isTeacher ? "أعدادي" : "الأعداد"}
        </h2>
        <p className="text-sm text-slate-500">
          {isTeacher
            ? "اختر أحد أقسامك وموادك ثم أدخل أعداد التلاميذ."
            : "اختر القسم والمادة والثلاثي ونوع الامتحان ثم أدخل أعداد كل تلميذ."}
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">القسم</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              disabled={loadingLookups}
            >
              <option value="">اختر قسمًا</option>
              {visibleClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.academicYear ? ` (${item.academicYear})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">المادة</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              disabled={loadingLookups}
            >
              <option value="">اختر مادة</option>
              {visibleSubjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {typeof item.coefficient === "number"
                    ? ` (المعامل ${item.coefficient})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">الثلاثي</label>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">نوع الامتحان</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            >
              {EXAM_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              onClick={handleReloadGrades}
              className="w-full rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              تحميل الأعداد
            </button>
          </div>
        </div>

        {selectedSubject ? (
          <p className="mt-4 text-sm text-slate-500">
            معامل المادة الحالي: {selectedSubject.coefficient ?? 1}
          </p>
        ) : null}

        {error ? (
          <div className="mt-4">
            <ErrorState message={error} />
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}
      </section>

      {!loadingGrades && rows.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">عدد التلاميذ</p>
            <p className="mt-2 text-2xl font-bold">{summary.totalStudents}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">الأعداد المدخلة</p>
            <p className="mt-2 text-2xl font-bold">{summary.enteredCount}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">المعدل الحالي</p>
            <p className="mt-2 text-2xl font-bold">
              {summary.average !== null ? summary.average.toFixed(2) : "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">أعلى عدد</p>
            <p className="mt-2 text-2xl font-bold">
              {summary.highest !== null ? summary.highest.toFixed(2) : "-"}
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">ورقة الأعداد</h3>
            <p className="text-sm text-slate-500">
              {getPeriodLabel(period)} • {examType.trim() || "لم يتم اختيار نوع الامتحان"}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              placeholder="البحث عن تلميذ بالاسم أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />

            <button
              onClick={handleSaveAll}
              disabled={saving || rows.length === 0}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الأعداد"}
            </button>
          </div>
        </div>

        {loadingLookups ? (
          <LoadingState message="جارٍ تحميل الأقسام والمواد..." />
        ) : loadingGrades ? (
          <LoadingState message="جارٍ تحميل ورقة الأعداد..." />
        ) : !selectedClassId || !selectedSubjectId ? (
          <EmptyState message="يرجى اختيار القسم والمادة." />
        ) : filteredRows.length === 0 ? (
          <EmptyState message="لا يوجد تلاميذ مطابقون للبحث الحالي." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-right text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">التلميذ</th>
                  <th className="px-3 py-3 font-medium">البريد الإلكتروني</th>
                  <th className="px-3 py-3 font-medium">العدد / 20</th>
                  <th className="px-3 py-3 font-medium">الملاحظات</th>
                  <th className="px-3 py-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.studentId} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{row.fullName}</td>

                    <td className="px-3 py-3 text-left text-sm text-slate-600" dir="ltr">
                      {row.email || "-"}
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        dir="ltr"
                        value={row.score}
                        onChange={(e) =>
                          handleRowChange(row.studentId, "score", e.target.value)
                        }
                        placeholder="15.5"
                        className="w-32 rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={row.comments}
                        onChange={(e) =>
                          handleRowChange(row.studentId, "comments", e.target.value)
                        }
                        placeholder="ملاحظة اختيارية"
                        className="w-full min-w-[220px] rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                      />
                    </td>

                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleNotifyBulletin(row.studentId)}
                        disabled={notifyingStudentId === row.studentId}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {notifyingStudentId === row.studentId
                          ? "جارٍ الإرسال..."
                          : "إشعار بطاقة الأعداد"}
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