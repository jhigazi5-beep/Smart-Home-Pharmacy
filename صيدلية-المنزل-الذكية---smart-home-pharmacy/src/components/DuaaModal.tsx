import React, { useState } from 'react';
import { Sparkles, X, Check, HeartHandshake } from 'lucide-react';
import { DEFAULT_DUAA } from '../services/storage';

interface DuaaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDuaa: string;
  onSaveDuaa: (duaa: string) => void;
}

const PRESET_DUAAS = [
  {
    title: 'دعاء الشفاء المأثور عن النبي ﷺ',
    text: 'اللهم رب الناس، أذهب الباس، واشف أنت الشافي، لا شفاء إلا شفاؤك، شفاءً لا يغادر سقماً.',
  },
  {
    title: 'دعاء نبي الله أيوب عليه السلام',
    text: 'رَبِّ إِنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ.',
  },
  {
    title: 'دعاء العافية الشامل',
    text: 'اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي.',
  },
  {
    title: 'دعاء الرقية النبوية',
    text: 'بسم الله أرقيك، من كل شيء يؤذيك، من شر كل نفس أو عين حاسد، الله يشفيك.',
  },
  {
    title: 'دعاء للمريض عند عيادته',
    text: 'أسأل الله العظيم رب العرش العظيم أن يشفيك ويعافيك.',
  },
];

export const DuaaModal: React.FC<DuaaModalProps> = ({
  isOpen,
  onClose,
  currentDuaa,
  onSaveDuaa,
}) => {
  const [customText, setCustomText] = useState(currentDuaa || DEFAULT_DUAA);

  if (!isOpen) return null;

  const handleSelectPreset = (text: string) => {
    setCustomText(text);
  };

  const handleSave = () => {
    onSaveDuaa(customText.trim() || DEFAULT_DUAA);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-teal-200 overflow-hidden text-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">أدعية الشفاء والعافية المباركة</h3>
              <p className="text-xs text-teal-100">اختر دعاءً يظهر في أعلى الشاشة أو اكتب دعاءك الخاص</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Custom Duaa Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الدعاء المعروض حالياً (يمكنك تعديله أو كتابة ما تحب):
            </label>
            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full p-3.5 bg-teal-50/50 border border-teal-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 leading-relaxed"
            />
          </div>

          {/* Preset list */}
          <div>
            <span className="block text-xs font-bold text-slate-500 mb-2">
              نماذج من الأدعية النبوية والقرآنية المأثورة:
            </span>
            <div className="space-y-2">
              {PRESET_DUAAS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(item.text)}
                  className={`w-full text-right p-3 rounded-xl border text-xs transition cursor-pointer flex flex-col gap-1 ${
                    customText === item.text
                      ? 'bg-teal-50 border-teal-400 text-teal-950 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-teal-800 text-[11px]">{item.title}</span>
                  <span className="leading-relaxed">{item.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>حفظ وتثبيت الدعاء في الشريط العلوي</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
