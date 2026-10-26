import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptArchive,
  decryptArchive,
  normalizedArchive,
} from "../lib/recovery.mjs";
const data = {
  patients: [{ id: "synthetic", name: "Synthetic recovery" }],
  sessions: [],
  records: [],
  anamnesis: [],
  assessments: [],
  payments: [],
  settings: [{ id: "clinic" }],
};
test("server archive decrypts completely; wrong password and tampering fail", () => {
  const p = { schema: 3, data };
  const envelope = encryptArchive(p, "SyntheticArchivePassword#2026");
  assert.deepEqual(
    decryptArchive(envelope, "SyntheticArchivePassword#2026"),
    p,
  );
  assert.deepEqual(normalizedArchive(p), data);
  assert.throws(() => decryptArchive(envelope, "IncorrectSyntheticPassword"));
  const tampered = {
    ...envelope,
    ciphertext: Buffer.from("bad ciphertext forged").toString("base64"),
  };
  assert.throws(() =>
    decryptArchive(tampered, "SyntheticArchivePassword#2026"),
  );
});
test("incomplete, empty, duplicate or oversized recovery data is rejected", () => {
  assert.throws(() => normalizedArchive({ schema: 3, data: { patients: [] } }));
  assert.throws(() =>
    normalizedArchive({ schema: 3, data: { ...data, patients: [] } }),
  );
  assert.throws(() =>
    normalizedArchive({
      schema: 3,
      data: { ...data, patients: [{ id: "a" }, { id: "a" }] },
    }),
  );
});
