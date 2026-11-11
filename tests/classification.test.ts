import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyTransaction,
  classifyTransactions,
  merchantKey,
} from "../src/lib/categorization";
import { parseCSV } from "../src/lib/statement-parser";
import { statementStatus } from "../src/lib/reminders";
import { hashPassword, verifyPassword } from "../src/lib/auth";
const base = {
  id: "one",
  date: "2026-10-01",
  merchant: "Shell",
  amount: 400,
  category: "Other",
  employee: "",
  department: "",
};
test("Indian merchant names retain distinct identities", () => {
  assert.notEqual(merchantKey("मोहन"), merchantKey("सोहन"));
  assert.notEqual(merchantKey("मोहन"), "");
});
test("merchant boundaries, ambiguity and learned rules", async () => {
  assert.equal(classifyTransaction(base).category, "Fuel");
  assert.equal(
    classifyTransaction({ ...base, merchant: "seashell collectibles" })
      .category,
    "Other",
  );
  assert.equal(
    classifyTransaction({ ...base, merchant: "Uber Swiggy" }).needsReview,
    true,
  );
  assert.equal(
    classifyTransaction({ ...base, merchant: "Swiggy", category: "Travel" })
      .needsReview,
    true,
  );
  assert.equal(
    classifyTransaction(
      { ...base, merchant: "UPI Mystery" },
      { "upi mystery": "Rent" },
    ).category,
    "Rent",
  );
  const records = await classifyTransactions(
    [base, { ...base, id: "two" }],
    {},
    false,
  );
  assert.ok(
    records.every(
      (record) =>
        record.needsReview &&
        record.reviewReasons.some((reason) => reason.includes("duplicate")),
    ),
  );
});
test("CSV handles quoted descriptions, debit/credit and invalid dates", () => {
  const rows = parseCSV(
    'date,narration,debit,credit\n31/10/2026,"Office, supplies",100,\n2026-10-30,Salary,,2000',
  );
  assert.equal(rows[0].merchant, "Office, supplies");
  assert.equal(rows[0].date, "2026-10-31");
  assert.equal(rows[1].direction, "credit");
  assert.throws(
    () => parseCSV("date,merchant,amount\n31/02/2026,Swiggy,100"),
    /Invalid/,
  );
  assert.throws(
    () => parseCSV("date,merchant,amount\n2026-02-31,Swiggy,100"),
    /Invalid/,
  );
  assert.throws(
    () => parseCSV("date,merchant,amount,currency\n2026-10-01,Swiggy,100,USD"),
    /Only INR/,
  );
  assert.throws(
    () => parseCSV("date,merchant,amount\n2026-10-01,Swiggy,100abc"),
    /Invalid amount/,
  );
  assert.equal(
    parseCSV('date,merchant,amount\n2026-10-01,Swiggy,"₹1,200.50"')[0].amount,
    1200.5,
  );
  assert.throws(
    () => parseCSV("date,merchant,amount\n,Swiggy,100"),
    /valid date/,
  );
  assert.throws(
    () => parseCSV("date,merchant,debit,credit\n2026-10-01,Swiggy,100,200"),
    /both debit and credit/,
  );
});
test("statement update interval is exactly 24 hours", () => {
  const start = "2026-10-01T04:30:00.000Z";
  assert.equal(statementStatus(null, start).dueAt, "2026-10-02T04:30:00.000Z");
  assert.equal(
    statementStatus("2026-10-05T04:30:00.000Z", start).dueAt,
    "2026-10-06T04:30:00.000Z",
  );
});

test("passwords use unique salts and reject incorrect passwords", async () => {
  const password = "A synthetic test-only passphrase";
  const [first, second] = await Promise.all([
    hashPassword(password),
    hashPassword(password),
  ]);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong passphrase", first), false);
  assert.equal(await verifyPassword(password, "invalid-hash"), false);
});
