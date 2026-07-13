import SEOHead from '../components/SEOHead';
import { fetchWithTimeout } from '../lib/utils';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, Quote, ThumbsUp, Heart, MessageCircle, ChevronLeft, ChevronRight, Loader2, ImageIcon } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Helper function to format time since review was posted
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const mons = Math.floor(days / 30);
  if (mons < 12) return `${mons} month${mons > 1 ? 's' : ''} ago`;
  return `${Math.floor(mons / 12)} year${Math.floor(mons / 12) > 1 ? 's' : ''} ago`;
}

export default function ReviewsPage() {
  const headingRef = useRef(null);
  const reviewsRef = useRef(null);
  const [activeReview, setActiveReview] = useState(0);
  const navigate = useNavigate();

  // Real data state
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingCounts, setRatingCounts] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [avgRating, setAvgRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 9;

  const fetchReviews = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res  = await fetchWithTimeout(`/api/reviews?page=${pg}&limit=${LIMIT}`);
      const data = await res.json();
      if (data.ok) {
        setReviews(prev => pg === 1 ? data.reviews : [...prev, ...data.reviews]);
        setRatingCounts(data.ratingCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        setAvgRating(data.avgRating || 0);
        setTotal(data.totalVisible || 0);
        setHasMore((pg * LIMIT) < (data.totalVisible || 0));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(() => fetchReviews(1)); }, [fetchReviews]);

  useEffect(() => {
    if (loading || !headingRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(headingRef.current.children, {
        y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
      });
      gsap.from('.stat-card', {
        y: 60, opacity: 0, scale: 0.9, duration: 0.8, stagger: 0.1, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.stats-container', start: 'top 85%' },
      });
      gsap.from('.review-card', {
        y: 50, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: reviewsRef.current, start: 'top 85%' },
      });
      gsap.from('.rating-bar', {
        scaleX: 0, duration: 1, stagger: 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: '.rating-bars', start: 'top 85%' },
      });
    }, headingRef);
    return () => ctx.revert();
  }, [loading]);

  const positivePct = total > 0
    ? Math.round(((ratingCounts[4] + ratingCounts[5]) / total) * 100)
    : 0;

  const featuredReview = reviews[activeReview] || null;

  return (
    <div className="min-h-screen bg-[#0A0604]">
      <SEOHead
        title="Customer Reviews"
        description="See what our customers say about One in a Million. Rated 4.9 stars across 3000+ reviews."
        url="/reviews"
      />
            {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#F07D14] via-[#E86C1B] to-[#B83A1B] text-white py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center" ref={headingRef}>
          <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-5 py-2.5 rounded-full text-sm font-black mb-6 shadow-lg">
            <Star size={16} className="fill-white text-white" />
            <span>CUSTOMER FEEDBACK</span>
          </span>
          <h1 className="font-fredoka text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Reviews & <span className="text-yellow-300">Ratings</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Hear what our valued customers have to say about their experience with us
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full">
              <Star size={18} className="fill-yellow-300 text-yellow-300" />
              <span className="font-black text-xl">{loading ? '—' : avgRating}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full">
              <MessageCircle size={18} />
              <span className="font-black text-xl">{loading ? '—' : total} Reviews</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full">
              <ThumbsUp size={18} />
              <span className="font-black text-xl">{loading ? '—' : `${positivePct}%`} Positive</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">

        {loading && reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={40} className="text-[#F07D14] animate-spin" />
            <p className="text-[#A39791]">Loading reviews…</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-white font-fredoka text-3xl font-bold mb-3">No Reviews Yet</h2>
            <p className="text-[#A39791] mb-8">Be the first to review your order!</p>
            <button
              onClick={() => navigate('/account')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#F07D14] text-white font-bold hover:bg-[#E86C1B] transition-colors"
            >
              <MessageCircle size={18} /> Write First Review
            </button>
          </div>
        ) : (
          <>
            {/* Featured Review Carousel */}
            {featuredReview && (
              <div className="mb-16">
                <div className="relative bg-gradient-to-br from-[#1E1612] via-[#1A1310] to-[#16100D] rounded-3xl p-8 sm:p-12 border-2 border-[#F07D14]/30 shadow-[0_20px_60px_rgba(240,125,20,0.2)] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F07D14]/10 via-transparent to-[#F07D14]/10 blur-xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="inline-flex items-center gap-2 bg-[#F07D14]/20 border border-[#F07D14]/40 rounded-full px-4 py-1.5">
                        <Heart size={14} className="text-[#F07D14] fill-[#F07D14]" />
                        <span className="text-[#F07D14] text-xs font-black uppercase tracking-wider">Featured Review</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveReview((p) => (p - 1 + reviews.length) % reviews.length)}
                          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#F07D14] hover:border-[#F07D14] transition-all"
                        ><ChevronLeft size={20} /></button>
                        <button
                          onClick={() => setActiveReview((p) => (p + 1) % reviews.length)}
                          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#F07D14] hover:border-[#F07D14] transition-all"
                        ><ChevronRight size={20} /></button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F07D14] to-[#B83A1B] flex items-center justify-center text-white font-black text-3xl shadow-[0_8px_30px_rgba(240,125,20,0.5)]">
                          {(featuredReview.userId?.name || 'U')[0].toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-fredoka text-2xl font-bold text-white mb-1">
                              {featuredReview.userId?.name || 'Customer'}
                            </h3>
                            <p className="text-[#A39791] text-sm">{timeAgo(featuredReview.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-[#F07D14]/20 px-3 py-1 rounded-full">
                            <Star size={14} className="fill-[#F07D14] text-[#F07D14]" />
                            <span className="text-[#F07D14] font-black text-sm">{featuredReview.rating}.0</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mb-4">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={20} className={s <= featuredReview.rating ? 'text-[#F07D14] fill-[#F07D14]' : 'text-[#8E827B]'} />
                          ))}
                        </div>
                        {featuredReview.comment && (
                          <div className="relative mb-4">
                            <Quote size={40} className="absolute -top-3 -left-3 text-[#F07D14]/30" />
                            <p className="text-[#C4B5AB] text-lg pl-6 leading-relaxed italic">
                              "{featuredReview.comment}"
                            </p>
                          </div>
                        )}
                        {/* Review photos */}
                        {featuredReview.photos?.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {featuredReview.photos.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt={`Review photo ${i + 1}`}
                                className="w-20 h-20 object-cover rounded-xl border border-white/10"
          loading="lazy"
          decoding="async"
        />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rating Overview */}
            <div className="stats-container grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              <div className="stat-card lg:col-span-1 bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl border border-[#2A1F1A] p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F07D14]/5 to-transparent" />
                <div className="relative z-10 text-center">
                  <div className="text-7xl font-fredoka font-black text-white mb-3">{avgRating}</div>
                  <div className="flex items-center justify-center gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={24} className={s <= Math.round(avgRating) ? 'text-[#F07D14] fill-[#F07D14]' : 'text-[#8E827B]'} />
                    ))}
                  </div>
                  <p className="text-[#A39791] font-semibold">Overall Rating</p>
                  <p className="text-[#8E827B] text-sm mt-1">Based on {total} verified reviews</p>
                </div>
              </div>

              <div className="stat-card lg:col-span-2 bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl border border-[#2A1F1A] p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F07D14]/5 to-transparent" />
                <div className="relative z-10">
                  <h3 className="font-fredoka text-xl font-bold text-white mb-2">Rating Breakdown</h3>
                  <p className="text-[#A39791] text-sm mb-6">Distribution of customer ratings</p>
                  <div className="rating-bars space-y-3">
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = ratingCounts[rating] || 0;
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-4">
                          <span className="text-sm font-bold text-white w-16">{rating} stars</span>
                          <div className="flex-1 h-4 bg-[#16100D] rounded-full overflow-hidden">
                            <div
                              className="rating-bar h-full bg-gradient-to-r from-[#F07D14] to-[#E86C1B] rounded-full origin-left"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-[#A39791] w-16 text-right">{count} review{count !== 1 ? 's' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Grid */}
            <div ref={reviewsRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div
                  key={review._id}
                  className="review-card group relative bg-gradient-to-br from-[#1E1612] to-[#16100D] rounded-2xl p-6 border border-[#2A1F1A] transition-all duration-500 hover:border-[#F07D14]/60 hover:shadow-[0_20px_40px_rgba(240,125,20,0.25)] hover:-translate-y-1"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F07D14]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F07D14]/60 to-transparent" />
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F07D14] to-[#B83A1B] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {(review.userId?.name || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg">{review.userId?.name || 'Customer'}</h3>
                        <p className="text-xs text-[#A39791] font-medium">{timeAgo(review.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-0.5 bg-[#F07D14]/10 px-2 py-1 rounded-full">
                        <Star size={12} className="fill-[#F07D14] text-[#F07D14]" />
                        <span className="text-[#F07D14] font-black text-xs">{review.rating}.0</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-4">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} className={s <= review.rating ? 'text-[#F07D14] fill-[#F07D14]' : 'text-[#8E827B]'} />
                      ))}
                    </div>

                    {review.comment && (
                      <div className="relative mb-4">
                        <Quote size={32} className="absolute -top-2 -left-2 text-[#F07D14]/20" />
                        <p className="text-[#C4B5AB] pl-6 text-sm leading-relaxed">"{review.comment}"</p>
                      </div>
                    )}

                    {/* Review photos */}
                    {review.photos?.length > 0 && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {review.photos.slice(0, 3).map((url, i) => (
                          <div key={i} className="relative">
                            <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-white/10"
          loading="lazy"
          decoding="async"
        />
                            {i === 2 && review.photos.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                +{review.photos.length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center gap-1 text-[#8E827B] text-xs">
                          <ImageIcon size={12} />
                          <span>{review.photos.length} photo{review.photos.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-xs text-[#8E827B]">Order #{review.orderId?.slice(-6)}</span>
                      <div className="flex items-center gap-1.5">
                        <Star size={10} className="fill-[#F07D14] text-[#F07D14]" />
                        <span className="text-xs text-[#A39791] font-semibold">Verified Purchase</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => { const next = page + 1; setPage(next); fetchReviews(next); }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#1E1612] border border-[#F07D14]/40 text-[#F07D14] font-bold hover:bg-[#F07D14]/10 transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Load More Reviews
                </button>
              </div>
            )}
          </>
        )}

        {/* Write Review CTA */}
        <div className="mt-16">
          <div className="relative bg-gradient-to-br from-[#1E1612] via-[#1A1310] to-[#16100D] rounded-3xl p-10 sm:p-12 text-center border-2 border-[#F07D14]/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F07D14]/20 via-transparent to-[#F07D14]/20 blur-xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#F07D14] to-[#E86C1B] rounded-full mb-6 shadow-[0_8px_30px_rgba(240,125,20,0.5)]">
                <Star size={32} className="text-white fill-white" />
              </div>
              <h3 className="font-fredoka text-3xl sm:text-4xl font-black text-white mb-3">Had a great experience?</h3>
              <p className="text-[#C4B5AB] mb-8 max-w-lg mx-auto text-base">
                We'd love to hear from you! Share your feedback and help others discover the taste of One in a Million.
              </p>
              <button
                onClick={() => navigate('/account')}
                className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#F07D14] to-[#E86C1B] text-white font-black text-lg shadow-[0_16px_40px_rgba(240,125,20,0.45)] border-0 cursor-pointer hover:shadow-[0_20px_50px_rgba(240,125,20,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                <MessageCircle size={24} className="relative z-10" />
                <span className="relative z-10">Write a Review</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
