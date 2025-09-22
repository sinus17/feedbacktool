import { supabase } from '../lib/supabase';

export async function uploadProfilePicture(userId: string, file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return null;
  }
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl } as any)
      .eq('id' as any, userId as any);

    if (error) {
      console.error('Error updating avatar:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user avatar:', error);
    return false;
  }
}
