import {
  waitForPendingWrites,
  terminate,
  clearIndexedDbPersistence,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { cloudSyncService } from "../../services/cloudSyncService";
import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  hasLegacyData,
  finalizeLegacyMigration,
  flushVault,
} from "../../services/localVaultCrypto";
export function SecurityNotice() {
  const { syncStatus, triggerEncryptedBackup, currentUser } = useApp();
  const [legacy, setLegacy] = useState(
    () =>
      hasLegacyData() ||
      localStorage.getItem("ana_lima_legacy_firestore_pending") === "true",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    const fail = () =>
      setError(
        "Uma gravação falhou. Mantenha esta aba aberta e gere um backup criptografado antes de recarregar.",
      );
    window.addEventListener("clinica-sync-error", fail);
    window.addEventListener("clinica-storage-error", fail);
    return () => {
      window.removeEventListener("clinica-sync-error", fail);
      window.removeEventListener("clinica-storage-error", fail);
    };
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (syncStatus !== "synced" || error) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [syncStatus, error]);
  return (
    <>
      {error && (
        <div role="alert" className="p-3 bg-rose-100 text-rose-900">
          {error}{" "}
          <button
            className="underline"
            onClick={async () => {
              if (!currentUser) return;
              setError("");
              window.dispatchEvent(new Event("clinica-sync-retry"));
              await cloudSyncService.seedLocalDataToCloud(currentUser.uid);
            }}
          >
            Tentar sincronizar pendências
          </button>
        </div>
      )}
      {legacy && (
        <div className="p-3 bg-amber-100 text-amber-950">
          Existem cópias antigas neste navegador. Após conferir os dados
          sincronizados, gere uma recuperação criptografada para concluir a
          proteção.{" "}
          <button
            className="underline"
            onClick={async () => {
              const pass = window.prompt(
                "Senha de pelo menos 12 caracteres para o arquivo de recuperação:",
              );
              if (!pass) return;
              try {
                if (pass.length < 12)
                  throw Error("Use pelo menos 12 caracteres.");
                if (syncStatus !== "synced")
                  throw Error("Aguarde a sincronização antes de concluir.");
                await triggerEncryptedBackup(pass);
                await flushVault();
                if (
                  window.confirm(
                    "Confirme que o arquivo de recuperação foi salvo antes de remover as cópias antigas deste navegador.",
                  )
                ) {
                  await finalizeLegacyMigration();
                  localStorage.setItem(
                    "ana_lima_legacy_firestore_pending",
                    "true",
                  );
                  if (db) {
                    await waitForPendingWrites(db);
                    await terminate(db);
                    try {
                      await clearIndexedDbPersistence(db);
                      localStorage.removeItem(
                        "ana_lima_legacy_firestore_pending",
                      );
                    } catch {
                      window.alert(
                        "Feche as outras abas antigas do sistema. A limpeza do cache anterior será retomada na próxima abertura.",
                      );
                    }
                  }
                  window.location.reload();
                }
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Gerar recuperação e concluir
          </button>
        </div>
      )}
    </>
  );
}
