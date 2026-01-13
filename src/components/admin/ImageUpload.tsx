import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  bucket?: string;
  maxImages?: number;
}

// Timeout for uploads (30 seconds)
const UPLOAD_TIMEOUT = 30000;

export default function ImageUpload({
  images,
  onChange,
  bucket = 'product-images',
  maxImages = 20,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Images must be under 5MB');
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timed out after 30 seconds')), UPLOAD_TIMEOUT);
    });

    // Upload with timeout
    const uploadPromise = supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload');
    }

    // Get and verify public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!publicUrl) {
      throw new Error('Failed to get image URL');
    }

    return publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed. You can add ${maxImages - images.length} more.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(`Uploading 0/${fileArray.length}...`);

    const newImages: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Uploading ${i + 1}/${fileArray.length}...`);

      try {
        const url = await uploadSingleFile(file);
        if (url) {
          newImages.push(url);
        }
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    // Update state with successfully uploaded images
    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }

    // Show errors if any
    if (errors.length > 0) {
      if (errors.length === fileArray.length) {
        setError(`All uploads failed. ${errors[0]}`);
      } else {
        setError(`${newImages.length}/${fileArray.length} uploaded. Failed: ${errors.join(', ')}`);
      }
    }

    setIsUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (index: number) => {
    const imageUrl = images[index];

    // Update UI immediately for responsiveness
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);

    // Then try to delete from storage (non-blocking)
    try {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        // Don't await - let it happen in background
        supabase.storage.from(bucket).remove([fileName]).catch(err => {
          console.error('Failed to delete from storage (non-critical):', err);
        });
      }
    } catch (err) {
      console.error('Failed to parse filename for deletion:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        Array.from(files).forEach(f => dt.items.add(f));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isUploading
            ? 'border-brand-neon/50 cursor-wait'
            : 'border-brand-gray cursor-pointer hover:border-brand-neon/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-brand-neon animate-spin" />
            <p className="text-brand-neon text-sm font-medium">{uploadProgress}</p>
            <p className="text-gray-500 text-xs">Please wait...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-gray-500" />
            <p className="text-gray-400 text-sm">
              Click or drag images to upload
            </p>
            <p className="text-gray-500 text-xs">
              Max {maxImages} images, 5MB each
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative group aspect-square rounded-lg overflow-hidden bg-brand-gray"
            >
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Show placeholder if image fails to load
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="12">Error</text></svg>';
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {index === 0 && (
                <span className="absolute top-1 left-1 bg-brand-neon text-brand-black text-xs px-2 py-0.5 rounded font-medium">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !isUploading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <ImageIcon className="h-4 w-4" />
          <span>No images uploaded yet</span>
        </div>
      )}

      {/* Image count */}
      {images.length > 0 && (
        <p className="text-gray-500 text-xs text-right">
          {images.length}/{maxImages} images
        </p>
      )}
    </div>
  );
}
