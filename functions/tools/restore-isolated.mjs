import { readFile, stat } from "node:fs/promises";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { decryptArchive, normalizedArchive } from "../lib/recovery.mjs";
const args = process.argv.slice(2);
const file = args[0];
const target = args[args.indexOf("--project") + 1];
const host = process.env.FIRESTORE_EMULATOR_HOST || "";
if (
  !file ||
  !target?.startsWith("demo-") ||
  !/^((127\.0\.0\.1)|(localhost)):\d+$/.test(host)
)
  throw Error(
    "Recuperação permitida exclusivamente em emulador local e projeto demo-.",
  );
if (!process.env.BACKUP_PASSPHRASE)
  throw Error("Senha de recuperação ausente.");
if ((await stat(file)).size > 70 * 1024 * 1024)
  throw Error("Arquivo excede o limite de segurança.");
let payload = decryptArchive(
  JSON.parse(await readFile(file, "utf8")),
  process.env.BACKUP_PASSPHRASE,
);
if (args.includes("--legacy-local")) {
  const legacy = payload.data?.legacyRecovery;
  if (!legacy) throw Error("Arquivo sem cópia local anterior à migração.");
  const get = (k) => JSON.parse(legacy["ana_lima_" + k + "_v1"] || "null");
  payload = {
    data: {
      patients: get("patients"),
      sessions: get("sessions"),
      clinicalRecords: get("records"),
      assessments: get("assessments"),
      payments: get("payments"),
      settings: get("settings"),
      anamnesis: get("anamnesis"),
    },
  };
}
const data = normalizedArchive(payload);
const db = getFirestore(initializeApp({ projectId: target }));
const root = db.collection("users").doc("psHLxoIeGfRNqQSwTbPUVxFCU8H2");
try {
  const counts = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v.length]),
  );
  if (!args.includes("--apply"))
    console.log(JSON.stringify({ status: "dry_run", target, counts }));
  else {
    for (const name of Object.keys(data))
      if (!(await root.collection(name).limit(1).get()).empty)
        throw Error(
          "Destino contém dados; a ferramenta não sobrescreve nem apaga.",
        );
    let batch = db.batch(),
      size = 0;
    for (const [name, rows] of Object.entries(data))
      for (const row of rows) {
        const { id, ...value } = row;
        batch.create(root.collection(name).doc(id), { ...value, id });
        if (++size === 400) {
          await batch.commit();
          batch = db.batch();
          size = 0;
        }
      }
    if (size) await batch.commit();
    for (const [name, rows] of Object.entries(data)) {
      const recovered = await root.collection(name).get();
      if (recovered.size !== rows.length)
        throw Error("Contagens divergentes na recuperação.");
      for (const row of rows) {
        const value = recovered.docs.find((d) => d.id === row.id)?.data();
        if (JSON.stringify(value) !== JSON.stringify(row)) {
          const sort = (v) =>
            Array.isArray(v)
              ? v.map(sort)
              : v && typeof v === "object"
                ? Object.fromEntries(
                    Object.keys(v)
                      .sort()
                      .map((k) => [k, sort(v[k])]),
                  )
                : v;
          const canonical = (v) => JSON.stringify(sort(v));
          if (canonical(value) !== canonical(row))
            throw Error("Conteúdo divergente na recuperação.");
        }
      }
    }
    console.log(
      JSON.stringify({ status: "restored_and_verified", target, counts }),
    );
  }
} finally {
  await db.terminate();
}
