import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { LockScreen } from './components/layout/LockScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { ScheduleView } from './components/schedule/ScheduleView';
import { PatientsView } from './components/patients/PatientsView';
import { PatientDetailView } from './components/patients/PatientDetailView';
import { FinancialView } from './components/financial/FinancialView';
import { SettingsView } from './components/settings/SettingsView';
import { SessionModal } from './components/schedule/SessionModal';
import { PatientModal } from './components/patients/PatientModal';
import { PatientIntakeView } from './components/intake/PatientIntakeView';
import { EventCalendarView } from './components/calendar/EventCalendarView';
import { AuthModal } from './components/auth/AuthModal';
import { IntakeToastAlert } from './components/notifications/IntakeToastAlert';
import { IntakeReviewModal } from './components/intake/IntakeReviewModal';
import { SystemUpdateAlert } from './components/notifications/SystemUpdateAlert';

const checkIsIntakeRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path.startsWith('/cadastro') ||
    path.startsWith('/pre-cadastro') ||
    search.includes('cadastro') ||
    hash.includes('cadastro')
  );
};

const checkIsEventRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path.startsWith('/evento') ||
    path.startsWith('/agendar') ||
    search.includes('evento') ||
    hash.includes('evento')
  );
};

const MainLayout: React.FC = () => {
  const { 
    currentView, 
    isLocked, 
    isAuthModalOpen, 
    closeAuthModal,
    reviewingPatient,
    openReviewPatient,
    closeReviewPatient,
    intakeToastPatient,
    dismissIntakeToast,
    isNewSessionModalOpen,
    defaultSessionPatientId,
    openNewSessionModal,
    closeNewSessionModal
  } = useApp();

  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-800">
      {/* Alerta Nativo & Banner de Atualização do Sistema (Android / PC) */}
      <SystemUpdateAlert />

      {/* Alerta Toast Flutuante de Novo Pré-Cadastro */}
      <IntakeToastAlert 
        patient={intakeToastPatient}
        onReview={(patient) => openReviewPatient(patient)}
        onDismiss={dismissIntakeToast}
      />

      {/* Modal de Inspeção Completa do Pré-Cadastro */}
      <IntakeReviewModal 
        isOpen={!!reviewingPatient}
        patient={reviewingPatient}
        onClose={closeReviewPatient}
        onScheduleSession={(patientId) => openNewSessionModal(patientId)}
        onOpenWhatsApp={(patient) => {
          const firstName = patient.name.split(' ')[0];
          const cleanPhone = patient.phone.replace(/\D/g, '');
          const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const text = `Olá, ${firstName}! Aqui é a psicóloga Ana Lima (CRP 04/60205).\n\nRecebi sua ficha de pré-cadastro em meu consultório em Poços de Caldas, MG com total sigilo. Já estou organizando os horários da semana!\n\nVamos agendar seu primeiro atendimento? Quais dias e turnos ficam melhores para você?`;
          window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
        }}
      />

      {/* Tela de Bloqueio por Inatividade */}
      {isLocked && <LockScreen />}

      {/* Barra Lateral Fixa (Desktop) */}
      <Sidebar />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header com suporte a Safe Area do iPhone/Android */}
        <Header 
          onNewSessionClick={() => openNewSessionModal()}
          onNewPatientClick={() => setIsNewPatientModalOpen(true)}
        />

        {/* Banner de Instalação PWA no Android/Mobile */}
        <PwaInstallPrompt />

        <main className="flex-1 overflow-y-auto bg-slate-50/70 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-12">
          {currentView === 'dashboard' && (
            <DashboardView 
              onNewSessionClick={() => openNewSessionModal()}
              onNewPatientClick={() => setIsNewPatientModalOpen(true)}
            />
          )}

          {currentView === 'schedule' && (
            <ScheduleView 
              onNewSessionClick={() => openNewSessionModal()}
            />
          )}

          {currentView === 'patients' && (
            <PatientsView 
              onNewPatientClick={() => setIsNewPatientModalOpen(true)}
            />
          )}

          {currentView === 'patient-detail' && (
            <PatientDetailView />
          )}

          {currentView === 'financial' && (
            <FinancialView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>

        {/* Barra de Navegação Inferior (Mobile / Android) */}
        <BottomNav />
      </div>

      {/* Modais Globais de Ação Rápida */}
      {isNewSessionModalOpen && (
        <SessionModal 
          isOpen={isNewSessionModalOpen}
          onClose={closeNewSessionModal}
          defaultPatientId={defaultSessionPatientId || undefined}
        />
      )}

      {isNewPatientModalOpen && (
        <PatientModal 
          isOpen={isNewPatientModalOpen}
          onClose={() => setIsNewPatientModalOpen(false)}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
        />
      )}
    </div>
  );
};

export function App() {
  const [isIntake, setIsIntake] = useState(checkIsIntakeRoute);
  const [isEvent, setIsEvent] = useState(checkIsEventRoute);

  React.useEffect(() => {
    const handlePopState = () => {
      setIsIntake(checkIsIntakeRoute());
      setIsEvent(checkIsEventRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (isIntake) {
    return <PatientIntakeView />;
  }

  if (isEvent) {
    return <EventCalendarView />;
  }

  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
