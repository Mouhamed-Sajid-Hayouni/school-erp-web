import { useEffect, useMemo, useState } from "react";
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
  score: number;
  comments: string;
};

const DEFAULT_EXAM_TYPE = "Devoir de Contrôle N°1";

export default function GradesPage({ apiBaseUrl, token }: GradesPageProps) {
  const { showToast } = useToast();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [examType, setExamType] = useState(DEFAULT_EXAM_TYPE);

  const [gradeMap, setGradeMap] = useState<Record<string, GradeFormRow>>({});

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLookups = async () => {
    try {
      setLoadingLookups(true);
      setError("");

      const [classesJson, subjectsJson] = await Promise.all([
        apiGet<ClassOption[]>(`${apiBaseUrl}/api/classes`, token),
        apiGet<SubjectOption[]>(`${apiBaseUrl}/api/subjects`, token),
      ]);

      const classList = Array.isArray(classesJson) ? classesJson : [];
      const subjectList = Array.isArray(subjectsJson) ? subjectsJson : [];

      setClasses(classList);
      setSubjects(subjectList);

      if (!selectedClassId && classList.length > 0) {
        setSelectedClassId(classList[0].id);
      }

      if (!selectedSubjectId && subjectList.length > 0) {
        setSelectedSubjectId(subjectList[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoadingLookups(false);
    }
  };

  const buildGradeMap = (studentList: StudentRow[], currentExamType: string) => {
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
    currentExamType: string
  ) => {
    if (!classId || !subjectId) return;

    try {
      setLoadingGrades(true);
      setError("");
      setSuccessMessage("");

      const json = await apiGet<StudentRow[]>(
        `${apiBaseUrl}/api/grades/${classId}/${subjectId}`,
        token
      );

      const studentList = Array.isArray(json) ? json : [];
      setStudents(studentList);
      setGradeMap(buildGradeMap(studentList, currentExamType));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setStudents([]);
      setGradeMap({});
      showToast(message, "error");
    } finally {
      setLoadingGrades(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      fetchGrades(selectedClassId, selectedSubjectId, examType);
    }
  }, [selectedClassId, selectedSubjectId]);

  const selectedSubject = useMemo(
    () => subjects.find((item) => item.id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId]
  );

  const handleExamTypeLoad = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setError("Please select a class and subject first.");
      showToast("Please select a class and subject first.", "error");
      return;
    }

    await fetchGrades(selectedClassId, selectedSubjectId, examType);
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
      setError("Exam type is required.");
      showToast("Exam type is required.", "error");
      return false;
    }

    for (const student of students) {
      const row = gradeMap[student.id];
      const scoreText = row?.score?.trim() ?? "";

      if (!scoreText) continue;

      const numericScore = Number(scoreText);

      if (Number.isNaN(numericScore)) {
        setError(
          `Invalid score for ${
            `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim() ||
            "student"
          }.`
        );
        showToast("One or more scores are invalid.", "error");
        return false;
      }

      if (numericScore < 0 || numericScore > 20) {
        setError("Scores must be between 0 and 20.");
        showToast("Scores must be between 0 and 20.", "error");
        return false;
      }
    }

    return true;
  };

  const handleSaveAll = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setError("Please select a class and subject.");
      showToast("Please select a class and subject.", "error");
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
        setError("Enter at least one score before saving.");
        showToast("Enter at least one score before saving.", "error");
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
              score: Number(row.score),
              comments: row.comments.trim(),
            }
          );
        })
      );

      setSuccessMessage("Grades saved successfully.");
      showToast("Grades saved successfully.", "success");
      await fetchGrades(selectedClassId, selectedSubjectId, examType);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setSuccessMessage("");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => {
    return students.map((student) => {
      const fullName =
        `${student.user?.firstName ?? ""} ${student.user?.lastName ?? ""}`.trim() ||
        "Unknown Student";

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

  const numericScores = useMemo(() => {
    return rows
      .map((row) => Number(row.score))
      .filter((score) => !Number.isNaN(score) && rowScoreIsFilled(score))
      .map((score) => Number(score));

    function rowScoreIsFilled(score: number) {
      return Number.isFinite(score);
    }
  }, [rows]);

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
    const highest =
      enteredCount > 0 ? Math.max(...enteredScores) : null;

    return {
      totalStudents,
      enteredCount,
      average,
      highest,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Grades</h2>
        <p className="text-sm text-slate-500">
          Select a class, subject, and exam type, then enter grades for each student.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              disabled={loadingLookups}
            >
              <option value="">Select a class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.academicYear ? ` (${item.academicYear})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              disabled={loadingLookups}
            >
              <option value="">Select a subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {typeof item.coefficient === "number"
                    ? ` (coef. ${item.coefficient})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Exam Type</label>
            <input
              type="text"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              placeholder="e.g. Devoir de Contrôle N°1"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              onClick={handleExamTypeLoad}
              className="w-full rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Load Grades
            </button>
          </div>
        </div>

        {selectedSubject ? (
          <p className="mt-4 text-sm text-slate-500">
            Current subject coefficient: {selectedSubject.coefficient ?? 1}
          </p>
        ) : null}

        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}

        {successMessage ? (
          <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}
      </section>

      {!loadingGrades && rows.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Students</p>
            <p className="mt-2 text-2xl font-bold">{summary.totalStudents}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Grades Entered</p>
            <p className="mt-2 text-2xl font-bold">{summary.enteredCount}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Current Average</p>
            <p className="mt-2 text-2xl font-bold">
              {summary.average !== null ? summary.average.toFixed(2) : "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Highest Score</p>
            <p className="mt-2 text-2xl font-bold">
              {summary.highest !== null ? summary.highest.toFixed(2) : "-"}
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Grade Sheet</h3>
            <p className="text-sm text-slate-500">
              {examType.trim() || "No exam type selected"}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              placeholder="Search student by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />

            <button
              onClick={handleSaveAll}
              disabled={saving || rows.length === 0}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Grades"}
            </button>
          </div>
        </div>

        {loadingLookups ? (
          <LoadingState message="Loading classes and subjects..." />
        ) : loadingGrades ? (
          <LoadingState message="Loading grade sheet..." />
        ) : !selectedClassId || !selectedSubjectId ? (
          <EmptyState message="Please select a class and subject." />
        ) : filteredRows.length === 0 ? (
          <EmptyState message="No students found for the current search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">Student</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Score / 20</th>
                  <th className="px-3 py-3 font-medium">Comments</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.studentId} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{row.fullName}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {row.email || "-"}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        value={row.score}
                        onChange={(e) =>
                          handleRowChange(row.studentId, "score", e.target.value)
                        }
                        placeholder="e.g. 15.5"
                        className="w-32 rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        value={row.comments}
                        onChange={(e) =>
                          handleRowChange(row.studentId, "comments", e.target.value)
                        }
                        placeholder="Optional comment"
                        className="w-full min-w-[220px] rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                      />
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