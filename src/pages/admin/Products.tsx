import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Package, Star, Eye, EyeOff, ChevronUp, ChevronDown, FolderOpen } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { formatPrice, getStockStatus } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

const CLOUDINARY_DELETE_URL = '/.netlify/functions/delete-cloudinary-images';

async function deleteProductImages(productIds: string[]) {
  if (productIds.length === 0) return;

  // Collect all image URLs for the given product IDs
  const { data: imgRows } = await supabase
    .from('product_images')
    .select('image_url')
    .in('product_id', productIds);

  // Also collect variant image URLs
  const { data: variantRows } = await supabase
    .from('product_variants')
    .select('image_url')
    .in('product_id', productIds)
    .not('image_url', 'is', null);

  const urls: string[] = [
    ...((imgRows || []).map((r: { image_url: string }) => r.image_url).filter(Boolean)),
    ...((variantRows || []).map((r: { image_url: string | null }) => r.image_url).filter((u): u is string => Boolean(u))),
  ];

  if (urls.length === 0) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(CLOUDINARY_DELETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ urls }),
    });
  } catch (err) {
    console.warn('Cloudinary cleanup failed (images may need manual removal):', err);
  }
}

export default function AdminProducts() {
  const { products, isLoading, refetch } = useProducts(true);
  const { categories } = useCategories();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' ||
      (categoryFilter === 'uncategorized' ? !product.category_id : product.category_id === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  // Sort by display_order
  const sortedProducts = [...filteredProducts].sort((a, b) =>
    (a.display_order || 0) - (b.display_order || 0)
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);

    try {
      await deleteProductImages([deleteId]);
      const { error } = await supabase.from('products').delete().eq('id', deleteId);
      if (error) throw error;
      refetch();
      addToast('Product deleted', 'success');
    } catch (err) {
      console.error('Error deleting product:', err);
      addToast('Failed to delete product', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const allIds = products.map(p => p.id);
      await deleteProductImages(allIds);
      const { error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      refetch();
      setSelectedProducts(new Set());
      addToast(`Deleted all ${allIds.length} products and their images`, 'success');
    } catch (err) {
      console.error('Error deleting all products:', err);
      addToast('Failed to delete all products', 'error');
    } finally {
      setIsDeletingAll(false);
      setDeleteAllModalOpen(false);
    }
  };

  // Toggle product active status
  const toggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;
      refetch();
      addToast(`Product ${currentStatus ? 'hidden' : 'visible'}`, 'success');
    } catch (err) {
      console.error('Error toggling product:', err);
      addToast('Failed to update product', 'error');
    }
  };

  // Toggle product featured status
  const toggleFeatured = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: !currentStatus })
        .eq('id', productId);

      if (error) throw error;
      refetch();
      addToast(`Product ${currentStatus ? 'unfeatured' : 'featured'}`, 'success');
    } catch (err) {
      console.error('Error toggling featured:', err);
      addToast('Failed to update product', 'error');
    }
  };

  // Quick category change
  const changeCategory = async (productId: string, categoryId: string | null) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ category_id: categoryId })
        .eq('id', productId);

      if (error) throw error;
      refetch();
      addToast('Category updated', 'success');
    } catch (err) {
      console.error('Error changing category:', err);
      addToast('Failed to update category', 'error');
    }
  };

  // Reorder product
  const reorderProduct = async (productId: string, direction: 'up' | 'down') => {
    const index = sortedProducts.findIndex(p => p.id === productId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sortedProducts.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const otherProduct = sortedProducts[newIndex];
    const currentProduct = sortedProducts[index];

    try {
      await Promise.all([
        supabase
          .from('products')
          .update({ display_order: otherProduct.display_order || newIndex })
          .eq('id', currentProduct.id),
        supabase
          .from('products')
          .update({ display_order: currentProduct.display_order || index })
          .eq('id', otherProduct.id),
      ]);

      refetch();
    } catch (err) {
      console.error('Error reordering products:', err);
      addToast('Failed to reorder products', 'error');
    }
  };

  // Bulk select handlers
  const toggleSelectAll = () => {
    if (selectedProducts.size === sortedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(sortedProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Bulk category assign
  const handleBulkCategoryAssign = async () => {
    if (selectedProducts.size === 0) return;
    setIsBulkUpdating(true);

    try {
      const categoryId = bulkCategory === 'uncategorized' ? null : bulkCategory;

      const { error } = await supabase
        .from('products')
        .update({ category_id: categoryId })
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      refetch();
      setSelectedProducts(new Set());
      setBulkCategoryModalOpen(false);
      setBulkCategory('');
      addToast(`Updated ${selectedProducts.size} products`, 'success');
    } catch (err) {
      console.error('Error bulk updating:', err);
      addToast('Failed to update products', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk toggle active
  const handleBulkToggleActive = async (active: boolean) => {
    if (selectedProducts.size === 0) return;
    setIsBulkUpdating(true);

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: active })
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      refetch();
      setSelectedProducts(new Set());
      addToast(`${active ? 'Activated' : 'Deactivated'} ${selectedProducts.size} products`, 'success');
    } catch (err) {
      console.error('Error bulk updating:', err);
      addToast('Failed to update products', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk toggle featured
  const handleBulkToggleFeatured = async (featured: boolean) => {
    if (selectedProducts.size === 0) return;
    setIsBulkUpdating(true);

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: featured })
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      refetch();
      setSelectedProducts(new Set());
      addToast(`${featured ? 'Featured' : 'Unfeatured'} ${selectedProducts.size} products`, 'success');
    } catch (err) {
      console.error('Error bulk updating:', err);
      addToast('Failed to update products', 'error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0D1B2A]">Products</h1>
        <div className="flex items-center gap-3">
          {products.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteAllModalOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          )}
          <Button as={Link} to="/admin/products/new">
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="all">All Categories</option>
          <option value="uncategorized">Uncategorized</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <div className="mb-4 p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl flex flex-wrap items-center gap-3">
          <span className="text-[var(--color-primary)] font-medium">
            {selectedProducts.size} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkCategoryModalOpen(true)}
              disabled={isBulkUpdating}
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              Set Category
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkToggleActive(true)}
              disabled={isBulkUpdating}
            >
              <Eye className="h-4 w-4 mr-1" />
              Show All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkToggleActive(false)}
              disabled={isBulkUpdating}
            >
              <EyeOff className="h-4 w-4 mr-1" />
              Hide All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkToggleFeatured(true)}
              disabled={isBulkUpdating}
            >
              <Star className="h-4 w-4 mr-1" />
              Feature All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProducts(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No products found</p>
            <Button as={Link} to="/admin/products/new">
              Add Your First Product
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-2 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === sortedProducts.length && sortedProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)]"
                    />
                  </th>
                  <th className="py-2 px-1 w-8 text-gray-500 font-medium"></th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Product</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Price</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Stock</th>
                  <th className="text-center py-2 px-1 text-gray-500 font-medium w-10" title="Featured">★</th>
                  <th className="text-center py-2 px-1 text-gray-500 font-medium w-10" title="Visible">👁</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product, index) => {
                  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
                  return (
                    <tr key={product.id} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface)]/50">
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)]"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <div className="flex flex-col">
                          <button
                            onClick={() => reorderProduct(product.id, 'up')}
                            disabled={index === 0}
                            className="text-gray-500 hover:text-[#0D1B2A] disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => reorderProduct(product.id, 'down')}
                            disabled={index === sortedProducts.length - 1}
                            className="text-gray-500 hover:text-[#0D1B2A] disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[var(--color-border)] rounded flex items-center justify-center flex-shrink-0">
                            {product.images?.[0]?.image_url ? (
                              <img
                                src={product.images[0].image_url}
                                alt={product.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <p className="text-[#0D1B2A] font-medium truncate">{product.name}</p>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={product.category_id || ''}
                          onChange={(e) => changeCategory(product.id, e.target.value || null)}
                          className="text-xs px-1.5 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-gray-300 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] max-w-[120px]"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-[var(--color-primary)] font-medium whitespace-nowrap">
                        {formatPrice(product.price)}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">{product.stock_quantity}</span>
                          {stockStatus !== 'in_stock' && (
                            <Badge variant={stockStatus === 'low_stock' ? 'warning' : 'danger'} className="text-xs py-0">
                              {stockStatus === 'low_stock' ? 'Low' : 'Out'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <button
                          onClick={() => toggleFeatured(product.id, product.is_featured)}
                          className={`p-1 rounded transition-colors ${
                            product.is_featured
                              ? 'text-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30'
                              : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10'
                          }`}
                          title={product.is_featured ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star className={`h-4 w-4 ${product.is_featured ? 'fill-current' : ''}`} />
                        </button>
                      </td>
                      <td className="py-2 px-1 text-center">
                        <button
                          onClick={() => toggleActive(product.id, product.is_active)}
                          className={`p-1 rounded transition-colors ${
                            product.is_active
                              ? 'text-green-400 bg-green-400/20 hover:bg-green-400/30'
                              : 'text-gray-500 hover:text-green-400 hover:bg-green-400/10'
                          }`}
                          title={product.is_active ? 'Hide product' : 'Show product'}
                        >
                          {product.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteId(product.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Product"
      >
        <p className="text-gray-400 mb-6">
          Are you sure you want to delete this product? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* Bulk Category Assign Modal */}
      <Modal
        isOpen={bulkCategoryModalOpen}
        onClose={() => setBulkCategoryModalOpen(false)}
        title="Assign Category"
      >
        <p className="text-gray-400 mb-4">
          Assign {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} to a category:
        </p>
        <select
          value={bulkCategory}
          onChange={(e) => setBulkCategory(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-6"
        >
          <option value="">Select a category...</option>
          <option value="uncategorized">Uncategorized</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={() => setBulkCategoryModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkCategoryAssign}
            isLoading={isBulkUpdating}
            disabled={!bulkCategory}
          >
            Assign Category
          </Button>
        </div>
      </Modal>

      {/* Delete All Confirmation Modal */}
      <Modal
        isOpen={deleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        title="Delete All Products"
      >
        <p className="text-gray-400 mb-2">
          This will permanently delete <span className="text-[#0D1B2A] font-semibold">all {products.length} products</span> and remove their images from Cloudinary.
        </p>
        <p className="text-red-400 text-sm mb-6">This action cannot be undone.</p>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={() => setDeleteAllModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAll} isLoading={isDeletingAll}>
            Delete All {products.length} Products
          </Button>
        </div>
      </Modal>
    </div>
  );
}
