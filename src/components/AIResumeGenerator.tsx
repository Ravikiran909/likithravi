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
  const [activeStep, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [template, setTemplate] = useState<'modern' | 'classic' | 'minimal'>('modern');

  const handleGenerateAI = async () => {
    setIsGenerating(true);
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
      const data = await response.json();
      if (data.success && data.content) {
        setResumeData(data.content);
        setActiveTab('preview');
      }
    } catch (err) {
      console.error('Failed to generate resume:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const { personalInfo, summary, experience, education, skills, projects, certifications } = resumeData;

    // Helper for adding text and moving cursor
    let y = 20;
    const margin = 20;
    const width = 170;

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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PROFESSIONAL SUMMARY', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(summary, width);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;

    // Experience
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('EXPERIENCE', margin, y);
    y += 7;
    experience.forEach(exp => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${exp.position} | ${exp.company}`, margin, y);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text(`${exp.startDate} - ${exp.endDate} | ${exp.location}`, margin + 110, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      exp.highlights.forEach(h => {
        const lines = doc.splitTextToSize(`• ${h}`, width);
        doc.text(lines, margin + 5, y);
        y += lines.length * 5;
      });
      y += 5;
    });

    // Education
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('EDUCATION', margin, y);
    y += 7;
    education.forEach(edu => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${edu.degree} in ${edu.field}`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(edu.institution, margin, y + 5);
      doc.text(edu.graduationDate, margin + 140, y);
      y += 12;
    });

    // Skills
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SKILLS', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Technical: ${skills.technical.join(', ')}`, margin, y);
    y += 5;
    doc.text(`Soft: ${skills.soft.join(', ')}`, margin, y);
    y += 10;

    doc.save(`${personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
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
                    <input
                      value={resumeData.personalInfo.fullName}
                      onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, fullName: e.target.value}})}
                      placeholder="Full Name"
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      value={resumeData.personalInfo.title}
                      onChange={(e) => setResumeData({...resumeData, personalInfo: {...resumeData.personalInfo, title: e.target.value}})}
                      placeholder="Professional Title"
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Work Experience
                    </h3>
                    <button className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Role
                    </button>
                  </div>
                  {resumeData.experience.map((exp, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input 
                            value={exp.company} 
                            placeholder="Company"
                            className="bg-transparent border-b border-slate-800 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          <input 
                            value={exp.position} 
                            placeholder="Position"
                            className="bg-transparent border-b border-slate-800 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button className="text-slate-600 hover:text-rose-500 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
