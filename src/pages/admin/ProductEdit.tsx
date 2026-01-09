import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
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
}

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const { categories } = useCategories();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
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
    setVariants([...variants, { name: '', sku: '', price_adjustment: '0', stock_quantity: '0' }]);
  };

  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku: formData.sku || null,
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        track_inventory: formData.track_inventory,
        continue_selling_when_out_of_stock: formData.continue_selling_when_out_of_stock,
        print_time_hours: formData.print_time_hours ? parseInt(formData.print_time_hours) : null,
        weight_oz: formData.weight_oz ? parseFloat(formData.weight_oz) : null,
      };

      let productId = id;

      if (isNew) {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();
        if (error) throw error;
        productId = newProduct.id;
      } else {
        const { error } = await supabase.from('products').update(productData).eq('id', id);
        if (error) throw error;
      }

      // Save images
      if (productId) {
        // Delete existing images
        await supabase.from('product_images').delete().eq('product_id', productId);

        // Insert new images
        if (images.length > 0) {
          const imageRecords = images.map((img, index) => ({
            product_id: productId,
            image_url: img,
            display_order: index,
            is_primary: index === 0,
          }));

          const { error: imgError } = await supabase
            .from('product_images')
            .insert(imageRecords);

          if (imgError) throw imgError;
        }

        // Save variants
        // Delete existing variants
        await supabase.from('product_variants').delete().eq('product_id', productId);

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
            }));

          if (variantRecords.length > 0) {
            const { error: varError } = await supabase
              .from('product_variants')
              .insert(variantRecords);

            if (varError) throw varError;
          }
        }
      }

      navigate('/admin/products');
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product. Please try again.');
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
                    {category.name}
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
                maxImages={5}
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
