/**
 * Instant Local Safety Guard (Offline Clinical Rule Engine)
 * Cross-references active ingredients, patient allergies, chronic diseases, and concurrent medications.
 */

import { Patient, Medication } from '../types/pharmacy';

export interface SafetyCheckResult {
  hasConflict: boolean;
  severity: 'safe' | 'caution' | 'danger';
  title: string;
  reasons: string[];
  recommendation: string;
}

// Normalized drug keywords for matching
const PENICILLIN_DRUGS = ['بنسلين', 'أوجمنتين', 'أموكسيسيلين', 'اموكسيسيلين', 'أوجمنتين', 'كلافيموكس', 'هايبنسيك', 'penicillin', 'amoxicillin', 'augmentin', 'ampicillin', 'amoxil'];
const NSAID_DRUGS = ['إيبوبروفين', 'ايبوبروفين', 'بروفين', 'ديكلوفيناك', 'فولتارين', 'كتفلام', 'أسبرين', 'اسبرين', 'نابروكسين', 'كيتوبروفين', 'كتافلاي', 'ibuprofen', 'brufen', 'diclofenac', 'voltaren', 'cataflam', 'aspirin', 'naproxen', 'ketoprofen'];
const SULFA_DRUGS = ['سلفا', 'باكتريم', 'سبتريم', 'sulfa', 'sulfamethoxazole', 'bactrim', 'septra'];
const DECONGESTANTS = ['سودوإيفيدرين', 'سودوافدرين', 'أوتريفين', 'كونجستال', 'بانادول كولد اند فلو', 'pseudoephedrine', 'otrivin', 'congestal', 'cold & flu'];
const BLOOD_THINNERS = ['وارفارين', 'ماريفان', 'بلافيكس', 'كلوTrack', 'إليكويس', 'إكساريلتو', 'هيبارين', 'warfarin', 'plavix', 'clopidogrel', 'eliquis', 'xarelto', 'heparin'];
const PARACETAMOL_DRUGS = ['باراسيتامول', 'بنادول', 'بانادول', 'أدول', 'سيتال', 'ابيمول', 'تايلينول', 'paracetamol', 'panadol', 'adol', 'cetal', 'tylenol'];

export function checkMedicationSafety(
  targetMed: { tradeName: string; scientificName: string; category?: string },
  patient?: Patient | null,
  activeMedications: Medication[] = []
): SafetyCheckResult {
  const reasons: string[] = [];
  let severity: 'safe' | 'caution' | 'danger' = 'safe';

  if (!patient && activeMedications.length === 0) {
    return {
      hasConflict: false,
      severity: 'safe',
      title: 'لا توجد تعارضات مسجلة',
      reasons: ['لم يتم تسجيل ملف مريض أو أدوية نشطة للمقارنة.'],
      recommendation: 'تأكد من تسجيل الحساسيات والأمراض المزمنة بدقة لضمان الفحص التلقائي.'
    };
  }

  const queryText = `${targetMed.tradeName} ${targetMed.scientificName} ${targetMed.category || ''}`.toLowerCase();

  // Helper check
  const matchesAny = (list: string[]) => list.some(k => queryText.includes(k.toLowerCase()));

  // 1. Check Allergies (حساسيات موثقة)
  if (patient?.allergies && patient.allergies.length > 0) {
    const allergyText = patient.allergies.join(' ').toLowerCase();

    // Penicillin allergy check
    if ((allergyText.includes('بنسلين') || allergyText.includes('penicillin')) && matchesAny(PENICILLIN_DRUGS)) {
      reasons.push('⚠️ تحذير حرج: المريض لديه حساسية موثقة من عائلة "البنسلين ومشتقاته"، وهذا الدواء يحتوي على مواد قد تسبب صدمة تحسسية حادة!');
      severity = 'danger';
    }

    // NSAID / Aspirin allergy check
    if ((allergyText.includes('أسبرين') || allergyText.includes('اسبرين') || allergyText.includes('مسكن') || allergyText.includes('nsaid')) && matchesAny(NSAID_DRUGS)) {
      reasons.push('⚠️ تحذير حرج: المريض لديه حساسية مسكنات أو أسبرين، وهذا الدواء ينتمي لعائلة مضادات الالتهاب اللاستيرويدية (NSAIDs)!');
      severity = 'danger';
    }

    // Sulfa allergy check
    if ((allergyText.includes('سلفا') || allergyText.includes('sulfa')) && matchesAny(SULFA_DRUGS)) {
      reasons.push('⚠️ تحذير حرج: المريض لديه حساسية موثقة من مركبات السلفا (Sulfa Allergy)!');
      severity = 'danger';
    }
  }

  // 2. Check Chronic Conditions Contraindications (تعارض مع الأمراض المزمنة)
  if (patient?.chronicDiseases && patient.chronicDiseases.length > 0) {
    const chronicText = patient.chronicDiseases.join(' ').toLowerCase();

    // Hypertension / Heart vs NSAIDs or Decongestants
    const hasHypertension = chronicText.includes('ضغط') || chronicText.includes('قلب') || chronicText.includes('hypertension');
    if (hasHypertension) {
      if (matchesAny(NSAID_DRUGS)) {
        reasons.push('تنبيه هام: أدوية المسكنات ومضادات الالتهاب (NSAIDs) قد ترفع ضغط الدم وتقلل من فاعلية أدوية الضغط وتجهد الكلى.');
        if (severity !== 'danger') severity = 'caution';
      }
      if (matchesAny(DECONGESTANTS)) {
        reasons.push('⚠️ تحذير: أدوية احتقان الأنف ومضادات نزلات البرد المحتوية على السودوإيفيدرين تؤدي لارتفاع حاد في ضغط الدم وتسارع ضربات القلب!');
        severity = 'danger';
      }
    }

    // Peptic Ulcer vs NSAIDs / Aspirin
    const hasUlcer = chronicText.includes('قرحة') || chronicText.includes('معدة') || chronicText.includes('نزيف') || chronicText.includes('ulcer');
    if (hasUlcer && matchesAny(NSAID_DRUGS)) {
      reasons.push('⚠️ تحذير شديد: المريض يعاني من قرحة أو التهاب المعدة؛ تناول هذا المسكن قد يسبب تهيجاً حاداً أو نزيفاً معوياً!');
      severity = 'danger';
    }

    // Asthma vs Aspirin / NSAIDs
    const hasAsthma = chronicText.includes('ربو') || chronicText.includes('صدر') || chronicText.includes('حساسية صدر') || chronicText.includes('asthma');
    if (hasAsthma && matchesAny(NSAID_DRUGS)) {
      reasons.push('تنبيه: بعض مرضى الربو يعانون من حساسية مفرطة للأسبرين والمسكنات قد تثير نوبة ضيق تنفس حادة (Aspirin-exacerbated respiratory disease).');
      if (severity !== 'danger') severity = 'caution';
    }
  }

  // 3. Check Drug-Drug Concurrent Interactions (تداخلات الأدوية مع بعضها)
  for (const activeMed of activeMedications) {
    const medCombined = `${activeMed.tradeName} ${activeMed.scientificName}`.toLowerCase();

    // Check duplicate paracetamol products
    if (matchesAny(PARACETAMOL_DRUGS) && PARACETAMOL_DRUGS.some(k => medCombined.includes(k.toLowerCase()))) {
      reasons.push(`تنبيه ازدواجية الجرعة: المريض يأخذ بالفعل (${activeMed.tradeName}) وكلاهما يحتوي على الباراسيتامول. الحذر من تجاوز 4000 ملغ يومياً لتجنب تسمم الكبد.`);
      if (severity !== 'danger') severity = 'caution';
    }

    // Check NSAID + Blood Thinners (Extreme bleeding risk)
    const isTargetNsaid = matchesAny(NSAID_DRUGS);
    const isActiveThinner = BLOOD_THINNERS.some(k => medCombined.includes(k.toLowerCase()));
    const isTargetThinner = matchesAny(BLOOD_THINNERS);
    const isActiveNsaid = NSAID_DRUGS.some(k => medCombined.includes(k.toLowerCase()));

    if ((isTargetNsaid && isActiveThinner) || (isTargetThinner && isActiveNsaid)) {
      reasons.push(`⚠️ تحذير خطير جداً: تداخل دوائي عالي الخطورة بين المسكنات ومسيلات الدم (${activeMed.tradeName})، مما يضاعف خطر النزيف الداخلي الحاد!`);
      severity = 'danger';
    }

    // Check double NSAID
    if (isTargetNsaid && isActiveNsaid && targetMed.tradeName !== activeMed.tradeName) {
      reasons.push(`تنبيه: الجمع بين مسكنين من عائلة واحدة (${activeMed.tradeName} مع ${targetMed.tradeName}) لا يزيد تسكين الألم بل يضاعف الآثار الجانبية على الكلى والمعدة.`);
      if (severity !== 'danger') severity = 'caution';
    }
  }

  if (reasons.length === 0) {
    return {
      hasConflict: false,
      severity: 'safe',
      title: 'آمن وفق الفحص السريري الأولي',
      reasons: ['لم يتم رصد تعارض مباشر مع الحساسيات أو الأمراض المسجلة أو الأدوية النشطة.'],
      recommendation: 'يرجى الالتزام بالجرعة المقررة وتعليمات الأكل المرفقة مع الدواء.'
    };
  }

  return {
    hasConflict: true,
    severity,
    title: severity === 'danger' ? '⚠️ خطر وموانع استعمال سريرية!' : '⚡ تنبيه يتطلب الحذر واستشارة طبية',
    reasons,
    recommendation: severity === 'danger'
      ? 'يمنع صرف هذا الدواء للمريض قبل الرجوع للطبيب لتغييره إلى بديل آمن تماماً.'
      : 'يجب المباعدة الزمنية أو ضبط الجرعة ومراقبة المريض تحت إشراف صيدلي أو طبيب.'
  };
}
