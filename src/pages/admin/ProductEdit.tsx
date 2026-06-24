import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, X, Image as ImageIcon, Upload, FolderPlus, Palette } from 'lucide-react';
import { COLOR_PRESETS } from '../../lib/constants';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import ImageUpload from '../../components/admin/ImageUpload';
import SingleImageUpload from '../../components/admin/SingleImageUpload';
import { supabase } from '../../lib/supabase';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { slugify } from '../../lib/utils';
import { useCategories } from '../../hooks/useCategories';
import { useProductStore } from '../../store/productStore';
import { useToast } from '../../components/ui/Toast';

interface Variant {
  id?: string;
  name: string;
  sku: string;
  price_adjustment: string;
  stock_quantity: string;
  image_url: string;
}

interface PriceTier {
  id?: string;
  min_qty: string;
  max_qty: string;
  price_per_unit: string;
}

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const { categories, refetch: refetchCategories } = useCategories({ includeInactive: true });
  const { invalidateCache } = useProductStore();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [customColorInput, setCustomColorInput] = useState('');
  const variantsEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);

  // Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
  });
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    compare_at_price: '',
    cost_price: '',
    sku: '',
    stock_quantity: '0',
    low_stock_threshold: '5',
    category_id: '',
    is_active: true,
    is_featured: false,
    is_customizable: false,
    allow_color_selection: false,
    show_description_prompt: false,
    track_inventory: true,
    continue_selling_when_out_of_stock: false,
    print_time_hours: '',
    weight_oz: '',
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchProduct();
    }
  }, [id, isNew]);

  const fetchProduct = async () => {
    try {
      // Add timeout using Promise.race
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 15000);
      });

      const fetchPromise = supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          price: data.price.toString(),
          compare_at_price: data.compare_at_price?.toString() || '',
          cost_price: data.cost_price?.toString() || '',
          sku: data.sku || '',
          stock_quantity: data.stock_quantity.toString(),
          low_stock_threshold: data.low_stock_threshold.toString(),
          category_id: data.category_id || '',
          is_active: data.is_active,
          is_featured: data.is_featured,
          is_customizable: data.is_customizable ?? false,
          allow_color_selection: data.allow_color_selection ?? false,
          show_description_prompt: data.show_description_prompt ?? false,
          track_inventory: data.track_inventory,
          continue_selling_when_out_of_stock: data.continue_selling_when_out_of_stock,
          print_time_hours: data.print_time_hours?.toString() || '',
          weight_oz: data.weight_oz?.toString() || '',
        });
        setAvailableColors(data.available_colors ?? []);

        // Fetch product images
        const { data: imagesData } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', id)
          .order('display_order');

        if (imagesData) {
          setImages(imagesData.map(img => img.image_url).filter(Boolean));
        }

        // Fetch product variants
        const { data: variantsData } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', id)
          .order('display_order');

        if (variantsData) {
          setVariants(variantsData.map(v => ({
            id: v.id,
            name: v.name,
            sku: v.sku || '',
            price_adjustment: v.price_adjustment.toString(),
            stock_quantity: v.stock_quantity.toString(),
            image_url: v.image_url || '',
          })));
        }

        // Fetch price tiers
        const { data: tiersData } = await supabase
          .from('product_price_tiers')
          .select('*')
          .eq('product_id', id)
          .order('display_order');

        if (tiersData) {
          setPriceTiers(tiersData.map(t => ({
            id: t.id,
            min_qty: t.min_qty.toString(),
            max_qty: t.max_qty?.toString() || '',
            price_per_unit: t.price_per_unit.toString(),
          })));
        }
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      navigate('/admin/products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Single atomic state update to prevent race conditions
    setFormData((prev) => {
      const newValue = type === 'checkbox' ? checked : value;
      const updates: Partial<typeof prev> = { [name]: newValue };

      // Auto-generate slug from name in the same update
      if (name === 'name' && typeof newValue === 'string') {
        updates.slug = slugify(newValue);
      }

      return { ...prev, ...updates };
    });
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', sku: '', price_adjustment: '0', stock_quantity: '0', image_url: '' }]);
    setTimeout(() => {
      variantsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Category modal handlers
  const generateCategorySlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleCategoryNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewCategory((prev) => ({
      ...prev,
      name,
      slug: generateCategorySlug(name),
    }));
  };

  const openCategoryModal = () => {
    setNewCategory({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      is_active: true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCategory(true);

    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map((c) => c.display_order))
        : 0;

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          name: newCategory.name,
          slug: newCategory.slug,
          description: newCategory.description || null,
          image_url: newCategory.image_url || null,
          is_active: newCategory.is_active,
          display_order: maxOrder + 1,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      addToast('Category created successfully', 'success');
      setIsCategoryModalOpen(false);

      // Refresh categories and select the new one
      await refetchCategories();
      if (data?.id) {
        setFormData((prev) => ({ ...prev, category_id: data.id }));
      }
    } catch (err: any) {
      console.error('Error creating category:', err);
      if (err.code === '23505') {
        addToast('A category with this slug already exists', 'error');
      } else {
        addToast('Failed to create category', 'error');
      }
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleVariantImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError({ message: 'Only image files are allowed for variant images' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError({ message: 'Variant image must be under 5MB' });
      return;
    }

    // Show uploading state
    updateVariant(index, 'image_url', 'uploading...');

    try {
      const publicUrl = await uploadToCloudinary(file, 'products');
      updateVariant(index, 'image_url', publicUrl);
    } catch (err: any) {
      console.error('Failed to upload variant image:', err);
      updateVariant(index, 'image_url', ''); // Clear the uploading state
      setError({ message: `Failed to upload variant image: ${err.message}` });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!formData.price || parseFloat(formData.price) < 0) {
        throw new Error('Valid price is required');
      }

      const productData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || slugify(formData.name),
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku: formData.sku || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 5,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        is_customizable: formData.is_customizable,
        allow_color_selection: formData.allow_color_selection,
        available_colors: availableColors.length ? availableColors : null,
        show_description_prompt: formData.show_description_prompt,
        track_inventory: formData.track_inventory,
        continue_selling_when_out_of_stock: formData.continue_selling_when_out_of_stock,
        print_time_hours: formData.print_time_hours ? parseInt(formData.print_time_hours) : null,
        weight_oz: formData.weight_oz ? parseFloat(formData.weight_oz) : null,
      };

      console.log('Saving product data:', productData);

      let productId = id;

      if (isNew) {
        console.log('Creating new product...');
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Failed to create product: ${insertError.message}${insertError.details ? ` - ${insertError.details}` : ''}`);
        }
        productId = newProduct.id;
        console.log('Product created with ID:', productId);
      } else {
        console.log('Updating product:', id);
        const { error: updateError } = await supabase.from('products').update(productData).eq('id', id);
        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Failed to update product: ${updateError.message}${updateError.details ? ` - ${updateError.details}` : ''}`);
        }
      }

      // Save images
      if (productId) {
        console.log('Saving images for product:', productId);
        console.log('Images to save:', images.length);

        // Only delete if editing existing product
        if (!isNew) {
          console.log('Deleting existing images...');
          const { error: deleteImgError } = await supabase
            .from('product_images')
            .delete()
            .eq('product_id', productId);
          if (deleteImgError) {
            console.error('Delete images error:', deleteImgError);
          }
          console.log('Delete images complete');
        }

        // Insert new images
        if (images.length > 0) {
          console.log('Inserting images...');

          // Filter out invalid URLs (empty, uploading state, or non-http URLs)
          const validImages = images.filter(img =>
            img &&
            typeof img === 'string' &&
            img.startsWith('http') &&
            !img.includes('uploading')
          );

          if (validImages.length !== images.length) {
            console.warn(`Filtered out ${images.length - validImages.length} invalid image URLs`);
          }

          if (validImages.length > 0) {
            const imageRecords = validImages.map((img, index) => ({
              product_id: productId,
              image_url: img,
              display_order: index,
              is_primary: index === 0,
            }));
            console.log('Image records:', imageRecords);

            const { error: imgError } = await supabase
              .from('product_images')
              .insert(imageRecords);

            if (imgError) {
              console.error('Insert images error:', imgError);
              throw new Error(`Failed to save images: ${imgError.message}`);
            }
            console.log('Images inserted successfully');
          }
        }

        // Save variants
        console.log('Processing variants...');

        // Only delete if editing existing product
        if (!isNew) {
          console.log('Deleting existing variants...');
          const { error: deleteVarError } = await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', productId);
          if (deleteVarError) {
            console.error('Delete variants error:', deleteVarError);
          }
          console.log('Delete variants complete');
        }

        // Insert new variants
        if (variants.length > 0) {
          const variantRecords = variants
            .filter(v => v.name.trim()) // Only save variants with names
            .map((v, index) => {
              // Validate variant image URL - filter out invalid states
              const validImageUrl = v.image_url &&
                v.image_url.startsWith('http') &&
                !v.image_url.includes('uploading')
                  ? v.image_url
                  : null;

              return {
                product_id: productId,
                name: v.name,
                sku: v.sku || null,
                price_adjustment: parseFloat(v.price_adjustment) || 0,
                stock_quantity: parseInt(v.stock_quantity) || 0,
                display_order: index,
                image_url: validImageUrl,
              };
            });

          if (variantRecords.length > 0) {
            console.log('Inserting variants:', variantRecords);
            const { error: varError } = await supabase
              .from('product_variants')
              .insert(variantRecords);

            if (varError) {
              console.error('Insert variants error:', varError);
              throw new Error(`Failed to save variants: ${varError.message}`);
            }
            console.log('Variants inserted successfully');
          }
        }

        // Save price tiers
        if (!isNew) {
          await supabase
            .from('product_price_tiers')
            .delete()
            .eq('product_id', productId);
        }

        if (priceTiers.length > 0) {
          const tierRecords = priceTiers
            .filter(t => t.min_qty && t.price_per_unit)
            .map((t, index) => ({
              product_id: productId,
              min_qty: parseInt(t.min_qty) || 1,
              max_qty: t.max_qty ? parseInt(t.max_qty) : null,
              price_per_unit: parseFloat(t.price_per_unit),
              display_order: index,
            }));

          if (tierRecords.length > 0) {
            const { error: tierError } = await supabase
              .from('product_price_tiers')
              .insert(tierRecords);
            if (tierError) throw new Error(`Failed to save price tiers: ${tierError.message}`);
          }
        }
      }

      console.log('Product saved successfully!');
      // Invalidate cache so product list refreshes
      invalidateCache();
      navigate('/admin/products');
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError({
        message: err.message || 'Failed to save product',
        details: err.details || err.hint || undefined,
      });
    } finally {
      setIsSaving(false);
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
      <button
        onClick={() => navigate('/admin/products')}
        className="inline-flex items-center text-gray-400 hover:text-brand-neon mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Products
      </button>

      <h1 className="text-3xl font-bold text-[#0D1B2A] mb-8">
        {isNew ? 'Add Product' : 'Edit Product'}
      </h1>

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-brand-charcoal border border-red-500/50 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0D1B2A] mb-2">Error Saving Product</h3>
                <p className="text-red-400 mb-2">{error.message}</p>
                {error.details && (
                  <p className="text-gray-400 text-sm bg-brand-black/50 p-2 rounded font-mono">{error.details}</p>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-gray-400 hover:text-[#0D1B2A] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setError(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Product Information</h2>
              <div className="space-y-4">
                <Input
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="URL Slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-[#0D1B2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Pricing</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Price"
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
                <Input
                  label="Compare at Price"
                  type="number"
                  name="compare_at_price"
                  value={formData.compare_at_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  helperText="Original price for sale display"
                />
                <Input
                  label="Cost Price"
                  type="number"
                  name="cost_price"
                  value={formData.cost_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  helperText="For profit tracking"
                />
              </div>
            </Card>

            {/* Volume / Affiliate Pricing Tiers */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-semibold text-[#0D1B2A]">Volume Pricing Tiers</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Unlocked for customers who use an affiliate code. Leave empty to use base price.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPriceTiers(prev => [...prev, { min_qty: '', max_qty: '', price_per_unit: '' }])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tier
                </Button>
              </div>

              {priceTiers.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-400 text-sm">No tiers configured. Affiliate customers pay base price.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 px-1">
                    <span className="text-xs text-gray-500 font-medium">Min Qty</span>
                    <span className="text-xs text-gray-500 font-medium">Max Qty</span>
                    <span className="text-xs text-gray-500 font-medium">Price / Unit ($)</span>
                    <span />
                  </div>
                  {priceTiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={tier.min_qty}
                        onChange={e => {
                          const updated = [...priceTiers];
                          updated[index] = { ...updated[index], min_qty: e.target.value };
                          setPriceTiers(updated);
                        }}
                      />
                      <Input
                        type="number"
                        min="1"
                        placeholder="No limit"
                        value={tier.max_qty}
                        onChange={e => {
                          const updated = [...priceTiers];
                          updated[index] = { ...updated[index], max_qty: e.target.value };
                          setPriceTiers(updated);
                        }}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={tier.price_per_unit}
                        onChange={e => {
                          const updated = [...priceTiers];
                          updated[index] = { ...updated[index], price_per_unit: e.target.value };
                          setPriceTiers(updated);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setPriceTiers(priceTiers.filter((_, i) => i !== index))}
                        className="flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-1">
                    Example: min=1, max=11, price=5.99 → buying 1–11 units costs $5.99/ea
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Inventory</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                />
                <Input
                  label="Stock Quantity"
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleInputChange}
                  min="0"
                />
                <Input
                  label="Low Stock Alert"
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="track_inventory"
                    checked={formData.track_inventory}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                  />
                  <span className="text-gray-300">Track inventory</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="continue_selling_when_out_of_stock"
                    checked={formData.continue_selling_when_out_of_stock}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                  />
                  <span className="text-gray-300">Continue selling when out of stock</span>
                </label>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Additional Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Print Time (hours)"
                  type="number"
                  name="print_time_hours"
                  value={formData.print_time_hours}
                  onChange={handleInputChange}
                  min="0"
                />
                <Input
                  label="Weight (oz)"
                  type="number"
                  name="weight_oz"
                  value={formData.weight_oz}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>
            </Card>

            {/* Product Variants / Options */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#0D1B2A]">Options / Variants</h2>
                  <p className="text-gray-400 text-sm mt-1">Add different colors, sizes, or options</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              {variants.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-400">No variants added yet</p>
                  <p className="text-gray-500 text-sm mt-1">Click "Add Option" to create variants like colors or sizes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      ref={index === variants.length - 1 ? variantsEndRef : undefined}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-gray-400 text-sm">Option {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Input
                          label="Name"
                          placeholder="e.g., Red, Large, etc."
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        />
                        <Input
                          label="SKU"
                          placeholder="Optional"
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        />
                        <Input
                          label="Price Adjustment"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={variant.price_adjustment}
                          onChange={(e) => updateVariant(index, 'price_adjustment', e.target.value)}
                          helperText="+/- from base price"
                        />
                        <Input
                          label="Stock"
                          type="number"
                          min="0"
                          value={variant.stock_quantity}
                          onChange={(e) => updateVariant(index, 'stock_quantity', e.target.value)}
                        />
                      </div>

                      {/* Variant Image */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Variant Image
                        </label>
                        <div className="flex items-center gap-4">
                          {variant.image_url === 'uploading...' ? (
                            <div className="w-16 h-16 rounded-lg border-2 border-brand-neon/50 bg-brand-gray flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-brand-neon border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : variant.image_url ? (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-gray">
                              <img
                                src={variant.image_url}
                                alt={variant.name}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => updateVariant(index, 'image_url', '')}
                                className="absolute -top-1 -right-1 p-1 bg-red-600 rounded-full text-white hover:bg-red-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-500" />
                            </div>
                          )}

                          <div className="flex-1 flex flex-wrap gap-2">
                            {/* Select from product images */}
                            {images.length > 0 && (
                              <select
                                value={variant.image_url}
                                onChange={(e) => updateVariant(index, 'image_url', e.target.value)}
                                className="px-3 py-1.5 bg-brand-charcoal border border-brand-gray rounded-lg text-[#0D1B2A] text-sm focus:outline-none focus:ring-2 focus:ring-brand-neon"
                              >
                                <option value="">Select from product images</option>
                                {images.map((img, imgIndex) => (
                                  <option key={img} value={img}>
                                    Image {imgIndex + 1}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* Upload new image */}
                            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-charcoal border border-brand-gray rounded-lg text-gray-600 text-sm cursor-pointer hover:border-brand-neon/50 transition-colors">
                              <Upload className="h-4 w-4" />
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleVariantImageUpload(index, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs mt-2">
                          This image will be shown when this option is selected
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Status</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                  />
                  <span className="text-gray-300">Product is active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                  />
                  <span className="text-gray-300">Featured product</span>
                </label>
                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      name="is_customizable"
                      checked={formData.is_customizable}
                      onChange={handleInputChange}
                      className="w-4 h-4 mt-0.5 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                    />
                    <div>
                      <span className="text-gray-300 font-medium">Requires logo / artwork upload</span>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Customers must upload their own image (logo, design, etc.) before they can add this product to cart.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Color Selection Toggle + Manager */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="allow_color_selection"
                      checked={formData.allow_color_selection}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${formData.allow_color_selection ? 'bg-brand-neon' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.allow_color_selection ? 'translate-x-4' : ''}`} />
                    </div>
                    <div>
                      <span className="text-gray-300 font-medium">Color Selection</span>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Show a color picker on the product page so customers can choose their preferred colors.
                      </p>
                    </div>
                  </label>

                  {formData.allow_color_selection && (
                    <div className="mt-4 p-4 bg-brand-black/40 rounded-xl border border-brand-gray">
                      <div className="flex items-center gap-2 mb-3">
                        <Palette className="h-4 w-4 text-brand-neon" />
                        <span className="text-gray-300 text-sm font-medium">Available Colors for This Product</span>
                      </div>

                      {/* Active colors — click to remove */}
                      {availableColors.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {availableColors.map(name => {
                            const preset = COLOR_PRESETS.find(p => p.name === name);
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setAvailableColors(prev => prev.filter(c => c !== name))}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-brand-neon/40 bg-brand-neon/10 text-brand-neon text-xs font-medium hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-400 transition-colors group"
                                title="Click to remove"
                              >
                                <span
                                  className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                                  style={{ backgroundColor: preset?.hex ?? '#888' }}
                                />
                                {name}
                                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs mb-3">No colors set — all 12 presets will show. Add specific colors below to limit the options.</p>
                      )}

                      {/* Preset quick-add buttons */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {COLOR_PRESETS.filter(p => !availableColors.includes(p.name)).map(color => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setAvailableColors(prev => [...prev, color.name])}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-600 text-gray-400 text-xs hover:border-brand-neon/50 hover:text-brand-neon transition-colors"
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                              style={{ backgroundColor: color.hex }}
                            />
                            + {color.name}
                          </button>
                        ))}
                      </div>

                      {/* Custom color name */}
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={customColorInput}
                          onChange={e => setCustomColorInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const name = customColorInput.trim();
                              if (name && !availableColors.includes(name)) {
                                setAvailableColors(prev => [...prev, name]);
                              }
                              setCustomColorInput('');
                            }
                          }}
                          placeholder="Custom color name (e.g. Teal, Galaxy Black)"
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-brand-black border border-brand-gray text-[#0D1B2A] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-neon"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const name = customColorInput.trim();
                            if (name && !availableColors.includes(name)) {
                              setAvailableColors(prev => [...prev, name]);
                            }
                            setCustomColorInput('');
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-brand-neon/20 border border-brand-neon/40 text-brand-neon hover:bg-brand-neon/30 transition-colors whitespace-nowrap"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description Prompt Toggle */}
                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="show_description_prompt"
                      checked={formData.show_description_prompt}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors ${formData.show_description_prompt ? 'bg-brand-neon' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.show_description_prompt ? 'translate-x-4' : ''}`} />
                    </div>
                    <div>
                      <span className="text-gray-300 font-medium">Product Description Prompt</span>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Ask customers to describe how they want their product before adding to cart.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Category</h2>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    // Reset select value first, then open modal after browser repaint
                    setFormData(prev => ({ ...prev, category_id: '' }));
                    setTimeout(openCategoryModal, 0);
                  } else {
                    handleInputChange(e);
                  }
                }}
                className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-brand-neon"
              >
                <option value="">No Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{!category.is_active ? ' (Inactive)' : ''}
                  </option>
                ))}
                <option value="__add_new__" className="text-brand-neon">+ Add New Category</option>
              </select>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Images</h2>
              <ImageUpload
                images={images}
                onChange={setImages}
                onUploadingChange={setIsImageUploading}
                maxImages={20}
              />
              {isImageUploading && (
                <p className="text-amber-500 text-xs mt-2">Images are still uploading. Save will be available when complete.</p>
              )}
            </Card>

            <Button type="submit" className="w-full" size="lg" isLoading={isSaving} disabled={isSaving || isImageUploading}>
              <Save className="h-5 w-5 mr-2" />
              {isImageUploading ? 'Waiting for uploads...' : isNew ? 'Create Product' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Create Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Create New Category"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name"
            value={newCategory.name}
            onChange={handleCategoryNameChange}
            required
            placeholder="e.g., Home Decor"
          />

          <Input
            label="URL Slug"
            value={newCategory.slug}
            onChange={(e) =>
              setNewCategory((prev) => ({ ...prev, slug: generateCategorySlug(e.target.value) }))
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
              value={newCategory.description}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
              placeholder="Brief description of this category"
            />
          </div>

          <SingleImageUpload
            label="Category Image (optional)"
            image={newCategory.image_url || null}
            onChange={(url) =>
              setNewCategory((prev) => ({ ...prev, image_url: url || '' }))
            }
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="category_is_active"
              checked={newCategory.is_active}
              onChange={(e) =>
                setNewCategory((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
            />
            <label htmlFor="category_is_active" className="text-gray-300">
              Active (visible on storefront)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingCategory}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
