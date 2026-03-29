const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "src", "assets", "fonts", "Amiri-Regular.ttf");
const outputPath = path.join(__dirname, "..", "src", "assets", "fonts", "AmiriCustom-normal.js");

if (!fs.existsSync(inputPath)) {
  console.error("Missing font file:", inputPath);
  process.exit(1);
}

const base64 = fs.readFileSync(inputPath).toString("base64");

const output = `import { jsPDF } from "jspdf";

const font = "${base64}";

const callAddFont = function () {
  this.addFileToVFS("Amiri-Regular.ttf", font);
  this.addFont("Amiri-Regular.ttf", "AmiriCustom", "normal");
};

jsPDF.API.events.push(["addFonts", callAddFont]);
`;

fs.writeFileSync(outputPath, output, "utf8");

console.log("Generated:", outputPath);