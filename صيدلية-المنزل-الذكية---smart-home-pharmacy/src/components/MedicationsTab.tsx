import React, { useState, useEffect } from 'react';
import { Medication, Patient, FoodTiming } from '../types/pharmacy';
import { calculateExpiryStatus } from '../utils/dateAndHijri';
import { saveLocalPhoto, getLocalPhoto } from '../services/localPhotoStorage';
import {
  Pill,
  Plus,
  ShoppingCart,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Edit2,
  Trash2,
  X,
  Camera,
  Share2,
  Copy,
  Check,
  Heart,
  Package,
} from 'lucide-react';

interface MedicationsTabProps {
  medications: Medication[];
  patients: Patient[];
  onSaveMedication: (med: Medication) => void;
  onDeleteMedication: (id: string) => void;
}

export const MedicationsTab: React.FC<MedicationsTabProps> = ({
  medications,
  patients,
  onSaveMedication,
  onDeleteMedication,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showChronicOnly, setShowChronicOnly] = useState(false);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Form State
  const [tradeName, setTradeName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [category, setCategory] = useState('مسكنات وخافض حرارة');
  const [patientId, setPatientId] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState<number>(20);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [expiryDate, setExpiryDate] = useState('');
  const [isChronic, setIsChronic] = useState(false);
  const [foodTiming, setFoodTiming] = useState<FoodTiming>('after_meal');
  const [localImageId, setLocalImageId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Thumbnails cache map
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load local photos for visible medications
    medications.forEach((m) => {
      if (m.localImageId && !thumbnails[m.localImageId]) {
        getLocalPhoto(m.localImageId).then((url) => {
          if (url) {
            setThumbnails((prev) => ({ ...prev, [m.localImageId!]: url }));
          }
        });
      }
    });
  }, [medications]);

  const categories = [
    'الكل',
    'مسكنات وخافض حرارة',
    'مضادات حيوية',
    'ضغط وقلب',
    'سكري',
    'حساسية وجهاز تنفسي',
    'فيتامينات ومكملات',
    'جهاز هضمي ومعدة',
    'أدوية أطفال',
    'أخرى',
  ];

  // Filtered medications
  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.tradeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.patientName && m.patientName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || categoryFilter === 'الكل' || m.category === categoryFilter;
    const matchesChronic = !showChronicOnly || m.isChronic;

    return matchesSearch && matchesCategory && matchesChronic;
  });

  const openAddMedication = () => {
    setEditingMed(null);
    setTradeName('');
    setScientificName('');
    setCategory('مسكنات وخافض حرارة');
    setPatientId(patients[0]?.id || '');
    setCurrentQuantity(20);
    setLowStockThreshold(5);
    setExpiryDate('');
    setIsChronic(false);
    setFoodTiming('after_meal');
    setLocalImageId(null);
    setPhotoPreview(null);
    setNotes('');
    setIsAddEditModalOpen(true);
  };

  const openEditMedication = (m: Medication) => {
    setEditingMed(m);
    setTradeName(m.tradeName);
    setScientificName(m.scientificName);
    setCategory(m.category);
    setPatientId(m.patientId || '');
    setCurrentQuantity(m.currentQuantity);
    setLowStockThreshold(m.lowStockThreshold);
    setExpiryDate(m.expiryDate);
    setIsChronic(m.isChronic);
    setFoodTiming(m.foodTiming);
    setLocalImageId(m.localImageId || null);
    setNotes(m.notes || '');

    if (m.localImageId) {
      getLocalPhoto(m.localImageId).then(setPhotoPreview);
    } else {
      setPhotoPreview(null);
    }

    setIsAddEditModalOpen(true);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imageId = await saveLocalPhoto(file);
        setLocalImageId(imageId);
        const dataUrl = await getLocalPhoto(imageId);
        setPhotoPreview(dataUrl);
      } catch (err) {
        console.error('Error saving local medicine photo:', err);
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim()) return;

    const assignedPatient = patients.find((p) => p.id === patientId);

    const updatedMed: Medication = {
      id: editingMed ? editingMed.id : 'm_' + Date.now(),
      tradeName: tradeName.trim(),
      scientificName: scientificName.trim(),
      category,
      patientId: patientId || undefined,
      patientName: assignedPatient ? assignedPatient.name : undefined,
      currentQuantity: Number(currentQuantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 1,
      expiryDate: expiryDate || '2028-12-31',
      isChronic,
      foodTiming,
      localImageId,
      notes: notes.trim() || undefined,
      createdAt: editingMed ? editingMed.createdAt : new Date().toISOString(),
    };

    onSaveMedication(updatedMed);
    setIsAddEditModalOpen(false);
  };

  // Generate Shopping List of low stock and expired meds
  const shoppingItems = medications.filter((m) => {
    const exp = calculateExpiryStatus(m.expiryDate);
    return m.currentQuantity <= m.lowStockThreshold || exp.status === 'expired';
  });

  const getShoppingListText = () => {
    let text = `📋 *قائمة نواقص الأدوية المطلوبة للشراء من الصيدلية* 💊\n`;
    text += `صيدلية المنزل الذكية - تاريخ: ${new Date().toLocaleDateString('ar-EG')}\n\n`;

    if (shoppingItems.length === 0) {
      text += `لا توجد أدوية ناقصة حالياً، جميع الأدوية متوفرة بكمية كافية.`;
      return text;
    }

    shoppingItems.forEach((m, idx) => {
      const exp = calculateExpiryStatus(m.expiryDate);
      const isExp = exp.status === 'expired';
      text += `${idx + 1}. *${m.tradeName}* (${m.scientificName || m.category})\n`;
      text += `   - المريض: ${m.patientName || 'عام'}\n`;
      text += `   - الرصيد المتبقي: ${m.currentQuantity} وحدات ${isExp ? '⚠️ (منتهي الصلاحية)' : '⚠️ (أوشك على النفاد)'}\n`;
      text += `   - مطلوب شراء: عبوة جديدة\n\n`;
    });

    text += `يرجى توفير هذه الأصناف أو بدائلها المطابقة للمادة الفعالة مع الشكر.`;
    return text;
  };

  const handleCopyShoppingList = () => {
    navigator.clipboard.writeText(getShoppingListText());
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(getShoppingListText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const foodLabelMap: Record<FoodTiming, { label: string; badge: string }> = {
    before_meal: { label: 'قبل الأكل', badge: 'bg-amber-100 text-amber-900 border-amber-200' },
    after_meal: { label: 'بعد الأكل', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    empty_stomach: { label: 'على معدة فارغة', badge: 'bg-sky-100 text-sky-900 border-sky-200' },
    with_meal: { label: 'مع الأكل', badge: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
    before_sleep: { label: 'قبل النوم', badge: 'bg-purple-100 text-purple-900 border-purple-200' },
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Pill className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              دليل الأدوية المنزلية
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة المخزون، تواريخ الصلاحية، الجرعات، وتوثيق صور العلب محلياً
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsShoppingListOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-amber-700" />
            <span>قائمة النواقص للشراء 📋</span>
            {shoppingItems.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-600 text-white rounded-full font-bold">
                {shoppingItems.length}
              </span>
            )}
          </button>

          <button
            onClick={openAddMedication}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة دواء جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Chronic Disease Priority Card (Deep Blue Gradient) */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-5 text-white shadow-md border border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">رعاية ومتابعة الأدوية المزمنة الحيوية</h3>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              أدوية الضغط، السكر، القلب والربو التي يجب ألا تنقطع أبداً عن المريض
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowChronicOnly(!showChronicOnly)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            showChronicOnly
              ? 'bg-indigo-500 text-white shadow-sm'
              : 'bg-white/10 hover:bg-white/20 text-indigo-200'
          }`}
        >
          <span>{showChronicOnly ? 'عرض جميع الأدوية' : 'عرض الأدوية المزمنة فقط'}</span>
        </button>
      </div>

      {/* 3. Search & Category Filter Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم التجاري، المادة الفعالة (الاسم العلمي)، التصنيف أو المريض..."
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition cursor-pointer ${
                categoryFilter === cat || (cat === 'الكل' && categoryFilter === 'all')
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Medications Cards List */}
      {filteredMeds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map((med) => {
            const exp = calculateExpiryStatus(med.expiryDate);
            const isLow = med.currentQuantity <= med.lowStockThreshold;
            const photoUrl = med.localImageId ? thumbnails[med.localImageId] : null;
            const foodInfo = foodLabelMap[med.foodTiming] || foodLabelMap.after_meal;

            return (
              <div
                key={med.id}
                className={`bg-white rounded-3xl p-5 border shadow-xs transition hover:border-teal-400 flex flex-col justify-between gap-4 ${
                  isLow ? 'border-rose-300' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Thumbnail */}
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={med.tradeName}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex flex-col items-center justify-center shrink-0">
                        <Package className="w-6 h-6 stroke-[1.8]" />
                        <span className="text-[9px] font-bold mt-0.5 text-teal-800">علبة دواء</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                          {med.tradeName}
                        </h3>
                        {med.isChronic && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200">
                            مزمن
                          </span>
                        )}
                      </div>

                      {med.scientificName && (
                        <p className="text-xs text-teal-800 font-mono font-medium truncate mt-0.5">
                          {med.scientificName}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {med.category}
                        </span>

                        {med.patientName && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-semibold text-[11px] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {med.patientName}
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${foodInfo.badge}`}>
                          {foodInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock & Expiry Indicators */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    {/* Stock level */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        isLow
                          ? 'bg-rose-50 text-rose-900 border-rose-200 font-bold'
                          : 'bg-slate-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="text-[11px] text-slate-500 font-medium">الرصيد المتوفر:</span>
                      <span className="font-black text-sm">
                        {med.currentQuantity} <span className="text-[11px] font-normal">وحدة</span>
                      </span>
                    </div>

                    {/* Expiry countdown */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-bold ${exp.badgeClass}`}
                    >
                      <span>الصلاحية:</span>
                      <span className="truncate max-w-[110px]" title={exp.labelAr}>
                        {exp.labelAr}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEditMedication(med)}
                    className="p-2 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="تعديل الدواء"
                    aria-label="تعديل الدواء"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteMedication(med.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="حذف الدواء"
                    aria-label="حذف الدواء"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">دليل الأدوية فارغ تماماً</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            أضف أدويتك المنزلية لمراقبة رصيد الحبوب وتواريخ الصلاحية والتنبيهات الموقوتة.
          </p>
          <button
            onClick={openAddMedication}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة الدواء الأول الآن</span>
          </button>
        </div>
      )}

      {/* Add / Edit Medication Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden text-right my-8">
            <div className="bg-gradient-to-r from-teal-800 to-emerald-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingMed ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد للصيدلية'}
                  </h3>
                  <p className="text-xs text-teal-100">سجل الاسم العلمي والمخزون وتعليمات الأكل بدقة</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم التجاري *</label>
                  <input
                    type="text"
                    required
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="مثال: بنادول إكسترا، كونكور، أوجمنتين..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم العلمي / المادة الفعالة
                  </label>
                  <input
                    type="text"
                    value={scientificName}
                    onChange={(e) => setScientificName(e.target.value)}
                    placeholder="مثال: Paracetamol, Bisoprolol, Amoxicillin..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف الدوائي</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    {categories.filter((c) => c !== 'الكل').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المريض المخصص له</label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">استخدام عام للأسرة</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.relation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock and Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الرصيد الحالي (وحدات/حبوب)</label>
                  <input
                    type="number"
                    min="0"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حد تنبيه النفاد</label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ انتهاء الصلاحية</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Food timing and chronic toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تعليمات توقيت الأكل</label>
                  <select
                    value={foodTiming}
                    onChange={(e) => setFoodTiming(e.target.value as FoodTiming)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="before_meal">قبل الأكل (على معدة فارغة)</option>
                    <option value="after_meal">بعد الأكل</option>
                    <option value="with_meal">مع الطعام أثناء الوجبة</option>
                    <option value="empty_stomach">على الريق</option>
                    <option value="before_sleep">قبل النوم</option>
                  </select>
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChronic}
                      onChange={(e) => setIsChronic(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-indigo-950">
                      دواء مزمن (يتطلب متابعة مستمرة وتجديد)
                    </span>
                  </label>
                </div>
              </div>

              {/* Local Photo Storage ONLY */}
              <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-200">
                <label className="block text-xs font-bold text-teal-900 mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-teal-700" />
                  <span>التقاط / رفع صورة علبة الدواء (تخزين محلي بجهازك فقط):</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoCapture}
                  className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-700 file:text-white hover:file:bg-teal-800 cursor-pointer"
                />
                <p className="text-[11px] text-teal-800 mt-1">
                  تُضغط الصورة وتُحفظ في ذاكرة متصفحك (IndexedDB) للتعرف البصري الفوري عند المنبه بدون رفع للسحابة.
                </p>

                {photoPreview && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt="معاينة"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-teal-600 shadow-sm"
                    />
                    <span className="text-xs font-bold text-emerald-700">
                      ✅ تم حفظ الصورة محلياً بنجاح
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingMed ? 'حفظ التعديلات' : 'إضافة الدواء'}
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

      {/* One-Click Shopping List Modal */}
      {isShoppingListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden text-right">
            <div className="bg-gradient-to-r from-teal-800 to-amber-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">قائمة النواقص الجاهزة للشراء</h3>
                  <p className="text-xs text-amber-100">الأدوية المنتهية أو التي أوشكت كمياتها على النفاد</p>
                </div>
              </div>
              <button
                onClick={() => setIsShoppingListOpen(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
                <pre className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
                  {getShoppingListText()}
                </pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={handleCopyShoppingList}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                      <span>تم نسخ القائمة للحافظة!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ القائمة كاملة</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>إرسال عبر واتساب للصيدلي</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
