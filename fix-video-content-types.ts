import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://wrlgoxbzlngdtomjhvnz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjU3MjY5MywiZXhwIjoyMDQyMTQ4NjkzfQ.EvqhQNxiWLCMuGMmBcz3Xg0yEqJXm5vZBvPVqZ_WFQY'
)

async function fixVideoContentTypes() {
  // Get all video files
  const { data: files, error } = await supabase.storage
    .from('library-videos')
    .list('', {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (error) {
    console.error('Error listing files:', error)
    return
  }

  console.log(`Found ${files.length} files`)

  for (const file of files) {
    if (file.name.endsWith('.mp4')) {
      console.log(`Updating ${file.name}...`)
      
      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('library-videos')
        .download(file.name)
      
      if (downloadError) {
        console.error(`Error downloading ${file.name}:`, downloadError)
        continue
      }

      // Re-upload with correct content type
      const { error: uploadError } = await supabase.storage
        .from('library-videos')
        .upload(file.name, fileData, {
          contentType: 'video/mp4',
          upsert: true
        })

      if (uploadError) {
        console.error(`Error uploading ${file.name}:`, uploadError)
      } else {
        console.log(`✅ Fixed ${file.name}`)
      }
    }
  }

  console.log('Done!')
}

fixVideoContentTypes()
