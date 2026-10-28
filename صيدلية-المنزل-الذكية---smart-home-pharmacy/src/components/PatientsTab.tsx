import React, { useState } from 'react';
import {
  Patient,
  VitalRecord,
  VaccinationRecord,
  PrescriptionRecord,
  HealthStatus,
  VitalType,
} from '../types/pharmacy';
import { calculatePediatricDose, PEDIATRIC_DRUGS } from '../utils/pediatricCalculator';
import { saveLocalPhoto, getLocalPhoto } from '../services/localPhotoStorage';
import {
  Users,
  Plus,
  Search,
  Heart,
  Activity,
  AlertTriangle,
  FileText,
  Syringe,
  Calculator,
  User,
  Edit2,
  Trash2,
  X,
  Check,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  Clock,
  Thermometer,
  Calendar,
} from 'lucide-react';

interface PatientsTabProps {
  patients: Patient[];
  vitals: VitalRecord[];
  vaccinations: VaccinationRecord[];
  prescriptions: PrescriptionRecord[];
  onSavePatient: (patient: Patient) => void;
  onDeletePatient: (id: string) => void;
  onSaveVital: (vital: VitalRecord) => void;
  onSaveVaccination: (vac: VaccinationRecord) => void;
  onSavePrescription: (prescription: PrescriptionRecord) => void;
}

export const PatientsTab: React.FC<PatientsTabProps> = ({
  patients,
  vitals,
  vaccinations,
  prescriptions,
  onSavePatient,
  onDeletePatient,
  onSaveVital,
  onSaveVaccination,
  onSavePrescription,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HealthStatus>('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const [activeDetailsPatient, setActiveDetailsPatient] = useState<Patient | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'vitals' | 'prescriptions' | 'kids'>('vitals');

  // Form State for Patient
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('أب');
  const [age, setAge] = useState<number>(30);
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('stable');
  const [chronicDiseasesInput, setChronicDiseasesInput] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [notes, setNotes] = useState('');

  // Pediatric calculator state inside details modal
  const [calcDrugId, setCalcDrugId] = useState(PEDIATRIC_DRUGS[0].id);
  const [calcWeight, setCalcWeight] = useState<number>(10);

  // Vitals form state inside details modal
  const [vitalType, setVitalType] = useState<VitalType>('blood_pressure');
  const [vitalSystolic, setVitalSystolic] = useState<number>(120);
  const [vitalDiastolic, setVitalDiastolic] = useState<number>(80);
  const [vitalValue, setVitalValue] = useState<number>(100);
  const [vitalTiming, setVitalTiming] = useState<'fasting' | 'post_prandial' | 'random'>('fasting');
  const [vitalNote, setVitalNote] = useState('');

  // Prescriptions form state inside details modal
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [rxDiagnosis, setRxDiagnosis] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [rxImageId, setRxImageId] = useState<string | null>(null);
  const [rxImagePreview, setRxImagePreview] = useState<string | null>(null);

  // Vaccination form state
  const [vacName, setVacName] = useState('');
  const [vacDueDate, setVacDueDate] = useState('');
  const [vacStatus, setVacStatus] = useState<'upcoming' | 'taken'>('upcoming');

  // 2x2 Stats calculation
  const totalPatients = patients.length;
  const stablePatients = patients.filter((p) => p.healthStatus === 'stable').length;
  const carePatients = patients.filter((p) => p.healthStatus === 'care' || p.healthStatus === 'critical').length;
  const documentedAllergiesCount = patients.filter((p) => p.allergies && p.allergies.length > 0).length;

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.relation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.chronicDiseases.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.allergies.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || p.healthStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAddPatient = () => {
    setEditingPatient(null);
    setName('');
    setRelation('أب');
    setAge(30);
    setWeight(undefined);
    setHealthStatus('stable');
    setChronicDiseasesInput('');
    setAllergiesInput('');
    setSurgeries('');
    setNotes('');
    setIsAddEditModalOpen(true);
  };

  const openEditPatient = (p: Patient) => {
    setEditingPatient(p);
    setName(p.name);
    setRelation(p.relation);
    setAge(p.age);
    setWeight(p.weight);
    setHealthStatus(p.healthStatus);
    setChronicDiseasesInput(p.chronicDiseases.join('، '));
    setAllergiesInput(p.allergies.join('، '));
    setSurgeries(p.surgeries || '');
    setNotes(p.notes || '');
    setIsAddEditModalOpen(true);
  };

  const handleSavePatientForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const chronicDiseases = chronicDiseasesInput
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const allergies = allergiesInput
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: Patient = {
      id: editingPatient ? editingPatient.id : 'p_' + Date.now(),
      name: name.trim(),
      relation: relation.trim(),
      age: Number(age) || 1,
      weight: weight ? Number(weight) : undefined,
      healthStatus,
      chronicDiseases,
      allergies,
      surgeries: surgeries.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingPatient ? editingPatient.createdAt : new Date().toISOString(),
    };

    onSavePatient(updated);
    setIsAddEditModalOpen(false);
  };

  const handleOpenDetails = (p: Patient) => {
    setActiveDetailsPatient(p);
    setCalcWeight(p.weight || (p.age < 12 ? p.age * 2 + 8 : 20));
  };

  // Add Vital record
  const handleAddVital = () => {
    if (!activeDetailsPatient) return;
    const unitMap: Record<VitalType, string> = {
      blood_pressure: 'mmHg',
      blood_sugar: 'mg/dL',
      heart_rate: 'bpm',
      temperature: '°C',
    };

    const vital: VitalRecord = {
      id: 'v_' + Date.now(),
      patientId: activeDetailsPatient.id,
      type: vitalType,
      systolic: vitalType === 'blood_pressure' ? Number(vitalSystolic) : undefined,
      diastolic: vitalType === 'blood_pressure' ? Number(vitalDiastolic) : undefined,
      value: vitalType === 'blood_pressure' ? Number(vitalSystolic) : Number(vitalValue),
      unit: unitMap[vitalType],
      mealTiming: vitalType === 'blood_sugar' ? vitalTiming : undefined,
      timestamp: new Date().toISOString(),
      notes: vitalNote.trim() || undefined,
    };

    onSaveVital(vital);
    setVitalNote('');
  };

  // Attach local-only photo for prescription
  const handlePrescriptionPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageId = await saveLocalPhoto(file);
        setRxImageId(imageId);
        const dataUrl = await getLocalPhoto(imageId);
        setRxImagePreview(dataUrl);
      } catch (err) {
        console.error('Failed to compress and save prescription photo:', err);
      }
    }
  };

  // Add Prescription
  const handleAddPrescription = () => {
    if (!activeDetailsPatient || !doctorName.trim()) return;
    const rx: PrescriptionRecord = {
      id: 'rx_' + Date.now(),
      patientId: activeDetailsPatient.id,
      doctorName: doctorName.trim(),
      specialty: specialty.trim() || undefined,
      diagnosis: rxDiagnosis.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      localImageId: rxImageId,
      notes: rxNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSavePrescription(rx);
    setDoctorName('');
    setSpecialty('');
    setRxDiagnosis('');
    setRxNotes('');
    setRxImageId(null);
    setRxImagePreview(null);
  };

  // Add Vaccination
  const handleAddVaccination = () => {
    if (!activeDetailsPatient || !vacName.trim()) return;
    const vac: VaccinationRecord = {
      id: 'vac_' + Date.now(),
      patientId: activeDetailsPatient.id,
      vaccineName: vacName.trim(),
      dueDate: vacDueDate || new Date().toISOString().split('T')[0],
      status: vacStatus,
      takenDate: vacStatus === 'taken' ? new Date().toISOString().split('T')[0] : undefined,
      notes: '',
    };

    onSaveVaccination(vac);
    setVacName('');
    setVacDueDate('');
  };

  const patientVitals = activeDetailsPatient
    ? vitals.filter((v) => v.patientId === activeDetailsPatient.id)
    : [];
  const patientPrescriptions = activeDetailsPatient
    ? prescriptions.filter((r) => r.patientId === activeDetailsPatient.id)
    : [];
  const patientVaccines = activeDetailsPatient
    ? vaccinations.filter((v) => v.patientId === activeDetailsPatient.id)
    : [];

  const pediatricResult = calculatePediatricDose(calcWeight, calcDrugId);

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              الملفات الصحية لأفراد الأسرة والمرضى
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ملفات شخصية تفصيلية، تتبع المؤشرات الحيوية، أرشيف الروشتات، وتطعيمات الأطفال
          </p>
        </div>

        <button
          onClick={openAddPatient}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة ملف صحي جديد</span>
        </button>
      </div>

      {/* 2. 2x2 Patient Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold mb-1">إجمالي الملفات</div>
          <div className="text-2xl font-black text-slate-900">{totalPatients}</div>
          <div className="text-[11px] text-slate-500">فرد / مريض مسجل</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold mb-1">حالات مستقرة</div>
          <div className="text-2xl font-black text-emerald-700">{stablePatients}</div>
          <div className="text-[11px] text-slate-500">صحة جيدة</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold mb-1">رعاية ومراقبة</div>
          <div className="text-2xl font-black text-amber-700">{carePatients}</div>
          <div className="text-[11px] text-slate-500">بحاجة لمتابعة دقيقة</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold mb-1">حساسيات موثقة ⚠️</div>
          <div className="text-2xl font-black text-rose-700">{documentedAllergiesCount}</div>
          <div className="text-[11px] text-slate-500">حماية من التداخلات</div>
        </div>
      </div>

      {/* 3. Search Bar & Filter Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم، صلة القرابة، المرض المزمن أو الحساسية..."
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-600 ml-1">تصفية الحالة:</span>
          {[
            { id: 'all', label: 'الكل' },
            { id: 'stable', label: 'مستقرة' },
            { id: 'care', label: 'رعاية خاصة' },
            { id: 'critical', label: 'حرجة' },
            { id: 'chronic', label: 'أمراض مزمنة' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === chip.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Patients List */}
      {filteredPatients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPatients.map((patient) => {
            const statusConfig: Record<HealthStatus, { label: string; badge: string }> = {
              stable: { label: 'مستقرة', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
              care: { label: 'رعاية خاصة', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
              critical: { label: 'حالة حرجة', badge: 'bg-rose-100 text-rose-900 border-rose-300' },
              chronic: { label: 'مرض مزمن', badge: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
            };

            const cfg = statusConfig[patient.healthStatus] || statusConfig.stable;

            return (
              <div
                key={patient.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-teal-400 transition flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-black text-lg shadow-2xs">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{patient.name}</h3>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {patient.relation}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-medium">
                          <span>العمر: {patient.age} سنة</span>
                          {patient.weight && (
                            <>
                              <span>•</span>
                              <span>الوزن: {patient.weight} كجم</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Badges / Medical summary */}
                  <div className="space-y-2 text-xs mt-3">
                    {patient.allergies.length > 0 && (
                      <div className="flex items-start gap-1.5 p-2 bg-rose-50 text-rose-900 rounded-xl border border-rose-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[11px] text-rose-800">حساسيات موثقة:</strong>
                          <span className="font-semibold">{patient.allergies.join('، ')}</span>
                        </div>
                      </div>
                    )}

                    {patient.chronicDiseases.length > 0 && (
                      <div className="flex items-start gap-1.5 p-2 bg-indigo-50/70 text-indigo-950 rounded-xl border border-indigo-100">
                        <Activity className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[11px] text-indigo-800">أمراض مزمنة:</strong>
                          <span className="font-semibold">{patient.chronicDiseases.join('، ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDetails(patient)}
                    className="flex-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>المؤشرات، الروشتات والتطعيمات</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditPatient(patient)}
                      className="p-2 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition"
                      title="تعديل الملف"
                      aria-label="تعديل الملف"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePatient(patient.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="حذف الملف"
                      aria-label="حذف الملف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">لا توجد ملفات صحية مسجلة</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            أضف ملفات أفراد الأسرة (الأب، الأم، الأطفال) لتمكين التذكير بالجرعات وفحص التداخلات والمؤشرات الحيوية.
          </p>
          <button
            onClick={openAddPatient}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة الملف الأول الآن</span>
          </button>
        </div>
      )}

      {/* Patient Add / Edit Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden text-right my-8">
            <div className="bg-gradient-to-r from-teal-800 to-emerald-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingPatient ? 'تعديل الملف الصحي' : 'إضافة ملف صحي جديد'}
                  </h3>
                  <p className="text-xs text-teal-100">سجل بيانات المريض بدقة لحماية التداخلات الدوائية</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatientForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: الحاج إبراهيم أو عمر"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">صلة القرابة</label>
                  <input
                    type="text"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    placeholder="أب، أم، ابن، ابنة، ذاتي، جد..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العمر (سنوات) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوزن (كجم)</label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={weight || ''}
                    onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="مهم لحاسبة الأطفال"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحالة العامة</label>
                  <select
                    value={healthStatus}
                    onChange={(e) => setHealthStatus(e.target.value as HealthStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="stable">مستقرة</option>
                    <option value="chronic">مرض مزمن</option>
                    <option value="care">رعاية خاصة</option>
                    <option value="critical">حرجة</option>
                  </select>
                </div>
              </div>

              {/* Allergies */}
              <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200">
                <label className="block text-xs font-bold text-rose-900 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>الحساسيات الدوائية الموثقة (افصل بينها بفواصل):</span>
                </label>
                <input
                  type="text"
                  value={allergiesInput}
                  onChange={(e) => setAllergiesInput(e.target.value)}
                  placeholder="مثال: بنسلين، سلفا، أسبرين، مسكنات NSAID..."
                  className="w-full px-3.5 py-2 bg-white border border-rose-300 rounded-xl text-xs font-semibold text-rose-950 focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[11px] text-rose-700 mt-1">
                  هذه الحساسيات يفحصها المساعد الذكي تلقائياً لمنع أي دواء متعارض.
                </p>
              </div>

              {/* Chronic Diseases */}
              <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200">
                <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  <span>الأمراض المزمنة (افصل بينها بفواصل):</span>
                </label>
                <input
                  type="text"
                  value={chronicDiseasesInput}
                  onChange={(e) => setChronicDiseasesInput(e.target.value)}
                  placeholder="مثال: ارتفاع ضغط الدم، السكري، الربو، قرحة المعدة، الكلى..."
                  className="w-full px-3.5 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Surgeries & Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العمليات الجراحية السابقة أو الملاحظات الطبية
                </label>
                <textarea
                  rows={2}
                  value={surgeries}
                  onChange={(e) => setSurgeries(e.target.value)}
                  placeholder="مثال: عملية استئصال زائدة، قسطرة قلبية..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingPatient ? 'حفظ التعديلات' : 'إضافة الملف الصحي'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Comprehensive Details Modal (Vitals, Prescriptions, Kids) */}
      {activeDetailsPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden text-right my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl">
                  {activeDetailsPatient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{activeDetailsPatient.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-teal-100 mt-0.5">
                    <span>{activeDetailsPatient.relation}</span>
                    <span>•</span>
                    <span>{activeDetailsPatient.age} سنة</span>
                    {activeDetailsPatient.weight && <span>• {activeDetailsPatient.weight} كجم</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveDetailsPatient(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tab Navigation */}
            <div className="grid grid-cols-3 bg-teal-50/70 border-b border-teal-100 text-xs font-bold text-slate-600 shrink-0">
              <button
                onClick={() => setDetailSubTab('vitals')}
                className={`py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer ${
                  detailSubTab === 'vitals'
                    ? 'border-teal-700 text-teal-800 bg-white font-black'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Activity className="w-4 h-4 text-teal-600" />
                <span>المؤشرات الحيوية</span>
              </button>

              <button
                onClick={() => setDetailSubTab('prescriptions')}
                className={`py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer ${
                  detailSubTab === 'prescriptions'
                    ? 'border-teal-700 text-teal-800 bg-white font-black'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-teal-600" />
                <span>أرشيف الروشتات</span>
              </button>

              <button
                onClick={() => setDetailSubTab('kids')}
                className={`py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer ${
                  detailSubTab === 'kids'
                    ? 'border-teal-700 text-teal-800 bg-white font-black'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Calculator className="w-4 h-4 text-teal-600" />
                <span>التطعيمات وحاسبة الجرعات</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* SUB-TAB 1: VITALS TRACKER */}
              {detailSubTab === 'vitals' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-teal-600" />
                      <span>تسجيل قياس حيوي جديد:</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { id: 'blood_pressure', label: 'ضغط الدم (BP)' },
                        { id: 'blood_sugar', label: 'مستوى السكر' },
                        { id: 'heart_rate', label: 'نبضات القلب' },
                        { id: 'temperature', label: 'درجة الحرارة' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setVitalType(t.id as VitalType)}
                          className={`py-2 px-2 rounded-xl text-center font-bold transition cursor-pointer border ${
                            vitalType === t.id
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Conditional Input based on vitalType */}
                    {vitalType === 'blood_pressure' && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">الانقباضي (العالي):</label>
                          <input
                            type="number"
                            value={vitalSystolic}
                            onChange={(e) => setVitalSystolic(Number(e.target.value))}
                            placeholder="120"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">الانبساطي (الواطي):</label>
                          <input
                            type="number"
                            value={vitalDiastolic}
                            onChange={(e) => setVitalDiastolic(Number(e.target.value))}
                            placeholder="80"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                      </div>
                    )}

                    {vitalType === 'blood_sugar' && (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">القراءة (mg/dL):</label>
                          <input
                            type="number"
                            value={vitalValue}
                            onChange={(e) => setVitalValue(Number(e.target.value))}
                            placeholder="110"
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">توقيت القياس:</label>
                          <select
                            value={vitalTiming}
                            onChange={(e) => setVitalTiming(e.target.value as any)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                          >
                            <option value="fasting">صائم (صباحاً)</option>
                            <option value="post_prandial">بعد الأكل بساعتين</option>
                            <option value="random">عشوائي</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {(vitalType === 'heart_rate' || vitalType === 'temperature') && (
                      <div className="text-xs">
                        <label className="block text-slate-600 font-bold mb-1">
                          القيمة ({vitalType === 'heart_rate' ? 'نبضة/دقيقة bpm' : 'درجة مئوية °C'}):
                        </label>
                        <input
                          type="number"
                          step={vitalType === 'temperature' ? '0.1' : '1'}
                          value={vitalValue}
                          onChange={(e) => setVitalValue(Number(e.target.value))}
                          placeholder={vitalType === 'heart_rate' ? '72' : '37.0'}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold max-w-xs"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={vitalNote}
                        onChange={(e) => setVitalNote(e.target.value)}
                        placeholder="ملاحظات (مثال: قبل الإفطار، بعد المشي...)"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                      <button
                        onClick={handleAddVital}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        حفظ القياس
                      </button>
                    </div>
                  </div>

                  {/* Vitals Log Table */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-2">سجل القياسات السابقة:</h5>
                    {patientVitals.length > 0 ? (
                      <div className="space-y-2">
                        {patientVitals.slice().reverse().map((v) => (
                          <div
                            key={v.id}
                            className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                                {v.type === 'blood_pressure' && <Activity className="w-4 h-4" />}
                                {v.type === 'blood_sugar' && <Heart className="w-4 h-4" />}
                                {v.type === 'temperature' && <Thermometer className="w-4 h-4" />}
                                {v.type === 'heart_rate' && <Clock className="w-4 h-4" />}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900">
                                  {v.type === 'blood_pressure'
                                    ? `${v.systolic} / ${v.diastolic} mmHg`
                                    : `${v.value} ${v.unit}`}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {new Date(v.timestamp).toLocaleString('ar-EG')} {v.notes ? `• ${v.notes}` : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        لا توجد قياسات مسجلة بعد لهذا المريض.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: PRESCRIPTIONS & LAB ARCHIVE (LOCAL-ONLY PHOTO) */}
              {detailSubTab === 'prescriptions' && (
                <div className="space-y-4">
                  {/* Add Prescription Form */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-teal-600" />
                      <span>إضافة روشتة أو تقرير تحليل جديد:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">اسم الطبيب أو المعمل *</label>
                        <input
                          type="text"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                          placeholder="مثال: د. حسام (باطنة)"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">التخصص أو التشخيص</label>
                        <input
                          type="text"
                          value={rxDiagnosis}
                          onChange={(e) => setRxDiagnosis(e.target.value)}
                          placeholder="مثال: التهاب حلق، فحص سكر تراكمي..."
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                        />
                      </div>
                    </div>

                    {/* Local-only Image Capture */}
                    <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300">
                      <label className="block text-xs font-bold text-teal-900 mb-1 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-teal-600" />
                        <span>التقاط / إرفاق صورة الروشتة (يتم الحفظ محلياً داخل جهازك فقط):</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePrescriptionPhotoChange}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                      />
                      {rxImagePreview && (
                        <div className="mt-2 relative inline-block">
                          <img
                            src={rxImagePreview}
                            alt="معاينة الروشتة"
                            className="w-24 h-24 object-cover rounded-xl border-2 border-teal-500 shadow-sm"
                          />
                          <span className="block text-[10px] text-emerald-700 font-bold mt-1">
                            تم الضغط والحفظ في IndexedDB محلياً
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rxNotes}
                        onChange={(e) => setRxNotes(e.target.value)}
                        placeholder="ملاحظات على الأدوية أو التحاليل المقررة..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                      <button
                        onClick={handleAddPrescription}
                        disabled={!doctorName.trim()}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        حفظ الروشتة
                      </button>
                    </div>
                  </div>

                  {/* List of Prescriptions */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-2">الروشتات والتحاليل المحفوظة:</h5>
                    {patientPrescriptions.length > 0 ? (
                      <div className="space-y-3">
                        {patientPrescriptions.map((rx) => (
                          <div
                            key={rx.id}
                            className="p-4 bg-white rounded-2xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 text-sm">{rx.doctorName}</div>
                              {rx.diagnosis && (
                                <div className="text-slate-600 font-semibold">{rx.diagnosis}</div>
                              )}
                              <div className="text-[11px] text-slate-400">التاريخ: {rx.date}</div>
                              {rx.notes && <div className="text-slate-500 text-xs mt-1">{rx.notes}</div>}
                            </div>

                            {/* View Photo if stored */}
                            {rx.localImageId && (
                              <button
                                onClick={async () => {
                                  const url = await getLocalPhoto(rx.localImageId);
                                  if (url) {
                                    const w = window.open('');
                                    w?.document.write(`<img src="${url}" style="max-width:100%; height:auto;" />`);
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg font-bold flex items-center gap-1 shrink-0"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>عرض الصورة</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        لا توجد روشتات مسجلة لهذا المريض.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: KIDS VACCINATIONS & PEDIATRIC DOSE CALCULATOR */}
              {detailSubTab === 'kids' && (
                <div className="space-y-5">
                  {/* Interactive Pediatric Syrup / Antipyretic Calculator */}
                  <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 space-y-3">
                    <div className="flex items-center gap-2 text-teal-900">
                      <Calculator className="w-5 h-5 text-teal-700" />
                      <h4 className="text-sm font-black">حاسبة جرعات أدوية الأطفال وخافض الحرارة بالوزن</h4>
                    </div>
                    <p className="text-xs text-teal-800 leading-relaxed">
                      احسب بدقة جرعة الشراب بالمليلتر (ml) بناءً على وزن الطفل والتركيز المكتوب على العلبة وفق المعايير الطبية المعتمدة.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">وزن الطفل الحالي (كجم):</label>
                        <input
                          type="number"
                          step="0.5"
                          min="2"
                          max="50"
                          value={calcWeight}
                          onChange={(e) => setCalcWeight(Number(e.target.value))}
                          className="w-full p-2.5 bg-white border border-teal-300 rounded-xl font-bold text-sm text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">اختر الدواء والتركيز:</label>
                        <select
                          value={calcDrugId}
                          onChange={(e) => setCalcDrugId(e.target.value)}
                          className="w-full p-2.5 bg-white border border-teal-300 rounded-xl font-bold text-xs text-slate-900"
                        >
                          {PEDIATRIC_DRUGS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Result Box */}
                    <div className="p-3.5 bg-white rounded-xl border border-teal-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <span className="text-xs text-slate-500 font-semibold">الجرعة المقترحة لكل مرة:</span>
                        <div className="text-2xl font-black text-teal-800 flex items-baseline gap-1 mt-0.5">
                          <span>{pediatricResult.doseMl}</span>
                          <span className="text-sm font-bold text-slate-600">مليلتر (ml)</span>
                          <span className="text-xs text-slate-400 font-normal mr-2">
                            ({pediatricResult.doseMg} مجم من المادة الفعالة)
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 space-y-0.5">
                        <div className="font-bold">
                          ⏰ التكرار: كل {pediatricResult.minIntervalHours} ساعات عند اللزوم
                        </div>
                        <div className="text-slate-500">
                          بحد أقصى {pediatricResult.maxDosesPerDay} مرات خلال 24 ساعة
                        </div>
                      </div>
                    </div>

                    {pediatricResult.warning && (
                      <div className="p-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold">
                        ⚠️ {pediatricResult.warning}
                      </div>
                    )}
                  </div>

                  {/* Vaccinations Tracker */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Syringe className="w-4 h-4 text-teal-600" />
                      <span>جدول تطعيمات الطفل:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <input
                        type="text"
                        value={vacName}
                        onChange={(e) => setVacName(e.target.value)}
                        placeholder="اسم التطعيم (مثال: شلل أطفال، خماسي، إنفلونزا...)"
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold sm:col-span-1"
                      />
                      <input
                        type="date"
                        value={vacDueDate}
                        onChange={(e) => setVacDueDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold"
                      />
                      <div className="flex gap-2">
                        <select
                          value={vacStatus}
                          onChange={(e) => setVacStatus(e.target.value as any)}
                          className="flex-1 px-2 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-xs"
                        >
                          <option value="upcoming">قادم ومستحق</option>
                          <option value="taken">تم إعطاؤه ✅</option>
                        </select>
                        <button
                          onClick={handleAddVaccination}
                          disabled={!vacName.trim()}
                          className="px-3 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl font-bold transition"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>

                    {/* Vaccine List */}
                    <div className="space-y-2 mt-3">
                      {patientVaccines.length > 0 ? (
                        patientVaccines.map((v) => (
                          <div
                            key={v.id}
                            className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Syringe className="w-4 h-4 text-teal-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900">{v.vaccineName}</span>
                                <span className="text-slate-500 mr-2">(الموعد: {v.dueDate})</span>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                v.status === 'taken'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {v.status === 'taken' ? 'تم أخذ التطعيم' : 'مستحق قريباً'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                          لا توجد تطعيمات مسجلة لهذا الطفل حتى الآن.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
