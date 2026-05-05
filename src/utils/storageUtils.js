import { supabase } from '../supabase';

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - Bucket name (default: 'image')
 * @param {string} path - Optional folder path within bucket
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadFileToStorage(file, bucket = 'image', path = '') {
    try {
        if (!file) {
            throw new Error('No file provided for upload');
        }

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = path ? `${path}/${fileName}` : fileName;

        console.log(`Uploading file to Supabase Storage: ${filePath}`);

        // Convert File to ArrayBuffer to avoid HTTP2 protocol errors in some environments
        const fileBuffer = await file.arrayBuffer();

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase Storage upload error:', error);
            throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        console.log(`File uploaded successfully: ${publicUrl}`);

        return {
            url: publicUrl,
            path: filePath
        };
    } catch (error) {
        console.error('Error uploading file to Supabase Storage:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - Path to the file in storage
 * @param {string} bucket - Bucket name (default: 'image')
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFileFromStorage(filePath, bucket = 'image') {
    try {
        if (!filePath) {
            throw new Error('No file path provided for deletion');
        }

        console.log(`Deleting file from Supabase Storage: ${filePath}`);

        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error('Supabase Storage deletion error:', error);
            throw error;
        }

        console.log(`File deleted successfully: ${filePath}`);
        return true;
    } catch (error) {
        console.error('Error deleting file from storage:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}
