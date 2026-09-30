import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Users,
  Target,
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  Database,
  ArrowRight,
} from 'lucide-react';
import { db, doc, setDoc } from '../firebase.ts';

type ImportType = 'students' | 'objectives';

const SAMPLE_STUDENTS_CSV = `name,email,whatsappNumber,educationLevel,preferredLanguage,subjects,studyHoursPerDay
Ananya Sen,ananya.sen@example.com,+919876543220,college,en,Python;DSA;Machine Learning,2.5
Vikram Rao,vikram.rao@example.com,+919876543221,school,hi,Mathematics;Calculus;Physics,2.0
Divya Patil,divya.patil@example.com,+919876543222,college,kn,Python;Database Systems;Algorithms,3.0
Arjun Nair,arjun.nair@example.com,+919876543223,competitive_exam,en,Calculus;Linear Algebra;DSA,3.5`;

const SAMPLE_OBJECTIVES_CSV = `subject,topic,title,description,targetLevel,bloomLevel
Python,Recursion,Master Recursive Functions,Understand base cases and stack frames in Python,intermediate,apply
Calculus,Integration,Integration by Parts,Apply integration by parts formula to products of algebraic and transcendental functions,advanced,apply
DSA,Binary Search,Binary Search Implementation,Implement O(log n) search on sorted arrays with boundary conditions,beginner,understand
Machine Learning,Gradient Descent,Understand Optimization,Derive cost function gradient update rules,advanced,analyze`;

export const AdminBulkCsvImporter: React.FC = () => {
  const [importType, setImportType] = useState<ImportType>('students');
  const [csvText, setCsvText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count: number;
    message: string;
    details?: string[];
  } | null>(null);

  // Parse CSV helper
  const parseCsv = (text: string, type: ImportType) => {
    const lines = text
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setParsedRows([]);
      setValidationErrors(['CSV must contain a header row and at least one data row.']);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const errors: string[] = [];
    const rows: any[] = [];

    if (type === 'students') {
      const required = ['name', 'email', 'whatsappnumber'];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        errors.push(`Missing required student headers: ${missing.join(', ')}`);
      }
    } else {
      const required = ['subject', 'topic', 'title'];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        errors.push(`Missing required objective headers: ${missing.join(', ')}`);
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // simple comma split (supports semicolons for lists)
      const values = line.split(',').map((v) => v.trim());
      const row: any = { _rowNumber: i + 1, _isValid: true };

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      if (type === 'students') {
        if (!row.name || !row.email) {
          row._isValid = false;
          errors.push(`Row ${i + 1}: Name and Email are required.`);
        }
        if (row.subjects) {
          row._subjectsList = row.subjects.split(';').map((s: string) => s.trim());
        } else {
          row._subjectsList = ['Python', 'DSA'];
        }
      } else {
        if (!row.subject || !row.title) {
          row._isValid = false;
          errors.push(`Row ${i + 1}: Subject and Title are required.`);
        }
      }

      rows.push(row);
    }

    setParsedRows(rows);
    setValidationErrors(errors);
  };

  const handleTextChange = (val: string) => {
    setCsvText(val);
    parseCsv(val, importType);
    setImportResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCsv(content, importType);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const loadSample = () => {
    const sample = importType === 'students' ? SAMPLE_STUDENTS_CSV : SAMPLE_OBJECTIVES_CSV;
    setCsvText(sample);
    parseCsv(sample, importType);
    setImportResult(null);
  };

  const clearForm = () => {
    setCsvText('');
    setParsedRows([]);
    setValidationErrors([]);
    setImportResult(null);
  };

  // Perform Firestore Bulk Write
  const handleBulkImportToFirestore = async () => {
    if (parsedRows.length === 0 || validationErrors.length > 0) return;

    setIsImporting(true);
    setImportResult(null);

    const importedIds: string[] = [];

    try {
      if (importType === 'students') {
        for (const row of parsedRows) {
          const userId = `usr_imp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          const profileId = `prof_imp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

          const userData = {
            id: userId,
            name: row.name,
            email: row.email,
            phone: row.whatsappnumber || '+10000000000',
            role: 'student',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const profileData = {
            id: profileId,
            userId: userId,
            name: row.name,
            whatsappNumber: row.whatsappnumber || '+10000000000',
            preferredLanguage: ['en', 'hi', 'kn'].includes(row.preferredlanguage)
              ? row.preferredlanguage
              : 'en',
            educationLevel: row.educationlevel || 'college',
            subjects: row._subjectsList || ['Python', 'DSA'],
            currentSkillLevel: 'beginner',
            learningGoals: ['Master fundamental principles and ace examinations'],
            weakTopics: [],
            strongTopics: row._subjectsList || ['Python'],
            studyHoursPerDay: Number(row.studyhoursperday) || 2,
            preferredStudyTime: '7:00 PM',
            dailyReminderEnabled: true,
            examDates: [],
            learningHistory: [],
            streak: 1,
            lastActiveDate: new Date().toISOString(),
            overallProgress: 15,
            totalSessions: 1,
            totalQuestionsAnswered: 0,
            correctAnswers: 0,
            dailyQuestionsGoal: 10,
          };

          // Direct write to Firestore
          if (db) {
            await setDoc(doc(db, 'users', userId), userData);
            await setDoc(doc(db, 'profiles', userId), profileData);
          }

          importedIds.push(row.name);
        }

        // Also notify backend API to keep server in-memory list synchronized
        await fetch('/api/admin/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'students',
            items: parsedRows,
          }),
        });

        setImportResult({
          success: true,
          count: parsedRows.length,
          message: `Successfully imported ${parsedRows.length} student profiles directly into Firestore!`,
          details: importedIds,
        });
      } else {
        // Import Learning Objectives
        for (const row of parsedRows) {
          const objId = `obj_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          const objectiveData = {
            id: objId,
            subject: row.subject,
            topic: row.topic,
            title: row.title,
            description: row.description || '',
            targetLevel: row.targetlevel || 'intermediate',
            bloomLevel: row.bloomlevel || 'understand',
            createdAt: new Date().toISOString(),
          };

          // Direct write to Firestore
          if (db) {
            await setDoc(doc(db, 'learning_objectives', objId), objectiveData);
          }

          importedIds.push(`${row.subject}: ${row.title}`);
        }

        await fetch('/api/admin/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'objectives',
            items: parsedRows,
          }),
        });

        setImportResult({
          success: true,
          count: parsedRows.length,
          message: `Successfully imported ${parsedRows.length} learning objectives directly into Firestore!`,
          details: importedIds,
        });
      }
    } catch (err: any) {
      console.error('Bulk import error:', err);
      setImportResult({
        success: false,
        count: 0,
        message: `Import failed: ${err.message || 'Unknown Firestore error'}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Header and Import Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Firestore Bulk Data Ingestion
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Direct Firestore Writes
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white mt-0.5 tracking-tight">
              CSV Bulk Importer
            </h3>
          </div>
        </div>

        {/* Dual Mode Switcher (Students vs Learning Objectives) */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setImportType('students');
              clearForm();
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              importType === 'students'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Profiles</span>
          </button>

          <button
            onClick={() => {
              setImportType('objectives');
              clearForm();
            }}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              importType === 'objectives'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Learning Objectives</span>
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex items-center space-x-2">
          {/* File Picker */}
          <label className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Upload .CSV File</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Load Sample Template */}
          <button
            onClick={loadSample}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Sample CSV</span>
          </button>
        </div>

        {csvText && (
          <button
            onClick={clearForm}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Clear CSV data"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CSV Raw Text Input Area */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
          <span>
            Paste or Edit CSV Contents ({importType === 'students' ? 'Students' : 'Objectives'})
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {parsedRows.length} rows parsed
          </span>
        </label>
        <textarea
          rows={5}
          value={csvText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`Paste ${importType} CSV data here...`}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 leading-relaxed"
        />
      </div>

      {/* Validation Warnings / Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-rose-400">
            <AlertCircle className="w-4 h-4" />
            <span>CSV Validation Issues Found:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {validationErrors.slice(0, 4).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pre-Import Preview Table */}
      {parsedRows.length > 0 && validationErrors.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Preview Data Ready for Firestore ({parsedRows.length} Records)</span>
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Valid Format
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  {importType === 'students' ? (
                    <>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Level</th>
                      <th className="p-3">Subjects</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Topic</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Target Level</th>
                      <th className="p-3">Bloom Taxonomy</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {parsedRows.slice(0, 6).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                    {importType === 'students' ? (
                      <>
                        <td className="p-3 font-semibold text-white">{row.name}</td>
                        <td className="p-3 text-slate-400">{row.email}</td>
                        <td className="p-3 font-mono text-[11px] text-emerald-400">
                          {row.whatsappnumber}
                        </td>
                        <td className="p-3">{row.educationlevel}</td>
                        <td className="p-3">
                          <span className="text-indigo-300 font-mono text-[11px]">
                            {row.subjects}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-semibold text-white">{row.subject}</td>
                        <td className="p-3 text-amber-400 font-mono">{row.topic}</td>
                        <td className="p-3 text-slate-200">{row.title}</td>
                        <td className="p-3">{row.targetlevel}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                            {row.bloomlevel}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Result Toast */}
      {importResult && (
        <div
          className={`p-4 rounded-2xl border text-xs ${
            importResult.success
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-sm">
            {importResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            )}
            <span>{importResult.message}</span>
          </div>

          {importResult.details && importResult.details.length > 0 && (
            <div className="mt-2 text-[11px] text-slate-300">
              <span className="font-semibold text-white">Imported Items: </span>
              {importResult.details.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Main Commit Button */}
      <div className="pt-2">
        <button
          onClick={handleBulkImportToFirestore}
          disabled={parsedRows.length === 0 || validationErrors.length > 0 || isImporting}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/20 transition cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
        >
          {isImporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Importing Directly to Firestore Database...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              <span>
                Commit & Import {parsedRows.length} {importType === 'students' ? 'Students' : 'Objectives'} to Firestore
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
