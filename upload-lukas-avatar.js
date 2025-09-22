import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrlgoxbzlngdtomjhvnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA3ODcyOTAsImV4cCI6MjAyNjM2MzI5MH0.cGVhMhfBxPjjqxqQKdmjqPtqhN6Qg6Qg6Qg6Qg6Qg6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLukasAvatar() {
  try {
    const userId = '489c2b58-3aaf-49f8-9127-6bcbad0c458e';
    const filePath = './public/lukas-profile.png';
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = `${Math.random()}.png`;
    const storagePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/png'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    console.log('Uploaded successfully! URL:', urlData.publicUrl);

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    console.log('Profile updated successfully for Lukas Rettenegger!');
    console.log('New avatar URL:', urlData.publicUrl);

  } catch (error) {
    console.error('Error:', error);
  }
}

uploadLukasAvatar();
