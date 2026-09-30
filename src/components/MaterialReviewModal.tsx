import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  X,
  Send,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  User,
  Clock,
  Award,
} from 'lucide-react';
import { MaterialReview, MaterialRatingSummary, StudentProfile } from '../types/index.ts';
import { db, collection, doc, setDoc } from '../firebase.ts';

interface MaterialReviewModalProps {
  materialId: string;
  materialTitle: string;
  materialType: 'document' | 'course';
  materialSubject: string;
  profile?: StudentProfile;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export const MaterialReviewModal: React.FC<MaterialReviewModalProps> = ({
  materialId,
  materialTitle,
  materialType,
  materialSubject,
  profile,
  isOpen,
  onClose,
  onReviewSubmitted,
}) => {
  const [reviews, setReviews] = useState<MaterialReview[]>([]);
  const [summary, setSummary] = useState<MaterialRatingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form state
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentText, setCommentText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Fetch reviews for this specific material
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews?materialId=${encodeURIComponent(materialId)}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.warn('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && materialId) {
      fetchReviews();
      setSuccessMessage('');
      setCommentText('');
      setSelectedRating(5);
    }
  }, [isOpen, materialId]);

  if (!isOpen) return null;

  // Handle review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        materialId,
        materialType,
        materialTitle,
        userId: profile?.userId || 'usr_guest',
        userName: profile?.name || 'Verified Student',
        userAvatar: undefined,
        rating: selectedRating,
        comment: commentText.trim(),
      };

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        // Also sync to Firestore if db is active
        try {
          if (db && data.review) {
            await setDoc(doc(collection(db, 'material_reviews'), data.review.id), data.review);
          }
        } catch (fErr) {
          console.warn('Firestore review sync warning:', fErr);
        }

        setSuccessMessage('Thank you! Your rating and feedback help other students find the best resources.');
        setCommentText('');
        fetchReviews();
        if (onReviewSubmitted) onReviewSubmitted();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {materialSubject}
              </span>
              <span className="text-xs text-slate-400 capitalize">
                {materialType === 'course' ? 'Video Course' : 'Curriculum Document'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1 line-clamp-1">
              {materialTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Community Ratings & Student Reviews
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Rating Summary Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:text-left shrink-0">
              <div className="text-4xl font-black text-amber-400 flex items-center justify-center sm:justify-start space-x-1">
                <span>{summary?.averageRating ? summary.averageRating.toFixed(1) : '5.0'}</span>
                <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Based on <span className="font-bold text-white">{summary?.totalRatings || reviews.length}</span> student reviews
              </div>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 w-full space-y-1 text-xs">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary?.ratingDistribution?.[stars] || 0;
                const total = summary?.totalRatings || (reviews.length || 1);
                const percent = Math.round((count / (total || 1)) * 100);

                return (
                  <div key={stars} className="flex items-center space-x-2">
                    <span className="w-8 font-mono text-[11px] text-slate-400 text-right">{stars}★</span>
                    <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-8 text-[10px] text-slate-500 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave a Rating & Review Form */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Leave Your Rating & Review</h4>
            </div>

            {successMessage && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-3">
              {/* Star selector */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Your Rating:</label>
                <div className="flex items-center space-x-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          (hoverRating || selectedRating) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-amber-400">
                    {selectedRating === 5 && 'Outstanding! (5/5)'}
                    {selectedRating === 4 && 'Very Helpful (4/5)'}
                    {selectedRating === 3 && 'Average (3/5)'}
                    {selectedRating === 2 && 'Needs Improvement (2/5)'}
                    {selectedRating === 1 && 'Unclear / Hard to follow (1/5)'}
                  </span>
                </div>
              </div>

              {/* Comment text */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Your Comment / Review:</label>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="What makes this material clear? Which algorithms, formulas, or concepts did it explain best? Any tips for other students?"
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-xs sm:text-sm rounded-xl p-3 outline-none transition"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Posting as: <strong className="text-slate-300">{profile?.name || 'Verified Student'}</strong>
                </span>

                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Post Review</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Student Reviews Feed */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Student Feedback ({reviews.length})</span>
            </h4>

            {loading ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading student reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No reviews yet for this material. Be the first student to rate it!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                          {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{rev.userName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Verified Student
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line pl-9">
                      {rev.comment}
                    </p>

                    {rev.likesCount !== undefined && rev.likesCount > 0 && (
                      <div className="pl-9 pt-1 flex items-center space-x-1.5 text-[11px] text-slate-500">
                        <ThumbsUp className="w-3 h-3 text-amber-400" />
                        <span>{rev.likesCount} students found this helpful</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
