import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatementFile } from "../src/lib/statement-parser";
import { formatChatAnswer } from "../src/lib/format-chat-answer";
import { parseDisplayCurrency } from "../src/lib/display-currency";
import { formatCurrencyAmount } from "../src/lib/use-format-money";

function createPdf(lines: string[]) {
  const commands = ["BT", "/F1 10 Tf", "48 780 Td"];
  for (const [index, line] of lines.entries()) {
    if (index) commands.push("0 -18 Td");
    commands.push(`(${line.replace(/[\\()]/g, "\\$&")}) Tj`);
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(chunks.join("")));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1))
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );
  return Buffer.from(chunks.join(""), "ascii");
}

test("imports debit and credit transactions from a text PDF", async () => {
  const bytes = createPdf([
    "Date Description Debit Credit Balance",
    "01/10/2026 UPI SWIGGY 100.00 0.00 500.00",
    "02/10/2026 SALARY ACME 0.00 500.00 1000.00",
  ]);
  const file = new File([bytes], "statement.pdf", {
    type: "application/pdf",
  });
  const transactions = await parseStatementFile(file);

  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].direction, "debit");
  assert.equal(transactions[0].amount, 100);
  assert.equal(transactions[1].direction, "credit");
  assert.equal(transactions[1].amount, 500);
});

test("imports separate debit and credit columns when no balance is present", async () => {
  const bytes = createPdf([
    "Date Description Debit Credit",
    "01/10/2026 UPI SWIGGY 100.00 0.00",
    "02/10/2026 SALARY ACME 0.00 500.00",
  ]);
  const file = new File([bytes], "statement.pdf", {
    type: "application/pdf",
  });
  const transactions = await parseStatementFile(file);

  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].direction, "debit");
  assert.equal(transactions[0].amount, 100);
  assert.equal(transactions[1].direction, "credit");
  assert.equal(transactions[1].amount, 500);
});

test("imports bank statement rows with two-digit dates and reference columns", async () => {
  const bytes = createPdf([
    "Date Narration Cheq/Ref.No. Val Dt Withdrawal Amt. Deposit Amt. Closing Balance",
    "01/04/26 UPI-RECEIVED FROM PERSON PAYMENT FROM PHONE 0000258126640852 01/04/26 800.00 1061.91",
    "01/04/26 UPI-SWIGGY-ORDER 0000645722401811 01/04/26 349.00 757.91",
    "02/04/26 UPI-OTHER LONG DESCRIPTION",
    "0000645722401812 02/04/26 100.00 657.91",
  ]);
  const file = new File([bytes], "statement.pdf", {
    type: "application/pdf",
  });
  const transactions = await parseStatementFile(file);

  assert.equal(transactions.length, 3);
  assert.equal(transactions[0].date, "2026-04-01");
  assert.equal(transactions[0].amount, 800);
  assert.equal(transactions[1].direction, "debit");
  assert.equal(transactions[1].amount, 349);
  assert.equal(transactions[2].direction, "debit");
  assert.equal(transactions[2].amount, 100);
});

test("rejects PDFs with no selectable transaction text", async () => {
  const file = new File([createPdf([])], "scanned.pdf", {
    type: "application/pdf",
  });
  await assert.rejects(parseStatementFile(file), /text-based PDF|OCR/);
});

test("formats chat output into distinct rows and converts INR for display", () => {
  assert.deepEqual(
    formatChatAnswer("Top merchants: 1. Alpha - ₹100 2. Beta - ₹50"),
    ["Top merchants:", "1. Alpha - ₹100", "2. Beta - ₹50"],
  );
  assert.match(formatCurrencyAmount(1000, "USD", 0.012), /\$12\.00/);
  assert.match(formatCurrencyAmount(1000, "INR", 0.012), /₹1,000\.00/);
});

test("validates the display currency passed to analytics endpoints", () => {
  assert.deepEqual(
    parseDisplayCurrency(
      new Request(
        "https://complyra.test/api/copilot?currency=USD&exchangeRate=0.012",
      ),
    ),
    { currency: "USD", exchangeRate: 0.012 },
  );
  assert.deepEqual(
    parseDisplayCurrency(new Request("https://complyra.test/api/copilot")),
    { currency: "INR", exchangeRate: 1 },
  );
  assert.equal(
    parseDisplayCurrency(
      new Request(
        "https://complyra.test/api/copilot?currency=USD&exchangeRate=Infinity",
      ),
    ),
    null,
  );
  assert.equal(
    parseDisplayCurrency(
      new Request(
        "https://complyra.test/api/copilot?currency=USD&exchangeRate=2",
      ),
    ),
    null,
  );
});
