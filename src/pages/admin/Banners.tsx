import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import SingleImageUpload from '../../components/admin/SingleImageUpload';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import type { BannerSlide } from '../../types';

const gradientOptions = [
  { value: 'from-[var(--color-primary)] to-emerald-600', label: 'Brand Green' },
  { value: 'from-purple-600 to-pink-600', label: 'Purple Pink' },
  { value: 'from-cyan-500 to-blue-600', label: 'Cyan Blue' },
  { value: 'from-orange-500 to-red-600', label: 'Orange Red' },
  { value: 'from-rose-500 to-pink-600', label: 'Rose Pink' },
  { value: 'from-indigo-500 to-purple-600', label: 'Indigo Purple' },
  { value: 'from-emerald-500 to-teal-600', label: 'Emerald Teal' },
  { value: 'from-amber-500 to-orange-600', label: 'Amber Orange' },
];

export default function AdminBanners() {
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerSlide | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badge: '',
    cta_text: 'Shop Now',
    cta_link: '/products',
    image_url: '',
    gradient: 'from-[var(--color-primary)] to-emerald-600',
    text_color: 'dark' as 'light' | 'dark',
    is_active: true,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banner_slides')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      addToast('Failed to load banners', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      badge: '',
      cta_text: 'Shop Now',
      cta_link: '/products',
      image_url: '',
      gradient: 'from-[var(--color-primary)] to-emerald-600',
      text_color: 'dark',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (banner: BannerSlide) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      badge: banner.badge || '',
      cta_text: banner.cta_text,
      cta_link: banner.cta_link,
      image_url: banner.image_url || '',
      gradient: banner.gradient,
      text_color: banner.text_color,
      is_active: banner.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from('banner_slides')
          .update({
            title: formData.title,
            subtitle: formData.subtitle,
            badge: formData.badge || null,
            cta_text: formData.cta_text,
            cta_link: formData.cta_link,
            image_url: formData.image_url || null,
            gradient: formData.gradient,
            text_color: formData.text_color,
            is_active: formData.is_active,
          })
          .eq('id', editingBanner.id);

        if (error) throw error;
        addToast('Banner updated successfully', 'success');
      } else {
        const maxOrder = banners.length > 0
          ? Math.max(...banners.map((b) => b.display_order))
          : 0;

        const { error } = await supabase.from('banner_slides').insert({
          title: formData.title,
          subtitle: formData.subtitle,
          badge: formData.badge || null,
          cta_text: formData.cta_text,
          cta_link: formData.cta_link,
          image_url: formData.image_url || null,
          gradient: formData.gradient,
          text_color: formData.text_color,
          is_active: formData.is_active,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        addToast('Banner created successfully', 'success');
      }

      setIsModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      console.error('Error saving banner:', err);
      addToast('Failed to save banner', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (banner: BannerSlide) => {
    if (!confirm(`Are you sure you want to delete this banner?`)) {
      return;
    }

    setIsDeleting(banner.id);

    try {
      const { error } = await supabase
        .from('banner_slides')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;

      addToast('Banner deleted successfully', 'success');
      fetchBanners();
    } catch (err) {
      console.error('Error deleting banner:', err);
      addToast('Failed to delete banner', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReorder = async (bannerId: string, direction: 'up' | 'down') => {
    const index = banners.findIndex((b) => b.id === bannerId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === banners.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherBanner = banners[newIndex];
    const currentBanner = banners[index];

    try {
      const [result1, result2] = await Promise.all([
        supabase
          .from('banner_slides')
          .update({ display_order: otherBanner.display_order })
          .eq('id', currentBanner.id),
        supabase
          .from('banner_slides')
          .update({ display_order: currentBanner.display_order })
          .eq('id', otherBanner.id),
      ]);

      if (result1.error) throw result1.error;
      if (result2.error) throw result2.error;

      fetchBanners();
    } catch (err) {
      console.error('Error reordering banners:', err);
      addToast('Failed to reorder banners', 'error');
    }
  };

  const toggleActive = async (banner: BannerSlide) => {
    try {
      const { error } = await supabase
        .from('banner_slides')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;

      addToast(
        `Banner ${banner.is_active ? 'hidden' : 'shown'}`,
        'success'
      );
      fetchBanners();
    } catch (err) {
      console.error('Error toggling banner:', err);
      addToast('Failed to update banner', 'error');
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Homepage Banners</h1>
          <p className="text-gray-400 mt-1">Manage the sliding banners on the homepage</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-5 w-5 mr-2" />
          Add Banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No banners yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first banner to display on the homepage
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="h-5 w-5 mr-2" />
              Create Banner
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, index) => (
            <Card key={banner.id} padding="none">
              <div className={`flex items-stretch ${!banner.is_active ? 'opacity-50' : ''}`}>
                {/* Preview */}
                <div
                  className={`w-48 flex-shrink-0 bg-gradient-to-r ${banner.gradient} p-4 rounded-l-xl relative overflow-hidden`}
                >
                  {banner.image_url && (
                    <img
                      src={banner.image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="relative z-10">
                    {banner.badge && (
                      <span className="inline-block bg-black/20 rounded px-2 py-0.5 text-xs text-white mb-1">
                        {banner.badge}
                      </span>
                    )}
                    <h3 className={`font-bold text-sm ${banner.text_color === 'dark' ? 'text-black' : 'text-white'}`}>
                      {banner.title}
                    </h3>
                    <p className={`text-xs ${banner.text_color === 'dark' ? 'text-black/70' : 'text-white/70'}`}>
                      {banner.subtitle}
                    </p>
                  </div>
                </div>

                {/* Info & Actions */}
                <div className="flex-1 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Reorder */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder(banner.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </button>
                      <button
                        onClick={() => handleReorder(banner.id, 'down')}
                        disabled={index === banners.length - 1}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rotate-180"
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </button>
                    </div>

                    <div>
                      <p className="text-white font-medium">{banner.title}</p>
                      <p className="text-gray-400 text-sm">
                        {banner.cta_text} &rarr; {banner.cta_link}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(banner)}
                      className={`p-2 rounded-lg transition-colors ${
                        banner.is_active
                          ? 'text-green-400 hover:bg-green-500/20'
                          : 'text-gray-400 hover:bg-gray-500/20'
                      }`}
                      title={banner.is_active ? 'Hide banner' : 'Show banner'}
                    >
                      {banner.is_active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(banner)}
                      disabled={isDeleting === banner.id}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {isDeleting === banner.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBanner ? 'Edit Banner' : 'Create Banner'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
              placeholder="e.g., Custom 3D"
            />
            <Input
              label="Subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
              required
              placeholder="e.g., Printed Creations"
            />
          </div>

          <Input
            label="Badge Text (optional)"
            value={formData.badge}
            onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
            placeholder="e.g., New Arrivals, Sale, etc."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Button Text"
              value={formData.cta_text}
              onChange={(e) => setFormData((prev) => ({ ...prev, cta_text: e.target.value }))}
              required
              placeholder="e.g., Shop Now"
            />
            <Input
              label="Button Link"
              value={formData.cta_link}
              onChange={(e) => setFormData((prev) => ({ ...prev, cta_link: e.target.value }))}
              required
              placeholder="e.g., /products"
            />
          </div>

          <SingleImageUpload
            label="Banner Image (optional - uses gradient as fallback)"
            image={formData.image_url || null}
            onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url || '' }))}
            bucket="product-images"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fallback Gradient
              </label>
              <select
                value={formData.gradient}
                onChange={(e) => setFormData((prev) => ({ ...prev, gradient: e.target.value }))}
                className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
              >
                {gradientOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Text Color
              </label>
              <select
                value={formData.text_color}
                onChange={(e) => setFormData((prev) => ({ ...prev, text_color: e.target.value as 'light' | 'dark' }))}
                className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
              >
                <option value="dark">Dark (for light backgrounds)</option>
                <option value="light">Light (for dark backgrounds)</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
            <div
              className={`relative bg-gradient-to-r ${formData.gradient} p-6 rounded-xl overflow-hidden`}
            >
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="relative z-10">
                {formData.badge && (
                  <span className="inline-block bg-black/20 rounded-lg px-3 py-1 text-sm text-white mb-2">
                    {formData.badge}
                  </span>
                )}
                <h3 className={`text-2xl font-bold ${formData.text_color === 'dark' ? 'text-black' : 'text-white'}`}>
                  {formData.title || 'Title'}
                </h3>
                <p className={`text-lg ${formData.text_color === 'dark' ? 'text-black/70' : 'text-white/70'}`}>
                  {formData.subtitle || 'Subtitle'}
                </p>
                <button
                  type="button"
                  className={`mt-3 px-4 py-2 rounded-xl font-medium ${
                    formData.text_color === 'dark'
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  {formData.cta_text || 'Button'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
            />
            <label htmlFor="is_active" className="text-gray-300">
              Active (visible on homepage)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingBanner ? 'Update Banner' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
