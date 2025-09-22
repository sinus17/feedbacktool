import { useState, useEffect } from 'react';
import { Clock, Loader, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ArtistTimeData {
  artistId: string;
  artistName: string;
  totalVideoTime: number; // in seconds
  totalFeedbackTime: number; // in seconds
  submissionCount: number;
  totalTime: number; // video time + feedback time
}

interface UserTimeData {
  userId: string;
  userName: string;
  dailyTime: { [date: string]: number }; // seconds per day
  weeklyTime: { [week: string]: number }; // seconds per week
  monthlyTime: { [month: string]: number }; // seconds per month
  yearlyTime: { [year: string]: number }; // seconds per year
  totalTime: number;
  dailyFeedbacks: { [date: string]: {
    time: string;
    submissionId: string;
    projectName: string;
    duration: number;
  }[] }; // detailed feedback info per day
}

interface TimeBlock {
  startTime: string;
  endTime: string;
  feedbacks: {
    time: string;
    submissionId: string;
    projectName: string;
    duration: number;
  }[];
  totalDuration: number;
}

interface TimeBreakdownData {
  artistTimeData: ArtistTimeData[];
  userTimeData: UserTimeData[];
  totalProjectTime: number;
  totalSubmissions: number;
  totalFeedbacks: number;
}

export const TimeBreakdown = () => {
  const [data, setData] = useState<TimeBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [activeView, setActiveView] = useState<'artists' | 'users'>('artists');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [selectedDateBlocks, setSelectedDateBlocks] = useState<{
    date: string;
    userName: string;
    blocks: TimeBlock[];
  } | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [submissionMessages, setSubmissionMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchTimeBreakdownData();
  }, []);

  // Function to merge feedbacks for same video within 5-minute window
  const mergeSameVideoFeedbacks = (feedbacks: {
    time: string;
    submissionId: string;
    projectName: string;
    duration: number;
  }[]) => {
    if (feedbacks.length === 0) return [];
    
    // Sort feedbacks by time
    const sortedFeedbacks = [...feedbacks].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    const mergedFeedbacks = [];
    
    for (let i = 0; i < sortedFeedbacks.length; i++) {
      const feedback = sortedFeedbacks[i];
      
      // Check if this feedback can be merged with the last merged feedback
      if (mergedFeedbacks.length > 0) {
        const lastMerged = mergedFeedbacks[mergedFeedbacks.length - 1];
        const timeDiff = new Date(feedback.time).getTime() - new Date(lastMerged.time).getTime();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Merge if same project and within 5 minutes
        if (lastMerged.projectName === feedback.projectName && timeDiff <= fiveMinutes) {
          // Update the end time and accumulate duration
          lastMerged.time = feedback.time; // Use latest time as end time
          lastMerged.duration += feedback.duration;
          continue;
        }
      }
      
      // Add as new feedback (not merged)
      mergedFeedbacks.push({ ...feedback });
    }
    
    return mergedFeedbacks;
  };

  // Function to group feedbacks into time blocks with 15-minute gaps
  const groupFeedbacksIntoBlocks = (feedbacks: {
    time: string;
    submissionId: string;
    projectName: string;
    duration: number;
  }[]): TimeBlock[] => {
    if (feedbacks.length === 0) return [];
    
    // First merge same video feedbacks within 5-minute windows
    const mergedFeedbacks = mergeSameVideoFeedbacks(feedbacks);
    
    // Sort merged feedbacks by time
    const sortedFeedbacks = [...mergedFeedbacks].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    const blocks: TimeBlock[] = [];
    
    for (let i = 0; i < sortedFeedbacks.length; i++) {
      const feedback = sortedFeedbacks[i];
      
      if (blocks.length === 0) {
        // Start first block
        blocks.push({
          startTime: feedback.time,
          endTime: feedback.time,
          feedbacks: [feedback],
          totalDuration: 0
        });
      } else {
        const currentBlock = blocks[blocks.length - 1];
        const lastFeedbackTime = new Date(currentBlock.endTime);
        const feedbackTime = new Date(feedback.time);
        const timeDiff = feedbackTime.getTime() - lastFeedbackTime.getTime();
        const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        if (timeDiff <= fifteenMinutes) {
          // Add to current block
          currentBlock.feedbacks.push(feedback);
          currentBlock.endTime = feedback.time;
        } else {
          // Start new block
          blocks.push({
            startTime: feedback.time,
            endTime: feedback.time,
            feedbacks: [feedback],
            totalDuration: 0
          });
        }
      }
    }
    
    // Calculate total duration for each block as sum of individual feedback durations
    blocks.forEach(block => {
      let totalDuration = 0;
      block.feedbacks.forEach((feedback, index) => {
        if (index === 0) {
          feedback.duration = 5 * 60; // 5 minutes for first feedback in block
          totalDuration += 5 * 60;
        } else {
          const previousTime = new Date(block.feedbacks[index - 1].time);
          const currentTime = new Date(feedback.time);
          const actualDuration = Math.round((currentTime.getTime() - previousTime.getTime()) / 1000);
          feedback.duration = actualDuration; // Store actual duration in feedback object
          totalDuration += actualDuration;
        }
      });
      block.totalDuration = totalDuration;
    });
    
    return blocks;
  };

  const fetchTimeBreakdownData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ALL submissions with pagination to avoid 1000 row limit
      let allSubmissions: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: submissions, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            id,
            artist_id,
            video_url,
            project_name,
            created_at,
            updated_at,
            artists (
              id,
              name
            ),
            messages (
              id,
              created_at,
              is_admin,
              user_id
            )
          `)
          .range(from, from + pageSize - 1);

        if (submissionsError) throw submissionsError;

        if (submissions && submissions.length > 0) {
          allSubmissions = [...allSubmissions, ...submissions];
          from += pageSize;
          hasMore = submissions.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Fetch WhatsApp logs for deleted videos and feedback
      const { data: whatsappLogs, error: logsError } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('type', 'video_deleted' as any);

      if (logsError) throw logsError;

      // Process the data to calculate time per artist
      const artistTimeMap = new Map<string, ArtistTimeData>();

      // First, add deleted videos from WhatsApp logs to submission counts
      whatsappLogs?.forEach((log: any) => {
        try {
          const metadata = log.metadata || {};
          const artistId = metadata.artist_id;
          
          if (artistId && log.type === 'video_deleted') {
            // Get artist name from metadata or use default
            const artistName = metadata.artist_name || 'Unknown Artist';
            
            // Skip INTERN // Social Media entries
            if (artistName === 'INTERN // Social Media') {
              return;
            }
            
            if (!artistTimeMap.has(artistId)) {
              artistTimeMap.set(artistId, {
                artistId,
                artistName,
                totalVideoTime: 0,
                totalFeedbackTime: 0,
                submissionCount: 0,
                totalTime: 0,
              });
            }
            
            // Add deleted videos from WhatsApp logs (use 30 seconds default)
            const deletedVideoLength = 30; // 30 seconds default for deleted videos
            const deletedVideoIterations = 1; // Assume 1 iteration for deleted videos
            const deletedVideoTimeTotal = deletedVideoLength * deletedVideoIterations;
            const deletedFeedbackTimeTotal = (1.5 * 60) * deletedVideoIterations;
            
            const artistData = artistTimeMap.get(artistId)!;
            artistData.totalVideoTime += deletedVideoTimeTotal;
            artistData.totalFeedbackTime += deletedFeedbackTimeTotal;
            artistData.submissionCount += 1;
          }
        } catch (e) {
          // Skip invalid log entries
        }
      });

      // Collect all feedbacks by artist for actual time calculation
      const artistFeedbackMap = new Map<string, any[]>();
      
      allSubmissions?.forEach((submission: any) => {
        const artistId = submission.artist_id;
        const artistName = submission.artists?.name || 'Unknown Artist';
        
        // Skip INTERN // Social Media entries
        if (artistName === 'INTERN // Social Media') {
          return;
        }

        if (!artistTimeMap.has(artistId)) {
          artistTimeMap.set(artistId, {
            artistId,
            artistName,
            totalVideoTime: 0,
            totalFeedbackTime: 0,
            submissionCount: 0,
            totalTime: 0,
          });
        }

        const artistData = artistTimeMap.get(artistId)!;
        artistData.submissionCount += 1;
        
        // Collect feedbacks for this artist
        const adminFeedbacks = submission.messages?.filter((msg: any) => msg.is_admin) || [];
        const projectName = `${artistName} - ${submission.project_name || 'Untitled Project'}`;
        
        if (!artistFeedbackMap.has(artistId)) {
          artistFeedbackMap.set(artistId, []);
        }
        
        adminFeedbacks.forEach((message: any) => {
          artistFeedbackMap.get(artistId)!.push({
            time: message.created_at,
            submissionId: submission.id,
            projectName: projectName,
            duration: 5 * 60 // Will be recalculated in blocks
          });
        });
      });

      // Calculate actual times for each artist using block logic
      artistFeedbackMap.forEach((feedbacks, artistId) => {
        const blocks = groupFeedbacksIntoBlocks(feedbacks);
        const totalActualTime = blocks.reduce((sum, block) => sum + block.totalDuration, 0);
        
        const artistData = artistTimeMap.get(artistId)!;
        artistData.totalTime = totalActualTime;
        artistData.totalVideoTime = totalActualTime * 0.7; // Estimate 70% video time
        artistData.totalFeedbackTime = totalActualTime * 0.3; // Estimate 30% feedback time
      });

      const artistTimeData = Array.from(artistTimeMap.values())
        .sort((a, b) => b.totalTime - a.totalTime);

      // Fetch user profiles to get real names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name');

      if (profilesError) throw profilesError;

      // Create a map for quick profile lookup
      const profileMap = new Map();
      profiles?.forEach((profile: any) => {
        profileMap.set(profile.id, profile.name);
      });

      console.log('=== PROFILE DEBUG ===');
      console.log('Fetched profiles:', profiles?.length || 0);
      console.log('Profile map:', Array.from(profileMap.entries()));
      console.log('Profile IDs:', Array.from(profileMap.keys()));

      // Process user time data from messages using same calculation as artist view
      const userTimeMap = new Map<string, UserTimeData>();
      
      allSubmissions?.forEach((submission: any) => {
        const adminFeedbacks = submission.messages?.filter((msg: any) => msg.is_admin) || [];
        
        if (adminFeedbacks.length > 0) {
          // Get submission details - artist name and project name
          const artistName = submission.artists?.name || 'Unknown Artist';
          const projectTitle = submission.project_name || 'Untitled Project';
          const projectName = `${artistName} - ${projectTitle}`;
          
          adminFeedbacks.forEach((message: any) => {
            const userId = message.user_id || 'unknown';
            const userName = profileMap.get(userId) || 'Unknown User';
            
            console.log('=== MESSAGE DEBUG ===');
            console.log('Message user_id:', userId);
            console.log('Profile lookup result:', profileMap.get(userId));
            console.log('Final userName:', userName);
            const messageDate = new Date(message.created_at);
            
            const dateKey = messageDate.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Time calculations now happen from actual blocks
            
            if (!userTimeMap.has(userId)) {
              userTimeMap.set(userId, {
                userId,
                userName,
                dailyTime: {},
                weeklyTime: {},
                monthlyTime: {},
                yearlyTime: {},
                totalTime: 0,
                dailyFeedbacks: {},
              });
            }
            
            const userData = userTimeMap.get(userId)!;
            
            // Store detailed feedback information for day view (using 5min default for now)
            if (!userData.dailyFeedbacks[dateKey]) {
              userData.dailyFeedbacks[dateKey] = [];
            }
            userData.dailyFeedbacks[dateKey].push({
              time: message.created_at,
              submissionId: submission.id,
              projectName: projectName,
              duration: 5 * 60 // Default 5 minutes, will be recalculated in blocks
            });
          });
        }
      });

      // Calculate actual time totals from blocks for each user
      const userTimeData = Array.from(userTimeMap.values()).map(userData => {
        // Calculate actual daily times from blocks
        Object.keys(userData.dailyFeedbacks).forEach(dateKey => {
          const feedbacks = userData.dailyFeedbacks[dateKey];
          const blocks = groupFeedbacksIntoBlocks(feedbacks);
          const actualDailyTime = blocks.reduce((sum, block) => sum + block.totalDuration, 0);
          userData.dailyTime[dateKey] = actualDailyTime;
        });

        // Recalculate weekly, monthly, yearly totals from actual daily times
        userData.weeklyTime = {};
        userData.monthlyTime = {};
        userData.yearlyTime = {};
        userData.totalTime = 0;

        Object.entries(userData.dailyTime).forEach(([dateKey, dailyTime]) => {
          const messageDate = new Date(dateKey);
          
          // Calculate proper ISO week number (Kalenderwoche)
          const getISOWeek = (date: Date) => {
            const target = new Date(date.valueOf());
            const dayNr = (date.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
              target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
          };
          
          const getWeekDateRange = (date: Date) => {
            const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
            const monday = new Date(date);
            monday.setDate(date.getDate() - dayOfWeek);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            
            const formatDate = (d: Date) => {
              return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
            };
            
            return `${formatDate(monday)} - ${formatDate(sunday)}`;
          };
          
          const weekNumber = getISOWeek(messageDate);
          const weekRange = getWeekDateRange(messageDate);
          const weekKey = `Kalenderwoche${weekNumber} ${weekRange}`;
          
          const monthKey = `${messageDate.getFullYear()}-${String(messageDate.getMonth() + 1).padStart(2, '0')}`;
          const yearKey = messageDate.getFullYear().toString();

          userData.weeklyTime[weekKey] = (userData.weeklyTime[weekKey] || 0) + dailyTime;
          userData.monthlyTime[monthKey] = (userData.monthlyTime[monthKey] || 0) + dailyTime;
          userData.yearlyTime[yearKey] = (userData.yearlyTime[yearKey] || 0) + dailyTime;
          userData.totalTime += dailyTime;
        });

        return userData;
      }).sort((a, b) => b.totalTime - a.totalTime);

      const totalProjectTime = artistTimeData.reduce((sum, artist) => sum + artist.totalTime, 0);
      const totalSubmissions = artistTimeData.reduce((sum, artist) => sum + artist.submissionCount, 0);
      const totalFeedbacks = artistTimeData.reduce((sum, artist) => sum + artist.totalFeedbackTime / 60, 0);

      // Debug logging for submission counts
      console.log('=== SUBMISSION COUNT DEBUG ===');
      console.log('Total artists processed:', artistTimeData.length);
      console.log('Active submissions from DB:', allSubmissions?.length || 0);
      console.log('Deleted videos from logs:', whatsappLogs?.length || 0);
      console.log('Calculated total submissions:', totalSubmissions);
      console.log('Artist breakdown:');
      artistTimeData.forEach(artist => {
        console.log(`${artist.artistName}: ${artist.submissionCount} submissions`);
      });
      
      // Debug individual submission timestamps
      console.log('=== TIMESTAMP DEBUG (first 10 submissions) ===');
      allSubmissions?.slice(0, 10).forEach((submission: any) => {
        const createdTime = new Date(submission.created_at).getTime();
        const updatedTime = new Date(submission.updated_at).getTime();
        const timeDifference = Math.abs(updatedTime - createdTime);
        console.log(`Submission ${submission.id}: created=${submission.created_at}, updated=${submission.updated_at}, diff=${timeDifference}ms, isUpdate=${timeDifference > 60000}`);
      });
      
      // Debug artists with low submission counts
      console.log('=== LOW SUBMISSION COUNT DEBUG ===');
      const lowCountArtists = artistTimeData.filter(artist => artist.submissionCount <= 1);
      console.log(`Artists with 0-1 submissions: ${lowCountArtists.length} out of ${artistTimeData.length}`);
      lowCountArtists.slice(0, 10).forEach(artist => {
        console.log(`${artist.artistName}: ${artist.submissionCount} submissions`);
      });
      
      // Check if we're creating too many artist entries
      console.log('=== ARTIST CREATION DEBUG ===');
      const artistCounts = new Map();
      allSubmissions?.forEach((submission: any) => {
        const artistId = submission.artist_id;
        const artistName = submission.artists?.name || 'Unknown Artist';
        const key = `${artistId}-${artistName}`;
        artistCounts.set(key, (artistCounts.get(key) || 0) + 1);
      });
      console.log('Unique artists from submissions:', artistCounts.size);
      console.log('Artists in final data:', artistTimeData.length);

      setData({
        artistTimeData,
        userTimeData,
        totalProjectTime,
        totalSubmissions,
        totalFeedbacks,
      });
    } catch (err) {
      console.error('Error fetching time breakdown data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load time breakdown data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  // Handle clicking on a date in day view
  const handleDateClick = (date: string, userName: string, blocks: TimeBlock[]) => {
    setSelectedDateBlocks({ date, userName, blocks });
  };

  const handleVideoClick = async (submissionId: string) => {
    // Store current scroll position before opening modal
    const timeBlocksContent = document.getElementById('time-blocks-content');
    const scrollPosition = timeBlocksContent?.scrollTop || 0;
    
    // Store scroll position in dataset for later retrieval
    if (timeBlocksContent) {
      timeBlocksContent.dataset.scrollPosition = scrollPosition.toString();
    }
    
    setSelectedSubmission(submissionId);
    setLoadingMessages(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('submission_id', submissionId as any)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        setSubmissionMessages([]);
      } else {
        setSubmissionMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setSubmissionMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatTimeShort = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>Error: {error}</p>
        <button 
          onClick={fetchTimeBreakdownData}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Time Blocks Modal Component
  const TimeBlocksModal = () => {
    if (!selectedDateBlocks) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-dark-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Time Blocks for {selectedDateBlocks.userName} on {selectedDateBlocks.date}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total time: {formatTime(selectedDateBlocks.blocks.reduce((sum, block) => sum + block.totalDuration, 0))}
              </p>
            </div>
            <button
              onClick={() => setSelectedDateBlocks(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]" id="time-blocks-content">
            {selectedDateBlocks.blocks.map((block, blockIndex) => (
              <div key={blockIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Block {blockIndex + 1}</h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatTime(block.totalDuration)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {new Date(block.startTime).toLocaleTimeString()} - {new Date(block.endTime).toLocaleTimeString()}
                </div>
                <div className="space-y-2">
                  {block.feedbacks.map((feedback, feedbackIndex) => {
                    // Use the merged feedback duration directly
                    const displayDuration = feedback.duration;
                    
                    return (
                      <div 
                        key={feedbackIndex} 
                        className="bg-gray-50 dark:bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoClick(feedback.submissionId);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {feedback.projectName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(feedback.time).toLocaleTimeString()}
                            </p>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatTime(displayDuration)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No time data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TimeBlocksModal />
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-modal rounded-lg p-4 border border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatTimeShort(data.totalProjectTime)}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-modal rounded-lg p-4 border border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Submissions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {data.totalSubmissions}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-modal rounded-lg p-4 border border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Feedbacks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {Math.round(data.totalFeedbacks)}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-modal rounded-lg p-4 border border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Artists</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {data.artistTimeData.length}
          </p>
        </div>
      </div>

      {/* View toggles */}
      <div className="flex items-center gap-4">
        {/* Artist/User toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('artists')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'artists'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }`}
          >
            Artist View
          </button>
          <button
            onClick={() => setActiveView('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'users'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }`}
          >
            User View
          </button>
        </div>

        {/* Time range toggle (only for user view) */}
        {activeView === 'users' && (
          <div className="flex items-center gap-2">
            {(['day', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Table/Chart toggle (only for artist view) */}
        {activeView === 'artists' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
              }`}
            >
              Chart View
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {activeView === 'artists' ? (
        viewMode === 'table' ? (
          <div className="bg-white dark:bg-dark-modal rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Time per Artist</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                (Video Length × Iterations) + (1.5 min × Iterations)
              </p>
            </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Artist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Video Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Feedback Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Submissions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
                {data.artistTimeData.map((artist) => (
                  <tr key={artist.artistId} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {artist.artistName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatTime(artist.totalVideoTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatTime(artist.totalFeedbackTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatTime(artist.totalTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {artist.submissionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className="bg-white dark:bg-dark-modal rounded-lg border border-gray-200 dark:border-dark-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Time Distribution</h3>
            <div className="space-y-4">
              {data.artistTimeData.slice(0, 10).map((artist) => {
                const percentage = (artist.totalTime / data.totalProjectTime) * 100;
                return (
                  <div key={artist.artistId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {artist.artistName}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimeShort(artist.totalTime)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        // User View
        <div className="bg-white dark:bg-dark-modal rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Time per User - {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}ly View
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Time spent giving feedback: (Video Length × 1) + (1.5 min × 1) per feedback
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time Periods
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
                {data.userTimeData.map((user) => {
                  const timeData = timeRange === 'day' ? user.dailyTime :
                                  timeRange === 'week' ? user.weeklyTime :
                                  timeRange === 'month' ? user.monthlyTime :
                                  user.yearlyTime;
                  
                  return (
                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.userName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {expandedUsers.has(user.userId) ? (
                            <div className="space-y-1 max-h-96 overflow-y-auto">
                              {Object.entries(timeData)
                                .sort(([a], [b]) => {
                                  // Extract date for proper sorting
                                  if (timeRange === 'day') {
                                    return new Date(b).getTime() - new Date(a).getTime();
                                  } else if (timeRange === 'week') {
                                    // Extract date from "Kalenderwoche39 22.09.2025 - 28.09.2025" format
                                    const dateA = a.split(' ')[1]?.split(' - ')[0];
                                    const dateB = b.split(' ')[1]?.split(' - ')[0];
                                    if (dateA && dateB) {
                                      const [dayA, monthA, yearA] = dateA.split('.');
                                      const [dayB, monthB, yearB] = dateB.split('.');
                                      return new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB)).getTime() - 
                                             new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA)).getTime();
                                    }
                                  } else if (timeRange === 'month') {
                                    // Format: "2025-09"
                                    return b.localeCompare(a);
                                  } else if (timeRange === 'year') {
                                    // Format: "2025"
                                    return parseInt(b) - parseInt(a);
                                  }
                                  return b.localeCompare(a);
                                })
                                .map(([period, time]) => (
                                  <div key={period} className="flex justify-between">
                                    {timeRange === 'day' ? (
                                      <button
                                        onClick={() => handleDateClick(period, user.userName, groupFeedbacksIntoBlocks(user.dailyFeedbacks[period] || []))}
                                        className="text-blue-500 hover:text-blue-700 hover:underline text-left"
                                      >
                                        {period}:
                                      </button>
                                    ) : (
                                      <span>{period}:</span>
                                    )}
                                    <span>{formatTime(time)}</span>
                                  </div>
                                ))}
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedUsers);
                                  newExpanded.delete(user.userId);
                                  setExpandedUsers(newExpanded);
                                }}
                                className="text-xs text-blue-500 hover:text-blue-700 mt-2"
                              >
                                Show less
                              </button>
                            </div>
                          ) : (
                            <div className="max-w-xs">
                              {Object.entries(timeData)
                                .sort(([a], [b]) => {
                                  // Extract date for proper sorting
                                  if (timeRange === 'day') {
                                    return new Date(b).getTime() - new Date(a).getTime();
                                  } else if (timeRange === 'week') {
                                    // Extract date from "Kalenderwoche39 22.09.2025 - 28.09.2025" format
                                    const dateA = a.split(' ')[1]?.split(' - ')[0];
                                    const dateB = b.split(' ')[1]?.split(' - ')[0];
                                    if (dateA && dateB) {
                                      const [dayA, monthA, yearA] = dateA.split('.');
                                      const [dayB, monthB, yearB] = dateB.split('.');
                                      return new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB)).getTime() - 
                                             new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA)).getTime();
                                    }
                                  } else if (timeRange === 'month') {
                                    // Format: "2025-09"
                                    return b.localeCompare(a);
                                  } else if (timeRange === 'year') {
                                    // Format: "2025"
                                    return parseInt(b) - parseInt(a);
                                  }
                                  return b.localeCompare(a);
                                })
                                .slice(0, 5)
                                .map(([period, time]) => (
                                  <div key={period} className="flex justify-between">
                                    <span>{period}:</span>
                                    <span>{formatTime(time)}</span>
                                  </div>
                                ))}
                              {Object.keys(timeData).length > 5 && (
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedUsers);
                                    newExpanded.add(user.userId);
                                    setExpandedUsers(newExpanded);
                                  }}
                                  className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                                >
                                  Show all {Object.keys(timeData).length} periods
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatTime(user.totalTime)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Video Messages Overlay Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Feedback Messages
              </h3>
              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  // Restore scroll position when closing messages modal
                  setTimeout(() => {
                    const timeBlocksContent = document.getElementById('time-blocks-content');
                    if (timeBlocksContent) {
                      const scrollPosition = parseInt(timeBlocksContent.dataset.scrollPosition || '0');
                      timeBlocksContent.scrollTop = scrollPosition;
                    }
                  }, 0);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {loadingMessages ? (
                <div className="text-center text-gray-500">
                  <p>Loading messages...</p>
                </div>
              ) : submissionMessages.length > 0 ? (
                <div className="space-y-4">
                  {submissionMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.is_admin 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}>
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>No messages found for this submission.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
