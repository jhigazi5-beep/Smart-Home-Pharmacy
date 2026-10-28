import React, { useState, useEffect } from 'react';
import { Patient, Medication, AIPharmacistResponse } from '../types/pharmacy';
import { checkMedicationSafety, SafetyCheckResult } from '../utils/drugSafetyChecker';
import { Bot, ShieldAlert, ShieldCheck, AlertTriangle, Send, X, Sparkles, User, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AIPharmacistModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  medications: Medication[];
  initialPatientId?: string;
  initialMedicationName?: string;
}

export const AIPharmacistModal: React.FC<AIPharmacistModalProps> = ({
  isOpen,
  onClose,
  patients,
  medications,
  initialPatientId,
  initialMedicationName,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || '');
  const [medicationQuery, setMedicationQuery] = useState<string>(initialMedicationName || '');
  const [userQuestion, setUserQuestion] = useState<string>('هل يمكن لهذا المريض أخذ هذا الدواء الآن وما الجرعة والتداخلات المحتملة؟');
  
  const [localSafetyResult, setLocalSafetyResult] = useState<SafetyCheckResult | null>(null);
  const [aiResponse, setAiResponse] = useState<AIPharmacistResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial inputs if provided
  useEffect(() => {
    if (initialPatientId) setSelectedPatientId(initialPatientId);
    if (initialMedicationName) setMedicationQuery(initialMedicationName);
  }, [initialPatientId, initialMedicationName]);

  // Selected patient object
  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || null;
  const patientActiveMeds = medications.filter((m) => m.patientId === currentPatient?.id);

  // Instant local safety check whenever query or patient changes
  useEffect(() => {
    if (medicationQuery.trim() && currentPatient) {
      const result = checkMedicationSafety(
        { tradeName: medicationQuery, scientificName: medicationQuery },
        currentPatient,
        patientActiveMeds
      );
      setLocalSafetyResult(result);
    } else {
      setLocalSafetyResult(null);
    }
  }, [medicationQuery, currentPatient, patientActiveMeds]);

  if (!isOpen) return null;

  const handleAskAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!medicationQuery.trim()) {
      setErrorMsg('يرجى كتابة اسم الدواء المراد الاستفسار عنه أولاً.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        medicationName: medicationQuery,
        query: userQuestion,
        patient: currentPatient
          ? {
              name: currentPatient.name,
              age: currentPatient.age,
              weight: currentPatient.weight,
              healthStatus: currentPatient.healthStatus,
              chronicDiseases: currentPatient.chronicDiseases,
              allergies: currentPatient.allergies,
              activeMedications: patientActiveMeds.map((m) => `${m.tradeName} (${m.scientificName})`),
            }
          : null,
      };

      const res = await fetch('/api/ai/pharmacist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`خطأ في الخادم: ${res.status}`);
      }

      const data: AIPharmacistResponse = await res.json();
      setAiResponse(data);
    } catch (err: any) {
      console.error('AI Pharmacist request error:', err);
      // Fallback to local safety check if network or server fails
      const fallbackResult = localSafetyResult || checkMedicationSafety(
        { tradeName: medicationQuery, scientificName: medicationQuery },
        currentPatient,
        patientActiveMeds
      );

      setAiResponse({
        safetyLevel: fallbackResult.severity,
        safetyTitle: fallbackResult.title,
        simpleExplanation: fallbackResult.reasons.join(' '),
        practicalAdvice: fallbackResult.recommendation,
        disclaimer: 'هذا التحليل الاسترشادي تم توليده عبر محرك السلامة السريرية المحلي نظراً لتعذر الاتصال بالخادم.',
        isFallback: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden text-right my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-teal-100 shadow-inner">
              <Bot className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">المساعد الذكي وفاحص التداخلات الدوائية</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-400 text-teal-950">
                  مدعوم بـ Gemini
                </span>
              </div>
              <p className="text-xs text-teal-100/90 mt-0.5">
                فحص فوري للسلامة السريرية، موانع الاستعمال وتعارضات الأدوية والأمراض المزمنة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Select Patient */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>اختر المريض من الملفات الصحية العائلية:</span>
            </label>
            {patients.length > 0 ? (
              <select
                value={currentPatient?.id || ''}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.relation}) — {p.age} سنة {p.weight ? `• ${p.weight} كجم` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                لم يتم تسجيل أي ملف مريض حتى الآن. يمكنك الفحص العام، أو إضافة ملف عائلي من تبويب "سجلات العائلة" لتفعيل المقارنة التلقائية مع الحساسيات والأدوية.
              </div>
            )}
          </div>

          {/* Patient Context Pills (if selected) */}
          {currentPatient && (
            <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-100 text-xs space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-teal-900">الملف الصحي المحمّل:</span>
                <span className="px-2 py-0.5 bg-white border border-teal-200 rounded-md font-semibold text-teal-800">
                  العمر: {currentPatient.age} سنة
                </span>
                {currentPatient.weight && (
                  <span className="px-2 py-0.5 bg-white border border-teal-200 rounded-md font-semibold text-teal-800">
                    الوزن: {currentPatient.weight} كجم
                  </span>
                )}
                <span className="px-2 py-0.5 bg-white border border-teal-200 rounded-md font-semibold text-teal-800">
                  أدوية نشطة: {patientActiveMeds.length}
                </span>
              </div>

              {currentPatient.allergies.length > 0 && (
                <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <span>حساسيات موثقة:</span>
                  <span className="text-rose-900 font-bold">{currentPatient.allergies.join('، ')}</span>
                </div>
              )}

              {currentPatient.chronicDiseases.length > 0 && (
                <div className="flex items-center gap-1.5 text-amber-800">
                  <span>أمراض مزمنة:</span>
                  <span className="font-bold text-slate-800">{currentPatient.chronicDiseases.join('، ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Medication Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم الدواء المراد الاستفسار عنه (التجاري أو المادة الفعالة):
            </label>
            <input
              type="text"
              value={medicationQuery}
              onChange={(e) => setMedicationQuery(e.target.value)}
              placeholder="مثال: أوجمنتين، أسبرين، كونكور، بنادول إكسترا، فولتارين..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
            />
          </div>

          {/* Step 3: Instant Local Safety Guard (Rule Engine Red Danger Banner) */}
          {localSafetyResult && localSafetyResult.hasConflict && (
            <div
              className={`p-4 rounded-2xl border-2 transition-all ${
                localSafetyResult.severity === 'danger'
                  ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-sm'
                  : 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                {localSafetyResult.severity === 'danger' ? (
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-black">{localSafetyResult.title}</h4>
                  <ul className="mt-1.5 space-y-1 text-xs list-disc list-inside">
                    {localSafetyResult.reasons.map((r, i) => (
                      <li key={i} className="leading-relaxed font-semibold">
                        {r}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-bold text-slate-700 bg-white/70 p-2 rounded-lg border border-black/5">
                    💡 التوجيه السريري: {localSafetyResult.recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User Question customization (optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              السؤال الموجه للمساعد الذكي:
            </label>
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Ask Button */}
          <button
            onClick={() => handleAskAI()}
            disabled={isLoading || !medicationQuery.trim()}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-teal-700/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري استشارة الصيدلي الإكلينيكي الذكي...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>استشارة الصيدلي الذكي وفحص التداخلات (Gemini)</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>

          {/* AI Response Card */}
          {aiResponse && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 border border-teal-200 space-y-4 animate-in fade-in">
              {/* Safety Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">نتيجة التحليل الشامل:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                    aiResponse.safetyLevel === 'safe'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : aiResponse.safetyLevel === 'caution'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}
                >
                  {aiResponse.safetyLevel === 'safe' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ) : aiResponse.safetyLevel === 'caution' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  )}
                  {aiResponse.safetyTitle}
                </span>
              </div>

              {/* Simple Medical Explanation */}
              <div>
                <h5 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <span>📖 التفسير الطبي المبسط:</span>
                </h5>
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-200 font-medium">
                  {aiResponse.simpleExplanation}
                </p>
              </div>

              {/* Practical Advice */}
              <div>
                <h5 className="text-xs font-bold text-teal-900 mb-1 flex items-center gap-1">
                  <span>💊 النصيحة العملية والتباعد الزمني:</span>
                </h5>
                <p className="text-xs text-teal-950 leading-relaxed bg-teal-100/60 p-3 rounded-xl border border-teal-200 font-medium">
                  {aiResponse.practicalAdvice}
                </p>
              </div>

              {/* Disclaimer */}
              <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-500 leading-normal border border-slate-200">
                ⚠️ {aiResponse.disclaimer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
