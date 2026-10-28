/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Patient,
  Medication,
  DoseSchedule,
  AdherenceLog,
  VitalRecord,
  VaccinationRecord,
  PrescriptionRecord,
  FirebaseConfig,
} from './types/pharmacy';
import { StorageService } from './services/storage';
import { playMedicalChime, startAlarmLoop, stopAlarmLoop, startAudioKeepAlive } from './services/alarmSound';
import { useOnlineStatus } from './hooks/useOnlineStatus';

import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardTab } from './components/DashboardTab';
import { PatientsTab } from './components/PatientsTab';
import { MedicationsTab } from './components/MedicationsTab';
import { SchedulesTab } from './components/SchedulesTab';
import { SettingsTab } from './components/SettingsTab';
import { AlarmModal } from './components/AlarmModal';
import { AIPharmacistModal } from './components/AIPharmacistModal';
import { DuaaModal } from './components/DuaaModal';
import { NotificationModal } from './components/NotificationModal';
import {
  getNotificationEngineStatus,
  NotificationEngineMode,
  syncAllMedicationAlarms,
  startPersistentAlarmTicker,
} from './services/notificationService';

import { Bot, Sparkles, WifiOff } from 'lucide-react';


export default function App() {
  const isOnline = useOnlineStatus();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Core State (Starts completely empty with 0 records)
  const [patients, setPatients] = useState<Patient[]>(() => StorageService.getPatients());
  const [medications, setMedications] = useState<Medication[]>(() => StorageService.getMedications());
  const [schedules, setSchedules] = useState<DoseSchedule[]>(() => StorageService.getSchedules());
  const [logs, setLogs] = useState<AdherenceLog[]>(() => StorageService.getLogs());
  const [vitals, setVitals] = useState<VitalRecord[]>(() => StorageService.getVitals());
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>(() => StorageService.getVaccinations());
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>(() => StorageService.getPrescriptions());
  const [duaaText, setDuaaText] = useState<string>(() => StorageService.getDuaaText());
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(() => StorageService.getFirebaseConfig());

  // Alarm modal state
  const [activeAlarmSchedule, setActiveAlarmSchedule] = useState<DoseSchedule | null>(null);

  // AI Pharmacist modal state
  const [isAIPharmacistOpen, setIsAIPharmacistOpen] = useState(false);
  const [aiInitialMedName, setAiInitialMedName] = useState<string | undefined>(undefined);
  const [aiInitialPatientId, setAiInitialPatientId] = useState<string | undefined>(undefined);

  // Duaa modal state
  const [isDuaaModalOpen, setIsDuaaModalOpen] = useState(false);

  // Notification Engine state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => getNotificationEngineStatus().enabled
  );
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    mode: NotificationEngineMode;
    message: string;
  }>({
    isOpen: false,
    mode: 'apk_inapp_mode',
    message: '',
  });

  // Snoozed alarms tracker: scheduleId -> trigger timestamp (epoch ms)
  const snoozedAlarmsRef = useRef<Record<string, number>>({});
  // Triggered today tracker to avoid re-firing within the same minute: scheduleId + '_' + dateStr + '_' + timeStr
  const triggeredTimesRef = useRef<Set<string>>(new Set());

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Persistent Dose Alarm Checker (Web Worker 5-Second Interval + Audio Keep-Alive)
  // -------------------------------------------------------------
  useEffect(() => {
    // Start silent audio keep-alive loop to prevent browser dormancy
    startAudioKeepAlive();

    const checkScheduleAlarms = () => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayDateStr = now.toISOString().split('T')[0];
      const nowMs = now.getTime();

      // Check each active schedule
      for (const schedule of schedules) {
        if (!schedule.isActive) continue;

        const triggerKey = `${schedule.id}_${todayDateStr}_${currentTimeStr}`;

        // 1. Check if snooze expired
        const snoozeTarget = snoozedAlarmsRef.current[schedule.id];
        const isSnoozeDue = snoozeTarget && nowMs >= snoozeTarget;

        // 2. Check scheduled time match
        const isTimeMatch = schedule.time === currentTimeStr && !triggeredTimesRef.current.has(triggerKey);

        if (isSnoozeDue || isTimeMatch) {
          triggeredTimesRef.current.add(triggerKey);
          if (isSnoozeDue) {
            delete snoozedAlarmsRef.current[schedule.id];
          }

          // Trigger continuous repeating loud siren
          if (schedule.soundEnabled) {
            startAlarmLoop();
          }

          // Trigger System Web Notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`حان موعد دواء: ${schedule.medicationName}`, {
                body: `المريض: ${schedule.patientName || 'غير محدد'} • الجرعة: ${schedule.doseAmount} وحدة`,
                icon: '/icon.svg',
              });
            } catch (err) {
              console.error('System notification error:', err);
            }
          }

          // Open In-App Unmissable Full-Screen Flashing Alarm
          setActiveAlarmSchedule(schedule);
          break; // Show one alarm at a time
        }
      }
    };

    // Initial check on mount
    checkScheduleAlarms();

    // 5-second persistent worker ticker
    const stopTicker = startPersistentAlarmTicker(checkScheduleAlarms);

    return () => {
      stopTicker();
    };
  }, [schedules]);

  // -------------------------------------------------------------
  // Dose Actions (Take, Snooze, Skip)
  // -------------------------------------------------------------
  const handleTakeDose = (schedule: DoseSchedule) => {
    stopAlarmLoop();

    // 1. Deduct dose quantity from stock
    const updatedMeds = medications.map((m) => {
      if (m.id === schedule.medicationId) {
        const newQty = Math.max(0, m.currentQuantity - (schedule.doseAmount || 1));
        return { ...m, currentQuantity: newQty };
      }
      return m;
    });

    setMedications(updatedMeds);
    StorageService.saveMedications(updatedMeds);

    // 2. Add adherence log entry
    const newLog: AdherenceLog = {
      id: 'log_' + Date.now(),
      scheduleId: schedule.id,
      medicationId: schedule.medicationId,
      medicationName: schedule.medicationName,
      patientId: schedule.patientId,
      patientName: schedule.patientName,
      status: 'taken',
      doseAmount: schedule.doseAmount || 1,
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    StorageService.saveLogs(updatedLogs);

    setActiveAlarmSchedule(null);
  };

  const handleSnoozeDose = (schedule: DoseSchedule) => {
    stopAlarmLoop();

    // Snooze for exactly 10 minutes (600,000 ms)
    snoozedAlarmsRef.current[schedule.id] = Date.now() + 10 * 60 * 1000;

    const newLog: AdherenceLog = {
      id: 'log_' + Date.now(),
      scheduleId: schedule.id,
      medicationId: schedule.medicationId,
      medicationName: schedule.medicationName,
      patientId: schedule.patientId,
      patientName: schedule.patientName,
      status: 'snoozed',
      doseAmount: schedule.doseAmount || 1,
      timestamp: new Date().toISOString(),
      notes: 'تم تفعيل غفوة لمدة 10 دقائق',
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    StorageService.saveLogs(updatedLogs);

    setActiveAlarmSchedule(null);
  };

  const handleSkipDose = (schedule: DoseSchedule, reason?: string) => {
    stopAlarmLoop();

    const newLog: AdherenceLog = {
      id: 'log_' + Date.now(),
      scheduleId: schedule.id,
      medicationId: schedule.medicationId,
      medicationName: schedule.medicationName,
      patientId: schedule.patientId,
      patientName: schedule.patientName,
      status: 'missed',
      doseAmount: schedule.doseAmount || 1,
      timestamp: new Date().toISOString(),
      notes: reason || 'تم تخطي الجرعة',
    };

    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    StorageService.saveLogs(updatedLogs);

    setActiveAlarmSchedule(null);
  };

  const handleTestAlarm = (schedule: DoseSchedule) => {
    startAlarmLoop();
    setActiveAlarmSchedule(schedule);
  };

  // -------------------------------------------------------------
  // Data State Handlers
  // -------------------------------------------------------------
  const handleSavePatient = (patient: Patient) => {
    const exists = patients.some((p) => p.id === patient.id);
    const updated = exists ? patients.map((p) => (p.id === patient.id ? patient : p)) : [...patients, patient];
    setPatients(updated);
    StorageService.savePatients(updated);
  };

  const handleDeletePatient = (id: string) => {
    const updated = patients.filter((p) => p.id !== id);
    setPatients(updated);
    StorageService.savePatients(updated);
  };

  const handleSaveMedication = (med: Medication) => {
    const exists = medications.some((m) => m.id === med.id);
    const updated = exists ? medications.map((m) => (m.id === med.id ? med : m)) : [...medications, med];
    setMedications(updated);
    StorageService.saveMedications(updated);
  };

  const handleDeleteMedication = (id: string) => {
    const updated = medications.filter((m) => m.id !== id);
    setMedications(updated);
    StorageService.saveMedications(updated);
  };

  const handleSaveSchedule = (sch: DoseSchedule) => {
    const exists = schedules.some((s) => s.id === sch.id);
    const updated = exists ? schedules.map((s) => (s.id === sch.id ? sch : s)) : [...schedules, sch];
    setSchedules(updated);
    StorageService.saveSchedules(updated);
    syncAllMedicationAlarms(updated);
  };

  const handleDeleteSchedule = (id: string) => {
    const updated = schedules.filter((s) => s.id !== id);
    setSchedules(updated);
    StorageService.saveSchedules(updated);
    syncAllMedicationAlarms(updated);
  };

  const handleToggleScheduleActive = (id: string, active: boolean) => {
    const updated = schedules.map((s) => (s.id === id ? { ...s, isActive: active } : s));
    setSchedules(updated);
    StorageService.saveSchedules(updated);
    syncAllMedicationAlarms(updated);
  };

  const handleSaveVital = (vital: VitalRecord) => {
    const updated = [...vitals, vital];
    setVitals(updated);
    StorageService.saveVitals(updated);
  };

  const handleSaveVaccination = (vac: VaccinationRecord) => {
    const updated = [...vaccinations, vac];
    setVaccinations(updated);
    StorageService.saveVaccinations(updated);
  };

  const handleSavePrescription = (rx: PrescriptionRecord) => {
    const updated = [...prescriptions, rx];
    setPrescriptions(updated);
    StorageService.savePrescriptions(updated);
  };

  const handleSaveDuaa = (text: string) => {
    setDuaaText(text);
    StorageService.saveDuaaText(text);
  };

  const handleSaveFirebaseConfig = (config: FirebaseConfig | null) => {
    setFirebaseConfig(config);
    StorageService.saveFirebaseConfig(config);
  };

  // Reload all states from storage (used after restore or wipe)
  const reloadAllDataFromStorage = () => {
    setPatients(StorageService.getPatients());
    setMedications(StorageService.getMedications());
    setSchedules(StorageService.getSchedules());
    setLogs(StorageService.getLogs());
    setVitals(StorageService.getVitals());
    setVaccinations(StorageService.getVaccinations());
    setPrescriptions(StorageService.getPrescriptions());
    setDuaaText(StorageService.getDuaaText());
    setFirebaseConfig(StorageService.getFirebaseConfig());
  };

  const handleDataReset = () => {
    reloadAllDataFromStorage();
  };

  const handleSeedDemoData = () => {
    StorageService.seedDemoData();
    reloadAllDataFromStorage();
  };

  // Compute pending doses and low stock for navigation badges
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTakenIds = new Set(
    logs.filter((l) => l.status === 'taken' && l.timestamp.startsWith(todayStr)).map((l) => l.scheduleId)
  );
  const pendingDosesCount = schedules.filter((s) => s.isActive && !todayTakenIds.has(s.id)).length;
  const lowStockCount = medications.filter((m) => m.currentQuantity <= m.lowStockThreshold).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-teal-600 selection:text-white" dir="rtl">
      {/* Top Header */}
      <Header
        duaaText={duaaText}
        onOpenDuaaModal={() => setIsDuaaModalOpen(true)}
        onOpenSettings={() => setActiveTab('more')}
        isCloudConnected={!!firebaseConfig && isOnline}
        notificationsActive={notificationsEnabled}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5">
        {activeTab === 'dashboard' && (
          <DashboardTab
            patients={patients}
            medications={medications}
            schedules={schedules}
            logs={logs}
            vaccinations={vaccinations}
            notificationsEnabled={notificationsEnabled}
            onNotificationsStateChange={(enabled) => setNotificationsEnabled(enabled)}
            onShowNotificationModal={(mode, msg) =>
              setNotificationModal({ isOpen: true, mode, message: msg })
            }
            onTakeDose={handleTakeDose}
            onSnoozeDose={handleSnoozeDose}
            onOpenAIPharmacist={() => {
              setAiInitialMedName(undefined);
              setIsAIPharmacistOpen(true);
            }}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenAddSchedule={() => {
              setActiveTab('schedules');
            }}
          />
        )}

        {activeTab === 'patients' && (
          <PatientsTab
            patients={patients}
            vitals={vitals}
            vaccinations={vaccinations}
            prescriptions={prescriptions}
            onSavePatient={handleSavePatient}
            onDeletePatient={handleDeletePatient}
            onSaveVital={handleSaveVital}
            onSaveVaccination={handleSaveVaccination}
            onSavePrescription={handleSavePrescription}
          />
        )}

        {activeTab === 'medications' && (
          <MedicationsTab
            medications={medications}
            patients={patients}
            onSaveMedication={handleSaveMedication}
            onDeleteMedication={handleDeleteMedication}
          />
        )}

        {activeTab === 'schedules' && (
          <SchedulesTab
            schedules={schedules}
            medications={medications}
            patients={patients}
            logs={logs}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onToggleScheduleActive={handleToggleScheduleActive}
            onTestAlarm={handleTestAlarm}
          />
        )}

        {activeTab === 'more' && (
          <SettingsTab
            firebaseConfig={firebaseConfig}
            onSaveFirebaseConfig={handleSaveFirebaseConfig}
            onDataReset={handleDataReset}
            onSeedDemoData={handleSeedDemoData}
            onBackupRestored={reloadAllDataFromStorage}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) for Smart AI Pharmacist & Drug Interaction Checker */}
      <div className="fixed bottom-20 left-4 z-40">
        <button
          onClick={() => {
            setAiInitialMedName(undefined);
            setIsAIPharmacistOpen(true);
          }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs shadow-xl shadow-teal-900/35 border-2 border-teal-300/60 transition transform active:scale-95 cursor-pointer group"
          title="فاحص التداخلات الدوائية بالذكاء الاصطناعي"
          aria-label="فاحص التداخلات الدوائية بالذكاء الاصطناعي"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-teal-200 group-hover:scale-110 transition-transform" />
            <Sparkles className="w-2.5 h-2.5 text-yellow-300 absolute -top-1 -right-1" />
          </div>
          <span className="hidden sm:inline-block font-black text-[13px] tracking-tight">
            فاحص التداخلات الذكي ✨
          </span>
          <span className="sm:hidden font-black text-xs">فاحص الدواء</span>
        </button>
      </div>

      {/* Offline Toast Indicator when connection is lost */}
      {!isOnline && (
        <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-2xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl animate-bounce">
          <WifiOff className="w-4 h-4" />
          <span>يعمل بدون إنترنت (تخزين محلي مؤمن)</span>
        </div>
      )}

      {/* Interactive Dose Alarm Modal */}
      {activeAlarmSchedule && (
        <AlarmModal
          schedule={activeAlarmSchedule}
          onTakeDose={handleTakeDose}
          onSnooze={handleSnoozeDose}
          onSkipDose={handleSkipDose}
          onClose={() => {
            stopAlarmLoop();
            setActiveAlarmSchedule(null);
          }}
        />
      )}

      {/* AI Pharmacist Interaction Checker Modal */}
      <AIPharmacistModal
        isOpen={isAIPharmacistOpen}
        onClose={() => setIsAIPharmacistOpen(false)}
        patients={patients}
        medications={medications}
        initialMedicationName={aiInitialMedName}
        initialPatientId={aiInitialPatientId}
      />

      {/* Duaa Selection / Customization Modal */}
      <DuaaModal
        isOpen={isDuaaModalOpen}
        onClose={() => setIsDuaaModalOpen(false)}
        currentDuaa={duaaText}
        onSaveDuaa={handleSaveDuaa}
      />

      {/* Universal Notification & Alarm Status / Test Modal */}
      <NotificationModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal((prev) => ({ ...prev, isOpen: false }))}
        mode={notificationModal.mode}
        message={notificationModal.message}
      />

      {/* Bottom 5-Tab Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        pendingDosesCount={pendingDosesCount}
        lowStockCount={lowStockCount}
      />
    </div>
  );
}
