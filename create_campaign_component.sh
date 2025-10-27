#!/bin/bash

# Read the original component and modify it for feedback-tool
sed 's/from-dark-900 via-dark-800 to-dark-900/bg-black/g' /Users/philipplutzenburger/reporting/reporting/src/pages/NewReleaseSubmission.tsx | \
sed 's/bg-dark-800\/50/bg-black/g' | \
sed 's/border-dark-600/border-gray-800/g' | \
sed 's/bg-dark-700/bg-gray-900/g' | \
sed 's/text-gray-300/text-white/g' | \
sed 's/text-gray-400/text-gray-400/g' | \
sed 's/text-blue-400/text-[#0000fe]/g' | \
sed 's/bg-blue-500/bg-[#0000fe]/g' | \
sed 's/border-blue-500/border-[#0000fe]/g' | \
sed 's/hover:border-blue-400/hover:border-[#0000fe]/g' | \
sed 's/focus:ring-blue-500/focus:ring-[#0000fe]/g' | \
sed "s/'#0000fe'/'#0000fe'/g" | \
sed 's/uydhsjvwrgupgfjevqsz/wrlgoxbzlngdtomjhvnz/g' | \
sed 's/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZGhzanZ3cmd1cGdmamV2cXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NDAzNjcsImV4cCI6MjA0ODExNjM2N30.xfCQFURkzjvBrVnF5ap5OAytCmo3cWqM7PmIcBTVZLk/${VITE_SUPABASE_ANON_KEY}/g' | \
sed 's/NewReleaseSubmission/NewCampaignSubmission/g' | \
sed 's/ReleaseSubmissionData/CampaignSubmissionData/g' > /Users/philipplutzenburger/feedbacktool/feedbacktool/src/pages/NewCampaignSubmission.tsx

