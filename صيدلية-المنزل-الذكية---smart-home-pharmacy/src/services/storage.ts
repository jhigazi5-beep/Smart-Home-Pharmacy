/**
 * Offline-First Structured Storage Service + Firebase Cloud Sync.
 * Initializes with ZERO mock data on startup.
 */

import {
  Patient,
  Medication,
  DoseSchedule,
  AdherenceLog,
  VitalRecord,
  VaccinationRecord,
  PrescriptionRecord,
  FirebaseConfig,
} from '../types/pharmacy';
import { clearAllLocalPhotos } from './localPhotoStorage';

const KEYS = {
  PATIENTS: 'sph_patients_v1',
  MEDICATIONS: 'sph_medications_v1',
  SCHEDULES: 'sph_schedules_v1',
  LOGS: 'sph_logs_v1',
  VITALS: 'sph_vitals_v1',
  VACCINATIONS: 'sph_vaccinations_v1',
  PRESCRIPTIONS: 'sph_prescriptions_v1',
  FIREBASE_CONFIG: 'sph_firebase_config_v1',
  DUAA: 'sph_duaa_text_v1',
  SETTINGS: 'sph_settings_v1',
};

export const DEFAULT_DUAA = 'اللهم رب الناس، أذهب الباس، واشف أنت الشافي، لا شفاء إلا شفاؤك، شفاءً لا يغادر سقماً';

// Helper for localStorage
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

export const StorageService = {
  // --- Zero Mock Data: All getters return empty arrays if no user data ---
  getPatients(): Patient[] {
    return getLocalItem<Patient[]>(KEYS.PATIENTS, []);
  },
  savePatients(patients: Patient[]): void {
    setLocalItem(KEYS.PATIENTS, patients);
  },

  getMedications(): Medication[] {
    return getLocalItem<Medication[]>(KEYS.MEDICATIONS, []);
  },
  saveMedications(medications: Medication[]): void {
    setLocalItem(KEYS.MEDICATIONS, medications);
  },

  getSchedules(): DoseSchedule[] {
    return getLocalItem<DoseSchedule[]>(KEYS.SCHEDULES, []);
  },
  saveSchedules(schedules: DoseSchedule[]): void {
    setLocalItem(KEYS.SCHEDULES, schedules);
  },

  getLogs(): AdherenceLog[] {
    return getLocalItem<AdherenceLog[]>(KEYS.LOGS, []);
  },
  saveLogs(logs: AdherenceLog[]): void {
    setLocalItem(KEYS.LOGS, logs);
  },

  getVitals(): VitalRecord[] {
    return getLocalItem<VitalRecord[]>(KEYS.VITALS, []);
  },
  saveVitals(vitals: VitalRecord[]): void {
    setLocalItem(KEYS.VITALS, vitals);
  },

  getVaccinations(): VaccinationRecord[] {
    return getLocalItem<VaccinationRecord[]>(KEYS.VACCINATIONS, []);
  },
  saveVaccinations(vaccinations: VaccinationRecord[]): void {
    setLocalItem(KEYS.VACCINATIONS, vaccinations);
  },

  getPrescriptions(): PrescriptionRecord[] {
    return getLocalItem<PrescriptionRecord[]>(KEYS.PRESCRIPTIONS, []);
  },
  savePrescriptions(prescriptions: PrescriptionRecord[]): void {
    setLocalItem(KEYS.PRESCRIPTIONS, prescriptions);
  },

  getFirebaseConfig(): FirebaseConfig | null {
    return getLocalItem<FirebaseConfig | null>(KEYS.FIREBASE_CONFIG, null);
  },
  saveFirebaseConfig(config: FirebaseConfig | null): void {
    setLocalItem(KEYS.FIREBASE_CONFIG, config);
  },

  getDuaaText(): string {
    return getLocalItem<string>(KEYS.DUAA, DEFAULT_DUAA);
  },
  saveDuaaText(text: string): void {
    setLocalItem(KEYS.DUAA, text);
  },

  // Export full JSON backup
  exportBackup(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'صيدلية المنزل الذكية',
      patients: this.getPatients(),
      medications: this.getMedications(),
      schedules: this.getSchedules(),
      logs: this.getLogs(),
      vitals: this.getVitals(),
      vaccinations: this.getVaccinations(),
      prescriptions: this.getPrescriptions(),
      duaa: this.getDuaaText(),
    };
    return JSON.stringify(backup, null, 2);
  },

  // Import JSON backup
  importBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'ملف النسخة الاحتياطية غير صالح أو تالف.' };
      }

      if (Array.isArray(data.patients)) this.savePatients(data.patients);
      if (Array.isArray(data.medications)) this.saveMedications(data.medications);
      if (Array.isArray(data.schedules)) this.saveSchedules(data.schedules);
      if (Array.isArray(data.logs)) this.saveLogs(data.logs);
      if (Array.isArray(data.vitals)) this.saveVitals(data.vitals);
      if (Array.isArray(data.vaccinations)) this.saveVaccinations(data.vaccinations);
      if (Array.isArray(data.prescriptions)) this.savePrescriptions(data.prescriptions);
      if (typeof data.duaa === 'string') this.saveDuaaText(data.duaa);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء قراءة ملف النسخة الاحتياطية.' };
    }
  },

  // Danger Zone: Wipe all data back to 0
  async wipeAllData(): Promise<void> {
    Object.values(KEYS).forEach((k) => {
      localStorage.removeItem(k);
    });
    await clearAllLocalPhotos();
  },

  // Optional Demo Seeder (Only triggered when user explicitly requests it from settings)
  seedDemoData(): void {
    const samplePatients: Patient[] = [
      {
        id: 'p_demo_1',
        name: 'الحاج إبراهيم',
        relation: 'أب',
        age: 68,
        weight: 78,
        healthStatus: 'chronic',
        chronicDiseases: ['ارتفاع ضغط الدم', 'أمراض الشرايين والقلب'],
        allergies: ['حساسية من مركبات السلفا (Sulfa)'],
        surgeries: 'قسطرة قلبية وتركيب دعامة عام 2021',
        notes: 'يحتاج لمتابعة دورية لقياس الضغط صباحاً ومساءً وتجنب المسكنات ومضادات الاحتقان.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'p_demo_2',
        name: 'الحاجة أمينة',
        relation: 'أم',
        age: 63,
        weight: 70,
        healthStatus: 'chronic',
        chronicDiseases: ['السكري من النوع الثاني', 'خشونة الركبة'],
        allergies: ['حساسية موثقة من عائلة البنسلين ومشتقاته (Penicillin)'],
        notes: 'تناول علاج السكري مع الوجبات الرئيسية ومراقبة السكر التراكمي.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'p_demo_3',
        name: 'عمر',
        relation: 'ابن',
        age: 6,
        weight: 21,
        healthStatus: 'stable',
        chronicDiseases: [],
        allergies: [],
        notes: 'متابعة جدول تطعيمات وتناول خافض الحرارة بالجرعة المحسوبة بالوزن.',
        createdAt: new Date().toISOString(),
      },
    ];

    const sampleMeds: Medication[] = [
      {
        id: 'm_demo_1',
        tradeName: 'كونكور 5 مجم (Concor)',
        scientificName: 'Bisoprolol Fumarate',
        category: 'ضغط وقلب',
        patientId: 'p_demo_1',
        patientName: 'الحاج إبراهيم',
        currentQuantity: 28,
        lowStockThreshold: 7,
        expiryDate: '2027-06-30',
        isChronic: true,
        foodTiming: 'before_meal',
        notes: 'قرص واحد يومياً صباحاً لضبط ضربات القلب وضغط الدم.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'm_demo_2',
        tradeName: 'ماريفان 3 مجم (Marevan)',
        scientificName: 'Warfarin Sodium',
        category: 'ضغط وقلب',
        patientId: 'p_demo_1',
        patientName: 'الحاج إبراهيم',
        currentQuantity: 4, // low stock alert!
        lowStockThreshold: 6,
        expiryDate: '2027-02-15',
        isChronic: true,
        foodTiming: 'after_meal',
        notes: 'مسيل دم - يمنع الجمع مع الأسبرين أو المسكنات.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'm_demo_3',
        tradeName: 'جلوكوفاج 1000 مجم (Glucophage)',
        scientificName: 'Metformin Hydrochloride',
        category: 'سكري',
        patientId: 'p_demo_2',
        patientName: 'الحاجة أمينة',
        currentQuantity: 45,
        lowStockThreshold: 10,
        expiryDate: '2027-11-20',
        isChronic: true,
        foodTiming: 'with_meal',
        notes: 'قرص مع وجبة الغداء وقرص مع العشاء.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'm_demo_4',
        tradeName: 'باراسيتامول شراب أطفال 120 ملغ/5 مل',
        scientificName: 'Paracetamol',
        category: 'أدوية أطفال',
        patientId: 'p_demo_3',
        patientName: 'عمر',
        currentQuantity: 1,
        lowStockThreshold: 1,
        expiryDate: '2026-11-05', // Expiring soon (< 30 days)!
        isChronic: false,
        foodTiming: 'after_meal',
        notes: 'خافض حرارة ومسكن، يعطى حسب الوزن عند ارتفاع الحرارة.',
        createdAt: new Date().toISOString(),
      },
    ];

    const sampleSchedules: DoseSchedule[] = [
      {
        id: 'sch_demo_1',
        medicationId: 'm_demo_1',
        medicationName: 'كونكور 5 مجم (Concor)',
        patientId: 'p_demo_1',
        patientName: 'الحاج إبراهيم',
        time: '08:30',
        doseAmount: 1,
        foodTiming: 'before_meal',
        soundEnabled: true,
        vibrationEnabled: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sch_demo_2',
        medicationId: 'm_demo_3',
        medicationName: 'جلوكوفاج 1000 مجم (Glucophage)',
        patientId: 'p_demo_2',
        patientName: 'الحاجة أمينة',
        time: '14:00',
        doseAmount: 1,
        foodTiming: 'with_meal',
        soundEnabled: true,
        vibrationEnabled: true,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    const sampleVitals: VitalRecord[] = [
      {
        id: 'v_demo_1',
        patientId: 'p_demo_1',
        type: 'blood_pressure',
        systolic: 128,
        diastolic: 82,
        value: 128,
        unit: 'mmHg',
        timestamp: new Date().toISOString(),
        notes: 'قياس صباحي منتظم ومستقر.',
      },
      {
        id: 'v_demo_2',
        patientId: 'p_demo_2',
        type: 'blood_sugar',
        value: 118,
        unit: 'mg/dL',
        mealTiming: 'fasting',
        timestamp: new Date().toISOString(),
        notes: 'سكر صائم طبيعي ممتاز.',
      },
    ];

    const sampleVaccinations: VaccinationRecord[] = [
      {
        id: 'vac_demo_1',
        patientId: 'p_demo_3',
        vaccineName: 'تطعيم الإنفلونزا الموسمية الرباعي',
        dueDate: '2026-11-15',
        status: 'upcoming',
        notes: 'جرعة الخريف السنوية المقررة للأطفال.',
      },
    ];

    this.savePatients(samplePatients);
    this.saveMedications(sampleMeds);
    this.saveSchedules(sampleSchedules);
    this.saveVitals(sampleVitals);
    this.saveVaccinations(sampleVaccinations);
  },
};
