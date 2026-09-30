import React, { useState } from 'react';
import {
  Trophy,
  Award,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  X,
  FileQuestion,
  BookOpen,
  Info,
} from 'lucide-react';
import { calculateLearningRank, RANK_TIERS } from '../utils/learningRank.ts';
import { StudentProfile } from '../types/index.ts';

interface LearningRankCardProps {
  profile: StudentProfile;
  onNavigateToChat: (prefilledText?: string) => void;
}

export const LearningRankCard: React.FC<LearningRankCardProps> = ({
  profile,
  onNavigateToChat,
}) => {
  const [showTiersModal, setShowTiersModal] = useState(false);

  const rankDetails = calculateLearningRank(
    profile.totalQuestionsAnswered,
    profile.overallProgress
  );

  const { currentRank, nextRank, isMaxRank } = rankDetails;

  return (
    <>
      {/* Learning Rank Main Card */}
      <div
        className={`bg-gradient-to-r ${currentRank.bgGradient} border ${currentRank.borderColor} rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all`}
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Rank Badge & Identity */}
          <div className="flex items-start space-x-4">
            <div className="p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-lg flex-shrink-0 flex items-center justify-center text-3xl">
              <span>{currentRank.icon}</span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Learning Rank
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${currentRank.badgeColor}`}
                >
                  {currentRank.name} • Tier {currentRank.tier}
                </span>
                {currentRank.name === 'Scholar' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Upgraded from Novice!</span>
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-white mt-1 flex items-center space-x-2">
                <span>{currentRank.title}</span>
              </h3>

              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {currentRank.summary}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto justify-end">
            <button
              onClick={() => onNavigateToChat('/quiz')}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition active:scale-95"
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Answer Quiz (+Questions)</span>
            </button>

            <button
              onClick={() => setShowTiersModal(true)}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-700 transition"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rank Roadmap</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Dual Upgrade Progress Bar (Questions & Mastery) */}
        {!isMaxRank && nextRank ? (
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-200">
                  Upgrade Progress to <span className="text-amber-400 font-bold">{nextRank.name}</span>:
                </span>
                <span className="text-slate-400">
                  ({rankDetails.overallRankProgressPercent}% Overall)
                </span>
              </div>

              <div className="text-slate-400 text-[11px]">
                Need: <strong className="text-emerald-400">{rankDetails.questionsNeeded} more questions</strong> &{' '}
                <strong className="text-teal-400">{rankDetails.progressNeeded}% more mastery</strong>
              </div>
            </div>

            {/* Combined Dual Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Metric 1: Questions Answered */}
              <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                    <FileQuestion className="w-3.5 h-3.5 text-sky-400" />
                    <span>Total Questions Answered</span>
                  </span>
                  <span className="font-bold text-white">
                    {profile.totalQuestionsAnswered} / {nextRank.minQuestions}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (profile.totalQuestionsAnswered / nextRank.minQuestions) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Current: {profile.totalQuestionsAnswered}</span>
                  <span>{rankDetails.questionsNeeded === 0 ? 'Requirement Met! ✅' : `${rankDetails.questionsNeeded} left`}</span>
                </div>
              </div>

              {/* Metric 2: Curriculum Overall Progress */}
              <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Curriculum Mastery</span>
                  </span>
                  <span className="font-bold text-white">
                    {profile.overallProgress}% / {nextRank.minProgress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((profile.overallProgress / nextRank.minProgress) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Current: {profile.overallProgress}%</span>
                  <span>{rankDetails.progressNeeded === 0 ? 'Requirement Met! ✅' : `${rankDetails.progressNeeded}% left`}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center space-x-2 text-xs text-emerald-300 font-medium">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>Maximum Rank Achieved! You have unlocked all Grandmaster Scholar privileges.</span>
          </div>
        )}
      </div>

      {/* Rank Roadmap Modal */}
      {showTiersModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Learning Rank Progression Roadmap
                </h3>
              </div>
              <button
                onClick={() => setShowTiersModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your Learning Rank advances as you answer quiz questions and master topics across your curriculum. Progress from <strong>Novice</strong> to <strong>Scholar</strong> and <strong>Grandmaster</strong> to unlock elite perks.
            </p>

            <div className="space-y-4">
              {RANK_TIERS.map((tier) => {
                const isCurrent = currentRank.name === tier.name;
                const isPassed = currentRank.tier > tier.tier;
                const isLocked = currentRank.tier < tier.tier;

                return (
                  <div
                    key={tier.name}
                    className={`p-4 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-slate-950/80 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : isPassed
                        ? 'bg-slate-950/40 border-slate-800'
                        : 'bg-slate-950/20 border-slate-800/60 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-white">{tier.title}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              Tier {tier.tier}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{tier.summary}</p>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Current Rank</span>
                          </span>
                        ) : isPassed ? (
                          <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center space-x-1">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/60 text-xs">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Entry Requirements:
                        </span>
                        <div className="text-slate-300">
                          • {tier.minQuestions === 0 ? 'Initial level' : `${tier.minQuestions}+ questions answered`}
                        </div>
                        <div className="text-slate-300">
                          • {tier.minProgress === 0 ? 'No minimum' : `${tier.minProgress}%+ overall curriculum progress`}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Unlocked Privileges:
                        </span>
                        {tier.perks.slice(0, 2).map((perk, i) => (
                          <div key={i} className="text-slate-300 flex items-center space-x-1">
                            <span className="text-emerald-400">✓</span>
                            <span>{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowTiersModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Roadmap
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
