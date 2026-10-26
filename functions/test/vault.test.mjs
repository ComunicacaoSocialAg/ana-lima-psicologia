import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { transform } from "esbuild";
class Store {
  map = new Map();
  getItem(k) {
    return this.map.get(k) ?? null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
}
let serial = 0;
async function setup() {
  globalThis.localStorage = new Store();
  globalThis.sessionStorage = new Store();
  globalThis.window = new EventTarget();
  const source = await readFile(
    new URL("../../src/services/localVaultCrypto.ts", import.meta.url),
    "utf8",
  );
  const { code } = await transform(source, {
    loader: "ts",
    format: "esm",
    target: "es2022",
  });
  return import(
    "data:text/javascript;base64," +
      Buffer.from(code + `\n//${serial++}`).toString("base64")
  );
}
test("vault rejects locked writes and stores neither raw keys nor plaintext", async () => {
  const v = await setup();
  await assert.rejects(v.vaultSetItem("ana_lima_patients_v1", "secret"));
  await v.unlockVault("SenhaSinteticaSegura#123");
  await v.vaultSetItem(
    "ana_lima_patients_v1",
    '[{"name":"Clinical synthetic"}]',
  );
  await v.flushVault();
  for (const [k, s] of localStorage.map) {
    assert.ok(!k.includes("session_key"));
    assert.ok(!s.includes("Clinical synthetic"));
  }
  assert.match(
    await v.vaultGetItem("ana_lima_patients_v1"),
    /Clinical synthetic/,
  );
  v.clearSessionVaultKey();
  await assert.rejects(v.unlockVault("OutraSenhaSegura#456"));
  await v.unlockVault("SenhaSinteticaSegura#123");
  assert.match(
    await v.vaultGetItem("ana_lima_patients_v1"),
    /Clinical synthetic/,
  );
});
test("legacy source survives migration until recovery is explicitly confirmed", async () => {
  const v = await setup();
  const source = '[{"id":"synthetic","name":"Recovery copy"}]';
  localStorage.setItem("ana_lima_patients_v1", source);
  await v.unlockVault("SenhaSinteticaSegura#123");
  assert.equal(localStorage.getItem("ana_lima_patients_v1"), source);
  assert.equal(v.getLegacyRecovery().ana_lima_patients_v1, source);
  await v.vaultSetItem("ana_lima_patients_v1", "[]");
  assert.equal(v.getLegacyRecovery().ana_lima_patients_v1, source);
  await v.finalizeLegacyMigration();
  assert.equal(localStorage.getItem("ana_lima_patients_v1"), null);
  assert.equal(v.getLegacyRecovery().ana_lima_patients_v1, source);
});
test("legacy ciphertext without its key fails without erasing sources", async () => {
  const v = await setup();
  const legacy = JSON.stringify({ _vault: true, iv: "AAAA", data: "BBBB" });
  localStorage.setItem("ana_lima_patients_v1", legacy);
  await assert.rejects(v.unlockVault("SenhaSinteticaSegura#123"));
  assert.equal(localStorage.getItem("ana_lima_patients_v1"), legacy);
  assert.equal(v.hasVault(), false);
});
test("quota/encryption failures never fall back to plaintext", async () => {
  const v = await setup();
  await v.unlockVault("SenhaSinteticaSegura#123");
  localStorage.setItem = () => {
    throw Error("Quota exceeded");
  };
  await assert.rejects(
    v.vaultSetItem("ana_lima_patients_v1", "sensitive payload"),
  );
  assert.equal(localStorage.getItem("ana_lima_patients_v1"), null);
});
test("acknowledging an older operation never drops a newer encrypted edit", async () => {
  const v = await setup();
  await v.unlockVault("SenhaSinteticaSegura#123");
  const first = await v.enqueueOutbox("record", "r1", {
    evolution: "first synthetic edit",
  });
  const second = await v.enqueueOutbox("record", "r1", {
    evolution: "newer synthetic edit",
  });
  await v.acknowledgeOutbox(first);
  assert.equal(v.listOutbox().length, 1);
  assert.equal(v.listOutbox()[0].token, second);
  v.clearSessionVaultKey();
  await v.unlockVault("SenhaSinteticaSegura#123");
  assert.equal(v.listOutbox()[0].data.evolution, "newer synthetic edit");
  await v.acknowledgeOutbox(second);
  assert.equal(v.listOutbox().length, 0);
});
test("interrupted first migration can be retried while originals remain intact", async () => {
  const v = await setup();
  const source = '[{"id":"synthetic","name":"Preserve original"}]';
  localStorage.setItem("ana_lima_patients_v1", source);
  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (k, value) => {
    if (k === "ana_lima_secure_v2_meta") throw Error("Synthetic interruption");
    original(k, value);
  };
  await assert.rejects(v.unlockVault("FirstSyntheticPassword#123"));
  localStorage.setItem = original;
  await v.unlockVault("SecondSyntheticPassword#123");
  assert.equal(await v.vaultGetItem("ana_lima_patients_v1"), source);
  assert.equal(localStorage.getItem("ana_lima_patients_v1"), source);
});
