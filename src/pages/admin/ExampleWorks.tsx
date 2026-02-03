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

interface ExampleWork {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminExampleWorks() {
  const [examples, setExamples] = useState<ExampleWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExample, setEditingExample] = useState<ExampleWork | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchExamples();
  }, []);

  const fetchExamples = async () => {
    try {
      const { data, error } = await supabase
        .from('example_works')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setExamples(data || []);
    } catch (err) {
      console.error('Error fetching example works:', err);
      addToast('Failed to load example works', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingExample(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (example: ExampleWork) => {
    setEditingExample(example);
    setFormData({
      title: example.title,
      description: example.description || '',
      image_url: example.image_url,
      is_active: example.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image_url) {
      addToast('Please upload an image', 'error');
      return;
    }

    setIsSaving(true);

    try {
      if (editingExample) {
        const { error } = await supabase
          .from('example_works')
          .update({
            title: formData.title,
            description: formData.description || null,
            image_url: formData.image_url,
            is_active: formData.is_active,
          })
          .eq('id', editingExample.id);

        if (error) throw error;
        addToast('Example work updated successfully', 'success');
      } else {
        const maxOrder = examples.length > 0
          ? Math.max(...examples.map((e) => e.display_order))
          : 0;

        const { error } = await supabase.from('example_works').insert({
          title: formData.title,
          description: formData.description || null,
          image_url: formData.image_url,
          is_active: formData.is_active,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        addToast('Example work created successfully', 'success');
      }

      setIsModalOpen(false);
      fetchExamples();
    } catch (err: any) {
      console.error('Error saving example work:', err);
      addToast('Failed to save example work', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (example: ExampleWork) => {
    if (!confirm(`Are you sure you want to delete "${example.title}"?`)) {
      return;
    }

    setIsDeleting(example.id);

    try {
      const { error } = await supabase
        .from('example_works')
        .delete()
        .eq('id', example.id);

      if (error) throw error;

      addToast('Example work deleted successfully', 'success');
      fetchExamples();
    } catch (err) {
      console.error('Error deleting example work:', err);
      addToast('Failed to delete example work', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReorder = async (exampleId: string, direction: 'up' | 'down') => {
    const index = examples.findIndex((e) => e.id === exampleId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === examples.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherExample = examples[newIndex];
    const currentExample = examples[index];

    try {
      const [result1, result2] = await Promise.all([
        supabase
          .from('example_works')
          .update({ display_order: otherExample.display_order })
          .eq('id', currentExample.id),
        supabase
          .from('example_works')
          .update({ display_order: currentExample.display_order })
          .eq('id', otherExample.id),
      ]);

      if (result1.error) throw result1.error;
      if (result2.error) throw result2.error;

      fetchExamples();
    } catch (err) {
      console.error('Error reordering example works:', err);
      addToast('Failed to reorder example works', 'error');
    }
  };

  const toggleActive = async (example: ExampleWork) => {
    try {
      const { error } = await supabase
        .from('example_works')
        .update({ is_active: !example.is_active })
        .eq('id', example.id);

      if (error) throw error;

      addToast(
        `Example work ${example.is_active ? 'hidden' : 'shown'}`,
        'success'
      );
      fetchExamples();
    } catch (err) {
      console.error('Error toggling example work:', err);
      addToast('Failed to update example work', 'error');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Example Works</h1>
          <p className="text-gray-400 mt-1">Showcase your work on the Custom Orders page</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-5 w-5 mr-2" />
          Add Example
        </Button>
      </div>

      {examples.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ImageIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No example works yet</h3>
            <p className="text-gray-400 mb-6">
              Add examples of your work to show customers what you can create
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="h-5 w-5 mr-2" />
              Add First Example
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {examples.map((example, index) => (
            <Card key={example.id} padding="none">
              <div className={`${!example.is_active ? 'opacity-50' : ''}`}>
                {/* Image */}
                <div className="aspect-square relative overflow-hidden rounded-t-xl">
                  <img
                    src={example.image_url}
                    alt={example.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Reorder buttons */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <button
                      onClick={() => handleReorder(example.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 bg-black/50 rounded text-white hover:bg-black/70 disabled:opacity-30 backdrop-blur-sm"
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </button>
                    <button
                      onClick={() => handleReorder(example.id, 'down')}
                      disabled={index === examples.length - 1}
                      className="p-1.5 bg-black/50 rounded text-white hover:bg-black/70 disabled:opacity-30 rotate-180 backdrop-blur-sm"
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(example)}
                    className={`absolute top-2 right-2 p-1.5 rounded backdrop-blur-sm ${
                      example.is_active
                        ? 'bg-green-500/80 text-white'
                        : 'bg-black/50 text-gray-300'
                    }`}
                  >
                    {example.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-white truncate">{example.title}</h3>
                  {example.description && (
                    <p className="text-sm text-gray-400 truncate mt-1">{example.description}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => openEditModal(example)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white bg-[var(--color-surface)] rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(example)}
                      disabled={isDeleting === example.id}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {isDeleting === example.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
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
        title={editingExample ? 'Edit Example Work' : 'Add Example Work'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
            placeholder="e.g., Custom Name Signs"
          />

          <Input
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Personalized wall art"
          />

          <SingleImageUpload
            label="Image"
            image={formData.image_url || null}
            onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url || '' }))}
            bucket="product-images"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
            />
            <label htmlFor="is_active" className="text-gray-300">
              Active (visible on Custom Orders page)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingExample ? 'Update' : 'Add Example'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
