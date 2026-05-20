import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { getVisibleStudentEmail } from "../../utils/studentEmail";

type ClassItem = {
  id: string;
  name: string;
  academicYear: string;
  _count?: {
    students: number;
  };
};

type SubjectItem = {
  id: string;
  name: string;
  coefficient: number;
};

type GradePeriod = "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";

type GradesReportRow = {
  studentId: string;
  studentName: string;
  email: string;
  gradesCount: number;
  average: number | null;
  bestScore: number | null;
  lowestScore: number | null;
};

type GradesReportResponse = {
  class: {
    id: string;
    name: string;
    academicYear: string;
  };
  subjectId: string | null;
  period: GradePeriod;
  rows: GradesReportRow[];
  summary: {
    students: number;
    gradedStudents: number;
    totalGrades: number;
    classAverage: number | null;
  };
};

type StudentOption = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type StudentReportSubject = {
  subjectId: string;
  subjectName: string;
  coefficient: number;
  gradesCount: number;
  average: number;
};

type StudentReportResponse = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  class: {
    id: string;
    name: string;
    academicYear: string;
  } | null;
  period: GradePeriod;
  gradesCount: number;
  bestScore: number | null;
  generalAverage: number | null;
  coefficientSum: number;
  absencesCount: number;
  subjects: StudentReportSubject[];
};

type ReportTab = "grades" | "student";

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

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function generatedAtLabel() {
  return new Date().toLocaleString("ar-TN");
}

export default function ReportsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [reportTab, setReportTab] = useState<ReportTab>("grades");const [loadingClasses, setLoadingClasses] = useState(false);const [gradeClassId, setGradeClassId] = useState("");
  const [gradeSubjectId, setGradeSubjectId] = useState("");
  const [gradePeriod, setGradePeriod] = useState<GradePeriod>("TRIMESTER_1");
  const [gradesReport, setGradesReport] =
    useState<GradesReportResponse | null>(null);
  const [loadingGradesReport, setLoadingGradesReport] = useState(false);

  const [studentClassId, setStudentClassId] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studentPeriod, setStudentPeriod] =
    useState<GradePeriod>("TRIMESTER_1");
  const [studentReport, setStudentReport] =
    useState<StudentReportResponse | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStudentReport, setLoadingStudentReport] = useState(false);

  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const selectedClass = useMemo(() => {
    return classes.find((item) => item.id === classId) || null;
  }, [classes, classId]);

  useEffect(() => {
    async function loadSchoolSettings() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/school`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          return;
        }

        const data: SchoolSettings = await res.json();

        setGradePeriod(data.defaultTrimester || "TRIMESTER_1");
        setStudentPeriod(data.defaultTrimester || "TRIMESTER_1");setTo(toDateInputValue(data.defaultReportTo));
      } catch {
        // Keep empty dates and TRIMESTER_1 fallback if settings cannot load.
      }
    }

    async function loadClasses() {
      setLoadingClasses(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE_URL}/api/classes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("تعذر تحميل الأقسام.");
        }

        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);

        if (Array.isArray(data) && data.length > 0) {
          setClassId(data[0].id);
          setGradeClassId(data[0].id);
          setStudentClassId(data[0].id);
        }
      } catch {
        setError("تعذر تحميل الأقسام.");
      } finally {
        setLoadingClasses(false);
      }
    }

    async function loadSubjects() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("تعذر تحميل المواد.");
        }

        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      } catch {
        setError("تعذر تحميل المواد.");
      }
    }

    loadSchoolSettings();
    loadClasses();
    loadSubjects();
  }, [token]);

  useEffect(() => {
    async function loadStudentsForClass() {
      if (!studentClassId) {
        setStudents([]);
        setStudentId("");
        return;
      }

      setLoadingStudents(true);
      setError("");

      try {
        const res = await fetch(`${API_BASE_URL}/api/classes/${studentClassId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("تعذر تحميل التلاميذ.");
        }

        const data = await res.json();
        const classStudents = data?.students ?? [];

        setStudents(Array.isArray(classStudents) ? classStudents : []);

        if (classStudents.length > 0) {
          setStudentId(classStudents[0].id);
        } else {
          setStudentId("");
        }
      } catch {
        setError("تعذر تحميل تلاميذ هذا القسم.");
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudentsForClass();
  }, [studentClassId, token]);

  async function generateGradesReport() {
    if (!gradeClassId || !gradePeriod) {
      setError("يرجى اختيار القسم والثلاثي.");
      return;
    }

    setLoadingGradesReport(true);
    setError("");

    try {
      const params = new URLSearchParams({
        classId: gradeClassId,
        period: gradePeriod,
      });

      if (gradeSubjectId) {
        params.set("subjectId", gradeSubjectId);
      }

      const res = await fetch(`${API_BASE_URL}/api/reports/grades?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("تعذر إنشاء تقرير الأعداد.");
      }

      const data = await res.json();
      setGradesReport(data);
    } catch {
      setError("تعذر إنشاء تقرير الأعداد.");
    } finally {
      setLoadingGradesReport(false);
    }
  }

  async function generateStudentReport() {
    if (!studentId || !studentPeriod) {
      setError("يرجى اختيار التلميذ والثلاثي.");
      return;
    }

    setLoadingStudentReport(true);
    setError("");

    try {
      const params = new URLSearchParams({
        period: studentPeriod,
      });

      const res = await fetch(
        `${API_BASE_URL}/api/student-bulletin/${studentId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("تعذر إنشاء تقرير التلميذ.");
      }

      const data = await res.json();
      setStudentReport(data);
    } catch {
      setError("تعذر إنشاء تقرير التلميذ.");
    } finally {
      setLoadingStudentReport(false);
    }
  }

  function exportGradesPdf() {
    if (!gradesReport) return;

    const safeClassName = gradesReport.class.name.replace(/[\\/:*?"<>|]/g, "-");

    const selectedSubjectName =
      subjects.find((subject) => subject.id === gradesReport.subjectId)?.name ||
      "كل المواد";

    const rowsHtml = gradesReport.rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.studentName)}</td>
            <td class="ltr">${escapeHtml(getVisibleStudentEmail(row.email))}</td>
            <td>${row.gradesCount}</td>
            <td>${row.average !== null ? row.average.toFixed(2) : "-"}</td>
            <td>${row.bestScore !== null ? row.bestScore : "-"}</td>
            <td>${row.lowestScore !== null ? row.lowestScore : "-"}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>grades-report-${escapeHtml(safeClassName)}-${escapeHtml(formatPeriodLabel(gradesReport.period))}</title>
          <style>
            * { box-sizing: border-box; }

            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 32px;
              direction: rtl;
              text-align: right;
            }

            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }

            h1 {
              margin: 0;
              font-size: 26px;
            }

            .subtitle {
              margin-top: 6px;
              color: #64748b;
              font-size: 13px;
            }

            .meta {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }

            .card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px;
              background: #f8fafc;
            }

            .card-label {
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .card-value {
              margin-top: 6px;
              font-size: 18px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th {
              background: #f1f5f9;
              text-align: right;
              color: #334155;
            }

            th, td {
              border: 1px solid #e2e8f0;
              padding: 8px;
            }

            .ltr {
              direction: ltr;
              text-align: left;
            }

            .footer {
              margin-top: 24px;
              color: #64748b;
              font-size: 11px;
            }

            @media print {
              body { margin: 18mm; }
              button { display: none; }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>تقرير الأعداد</h1>
            <div class="subtitle">
              School ERP — ${escapeHtml(gradesReport.class.name)} — ${escapeHtml(selectedSubjectName)} — ${escapeHtml(formatPeriodLabel(gradesReport.period))}
            </div>
          </div>

          <div class="meta">
            <div class="card">
              <div class="card-label">القسم</div>
              <div class="card-value">${escapeHtml(gradesReport.class.name)}</div>
            </div>

            <div class="card">
              <div class="card-label">المادة</div>
              <div class="card-value">${escapeHtml(selectedSubjectName)}</div>
            </div>

            <div class="card">
              <div class="card-label">الثلاثي</div>
              <div class="card-value">${escapeHtml(formatPeriodLabel(gradesReport.period))}</div>
            </div>

            <div class="card">
              <div class="card-label">التلاميذ</div>
              <div class="card-value">${gradesReport.summary.students}</div>
            </div>

            <div class="card">
              <div class="card-label">التلاميذ الذين لديهم أعداد</div>
              <div class="card-value">${gradesReport.summary.gradedStudents}</div>
            </div>

            <div class="card">
              <div class="card-label">إجمالي الأعداد</div>
              <div class="card-value">${gradesReport.summary.totalGrades}</div>
            </div>

            <div class="card">
              <div class="card-label">معدل القسم</div>
              <div class="card-value">${
                gradesReport.summary.classAverage !== null
                  ? gradesReport.summary.classAverage.toFixed(2)
                  : "-"
              }</div>
            </div>

            <div class="card">
              <div class="card-label">السنة الدراسية</div>
              <div class="card-value">${escapeHtml(gradesReport.class.academicYear)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>التلميذ</th>
                <th>البريد الإلكتروني</th>
                <th>عدد الأعداد</th>
                <th>المعدل</th>
                <th>أفضل عدد</th>
                <th>أدنى عدد</th>
              </tr>
            </thead>

            <tbody>
              ${
                rowsHtml ||
                `
                  <tr>
                    <td colspan="6">لا يوجد تلاميذ في هذا القسم.</td>
                  </tr>
                `
              }
            </tbody>
          </table>

          <div class="footer">
            تم الإنشاء من School ERP بتاريخ ${escapeHtml(generatedAtLabel())}
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      setError("تم منع النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لتصدير PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function exportGradesExcel() {
    if (!gradesReport) return;

    const rows = [
      [
        "التلميذ",
        "البريد الإلكتروني",
        "عدد الأعداد",
        "المعدل",
        "أفضل عدد",
        "أدنى عدد",
      ],
      ...gradesReport.rows.map((row) => [
        row.studentName,
        getVisibleStudentEmail(row.email),
        row.gradesCount,
        row.average !== null ? Number(row.average.toFixed(2)) : "",
        row.bestScore ?? "",
        row.lowestScore ?? "",
      ]),
      [],
      [
        "معدل القسم",
        gradesReport.summary.classAverage !== null
          ? Number(gradesReport.summary.classAverage.toFixed(2))
          : "",
      ],
      ["إجمالي الأعداد", gradesReport.summary.totalGrades],
      ["التلاميذ الذين لديهم أعداد", gradesReport.summary.gradedStudents],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الأعداد");

    const safeClassName = gradesReport.class.name.replace(/[\\/:*?"<>|]/g, "-");

    const selectedSubjectName =
      subjects.find((subject) => subject.id === gradesReport.subjectId)?.name ||
      "كل-المواد";

    const safeSubjectName = selectedSubjectName.replace(/[\\/:*?"<>|]/g, "-");

    XLSX.writeFile(
      workbook,
      `grades-report-${safeClassName}-${safeSubjectName}-${gradesReport.period}.xlsx`
    );
  }

  function exportStudentPdf() {
    if (!studentReport) return;

    const studentName = `${studentReport.student.firstName} ${studentReport.student.lastName}`;

    const rowsHtml = studentReport.subjects
      .map(
        (subject) => `
          <tr>
            <td>${escapeHtml(subject.subjectName)}</td>
            <td>${subject.coefficient}</td>
            <td>${subject.gradesCount}</td>
            <td>${subject.average.toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>student-report-${escapeHtml(studentName)}-${escapeHtml(formatPeriodLabel(studentReport.period))}</title>
          <style>
            * { box-sizing: border-box; }

            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 32px;
              direction: rtl;
              text-align: right;
            }

            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }

            h1 {
              margin: 0;
              font-size: 26px;
            }

            .subtitle {
              margin-top: 6px;
              color: #64748b;
              font-size: 13px;
            }

            .meta {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }

            .card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px;
              background: #f8fafc;
            }

            .card-label {
              color: #64748b;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .card-value {
              margin-top: 6px;
              font-size: 18px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th {
              background: #f1f5f9;
              text-align: right;
              color: #334155;
            }

            th, td {
              border: 1px solid #e2e8f0;
              padding: 8px;
            }

            .ltr {
              direction: ltr;
              text-align: left;
            }

            .footer {
              margin-top: 24px;
              color: #64748b;
              font-size: 11px;
            }

            @media print {
              body { margin: 18mm; }
              button { display: none; }
            }
          </style>
        </head>

        <body>
          <div class="header">
            <h1>التقرير الكامل للتلميذ</h1>
            <div class="subtitle">
              School ERP — ${escapeHtml(studentName)} — ${escapeHtml(formatPeriodLabel(studentReport.period))}
            </div>
          </div>

          <div class="meta">
            <div class="card">
              <div class="card-label">التلميذ</div>
              <div class="card-value">${escapeHtml(studentName)}</div>
            </div>

            <div class="card">
              <div class="card-label">البريد الإلكتروني</div>
              <div class="card-value ltr">${escapeHtml(getVisibleStudentEmail(studentReport.student.email))}</div>
            </div>

            <div class="card">
              <div class="card-label">القسم</div>
              <div class="card-value">${escapeHtml(studentReport.class?.name ?? "-")}</div>
            </div>

            <div class="card">
              <div class="card-label">الثلاثي</div>
              <div class="card-value">${escapeHtml(formatPeriodLabel(studentReport.period))}</div>
            </div>

            <div class="card">
              <div class="card-label">المعدل العام</div>
              <div class="card-value">${
                studentReport.generalAverage !== null
                  ? studentReport.generalAverage.toFixed(2)
                  : "-"
              }</div>
            </div>

            <div class="card">
              <div class="card-label">أفضل عدد</div>
              <div class="card-value">${
                studentReport.bestScore !== null ? studentReport.bestScore : "-"
              }</div>
            </div>

            <div class="card">
              <div class="card-label">الغيابات</div>
              <div class="card-value">${studentReport.absencesCount}</div>
            </div>

            <div class="card">
              <div class="card-label">عدد الأعداد</div>
              <div class="card-value">${studentReport.gradesCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>المادة</th>
                <th>المعامل</th>
                <th>عدد الأعداد</th>
                <th>المعدل</th>
              </tr>
            </thead>

            <tbody>
              ${
                rowsHtml ||
                `
                  <tr>
                    <td colspan="4">لا توجد أعداد مواد لهذا التلميذ في الثلاثي المختار.</td>
                  </tr>
                `
              }
            </tbody>
          </table>

          <div class="footer">
            تم الإنشاء من School ERP بتاريخ ${escapeHtml(generatedAtLabel())}
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      setError("تم منع النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لتصدير PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function exportStudentExcel() {
    if (!studentReport) return;

    const studentName = `${studentReport.student.firstName} ${studentReport.student.lastName}`;

    const rows = [
      ["التلميذ", studentName],
      ["\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a", getVisibleStudentEmail(studentReport.student.email)],
      ["القسم", studentReport.class?.name ?? ""],
      ["السنة الدراسية", studentReport.class?.academicYear ?? ""],
      ["الثلاثي", formatPeriodLabel(studentReport.period)],
      [
        "المعدل العام",
        studentReport.generalAverage !== null
          ? Number(studentReport.generalAverage.toFixed(2))
          : "",
      ],
      ["أفضل عدد", studentReport.bestScore ?? ""],
      ["الغيابات", studentReport.absencesCount],
      ["عدد الأعداد", studentReport.gradesCount],
      [],
      ["المادة", "المعامل", "عدد الأعداد", "المعدل"],
      ...studentReport.subjects.map((subject) => [
        subject.subjectName,
        subject.coefficient,
        subject.gradesCount,
        Number(subject.average.toFixed(2)),
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير التلميذ");

    const safeStudentName = studentName.replace(/[\\/:*?"<>|]/g, "-");

    XLSX.writeFile(
      workbook,
      `student-report-${safeStudentName}-${studentReport.period}.xlsx`
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">التقارير</h1>
        <p className="mt-1 text-slate-500">
          إنشاء تقارير إدارية للأعداد والتلاميذ.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          

          <button
            onClick={() => setReportTab("grades")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              reportTab === "grades"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            الأعداد
          </button>

          <button
            onClick={() => setReportTab("student")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              reportTab === "student"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            التلميذ
          </button>
        </div>
      </div>

      {reportTab === "grades" && (
        <>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  تقرير الأعداد
                </h2>
                <p className="text-sm text-slate-500">
                  عرض معدل القسم ومعدلات التلاميذ وأفضل الأعداد وأدناها.
                </p>
              </div>

              {gradesReport && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportGradesPdf}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    تصدير PDF
                  </button>

                  <button
                    onClick={exportGradesExcel}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    تصدير Excel
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  القسم
                </label>
                <select
                  value={gradeClassId}
                  onChange={(event) => {
                    setGradeClassId(event.target.value);
                    setGradesReport(null);
                  }}
                  disabled={loadingClasses}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">اختر قسمًا</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item._count ? ` (${item._count.students})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  المادة
                </label>
                <select
                  value={gradeSubjectId}
                  onChange={(event) => {
                    setGradeSubjectId(event.target.value);
                    setGradesReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">كل المواد</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  الثلاثي
                </label>
                <select
                  value={gradePeriod}
                  onChange={(event) => {
                    setGradePeriod(event.target.value as GradePeriod);
                    setGradesReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="TRIMESTER_1">الثلاثي الأول</option>
                  <option value="TRIMESTER_2">الثلاثي الثاني</option>
                  <option value="TRIMESTER_3">الثلاثي الثالث</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateGradesReport}
                  disabled={!gradeClassId || loadingGradesReport}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingGradesReport ? "جارٍ الإنشاء..." : "إنشاء التقرير"}
                </button>
              </div>
            </div>
          </div>

          {gradesReport && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard
                  title="التلاميذ"
                  value={gradesReport.summary.students}
                />
                <SummaryCard
                  title="تلاميذ لديهم أعداد"
                  value={gradesReport.summary.gradedStudents}
                />
                <SummaryCard
                  title="إجمالي الأعداد"
                  value={gradesReport.summary.totalGrades}
                />
                <SummaryCard
                  title="معدل القسم"
                  value={
                    gradesReport.summary.classAverage !== null
                      ? gradesReport.summary.classAverage.toFixed(2)
                      : "-"
                  }
                />
              </div>

              {gradesReport.summary.totalGrades === 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  لا توجد أعداد لهذا القسم والمادة والثلاثي.
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    تفاصيل الأعداد
                  </h3>
                  <p className="text-sm text-slate-500">
                    {gradesReport.class.name} — {formatPeriodLabel(gradesReport.period)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3">التلميذ</th>
                        <th className="px-5 py-3">البريد الإلكتروني</th>
                        <th className="px-5 py-3">عدد الأعداد</th>
                        <th className="px-5 py-3">المعدل</th>
                        <th className="px-5 py-3">أفضل عدد</th>
                        <th className="px-5 py-3">أدنى عدد</th>
                      </tr>
                    </thead>

                    <tbody>
                      {gradesReport.rows.map((row) => (
                        <tr key={row.studentId} className="border-t">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {row.studentName}
                          </td>
                          <td className="px-5 py-3 text-left text-slate-500" dir="ltr">
                            {getVisibleStudentEmail(row.email) || "-"}
                          </td>
                          <td className="px-5 py-3">{row.gradesCount}</td>
                          <td className="px-5 py-3">
                            {row.average !== null ? row.average.toFixed(2) : "-"}
                          </td>
                          <td className="px-5 py-3">
                            {row.bestScore !== null ? row.bestScore : "-"}
                          </td>
                          <td className="px-5 py-3">
                            {row.lowestScore !== null ? row.lowestScore : "-"}
                          </td>
                        </tr>
                      ))}

                      {gradesReport.rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-8 text-center text-slate-500"
                          >
                            لا يوجد تلاميذ في هذا القسم.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {reportTab === "student" && (
        <>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  التقرير الكامل للتلميذ
                </h2>
                <p className="text-sm text-slate-500">
                  عرض أعداد تلميذ واحد ومعدلاته وغياباته.
                </p>
              </div>

              {studentReport && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportStudentPdf}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    تصدير PDF
                  </button>

                  <button
                    onClick={exportStudentExcel}
                    className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    تصدير Excel
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  القسم
                </label>
                <select
                  value={studentClassId}
                  onChange={(event) => {
                    setStudentClassId(event.target.value);
                    setStudentReport(null);
                  }}
                  disabled={loadingClasses}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">اختر قسمًا</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item._count ? ` (${item._count.students})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  التلميذ
                </label>
                <select
                  value={studentId}
                  onChange={(event) => {
                    setStudentId(event.target.value);
                    setStudentReport(null);
                  }}
                  disabled={loadingStudents}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">اختر تلميذًا</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.firstName} {student.user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  الثلاثي
                </label>
                <select
                  value={studentPeriod}
                  onChange={(event) => {
                    setStudentPeriod(event.target.value as GradePeriod);
                    setStudentReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="TRIMESTER_1">الثلاثي الأول</option>
                  <option value="TRIMESTER_2">الثلاثي الثاني</option>
                  <option value="TRIMESTER_3">الثلاثي الثالث</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateStudentReport}
                  disabled={!studentId || loadingStudentReport}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingStudentReport ? "جارٍ الإنشاء..." : "إنشاء التقرير"}
                </button>
              </div>
            </div>
          </div>

          {studentReport && (
            <>
              <div className="grid gap-4 md:grid-cols-5">
                <SummaryCard
                  title="التلميذ"
                  value={`${studentReport.student.firstName} ${studentReport.student.lastName}`}
                />
                <SummaryCard
                  title="المعدل العام"
                  value={
                    studentReport.generalAverage !== null
                      ? studentReport.generalAverage.toFixed(2)
                      : "-"
                  }
                />
                <SummaryCard
                  title="أفضل عدد"
                  value={
                    studentReport.bestScore !== null
                      ? studentReport.bestScore
                      : "-"
                  }
                />
                <SummaryCard
                  title="الغيابات"
                  value={studentReport.absencesCount}
                />
                <SummaryCard title="الأعداد" value={studentReport.gradesCount} />
              </div>

              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    تفاصيل تقرير التلميذ
                  </h3>
                  <p className="text-sm text-slate-500">
                    {studentReport.class?.name ?? "لا يوجد قسم"} —{" "}
                    {formatPeriodLabel(studentReport.period)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3">المادة</th>
                        <th className="px-5 py-3">المعامل</th>
                        <th className="px-5 py-3">عدد الأعداد</th>
                        <th className="px-5 py-3">المعدل</th>
                      </tr>
                    </thead>

                    <tbody>
                      {studentReport.subjects.map((subject) => (
                        <tr key={subject.subjectId} className="border-t">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {subject.subjectName}
                          </td>
                          <td className="px-5 py-3">{subject.coefficient}</td>
                          <td className="px-5 py-3">{subject.gradesCount}</td>
                          <td className="px-5 py-3">
                            {subject.average.toFixed(2)}
                          </td>
                        </tr>
                      ))}

                      {studentReport.subjects.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-8 text-center text-slate-500"
                          >
                            لا توجد أعداد مواد لهذا التلميذ في الثلاثي المختار.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 text-right shadow-sm" dir="rtl">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 truncate text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}