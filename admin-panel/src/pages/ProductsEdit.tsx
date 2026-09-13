import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, X, Video, Image as ImageIcon } from 'lucide-react';
import { productApi } from '../lib/api';
import { compressVideoFile } from '../utils/videoCompression';
import { compressImage } from '../utils/imageCompression';
import VariantManager from '../components/features/VariantManager';

/**
 * Product Update Schema
 */
const updateProductSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  price: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
    message: 'Price must be a positive number',
  }).optional(),
  wholesalePrice: z.string().optional(),
  moq: z.string().optional(),
  category: z.string().min(2, 'Category is required').optional(),
  gender: z.enum(['men', 'women', 'unisex']).optional(),
  stock: z.string().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
    message: 'Stock must be a non-negative number',
  }).optional(),
  is_active: z.boolean().optional(),
});

type UpdateProductFormData = z.infer<typeof updateProductSchema>;

/**
 * Edit Product Page
 */
export default function ProductsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UpdateProductFormData>({
    resolver: zodResolver(updateProductSchema),
  });

  const [categorySource, setCategorySource] = useState<'Men' | 'Women' | 'New Trend' | 'other'>('Men');

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const product = await productApi.getProductById(id!);
      const cat = product.category || '';
      const preset = ['Men', 'Women', 'New Trend'].includes(cat) ? (cat as 'Men' | 'Women' | 'New Trend') : null;
      reset({
        name: product.title,
        description: product.description,
        price: product.price_buyer.toString(),
        wholesalePrice: product.price_wholesale?.toString() || '',
        moq: product.wholesale_moq?.toString() || '10',
        category: preset ?? cat,
        gender: (product as any).gender || 'unisex',
        stock: product.stock.toString(),
        is_active: product.is_active,
      });
      setCategorySource(preset ?? 'other');
      // Set images (support multiple)
      if (product.image_urls && product.image_urls.length > 0) {
        setUploadedImageUrls(product.image_urls);
      } else if (product.image_url) {
        setUploadedImageUrls([product.image_url]);
      }
      
      // Set video if available
      if ((product as any).video_url) {
        setUploadedVideoUrl((product as any).video_url);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      // Compress image before upload (client-side compression)
      console.log(`Compressing image: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      const compressedFile = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        quality: 0.8,
      });
      console.log(`Compressed to: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);

      const formData = new FormData();
      formData.append('file', compressedFile);
      // Get gender from form if available
      const genderInput = document.querySelector('select[name="gender"]') as HTMLSelectElement;
      const genderValue = genderInput?.value;
      if (genderValue && (genderValue === 'men' || genderValue === 'women')) {
        formData.append('gender', genderValue);
      }
      
      const response = await productApi.uploadFile(formData);
      setUploadedImageUrls(prev => [...prev, response.url]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }

    setUploadingVideo(true);
    setError(null);

    try {
      // Compress video before upload (client-side compression)
      console.log(`Compressing video: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      const compressedFile = await compressVideoFile(file, {
        maxSizeMB: 5,
        quality: 0.7,
      });
      console.log(`Compressed to: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);

      const formData = new FormData();
      formData.append('file', compressedFile);
      const genderInput = document.querySelector('select[name="gender"]') as HTMLSelectElement;
      const genderValue = genderInput?.value;
      if (genderValue && (genderValue === 'men' || genderValue === 'women')) {
        formData.append('gender', genderValue);
      }
      
      const response = await productApi.uploadFile(formData);
      setUploadedVideoUrl(response.url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Video upload failed');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: UpdateProductFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      
      if (data.name !== undefined) formData.append('name', data.name);
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.price !== undefined) formData.append('price', data.price);
      if (data.category !== undefined) formData.append('category', data.category);
      if (data.gender !== undefined) formData.append('gender', data.gender);
      if (data.stock !== undefined) formData.append('stock', data.stock);
      if (data.wholesalePrice && data.wholesalePrice.trim() !== '') {
        formData.append('wholesalePrice', data.wholesalePrice);
      }
      if (data.moq && data.moq.trim() !== '') {
        formData.append('moq', data.moq);
      }
      if (data.is_active !== undefined) {
        formData.append('is_active', data.is_active.toString());
      }
      
      // Add multiple images
      if (uploadedImageUrls.length > 0) {
        uploadedImageUrls.forEach((url, index) => {
          formData.append(`image_urls[${index}]`, url);
        });
        // Also set first image as primary
        formData.append('image_url', uploadedImageUrls[0]);
      }
      
      // Add video if uploaded
      if (uploadedVideoUrl) {
        formData.append('video_url', uploadedVideoUrl);
      }

      await productApi.updateProduct(id!, formData);
      navigate('/dashboard/products');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update product';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/dashboard/products"
          className="p-2 hover:bg-white/10 rounded-lg transition-all"
          aria-label="Go back to products"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Edit Product</h1>
          <p className="text-gray-400">Update product information</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 space-y-6">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Product Name
          </label>
          <input
            type="text"
            {...register('name')}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="Enter product description"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
          )}
        </div>

        {/* Price and Stock Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('price')}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0.00"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-400">{errors.price.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Stock
            </label>
            <input
              type="number"
              {...register('stock')}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0"
            />
            {errors.stock && (
              <p className="mt-1 text-sm text-red-400">{errors.stock.message}</p>
            )}
          </div>
        </div>

        {/* Wholesale Price and MOQ Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Wholesale Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('wholesalePrice')}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Minimum Order Quantity
            </label>
            <input
              type="number"
              {...register('moq')}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="10"
            />
          </div>
        </div>

          {/* Gender Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Gender Category
          </label>
          <select
            {...register('gender')}
            name="gender"
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-sm text-red-400">{errors.gender.message}</p>
          )}
        </div>

        {/* Category: Men / Women / New Trend / Other */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Category
          </label>
          <select
            value={categorySource}
            onChange={(e) => {
              const v = e.target.value as 'Men' | 'Women' | 'New Trend' | 'other';
              setCategorySource(v);
              if (v !== 'other') setValue('category', v, { shouldValidate: true });
              else setValue('category', '', { shouldValidate: false });
            }}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Category"
          >
            <option value="Men">Men</option>
            <option value="Women">Women</option>
            <option value="New Trend">New Trend</option>
            <option value="other">Other (custom)</option>
          </select>
          {categorySource === 'other' && (
            <div className="mt-3">
              <input
                type="text"
                {...register('category', { minLength: { value: 2, message: 'Category must be at least 2 characters' } })}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., T-Shirts, Hoodies, Jeans"
              />
              {errors.category && (
                <p className="mt-1 text-sm text-red-400">{errors.category.message}</p>
              )}
            </div>
          )}
          {categorySource !== 'other' && errors.category && (
            <p className="mt-1 text-sm text-red-400">{errors.category.message}</p>
          )}
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('is_active')}
              className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm font-semibold text-gray-300">Product is active</span>
          </label>
        </div>

        {/* Multiple Images Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Product Images <span className="text-gray-500">(Multiple images supported)</span>
          </label>
          
          {/* Display uploaded images */}
          {uploadedImageUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {uploadedImageUrls.map((url, index) => (
                <div key={index} className="relative bg-gray-800 rounded-lg border border-gray-700 p-2">
                  <img
                    src={url}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-auto max-h-40 object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg backdrop-blur-sm"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-purple-500/80 text-white text-xs rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Upload new image */}
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                for (const file of files) {
                  if (file) {
                    await handleImageUpload(file);
                  }
                }
              }}
              className="hidden"
              id="image-upload-edit"
              disabled={uploadingImage}
            />
            <label
              htmlFor="image-upload-edit"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    <span className="text-gray-400">Compressing & Uploading...</span>
                  </>
                ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                  <span className="text-gray-400">Click to upload images</span>
                  <span className="text-sm text-gray-500">PNG, JPG, WEBP up to 10MB each</span>
                  <span className="text-xs text-gray-500">You can upload multiple images</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Variant Management */}
        {id && (
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <VariantManager productId={id} />
          </div>
        )}

        {/* Video Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Product Video <span className="text-gray-500">(Optional - Short video, auto-compressed)</span>
          </label>
          
          {uploadedVideoUrl ? (
            <div className="relative bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center p-4">
              <div className="relative w-full max-w-md mx-auto">
                <video
                  src={uploadedVideoUrl}
                  controls
                  className="w-full h-auto max-h-80 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setUploadedVideoUrl(null)}
                  className="absolute top-2 right-2 p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg backdrop-blur-sm"
                  aria-label="Remove video"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleVideoUpload(file);
                  }
                }}
                className="hidden"
                id="video-upload-edit"
                disabled={uploadingVideo}
              />
              <label
                htmlFor="video-upload-edit"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                {uploadingVideo ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    <span className="text-gray-400">Compressing & Uploading...</span>
                    <span className="text-xs text-gray-500">This may take a moment...</span>
                  </>
                ) : (
                  <>
                    <Video className="h-8 w-8 text-gray-400" />
                    <span className="text-gray-400">Click to upload video</span>
                    <span className="text-sm text-gray-500">MP4, WEBM up to 50MB (auto-compressed)</span>
                  </>
                )}
              </label>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
          <Link
            to="/dashboard/products"
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Product</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
