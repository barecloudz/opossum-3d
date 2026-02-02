import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, GripVertical, FolderOpen } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import SingleImageUpload from '../../components/admin/SingleImageUpload';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import type { Category } from '../../types';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      addToast('Failed to load categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingCategory ? prev.slug : generateSlug(name),
    }));
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      is_active: category.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            image_url: formData.image_url || null,
            is_active: formData.is_active,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        addToast('Category updated successfully', 'success');
      } else {
        // Create new category
        const maxOrder = categories.length > 0
          ? Math.max(...categories.map((c) => c.display_order))
          : 0;

        const { error } = await supabase.from('categories').insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          image_url: formData.image_url || null,
          is_active: formData.is_active,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        addToast('Category created successfully', 'success');
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error('Error saving category:', err);
      if (err.code === '23505') {
        addToast('A category with this slug already exists', 'error');
      } else {
        addToast('Failed to save category', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? Products in this category will become uncategorized.`)) {
      return;
    }

    setIsDeleting(category.id);

    try {
      // First, unassign products from this category
      await supabase
        .from('products')
        .update({ category_id: null })
        .eq('category_id', category.id);

      // Then delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;

      addToast('Category deleted successfully', 'success');
      fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      addToast('Failed to delete category', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReorder = async (categoryId: string, direction: 'up' | 'down') => {
    const index = categories.findIndex((c) => c.id === categoryId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherCategory = categories[newIndex];
    const currentCategory = categories[index];

    try {
      // Swap display orders - check each result for errors
      const [result1, result2] = await Promise.all([
        supabase
          .from('categories')
          .update({ display_order: otherCategory.display_order })
          .eq('id', currentCategory.id),
        supabase
          .from('categories')
          .update({ display_order: currentCategory.display_order })
          .eq('id', otherCategory.id),
      ]);

      // Check for errors from either operation
      if (result1.error) throw result1.error;
      if (result2.error) throw result2.error;

      fetchCategories();
    } catch (err) {
      console.error('Error reordering categories:', err);
      addToast('Failed to reorder categories', 'error');
    }
  };

  const toggleActive = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;

      addToast(
        `Category ${category.is_active ? 'deactivated' : 'activated'}`,
        'success'
      );
      fetchCategories();
    } catch (err) {
      console.error('Error toggling category:', err);
      addToast('Failed to update category', 'error');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Categories</h1>
          <p className="text-gray-400 mt-1">Organize your products into categories</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-5 w-5 mr-2" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No categories yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first category to organize your products
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="h-5 w-5 mr-2" />
              Create Category
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-brand-gray">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className={`flex items-center gap-4 p-4 ${
                  !category.is_active ? 'opacity-50' : ''
                }`}
              >
                {/* Drag handle / Reorder buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleReorder(category.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                  <button
                    onClick={() => handleReorder(category.id, 'down')}
                    disabled={index === categories.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rotate-180"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                </div>

                {/* Category image */}
                <div className="w-12 h-12 bg-brand-gray rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FolderOpen className="h-6 w-6 text-gray-500" />
                  )}
                </div>

                {/* Category info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{category.name}</h3>
                  <p className="text-sm text-gray-400 truncate">
                    /{category.slug}
                    {category.description && ` • ${category.description}`}
                  </p>
                </div>

                {/* Status toggle */}
                <button
                  onClick={() => toggleActive(category)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    category.is_active
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                  }`}
                >
                  {category.is_active ? 'Active' : 'Inactive'}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(category)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    disabled={isDeleting === category.id}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {isDeleting === category.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name"
            value={formData.name}
            onChange={handleNameChange}
            required
            placeholder="e.g., Home Decor"
          />

          <Input
            label="URL Slug"
            value={formData.slug}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }))
            }
            required
            placeholder="e.g., home-decor"
            helperText="Used in the URL: /products?category=slug"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
              placeholder="Brief description of this category"
            />
          </div>

          <SingleImageUpload
            label="Category Image (optional)"
            image={formData.image_url || null}
            onChange={(url) =>
              setFormData((prev) => ({ ...prev, image_url: url || '' }))
            }
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
            />
            <label htmlFor="is_active" className="text-gray-300">
              Active (visible on storefront)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
