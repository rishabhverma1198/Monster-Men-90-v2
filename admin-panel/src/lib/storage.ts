/**
 * Storage Utilities for Supabase
 * Handles image and video uploads
 */

import { supabase } from './supabase';

export async function uploadImage(file: File, gender?: 'men' | 'women'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  // Use gender-specific bucket if provided, otherwise use default
  const bucket = gender === 'men' ? 'men-products' : gender === 'women' ? 'women-products' : 'product-images';
  const filePath = gender ? `${gender}-products/${fileName}` : `product-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadVideo(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `product-videos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-videos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Video upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('product-videos').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
}
