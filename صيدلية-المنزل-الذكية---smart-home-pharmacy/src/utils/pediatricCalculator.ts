/**
 * Pediatric Dosage Calculator for liquid antipyretics and analgesics based on weight (kg)
 */

export interface PediatricDrugConfig {
  id: string;
  nameAr: string;
  activeIngredient: string;
  concentrationMgPer5Ml: number; // e.g. 120 or 250
  mgPerKgPerDose: number; // e.g. 15 mg/kg for paracetamol, 10 mg/kg for ibuprofen
  maxSingleDoseMg: number;
  minIntervalHours: number;
  maxDosesPer24Hours: number;
  notesAr: string;
}

export const PEDIATRIC_DRUGS: PediatricDrugConfig[] = [
  {
    id: 'paracetamol-120',
    nameAr: 'باراسيتامول شراب للأطفال (120 ملغ / 5 مل)',
    activeIngredient: 'Paracetamol',
    concentrationMgPer5Ml: 120,
    mgPerKgPerDose: 15,
    maxSingleDoseMg: 500,
    minIntervalHours: 4,
    maxDosesPer24Hours: 4,
    notesAr: 'مناسب للرضع والأطفال الصغار، يعطى كل 4 إلى 6 ساعات عند اللزوم (بحد أقصى 4 مرات خلال 24 ساعة).'
  },
  {
    id: 'paracetamol-250',
    nameAr: 'باراسيتامول شراب قوي (250 ملغ / 5 مل)',
    activeIngredient: 'Paracetamol',
    concentrationMgPer5Ml: 250,
    mgPerKgPerDose: 15,
    maxSingleDoseMg: 1000,
    minIntervalHours: 4,
    maxDosesPer24Hours: 4,
    notesAr: 'تركيز مضاعف مخصص للأطفال الأكبر وزناً لتخفيف حجم السائل المعطى.'
  },
  {
    id: 'ibuprofen-100',
    nameAr: 'إيبوبروفين شراب أطفال (100 ملغ / 5 مل)',
    activeIngredient: 'Ibuprofen',
    concentrationMgPer5Ml: 100,
    mgPerKgPerDose: 10,
    maxSingleDoseMg: 400,
    minIntervalHours: 6,
    maxDosesPer24Hours: 3,
    notesAr: 'خافض للحرارة ومضاد للالتهاب، يعطى بعد الأكل كل 6 إلى 8 ساعات. لا يعطى للرضع أقل من 6 أشهر أو عند الجفاف.'
  }
];

export interface PediatricCalcResult {
  weightKg: number;
  doseMg: number;
  doseMl: number;
  formattedDoseMl: string;
  minIntervalHours: number;
  maxDosesPerDay: number;
  warning?: string;
}

export function calculatePediatricDose(weightKg: number, drugId: string): PediatricCalcResult {
  const drug = PEDIATRIC_DRUGS.find(d => d.id === drugId) || PEDIATRIC_DRUGS[0];

  if (!weightKg || weightKg <= 0) {
    return {
      weightKg: 0,
      doseMg: 0,
      doseMl: 0,
      formattedDoseMl: '0',
      minIntervalHours: drug.minIntervalHours,
      maxDosesPerDay: drug.maxDosesPer24Hours,
      warning: 'يرجى إدخال وزن صحيح بالكيلوجرام.'
    };
  }

  let warning: string | undefined = undefined;
  if (weightKg < 3) {
    warning = 'تنبيه: الأوزان الأقل من 3 كجم تتطلب مراجعة طبيب الأطفال فوراً ولا تعتمد على الحساب المنزلي.';
  } else if (weightKg > 45) {
    warning = 'ملاحظة: هذا الوزن يقترب من أوزان البالغين، يرجى استشارة الطبيب لتحديد الجرعة أو التحول للأقراص.';
  }

  // Calculate target dose in mg
  let targetMg = weightKg * drug.mgPerKgPerDose;
  if (targetMg > drug.maxSingleDoseMg) {
    targetMg = drug.maxSingleDoseMg;
  }

  // Volume in ml = (mg target / concentration in mg per 5ml) * 5
  const rawMl = (targetMg / drug.concentrationMgPer5Ml) * 5;
  const doseMl = Math.round(rawMl * 10) / 10; // Round to 1 decimal place

  return {
    weightKg,
    doseMg: Math.round(targetMg),
    doseMl,
    formattedDoseMl: doseMl.toLocaleString('ar-EG', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    minIntervalHours: drug.minIntervalHours,
    maxDosesPerDay: drug.maxDosesPer24Hours,
    warning
  };
}
