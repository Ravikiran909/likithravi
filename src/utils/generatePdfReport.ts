import { jsPDF } from 'jspdf';
import { StudentProfile, StudyPlan, Recommendation } from '../types/index.ts';

export interface GeneratePdfOptions {
  fileName?: string;
  studyPlan?: StudyPlan | null;
  recommendations?: Recommendation[];
}

/**
 * Generates and downloads a comprehensive, professionally styled PDF summary
 * of the student's learning progress, streak, metrics, and milestones.
 */
export function generateStudentProgressPdf(
  profile: StudentProfile,
  options: GeneratePdfOptions = {}
): jsPDF {
  const {
    fileName = `${profile.name.replace(/\s+/g, '_')}_Learning_Progress_Report.pdf`,
    studyPlan = null,
    recommendations = [],
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let currentY = 0;

  // Helper to ensure spacing and add a new page if necessary
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentY = margin;
      drawPageHeaderMini();
    }
  };

  // Mini header for subsequent pages
  const drawPageHeaderMini = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 11, pageWidth, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`WHATSAPP AI LEARNING REPORT  •  ${profile.name.toUpperCase()}`, margin, 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Current Streak: ${profile.streak} Days | Mastery: ${profile.overallProgress}%`, pageWidth - margin, 7.5, { align: 'right' });

    currentY = 18;
  };

  // ==========================================
  // 1. PRIMARY COVER HEADER
  // ==========================================
  doc.setFillColor(15, 23, 42); // Deep slate
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Emerald accent top/bottom bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 36.5, pageWidth, 1.5, 'F');

  // App & Document Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('WHATSAPP AI LEARNING COMPANION  |  OFFICIAL PROGRESS SUMMARY', margin, 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Student Learning Progress & Performance Report', margin, 19);

  // Subtitle info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const generationDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  doc.text(`Student: ${profile.name}   •   Report Date: ${generationDate}   •   Phone: ${profile.whatsappNumber}`, margin, 27);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const levelLabels: Record<string, string> = {
    school: 'High School (K-12)',
    college: 'College / University',
    competitive_exam: 'Competitive Exam Aspirant',
    professional: 'Working Professional',
  };
  const eduStr = levelLabels[profile.educationLevel] || profile.educationLevel;
  doc.text(`Education Level: ${eduStr}   •   Language: ${profile.preferredLanguage.toUpperCase()}   •   Status: Active Learner`, margin, 32.5);

  currentY = 46;

  // ==========================================
  // 2. KEY METRICS CARDS (4 Highlight Boxes)
  // ==========================================
  const accuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 0;

  const cardWidth = (contentWidth - 9) / 4; // 4 cards with 3mm gaps
  const cardHeight = 24;

  const metrics = [
    {
      title: 'CURRENT STREAK',
      value: `${profile.streak} Days`,
      sub: profile.streak >= 7 ? '7-Day Milestone Active' : `Next goal: 7 Days`,
      fillR: 254, fillG: 243, fillB: 199, // amber-100
      borderR: 245, borderG: 158, borderB: 11, // amber-500
      textR: 180, textG: 83, textB: 9, // amber-700
    },
    {
      title: 'CURRICULUM MASTERY',
      value: `${profile.overallProgress}%`,
      sub: `${profile.subjects.length} Subjects Active`,
      fillR: 209, fillG: 250, fillB: 229, // emerald-100
      borderR: 16, borderG: 185, borderB: 129, // emerald-500
      textR: 4, textG: 120, textB: 87, // emerald-700
    },
    {
      title: 'QUESTIONS SOLVED',
      value: `${profile.totalQuestionsAnswered}`,
      sub: `${profile.correctAnswers} Correct Answers`,
      fillR: 224, fillG: 231, fillB: 255, // indigo-100
      borderR: 99, borderG: 102, borderB: 241, // indigo-500
      textR: 67, textG: 56, textB: 202, // indigo-700
    },
    {
      title: 'QUIZ ACCURACY',
      value: `${accuracy}%`,
      sub: `${profile.totalSessions} Study Sessions`,
      fillR: 243, fillG: 232, fillB: 255, // purple-100
      borderR: 168, borderG: 85, borderB: 247, // purple-500
      textR: 126, textG: 34, textB: 206, // purple-700
    },
  ];

  metrics.forEach((m, idx) => {
    const cardX = margin + idx * (cardWidth + 3);

    // Box background
    doc.setFillColor(m.fillR, m.fillG, m.fillB);
    doc.setDrawColor(m.borderR, m.borderG, m.borderB);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(m.textR, m.textG, m.textB);
    doc.text(m.title, cardX + 3.5, currentY + 5.5);

    // Primary Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(m.value, cardX + 3.5, currentY + 13.5);

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(m.sub, cardX + 3.5, currentY + 19.5);
  });

  currentY += cardHeight + 8;

  // ==========================================
  // 3. LEARNING MILESTONES & ACHIEVEMENTS SECTION
  // ==========================================
  checkPageBreak(50);

  // Section Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Learning Milestones & Achievements', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Official recognition badges unlocked through WhatsApp study sessions and quizzes', margin, currentY + 4);

  currentY += 7;

  // Milestone list items
  const milestoneList = [
    {
      name: '7-Day Streak',
      desc: 'Study consecutively for 7 days on WhatsApp without breaking the chain.',
      unlocked: profile.streak >= 7,
      progress: `${Math.min(profile.streak, 7)} / 7 Days`,
      status: profile.streak >= 7 ? 'UNLOCKED' : 'IN PROGRESS',
    },
    {
      name: '100 Questions Answered',
      desc: 'Solve 100 curriculum and quiz challenge questions.',
      unlocked: profile.totalQuestionsAnswered >= 100,
      progress: `${Math.min(profile.totalQuestionsAnswered, 100)} / 100 Solved`,
      status: profile.totalQuestionsAnswered >= 100 ? 'UNLOCKED' : 'IN PROGRESS',
    },
    {
      name: 'Math Master',
      desc: 'Achieve advanced proficiency in Calculus limits, derivatives, or algebra.',
      unlocked: profile.overallProgress >= 70 || profile.subjects.includes('Calculus'),
      progress: `${Math.min(profile.overallProgress, 70)}% / 70% Mastery`,
      status: (profile.overallProgress >= 70 || profile.subjects.includes('Calculus')) ? 'UNLOCKED' : 'IN PROGRESS',
    },
    {
      name: 'Consistent Scholar',
      desc: 'Complete at least 5 guided AI interactive learning sessions.',
      unlocked: profile.totalSessions >= 5,
      progress: `${Math.min(profile.totalSessions, 5)} / 5 Sessions`,
      status: profile.totalSessions >= 5 ? 'UNLOCKED' : 'IN PROGRESS',
    },
  ];

  milestoneList.forEach((ms) => {
    checkPageBreak(12);

    // Row container
    doc.setFillColor(ms.unlocked ? 240 : 248, ms.unlocked ? 253 : 250, ms.unlocked ? 244 : 252);
    doc.setDrawColor(ms.unlocked ? 16 : 226, ms.unlocked ? 185 : 232, ms.unlocked ? 129 : 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, 10.5, 1.5, 1.5, 'FD');

    // Badge Icon indicator
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    if (ms.unlocked) {
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text('★', margin + 3.5, currentY + 6.5);
    } else {
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('○', margin + 3.5, currentY + 6.5);
    }

    // Badge Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(ms.name, margin + 9, currentY + 4.8);

    // Badge Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(ms.desc, margin + 9, currentY + 8.6);

    // Progress text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(ms.progress, margin + contentWidth - 36, currentY + 6.5, { align: 'right' });

    // Status Pill
    const pillX = margin + contentWidth - 32;
    const pillW = 30;
    const pillH = 5.5;
    if (ms.unlocked) {
      doc.setFillColor(16, 185, 129); // emerald
      doc.roundedRect(pillX, currentY + 2.5, pillW, pillH, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text('UNLOCKED', pillX + pillW / 2, currentY + 6.2, { align: 'center' });
    } else {
      doc.setFillColor(226, 232, 240); // slate-200
      doc.roundedRect(pillX, currentY + 2.5, pillW, pillH, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text('IN PROGRESS', pillX + pillW / 2, currentY + 6.2, { align: 'center' });
    }

    currentY += 12;
  });

  currentY += 3;

  // ==========================================
  // 4. CURRICULUM PROFILE & LEARNING HISTORY
  // ==========================================
  checkPageBreak(50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Curriculum Mastery & Subject Overview', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Current subject enrollment, strengths, and areas identified for focus', margin, currentY + 4);

  currentY += 8;

  // 2-column container for subjects and strengths
  const colW = (contentWidth - 6) / 2;
  const colH = 34;

  // Left Column: Active Subjects & Study Commitment
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colW, colH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Enrolled Subjects & Study Routine', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Active Subjects: ${profile.subjects.join(', ')}`, margin + 4, currentY + 12);
  doc.text(`• Daily Study Commitment: ${profile.studyHoursPerDay} Hours / Day`, margin + 4, currentY + 17);
  doc.text(`• Preferred Study Time: ${profile.preferredStudyTime || 'Evening (7:00 PM)'}`, margin + 4, currentY + 22);
  doc.text(`• Last Active Session: ${profile.lastActiveDate || 'Today'}`, margin + 4, currentY + 27);

  // Right Column: Strengths & Weaknesses
  const rightX = margin + colW + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, currentY, colW, colH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Topic Mastery Breakdown', rightX + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const strongStr = profile.strongTopics.length > 0 ? profile.strongTopics.slice(0, 3).join(', ') : 'Calculus Limits, Python Loops';
  const weakStr = profile.weakTopics.length > 0 ? profile.weakTopics.slice(0, 3).join(', ') : 'Python Recursion, Differential Equations';

  doc.text(`• Strong Mastery: ${strongStr}`, rightX + 4, currentY + 12);
  doc.text(`• Priority Focus: ${weakStr}`, rightX + 4, currentY + 17);
  doc.text(`• Skill Tier: ${profile.currentSkillLevel.toUpperCase()}`, rightX + 4, currentY + 22);
  doc.text(`• Total Active Days: ${Math.max(profile.streak, profile.totalSessions)} Days Logged`, rightX + 4, currentY + 27);

  currentY += colH + 6;

  // ==========================================
  // 5. RECENT STUDY HISTORY TABLE
  // ==========================================
  if (profile.learningHistory && profile.learningHistory.length > 0) {
    checkPageBreak(38);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Recent Topic Practice History', margin, currentY);

    currentY += 4;

    // Table Header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text('TOPIC', margin + 3, currentY + 4.2);
    doc.text('SUBJECT', margin + 65, currentY + 4.2);
    doc.text('DATE LOGGED', margin + 115, currentY + 4.2);
    doc.text('STATUS', margin + contentWidth - 4, currentY + 4.2, { align: 'right' });

    currentY += 6;

    // Rows
    const recentHistory = profile.learningHistory.slice(0, 5);
    recentHistory.forEach((h, i) => {
      checkPageBreak(7);
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
      doc.rect(margin, currentY, contentWidth, 5.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(30, 41, 59);
      doc.text(h.topic.length > 38 ? h.topic.substring(0, 36) + '...' : h.topic, margin + 3, currentY + 3.8);
      doc.text(h.subject, margin + 65, currentY + 3.8);
      doc.text(h.date, margin + 115, currentY + 3.8);

      if (h.mastered) {
        doc.setTextColor(4, 120, 87);
        doc.setFont('helvetica', 'bold');
        doc.text('Mastered', margin + contentWidth - 4, currentY + 3.8, { align: 'right' });
      } else {
        doc.setTextColor(180, 83, 9);
        doc.setFont('helvetica', 'normal');
        doc.text('In Progress', margin + contentWidth - 4, currentY + 3.8, { align: 'right' });
      }

      currentY += 5.5;
    });

    currentY += 4;
  }

  // ==========================================
  // 6. STUDY ROADMAP & EXAM PREPARATION
  // ==========================================
  if (studyPlan) {
    checkPageBreak(38);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Active Exam Roadmap: ${studyPlan.subject}`, margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Target Exam: ${studyPlan.targetExam || 'Curriculum Finals'}  •  Target Date: ${studyPlan.examDate}  •  ${studyPlan.dailyHours} Hours/Day`, margin, currentY + 4);

    currentY += 7;

    // Study Plan Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 18, 1.5, 1.5, 'FD');

    const completedItems = studyPlan.items.filter((item) => item.isCompleted).length;
    const progressPercent = studyPlan.items.length > 0 ? Math.round((completedItems / studyPlan.items.length) * 100) : 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`Roadmap Completion: ${completedItems} of ${studyPlan.items.length} Days Completed (${progressPercent}%)`, margin + 4, currentY + 5.5);

    // Mini progress bar
    const barW = contentWidth - 8;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 4, currentY + 7.5, barW, 2.5, 1, 1, 'F');
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(margin + 4, currentY + 7.5, (barW * progressPercent) / 100, 2.5, 1, 1, 'F');

    // Next upcoming task
    const nextTask = studyPlan.items.find((item) => !item.isCompleted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    if (nextTask) {
      doc.text(`Next Milestone: Day ${nextTask.dayNumber} - ${nextTask.title} (${nextTask.durationMinutes} mins)`, margin + 4, currentY + 14.5);
    } else {
      doc.text('All scheduled roadmap tasks for this exam cycle are up to date!', margin + 4, currentY + 14.5);
    }

    currentY += 23;
  }

  // ==========================================
  // 7. AI LEARNING RECOMMENDATIONS
  // ==========================================
  if (recommendations && recommendations.length > 0) {
    checkPageBreak(28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Personalized AI Recommendations', margin, currentY);

    currentY += 5;

    recommendations.slice(0, 3).forEach((rec) => {
      checkPageBreak(9);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, contentWidth, 7.5, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${rec.title}`, margin + 3, currentY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      const reasonTrunc = rec.reason.length > 70 ? rec.reason.substring(0, 68) + '...' : rec.reason;
      doc.text(`- ${reasonTrunc}`, margin + 50, currentY + 4.8);

      const priColor = rec.priority === 'high' ? [225, 29, 72] : [16, 185, 129];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(priColor[0], priColor[1], priColor[2]);
      doc.text(rec.priority.toUpperCase(), margin + contentWidth - 4, currentY + 4.8, { align: 'right' });

      currentY += 9;
    });

    currentY += 2;
  }

  // ==========================================
  // 8. FOOTER WITH PAGE NUMBERS
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer line
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, pageHeight - 12, contentWidth, 0.4, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'WhatsApp AI Learning Companion  •  Real-time AI Tutor, Spaced Repetition & Exam Preparation',
      margin,
      pageHeight - 7.5
    );

    doc.setFont('helvetica', 'bold');
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7.5,
      { align: 'right' }
    );
  }

  // Trigger browser download if running in client environment
  if (typeof window !== 'undefined') {
    doc.save(fileName);
  }

  return doc;
}
