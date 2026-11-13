import React, { useState } from 'react';
import { 
  FileUser, 
  Wand2, 
  Download, 
  Plus, 
  Trash2, 
  ChevronRight, 
  MapPin, 
  Mail, 
  Phone, 
  Linkedin, 
  Globe, 
  Briefcase, 
  GraduationCap, 
  Settings, 
  Sparkles,
  Layout,
  Type,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { jsPDF } from 'jspdf';

interface ResumeContent {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary: string;
  experience: {
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    highlights: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    graduationDate: string;
  }[];
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  projects: {
    name: string;
    description: string;
    link?: string;
  }[];
  certifications: string[];
}

interface AIResumeGeneratorProps {
  profile: StudentProfile;
  onProfileUpdate?: (updated: StudentProfile) => void;
}

export const AIResumeGenerator: React.FC<AIResumeGeneratorProps> = ({ profile }) => {
  const [resumeData, setResumeData] = useState<ResumeContent>({
    personalInfo: {
      fullName: profile.name || '',
      title: 'Full Stack Developer',
      email: '',
      phone: profile.whatsappNumber || '',
      location: 'India',
      linkedin: '',
      portfolio: ''
    },
    summary: 'A highly motivated and results-oriented professional with a strong foundation in software development and a passion for learning new technologies.',
    experience: [
      {
        company: 'Example Corp',
        position: 'Software Engineer Intern',
        location: 'Remote',
        startDate: 'June 2024',
        endDate: 'Present',
        highlights: [
          'Developed and optimized core features for the main web application using React and Node.js.',
          'Collaborated with the design team to implement responsive and user-friendly interfaces.'
        ]
      }
    ],
    education: [
      {
        institution: 'Indian Institute of Technology',
        degree: 'Bachelor of Technology',
        field: 'Computer Science',
        graduationDate: 'May 2025'
      }
    ],
    skills: {
      technical: ['React', 'Node.js', 'TypeScript', 'Tailwind CSS', 'Python'],
      soft: ['Communication', 'Teamwork', 'Problem Solving'],
      languages: ['English', 'Hindi']
    },
    projects: [
      {
        name: 'Personal Portfolio',
        description: 'A responsive personal portfolio website showcasing projects and skills.',
        link: 'https://portfolio.example.com'
      }
    ],
    certifications: ['AWS Certified Cloud Practitioner']
  });

  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [template, setTemplate] = useState<'modern' | 'classic' | 'minimal'>('modern');

  const normalizeResumeData = (raw: any, fallback: ResumeContent): ResumeContent => {
    const p = raw?.personalInfo || {};
    return {
      personalInfo: {
        fullName: String(p.fullName ?? fallback.personalInfo.fullName ?? ''),
        title: String(p.title ?? fallback.personalInfo.title ?? ''),
        email: String(p.email ?? fallback.personalInfo.email ?? ''),
        phone: String(p.phone ?? fallback.personalInfo.phone ?? ''),
        location: String(p.location ?? fallback.personalInfo.location ?? ''),
        linkedin: String(p.linkedin ?? fallback.personalInfo.linkedin ?? ''),
        portfolio: String(p.portfolio ?? fallback.personalInfo.portfolio ?? ''),
      },
      summary: String(raw?.summary ?? fallback.summary ?? ''),
      experience: Array.isArray(raw?.experience)
        ? raw.experience.map((e: any) => ({
            company: String(e?.company ?? ''),
            position: String(e?.position ?? ''),
            location: String(e?.location ?? ''),
            startDate: String(e?.startDate ?? ''),
            endDate: String(e?.endDate ?? ''),
            highlights: Array.isArray(e?.highlights) ? e.highlights.map((h: any) => String(h ?? '')) : [],
          }))
        : fallback.experience,
      education: Array.isArray(raw?.education)
        ? raw.education.map((ed: any) => ({
            institution: String(ed?.institution ?? ''),
            degree: String(ed?.degree ?? ''),
            field: String(ed?.field ?? ''),
            graduationDate: String(ed?.graduationDate ?? ''),
          }))
        : fallback.education,
      skills: {
        technical: Array.isArray(raw?.skills?.technical)
          ? raw.skills.technical.map((s: any) => String(s ?? ''))
          : fallback.skills.technical,
        soft: Array.isArray(raw?.skills?.soft)
          ? raw.skills.soft.map((s: any) => String(s ?? ''))
          : fallback.skills.soft,
        languages: Array.isArray(raw?.skills?.languages)
          ? raw.skills.languages.map((s: any) => String(s ?? ''))
          : fallback.skills.languages,
      },
      projects: Array.isArray(raw?.projects)
        ? raw.projects.map((pr: any) => ({
            name: String(pr?.name ?? ''),
            description: String(pr?.description ?? ''),
            link: String(pr?.link ?? ''),
          }))
        : fallback.projects,
      certifications: Array.isArray(raw?.certifications)
        ? raw.certifications.map((c: any) => String(c ?? ''))
        : fallback.certifications,
    };
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          userData: resumeData,
          jobDescription,
          template
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.content) {
        throw new Error(data.error || `Resume generator returned HTTP ${response.status}`);
      }
      setResumeData((prev) => normalizeResumeData(data.content, prev));
      setActiveTab('preview');
    } catch (err: any) {
      console.error('Failed to generate resume:', err);
      setErrorMessage(err?.message || 'Could not optimize resume right now. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const { personalInfo, summary, experience, education, skills, projects, certifications } = resumeData;

    let y = 20;
    const margin = 20;
    const width = 170;
    const ensureSpace = (needed = 12) => {
      if (y + needed > 280) {
        doc.addPage();
        y = 20;
      }
    };

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(personalInfo.fullName, margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(personalInfo.title, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}`, margin, y);
    y += 15;

    // Summary
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PROFESSIONAL SUMMARY', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(summary || '', width);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 8;

    // Experience
    if (experience.length > 0) {
      ensureSpace(16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('EXPERIENCE', margin, y);
      y += 7;
      experience.forEach(exp => {
        ensureSpace(18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`${exp.position || 'Role'} | ${exp.company || ''}`, margin, y);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text(`${exp.startDate || ''} - ${exp.endDate || ''}${exp.location ? ` | ${exp.location}` : ''}`, margin, y + 4.5);
        y += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        (exp.highlights || []).forEach(h => {
          const lines = doc.splitTextToSize(`• ${h}`, width - 5);
          ensureSpace(lines.length * 5 + 2);
          doc.text(lines, margin + 5, y);
          y += lines.length * 5;
        });
        y += 4;
      });
    }

    // Education
    if (education.length > 0) {
      ensureSpace(16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('EDUCATION', margin, y);
      y += 7;
      education.forEach(edu => {
        ensureSpace(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${edu.degree || ''}${edu.field ? ` in ${edu.field}` : ''}`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${edu.institution || ''}${edu.graduationDate ? ` (${edu.graduationDate})` : ''}`, margin, y + 5);
        y += 11;
      });
    }

    // Projects
    if (projects && projects.length > 0) {
      ensureSpace(16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PROJECTS', margin, y);
      y += 7;
      projects.forEach(pr => {
        ensureSpace(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${pr.name || 'Project'}${pr.link ? ` (${pr.link})` : ''}`, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(pr.description || '', width);
        ensureSpace(descLines.length * 5 + 2);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 3;
      });
    }

    // Skills
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SKILLS', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const techLines = doc.splitTextToSize(`Technical: ${(skills.technical || []).join(', ')}`, width);
    doc.text(techLines, margin, y);
    y += techLines.length * 5 + 2;
    const softLines = doc.splitTextToSize(`Soft: ${(skills.soft || []).join(', ')}`, width);
    ensureSpace(softLines.length * 5 + 4);
    doc.text(softLines, margin, y);
    y += softLines.length * 5 + 6;

    // Certifications
    if (certifications && certifications.length > 0) {
      ensureSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('CERTIFICATIONS', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const certLines = doc.splitTextToSize(certifications.join(' • '), width);
      ensureSpace(certLines.length * 5 + 4);
      doc.text(certLines, margin, y);
    }

    const safeFileName = (personalInfo.fullName || 'Resume').trim().replace(/\s+/g, '_');
    doc.save(`${safeFileName}_Resume.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <FileUser className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Resume Builder</h1>
          </div>
          <p className="text-slate-400 max-w-2xl">
            Generate high-impact, professional resumes tailored to your dream job using AI. 
            Fill in your details or let our AI optimize them for you.
          </p>
        </div>

        <div className="flex items-center gap-3 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeStep === 'edit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Edit Info
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeStep === 'preview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layout className="w-4 h-4" />
            Live Preview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form / Tools */}
        <div className="lg:col-span-7 space-y-6">
          {activeStep === 'edit' ? (
            <>
              {/* AI Power Up Card */}
              <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <h2 className="text-lg font-bold text-white">Tailor with AI</h2>
                  </div>
                  <p className="text-sm text-slate-300">
                    Paste the job description you're applying for, and our AI will optimize your summary and bullet points to match the requirements.
                  </p>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste job description here..."
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                  {errorMessage && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-600/20"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing & Optimizing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        AI Optimize Resume
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Manual Edit Sections */}
              <div className="space-y-6">
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Full Name</label>
                      <input
                        value={resumeData.personalInfo.fullName}
                        onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, fullName: e.target.value}})}
                        placeholder="Full Name"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Title</label>
                      <input
                        value={resumeData.personalInfo.title}
                        onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, title: e.target.value}})}
                        placeholder="Professional Title"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label>
                      <input
                        value={resumeData.personalInfo.email}
                        onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, email: e.target.value}})}
                        placeholder="Email Address"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone</label>
                      <input
                        value={resumeData.personalInfo.phone}
                        onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, phone: e.target.value}})}
                        placeholder="Phone Number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Location</label>
                      <input
                        value={resumeData.personalInfo.location}
                        onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, location: e.target.value}})}
                        placeholder="Location (e.g. Bangalore, India)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">LinkedIn</label>
                      <input
                        value={resumeData.personalInfo.linkedin || ''}
                        onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, linkedin: e.target.value}})}
                        placeholder="LinkedIn Profile URL"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Work Experience
                    </h3>
                    <button 
                      onClick={() => setResumeData({
                        ...resumeData, 
                        experience: [...resumeData.experience, { company: '', position: '', location: '', startDate: '', endDate: '', highlights: [''] }]
                      })}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Role
                    </button>
                  </div>
                  {resumeData.experience.map((exp, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 relative group">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input 
                          value={exp.company} 
                          onChange={(e) => {
                            const newExp = [...resumeData.experience];
                            newExp[idx].company = e.target.value;
                            setResumeData({...resumeData, experience: newExp});
                          }}
                          placeholder="Company Name"
                          className="bg-transparent border-b border-slate-800 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <input 
                          value={exp.position} 
                          onChange={(e) => {
                            const newExp = [...resumeData.experience];
                            newExp[idx].position = e.target.value;
                            setResumeData({...resumeData, experience: newExp});
                          }}
                          placeholder="Position / Title"
                          className="bg-transparent border-b border-slate-800 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <input 
                          value={exp.startDate} 
                          onChange={(e) => {
                            const newExp = [...resumeData.experience];
                            newExp[idx].startDate = e.target.value;
                            setResumeData({...resumeData, experience: newExp});
                          }}
                          placeholder="Start Date"
                          className="bg-transparent border-b border-slate-800 py-1 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <input 
                          value={exp.endDate} 
                          onChange={(e) => {
                            const newExp = [...resumeData.experience];
                            newExp[idx].endDate = e.target.value;
                            setResumeData({...resumeData, experience: newExp});
                          }}
                          placeholder="End Date (or Present)"
                          className="bg-transparent border-b border-slate-800 py-1 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 w-full"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Highlights / Achievements</label>
                          <button 
                            onClick={() => {
                              const newExp = [...resumeData.experience];
                              newExp[idx].highlights.push('');
                              setResumeData({...resumeData, experience: newExp});
                            }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300"
                          >
                            + Add Point
                          </button>
                        </div>
                        {exp.highlights.map((h, hIdx) => (
                          <div key={hIdx} className="flex gap-2">
                            <input
                              value={h}
                              onChange={(e) => {
                                const newExp = [...resumeData.experience];
                                newExp[idx].highlights[hIdx] = e.target.value;
                                setResumeData({...resumeData, experience: newExp});
                              }}
                              placeholder="Describe an achievement..."
                              className="flex-1 bg-transparent border-b border-slate-900 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                            />
                            <button 
                              onClick={() => {
                                const newExp = [...resumeData.experience];
                                newExp[idx].highlights.splice(hIdx, 1);
                                setResumeData({...resumeData, experience: newExp});
                              }}
                              className="text-slate-700 hover:text-rose-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => {
                          const newExp = [...resumeData.experience];
                          newExp.splice(idx, 1);
                          setResumeData({...resumeData, experience: newExp});
                        }}
                        className="absolute -top-2 -right-2 bg-slate-900 border border-slate-800 p-1.5 rounded-full text-slate-600 hover:text-rose-500 shadow-lg opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Education
                    </h3>
                    <button 
                      onClick={() => setResumeData({
                        ...resumeData, 
                        education: [...resumeData.education, { institution: '', degree: '', field: '', graduationDate: '' }]
                      })}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Education
                    </button>
                  </div>
                  {resumeData.education.map((edu, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 relative group">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input 
                          value={edu.institution} 
                          onChange={(e) => {
                            const newEdu = [...resumeData.education];
                            newEdu[idx].institution = e.target.value;
                            setResumeData({...resumeData, education: newEdu});
                          }}
                          placeholder="Institution Name"
                          className="bg-transparent border-b border-slate-800 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <input 
                          value={edu.degree} 
                          onChange={(e) => {
                            const newEdu = [...resumeData.education];
                            newEdu[idx].degree = e.target.value;
                            setResumeData({...resumeData, education: newEdu});
                          }}
                          placeholder="Degree (e.g. B.Tech)"
                          className="bg-transparent border-b border-slate-800 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <input 
                          value={edu.field} 
                          onChange={(e) => {
                            const newEdu = [...resumeData.education];
                            newEdu[idx].field = e.target.value;
                            setResumeData({...resumeData, education: newEdu});
                          }}
                          placeholder="Field of Study"
                          className="bg-transparent border-b border-slate-800 py-1 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <input 
                          value={edu.graduationDate} 
                          onChange={(e) => {
                            const newEdu = [...resumeData.education];
                            newEdu[idx].graduationDate = e.target.value;
                            setResumeData({...resumeData, education: newEdu});
                          }}
                          placeholder="Graduation Date"
                          className="bg-transparent border-b border-slate-800 py-1 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 w-full"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newEdu = [...resumeData.education];
                          newEdu.splice(idx, 1);
                          setResumeData({...resumeData, education: newEdu});
                        }}
                        className="absolute -top-2 -right-2 bg-slate-900 border border-slate-800 p-1.5 rounded-full text-slate-600 hover:text-rose-500 shadow-lg opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Skills
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Technical Skills</label>
                      <input 
                        value={resumeData.skills.technical.join(', ')} 
                        onChange={(e) => setResumeData({
                          ...resumeData, 
                          skills: { ...resumeData.skills, technical: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                        })}
                        placeholder="React, Node.js, Python, SQL (comma separated)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Soft Skills</label>
                      <input 
                        value={resumeData.skills.soft.join(', ')} 
                        onChange={(e) => setResumeData({
                          ...resumeData, 
                          skills: { ...resumeData.skills, soft: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                        })}
                        placeholder="Communication, Leadership, Problem Solving (comma separated)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </section>
              </div>
            
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Choose Template</h3>
                <div className="flex gap-2">
                  {['modern', 'classic', 'minimal'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTemplate(t as any)}
                      className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition ${
                        template === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <p className="text-xs text-slate-300">
                    Resume optimized for ATS (Applicant Tracking Systems) and professional readability.
                  </p>
                </div>
                
                <button
                  onClick={downloadPDF}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-24">
            <div className="bg-white text-slate-950 w-full aspect-[1/1.414] shadow-2xl rounded-sm overflow-hidden flex flex-col p-8 origin-top transition-transform duration-500 scale-[0.98] hover:scale-100">
              {/* Preview Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <h1 className="text-2xl font-bold uppercase tracking-tight">{resumeData.personalInfo.fullName}</h1>
                <p className="text-indigo-600 font-bold mb-2">{resumeData.personalInfo.title}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-600 font-medium">
                  <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {resumeData.personalInfo.email || 'email@example.com'}</span>
                  <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {resumeData.personalInfo.phone}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {resumeData.personalInfo.location}</span>
                  {resumeData.personalInfo.linkedin && <span className="flex items-center gap-1"><Linkedin className="w-2.5 h-2.5" /> LinkedIn</span>}
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-none">
                <section>
                  <h4 className="text-[10px] font-black text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase tracking-widest">Summary</h4>
                  <p className="text-[9px] leading-relaxed text-slate-700">{resumeData.summary}</p>
                </section>

                <section>
                  <h4 className="text-[10px] font-black text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase tracking-widest">Experience</h4>
                  <div className="space-y-3">
                    {resumeData.experience.map((exp, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline">
                          <h5 className="text-[10px] font-bold text-slate-900">{exp.position}</h5>
                          <span className="text-[8px] font-bold text-slate-500">{exp.startDate} - {exp.endDate}</span>
                        </div>
                        <p className="text-[9px] font-bold text-indigo-600">{exp.company} · {exp.location}</p>
                        <ul className="mt-1 space-y-0.5">
                          {exp.highlights.map((h, j) => (
                            <li key={j} className="text-[8px] text-slate-700 flex gap-2">
                              <span className="text-indigo-600">•</span>
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase tracking-widest">Education</h4>
                  <div className="space-y-2">
                    {resumeData.education.map((edu, i) => (
                      <div key={i} className="flex justify-between items-baseline">
                        <div>
                          <h5 className="text-[9px] font-bold text-slate-900">{edu.degree} in {edu.field}</h5>
                          <p className="text-[8px] text-slate-600">{edu.institution}</p>
                        </div>
                        <span className="text-[8px] font-bold text-slate-500">{edu.graduationDate}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black text-slate-900 border-b border-slate-200 pb-1 mb-2 uppercase tracking-widest">Skills</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Technical</p>
                      <div className="flex flex-wrap gap-1">
                        {resumeData.skills.technical.map((s, i) => (
                          <span key={i} className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Soft Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {resumeData.skills.soft.map((s, i) => (
                          <span key={i} className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
