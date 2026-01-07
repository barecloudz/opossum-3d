import { useState, useEffect } from 'react';
import { Star, User, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import type { ProductReview } from '../../types';

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { user, profile } = useAuthStore();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    content: '',
    name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
    email: user?.email || '',
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);

      // Check if current user has already reviewed
      if (user) {
        const userReview = data?.find(r => r.user_id === user.id);
        setHasReviewed(!!userReview);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('product_reviews').insert({
        product_id: productId,
        user_id: user?.id || null,
        reviewer_name: formData.name,
        reviewer_email: formData.email,
        rating: formData.rating,
        title: formData.title || null,
        content: formData.content || null,
        is_verified_purchase: false, // Would check against orders in a real implementation
        is_approved: false, // Requires admin approval
      });

      if (error) throw error;

      addToast('Review submitted! It will appear after approval.', 'success');
      setShowReviewForm(false);
      setFormData({
        ...formData,
        rating: 5,
        title: '',
        content: '',
      });
    } catch (err) {
      console.error('Error submitting review:', err);
      addToast('Failed to submit review. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
      : 0,
  }));

  const renderStars = (rating: number, interactive = false, onRate?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate && onRate(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-400'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="mt-16 pt-8 border-t border-[var(--color-border)]">
      <h2 className="text-2xl font-bold text-theme mb-6">Customer Reviews</h2>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Average Rating */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-theme">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center mt-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-theme opacity-60 text-sm mt-1">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm text-theme opacity-60 w-8">{rating}</span>
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-theme opacity-60 w-8">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Write Review CTA */}
        <Card>
          <div className="text-center py-4">
            <h3 className="text-lg font-semibold text-theme mb-2">Share Your Experience</h3>
            <p className="text-theme opacity-60 text-sm mb-4">
              Help other customers by sharing your thoughts
            </p>
            {hasReviewed ? (
              <p className="text-green-400 text-sm flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                You've already reviewed this product
              </p>
            ) : showReviewForm ? (
              <Button variant="ghost" onClick={() => setShowReviewForm(false)}>
                Cancel
              </Button>
            ) : (
              <Button onClick={() => setShowReviewForm(true)}>
                Write a Review
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Review Form */}
      {showReviewForm && !hasReviewed && (
        <Card className="mb-8">
          <h3 className="text-lg font-semibold text-theme mb-4">Write Your Review</h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme opacity-80 mb-2">
                Your Rating
              </label>
              {renderStars(formData.rating, true, (r) => setFormData({ ...formData, rating: r }))}
            </div>

            {!user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Your Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            )}

            <Input
              label="Review Title (optional)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Summarize your review"
            />

            <div>
              <label className="block text-sm font-medium text-theme opacity-80 mb-1">
                Your Review (optional)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-theme placeholder-theme/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                placeholder="Share your experience with this product..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowReviewForm(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Submit Review
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card className="text-center py-12">
          <Star className="h-12 w-12 text-theme opacity-30 mx-auto mb-4" />
          <p className="text-theme opacity-60">No reviews yet. Be the first to review!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--color-background)] rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-theme opacity-60" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-theme">{review.reviewer_name}</span>
                    {review.is_verified_purchase && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-theme opacity-60 text-sm">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <h4 className="font-medium text-theme mb-1">{review.title}</h4>
                  )}
                  {review.content && (
                    <p className="text-theme opacity-80">{review.content}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
