import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle, X, Image as ImageIcon, Upload } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import ImageUpload from '../../components/admin/ImageUpload';
import { supabase } from '../../lib/supabase';
import { slugify } from '../../lib/utils';
import { useCategories } from '../../hooks/useCategories';

interface Variant {
  id?: string;
  name: string;
  sku: string;
  price_adjustment: string;
  stock_quantity: string;
  image_url: string;
}

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const { categories } = useCategories({ includeInactive: true });

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState<{ message: string; details?: string } | null>(null);
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

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
          track_inventory: data.track_inventory,
          continue_selling_when_out_of_stock: data.continue_selling_when_out_of_stock,
          print_time_hours: data.print_time_hours?.toString() || '',
          weight_oz: data.weight_oz?.toString() || '',
        });

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

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Auto-generate slug from name
    if (name === 'name') {
      setFormData((prev) => ({
        ...prev,
        slug: slugify(value),
      }));
    }
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', sku: '', price_adjustment: '0', stock_quantity: '0', image_url: '' }]);
  };

  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    try {
      const ext = file.name.split('.').pop();
      const fileName = `variant-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      updateVariant(index, 'image_url', publicUrl);
    } catch (err) {
      console.error('Failed to upload variant image:', err);
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
          const imageRecords = images.map((img, index) => ({
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
            .map((v, index) => ({
              product_id: productId,
              name: v.name,
              sku: v.sku || null,
              price_adjustment: parseFloat(v.price_adjustment) || 0,
              stock_quantity: parseInt(v.stock_quantity) || 0,
              display_order: index,
              image_url: v.image_url || null,
            }));

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
      }

      console.log('Product saved successfully!');
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

      <h1 className="text-3xl font-bold text-white mb-8">
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
                <h3 className="text-lg font-semibold text-white mb-2">Error Saving Product</h3>
                <p className="text-red-400 mb-2">{error.message}</p>
                {error.details && (
                  <p className="text-gray-400 text-sm bg-brand-black/50 p-2 rounded font-mono">{error.details}</p>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-gray-400 hover:text-white transition-colors"
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
              <h2 className="text-xl font-semibold text-white mb-4">Product Information</h2>
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
                    className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Pricing</h2>
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

            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Inventory</h2>
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
              <h2 className="text-xl font-semibold text-white mb-4">Additional Info</h2>
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
                  <h2 className="text-xl font-semibold text-white">Options / Variants</h2>
                  <p className="text-gray-400 text-sm mt-1">Add different colors, sizes, or options</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>

              {variants.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-brand-gray rounded-lg">
                  <p className="text-gray-400">No variants added yet</p>
                  <p className="text-gray-500 text-sm mt-1">Click "Add Option" to create variants like colors or sizes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div
                      key={index}
                      className="p-4 bg-brand-black rounded-lg border border-brand-gray"
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
                      <div className="mt-4 pt-4 border-t border-brand-gray">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Variant Image
                        </label>
                        <div className="flex items-center gap-4">
                          {variant.image_url ? (
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
                            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-brand-gray flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-500" />
                            </div>
                          )}

                          <div className="flex-1 flex flex-wrap gap-2">
                            {/* Select from product images */}
                            {images.length > 0 && (
                              <select
                                value={variant.image_url}
                                onChange={(e) => updateVariant(index, 'image_url', e.target.value)}
                                className="px-3 py-1.5 bg-brand-charcoal border border-brand-gray rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-neon"
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
                            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-charcoal border border-brand-gray rounded-lg text-gray-300 text-sm cursor-pointer hover:border-brand-neon/50 transition-colors">
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
              <h2 className="text-xl font-semibold text-white mb-4">Status</h2>
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
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Category</h2>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
              >
                <option value="">No Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{!category.is_active ? ' (Inactive)' : ''}
                  </option>
                ))}
              </select>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Images</h2>
              <ImageUpload
                images={images}
                onChange={setImages}
                bucket="product-images"
                maxImages={20}
              />
            </Card>

            <Button type="submit" className="w-full" size="lg" isLoading={isSaving}>
              <Save className="h-5 w-5 mr-2" />
              {isNew ? 'Create Product' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
