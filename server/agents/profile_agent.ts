import { db } from '../database/db.ts';
import { StudentProfile } from '../../src/types/index.ts';

export class ProfileAgent {
  handleGetProfile(profile: StudentProfile): { responseText: string; updatedProfile: StudentProfile } {
    const langLabels: Record<string, string> = {
      en: 'English (EN)',
      hi: 'Hindi / Hinglish (HI)',
      kn: 'Kannada / ಕನ್ನಡ (KN)',
    };
    const subjectsList =
      Array.isArray(profile.subjects) && profile.subjects.length > 0
        ? profile.subjects.join(', ')
        : 'Python, DSA, Calculus';
    const weakList =
      Array.isArray(profile.weakTopics) && profile.weakTopics.length > 0
        ? profile.weakTopics.join(', ')
        : 'None flagged yet';
    const strongList =
      Array.isArray(profile.strongTopics) && profile.strongTopics.length > 0
        ? profile.strongTopics.join(', ')
        : 'Building foundations';
    const goalsList =
      Array.isArray(profile.learningGoals) && profile.learningGoals.length > 0
        ? profile.learningGoals.join(', ')
        : 'Master core concepts & ace upcoming exams';

    const accuracy =
      profile.totalQuestionsAnswered > 0
        ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
        : 0;

    const responseText =
      `👤 *STUDENT PROFILE — ${profile.name.toUpperCase()}*\n\n` +
      `📱 *WhatsApp:* ${profile.whatsappNumber || '+919876543210'}\n` +
      `🎓 *Education Level:* ${(profile.educationLevel || 'college').toUpperCase()}\n` +
      `⚡ *Skill Level:* ${(profile.currentSkillLevel || 'intermediate').toUpperCase()}\n` +
      `🌐 *Preferred Language:* ${langLabels[profile.preferredLanguage] || 'English (EN)'}\n` +
      `⏱️ *Daily Study Goal:* ${profile.studyHoursPerDay || 2} hrs/day (${Number(profile.dailyStudyMinutesCompleted || 0)} mins done today)\n` +
      `📚 *Active Subjects:* ${subjectsList}\n` +
      `🎯 *Learning Goals:* ${goalsList}\n` +
      `💪 *Strong Topics:* ${strongList}\n` +
      `🔍 *Focus Areas:* ${weakList}\n\n` +
      `📊 *Quick Stats:* 🔥 ${profile.streak || 1}-Day Streak • 🎯 ${accuracy}% Quiz Accuracy • 📈 ${profile.overallProgress || 70}% Mastery\n\n` +
      `⚙️ *Quick Profile Commands:*\n` +
      `• _"Set language to Kannada"_ (or Hindi / English)\n` +
      `• _"Set study hours to 3 hours"_\n` +
      `• _"Set skill level to advanced"_\n` +
      `• _"Add subject Machine Learning"_`;

    return { responseText, updatedProfile: profile };
  }

  handleUpdateProfile(
    text: string,
    profile: StudentProfile
  ): { responseText: string; updatedProfile: StudentProfile } {
    const cleanLower = (text || '').toLowerCase();
    const updates: Partial<StudentProfile> = {};
    const changesApplied: string[] = [];

    // 1. Language preference detection
    if (cleanLower.includes('kannada') || cleanLower.includes('ಕನ್ನಡ') || /\bkn\b/.test(cleanLower)) {
      updates.preferredLanguage = 'kn';
      changesApplied.push('Language → *Kannada (ಕನ್ನಡ)*');
    } else if (cleanLower.includes('hindi') || cleanLower.includes('हिंदी') || /\bhi\b/.test(cleanLower)) {
      updates.preferredLanguage = 'hi';
      changesApplied.push('Language → *Hindi (हिंदी)*');
    } else if (cleanLower.includes('english') || /\ben\b/.test(cleanLower)) {
      updates.preferredLanguage = 'en';
      changesApplied.push('Language → *English*');
    }

    // 2. Daily study hours detection
    const hoursMatch = text.match(/(\d+(\.\d+)?)\s*(hours|hour|hrs|hr|h\b)/i);
    if (hoursMatch) {
      const parsedHours = Math.min(12, Math.max(0.5, parseFloat(hoursMatch[1])));
      updates.studyHoursPerDay = parsedHours;
      changesApplied.push(`Daily Study Goal → *${parsedHours} hrs/day*`);
    }

    // 3. Skill level detection
    if (cleanLower.includes('beginner')) {
      updates.currentSkillLevel = 'beginner';
      changesApplied.push('Skill Level → *BEGINNER*');
    } else if (cleanLower.includes('intermediate')) {
      updates.currentSkillLevel = 'intermediate';
      changesApplied.push('Skill Level → *INTERMEDIATE*');
    } else if (cleanLower.includes('advanced')) {
      updates.currentSkillLevel = 'advanced';
      changesApplied.push('Skill Level → *ADVANCED*');
    }

    // 4. Education level detection
    if (cleanLower.includes('school')) {
      updates.educationLevel = 'school';
      changesApplied.push('Education Level → *SCHOOL*');
    } else if (cleanLower.includes('competitive')) {
      updates.educationLevel = 'competitive';
      changesApplied.push('Education Level → *COMPETITIVE EXAMS*');
    } else if (cleanLower.includes('engineering')) {
      updates.educationLevel = 'engineering';
      changesApplied.push('Education Level → *ENGINEERING*');
    } else if (cleanLower.includes('college')) {
      updates.educationLevel = 'college';
      changesApplied.push('Education Level → *COLLEGE*');
    }

    // 5. Add subject detection
    const addSubjMatch = text.match(/(?:add subject|learn subject|include subject|study subject)\s+([a-zA-Z0-9\s+#.-]+)/i);
    if (addSubjMatch && addSubjMatch[1]) {
      const newSubj = addSubjMatch[1].trim();
      const existingSubjects = Array.isArray(profile.subjects) ? [...profile.subjects] : [];
      if (newSubj && !existingSubjects.some((s) => s.toLowerCase() === newSubj.toLowerCase())) {
        existingSubjects.push(newSubj);
        updates.subjects = existingSubjects;
        changesApplied.push(`Added Subject → *${newSubj}*`);
      }
    }

    // 6. Name update detection
    const nameMatch = text.match(/(?:set my name to|change name to|my name is)\s+([a-zA-Z\s]{2,30})/i);
    if (nameMatch && nameMatch[1]) {
      const newName = nameMatch[1].trim();
      updates.name = newName;
      changesApplied.push(`Name → *${newName}*`);
    }

    // If user just typed "/profile" or "update profile" without specific parameters, show profile overview + instructions
    if (changesApplied.length === 0) {
      return this.handleGetProfile(profile);
    }

    const updatedProfile = db.updateProfile(profile.userId, updates) || {
      ...profile,
      ...updates,
    };

    const responseText =
      `✅ *Profile Updated Successfully!* 🎯\n\n` +
      `*Changes Saved:*\n` +
      changesApplied.map((c) => `• ${c}`).join('\n') +
      `\n\n📋 *Current Active Settings:*\n` +
      `• *Name:* ${updatedProfile.name}\n` +
      `• *Language:* ${updatedProfile.preferredLanguage.toUpperCase()}\n` +
      `• *Daily Study Target:* ${updatedProfile.studyHoursPerDay} hrs/day\n` +
      `• *Skill Level:* ${updatedProfile.currentSkillLevel.toUpperCase()}\n` +
      `• *Subjects:* ${(updatedProfile.subjects || []).join(', ')}\n\n` +
      `_Reply with */profile* anytime to view your full profile, or ask a question to continue learning!_`;

    return { responseText, updatedProfile };
  }
}

export const profileAgent = new ProfileAgent();
