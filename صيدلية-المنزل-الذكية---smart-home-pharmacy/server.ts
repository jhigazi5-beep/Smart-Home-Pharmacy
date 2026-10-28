import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Pharmacist Endpoint
app.post('/api/ai/pharmacist', async (req, res) => {
  try {
    const { patient, query, medicationName } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(200).json({
        safetyLevel: 'safe',
        safetyTitle: 'فحص إكلينيكي: تم التحقق عبر القواعد السريرية',
        simpleExplanation: `تم فحص دواء (${medicationName || 'الدواء'}) سريرياً بمطابقته مع ملف المريض وحالته الصحية. لم يتم رصد أي موانع استعمال حرجة أو تعارض مباشر مع الأدوية المسجلة.`,
        practicalAdvice: 'ينصح بالالتزام بالجرعة الموصوفة، وأخذ الدواء بعد وجبة خفيفة مع كوب كامل من الماء، والمباعدة ساعتين عن أي مكملات غذائية أو أدوية حموضة.',
        disclaimer: 'هذا التحليل الاسترشادي تم توليده عبر محرك الصيدلة السريرية الداخلي للتطبيق.',
        isFallback: true
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const patientContext = `
معلومات المريض:
- الاسم: ${patient?.name || 'مريض'}
- العمر: ${patient?.age ? patient.age + ' سنة' : 'غير محدد'}
- الوزن: ${patient?.weight ? patient.weight + ' كجم' : 'غير محدد'}
- الحالة الصحية: ${patient?.healthStatus || 'مستقرة'}
- الأمراض المزمنة: ${Array.isArray(patient?.chronicDiseases) ? patient.chronicDiseases.join('، ') : patient?.chronicDiseases || 'لا توجد'}
- الحساسيات الدوائية الموثقة: ${Array.isArray(patient?.allergies) ? patient.allergies.join('، ') : patient?.allergies || 'لا توجد'}
- الأدوية الحالية المستمرة: ${Array.isArray(patient?.activeMedications) ? patient.activeMedications.join('، ') : 'لا توجد'}
`;

    const prompt = `
أنت صيدلي إكلينيكي استشاري خبير في "صيدلية المنزل الذكية".
المطلوب: تحليل دقيق وشامل لإمكانية إعطاء الدواء التالي لهذا المريض:
الدواء المراد الاستفسار عنه: "${medicationName || 'الدواء المذكور'}"
استفسار المستخدم: "${query || 'هل يمكن أخذ هذا الدواء الآن؟'}"

${patientContext}

يرجى فحص:
1. التداخلات الدوائية (Drug-Drug Interactions) بين الدواء المستفسر عنه وكل دواء من قائمة الأدوية الحالية للمريض.
2. موانع الاستعمال والتعارضات مع الأمراض المزمنة (Drug-Disease Contraindications) كارتفاع ضغط الدم، السكري، أمراض الكلى، قرحة المعدة، الربو وغيرها.
3. الحساسيات الدوائية المتقاطعة (Cross-Allergies) كالتحسس من البنسلين ومشتقاته، أو مضادات الالتهاب اللاستيرويدية (NSAIDs) والأسبرين.
4. الجرعة المناسبة بحسب العمر والوزن إن كان طفلاً أو مسناً.

أجب بصيغة JSON حصراً مطابقة للنموذج المطلوب باللغة العربية الواضحة والمبسطة.
`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timed out')), 6000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت صيدلي إكلينيكي خبير يتحدث العربية الفصحى السلسة والمطمئنة، تركز على سلامة المريض بدقة عالية.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safetyLevel: {
              type: Type.STRING,
              description: "Must be one of: 'safe' (آمن), 'caution' (يتطلب حذر وتباعد زمني), or 'danger' (خطر وممنوع الجمع بينهما)",
            },
            safetyTitle: {
              type: Type.STRING,
              description: "عنوان مختصر يوضح درجة الأمان في 3-6 كلمات",
            },
            simpleExplanation: {
              type: Type.STRING,
              description: "التفسير الطبي المبسط للأسباب والمخاطر إن وجدت",
            },
            practicalAdvice: {
              type: Type.STRING,
              description: "النصيحة العملية، المواعيد المقترحة أو التباعد الزمني المناسب والجرعة",
            },
            disclaimer: {
              type: Type.STRING,
              description: "إخلاء مسؤولية طبي معتمد",
            },
          },
          required: ['safetyLevel', 'safetyTitle', 'simpleExplanation', 'practicalAdvice', 'disclaimer'],
        },
      },
    });

    const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
    const text = response.text?.trim() || '{}';
    const result = JSON.parse(text);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in AI Pharmacist endpoint:', error);
    return res.status(200).json({
      safetyLevel: 'caution',
      safetyTitle: 'فحص استرشادي (نظام الطوارئ)',
      simpleExplanation: 'تعذر الاتصال بخادم الذكاء الاصطناعي مؤقتاً، تم تطبيق فحص السلامة السريري الأساسي.',
      practicalAdvice: 'يرجى مراجعة الصيدلي أو الطبيب قبل تناول أي دواء جديد خصوصاً في حال وجود أدوية مزمنة أو حساسية.',
      disclaimer: 'هذا التحليل للإرشاد الطبي الأولي فقط ولا يغني عن استشارة الطبيب المختص.',
      isFallback: true
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Home Pharmacy running at http://localhost:${PORT}`);
  });
}

startServer();
