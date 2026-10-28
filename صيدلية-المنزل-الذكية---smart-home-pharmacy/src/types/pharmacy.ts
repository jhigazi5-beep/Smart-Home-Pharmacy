export type HealthStatus = 'stable' | 'care' | 'critical' | 'chronic';

export type FoodTiming =
  | 'before_meal'
  | 'after_meal'
  | 'empty_stomach'
  | 'with_meal'
  | 'before_sleep';

export interface Patient {
  id: string;
  name: string;
  relation: string;
  age: number;
  weight?: number; // kg
  healthStatus: HealthStatus;
  chronicDiseases: string[];
  allergies: string[];
  surgeries?: string;
  notes?: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  tradeName: string;
  scientificName: string;
  category: string;
  patientId?: string;
  patientName?: string;
  currentQuantity: number;
  lowStockThreshold: number;
  expiryDate: string; // YYYY-MM-DD
  isChronic: boolean;
  foodTiming: FoodTiming;
  localImageId?: string | null;
  notes?: string;
  createdAt: string;
}

export interface DoseSchedule {
  id: string;
  medicationId: string;
  medicationName: string;
  patientId?: string;
  patientName?: string;
  time: string; // HH:mm
  doseAmount: number;
  foodTiming: FoodTiming;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  isActive: boolean;
  lastTakenDate?: string;
  localImageId?: string | null;
  createdAt: string;
  autoSetPhoneAlarm?: boolean;
}

export interface AdherenceLog {
  id: string;
  scheduleId?: string;
  medicationId: string;
  medicationName: string;
  patientId?: string;
  patientName?: string;
  status: 'taken' | 'snoozed' | 'missed';
  doseAmount: number;
  timestamp: string;
  notes?: string;
}

export type VitalType = 'blood_pressure' | 'blood_sugar' | 'heart_rate' | 'temperature';

export interface VitalRecord {
  id: string;
  patientId: string;
  type: VitalType;
  systolic?: number;
  diastolic?: number;
  value: number;
  unit: string;
  mealTiming?: 'fasting' | 'post_prandial' | 'random';
  timestamp: string;
  notes?: string;
}

export interface VaccinationRecord {
  id: string;
  patientId: string;
  vaccineName: string;
  scheduledAge?: string;
  dueDate: string;
  status: 'taken' | 'upcoming';
  takenDate?: string;
  notes?: string;
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  doctorName: string;
  specialty?: string;
  date: string;
  diagnosis?: string;
  localImageId?: string | null;
  notes?: string;
  createdAt: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  vapidKey?: string;
}

export interface DuaaItem {
  id: string;
  text: string;
  source?: string;
}

export interface AIPharmacistResponse {
  safetyLevel: 'safe' | 'caution' | 'danger';
  safetyTitle: string;
  simpleExplanation: string;
  practicalAdvice: string;
  disclaimer: string;
  isFallback?: boolean;
}
