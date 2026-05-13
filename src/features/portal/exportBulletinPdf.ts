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
  TRIMESTER_1: "الثلاثي الأول",
  TRIMESTER_2: "الثلاثي الثاني",
  TRIMESTER_3: "الثلاثي الثالث",
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
        <meta charset="UTF-8" />
        <title>دفتر الأعداد - ${escapeHtml(fullName)}</title>
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
            direction: rtl;
            text-align: right;
          }

          .page {
            width: 100%;
          }

          h1 {
            margin: 0 0 8px 0;
            font-size: 26px;
            color: #0f172a;
          }

          .subtitle {
            margin: 0 0 20px 0;
            font-size: 13px;
            color: #64748b;
          }

          .meta {
            margin-bottom: 18px;
            line-height: 1.9;
            font-size: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            background: #f8fafc;
          }

          .label {
            font-weight: 700;
            display: inline-block;
            min-width: 130px;
            color: #334155;
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
            text-align: right;
            vertical-align: middle;
          }

          th {
            background: #f1f5f9;
            font-weight: 700;
            color: #0f172a;
          }

          .summary {
            margin-top: 24px;
            line-height: 1.9;
            font-size: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
          }

          .summary-item strong {
            display: inline-block;
            min-width: 170px;
            color: #334155;
          }

          .footer {
            margin-top: 28px;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
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
          <h1>دفتر أعداد التلميذ</h1>
          <p class="subtitle">
            نسخة مخصصة للولي لمتابعة النتائج المدرسية للابن.
          </p>

          <div class="meta">
            <div><span class="label">التلميذ:</span> ${escapeHtml(fullName)}</div>
            <div><span class="label">البريد الإلكتروني:</span> ${escapeHtml(data.student.email)}</div>
            <div><span class="label">القسم:</span> ${escapeHtml(data.class?.name ?? "-")}</div>
            <div><span class="label">السنة الدراسية:</span> ${escapeHtml(data.class?.academicYear ?? "-")}</div>
            <div><span class="label">الفترة:</span> ${escapeHtml(periodLabel)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>المادة</th>
                <th>المعامل</th>
                <th>عدد الفروض</th>
                <th>المعدل / 20</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item"><strong>المعدل العام:</strong> ${
              data.generalAverage !== null ? data.generalAverage.toFixed(2) : "-"
            }</div>
            <div class="summary-item"><strong>أفضل عدد:</strong> ${
              data.bestScore !== null ? `${data.bestScore.toFixed(2)}/20` : "-"
            }</div>
            <div class="summary-item"><strong>مجموع الأعداد:</strong> ${data.gradesCount}</div>
            <div class="summary-item"><strong>مجموع المعاملات:</strong> ${data.coefficientSum}</div>
            <div class="summary-item"><strong>عدد الغيابات:</strong> ${data.absencesCount}</div>
          </div>

          <div class="footer">
            تم استخراج هذا الدفتر من بوابة الولي.
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
    throw new Error("تعذر فتح نافذة الطباعة. الرجاء السماح بالنوافذ المنبثقة لاستخراج دفتر الأعداد.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}