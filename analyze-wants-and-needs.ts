import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://wrlgoxbzlngdtomjhvnz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0OTA3NzcsImV4cCI6MjA0ODA2Njc3N30.ZCAreV5YsR26maw8QrulmTq7GSXvfpYuKXP-ocTfhtk'
)

async function analyzeWantsAndNeedsVideos() {
  console.log('🔍 Searching for "Wants and Needs" videos from @wantsandneedsbrand_...')
  
  // Search for all videos from wantsandneedsbrand_
  const { data: videos, error } = await supabase
    .from('video_library')
    .select('*')
    .eq('account_username', 'wantsandneedsbrand_')
  
  if (error) {
    console.error('❌ Error fetching videos:', error)
    return
  }
  
  console.log(`📹 Found ${videos.length} videos`)
  
  if (videos.length === 0) {
    console.log('No videos found matching "Wants and Needs"')
    return
  }
  
  // Display found videos
  console.log('\n📋 Videos found:')
  videos.forEach((video, index) => {
    console.log(`${index + 1}. ${video.video_id} - ${video.music_title || 'No title'} - ${video.account_username}`)
  })
  
  console.log('\n🔄 Starting re-analysis...\n')
  
  for (const video of videos) {
    console.log(`\n📹 Processing: ${video.video_id}`)
    console.log(`   Music: ${video.music_title || 'N/A'}`)
    console.log(`   Account: @${video.account_username}`)
    
    try {
      // Call the trending analysis edge function
      console.log('   🤖 Calling trending analysis...')
      const response = await fetch('https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/analyze-trending-gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0OTA3NzcsImV4cCI6MjA0ODA2Njc3N30.ZCAreV5YsR26maw8QrulmTq7GSXvfpYuKXP-ocTfhtk`
        },
        body: JSON.stringify({ videoId: video.id })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`   ❌ Analysis failed: ${response.status} - ${errorText}`)
        continue
      }
      
      const result = await response.json()
      console.log('   ✅ Analysis completed')
      
      // Mark as adaptable
      console.log('   ⚡ Marking as adaptable...')
      const { error: updateError } = await supabase
        .from('video_library')
        .update({ is_adaptable: true })
        .eq('id', video.id)
      
      if (updateError) {
        console.error(`   ❌ Failed to mark as adaptable:`, updateError)
      } else {
        console.log('   ✅ Marked as adaptable')
      }
      
      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.error(`   ❌ Error processing video:`, error)
    }
  }
  
  console.log('\n✨ All done!')
  console.log(`\n📊 Summary:`)
  console.log(`   Total videos processed: ${videos.length}`)
}

// Run the script
analyzeWantsAndNeedsVideos().catch(console.error)
