export type GradePeriod = "TRIMESTER_1" | "TRIMESTER_2" | "TRIMESTER_3";

export type StudentBulletinResponse = {
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
  subjects: {
    subjectId: string;
    subjectName: string;
    coefficient: number;
    gradesCount: number;
    average: number;
  }[];
};

const periodLabelMap: Record<GradePeriod, string> = {
  TRIMESTER_1: "Trimester 1",
  TRIMESTER_2: "Trimester 2",
  TRIMESTER_3: "Trimester 3",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function exportBulletinPdf(data: StudentBulletinResponse) {
  const fullName = `${data.student.firstName} ${data.student.lastName}`.trim();
  const periodLabel = periodLabelMap[data.period] ?? data.period;

  const rowsHtml = data.subjects
    .map(
      (subject) => `
        <tr>
          <td class="rtl-cell">${escapeHtml(subject.subjectName)}</td>
          <td>${subject.coefficient}</td>
          <td>${subject.gradesCount}</td>
          <td>${subject.average.toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Bulletin - ${escapeHtml(fullName)}</title>
        <style>
          @page {
            size: A4;
            margin: 18mm;
          }

          body {
            font-family: Arial, "Segoe UI", Tahoma, sans-serif;
            color: #111827;
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          .page {
            width: 100%;
          }

          h1 {
            margin: 0 0 20px 0;
            font-size: 26px;
          }

          .meta {
            margin-bottom: 18px;
            line-height: 1.8;
            font-size: 14px;
          }

          .label {
            font-weight: 700;
            display: inline-block;
            min-width: 120px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
            font-size: 14px;
          }

          th, td {
            border: 1px solid #cbd5e1;
            padding: 10px 12px;
            text-align: left;
            vertical-align: middle;
          }

          th {
            background: #f8fafc;
            font-weight: 700;
          }

          .rtl-cell {
            direction: rtl;
            unicode-bidi: plaintext;
            text-align: right;
            font-family: Arial, "Segoe UI", Tahoma, sans-serif;
          }

          .summary {
            margin-top: 24px;
            line-height: 1.9;
            font-size: 14px;
          }

          .summary-item strong {
            display: inline-block;
            min-width: 150px;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <h1>School Bulletin</h1>

          <div class="meta">
            <div><span class="label">Student:</span> ${escapeHtml(fullName)}</div>
            <div><span class="label">Email:</span> ${escapeHtml(data.student.email)}</div>
            <div><span class="label">Class:</span> <span class="rtl-cell">${escapeHtml(data.class?.name ?? "-")}</span></div>
            <div><span class="label">Academic Year:</span> ${escapeHtml(data.class?.academicYear ?? "-")}</div>
            <div><span class="label">Period:</span> ${escapeHtml(periodLabel)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Coefficient</th>
                <th>Grades Count</th>
                <th>Average / 20</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item"><strong>Weighted Average:</strong> ${
              data.generalAverage !== null ? data.generalAverage.toFixed(2) : "-"
            }</div>
            <div class="summary-item"><strong>Best Score:</strong> ${
              data.bestScore !== null ? `${data.bestScore.toFixed(2)}/20` : "-"
            }</div>
            <div class="summary-item"><strong>Grades Count:</strong> ${data.gradesCount}</div>
            <div class="summary-item"><strong>Coefficient Sum:</strong> ${data.coefficientSum}</div>
            <div class="summary-item"><strong>Absences Count:</strong> ${data.absencesCount}</div>
          </div>
        </div>

        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    throw new Error("Popup blocked. Please allow popups to export the bulletin.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}