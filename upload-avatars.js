import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wrlgoxbzlngdtomjhvnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA3ODcyOTAsImV4cCI6MjAyNjM2MzI5MH0.cGVhMhfBxPjjqxqQKdmjqPtqhN6Qg6Qg6Qg6Qg6Qg6Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadAvatar(userId, userName, filePath) {
  try {
    console.log(`Uploading avatar for ${userName}...`);
    
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
      console.error(`Upload error for ${userName}:`, uploadError);
      return false;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    console.log(`Uploaded successfully for ${userName}! URL:`, urlData.publicUrl);

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error(`Update error for ${userName}:`, updateError);
      return false;
    }

    console.log(`Profile updated successfully for ${userName}!`);
    return true;

  } catch (error) {
    console.error(`Error uploading avatar for ${userName}:`, error);
    return false;
  }
}

async function uploadAllAvatars() {
  const users = [
    {
      id: '489c2b58-3aaf-49f8-9127-6bcbad0c458e',
      name: 'Lukas Rettenegger',
      filePath: './public/lukas-profile.png'
    },
    {
      id: '53d3bfc7-bc1e-4ac1-a119-f3d98e00a301',
      name: 'Martijn Reijnders',
      filePath: './public/martijn.png'
    }
  ];

  for (const user of users) {
    const success = await uploadAvatar(user.id, user.name, user.filePath);
    if (!success) {
      console.error(`Failed to upload avatar for ${user.name}`);
    }
    console.log('---');
  }
}

uploadAllAvatars();
