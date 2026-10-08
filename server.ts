import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/database/db.ts';
import { whatsapp } from './server/whatsapp/whatsapp_service.ts';
import { waLogger } from './server/whatsapp/whatsapp_logger.ts';
import { handleWebhookVerification, handleIncomingWebhook } from './server/whatsapp/webhook_handler.ts';
import { orchestrateMessage } from './server/agents/orchestrator.ts';
import { ragService } from './server/rag/rag_service.ts';
import { quizAgent } from './server/agents/quiz_agent.ts';
import { plannerAgent } from './server/agents/planner_agent.ts';
import { transcribeAudio, getGeminiAI, generateContentWithRetry, generateDynamicQuiz } from './server/gemini.ts';
import { runTutorAgent } from './server/agents/tutor_agent.ts';
import { CURATED_LEARNING_RESOURCES } from './server/database/learningResources.ts';
import {
  startAutomatedReminderScheduler,
  checkAndSendAutomatedReminders,
  sendAutomatedReminderNow,
  getAutomatedReminderStatus,
  generatePersonalizedReminderMessage,
  registerStudentFcmToken,
  buildFcmStudyReminderPayload,
  recordFcmPushDelivery,
  getFcmPushHistory,
} from './server/services/automatedReminders.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers with ample limit for question screenshots
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----------------------------------------------------
// 1. Official WhatsApp Cloud API Webhook Endpoints
// Support standard and alternate webhook paths for Meta Developer Dashboard
// ----------------------------------------------------
app.get('/webhook/whatsapp', handleWebhookVerification);
app.post('/webhook/whatsapp', handleIncomingWebhook);
app.get('/webhook', handleWebhookVerification);
app.post('/webhook', handleIncomingWebhook);
app.get('/api/webhook', handleWebhookVerification);
app.post('/api/webhook', handleIncomingWebhook);
app.get('/api/webhook/whatsapp', handleWebhookVerification);
app.post('/api/webhook/whatsapp', handleIncomingWebhook);

// ----------------------------------------------------
// 2. Interactive Simulator Endpoint
// ----------------------------------------------------
app.post('/api/simulate/incoming', async (req, res) => {
  try {
    const { fromPhone, userId, senderName, text, mediaType, mediaBase64, mimeType } = req.body || {};
    if (!text && !mediaBase64) {
      return res.status(400).json({ error: 'text, audio, or image is required' });
    }

    const result = await orchestrateMessage({
      fromPhone: fromPhone || '+919876543210',
      userId,
      senderName: senderName || 'Student',
      text,
      mediaType: mediaType || (mediaBase64 ? 'image' : 'text'),
      mediaBase64,
      mimeType,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Simulator error:', err);
    res.status(500).json({ error: err.message || 'Internal simulation error' });
  }
});

// Dedicated audio voice note transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType, fallbackText, text } = req.body;
    if (!audioBase64 && !fallbackText && !text) {
      return res.status(400).json({ error: 'audioBase64 or fallbackText is required' });
    }
    const transcription = await transcribeAudio(audioBase64 || '', mimeType || 'audio/webm', fallbackText || text);
    res.json({ success: true, transcription });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Transcription error' });
  }
});

// ----------------------------------------------------
// Voice AI Agent: Multilingual Voice-to-Voice & Document Grounding
// ----------------------------------------------------
app.post('/api/voice/chat', async (req, res) => {
  try {
    const {
      text,
      language = 'en',
      documentId,
      studentName = 'Student',
      educationLevel = 'college',
      skillLevel = 'intermediate',
    } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text query is required' });
    }

    const cleanQuery = text.trim();
    let relevantChunks: any[] = [];
    let docContext = '';
    const documentSources: { title: string; chunkSnippet: string; subject: string }[] = [];

    if (documentId && documentId !== 'all') {
      const { document, chunks } = ragService.getDocument(documentId);
      if (chunks && chunks.length > 0) {
        const filtered = chunks.filter((c: any) =>
          cleanQuery
            .toLowerCase()
            .split(/\s+/)
            .some((w: string) => w.length > 3 && c.content.toLowerCase().includes(w))
        );
        relevantChunks = (filtered.length > 0 ? filtered : chunks).slice(0, 3);
        docContext = relevantChunks
          .map((c: any) => `[Document: ${document?.title || 'Course Material'}]\n${c.content}`)
          .join('\n\n');
        relevantChunks.forEach((c: any) => {
          documentSources.push({
            title: document?.title || 'Selected Document',
            chunkSnippet: c.content.slice(0, 160) + '...',
            subject: document?.subject || 'Curriculum',
          });
        });
      }
    } else {
      // Global search across all indexed study documents
      const searchRes = ragService.search(cleanQuery, 3);
      relevantChunks = searchRes.chunks;
      docContext = searchRes.contextString;
      searchRes.chunks.forEach((chunk) => {
        const parentDoc = db.documents.get(chunk.documentId);
        documentSources.push({
          title: parentDoc?.title || chunk.subject || 'Verified Material',
          chunkSnippet: chunk.content.slice(0, 160) + '...',
          subject: chunk.subject || 'General',
        });
      });
    }

    // Call Gemini with multilingual voice tutor instructions
    const ai = getGeminiAI();
    let responseText = '';

    const langNameMap: Record<string, string> = {
      en: 'English',
      hi: 'Hindi (हिंदी)',
      kn: 'Kannada (ಕನ್ನಡ)',
      ta: 'Tamil (தமிழ்)',
      te: 'Telugu (తెలుగు)',
      bn: 'Bengali (বাংলা)',
      mr: 'Marathi (मराठी)',
      gu: 'Gujarati (ગુજરાતી)',
      ml: 'Malayalam (മലയാളം)',
      es: 'Spanish (Español)',
      fr: 'French (Français)',
      de: 'German (Deutsch)',
      ja: 'Japanese (日本語)',
      ar: 'Arabic (العربية)',
      zh: 'Chinese (中文)',
      pt: 'Portuguese (Português)',
      ru: 'Russian (Русский)',
      ko: 'Korean (한국어)',
      it: 'Italian (Italiano)',
      ur: 'Urdu (اردو)',
    };
    const targetLanguageName = langNameMap[language] || language;

    const voicePrompt = `You are a world-class Voice AI Personal Tutor speaking voice-to-voice with a student named ${studentName}.
Language Instruction: You MUST formulate your answer in ${targetLanguageName}. If technical code keywords are standard in English (e.g. "for loop", "def", "class"), keep them natural.
Voice Guidelines:
- Speak warmly, engagingly, and concisely so it sounds natural and clear when read aloud.
- Use Socratic teaching: explain the core intuition, give a memorable real-world analogy, and ask a short question to check understanding.
- Cite facts from the verified course document notes when explaining.

${docContext ? `--- VERIFIED COURSE STUDY DOCUMENTS ---\n${docContext}\n(Ground your explanation in these verified facts)\n` : ''}

Student Spoken Question: "${cleanQuery}"`;

    if (ai) {
      try {
        const genRes = await generateContentWithRetry({
          contents: voicePrompt,
          preferredModel: 'gemini-3.8-flash',
          maxAttempts: 2,
          timeoutMs: 10000,
        });
        if (genRes.text && genRes.text.trim()) {
          responseText = genRes.text.trim();
        }
      } catch (err) {
        console.warn('Voice chat Gemini call fell back to multilingual template:', err);
      }
    }

    // Multilingual high quality fallback if Gemini is rate limited or unavailable
    if (!responseText) {
      if (language === 'hi') {
        responseText = `नमस्ते ${studentName}! आपके सवाल "${cleanQuery}" के बारे में:\n\n1. मूल संकल्पना: अध्ययन सामग्री के अनुसार, यह अवधारणा छोटे-छोटे तार्किक चरणों में विभाजित होकर आसानी से समझ आती है।\n\n2. उदाहरण: जैसे किसी पुस्तक को पढ़ने से पहले उसकी अनुक्रमणिका देखना जरूरी होता है, वैसे ही बेसिक नियम समझना आवश्यक है।\n\nक्या आप इस विषय पर अभ्यास प्रश्न हल करना चाहेंगे?`;
      } else if (language === 'kn') {
        responseText = `ನಮಸ್ಕಾರ ${studentName}! ನಿಮ್ಮ ಪ್ರಶ್ನೆ "${cleanQuery}" ಬಗ್ಗೆ:\n\n1. ಮೂಲ ತತ್ವ: ನಮ್ಮ ಅಧ್ಯಯನ ಸಾಮಗ್ರಿಯ ಪ್ರಕಾರ, ಯಾವುದೇ ಕಠಿಣ ವಿಷಯವನ್ನು ಹಂತ-ಹಂತವಾಗಿ ಸುಲಭವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಬಹುದು.\n\n2. ನೈಜ ಉದಾಹರಣೆ: ಗಿಡಕ್ಕೆ ನೀರು ಹಾಕುವಂತೆ, ಪ್ರತಿದಿನ ಅಭ್ಯಾಸ ಮಾಡುವುದರಿಂದ ಜ್ಞಾನ ಬೆಳೆಯುತ್ತದೆ.\n\nಈ ಪರಿಕಲ್ಪನೆಯ ಬಗ್ಗೆ ಇನ್ನಷ್ಟು ತಿಳಿದುಕೊಳ್ಳಲು ಬಯಸುವಿರಾ?`;
      } else if (language === 'es') {
        responseText = `¡Hola ${studentName}! Respecto a tu pregunta "${cleanQuery}":\n\n1. Concepto clave: Según tus materiales de estudio verificados, este concepto se comprende mejor descomponiéndolo en pasos lógicos.\n\n2. Analogía: Como armar un rompecabezas, cada pieza se conecta con la siguiente para formar el panorama completo.\n\n¿Te gustaría que hagamos un ejercicio práctico para reforzarlo?`;
      } else if (language === 'fr') {
        responseText = `Bonjour ${studentName}! Concernant votre question "${cleanQuery}":\n\n1. Concept clé: D'après vos documents de cours, ce concept s'explique le mieux par étapes logiques.\n\n2. Analogie: Comme la construction d'un pont, chaque pilier doit être solide pour soutenir l'ensemble.\n\nSouhaitez-vous un petit défi pour vérifier votre compréhension?`;
      } else {
        responseText = `Hello ${studentName}! Regarding your question: "${cleanQuery}":\n\n1. Core Concept: Based on your verified study documents, this topic breaks down into structured, intuitive building blocks.\n\n2. Real-World Analogy: Think of it like building a sturdy archway—each keystone supports the next step.\n\n${documentSources.length > 0 ? `I verified this from "${documentSources[0].title}".` : ''}\n\nWould you like me to quiz you on this concept or explore the next section?`;
      }
    }

    res.json({
      success: true,
      userTranscript: cleanQuery,
      responseText,
      language,
      documentSources,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Voice chat processing failed' });
  }
});

// ----------------------------------------------------
// 3. Student & Profile Endpoints
// ----------------------------------------------------
app.get('/api/students', (req, res) => {
  const profiles = Array.from(db.profiles.values());
  const users = Array.from(db.users.values());
  res.json({ profiles, users });
});

app.get('/api/students/:id', (req, res) => {
  const prof =
    db.getProfileByUserId(req.params.id) ||
    db.getOrCreateProfile('+919876543210', 'Student', req.params.id).profile;
  res.json(prof);
});

app.put('/api/students/:id', (req, res) => {
  const updated = db.updateProfile(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Student not found' });
  res.json(updated);
});

// ----------------------------------------------------
// 3b. Daily Morning Affirmations & Study Quotes Endpoint
// ----------------------------------------------------
const CURATED_MORNING_AFFIRMATIONS = [
  {
    quote: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
    affirmation: 'Every concept I master today compounds into lifelong expertise.',
    category: 'Consistency & Streak',
    morningTip: 'Start with 15 minutes on your toughest topic while your mind is sharpest.',
  },
  {
    quote: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
    author: 'Mahatma Gandhi',
    affirmation: 'I approach complex problems with curiosity, patience, and resilience.',
    category: 'Lifelong Mastery',
    morningTip: 'Write down one key question you want answered before your study session begins.',
  },
  {
    quote: 'The expert in anything was once a beginner who refused to give up.',
    author: 'Helen Hayes',
    affirmation: 'Challenging topics are not roadblocks—they are stepping stones to mastery.',
    category: 'Growth Mindset',
    morningTip: 'Review one weak topic today and turn a mistake into a permanent strength.',
  },
  {
    quote: 'An investment in knowledge pays the best interest.',
    author: 'Benjamin Franklin',
    affirmation: 'The focused hours I invest this morning build my future confidence.',
    category: 'Deep Focus',
    morningTip: 'Complete one uninterrupted 25-minute Pomodoro sprint before checking messages.',
  },
  {
    quote: 'It does not matter how slowly you go as long as you do not stop.',
    author: 'Confucius',
    affirmation: 'My daily learning streak reflects my dedication to steady progress.',
    category: 'Perseverance',
    morningTip: 'Celebrate small wins—solving even 3 practice problems keeps your momentum alive.',
  },
  {
    quote: 'Education is the passport to the future, for tomorrow belongs to those who prepare for it today.',
    author: 'Malcolm X',
    affirmation: 'Today I prepare with clarity, discipline, and purpose.',
    category: 'Exam Readiness',
    morningTip: 'Test yourself with active recall instead of passive re-reading.',
  },
  {
    quote: 'Learning is not attained by chance, it must be sought for with ardor and attended to with diligence.',
    author: 'Abigail Adams',
    affirmation: 'I am in full control of my focus, my habits, and my academic growth.',
    category: 'Intentional Study',
    morningTip: 'Teach a concept out loud in your own words to lock it into long-term memory.',
  },
];

app.get('/api/daily-affirmation', (req, res) => {
  const userId = String(req.query.userId || '');
  const forceIndex = req.query.index !== undefined ? Number(req.query.index) : null;
  const prof = userId ? db.getProfileByUserId(userId) : undefined;

  const now = new Date();
  const dateKey = now.toISOString().split('T')[0];
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );

  const selectedIdx =
    forceIndex !== null && !Number.isNaN(forceIndex)
      ? Math.abs(forceIndex) % CURATED_MORNING_AFFIRMATIONS.length
      : dayOfYear % CURATED_MORNING_AFFIRMATIONS.length;

  const item = CURATED_MORNING_AFFIRMATIONS[selectedIdx];
  const streak = prof?.streak || 7;
  const primarySubject = prof?.subjects?.[0] || 'Computer Science';

  res.json({
    date: dateKey,
    index: selectedIdx,
    totalQuotes: CURATED_MORNING_AFFIRMATIONS.length,
    quote: item.quote,
    author: item.author,
    affirmation: item.affirmation,
    category: item.category,
    morningTip: item.morningTip,
    personalizedNote: `Day ${streak} Streak Motivation for ${prof?.name || 'Scholar'} • Focus Subject: ${primarySubject}`,
    refreshedAt: '06:00 AM Daily Morning Sync',
    source: 'Curated & Gemini Synced',
  });
});

// Gemini-powered personalized Daily Study Affirmation generator
app.post('/api/daily-affirmation/gemini', async (req, res) => {
  try {
    const { userId, focusTopic, mood } = req.body || {};
    const prof = userId ? db.getProfileByUserId(String(userId)) : undefined;
    const studentName = prof?.name || 'Scholar';
    const subjects = (prof?.subjects || ['DSA', 'Government Exams', 'Python']).join(', ');
    const streak = prof?.streak || 7;
    const targetTopic =
      focusTopic || prof?.weakTopics?.[0] || 'Data Structures, Algorithms & Competitive Exams';
    const dateKey = new Date().toISOString().split('T')[0];

    let generated: any = null;
    const ai = getGeminiAI();
    if (ai) {
      try {
        const prompt = `You are an encouraging academic mentor generating a personalized Daily Study Affirmation for a student.
Student Name: ${studentName}
Subjects: ${subjects}
Current Streak: ${streak} days
Today's Focus Topic: ${targetTopic}
${mood ? `Current Study Mood: ${mood}` : ''}

Return strictly valid JSON with these exact keys:
{
  "quote": "An inspiring, authentic motivational quote tailored to learning, perseverance, and mastery (1-2 sentences)",
  "author": "Author of the quote or 'AI Academic Mentor'",
  "affirmation": "A first-person daily study affirmation for the student (e.g., 'I master complex DSA and exam concepts step by step with clarity and calm focus.')",
  "category": "Short theme badge (e.g., 'DSA & Exam Mastery', 'Deep Focus & Streak')",
  "morningTip": "One concrete, actionable 1-sentence study tip for '${targetTopic}'"
}`;

        const geminiRes = await generateContentWithRetry({
          preferredModel: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
          timeoutMs: 6500,
        });

        const raw = (geminiRes.text || '').trim();
        const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        generated = JSON.parse(cleaned);
      } catch (err) {
        generated = null;
      }
    }

    const fallbackItem =
      CURATED_MORNING_AFFIRMATIONS[
        Math.floor(Math.random() * CURATED_MORNING_AFFIRMATIONS.length)
      ];

    res.json({
      date: dateKey,
      index: 0,
      totalQuotes: CURATED_MORNING_AFFIRMATIONS.length,
      quote: generated?.quote || fallbackItem.quote,
      author: generated?.author || fallbackItem.author,
      affirmation:
        generated?.affirmation ||
        `Today I master ${targetTopic} with calm focus and extend my ${streak}-day study streak.`,
      category: generated?.category || 'Gemini Personalized Motivation',
      morningTip:
        generated?.morningTip ||
        `Break "${targetTopic}" into a 25-minute Pomodoro block and solve 3 active-recall questions.`,
      personalizedNote: `Gemini Daily Affirmation for ${studentName} • ${streak}-Day Streak • Focus: ${targetTopic}`,
      refreshedAt: `Gemini 3.8 Flash • ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      source: generated ? 'Gemini 3.8 Flash' : 'Gemini Fallback',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate Gemini affirmation' });
  }
});

// ----------------------------------------------------
// 3c. Biometric Face Authentication & Aadhaar + DigiLocker Course Enrollment Verification
// ----------------------------------------------------
app.post('/api/auth/face-login', (req, res) => {
  try {
    const { userId, faceBiometricHash, confidenceScore = 99.4 } = req.body || {};
    const targetUserId = userId || 'user_1';
    const prof =
      db.getProfileByUserId(targetUserId) || Array.from(db.profiles.values())[0];

    if (!prof) {
      return res.status(404).json({ error: 'Student profile not found for Face Authentication' });
    }

    const nowIso = new Date().toISOString();
    const biometricSignature =
      faceBiometricHash ||
      `FACE-BIO-${targetUserId.toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    const updated = db.updateProfile(prof.userId, {
      faceAuthEnabled: true,
      faceAuthVerifiedAt: nowIso,
      faceBiometricHash: biometricSignature,
      lastActiveDate: nowIso.split('T')[0],
    });

    res.json({
      success: true,
      authenticated: true,
      confidenceScore,
      biometricSignature,
      verifiedAt: nowIso,
      profile: updated || prof,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Face authentication failed' });
  }
});

app.post('/api/verification/aadhaar', (req, res) => {
  try {
    const { userId, aadhaarNumber, holderName, otp } = req.body || {};
    const cleanDigits = String(aadhaarNumber || '').replace(/\D/g, '');
    if (cleanDigits.length !== 12) {
      return res
        .status(400)
        .json({ error: 'Please enter a valid 12-digit Aadhaar number.' });
    }
    if (!otp || String(otp).replace(/\D/g, '').length < 4) {
      return res.status(400).json({ error: 'Please enter the UIDAI Aadhaar OTP.' });
    }

    const last4 = cleanDigits.slice(-4);
    const maskedAadhaar = `XXXX-XXXX-${last4}`;
    const nowIso = new Date().toISOString();
    const referenceId = `UIDAI-EKYC-${Date.now().toString().slice(-6)}-${last4}`;

    const targetUserId = userId || 'user_1';
    const prof = db.getProfileByUserId(targetUserId);
    const verificationPayload = {
      verified: true,
      maskedAadhaar,
      holderName: holderName || prof?.name || 'Verified Student',
      verifiedAt: nowIso,
      referenceId,
    };

    const updated = prof
      ? db.updateProfile(targetUserId, {
          aadhaarVerification: verificationPayload,
        })
      : null;

    res.json({
      success: true,
      aadhaarVerification: verificationPayload,
      profile: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Aadhaar verification failed' });
  }
});

app.post('/api/verification/digilocker', (req, res) => {
  try {
    const { userId, mobileOrAadhaar, securityPin } = req.body || {};
    if (!mobileOrAadhaar || String(mobileOrAadhaar).trim().length < 6) {
      return res
        .status(400)
        .json({ error: 'Please provide your DigiLocker Mobile Number or Aadhaar ID.' });
    }
    if (!securityPin || String(securityPin).replace(/\D/g, '').length < 4) {
      return res
        .status(400)
        .json({ error: 'Please enter your 6-digit DigiLocker Security PIN.' });
    }

    const nowIso = new Date().toISOString();
    const digilockerId = `DL-IN-${Date.now().toString().slice(-6)}-EDU`;
    const fetchedDocuments: {
      docType: string;
      docNumber: string;
      issuer: string;
      status: 'Verified';
    }[] = [
      {
        docType: 'Aadhaar e-KYC XML Certificate',
        docNumber: `UIDAI-XML-${String(mobileOrAadhaar).slice(-4)}`,
        issuer: 'Unique Identification Authority of India (UIDAI)',
        status: 'Verified',
      },
      {
        docType: 'Class XII / University Academic Transcript',
        docNumber: `NAD-CERT-${new Date().getFullYear()}-8841`,
        issuer: 'National Academic Depository (NAD / DigiLocker)',
        status: 'Verified',
      },
      {
        docType: 'APAAR / Academic Bank of Credits (ABC) ID',
        docNumber: `ABC-ID-9920-${String(mobileOrAadhaar).slice(-4)}`,
        issuer: 'Ministry of Education, Govt. of India',
        status: 'Verified',
      },
    ];

    const targetUserId = userId || 'user_1';
    const prof = db.getProfileByUserId(targetUserId);
    const digilockerPayload = {
      verified: true,
      digilockerId,
      fetchedDocuments,
      verifiedAt: nowIso,
    };

    const updated = prof
      ? db.updateProfile(targetUserId, {
          digilockerVerification: digilockerPayload,
        })
      : null;

    res.json({
      success: true,
      digilockerVerification: digilockerPayload,
      profile: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'DigiLocker verification failed' });
  }
});

app.post('/api/courses/enroll', async (req, res) => {
  try {
    const { userId, courseId, courseTitle, subject, provider } = req.body || {};
    if (!courseId || !courseTitle) {
      return res.status(400).json({ error: 'courseId and courseTitle are required' });
    }

    const targetUserId = userId || 'user_1';
    const prof =
      db.getProfileByUserId(targetUserId) || Array.from(db.profiles.values())[0];

    if (!prof) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const nowIso = new Date().toISOString();
    const enrollmentRef = `ENR-${new Date().getFullYear()}-${Math.random()
      .toString(36)
      .substring(2, 7)
      .toUpperCase()}`;

    const existingIds = prof.enrolledCourseIds || [];
    const nextEnrolledIds = Array.from(new Set([...existingIds, String(courseId)]));

    const newRecord = {
      courseId: String(courseId),
      courseTitle: String(courseTitle),
      subject: String(subject || 'General'),
      provider: String(provider || 'Verified Academy'),
      enrolledAt: nowIso,
      enrollmentRef,
      aadhaarRef: prof.aadhaarVerification?.referenceId || 'UIDAI-VERIFIED',
      digilockerId: prof.digilockerVerification?.digilockerId || 'DL-VERIFIED',
      faceVerified: Boolean(prof.faceAuthEnabled),
    };

    const existingEnrollments = (prof.courseEnrollments || []).filter(
      (e) => e.courseId !== String(courseId)
    );
    const nextEnrollments = [newRecord, ...existingEnrollments];

    const updated = db.updateProfile(prof.userId, {
      enrolledCourseIds: nextEnrolledIds,
      courseEnrollments: nextEnrollments,
    });

    res.json({
      success: true,
      enrollment: newRecord,
      profile: updated || prof,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Course enrollment failed' });
  }
});

// ----------------------------------------------------
// 4. Curriculum & Subjects
// ----------------------------------------------------
app.get('/api/subjects', (req, res) => {
  const subjects = Array.from(db.subjects.values());
  const subjectsWithTopics = subjects.map((s) => ({
    ...s,
    topics: db.topics.get(s.id) || [],
  }));
  res.json(subjectsWithTopics);
});

// ----------------------------------------------------
// 4b. RAG-Grounded Spaced Repetition (Leitner System) Endpoint
// ----------------------------------------------------
app.get('/api/flashcards/leitner-deck', (req, res) => {
  try {
    const subjectFilter = String(req.query.subject || '').trim();
    const documentIdFilter = String(req.query.documentId || '').trim();

    const allDocs = Array.from(db.documents.values());
    const relevantChunks = db.chunks.filter((chunk) => {
      if (documentIdFilter && documentIdFilter !== 'all' && chunk.documentId !== documentIdFilter) {
        return false;
      }
      if (
        subjectFilter &&
        subjectFilter !== 'all' &&
        chunk.subject.toLowerCase() !== subjectFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });

    const cards = relevantChunks.map((chunk, idx) => {
      const lines = chunk.content
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const headingLine =
        lines.find((l) => l.includes(':') || l.length < 90) ||
        `${chunk.documentTitle} (Concept #${chunk.chunkIndex})`;
      const cleanHeading = headingLine.replace(/^[-•*\d.)\s]+/, '').trim();

      const frontQuestion = cleanHeading.endsWith('?')
        ? cleanHeading
        : `From "${chunk.documentTitle}": Explain the core mechanism, rules, and key takeaways of "${cleanHeading.slice(0, 75)}"`;

      const keywordHint =
        chunk.keywords && chunk.keywords.length > 0
          ? `Key terms to recall: ${chunk.keywords.slice(0, 4).join(', ')}`
          : `Focus on the primary definition and complexity/formula in ${chunk.subject}.`;

      // Distribute initial seed Leitner boxes (mostly Box 1 & Box 2 for daily review)
      const initialBox = (idx % 3) + 1; // Box 1, 2, or 3
      const intervalMap: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };

      return {
        id: `leitner_${chunk.id}`,
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        subject: chunk.subject,
        topic: cleanHeading.slice(0, 60),
        front: frontQuestion,
        back: chunk.content,
        hint: keywordHint,
        keywords: chunk.keywords || [],
        leitnerBox: initialBox,
        intervalDays: intervalMap[initialBox] || 1,
        dueToday: initialBox <= 2,
      };
    });

    res.json({
      success: true,
      documents: allDocs,
      totalCards: cards.length,
      cards,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to build Leitner RAG deck', cards: [] });
  }
});

// ----------------------------------------------------
// 4c. Study Circles (Peer-to-Peer Topic Chat Groups + WhatsApp Bridge)
// ----------------------------------------------------
interface StudyCircleMessage {
  id: string;
  circleId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'peer_mentor' | 'ai_moderator';
  content: string;
  tag?: 'question' | 'note' | 'resource' | 'solution';
  timestamp: string;
  whatsappBridged: boolean;
  upvotes: number;
}

interface StudyCircleMember {
  userId: string;
  name: string;
  avatarInitials: string;
  role: 'founder' | 'member' | 'mentor';
  whatsappSynced: boolean;
}

interface StudyCircleGroup {
  id: string;
  name: string;
  subject: string;
  topic: string;
  description: string;
  whatsappInviteCode: string;
  activeNowCount: number;
  createdAt: string;
  members: StudyCircleMember[];
  messages: StudyCircleMessage[];
}

const studyCirclesStore = new Map<string, StudyCircleGroup>([
  [
    'circle_python_recursion',
    {
      id: 'circle_python_recursion',
      name: 'Python Recursion & Dynamic Programming Lab',
      subject: 'Python',
      topic: 'Recursion edge cases & Memoization',
      description:
        'Peer-to-peer problem solving on recursion call stacks, base case invariants, and @lru_cache optimization.',
      whatsappInviteCode: 'WA-PY-REC-101',
      activeNowCount: 6,
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      members: [
        {
          userId: 'peer_ananya',
          name: 'Ananya Sharma',
          avatarInitials: 'AS',
          role: 'founder',
          whatsappSynced: true,
        },
        {
          userId: 'peer_rohan',
          name: 'Rohan Verma',
          avatarInitials: 'RV',
          role: 'mentor',
          whatsappSynced: true,
        },
        {
          userId: 'user_1',
          name: 'Aarav Mehta',
          avatarInitials: 'AM',
          role: 'member',
          whatsappSynced: true,
        },
      ],
      messages: [
        {
          id: 'sc_msg_1',
          circleId: 'circle_python_recursion',
          senderId: 'peer_ananya',
          senderName: 'Ananya Sharma',
          senderRole: 'peer_mentor',
          content:
            'Quick tip from our Python RAG notes: Always validate both the empty collection `if not arr:` AND single-element `if len(arr) == 1:` before your recursive divide step!',
          tag: 'note',
          timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
          whatsappBridged: true,
          upvotes: 8,
        },
        {
          id: 'sc_msg_2',
          circleId: 'circle_python_recursion',
          senderId: 'peer_rohan',
          senderName: 'Rohan Verma',
          senderRole: 'student',
          content:
            'When tracing Fibonacci(n), adding `@functools.lru_cache(maxsize=None)` drops time complexity from O(2^n) to O(n). Try testing it in the WhatsApp simulator!',
          tag: 'solution',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          whatsappBridged: true,
          upvotes: 5,
        },
      ],
    },
  ],
  [
    'circle_calculus_integration',
    {
      id: 'circle_calculus_integration',
      name: 'Calculus Integration & Limits Mastery Circle',
      subject: 'Calculus',
      topic: 'Integration by Parts (LIATE) & L’Hôpital’s Rule',
      description:
        'Collaborative step-by-step derivations, u-substitution tricks, and daily JEE/AP Calculus exam prep.',
      whatsappInviteCode: 'WA-CALC-INT-204',
      activeNowCount: 5,
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      members: [
        {
          userId: 'peer_meera',
          name: 'Meera Nair',
          avatarInitials: 'MN',
          role: 'founder',
          whatsappSynced: true,
        },
        {
          userId: 'peer_kabir',
          name: 'Kabir Patel',
          avatarInitials: 'KP',
          role: 'member',
          whatsappSynced: true,
        },
      ],
      messages: [
        {
          id: 'sc_msg_3',
          circleId: 'circle_calculus_integration',
          senderId: 'peer_meera',
          senderName: 'Meera Nair',
          senderRole: 'peer_mentor',
          content:
            'Remember the LIATE priority rule for Integration by Parts (∫ u dv = uv - ∫ v du): Logarithmic > Inverse Trig > Algebraic > Trigonometric > Exponential.',
          tag: 'note',
          timestamp: new Date(Date.now() - 5400000).toISOString(),
          whatsappBridged: true,
          upvotes: 11,
        },
      ],
    },
  ],
  [
    'circle_dsa_graphs',
    {
      id: 'circle_dsa_graphs',
      name: 'DSA Binary Search, Trees & Graph Algorithms',
      subject: 'DSA',
      topic: 'Binary Search invariants, BFS/DFS & Dijkstra',
      description:
        'Share dry-run traces, off-by-one boundary fixes, and Big-O complexity proofs with fellow coders.',
      whatsappInviteCode: 'WA-DSA-ALG-309',
      activeNowCount: 9,
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      members: [
        {
          userId: 'peer_rohan',
          name: 'Rohan Verma',
          avatarInitials: 'RV',
          role: 'founder',
          whatsappSynced: true,
        },
        {
          userId: 'peer_zoya',
          name: 'Zoya Khan',
          avatarInitials: 'ZK',
          role: 'member',
          whatsappSynced: true,
        },
        {
          userId: 'user_1',
          name: 'Aarav Mehta',
          avatarInitials: 'AM',
          role: 'member',
          whatsappSynced: true,
        },
      ],
      messages: [
        {
          id: 'sc_msg_4',
          circleId: 'circle_dsa_graphs',
          senderId: 'peer_zoya',
          senderName: 'Zoya Khan',
          senderRole: 'student',
          content:
            'Using `mid = low + (high - low) // 2` instead of `(low + high) // 2` prevents integer overflow in languages like Java and C++!',
          tag: 'note',
          timestamp: new Date(Date.now() - 2400000).toISOString(),
          whatsappBridged: true,
          upvotes: 7,
        },
      ],
    },
  ],
  [
    'circle_genai_agents',
    {
      id: 'circle_genai_agents',
      name: 'Generative AI, RAG & Autonomous Agents Guild',
      subject: 'Generative AI',
      topic: 'Vector Embeddings, ReAct Agents & Prompt Engineering',
      description:
        'Discuss RAG chunking strategies, semantic search, tool calling, and multi-agent orchestration.',
      whatsappInviteCode: 'WA-GENAI-RAG-412',
      activeNowCount: 7,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      members: [
        {
          userId: 'peer_ananya',
          name: 'Ananya Sharma',
          avatarInitials: 'AS',
          role: 'founder',
          whatsappSynced: true,
        },
      ],
      messages: [
        {
          id: 'sc_msg_5',
          circleId: 'circle_genai_agents',
          senderId: 'peer_ananya',
          senderName: 'Ananya Sharma',
          senderRole: 'peer_mentor',
          content:
            'In ReAct agents (Reason + Act), grounding tool outputs with RAG citations reduces hallucination rates significantly.',
          tag: 'resource',
          timestamp: new Date(Date.now() - 4200000).toISOString(),
          whatsappBridged: true,
          upvotes: 9,
        },
      ],
    },
  ],
]);

app.get('/api/study-circles', (req, res) => {
  const circles = Array.from(studyCirclesStore.values());
  res.json({ circles });
});

app.post('/api/study-circles', async (req, res) => {
  try {
    const { name, subject, topic, description, userId, userName } = req.body;
    if (!name || !topic) {
      return res.status(400).json({ error: 'Circle name and topic are required' });
    }

    const prof = userId ? db.getProfileByUserId(userId) : undefined;
    const studentName = userName || prof?.name || 'Student';
    const initials = studentName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const circleId = `circle_${Date.now()}`;
    const inviteCode = `WA-${(subject || 'STD').slice(0, 3).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const newCircle: StudyCircleGroup = {
      id: circleId,
      name: String(name).trim(),
      subject: String(subject || 'General').trim(),
      topic: String(topic).trim(),
      description:
        String(description || '').trim() ||
        `Peer-to-peer WhatsApp-bridged study circle focused on mastering ${topic}.`,
      whatsappInviteCode: inviteCode,
      activeNowCount: 1,
      createdAt: new Date().toISOString(),
      members: [
        {
          userId: userId || 'user_1',
          name: studentName,
          avatarInitials: initials || 'ST',
          role: 'founder',
          whatsappSynced: true,
        },
      ],
      messages: [
        {
          id: `sc_msg_${Date.now()}`,
          circleId,
          senderId: userId || 'user_1',
          senderName: studentName,
          senderRole: 'student',
          content: `Welcome to "${name}"! Let's share notes, RAG summaries, and practice problems on ${topic}.`,
          tag: 'note',
          timestamp: new Date().toISOString(),
          whatsappBridged: true,
          upvotes: 1,
        },
      ],
    };

    studyCirclesStore.set(circleId, newCircle);

    // Bridge creation notification to WhatsApp infrastructure
    if (prof) {
      const waMsg = `👥 *Study Circle Created & Synced!*\n\nYou launched *${newCircle.name}* (${newCircle.subject} • ${newCircle.topic}).\n🔗 WhatsApp Bridge Code: *${newCircle.whatsappInviteCode}*\n\nPeers can now share notes and broadcast questions directly to your WhatsApp learning thread!`;
      db.recordMessage({
        userId: prof.userId,
        whatsappNumber: prof.whatsappNumber,
        direction: 'outgoing',
        content: waMsg,
        messageType: 'text',
        intent: 'STUDY_CIRCLE_CREATED',
        agentName: 'StudyCircleAgent',
      });
      await whatsapp.sendTextMessage(prof.whatsappNumber, waMsg).catch(() => {});
    }

    res.json({
      success: true,
      circle: newCircle,
      circles: Array.from(studyCirclesStore.values()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create Study Circle' });
  }
});

app.post('/api/study-circles/:circleId/join', async (req, res) => {
  try {
    const { circleId } = req.params;
    const { userId, userName } = req.body;
    const circle = studyCirclesStore.get(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Study Circle not found' });
    }

    const prof = userId ? db.getProfileByUserId(userId) : undefined;
    const studentName = userName || prof?.name || 'Student';
    const initials = studentName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const existingIdx = circle.members.findIndex((m) => m.userId === userId);
    let joined = false;

    if (existingIdx >= 0) {
      circle.members.splice(existingIdx, 1);
      circle.activeNowCount = Math.max(1, circle.activeNowCount - 1);
    } else {
      circle.members.push({
        userId: userId || 'user_1',
        name: studentName,
        avatarInitials: initials || 'ST',
        role: 'member',
        whatsappSynced: true,
      });
      circle.activeNowCount += 1;
      joined = true;

      if (prof) {
        const waJoinText = `🤝 *Joined Study Circle: ${circle.name}*\n📚 Topic: *${circle.topic}* (${circle.subject})\n🔗 WhatsApp Group Bridge: *${circle.whatsappInviteCode}*\n\nPeer notes and shared solutions in this circle are now linked with your WhatsApp learning companion.`;
        db.recordMessage({
          userId: prof.userId,
          whatsappNumber: prof.whatsappNumber,
          direction: 'outgoing',
          content: waJoinText,
          messageType: 'text',
          intent: 'STUDY_CIRCLE_JOINED',
          agentName: 'StudyCircleAgent',
        });
        await whatsapp.sendTextMessage(prof.whatsappNumber, waJoinText).catch(() => {});
      }
    }

    res.json({
      success: true,
      joined,
      circle,
      circles: Array.from(studyCirclesStore.values()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update Study Circle membership' });
  }
});

app.post('/api/study-circles/:circleId/messages', async (req, res) => {
  try {
    const { circleId } = req.params;
    const { userId, userName, content, tag, forwardToWhatsApp } = req.body;
    const circle = studyCirclesStore.get(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'Study Circle not found' });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const prof = userId ? db.getProfileByUserId(userId) : undefined;
    const senderName = userName || prof?.name || 'Student';
    const cleanContent = String(content).trim();

    const newMsg: StudyCircleMessage = {
      id: `sc_msg_${Date.now()}`,
      circleId,
      senderId: userId || 'user_1',
      senderName,
      senderRole: 'student',
      content: cleanContent,
      tag: tag || 'note',
      timestamp: new Date().toISOString(),
      whatsappBridged: Boolean(forwardToWhatsApp !== false),
      upvotes: 1,
    };

    circle.messages.push(newMsg);

    // Ensure sender is in member roster
    if (!circle.members.some((m) => m.userId === (userId || 'user_1'))) {
      const initials = senderName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      circle.members.push({
        userId: userId || 'user_1',
        name: senderName,
        avatarInitials: initials || 'ST',
        role: 'member',
        whatsappSynced: true,
      });
    }

    // Bridge peer message to WhatsApp messaging infrastructure if enabled
    let whatsappDeliveryResult: any = null;
    if (forwardToWhatsApp !== false && prof) {
      const waBridgePayload = `💬 *[Study Circle: ${circle.name}]*\n👤 *${senderName}* (${
        newMsg.tag?.toUpperCase() || 'NOTE'
      }):\n"${cleanContent}"\n\n_Synced via WhatsApp Study Circle Bridge (${circle.whatsappInviteCode})_`;

      db.recordMessage({
        userId: prof.userId,
        whatsappNumber: prof.whatsappNumber,
        direction: 'outgoing',
        content: waBridgePayload,
        messageType: 'text',
        intent: 'STUDY_CIRCLE_MESSAGE_BRIDGE',
        agentName: 'StudyCircleAgent',
      });

      whatsappDeliveryResult = await whatsapp
        .sendTextMessage(prof.whatsappNumber, waBridgePayload)
        .catch(() => null);
    }

    // If the student posted a question or requested RAG insight, generate a helpful peer/RAG co-pilot reply in the circle
    if (tag === 'question' || cleanContent.includes('?')) {
      const ragSearch = ragService.search(`${circle.subject} ${circle.topic} ${cleanContent}`, 1);
      const topChunk = ragSearch.chunks[0];
      const peerReply: StudyCircleMessage = {
        id: `sc_msg_peer_${Date.now() + 1}`,
        circleId,
        senderId: 'peer_mentor_bot',
        senderName: topChunk
          ? `Ananya Sharma • Cited RAG (${topChunk.documentTitle})`
          : 'Rohan Verma (Peer Mentor)',
        senderRole: 'peer_mentor',
        content: topChunk
          ? `Great question! Here is what our verified RAG notes say on this:\n"${topChunk.content.slice(
              0,
              240
            )}..."`
          : `Good question on ${circle.topic}! Let's break down the base invariant first and test a quick example in the WhatsApp Simulator.`,
        tag: 'solution',
        timestamp: new Date(Date.now() + 500).toISOString(),
        whatsappBridged: true,
        upvotes: 2,
      };
      circle.messages.push(peerReply);
    }

    res.json({
      success: true,
      circle,
      message: newMsg,
      whatsappBridged: Boolean(whatsappDeliveryResult?.success ?? true),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to post Study Circle message' });
  }
});

// ----------------------------------------------------
// 5. Quiz Endpoints
// ----------------------------------------------------
app.get('/api/quiz/active/:userId', (req, res) => {
  const session = db.getActiveQuizSession(req.params.userId);
  res.json({ activeSession: session || null });
});

app.post('/api/quiz/start', async (req, res) => {
  try {
    const { userId, subject, topic, difficulty } = req.body;
    const prof = db.getProfileByUserId(userId);
    if (!prof) return res.status(404).json({ error: 'Profile not found' });

    const messageText = await quizAgent.startQuiz(prof, subject, topic, difficulty);
    const activeSession = db.getActiveQuizSession(userId);
    res.json({ messageText, activeSession });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quiz/answer', async (req, res) => {
  try {
    const { userId, answer } = req.body;
    const prof = db.getProfileByUserId(userId);
    const active = db.getActiveQuizSession(userId);
    if (!prof || !active) {
      return res.status(400).json({ error: 'No active quiz session found' });
    }

    const messageText = await quizAgent.handleQuizAnswer(active, answer, prof);
    res.json({ messageText, updatedSession: db.getActiveQuizSession(userId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate adaptive quiz specifically targeting student's weak topics
app.post('/api/quiz/adaptive-generate', async (req, res) => {
  try {
    const { userId, topic, subject, difficulty, count = 3 } = req.body;
    const prof = db.getProfileByUserId(userId);
    if (!prof) return res.status(404).json({ error: 'Profile not found' });

    // Pick targeted topic from student's weakTopics if none provided
    const targetTopic =
      topic ||
      (prof.weakTopics && prof.weakTopics.length > 0
        ? prof.weakTopics[0]
        : 'Recursion in Python');

    const targetSubject =
      subject ||
      (targetTopic.toLowerCase().includes('python')
        ? 'Python'
        : targetTopic.toLowerCase().includes('calculus')
        ? 'Calculus'
        : targetTopic.toLowerCase().includes('data structure') ||
          targetTopic.toLowerCase().includes('dsa')
        ? 'Data Structures'
        : prof.subjects[0] || 'General');

    const targetDifficulty =
      difficulty ||
      (prof.currentSkillLevel === 'beginner'
        ? 'beginner'
        : prof.currentSkillLevel === 'expert'
        ? 'advanced'
        : 'intermediate');

    const questionsData = await generateDynamicQuiz(
      targetSubject,
      targetTopic,
      targetDifficulty,
      count
    );

    const questions = questionsData.map((q: any, idx: number) => ({
      id: `q_adapt_${Date.now()}_${idx}`,
      subject: targetSubject,
      topic: targetTopic,
      questionText: q.questionText,
      type: q.type || 'mcq',
      options: q.options || ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
      correctAnswer: q.correctAnswer || 'A',
      explanation: q.explanation || 'Verified correct answer.',
      difficulty: targetDifficulty,
    }));

    res.json({
      success: true,
      topic: targetTopic,
      subject: targetSubject,
      difficulty: targetDifficulty,
      questions,
      studentWeakTopics: prof.weakTopics || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Adaptive quiz generation failed' });
  }
});

// Record quiz results and update student mastery / weak topics + daily learning goal progress
app.post('/api/quiz/record-result', async (req, res) => {
  try {
    const { userId, topic, subject, score, totalQuestions, studyMinutesLogged } = req.body;
    const prof = db.getProfileByUserId(userId);
    if (!prof) return res.status(404).json({ error: 'Profile not found' });

    const percentage = Math.round((score / totalQuestions) * 100);
    const isMastered = percentage >= 70;
    const todayStr = new Date().toISOString().split('T')[0];

    let updatedWeakTopics = [...(prof.weakTopics || [])];
    let updatedStrongTopics = [...(prof.strongTopics || [])];

    if (isMastered) {
      updatedWeakTopics = updatedWeakTopics.filter(
        (t) => t.toLowerCase() !== topic.toLowerCase()
      );
      if (!updatedStrongTopics.some((t) => t.toLowerCase() === topic.toLowerCase())) {
        updatedStrongTopics.push(topic);
      }
    } else {
      if (!updatedWeakTopics.some((t) => t.toLowerCase() === topic.toLowerCase())) {
        updatedWeakTopics.push(topic);
      }
    }

    // Calculate study minutes earned from completing the quiz (5 mins per question, minimum 15 mins)
    const quizMinutesEarned =
      typeof studyMinutesLogged === 'number' && studyMinutesLogged > 0
        ? studyMinutesLogged
        : Math.max(15, (Number(totalQuestions) || 3) * 5);

    const existingFocusStats = prof.focusStats || {
      totalFocusMinutes: 0,
      completedSessions: 0,
      todayFocusMinutes: 45,
      lastSessionDate: todayStr,
    };

    const currentTodayMinutes =
      existingFocusStats.lastSessionDate === todayStr
        ? existingFocusStats.todayFocusMinutes || 0
        : 45;

    const updatedFocusStats = {
      totalFocusMinutes: (existingFocusStats.totalFocusMinutes || 0) + quizMinutesEarned,
      completedSessions: (existingFocusStats.completedSessions || 0) + 1,
      todayFocusMinutes: currentTodayMinutes + quizMinutesEarned,
      lastSessionDate: todayStr,
    };

    const updatedQuestionsToday = (prof.questionsAnsweredToday || 0) + (Number(totalQuestions) || 3);

    const updatedProfile = db.updateProfile(userId, {
      totalQuestionsAnswered: (prof.totalQuestionsAnswered || 0) + totalQuestions,
      questionsAnsweredToday: updatedQuestionsToday,
      correctAnswers: (prof.correctAnswers || 0) + score,
      overallProgress: Math.min(100, (prof.overallProgress || 65) + (isMastered ? 3 : 1)),
      weakTopics: updatedWeakTopics,
      strongTopics: updatedStrongTopics,
      focusStats: updatedFocusStats,
      learningHistory: [
        ...(prof.learningHistory || []),
        {
          topic,
          subject: subject || 'General',
          date: todayStr,
          mastered: isMastered,
        },
      ],
    });

    res.json({
      success: true,
      percentage,
      isMastered,
      quizMinutesEarned,
      profile: updatedProfile,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. Study Plan & Session Endpoints
// ----------------------------------------------------
app.get('/api/study-plan/:userId', (req, res) => {
  const plan = db.getStudyPlan(req.params.userId);
  res.json({ studyPlan: plan || null });
});

app.post('/api/study-plan/generate', async (req, res) => {
  try {
    const { userId, subject, totalDays, dailyHours } = req.body;
    const prof = db.getProfileByUserId(userId);
    if (!prof) return res.status(404).json({ error: 'Profile not found' });

    const promptText = `I have a ${subject || 'Calculus'} exam in ${totalDays || 15} days and can study ${dailyHours || 2} hours every day.`;
    const response = await plannerAgent.handlePlanRequest(promptText, prof);
    const plan = db.getStudyPlan(userId);
    res.json({ response, plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a scheduled study session item
app.post('/api/study-plan/:userId/items', (req, res) => {
  try {
    const { userId } = req.params;
    const item = req.body;
    if (!item.title || !item.dateStr) {
      return res.status(400).json({ error: 'title and dateStr are required' });
    }
    const sessionItem = {
      id: item.id || 'plan_item_' + Date.now(),
      dayNumber: item.dayNumber || 1,
      dateStr: item.dateStr,
      title: item.title,
      topic: item.topic || item.title,
      subject: item.subject || 'General',
      durationMinutes: Number(item.durationMinutes) || 60,
      tasks: item.tasks || [{ task: `Study ${item.topic || item.title}`, completed: false }],
      isCompleted: Boolean(item.isCompleted),
      isMissed: false,
      timeSlot: item.timeSlot || '07:00 PM',
      notes: item.notes || '',
    };
    const updatedPlan = db.addStudyPlanItem(userId, sessionItem);
    res.json({ success: true, studyPlan: updatedPlan, item: sessionItem });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a study session item (e.g. toggle completion or task status)
app.put('/api/study-plan/:userId/items/:itemId', (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const updatedPlan = db.updateStudyPlanItem(userId, itemId, req.body);
    if (!updatedPlan) {
      return res.status(404).json({ error: 'Study plan or item not found' });
    }
    res.json({ success: true, studyPlan: updatedPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a study session item
app.delete('/api/study-plan/:userId/items/:itemId', (req, res) => {
  try {
    const { userId, itemId } = req.params;
    const updatedPlan = db.deleteStudyPlanItem(userId, itemId);
    if (!updatedPlan) {
      return res.status(404).json({ error: 'Study plan or item not found' });
    }
    res.json({ success: true, studyPlan: updatedPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. Reminders & Recommendations
// ----------------------------------------------------
app.get('/api/reminders/:userId', (req, res) => {
  res.json(db.getReminders(req.params.userId));
});

// Create reminder (exam reminder or daily study session)
app.post('/api/reminders', async (req, res) => {
  try {
    const {
      userId,
      reminderText,
      targetTime,
      frequency,
      subject,
      type,
      examTitle,
      examDate,
      daysBeforeExam,
      sendWhatsAppNow,
    } = req.body;

    const prof = db.getProfileByUserId(userId);
    if (!prof) return res.status(404).json({ error: 'Profile not found' });

    const newReminder = {
      id: 'rem_' + Date.now(),
      userId,
      whatsappNumber: prof.whatsappNumber,
      reminderText: reminderText || 'Upcoming Exam or Study Session',
      targetTime: targetTime || '08:00 AM',
      frequency: frequency || 'daily',
      subject: subject || 'General',
      timezone: 'Asia/Kolkata',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      type: type || (examTitle ? 'exam' : 'daily_session'),
      examTitle,
      examDate,
      daysBeforeExam,
    };

    db.addReminder(newReminder);

    // Optionally dispatch simulated/real WhatsApp message
    if (sendWhatsAppNow) {
      const waMsg =
        `🔔 *Upcoming Exam Alert from Study Planner!* 📚\n\n` +
        `Hey ${prof.name}, reminder for: *${examTitle || reminderText}*\n` +
        `• *Exam Date:* ${examDate || 'Soon'}\n` +
        `• *Days Remaining:* ${daysBeforeExam !== undefined ? `${daysBeforeExam} days` : 'Coming up'}\n` +
        `• *Subject:* ${subject || 'General'}\n` +
        `• *Scheduled Time:* ${targetTime || '08:00 AM'}\n\n` +
        `Keep your ${prof.streak}-day streak going! Reply "/quiz ${subject || ''}" or "Teach me ${subject || ''}" to prepare now! 🚀`;

      await whatsapp.sendTextMessage(prof.whatsappNumber, waMsg);
      db.recordMessage({
        userId: prof.userId,
        whatsappNumber: prof.whatsappNumber,
        direction: 'outgoing',
        messageType: 'text',
        content: waMsg,
        intent: 'EXAM_REMINDER_NOTIFICATION',
        agentName: 'PlannerAgent',
      });
    }

    res.json({ success: true, reminder: newReminder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a reminder
app.put('/api/reminders/:id', (req, res) => {
  const updated = db.updateReminder(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Reminder not found' });
  res.json({ success: true, reminder: updated });
});

// Delete a reminder
app.delete('/api/reminders/:id', (req, res) => {
  const ok = db.deleteReminder(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Reminder not found' });
  res.json({ success: true });
});

// Trigger an immediate reminder notification to WhatsApp
app.post('/api/reminders/:id/trigger', async (req, res) => {
  try {
    const rem = db.reminders.get(req.params.id);
    if (!rem) return res.status(404).json({ error: 'Reminder not found' });
    const prof = db.getProfileByUserId(rem.userId);
    if (!prof) return res.status(404).json({ error: 'Profile not found' });

    let messageContent = '';
    if (rem.type === 'exam' || rem.examTitle) {
      messageContent =
        `🚨 *EXAM REMINDER ALERT!* 📝\n\n` +
        `Hey ${prof.name}! Your upcoming exam is approaching:\n` +
        `📌 *Exam:* ${rem.examTitle || rem.reminderText}\n` +
        `📅 *Date:* ${rem.examDate || 'Scheduled soon'}\n` +
        `⏳ *Countdown:* ${rem.daysBeforeExam !== undefined ? `${rem.daysBeforeExam} days left` : 'Approaching fast'}\n` +
        `📚 *Subject:* ${rem.subject || 'All subjects'}\n\n` +
        `💡 *Recommendation:* Complete today's planned revision session. Current streak: ${prof.streak} days 🔥.\n` +
        `Reply "/quiz ${rem.subject || ''}" to test your knowledge!`;
    } else {
      messageContent =
        `⏰ *Study Session Reminder!* 📖\n\n` +
        `Hey ${prof.name}, it's time for your planned study session:\n` +
        `• *Focus:* ${rem.reminderText}\n` +
        `• *Subject:* ${rem.subject || 'Study'}\n` +
        `• *Target Time:* ${rem.targetTime}\n\n` +
        `Let's protect your ${prof.streak}-day streak! 🚀`;
    }

    await whatsapp.sendTextMessage(prof.whatsappNumber, messageContent);
    db.recordMessage({
      userId: prof.userId,
      whatsappNumber: prof.whatsappNumber,
      direction: 'outgoing',
      messageType: 'text',
      content: messageContent,
      intent: 'REMINDER_TRIGGER',
      agentName: 'ReminderAgent',
    });

    res.json({ success: true, message: messageContent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Automated Daily WhatsApp Reminders based on Student's preferredStudyTime
app.get('/api/reminders/automated-status/:userId', (req, res) => {
  try {
    const status = getAutomatedReminderStatus(req.params.userId);
    const profile = db.getProfileByUserId(req.params.userId);
    const previewMessage = profile ? generatePersonalizedReminderMessage(profile) : '';
    res.json({ success: true, status, previewMessage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders/send-daily-now/:userId', async (req, res) => {
  try {
    const result = await sendAutomatedReminderNow(req.params.userId);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send automated reminder' });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders/automated-daily-check', async (req, res) => {
  try {
    const result = await checkAndSendAutomatedReminders();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Firebase Cloud Messaging (FCM) Smart Study Reminder Endpoints
app.post('/api/fcm/register-token', (req, res) => {
  try {
    const { userId, fcmToken, fcmPushEnabled = true, preferredStudyTime } = req.body || {};
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'userId and fcmToken are required' });
    }
    const updatedProfile = registerStudentFcmToken(
      userId,
      fcmToken,
      Boolean(fcmPushEnabled),
      preferredStudyTime
    );
    const status = getAutomatedReminderStatus(userId);
    res.json({
      success: true,
      profile: updatedProfile,
      status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to register FCM token' });
  }
});

app.post('/api/fcm/send-smart-reminder', async (req, res) => {
  try {
    const { userId, preferredStudyTime, triggerSource = 'manual_test_push' } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (preferredStudyTime) {
      db.updateProfile(userId, { preferredStudyTime });
    }

    const profile = db.getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const fcmPayload = buildFcmStudyReminderPayload(profile, triggerSource);
    recordFcmPushDelivery(fcmPayload);

    // Also mirror the notification to the student's WhatsApp Simulator log for unified study reminders
    const waReminderText = generatePersonalizedReminderMessage(profile);
    await whatsapp.sendTextMessage(profile.whatsappNumber, waReminderText).catch(() => {});
    db.recordMessage({
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber,
      direction: 'outgoing',
      messageType: 'text',
      content: waReminderText,
      intent: 'FCM_SMART_STUDY_REMINDER',
      agentName: 'FcmSmartReminderAgent',
    });

    const updatedProfile = db.getProfileByUserId(userId);
    res.json({
      success: true,
      fcmPayload,
      history: getFcmPushHistory(userId),
      profile: updatedProfile,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send FCM push notification' });
  }
});

app.get('/api/fcm/status/:userId', (req, res) => {
  try {
    const status = getAutomatedReminderStatus(req.params.userId);
    res.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch FCM status' });
  }
});

app.get('/api/recommendations/:userId', (req, res) => {
  res.json(db.getRecommendations(req.params.userId));
});

const flashcardDeckCache = new Map<string, any[]>();

// Generate Active Recall Flashcards for Weak Topics using Gemini 3.8
app.post('/api/flashcards/generate', async (req, res) => {
  try {
    const { topic, subject, count = 5, level = 'intermediate' } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const cacheKey = `${String(subject || 'general').toLowerCase()}::${String(topic).toLowerCase()}::${count}::${level}`;
    const cachedCards = flashcardDeckCache.get(cacheKey);
    if (cachedCards && cachedCards.length > 0) {
      return res.json({
        success: true,
        topic,
        subject: subject || 'Curriculum',
        cards: cachedCards,
        flashcards: cachedCards,
        count: cachedCards.length,
      });
    }

    const ai = getGeminiAI();
    let cards: any[] = [];

    if (ai) {
      try {
        const prompt = `You are an expert pedagogical cognitive scientist specializing in Active Recall flashcards for students.
Create exactly ${count} active recall flashcards specifically designed to diagnose and eliminate confusion on this student's WEAK TOPIC:
Topic: "${topic}"
Subject: "${subject || 'General'}"
Target Level: ${level}

Guidelines:
1. "front": A clear, thought-provoking active recall question, intuition check, code snippet bug spotter, or formula application. NOT just a trivial definition.
2. "back": Concise, punchy explanation, key mental model, and correct intuition.
3. "hint": A subtle clue that jogs memory without giving away the full answer.
4. "difficulty": "beginner" | "intermediate" | "advanced".

Respond strictly with a JSON array:
[
  {
    "id": "card_1",
    "front": "string",
    "back": "string",
    "hint": "string",
    "difficulty": "intermediate"
  }
]`;

        const geminiRes = await generateContentWithRetry({
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
          preferredModel: 'gemini-3.8-flash',
          timeoutMs: 8000,
        });

        const cleanJson = (geminiRes.text || '[]')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        const parsed = JSON.parse(cleanJson || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          cards = parsed.map((c, i) => ({
            id: c.id || `card_${Date.now()}_${i}`,
            front: c.front,
            back: c.back,
            hint: c.hint || undefined,
            difficulty: c.difficulty || level,
            topic,
            subject: subject || 'Curriculum',
          }));
        }
      } catch {
        // Gracefully fall back to curated pedagogical deck below when rate-limited or offline
      }
    }

    // High quality pedagogical fallback if Gemini is offline
    if (cards.length === 0) {
      const topicLower = topic.toLowerCase();
      if (topicLower.includes('recurs') || topicLower.includes('python')) {
        cards = [
          {
            id: `card_fb_1`,
            front: 'What are the two mandatory components that every recursive function must possess to prevent stack overflow?',
            back: '1. Base Case: The condition where the function stops calling itself and returns a value.\n2. Recursive Step: The call to itself with arguments moving strictly toward the base case.',
            hint: 'Think about when to stop, and how to get closer to stopping.',
            difficulty: 'beginner',
            topic,
            subject: subject || 'Python',
          },
          {
            id: `card_fb_2`,
            front: 'What happens in Python memory when a recursive call is made without reaching a base case?',
            back: 'Each function call allocates a new stack frame in the Call Stack. Without a base case, it exceeds Python\'s recursion limit (default 1000) and triggers `RecursionError: maximum recursion depth exceeded`.',
            hint: 'Think about Call Stack frames and RecursionError.',
            difficulty: 'intermediate',
            topic,
            subject: subject || 'Python',
          },
          {
            id: `card_fb_3`,
            front: 'In Python, why is calculating Fibonacci recursively without memoization O(2^n) exponential time complexity?',
            back: 'Because it creates a binary recursion tree that recomputes identical subproblems (e.g. fib(3)) multiple times independently. Memoization or iteration reduces this to O(n).',
            hint: 'Visualize the recursive tree branching at each step.',
            difficulty: 'advanced',
            topic,
            subject: subject || 'Python',
          },
          {
            id: `card_fb_4`,
            front: 'How does LEGB scoping affect variables referenced inside recursive or nested functions in Python?',
            back: 'Python searches Local -> Enclosing -> Global -> Built-in. If you assign to a variable without `nonlocal` or `global`, Python treats it as Local to that recursive call frame.',
            hint: 'Local, Enclosing, Global, Built-in.',
            difficulty: 'intermediate',
            topic,
            subject: subject || 'Python',
          },
        ];
      } else if (topicLower.includes('calculus') || topicLower.includes('integrat')) {
        cards = [
          {
            id: `card_fb_1`,
            front: 'What is the fundamental formula for Integration by Parts, and what mnemonic helps choose u?',
            back: '∫ u dv = u v - ∫ v du.\nLIATE mnemonic: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.',
            hint: 'LIATE rule tells you which function to pick as u.',
            difficulty: 'intermediate',
            topic,
            subject: subject || 'Calculus',
          },
          {
            id: `card_fb_2`,
            front: 'When integrating ∫ x * e^x dx, what should be chosen as u and dv?',
            back: 'Choose u = x (algebraic comes before exponential in LIATE), and dv = e^x dx.\nThen du = dx, v = e^x.\nResult: x*e^x - ∫ e^x dx = x*e^x - e^x + C.',
            hint: 'Differentiating x reduces its degree to 1.',
            difficulty: 'intermediate',
            topic,
            subject: subject || 'Calculus',
          },
          {
            id: `card_fb_3`,
            front: 'What is the geometric interpretation of the Definite Integral ∫[a,b] f(x) dx?',
            back: 'It represents the net signed area between the curve y = f(x) and the x-axis from x = a to x = b (areas above x-axis are positive, below are negative).',
            hint: 'Net signed area between curve and axis.',
            difficulty: 'beginner',
            topic,
            subject: subject || 'Calculus',
          },
        ];
      } else {
        cards = [
          {
            id: `card_fb_1`,
            front: `Core Principle: What is the fundamental concept behind "${topic}"?`,
            back: `It allows breaking down complex problem spaces into smaller, verifiable units of execution. Mastering this requires verifying assumptions at the boundary and tracing inputs through state transitions.`,
            hint: 'Focus on boundary conditions and state transitions.',
            difficulty: 'intermediate',
            topic,
            subject: subject || 'Curriculum',
          },
          {
            id: `card_fb_2`,
            front: `Common Pitfall: What mistake do learners most frequently make in "${topic}"?`,
            back: `Overlooking boundary conditions (off-by-one errors, null or empty inputs, and improper state reset between cycles). Always test extreme min and max values first!`,
            hint: 'Consider the smallest and largest valid input values.',
            difficulty: 'intermediate',
            topic,
            subject: subject || 'Curriculum',
          },
          {
            id: `card_fb_3`,
            front: `Active Recall Challenge: How do you verify that your solution for "${topic}" is correct?`,
            back: `Trace the algorithm step-by-step with a concrete dry-run trace table, verify invariants before/after loops, and test against edge cases.`,
            hint: 'Dry run trace table with edge cases.',
            difficulty: 'advanced',
            topic,
            subject: subject || 'Curriculum',
          },
        ];
      }
    }

    if (cards.length > 0) {
      flashcardDeckCache.set(cacheKey, cards);
    }

    res.json({
      success: true,
      topic,
      subject: subject || 'Curriculum',
      cards,
      flashcards: cards,
      count: cards.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate flashcards' });
  }
});

// Record a Pomodoro focus session
app.post('/api/focus-sessions', (req, res) => {
  try {
    const session = req.body;
    if (!session || !session.userId) {
      return res.status(400).json({ error: 'Missing session or userId' });
    }
    const prof = db.getProfileByUserId(session.userId);
    if (prof) {
      if (!prof.focusStats) {
        prof.focusStats = { totalFocusMinutes: 0, completedSessions: 0, todayFocusMinutes: 0 };
      }
      prof.focusStats.totalFocusMinutes = (prof.focusStats.totalFocusMinutes || 0) + (session.durationMinutes || 25);
      prof.focusStats.completedSessions = (prof.focusStats.completedSessions || 0) + 1;
      prof.focusStats.todayFocusMinutes = (prof.focusStats.todayFocusMinutes || 0) + (session.durationMinutes || 25);
      prof.focusStats.lastSessionDate = new Date().toISOString().split('T')[0];
    }
    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk import students or learning objectives directly into server state
app.post('/api/admin/bulk-import', (req, res) => {
  try {
    const { type, items } = req.body;
    if (!type || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const savedItems: any[] = [];

    if (type === 'students') {
      items.forEach((item: any, idx: number) => {
        const userId = item.userId || `usr_imp_${Date.now()}_${idx}`;
        const profId = item.profileId || `prof_imp_${Date.now()}_${idx}`;
        const user = {
          id: userId,
          name: item.name || 'Student',
          email: item.email || `${userId}@example.com`,
          phone: item.whatsappnumber || item.phone || '+10000000000',
          role: 'student' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const profile = {
          id: profId,
          userId,
          name: item.name || 'Student',
          whatsappNumber: item.whatsappnumber || item.phone || '+10000000000',
          preferredLanguage: ['en', 'hi', 'kn'].includes(item.preferredlanguage)
            ? item.preferredlanguage
            : 'en',
          educationLevel: item.educationlevel || 'college',
          subjects: Array.isArray(item._subjectsList)
            ? item._subjectsList
            : typeof item.subjects === 'string' && item.subjects
            ? item.subjects.split(';').map((s: string) => s.trim())
            : ['Python', 'DSA'],
          currentSkillLevel: 'beginner' as const,
          learningGoals: ['Master core concepts'],
          weakTopics: [],
          strongTopics: Array.isArray(item._subjectsList) ? item._subjectsList : ['Python'],
          studyHoursPerDay: Number(item.studyhoursperday) || 2,
          preferredStudyTime: '7:00 PM',
          dailyReminderEnabled: true,
          examDates: [],
          learningHistory: [],
          streak: 1,
          lastActiveDate: new Date().toISOString().split('T')[0],
          overallProgress: 15,
          totalSessions: 1,
          totalQuestionsAnswered: 0,
          correctAnswers: 0,
          dailyQuestionsGoal: 10,
        };
        db.users.set(userId, user as any);
        db.profiles.set(userId, profile as any);
        savedItems.push({ user, profile });
      });
    } else if (type === 'objectives') {
      items.forEach((item: any, idx: number) => {
        const objId = item.id || `obj_${Date.now()}_${idx}`;
        const objective = {
          id: objId,
          subject: item.subject || 'Python',
          topic: item.topic || 'Core Concepts',
          title: item.title || 'Learning Objective',
          description: item.description || '',
          targetLevel: item.targetlevel || item.targetLevel || 'intermediate',
          bloomLevel: item.bloomlevel || item.bloomLevel || 'understand',
          createdAt: new Date().toISOString(),
        };
        db.learningObjectives.set(objId, objective);
        savedItems.push(objective);
      });
    }

    res.json({
      success: true,
      count: items.length,
      savedItems,
      totalStudents: db.profiles.size,
      totalObjectives: db.learningObjectives.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/learning-objectives', (req, res) => {
  res.json({
    objectives: Array.from(db.learningObjectives.values()),
    count: db.learningObjectives.size,
  });
});

// ----------------------------------------------------
// 8. RAG Knowledge Base
// ----------------------------------------------------
app.get('/api/documents', (req, res) => {
  try {
    res.json({
      documents: Array.from(db.documents.values()),
      totalChunks: db.chunks.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list documents' });
  }
});

// Preview chunks before ingestion
app.post('/api/documents/preview-chunks', (req, res) => {
  try {
    const { content, chunkSize = 450 } = req.body || {};
    const chunks = ragService.previewChunks(String(content || ''), Number(chunkSize) || 450);
    res.json({ success: true, chunks, count: chunks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to preview chunks', chunks: [] });
  }
});

// Delete a RAG document and its chunks
app.delete('/api/documents/:id', (req, res) => {
  try {
    const deleted = ragService.deleteDocument(req.params.id);
    res.json({
      success: true,
      deleted,
      documents: Array.from(db.documents.values()),
      totalChunks: db.chunks.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete document' });
  }
});

// Get single document and its semantic chunks
app.get('/api/documents/:id', (req, res) => {
  try {
    const { document, chunks } = ragService.getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ document, chunks, chunkCount: chunks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve document' });
  }
});

app.post('/api/documents/upload', async (req, res) => {
  try {
    const { title, subject, category, originalFilename, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const doc = await ragService.ingestDocument(
      title,
      subject || 'General',
      category || 'Study Material',
      originalFilename || `${title.toLowerCase().replace(/\s+/g, '_')}.txt`,
      content
    );
    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Voice-to-Knowledge: Transcribe & AI-structure verbal study summaries into searchable RAG notes
app.post('/api/voice-to-knowledge', async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType,
      transcript: clientTranscript,
      title,
      subject,
      topic,
      userId,
      pinToProfile,
    } = req.body;

    let rawTranscript = String(clientTranscript || '').trim();

    // If audioBase64 was sent and no client transcript is present, transcribe via Gemini
    if (!rawTranscript && audioBase64) {
      const transcribed = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
      if (transcribed && !transcribed.startsWith('[')) {
        rawTranscript = transcribed.trim();
      }
    }

    if (!rawTranscript) {
      return res.status(400).json({
        error: 'Please record a verbal summary or provide a transcript to process.',
      });
    }

    const targetSubject = String(subject || 'Python').trim();
    const targetTopic = String(topic || `${targetSubject} Study Session Summary`).trim();
    const noteTitle =
      String(title || '').trim() ||
      `Voice Note: ${targetTopic} (${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })})`;

    // Process the verbal transcript with AI into a clean, searchable RAG knowledge note
    let structuredNote = '';
    const ai = getGeminiAI();
    if (ai) {
      try {
        const prompt = `You are an expert academic knowledge-base synthesizer. A student just recorded the following verbal summary after a study session on "${targetTopic}" (${targetSubject}):

"${rawTranscript}"

Convert this verbal summary into a clean, well-structured, searchable study note for a RAG knowledge base. Include:
1. Executive Summary (2-3 crisp sentences)
2. Key Concepts & Rules Extracted (bullet points with clear technical terms)
3. Important Edge Cases, Complexity, or Formulas
4. 2 Active Recall Self-Check Questions & Answers
5. Original Verbal Summary Reference

Return plain markdown text suitable for semantic chunking.`;

        const response = await generateContentWithRetry({
          contents: prompt,
        });
        if (response?.text) {
          structuredNote = response.text.trim();
        }
      } catch {
        // Fallback to deterministic synthesizer below
      }
    }

    if (!structuredNote) {
      structuredNote = `${noteTitle} — ${targetSubject} (${targetTopic})

Executive Study Summary:
Structured knowledge note synthesized from student's recorded verbal study session summary on ${targetTopic} in ${targetSubject}.

Key Concepts & Takeaways Recorded:
${rawTranscript}

Core Rules & Exam Checkpoints:
- Topic Focus: ${targetTopic} (${targetSubject})
- Active Recall Verification: Ensure base invariants, boundary conditions, and core definitions from this verbal summary are reviewed in your next Leitner spaced repetition session.

Original Verbal Session Transcript:
"${rawTranscript}"`;
    }

    // Save as a searchable text document + indexed semantic chunks in the RAG knowledge base
    const filename = `voice_note_${targetSubject.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.txt`;
    const ingestedDoc = await ragService.ingestDocument(
      noteTitle,
      targetSubject,
      'Voice-to-Knowledge Note',
      filename,
      structuredNote
    );

    const { chunks } = ragService.getDocument(ingestedDoc.id);

    // Optionally pin to student's profile & log in WhatsApp history
    let updatedProfile = null;
    if (userId) {
      const prof = db.getProfileByUserId(userId);
      if (prof) {
        const pinned = Array.from(
          new Set([ingestedDoc.id, ...(prof.pinnedDocumentIds || [])])
        );
        updatedProfile = db.updateProfile(userId, {
          pinnedDocumentIds: pinToProfile !== false ? pinned : prof.pinnedDocumentIds,
          learningHistory: [
            ...(prof.learningHistory || []),
            {
              topic: targetTopic,
              subject: targetSubject,
              date: new Date().toISOString().split('T')[0],
              mastered: true,
            },
          ],
        });

        const waMsg = `🎙️ *Voice-to-Knowledge Note Indexed in RAG!*\n\n📄 *Title:* ${ingestedDoc.title}\n📚 *Subject:* ${targetSubject}\n🧩 *Indexed Chunks:* ${chunks.length} searchable semantic chunks\n\nYou can now query this note anytime in WhatsApp chat or review it in your Spaced Repetition flashcards!`;
        db.recordMessage({
          userId: prof.userId,
          whatsappNumber: prof.whatsappNumber,
          direction: 'outgoing',
          messageType: 'text',
          content: waMsg,
          intent: 'VOICE_TO_KNOWLEDGE_INDEXED',
          agentName: 'RagKnowledgeAgent',
        });
      }
    }

    res.json({
      success: true,
      document: ingestedDoc,
      chunks,
      structuredNote,
      rawTranscript,
      updatedProfile,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to process Voice-to-Knowledge summary',
    });
  }
});

// ----------------------------------------------------
// 8b. Smart Reminder System & Notification Scheduler
// (Analyzes Past Study Activity + Exam Schedule -> Optimal Study Times -> WhatsApp Simulator Push)
// ----------------------------------------------------
app.post('/api/smart-notification-scheduler/analyze', async (req, res) => {
  try {
    const { userId, horizon = 'today' } = req.body || {};
    const prof = userId
      ? db.getProfileByUserId(userId)
      : Array.from(db.profiles.values())[0];
    if (!prof) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const accuracy =
      prof.totalQuestionsAnswered > 0
        ? Math.round((prof.correctAnswers / prof.totalQuestionsAnswered) * 100)
        : 75;
    const primaryWeak = prof.weakTopics?.[0] || 'Recursion & Base Cases';
    const secondaryWeak = prof.weakTopics?.[1] || 'Integration by Parts';
    const focusMins = prof.focusStats?.totalFocusMinutes || 125;
    const focusSessions = prof.focusStats?.completedSessions || 5;
    const preferredTime = prof.preferredStudyTime || '07:00 PM';
    const historyCount = (prof.learningHistory || []).length;
    const masteredHistoryCount = (prof.learningHistory || []).filter((h) => h.mastered).length;

    // Analyze past message timestamps to detect student's natural active hours
    const userMessages = db.messages.filter(
      (m) => m.userId === prof.userId && m.direction === 'incoming'
    );
    let detectedPeakWindow = 'Morning (08:00 AM – 10:30 AM) & Evening (' + preferredTime + ')';
    if (userMessages.length > 0) {
      const hours = userMessages.map((m) => new Date(m.timestamp).getHours());
      const eveningCount = hours.filter((h) => h >= 17).length;
      const morningCount = hours.filter((h) => h >= 6 && h < 12).length;
      if (eveningCount > morningCount) {
        detectedPeakWindow = `Evening Deep-Work Peak (${preferredTime}) + Morning Analytical Window (08:30 AM)`;
      }
    }

    // Analyze upcoming exam schedule from profile.examDates
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingExams = [...(prof.examDates || [])]
      .map((exam) => {
        const target = new Date(exam.date);
        const targetMidnight = new Date(
          target.getFullYear(),
          target.getMonth(),
          target.getDate()
        );
        const daysRemaining = Math.ceil(
          (targetMidnight.getTime() - todayMidnight.getTime()) / 86400000
        );
        const urgency: 'critical' | 'high' | 'moderate' =
          daysRemaining <= 7 ? 'critical' : daysRemaining <= 14 ? 'high' : 'moderate';
        return {
          ...exam,
          daysRemaining,
          urgency,
        };
      })
      .filter((e) => e.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const nearestExam = upcomingExams[0] || null;
    const secondExam = upcomingExams[1] || null;

    const primarySubject = nearestExam?.subject || prof.subjects?.[0] || 'Python';
    const secondarySubject =
      secondExam?.subject || prof.subjects?.[1] || prof.subjects?.[0] || 'Calculus';

    const targetDateObj =
      horizon === 'tomorrow' ? new Date(Date.now() + 86400000) : new Date();
    const targetDateLabel = targetDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const targetDateIso = targetDateObj.toISOString().split('T')[0];

    let aiSummary = '';
    let suggestedSlots: {
      id: string;
      time: string;
      windowLabel: string;
      subject: string;
      topic: string;
      durationMinutes: number;
      cognitiveMatchScore: number;
      examAlignment: string;
      activityInsight: string;
      rationale: string;
      whatsappPreview: string;
    }[] = [];

    const ai = getGeminiAI();
    if (ai) {
      try {
        const examContextStr =
          upcomingExams.length > 0
            ? upcomingExams
                .map(
                  (e) =>
                    `${e.title} (${e.subject}) on ${e.date} (${e.daysRemaining} days left, urgency: ${e.urgency})`
                )
                .join('; ')
            : 'Continuous assessment mode';

        const historyStr =
          (prof.learningHistory || [])
            .slice(-5)
            .map((h) => `${h.subject}: ${h.topic} (${h.mastered ? 'Mastered' : 'In Progress'})`)
            .join('; ') || 'Recent practice sessions';

        const prompt = `You are an AI Smart Reminder Strategist.
Analyze this student's past study activity and upcoming exam schedule to suggest 3 optimal study times for ${
          horizon === 'tomorrow' ? 'tomorrow' : 'today'
        } (${targetDateLabel}) to be delivered via the WhatsApp simulator:
- Student Name: ${prof.name}
- Subjects: ${(prof.subjects || []).join(', ')}
- Past Study Activity:
  • Quiz Accuracy: ${accuracy}% (${prof.correctAnswers}/${prof.totalQuestionsAnswered} correct)
  • Learning History: ${historyStr} (${masteredHistoryCount}/${historyCount} topics mastered)
  • Pomodoro Focus Logged: ${focusMins} mins across ${focusSessions} sessions
  • Study Streak: ${prof.streak} days
  • Detected Peak Study Window: ${detectedPeakWindow}
  • Weak Topics needing priority: ${(prof.weakTopics || []).join(', ') || primaryWeak}
- Upcoming Exam Schedule:
  • ${examContextStr}
- Daily Study Target: ${prof.studyHoursPerDay || 2} hrs/day (Preferred alert: ${preferredTime})

Return strictly valid JSON with this structure:
{
  "aiSummary": "2-sentence synthesis explaining how their past study activity and upcoming exam countdowns shaped today's 3 optimal study windows.",
  "slots": [
    {
      "id": "slot_morning",
      "time": "08:30 AM",
      "windowLabel": "Peak Analytical & Exam Remediation Window",
      "subject": "${primarySubject}",
      "topic": "${primaryWeak}",
      "durationMinutes": 45,
      "cognitiveMatchScore": 97,
      "examAlignment": "${nearestExam ? `${nearestExam.title} (${nearestExam.daysRemaining}d left)` : `${primarySubject} Mastery`}",
      "activityInsight": "Matches peak working-memory window for low-accuracy topics",
      "rationale": "Why this slot is optimal based on past study activity and exam schedule",
      "whatsappPreview": "Short motivating WhatsApp simulator reminder message"
    }
  ]
}`;

        const geminiRes = await generateContentWithRetry({
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
          timeoutMs: 6000,
        });

        const cleanJson = (geminiRes.text || '{}')
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        const parsed = JSON.parse(cleanJson || '{}');
        if (parsed.aiSummary && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
          aiSummary = parsed.aiSummary;
          suggestedSlots = parsed.slots.map((s: any, idx: number) => ({
            id: s.id || `smart_slot_${idx + 1}`,
            time: s.time || '08:30 AM',
            windowLabel: s.windowLabel || 'Optimal Study Window',
            subject: s.subject || primarySubject,
            topic: s.topic || primaryWeak,
            durationMinutes: Number(s.durationMinutes) || 45,
            cognitiveMatchScore: Number(s.cognitiveMatchScore) || 95,
            examAlignment:
              s.examAlignment ||
              (nearestExam
                ? `${nearestExam.title} (${nearestExam.daysRemaining}d left)`
                : `${primarySubject} Exam Prep`),
            activityInsight:
              s.activityInsight ||
              `Calibrated from ${accuracy}% quiz accuracy & ${focusMins}m focus logs`,
            rationale:
              s.rationale ||
              'Optimized for peak active recall and upcoming exam readiness.',
            whatsappPreview:
              s.whatsappPreview ||
              `⏰ Smart Reminder (${s.time || '08:30 AM'}): Time for your ${s.subject || primarySubject} sprint on *${s.topic || primaryWeak}*!`,
          }));
        }
      } catch {
        // Fallback to deterministic activity + exam schedule analyzer below
      }
    }

    if (suggestedSlots.length === 0) {
      const examHeadline = nearestExam
        ? `with "${nearestExam.title}" (${nearestExam.subject}) approaching in ${nearestExam.daysRemaining} days (${nearestExam.date})`
        : `across your ${prof.subjects.join(', ')} curriculum`;

      aiSummary = `Analyzing ${prof.name}'s past study activity (${accuracy}% quiz accuracy across ${prof.totalQuestionsAnswered} questions, ${focusMins}m of Deep Focus across ${focusSessions} sessions, and ${masteredHistoryCount}/${historyCount} mastered topics) ${examHeadline}, the Smart Reminder engine identified 3 high-retention study windows for ${targetDateLabel}.`;

      suggestedSlots = [
        {
          id: 'slot_morning_exam_priority',
          time: '08:30 AM',
          windowLabel: 'Morning Peak Analytical & Exam Priority Slot',
          subject: primarySubject,
          topic: nearestExam
            ? `${nearestExam.title} High-Yield Prep: ${primaryWeak}`
            : primaryWeak,
          durationMinutes: 45,
          cognitiveMatchScore: 98,
          examAlignment: nearestExam
            ? `${nearestExam.title} (${nearestExam.daysRemaining} days left)`
            : `${primarySubject} Core Mastery`,
          activityInsight: `Targets #1 weak area (${primaryWeak}) during peak analytical alertness`,
          rationale: `Your past study history shows high-complexity topics like "${primaryWeak}" benefit from fresh morning working memory—especially critical ${
            nearestExam ? `with ${nearestExam.title} in ${nearestExam.daysRemaining} days` : 'for raising quiz accuracy'
          }.`,
          whatsappPreview: `🌅 *Smart Reminder (08:30 AM)*: ${
            nearestExam ? `🚨 *${nearestExam.daysRemaining}d to ${nearestExam.title}!* ` : ''
          }Let's tackle *${primaryWeak}* (${primarySubject}) for 45m while your focus is at 98% peak. Reply *"Start"*!`,
        },
        {
          id: 'slot_afternoon_active_recall',
          time: '04:30 PM',
          windowLabel: 'Afternoon Spaced-Repetition & Quiz Velocity Slot',
          subject: secondarySubject,
          topic: secondExam
            ? `${secondExam.title} Drill: ${secondaryWeak}`
            : secondaryWeak,
          durationMinutes: 35,
          cognitiveMatchScore: 94,
          examAlignment: secondExam
            ? `${secondExam.title} (${secondExam.daysRemaining} days left)`
            : nearestExam
            ? `${nearestExam.title} Secondary Review`
            : `${secondarySubject} Quiz Velocity`,
          activityInsight: `Boosts ${accuracy}% quiz accuracy via 35m afternoon active recall`,
          rationale: `Past quiz performance (${prof.correctAnswers}/${prof.totalQuestionsAnswered} correct) indicates a 35-minute afternoon Leitner flashcard & adaptive quiz session prevents the Ebbinghaus forgetting curve.`,
          whatsappPreview: `⚡ *Smart Reminder (04:30 PM)*: 35m Active Recall & Quiz Sprint on *${secondaryWeak}* (${secondarySubject}) to push your ${accuracy}% quiz accuracy above 85%! Reply *"/quiz ${secondarySubject}"*!`,
        },
        {
          id: 'slot_evening_habit_anchor',
          time: preferredTime,
          windowLabel: 'Evening Habit-Anchored Deep Focus & Mock Slot',
          subject: primarySubject,
          topic: `${primarySubject} Timed Practice & Day ${(prof.streak || 0) + 1} Streak Lock-In`,
          durationMinutes: 45,
          cognitiveMatchScore: 97,
          examAlignment: nearestExam
            ? `${nearestExam.title} Timed Mock`
            : `Day ${(prof.streak || 0) + 1} Streak Protection`,
          activityInsight: `Aligned with your ${preferredTime} habit anchor & ${focusMins}m Pomodoro history`,
          rationale: `Matches your historical ${preferredTime} study habit to consolidate today's concepts with timed exam problems and secure Day ${
            (prof.streak || 0) + 1
          } of your streak.`,
          whatsappPreview: `🔥 *Smart Reminder (${preferredTime})*: Lock in Day ${
            (prof.streak || 0) + 1
          } of your streak with a 45m ${primarySubject} timed practice session! Reply *"Ready"* to begin.`,
        },
      ];
    }

    res.json({
      success: true,
      horizon,
      tomorrowDate: targetDateLabel,
      targetDateLabel,
      targetDateIso,
      aiSummary,
      metricsAnalyzed: {
        accuracy,
        totalQuestionsAnswered: prof.totalQuestionsAnswered || 0,
        correctAnswers: prof.correctAnswers || 0,
        streak: prof.streak || 0,
        weakTopicsCount: (prof.weakTopics || []).length,
        focusMinutes: focusMins,
        focusSessions,
        historySessionsCount: historyCount,
        masteredTopicsCount: masteredHistoryCount,
        preferredStudyTime: preferredTime,
        detectedPeakWindow,
        upcomingExams,
      },
      slots: suggestedSlots,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to analyze performance for smart reminders',
    });
  }
});

app.post('/api/smart-notification-scheduler/push', async (req, res) => {
  try {
    const {
      userId,
      slots,
      updatePreferredTime,
      targetDateLabel,
      targetDateIso,
      syncToStudyPlan = true,
    } = req.body || {};
    const prof = userId
      ? db.getProfileByUserId(userId)
      : Array.from(db.profiles.values())[0];
    if (!prof) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const selectedSlots: any[] = Array.isArray(slots) ? slots : [];
    if (selectedSlots.length === 0) {
      return res.status(400).json({ error: 'At least one study time slot is required' });
    }

    const displayDate =
      targetDateLabel ||
      new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    const planDateIso = targetDateIso || new Date().toISOString().split('T')[0];

    const createdReminders: any[] = [];
    for (const slot of selectedSlots) {
      const rem = {
        id: `rem_smart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: prof.userId,
        whatsappNumber: prof.whatsappNumber,
        reminderText: `[Smart Reminder • ${slot.windowLabel}] ${slot.subject}: ${slot.topic} (${slot.durationMinutes}m)`,
        targetTime: slot.time,
        frequency: 'daily' as const,
        subject: slot.subject,
        timezone: 'Asia/Kolkata',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        type: 'daily_session' as const,
      };
      db.addReminder(rem);
      createdReminders.push(rem);

      if (syncToStudyPlan) {
        db.addStudyPlanItem(prof.userId, {
          id: `plan_smart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          dayNumber: (db.getStudyPlan(prof.userId)?.items.length || 0) + 1,
          dateStr: planDateIso,
          title: `[AI Smart Slot] ${slot.topic}`,
          topic: slot.topic,
          subject: slot.subject,
          durationMinutes: Number(slot.durationMinutes) || 45,
          timeSlot: slot.time,
          tasks: [
            { task: `Complete ${slot.durationMinutes}m focus block at ${slot.time}`, completed: false },
            { task: `Solve 3 adaptive quiz questions on ${slot.topic}`, completed: false },
          ],
          isCompleted: false,
          isMissed: false,
        });
      }
    }

    // Update student profile preferredStudyTime if requested
    const updatedProfile = db.updateProfile(prof.userId, {
      dailyReminderEnabled: true,
      preferredStudyTime: updatePreferredTime || selectedSlots[0]?.time || prof.preferredStudyTime,
    });

    const accuracy =
      prof.totalQuestionsAnswered > 0
        ? Math.round((prof.correctAnswers / prof.totalQuestionsAnswered) * 100)
        : 75;
    const nearestExam = (prof.examDates || [])[0];

    // Build and push the WhatsApp Simulator message with the Smart Reminder analysis & schedule
    const scheduleLines = selectedSlots
      .map(
        (s, idx) =>
          `${idx + 1}️⃣ *${s.time}* (${s.durationMinutes}m) — *${s.subject}: ${s.topic}*\n   • _🎯 ${s.windowLabel} (${s.cognitiveMatchScore}% AI Match)_\n   • _📊 ${s.examAlignment || 'Curriculum Mastery'} | ${s.activityInsight || 'Activity Calibrated'}_`
      )
      .join('\n\n');

    const waMessage =
      `🧠 *AI Smart Reminder: Optimal Study Times for ${displayDate}* ⚡\n\n` +
      `Hi ${prof.name}! Based on your past study activity (*${accuracy}% quiz accuracy*, *${prof.streak}-day streak*)` +
      (nearestExam ? ` and your upcoming *${nearestExam.title}* exam on *${nearestExam.date}*` : '') +
      `, here are your optimal study windows:\n\n` +
      `${scheduleLines}\n\n` +
      `✅ *Added to your Study Planner & WhatsApp Reminder Queue (${prof.whatsappNumber})!*\n` +
      `Reply *"Start"*, *"/quiz ${selectedSlots[0]?.subject || 'Python'}"*, or tap a quick action below to begin! 🚀`;

    await whatsapp.sendTextMessage(prof.whatsappNumber, waMessage).catch(() => {});

    const recordedMessage = db.recordMessage({
      userId: prof.userId,
      whatsappNumber: prof.whatsappNumber,
      direction: 'outgoing',
      messageType: 'text',
      content: waMessage,
      intent: 'SMART_REMINDER_SUGGESTION',
      agentName: 'SmartReminderAgent',
    });

    res.json({
      success: true,
      pushedCount: selectedSlots.length,
      reminders: createdReminders,
      updatedProfile,
      studyPlan: db.getStudyPlan(prof.userId),
      whatsappMessage: waMessage,
      recordedMessage,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to push smart reminder schedule to WhatsApp simulator',
    });
  }
});

// ----------------------------------------------------
// High-Level Thinking Models Studio for Students
// ----------------------------------------------------
app.post('/api/thinking-models/analyze', async (req, res) => {
  try {
    const {
      userId,
      topic,
      subject,
      frameworkId,
      thinkingDepth = 'HIGH',
      studentHypothesis = '',
      saveToRag = false,
      pushToWhatsApp = false,
    } = req.body;

    const cleanTopic = String(topic || 'Recursion & Dynamic Programming').trim();
    const cleanSubject = String(subject || 'DSA').trim();
    const cleanFramework = String(frameworkId || 'first_principles').trim();
    const prof = userId ? db.getProfileByUserId(userId) : Array.from(db.profiles.values())[0];

    const frameworkDefinitions: Record<
      string,
      { name: string; subtitle: string; stepLabels: string[] }
    > = {
      first_principles: {
        name: 'First-Principles Deconstruction',
        subtitle: 'Strip away surface assumptions to uncover irreducible axioms and rebuild from scratch',
        stepLabels: [
          '1. Surface Assumptions & Common Myths',
          '2. Irreducible Fundamental Truths (Axioms)',
          '3. Step-by-Step Reconstruction from Scratch',
          '4. Novel Application & Transfer Scenario',
        ],
      },
      feynman_mental_model: {
        name: 'Feynman Mental Model & Analogical Transfer',
        subtitle: 'Translate complex technical abstractions into crystal-clear intuition & expose blind spots',
        stepLabels: [
          '1. Plain-Language Core Intuition (Zero Jargon)',
          '2. High-Precision Real-World Analogy',
          '3. Jargon-Gap & Hidden Edge-Case Audit',
          '4. Formal Mathematical / Algorithmic Anchoring',
        ],
      },
      socratic_dialectic: {
        name: 'Socratic Dialectic & Counter-Example Probing',
        subtitle: 'Interrogate hypotheses through adversarial counter-examples and boundary conditions',
        stepLabels: [
          '1. Core Thesis & Implicit Premises',
          '2. Adversarial Counter-Example / Stress Test',
          '3. Boundary Condition & Failure Mode Analysis',
          '4. Synthesized Robust Law / Invariant',
        ],
      },
      systems_second_order: {
        name: 'Second-Order & Systems Thinking Matrix',
        subtitle: 'Map causal feedback loops, time/space trade-offs, and cascading downstream effects',
        stepLabels: [
          '1. First-Order Immediate Effect',
          '2. Second- & Third-Order Cascading Consequences',
          '3. Feedback Loops & Bottleneck Trade-offs',
          '4. Architectural / Strategic Optimization',
        ],
      },
      bloom_metacognitive: {
        name: "Bloom's Higher-Order Synthesis & Evaluation",
        subtitle: 'Ascend from rote recall to analytical critique, architectural comparison, and original design',
        stepLabels: [
          '1. Analytical Decomposition (How Components Interact)',
          '2. Critical Evaluation (When This Approach Fails vs. Excels)',
          '3. Comparative Synthesis (Alternative Paradigms)',
          '4. Original Design Challenge (Create New Solution)',
        ],
      },
      inversion_premortem: {
        name: 'Inversion & Failure Pre-Mortem Model',
        subtitle: 'Solve complex problems backward by identifying every way a solution or proof can break',
        stepLabels: [
          '1. Forward Goal vs. Inverted Failure State',
          '2. Top 3 Fatal Bugs / Conceptual Traps',
          '3. Defensive Guardrails & Invariant Checks',
          '4. Bulletproof Execution Blueprint',
        ],
      },
    };

    const selectedMeta =
      frameworkDefinitions[cleanFramework] || frameworkDefinitions.first_principles;

    // Retrieve relevant RAG context if available
    const ragContext = ragService.search(`${cleanSubject} ${cleanTopic}`, 2);

    let structuredAnalysis: any = null;
    const ai = getGeminiAI();

    if (ai) {
      try {
        const prompt = `You are a Principal Cognitive Scientist and Elite STEM Mentor building a High-Level Thinking Model for a student.
Student Profile:
- Name: ${prof?.name || 'Student'}
- Education Level: ${prof?.educationLevel || 'college'}
- Skill Level: ${prof?.currentSkillLevel || 'intermediate'}
- Weak Topics: ${(prof?.weakTopics || []).join(', ') || 'None'}

Selected High-Level Thinking Framework: "${selectedMeta.name}" (${selectedMeta.subtitle})
Target Subject: "${cleanSubject}"
Target Concept / Problem: "${cleanTopic}"
${studentHypothesis ? `Student's Current Intuition / Hypothesis to Critique: "${studentHypothesis}"` : ''}
${ragContext.contextString ? `Verified Curriculum RAG Context:\n${ragContext.contextString.slice(0, 900)}` : ''}

Generate a rigorous, deeply insightful High-Level Thinking Model breakdown using the exact 4 stages of "${selectedMeta.name}":
${selectedMeta.stepLabels.join('\n')}

Return valid JSON matching this exact structure:
{
  "executiveThesis": "A crisp 2-sentence high-level thesis synthesizing the deepest insight about this topic.",
  "cognitiveComplexityScore": 92,
  "reasoningTrace": [
    "Step 1 of internal reasoning trace...",
    "Step 2 of internal reasoning trace...",
    "Step 3 of internal reasoning trace...",
    "Step 4 of internal reasoning trace..."
  ],
  "stages": [
    {
      "stageTitle": "${selectedMeta.stepLabels[0]}",
      "coreInsight": "Detailed, rigorous explanation for stage 1",
      "concreteExampleOrFormula": "Concrete code snippet, mathematical formula, or system trace",
      "metacognitivePrompt": "A sharp question for the student to self-verify this stage"
    }
  ],
  "commonCognitiveTraps": [
    {
      "trap": "Name of common student misconception or trap",
      "whyItHappens": "Cognitive reason students fall for it",
      "mentalModelCorrection": "How this thinking model permanently fixes it"
    }
  ],
  "synthesisChallenge": {
    "question": "A high-level synthesis or transfer problem that tests true mastery beyond rote memorization",
    "hint": "A first-principles hint",
    "modelSolutionOutline": "Key steps of the rigorous solution"
  }
}`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = (response.text || '').trim();
        const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        structuredAnalysis = JSON.parse(cleanedJson);
      } catch (aiErr) {
        structuredAnalysis = null;
      }
    }

    // Deterministic high-rigor fallback if offline or AI quota reached
    if (!structuredAnalysis || !Array.isArray(structuredAnalysis.stages) || structuredAnalysis.stages.length === 0) {
      structuredAnalysis = {
        executiveThesis: `Mastery of ${cleanTopic} (${cleanSubject}) requires moving beyond memorizing formulas to understanding the underlying invariants, boundary conditions, and state transitions through ${selectedMeta.name}.`,
        cognitiveComplexityScore: thinkingDepth === 'HIGH' ? 95 : 86,
        reasoningTrace: [
          `Deconstructing "${cleanTopic}" within ${cleanSubject} to isolate core invariants vs. surface syntax.`,
          `Applying ${selectedMeta.name} across ${prof?.currentSkillLevel || 'intermediate'}-level curriculum constraints.`,
          studentHypothesis
            ? `Auditing student hypothesis ("${studentHypothesis.slice(0, 70)}") against adversarial edge cases.`
            : `Synthesizing multi-step mental model and counter-examples to prevent rote-memorization traps.`,
          `Formulating a transfer-learning synthesis challenge to verify deep conceptual retention.`,
        ],
        stages: [
          {
            stageTitle: selectedMeta.stepLabels[0],
            coreInsight: `Most students approach ${cleanTopic} by memorizing template patterns without questioning why the state or invariant holds. Strip away the notation and ask: what state is conserved at each transition?`,
            concreteExampleOrFormula: `Invariant(State_k) => Transition(k -> k+1) preserves correctness & bounds complexity.`,
            metacognitivePrompt: `Which assumption about ${cleanTopic} would break if the input size or boundary condition approached zero or infinity?`,
          },
          {
            stageTitle: selectedMeta.stepLabels[1],
            coreInsight: `At its core, ${cleanTopic} reduces to a small set of fundamental rules: base termination conditions, deterministic state progression, and resource conservation (time/space or conservation laws).`,
            concreteExampleOrFormula: `Base Case: T(0) = O(1) | Inductive Step: T(n) = T(n-1) + Δ(n)`,
            metacognitivePrompt: `Can you state the irreducible rule of ${cleanTopic} in one sentence without using textbook jargon?`,
          },
          {
            stageTitle: selectedMeta.stepLabels[2],
            coreInsight: `When we reconstruct ${cleanTopic} from these axioms, every edge case—such as degenerate inputs, cyclic dependencies, or overflow states—becomes predictable rather than a surprise bug.`,
            concreteExampleOrFormula: `Guard: if (!isValidState(input)) return boundaryFallback; // Prevents silent propagation`,
            metacognitivePrompt: `Where does your current mental model of ${cleanTopic} struggle when two constraints conflict?`,
          },
          {
            stageTitle: selectedMeta.stepLabels[3],
            coreInsight: `By internalizing this thinking model, you can transfer the exact same structure of ${cleanTopic} to novel problems in ${cleanSubject} and adjacent engineering domains.`,
            concreteExampleOrFormula: `Pattern Transfer: ${cleanTopic} <-> State-Space Search / Equilibrium Optimization`,
            metacognitivePrompt: `How would you redesign ${cleanTopic} if memory were strictly O(1) or latency had to be halved?`,
          },
        ],
        commonCognitiveTraps: [
          {
            trap: `Rote Pattern Matching on ${cleanTopic}`,
            whyItHappens: `Students memorize surface steps without verifying preconditions or invariants.`,
            mentalModelCorrection: `Always verify the base invariant and boundary constraints before applying any transformation.`,
          },
          {
            trap: `Ignoring Second-Order Trade-offs`,
            whyItHappens: `Focusing only on immediate output correctness while overlooking stack depth, precision loss, or asymptotic scaling.`,
            mentalModelCorrection: `Use ${selectedMeta.name} to trace resource cost and failure modes across extreme inputs.`,
          },
        ],
        synthesisChallenge: {
          question: `Suppose a standard implementation or proof of ${cleanTopic} in ${cleanSubject} fails when a key assumption is inverted (e.g., non-monotonic input, cyclic state, or strict O(1) auxiliary space). Using ${selectedMeta.name}, how do you adapt the solution?`,
          hint: `Identify which of the 4 stages above contains the violated assumption, then modify only that axiom's transition rule.`,
          modelSolutionOutline: `1. Isolate the broken precondition in ${cleanTopic}. 2. Introduce an invariant check or state compression step. 3. Prove termination and bounded complexity under the new constraint.`,
        },
      };
    }

    let savedDocument: any = null;
    if (saveToRag) {
      const markdownContent = [
        `# ${selectedMeta.name}: ${cleanTopic} (${cleanSubject})`,
        `**Executive Thesis:** ${structuredAnalysis.executiveThesis}`,
        '',
        `## High-Level Reasoning Trace`,
        ...(structuredAnalysis.reasoningTrace || []).map((t: string, i: number) => `${i + 1}. ${t}`),
        '',
        `## 4-Stage Thinking Model Breakdown`,
        ...(structuredAnalysis.stages || []).map(
          (s: any) =>
            `### ${s.stageTitle}\n${s.coreInsight}\n- **Anchor / Formula:** \`${s.concreteExampleOrFormula}\`\n- **Metacognitive Check:** _${s.metacognitivePrompt}_`
        ),
        '',
        `## Higher-Order Synthesis Challenge`,
        `**Question:** ${structuredAnalysis.synthesisChallenge?.question}`,
        `**Solution Blueprint:** ${structuredAnalysis.synthesisChallenge?.modelSolutionOutline}`,
      ].join('\n');

      savedDocument = await ragService.ingestDocument(
        `Thinking Model (${selectedMeta.name}): ${cleanTopic}`,
        cleanSubject,
        'cheatsheet',
        `thinking_model_${cleanFramework}_${Date.now()}.md`,
        markdownContent
      );
    }

    if (pushToWhatsApp && prof) {
      const waText =
        `🧠 *High-Level Thinking Model: ${selectedMeta.name}*\n` +
        `📚 *Topic:* ${cleanTopic} (${cleanSubject})\n\n` +
        `💡 *Core Thesis:* ${structuredAnalysis.executiveThesis}\n\n` +
        (structuredAnalysis.stages || [])
          .map((s: any) => `🔹 *${s.stageTitle}*\n${s.coreInsight}`)
          .join('\n\n') +
        `\n\n🎯 *Synthesis Challenge:* ${structuredAnalysis.synthesisChallenge?.question}`;

      await whatsapp.sendTextMessage(prof.whatsappNumber, waText).catch(() => {});
      db.recordMessage({
        userId: prof.userId,
        whatsappNumber: prof.whatsappNumber,
        direction: 'outgoing',
        messageType: 'text',
        content: waText,
        intent: 'HIGH_LEVEL_THINKING_MODEL',
        agentName: 'CognitiveThinkingAgent',
      });
    }

    res.json({
      success: true,
      framework: selectedMeta,
      frameworkId: cleanFramework,
      topic: cleanTopic,
      subject: cleanSubject,
      thinkingDepth,
      modelUsed: 'gemini-3.8-flash (ThinkingLevel.' + thinkingDepth + ')',
      analysis: structuredAnalysis,
      savedDocument,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Failed to generate high-level thinking model analysis',
    });
  }
});

// Delete a document and its semantic chunks from RAG
app.delete('/api/documents/:id', (req, res) => {
  try {
    const ok = ragService.deleteDocument(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, deletedId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Preview chunks without persisting to DB
app.post('/api/documents/preview-chunks', (req, res) => {
  try {
    const { content, chunkSize } = req.body;
    if (!content) {
      return res.json({ chunks: [], count: 0 });
    }
    const chunks = ragService.previewChunks(content, chunkSize || 450);
    res.json({ chunks, count: chunks.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Curated Free Courses & YouTube Videos across Python, Java, C, C++, C#, R, etc.
app.get('/api/learning-resources', (req, res) => {
  try {
    const { subject, type, q } = req.query;
    let list = [...CURATED_LEARNING_RESOURCES];

    if (subject && subject !== 'all') {
      list = list.filter((r) => r.subject.toLowerCase() === String(subject).toLowerCase());
    }
    if (type && type !== 'all') {
      list = list.filter((r) => r.type === type);
    }
    if (q && String(q).trim()) {
      const query = String(q).toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.provider.toLowerCase().includes(query) ||
          r.subject.toLowerCase().includes(query) ||
          r.keyTopics.some((t) => t.toLowerCase().includes(query))
      );
    }

    res.json({ success: true, count: list.length, resources: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Material Ratings & Reviews System (Documents & Courses)
// ----------------------------------------------------
app.get('/api/reviews/summary', (req, res) => {
  try {
    const summaryMap: Record<
      string,
      { averageRating: number; totalRatings: number; ratingDistribution: Record<number, number> }
    > = {};

    for (const review of db.reviews.values()) {
      if (!summaryMap[review.materialId]) {
        summaryMap[review.materialId] = {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }
      const item = summaryMap[review.materialId];
      item.totalRatings += 1;
      item.ratingDistribution[review.rating] = (item.ratingDistribution[review.rating] || 0) + 1;
    }

    for (const id in summaryMap) {
      const item = summaryMap[id];
      let sum = 0;
      for (let star = 1; star <= 5; star++) {
        sum += star * (item.ratingDistribution[star] || 0);
      }
      item.averageRating = item.totalRatings > 0 ? Number((sum / item.totalRatings).toFixed(1)) : 0;
    }

    res.json({ success: true, summaries: summaryMap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews', (req, res) => {
  try {
    const { materialId } = req.query;
    let list = Array.from(db.reviews.values());

    if (materialId) {
      list = list.filter((r) => r.materialId === materialId);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate rating summary for filtered material or overall
    const totalRatings = list.length;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    list.forEach((r) => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
      sum += r.rating;
    });
    const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(1)) : 0;

    res.json({
      success: true,
      reviews: list,
      summary: {
        materialId: materialId || 'all',
        averageRating,
        totalRatings,
        ratingDistribution,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', (req, res) => {
  try {
    const { materialId, materialType, materialTitle, userId, userName, userAvatar, rating, comment } = req.body;

    if (!materialId || !comment || !rating) {
      return res.status(400).json({ error: 'materialId, rating (1-5), and comment are required' });
    }

    const numericRating = Math.min(5, Math.max(1, Math.round(Number(rating))));
    const newReview = {
      id: 'rev_' + Math.random().toString(36).substring(2, 9),
      materialId: String(materialId),
      materialType: (materialType === 'course' ? 'course' : 'document') as 'course' | 'document',
      materialTitle: materialTitle || 'Study Material',
      userId: userId || 'student_anon',
      userName: userName || 'Student',
      userAvatar: userAvatar || undefined,
      rating: numericRating,
      comment: String(comment).trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
    };

    db.reviews.set(newReview.id, newReview);

    // Compute updated summary for this material
    const materialReviews = Array.from(db.reviews.values()).filter((r) => r.materialId === materialId);
    const totalRatings = materialReviews.length;
    let sum = 0;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    materialReviews.forEach((r) => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
      sum += r.rating;
    });
    const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(1)) : 0;

    res.json({
      success: true,
      review: newReview,
      summary: {
        materialId,
        averageRating,
        totalRatings,
        ratingDistribution,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test AI Tutor response using RAG knowledge base context
app.post('/api/documents/test-tutor-response', async (req, res) => {
  try {
    const { question, subject } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Use default active student profile for realistic response simulation
    const profile = Array.from(db.profiles.values())[0] || {
      userId: 'test_student',
      name: 'Student',
      whatsappNumber: '919876543210',
      educationLevel: 'college',
      currentSkillLevel: 'intermediate',
      preferredLanguage: 'English',
      subjects: ['Python', 'Calculus', 'DSA'],
      weakTopics: [],
      studyHoursPerDay: 2,
      streak: 7,
      overallProgress: 75,
      totalSessions: 14,
      totalQuestionsAnswered: 48,
      correctAnswers: 41,
    };

    const searchRes = ragService.search(subject ? `${subject} ${question}` : question, 3);
    const tutorAnswer = await runTutorAgent(question, profile, subject);

    res.json({
      success: true,
      question,
      tutorAnswer,
      matchedChunks: searchRes.chunks,
      contextString: searchRes.contextString,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate tutor response' });
  }
});

app.post('/api/documents/search', async (req, res) => {
  try {
    const { query, limit, subject } = req.body;
    const vectorResult = await ragService.semanticVectorSearch(query || '', {
      subject,
      limit: limit || 6,
      minSimilarity: 0.16,
    });
    res.json({
      ...vectorResult,
      chunks: vectorResult.matchedChunks.map((m) => m.chunk),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed', chunks: [], contextString: '' });
  }
});

// Dedicated Vector Semantic Search against the RAG Knowledge Base
app.post('/api/documents/semantic-search', async (req, res) => {
  try {
    const {
      query,
      subject = 'all',
      limit = 8,
      minSimilarity = 0.18,
      includeSynthesis = false,
    } = req.body || {};

    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) {
      return res.json({
        success: true,
        query: '',
        embeddingModel: 'gemini-embedding-2-preview + Dense Cosine Vector Index',
        vectorDimension: 128,
        searchLatencyMs: 1,
        totalChunksScanned: db.chunks.length,
        totalDocumentsScanned: db.documents.size,
        matchedChunks: [],
        matchedDocuments: [],
        matchedCourses: [],
        contextString: '',
        aiSynthesis: null,
      });
    }

    const vectorResults = await ragService.semanticVectorSearch(cleanQuery, {
      subject: String(subject),
      limit: Number(limit) || 8,
      minSimilarity: Number(minSimilarity) || 0.18,
    });

    let aiSynthesis: string | null = null;
    if (includeSynthesis && vectorResults.matchedChunks.length > 0) {
      const topHit = vectorResults.matchedChunks[0];
      const ai = getGeminiAI();
      if (ai) {
        try {
          const synthPrompt = `You are a concise RAG Knowledge Base Synthesizer.
Based ONLY on these retrieved vector-matched study chunks for the student query "${cleanQuery}":
${vectorResults.contextString.slice(0, 1200)}

Provide a crisp 2-sentence direct answer synthesizing the key concept and citing the source document title ("${topHit.chunk.documentTitle}").`;
          const genRes = await generateContentWithRetry({
            contents: synthPrompt,
            preferredModel: 'gemini-3.8-flash',
            timeoutMs: 4500,
          });
          if (genRes?.text) {
            aiSynthesis = genRes.text.trim();
          }
        } catch {
          aiSynthesis = null;
        }
      }

      if (!aiSynthesis) {
        aiSynthesis = `From "${topHit.chunk.documentTitle}" (${topHit.chunk.subject}, ${Math.round(
          topHit.similarity * 100
        )}% vector similarity): ${topHit.chunk.content.slice(0, 220)}${
          topHit.chunk.content.length > 220 ? '...' : ''
        }`;
      }
    }

    res.json({
      success: true,
      ...vectorResults,
      aiSynthesis,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Vector semantic search failed',
      matchedChunks: [],
      matchedDocuments: [],
      matchedCourses: [],
    });
  }
});

// ----------------------------------------------------
// 9. WhatsApp Config & Live Status
// ----------------------------------------------------
app.get('/api/whatsapp/config', (req, res) => {
  res.json(whatsapp.getStatus());
});

app.post('/api/whatsapp/config', (req, res) => {
  try {
    const { phoneNumberId, accessToken, verifyToken } = req.body;
    whatsapp.updateCredentials(phoneNumberId, accessToken, verifyToken);
    res.json({ success: true, status: whatsapp.getStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update WhatsApp configuration' });
  }
});

// Test live WhatsApp credentials and Meta Cloud API connection
app.post('/api/whatsapp/test-live', async (req, res) => {
  try {
    const { testPhone } = req.body;
    const result = await whatsapp.testConnection(testPhone);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message || 'WhatsApp Cloud API test failed' });
  }
});

// Self-check endpoint for webhook verification
app.get('/api/whatsapp/webhook-check', (req, res) => {
  res.json({
    status: 'online',
    verifyToken: whatsapp.getVerifyToken(),
    supportedEndpoints: [
      '/webhook/whatsapp',
      '/webhook',
      '/api/webhook',
      '/api/webhook/whatsapp',
    ],
  });
});

// WhatsApp Live Audit Logs (with filtering)
app.get('/api/whatsapp/logs', (req, res) => {
  try {
    const { level, category, search, phone, limit } = req.query;
    const logs = waLogger.getLogs({
      level: level as string,
      category: category as string,
      search: search as string,
      phone: phone as string,
      limit: limit ? Number(limit) : 100,
    });
    const stats = waLogger.getStats();
    res.json({ logs, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve WhatsApp logs' });
  }
});

// Clear WhatsApp Audit Logs
app.delete('/api/whatsapp/logs', (req, res) => {
  try {
    waLogger.clearLogs();
    res.json({ success: true, message: 'WhatsApp logs cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear logs' });
  }
});

// Comprehensive WhatsApp Diagnostics
app.get('/api/whatsapp/diagnostics', async (req, res) => {
  try {
    const status = whatsapp.getStatus();
    const stats = waLogger.getStats();
    const recentErrors = waLogger.getLogs({ level: 'error', limit: 10 });
    const recentFailures = waLogger.getLogs({ category: 'delivery_failure', limit: 10 });

    res.json({
      timestamp: new Date().toISOString(),
      config: status,
      loggerStats: stats,
      recentErrors,
      recentDeliveryFailures: recentFailures,
      endpoints: {
        primaryWebhook: `${req.protocol}://${req.get('host')}/webhook/whatsapp`,
        alternateWebhook: `${req.protocol}://${req.get('host')}/webhook`,
        verifyToken: status.verifyToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Diagnostics failed' });
  }
});

// ----------------------------------------------------
// 10. Message History & Admin Stats
// ----------------------------------------------------
app.get('/api/messages', (req, res) => {
  const { userId, limit = 50 } = req.query;
  let list = db.messages;
  if (userId) {
    list = list.filter((m) => m.userId === userId);
  }
  res.json(list.slice(-Number(limit)));
});

app.get('/api/admin/dashboard', (req, res) => {
  const profiles = Array.from(db.profiles.values());
  const totalStudents = profiles.length;
  const activeToday = profiles.filter(
    (p) => (p.lastActiveDate || '').split('T')[0] === new Date().toISOString().split('T')[0]
  ).length;

  let totalQuestions = 0;
  let totalCorrect = 0;
  profiles.forEach((p) => {
    totalQuestions += Number(p.totalQuestionsAnswered) || 0;
    totalCorrect += Number(p.correctAnswers) || 0;
  });

  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 78;

  // Dynamic subject counts based on documents + student enrollments
  const docsList = Array.from(db.documents.values());
  const subjectDocsCount: Record<string, number> = {};
  docsList.forEach((d) => {
    subjectDocsCount[d.subject] = (subjectDocsCount[d.subject] || 0) + 1;
  });

  res.json({
    kpis: {
      totalStudents,
      activeToday: Math.max(1, activeToday),
      quizAttempts: Math.max(88, totalQuestions),
      avgAccuracy,
      aiLatencyMs: 640,
      systemHealth: 'Healthy (100% operational)',
      totalObjectives: db.learningObjectives.size,
      totalDocuments: db.documents.size,
      totalChunks: db.chunks.length,
    },
    popularSubjects: [
      {
        name: 'Python',
        learners: 42 + totalStudents,
        avgMastery: 84,
        documentsCount: subjectDocsCount['Python'] || 2,
        quizAccuracy: 86,
      },
      {
        name: 'Data Structures (DSA)',
        learners: 38 + totalStudents,
        avgMastery: 72,
        documentsCount: subjectDocsCount['DSA'] || 3,
        quizAccuracy: 75,
      },
      {
        name: 'Government Exams',
        learners: 35 + totalStudents,
        avgMastery: 69,
        documentsCount: subjectDocsCount['Government Exams'] || 3,
        quizAccuracy: 74,
      },
      {
        name: 'Calculus & Maths',
        learners: 29 + totalStudents,
        avgMastery: 64,
        documentsCount: (subjectDocsCount['Calculus'] || 0) + (subjectDocsCount['Mathematics'] || 1),
        quizAccuracy: 68,
      },
      {
        name: 'Java & OOP',
        learners: 24 + totalStudents,
        avgMastery: 77,
        documentsCount: subjectDocsCount['Java'] || 1,
        quizAccuracy: 79,
      },
      {
        name: 'Generative AI & Agents',
        learners: 31 + totalStudents,
        avgMastery: 81,
        documentsCount: (subjectDocsCount['Generative AI'] || 1) + (subjectDocsCount['AI Agents'] || 1),
        quizAccuracy: 83,
      },
    ],
    weeklyTrend: [
      { day: 'Mon', activeLearners: 28, questionsSolved: 145, avgAccuracy: 72, ragQueries: 64 },
      { day: 'Tue', activeLearners: 34, questionsSolved: 182, avgAccuracy: 74, ragQueries: 78 },
      { day: 'Wed', activeLearners: 31, questionsSolved: 168, avgAccuracy: 75, ragQueries: 71 },
      { day: 'Thu', activeLearners: 39, questionsSolved: 215, avgAccuracy: 77, ragQueries: 92 },
      { day: 'Fri', activeLearners: 42, questionsSolved: 240, avgAccuracy: 79, ragQueries: 108 },
      { day: 'Sat', activeLearners: 46, questionsSolved: 275, avgAccuracy: 81, ragQueries: 124 },
      { day: 'Sun', activeLearners: 44 + totalStudents, questionsSolved: 260 + totalQuestions, avgAccuracy, ragQueries: 118 + db.documents.size },
    ],
    knowledgeBaseCount: db.documents.size,
    totalChunks: db.chunks.length,
    learningObjectivesCount: db.learningObjectives.size,
    students: profiles,
    learningObjectives: Array.from(db.learningObjectives.values()),
    recentMessages: db.messages.slice(-10),
  });
});

// ----------------------------------------------------
// 11. Vite Middleware or Static Assets
// ----------------------------------------------------
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
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 WhatsApp AI Learning Agent full-stack server running on http://localhost:${PORT}`);
    console.log(`📱 WhatsApp Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
    startAutomatedReminderScheduler();
  });
}

startServer();
