import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export function exportBulletinPdf(data: StudentBulletinResponse) {
  const doc = new jsPDF();

  const fullName = `${data.student.firstName} ${data.student.lastName}`.trim();
  const periodLabel = periodLabelMap[data.period] ?? data.period;

  doc.setFontSize(18);
  doc.text("School Bulletin", 14, 18);

  doc.setFontSize(11);
  doc.text(`Student: ${fullName}`, 14, 30);
  doc.text(`Email: ${data.student.email}`, 14, 37);
  doc.text(`Class: ${data.class?.name ?? "-"}`, 14, 44);
  doc.text(`Academic Year: ${data.class?.academicYear ?? "-"}`, 14, 51);
  doc.text(`Period: ${periodLabel}`, 14, 58);

  autoTable(doc, {
    startY: 68,
    head: [["Subject", "Coefficient", "Grades Count", "Average / 20"]],
    body: data.subjects.map((subject) => [
      subject.subjectName,
      String(subject.coefficient),
      String(subject.gradesCount),
      subject.average.toFixed(2),
    ]),
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 90;

  doc.text(
    `Weighted Average: ${
      data.generalAverage !== null ? data.generalAverage.toFixed(2) : "-"
    }`,
    14,
    finalY + 14
  );

  doc.text(
    `Best Score: ${
      data.bestScore !== null ? `${data.bestScore.toFixed(2)}/20` : "-"
    }`,
    14,
    finalY + 21
  );

  doc.text(`Grades Count: ${data.gradesCount}`, 14, finalY + 28);
  doc.text(`Coefficient Sum: ${data.coefficientSum}`, 14, finalY + 35);
  doc.text(`Absences Count: ${data.absencesCount}`, 14, finalY + 42);

  doc.save(`bulletin-${fullName.replace(/\s+/g, "-")}-${data.period}.pdf`);
}