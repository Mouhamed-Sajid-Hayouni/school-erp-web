import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

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

type AttendanceReportRow = {
  studentId: string;
  studentName: string;
  email: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  absenceRate: number;
};

type AttendanceReportResponse = {
  class: {
    id: string;
    name: string;
    academicYear: string;
  };
  from: string;
  to: string;
  rows: AttendanceReportRow[];
  summary: {
    students: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalRecords: number;
  };
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

type ReportTab = "attendance" | "grades" | "student";

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

export default function ReportsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [reportTab, setReportTab] = useState<ReportTab>("attendance");

  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<AttendanceReportResponse | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const [gradeClassId, setGradeClassId] = useState("");
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
    setStudentPeriod(data.defaultTrimester || "TRIMESTER_1");
    setFrom(toDateInputValue(data.defaultReportFrom));
    setTo(toDateInputValue(data.defaultReportTo));
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
          throw new Error("Failed to load classes.");
        }

        const data = await res.json();
        setClasses(data);

        if (data.length > 0) {
          setClassId(data[0].id);
          setGradeClassId(data[0].id);
          setStudentClassId(data[0].id);
        }
      } catch (err) {
        setError("Could not load classes.");
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
          throw new Error("Failed to load subjects.");
        }

        const data = await res.json();
        setSubjects(data);
      } catch (err) {
        setError("Could not load subjects.");
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
          throw new Error("Failed to load students.");
        }

        const data = await res.json();
        const classStudents = data?.students ?? [];

        setStudents(classStudents);

        if (classStudents.length > 0) {
          setStudentId(classStudents[0].id);
        } else {
          setStudentId("");
        }
      } catch (err) {
        setError("Could not load students for this class.");
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudentsForClass();
  }, [studentClassId, token]);

  async function generateReport() {
    if (!classId || !from || !to) {
      setError("Please choose a class and date range.");
      return;
    }

    setLoadingReport(true);
    setError("");

    try {
      const params = new URLSearchParams({
        classId,
        from,
        to,
      });

      const res = await fetch(
        `${API_BASE_URL}/api/reports/attendance?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to generate attendance report.");
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError("Could not generate attendance report.");
    } finally {
      setLoadingReport(false);
    }
  }

  async function generateGradesReport() {
    if (!gradeClassId || !gradePeriod) {
      setError("Please choose a class and trimester.");
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
        throw new Error("Failed to generate grades report.");
      }

      const data = await res.json();
      setGradesReport(data);
    } catch (err) {
      setError("Could not generate grades report.");
    } finally {
      setLoadingGradesReport(false);
    }
  }

  async function generateStudentReport() {
    if (!studentId || !studentPeriod) {
      setError("Please choose a student and trimester.");
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
        throw new Error("Failed to generate student report.");
      }

      const data = await res.json();
      setStudentReport(data);
    } catch (err) {
      setError("Could not generate student report.");
    } finally {
      setLoadingStudentReport(false);
    }
  }

  function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportAttendancePdf() {
  if (!report) return;

  const safeClassName = report.class.name.replace(/[\\/:*?"<>|]/g, "-");

  const rowsHtml = report.rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.studentName)}</td>
          <td>${escapeHtml(row.email)}</td>
          <td>${row.present}</td>
          <td>${row.absent}</td>
          <td>${row.late}</td>
          <td>${row.total}</td>
          <td>${row.absenceRate}%</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>attendance-report-${escapeHtml(safeClassName)}-${escapeHtml(report.from)}-${escapeHtml(report.to)}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #0f172a;
            margin: 32px;
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
            text-align: left;
            color: #334155;
          }

          th,
          td {
            border: 1px solid #e2e8f0;
            padding: 8px;
          }

          .footer {
            margin-top: 24px;
            color: #64748b;
            font-size: 11px;
          }

          @media print {
            body {
              margin: 18mm;
            }

            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>Attendance Report</h1>
          <div class="subtitle">
            School ERP — ${escapeHtml(report.class.name)} — ${escapeHtml(report.from)} to ${escapeHtml(report.to)}
          </div>
        </div>

        <div class="meta">
          <div class="card">
            <div class="card-label">Class</div>
            <div class="card-value">${escapeHtml(report.class.name)}</div>
          </div>

          <div class="card">
            <div class="card-label">Students</div>
            <div class="card-value">${report.summary.students}</div>
          </div>

          <div class="card">
            <div class="card-label">Present</div>
            <div class="card-value">${report.summary.totalPresent}</div>
          </div>

          <div class="card">
            <div class="card-label">Absent</div>
            <div class="card-value">${report.summary.totalAbsent}</div>
          </div>

          <div class="card">
            <div class="card-label">Late</div>
            <div class="card-value">${report.summary.totalLate}</div>
          </div>

          <div class="card">
            <div class="card-label">Total Records</div>
            <div class="card-value">${report.summary.totalRecords}</div>
          </div>

          <div class="card">
            <div class="card-label">From</div>
            <div class="card-value">${escapeHtml(report.from)}</div>
          </div>

          <div class="card">
            <div class="card-label">To</div>
            <div class="card-value">${escapeHtml(report.to)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Late</th>
              <th>Total</th>
              <th>Absence %</th>
            </tr>
          </thead>

          <tbody>
            ${
              rowsHtml ||
              `
                <tr>
                  <td colspan="7">No students found for this class.</td>
                </tr>
              `
            }
          </tbody>
        </table>

        <div class="footer">
          Generated from School ERP on ${escapeHtml(new Date().toLocaleString())}
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
    setError("Popup blocked. Please allow popups to export the PDF.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

  function exportAttendanceExcel() {
    if (!report) return;

    const rows = [
      ["Student", "Email", "Present", "Absent", "Late", "Total", "Absence %"],
      ...report.rows.map((row) => [
        row.studentName,
        row.email,
        row.present,
        row.absent,
        row.late,
        row.total,
        `${row.absenceRate}%`,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 28 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const safeClassName = report.class.name.replace(/[\\/:*?"<>|]/g, "-");

    XLSX.writeFile(
      workbook,
      `attendance-report-${safeClassName}-${report.from}-${report.to}.xlsx`
    );
  }

  function exportGradesPdf() {
  if (!gradesReport) return;

  const safeClassName = gradesReport.class.name.replace(/[\\/:*?"<>|]/g, "-");

  const selectedSubjectName =
    subjects.find((subject) => subject.id === gradesReport.subjectId)?.name ||
    "All subjects";

  const rowsHtml = gradesReport.rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.studentName)}</td>
          <td>${escapeHtml(row.email)}</td>
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
    <html>
      <head>
        <meta charset="utf-8" />
        <title>grades-report-${escapeHtml(safeClassName)}-${escapeHtml(gradesReport.period)}</title>
        <style>
          * { box-sizing: border-box; }

          body {
            font-family: Arial, sans-serif;
            color: #0f172a;
            margin: 32px;
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
            text-align: left;
            color: #334155;
          }

          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px;
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
          <h1>Grades Report</h1>
          <div class="subtitle">
            School ERP — ${escapeHtml(gradesReport.class.name)} — ${escapeHtml(selectedSubjectName)} — ${escapeHtml(gradesReport.period)}
          </div>
        </div>

        <div class="meta">
          <div class="card">
            <div class="card-label">Class</div>
            <div class="card-value">${escapeHtml(gradesReport.class.name)}</div>
          </div>

          <div class="card">
            <div class="card-label">Subject</div>
            <div class="card-value">${escapeHtml(selectedSubjectName)}</div>
          </div>

          <div class="card">
            <div class="card-label">Period</div>
            <div class="card-value">${escapeHtml(gradesReport.period)}</div>
          </div>

          <div class="card">
            <div class="card-label">Students</div>
            <div class="card-value">${gradesReport.summary.students}</div>
          </div>

          <div class="card">
            <div class="card-label">Graded Students</div>
            <div class="card-value">${gradesReport.summary.gradedStudents}</div>
          </div>

          <div class="card">
            <div class="card-label">Total Grades</div>
            <div class="card-value">${gradesReport.summary.totalGrades}</div>
          </div>

          <div class="card">
            <div class="card-label">Class Average</div>
            <div class="card-value">${
              gradesReport.summary.classAverage !== null
                ? gradesReport.summary.classAverage.toFixed(2)
                : "-"
            }</div>
          </div>

          <div class="card">
            <div class="card-label">Academic Year</div>
            <div class="card-value">${escapeHtml(gradesReport.class.academicYear)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Grades</th>
              <th>Average</th>
              <th>Best</th>
              <th>Lowest</th>
            </tr>
          </thead>

          <tbody>
            ${
              rowsHtml ||
              `
                <tr>
                  <td colspan="6">No students found for this class.</td>
                </tr>
              `
            }
          </tbody>
        </table>

        <div class="footer">
          Generated from School ERP on ${escapeHtml(new Date().toLocaleString())}
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
    setError("Popup blocked. Please allow popups to export the PDF.");
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
        "Student",
        "Email",
        "Grades Count",
        "Average",
        "Best Score",
        "Lowest Score",
      ],
      ...gradesReport.rows.map((row) => [
        row.studentName,
        row.email,
        row.gradesCount,
        row.average !== null ? Number(row.average.toFixed(2)) : "",
        row.bestScore ?? "",
        row.lowestScore ?? "",
      ]),
      [],
      [
        "Class Average",
        gradesReport.summary.classAverage !== null
          ? Number(gradesReport.summary.classAverage.toFixed(2))
          : "",
      ],
      ["Total Grades", gradesReport.summary.totalGrades],
      ["Graded Students", gradesReport.summary.gradedStudents],
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");

    const safeClassName = gradesReport.class.name.replace(/[\\/:*?"<>|]/g, "-");

    const selectedSubjectName =
      subjects.find((subject) => subject.id === gradesReport.subjectId)?.name ||
      "all-subjects";

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
    <html>
      <head>
        <meta charset="utf-8" />
        <title>student-report-${escapeHtml(studentName)}-${escapeHtml(studentReport.period)}</title>
        <style>
          * { box-sizing: border-box; }

          body {
            font-family: Arial, sans-serif;
            color: #0f172a;
            margin: 32px;
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
            text-align: left;
            color: #334155;
          }

          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px;
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
          <h1>Student Full Report</h1>
          <div class="subtitle">
            School ERP — ${escapeHtml(studentName)} — ${escapeHtml(studentReport.period)}
          </div>
        </div>

        <div class="meta">
          <div class="card">
            <div class="card-label">Student</div>
            <div class="card-value">${escapeHtml(studentName)}</div>
          </div>

          <div class="card">
            <div class="card-label">Email</div>
            <div class="card-value">${escapeHtml(studentReport.student.email)}</div>
          </div>

          <div class="card">
            <div class="card-label">Class</div>
            <div class="card-value">${escapeHtml(studentReport.class?.name ?? "-")}</div>
          </div>

          <div class="card">
            <div class="card-label">Period</div>
            <div class="card-value">${escapeHtml(studentReport.period)}</div>
          </div>

          <div class="card">
            <div class="card-label">General Average</div>
            <div class="card-value">${
              studentReport.generalAverage !== null
                ? studentReport.generalAverage.toFixed(2)
                : "-"
            }</div>
          </div>

          <div class="card">
            <div class="card-label">Best Score</div>
            <div class="card-value">${
              studentReport.bestScore !== null ? studentReport.bestScore : "-"
            }</div>
          </div>

          <div class="card">
            <div class="card-label">Absences</div>
            <div class="card-value">${studentReport.absencesCount}</div>
          </div>

          <div class="card">
            <div class="card-label">Grades Count</div>
            <div class="card-value">${studentReport.gradesCount}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Coefficient</th>
              <th>Grades</th>
              <th>Average</th>
            </tr>
          </thead>

          <tbody>
            ${
              rowsHtml ||
              `
                <tr>
                  <td colspan="4">No subject grades found for this student and trimester.</td>
                </tr>
              `
            }
          </tbody>
        </table>

        <div class="footer">
          Generated from School ERP on ${escapeHtml(new Date().toLocaleString())}
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
    setError("Popup blocked. Please allow popups to export the PDF.");
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
      ["Student", studentName],
      ["Email", studentReport.student.email],
      ["Class", studentReport.class?.name ?? ""],
      ["Academic Year", studentReport.class?.academicYear ?? ""],
      ["Period", studentReport.period],
      [
        "General Average",
        studentReport.generalAverage !== null
          ? Number(studentReport.generalAverage.toFixed(2))
          : "",
      ],
      ["Best Score", studentReport.bestScore ?? ""],
      ["Absences", studentReport.absencesCount],
      ["Grades Count", studentReport.gradesCount],
      [],
      ["Subject", "Coefficient", "Grades Count", "Average"],
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Report");

    const safeStudentName = studentName.replace(/[\\/:*?"<>|]/g, "-");

    XLSX.writeFile(
      workbook,
      `student-report-${safeStudentName}-${studentReport.period}.xlsx`
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-slate-500">
          Generate admin reports for attendance, grades, and students.
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
            onClick={() => setReportTab("attendance")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              reportTab === "attendance"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Attendance
          </button>

          <button
            onClick={() => setReportTab("grades")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              reportTab === "grades"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Grades
          </button>

          <button
            onClick={() => setReportTab("student")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              reportTab === "student"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Student
          </button>
        </div>
      </div>

      {reportTab === "attendance" && (
        <>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Attendance Report
                </h2>
                <p className="text-sm text-slate-500">
                  Filter attendance by class and date range.
                </p>
              </div>

              {report && (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={exportAttendancePdf}
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Export PDF
    </button>

    <button
      onClick={exportAttendanceExcel}
      className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Export Excel
    </button>
  </div>
)}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Class
                </label>
                <select
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setReport(null);
                  }}
                  disabled={loadingClasses}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">Choose class</option>
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
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateReport}
                  disabled={!classId || loadingReport}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingReport ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>

          {report && (
            <>
              <div className="grid gap-4 md:grid-cols-5">
                <SummaryCard
                  title="Class"
                  value={selectedClass?.name || report.class.name}
                />
                <SummaryCard title="Students" value={report.summary.students} />
                <SummaryCard title="Present" value={report.summary.totalPresent} />
                <SummaryCard title="Absent" value={report.summary.totalAbsent} />
                <SummaryCard title="Late" value={report.summary.totalLate} />
              </div>

              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Attendance Details
                  </h3>
                  <p className="text-sm text-slate-500">
                    {report.class.name} — {report.from} to {report.to}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Present</th>
                        <th className="px-5 py-3">Absent</th>
                        <th className="px-5 py-3">Late</th>
                        <th className="px-5 py-3">Total</th>
                        <th className="px-5 py-3">Absence %</th>
                      </tr>
                    </thead>

                    <tbody>
                      {report.rows.map((row) => (
                        <tr key={row.studentId} className="border-t">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {row.studentName}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {row.email}
                          </td>
                          <td className="px-5 py-3">{row.present}</td>
                          <td className="px-5 py-3">{row.absent}</td>
                          <td className="px-5 py-3">{row.late}</td>
                          <td className="px-5 py-3">{row.total}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                row.absenceRate >= 30
                                  ? "bg-red-100 text-red-700"
                                  : row.absenceRate >= 15
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                            >
                              {row.absenceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}

                      {report.rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-5 py-8 text-center text-slate-500"
                          >
                            No students found for this class.
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

      {reportTab === "grades" && (
        <>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Grades Report
                </h2>
                <p className="text-sm text-slate-500">
                  View class averages, student averages, best scores, and lowest
                  scores.
                </p>
              </div>

              {gradesReport && (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={exportGradesPdf}
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Export PDF
    </button>

    <button
      onClick={exportGradesExcel}
      className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Export Excel
    </button>
  </div>
)}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Class
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
                  <option value="">Choose class</option>
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
                  Subject
                </label>
                <select
                  value={gradeSubjectId}
                  onChange={(event) => {
                    setGradeSubjectId(event.target.value);
                    setGradesReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Trimester
                </label>
                <select
                  value={gradePeriod}
                  onChange={(event) => {
                    setGradePeriod(event.target.value as GradePeriod);
                    setGradesReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="TRIMESTER_1">Trimester 1</option>
                  <option value="TRIMESTER_2">Trimester 2</option>
                  <option value="TRIMESTER_3">Trimester 3</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateGradesReport}
                  disabled={!gradeClassId || loadingGradesReport}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingGradesReport ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>

          {gradesReport && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard
                  title="Students"
                  value={gradesReport.summary.students}
                />
                <SummaryCard
                  title="Graded Students"
                  value={gradesReport.summary.gradedStudents}
                />
                <SummaryCard
                  title="Total Grades"
                  value={gradesReport.summary.totalGrades}
                />
                <SummaryCard
                  title="Class Average"
                  value={
                    gradesReport.summary.classAverage !== null
                      ? gradesReport.summary.classAverage.toFixed(2)
                      : "-"
                  }
                />
              </div>

              {gradesReport.summary.totalGrades === 0 && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  No grades were found for this class, subject, and trimester.
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Grades Details
                  </h3>
                  <p className="text-sm text-slate-500">
                    {gradesReport.class.name} — {gradesReport.period}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Grades</th>
                        <th className="px-5 py-3">Average</th>
                        <th className="px-5 py-3">Best</th>
                        <th className="px-5 py-3">Lowest</th>
                      </tr>
                    </thead>

                    <tbody>
                      {gradesReport.rows.map((row) => (
                        <tr key={row.studentId} className="border-t">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {row.studentName}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {row.email}
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
                            No students found for this class.
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
                  Student Full Report
                </h2>
                <p className="text-sm text-slate-500">
                  View one student&apos;s grades, averages, and absences.
                </p>
              </div>

              {studentReport && (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={exportStudentPdf}
      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Export PDF
    </button>

    <button
      onClick={exportStudentExcel}
      className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Export Excel
    </button>
  </div>
)}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Class
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
                  <option value="">Choose class</option>
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
                  Student
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
                  <option value="">Choose student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.firstName} {student.user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Trimester
                </label>
                <select
                  value={studentPeriod}
                  onChange={(event) => {
                    setStudentPeriod(event.target.value as GradePeriod);
                    setStudentReport(null);
                  }}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-500"
                >
                  <option value="TRIMESTER_1">Trimester 1</option>
                  <option value="TRIMESTER_2">Trimester 2</option>
                  <option value="TRIMESTER_3">Trimester 3</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={generateStudentReport}
                  disabled={!studentId || loadingStudentReport}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingStudentReport ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>

          {studentReport && (
            <>
              <div className="grid gap-4 md:grid-cols-5">
                <SummaryCard
                  title="Student"
                  value={`${studentReport.student.firstName} ${studentReport.student.lastName}`}
                />
                <SummaryCard
                  title="General Average"
                  value={
                    studentReport.generalAverage !== null
                      ? studentReport.generalAverage.toFixed(2)
                      : "-"
                  }
                />
                <SummaryCard
                  title="Best Score"
                  value={
                    studentReport.bestScore !== null
                      ? studentReport.bestScore
                      : "-"
                  }
                />
                <SummaryCard
                  title="Absences"
                  value={studentReport.absencesCount}
                />
                <SummaryCard title="Grades" value={studentReport.gradesCount} />
              </div>

              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Student Report Details
                  </h3>
                  <p className="text-sm text-slate-500">
                    {studentReport.class?.name ?? "No class"} —{" "}
                    {studentReport.period}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3">Subject</th>
                        <th className="px-5 py-3">Coefficient</th>
                        <th className="px-5 py-3">Grades</th>
                        <th className="px-5 py-3">Average</th>
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
                            No subject grades found for this student and
                            trimester.
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
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 truncate text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}