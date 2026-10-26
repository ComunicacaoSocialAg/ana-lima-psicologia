import React from "react";
import { useApp } from "../../context/AppContext";
import { AuthModal } from "../auth/AuthModal";
import { authService } from "../../services/authService";
import { OWNER_UID } from "../auth/AccessGate";
export function LockScreen() {
  const { unlockApp } = useApp();
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950">
      <AuthModal
        isOpen
        onClose={() => {}}
        onSuccess={() => {
          if (authService.getCurrentUser()?.uid === OWNER_UID) unlockApp();
        }}
      />
    </div>
  );
}
