import { useState, useEffect } from 'react';
import { Search, Star, Check, X, Trash2, MessageSquare } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import type { ProductReview } from '../../types';

interface ReviewWithProduct extends ProductReview {
  product?: { name: string; slug: string };
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const { addToast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          product:products(name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      addToast('Failed to load reviews', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (review: ReviewWithProduct) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: true })
        .eq('id', review.id);

      if (error) throw error;

      addToast('Review approved', 'success');
      fetchReviews();
    } catch (err) {
      console.error('Error approving review:', err);
      addToast('Failed to approve review', 'error');
    }
  };

  const handleReject = async (review: ReviewWithProduct) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: false })
        .eq('id', review.id);

      if (error) throw error;

      addToast('Review rejected', 'success');
      fetchReviews();
    } catch (err) {
      console.error('Error rejecting review:', err);
      addToast('Failed to reject review', 'error');
    }
  };

  const handleDelete = async (review: ReviewWithProduct) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', review.id);

      if (error) throw error;

      addToast('Review deleted', 'success');
      fetchReviews();
    } catch (err) {
      console.error('Error deleting review:', err);
      addToast('Failed to delete review', 'error');
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.reviewer_name.toLowerCase().includes(search.toLowerCase()) ||
      review.reviewer_email.toLowerCase().includes(search.toLowerCase()) ||
      review.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      (review.title?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && !review.is_approved) ||
      (filter === 'approved' && review.is_approved);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => !r.is_approved).length,
    approved: reviews.filter(r => r.is_approved).length,
    averageRating: reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0',
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-400'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Product Reviews</h1>
          <p className="text-gray-400 mt-1">Manage customer reviews and ratings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-neon/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-brand-neon" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-gray-400 text-sm">Total Reviews</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.averageRating}</p>
              <p className="text-gray-400 text-sm">Avg Rating</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-gray-400 text-sm">Pending</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.approved}</p>
              <p className="text-gray-400 text-sm">Approved</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
        >
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="all">All Reviews</option>
        </select>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No reviews found</h3>
            <p className="text-gray-400">
              {filter === 'pending' ? 'No reviews awaiting approval' : 'No reviews match your search'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={review.id}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-medium text-white">{review.reviewer_name}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400 text-sm">{review.reviewer_email}</span>
                    {review.is_verified_purchase && (
                      <Badge variant="success">Verified</Badge>
                    )}
                    {!review.is_approved && (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-gray-400 text-sm">
                      for{' '}
                      <span className="text-brand-neon">{review.product?.name || 'Unknown Product'}</span>
                    </span>
                  </div>

                  {review.title && (
                    <h4 className="font-medium text-white mb-1">{review.title}</h4>
                  )}
                  {review.content && (
                    <p className="text-gray-300">{review.content}</p>
                  )}

                  <p className="text-gray-500 text-sm mt-2">
                    {new Date(review.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!review.is_approved && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApprove(review)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  {review.is_approved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReject(review)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(review)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
