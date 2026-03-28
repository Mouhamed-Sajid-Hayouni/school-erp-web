import jsPDF from "jspdf";
import amiriFontUrl from "../../assets/fonts/Amiri-Regular.ttf?url";

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

const ARABIC_FONT_FAMILY = "AmiriCustom";
const ARABIC_FONT_FILE = "Amiri-Regular.ttf";

let cachedBase64Font: string | null = null;

function containsArabic(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
    value
  );
}

function toBase64(arrayBuffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function getArabicFontBase64() {
  if (cachedBase64Font) return cachedBase64Font;

  const response = await fetch(amiriFontUrl);
  if (!response.ok) {
    throw new Error("Failed to load Arabic PDF font.");
  }

  const arrayBuffer = await response.arrayBuffer();
  cachedBase64Font = toBase64(arrayBuffer);
  return cachedBase64Font;
}

async function ensureArabicFont(doc: jsPDF) {
  const base64Font = await getArabicFontBase64();
  doc.addFileToVFS(ARABIC_FONT_FILE, base64Font);
  doc.addFont(ARABIC_FONT_FILE, ARABIC_FONT_FAMILY, "normal");
}

function shapeText(doc: jsPDF, value: string): string {
  if (!value) return value;
  return containsArabic(value) ? doc.processArabic(value) : value;
}

function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number
) {
  doc.setFont("helvetica", "normal");
  doc.text(label, x, y);

  if (containsArabic(value)) {
    doc.setFont(ARABIC_FONT_FAMILY, "normal");
    doc.text(shapeText(doc, value), 195, y, { align: "right" });
    doc.setFont("helvetica", "normal");
  } else {
    doc.text(value, x + 40, y);
  }
}

function drawCellText(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  width: number,
  align: "left" | "center" | "right" = "left"
) {
  if (containsArabic(value)) {
    doc.setFont(ARABIC_FONT_FAMILY, "normal");
    doc.text(shapeText(doc, value), x + width - 2, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    return;
  }

  if (align === "center") {
    doc.text(value, x + width / 2, y, { align: "center" });
    return;
  }

  if (align === "right") {
    doc.text(value, x + width - 2, y, { align: "right" });
    return;
  }

  doc.text(value, x + 2, y);
}

function drawTable(doc: jsPDF, subjects: StudentBulletinResponse["subjects"], startY: number) {
  const pageWidth = 210;
  const margin = 14;
  const tableWidth = pageWidth - margin * 2;

  const col1 = 95; // Subject
  const col2 = 28; // Coefficient
  const col3 = 32; // Grades Count
  const col4 = tableWidth - col1 - col2 - col3; // Average

  const rowHeight = 10;

  let y = startY;

  const drawRowBorders = (yPos: number) => {
    doc.rect(margin, yPos, col1, rowHeight);
    doc.rect(margin + col1, yPos, col2, rowHeight);
    doc.rect(margin + col1 + col2, yPos, col3, rowHeight);
    doc.rect(margin + col1 + col2 + col3, yPos, col4, rowHeight);
  };

  doc.setFont("helvetica", "bold");
  drawRowBorders(y);

  drawCellText(doc, "Subject", margin, y + 6.5, col1, "left");
  drawCellText(doc, "Coefficient", margin + col1, y + 6.5, col2, "center");
  drawCellText(doc, "Grades Count", margin + col1 + col2, y + 6.5, col3, "center");
  drawCellText(doc, "Average / 20", margin + col1 + col2 + col3, y + 6.5, col4, "center");

  y += rowHeight;
  doc.setFont("helvetica", "normal");

  for (const subject of subjects) {
    if (y > 260) {
      doc.addPage();
      y = 20;

      doc.setFont("helvetica", "bold");
      drawRowBorders(y);
      drawCellText(doc, "Subject", margin, y + 6.5, col1, "left");
      drawCellText(doc, "Coefficient", margin + col1, y + 6.5, col2, "center");
      drawCellText(doc, "Grades Count", margin + col1 + col2, y + 6.5, col3, "center");
      drawCellText(doc, "Average / 20", margin + col1 + col2 + col3, y + 6.5, col4, "center");
      y += rowHeight;
      doc.setFont("helvetica", "normal");
    }

    drawRowBorders(y);

    drawCellText(doc, subject.subjectName, margin, y + 6.5, col1, "left");
    drawCellText(doc, String(subject.coefficient), margin + col1, y + 6.5, col2, "center");
    drawCellText(doc, String(subject.gradesCount), margin + col1 + col2, y + 6.5, col3, "center");
    drawCellText(doc, subject.average.toFixed(2), margin + col1 + col2 + col3, y + 6.5, col4, "center");

    y += rowHeight;
  }

  return y;
}

export async function exportBulletinPdf(data: StudentBulletinResponse) {
  const doc = new jsPDF();

  await ensureArabicFont(doc);

  const fullName = `${data.student.firstName} ${data.student.lastName}`.trim();
  const periodLabel = periodLabelMap[data.period] ?? data.period;
  const className = data.class?.name ?? "-";
  const academicYear = data.class?.academicYear ?? "-";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("School Bulletin", 14, 18);

  doc.setFontSize(11);

  drawLabelValue(doc, "Student:", fullName, 14, 30);
  drawLabelValue(doc, "Email:", data.student.email, 14, 37);
  drawLabelValue(doc, "Class:", className, 14, 44);
  drawLabelValue(doc, "Academic Year:", academicYear, 14, 51);
  drawLabelValue(doc, "Period:", periodLabel, 14, 58);

  const finalY = drawTable(doc, data.subjects, 68);

  const summaryY = finalY + 14;

  doc.setFont("helvetica", "normal");
  doc.text(
    `Weighted Average: ${
      data.generalAverage !== null ? data.generalAverage.toFixed(2) : "-"
    }`,
    14,
    summaryY
  );

  doc.text(
    `Best Score: ${
      data.bestScore !== null ? `${data.bestScore.toFixed(2)}/20` : "-"
    }`,
    14,
    summaryY + 7
  );

  doc.text(`Grades Count: ${data.gradesCount}`, 14, summaryY + 14);
  doc.text(`Coefficient Sum: ${data.coefficientSum}`, 14, summaryY + 21);
  doc.text(`Absences Count: ${data.absencesCount}`, 14, summaryY + 28);

  doc.save(`bulletin-${fullName.replace(/\s+/g, "-")}-${data.period}.pdf`);
}