import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Loader } from 'lucide-react';
import { useStore } from '../store';
import { 
  parseExcelFile, 
  validateVideoRow,
  processVideoRow,
  processFeedback,
  type VideoRow,
  type ProcessedFeedback 
} from '../utils/excel';

interface DebugInfo {
  rowNumber: number;
  originalData: VideoRow;
  processedData?: {
    projectName: string;
    videoUrl: string;
    artistId: string;
    type: 'song-specific' | 'off-topic';
    status: 'new' | 'feedback-needed' | 'correction-needed' | 'ready' | 'posted';
  };
  feedback?: ProcessedFeedback;
  status: 'success' | 'error';
  message: string;
}

interface ImportProgress {
  current: number;
  total: number;
  success: number;
  error: number;
}

export const ImportSubmissions: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { artists, addSubmission, updateFeedback } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<DebugInfo[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    success: 0,
    error: 0
  });

  const findArtistByName = (name: string) => {
    if (!name) return null;
    
    const cleanName = name
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    let artist = artists.find(a => 
      a.name.toLowerCase().replace(/[^\w\s]/g, '').trim() === cleanName
    );

    if (!artist) {
      artist = artists.find(a => {
        const artistName = a.name.toLowerCase().replace(/[^\w\s]/g, '').trim();
        return artistName.includes(cleanName) || cleanName.includes(artistName);
      });
    }
    
    return artist;
  };

  const processExcelFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDebugLog([]);
    setProgress({
      current: 0,
      total: 0,
      success: 0,
      error: 0
    });

    const debug: DebugInfo[] = [];

    try {
      console.debug('Processing file:', file.name);
      const { videos, feedback } = await parseExcelFile(file);
      const latestFeedback = processFeedback(feedback);

      console.debug('Total videos found:', videos.length);
      console.debug('Total feedback entries:', feedback.length);

      // Set total count for progress
      setProgress(prev => ({
        ...prev,
        total: videos.filter(row => row.Name?.trim() && row['Dropbox-Link']?.trim()).length
      }));

      let successCount = 0;
      let errorCount = 0;

      for (const [index, row] of videos.entries()) {
        const rowNumber = index + 4; // Excel row number (accounting for header)
        
        // Skip empty rows
        if (!row.Name && !row['Dropbox-Link'] && !row['Link to 👥 Kunden']) {
          continue;
        }

        // Update progress
        setProgress(prev => ({
          ...prev,
          current: prev.current + 1
        }));

        const debugEntry: DebugInfo = {
          rowNumber,
          originalData: row,
          status: 'error',
          message: 'Processing started'
        };

        try {
          // Validate row data
          const validationError = validateVideoRow(row);
          if (validationError) {
            debugEntry.message = validationError;
            debug.push(debugEntry);
            errorCount++;
            setProgress(prev => ({ ...prev, error: prev.error + 1 }));
            continue;
          }

          // Find artist
          const artist = findArtistByName(row['Link to 👥 Kunden']);
          if (!artist) {
            debugEntry.message = `Artist "${row['Link to 👥 Kunden']}" not found`;
            debug.push(debugEntry);
            errorCount++;
            setProgress(prev => ({ ...prev, error: prev.error + 1 }));
            continue;
          }

          // Process video data
          const processedData = {
            ...processVideoRow(row),
            artistId: artist.id
          };

          debugEntry.processedData = processedData;
          console.debug('Processing submission:', processedData);

          // Add the submission
          const { data: submission, error: submissionError } = await addSubmission(processedData);
          
          if (submissionError || !submission) {
            throw new Error(submissionError?.message || 'Failed to create submission');
          }

          // Check for feedback
          const videoFeedback = latestFeedback.get(row.Name.trim());
          if (videoFeedback) {
            debugEntry.feedback = videoFeedback;
            
            // Add the feedback message without changing the status
            const { error: feedbackError } = await updateFeedback(
              submission.id, 
              videoFeedback.message, 
              true, 
              false // Don't update status
            );

            if (feedbackError) {
              console.error('Error adding feedback:', feedbackError);
            }
          }
          
          debugEntry.status = 'success';
          debugEntry.message = videoFeedback 
            ? 'Successfully imported with feedback' 
            : 'Successfully imported';
          successCount++;
          setProgress(prev => ({ ...prev, success: prev.success + 1 }));

        } catch (err) {
          console.error(`Row ${rowNumber} error:`, err);
          debugEntry.message = err instanceof Error ? err.message : 'Unknown error';
          errorCount++;
          setProgress(prev => ({ ...prev, error: prev.error + 1 }));
        }

        debug.push(debugEntry);
      }

      setDebugLog(debug);

      if (successCount > 0) {
        setSuccess(
          `Successfully imported ${successCount} submission${successCount !== 1 ? 's' : ''}` +
          (errorCount > 0 ? ` (${errorCount} failed)` : '')
        );
      }

      if (errorCount > 0) {
        setError(
          `${errorCount} error${errorCount !== 1 ? 's' : ''} occurred during import. ` +
          'Check the debug log for details.'
        );
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('File processing error:', err);
      setError('Failed to process Excel file. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setError('Please select an Excel (.xlsx) file');
      return;
    }

    processExcelFile(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Import Submissions</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Import submissions and feedback from an Excel file. The file should have:
        </p>
        <div className="mt-2 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sheet 1 (Videos)</h4>
            <ul className="mt-1 list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>Name (Video Name)</li>
              <li>Status (Video Status)</li>
              <li>Dropbox-Link (Video URL)</li>
              <li>Link to 👥 Kunden (Artist)</li>
              <li>Content Art (Content Type)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sheet 2 (Feedback)</h4>
            <ul className="mt-1 list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>Item Name (Video Name)</li>
              <li>Created At (Feedback Date)</li>
              <li>Update Content (Feedback Text)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans text-sm">{error}</pre>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Progress bar */}
        {loading && progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Processing videos...</span>
              <span>{progress.current} of {progress.total}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-500">Success: {progress.success}</span>
              <span className="text-red-500">Failed: {progress.error}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
          <button
            onClick={handleButtonClick}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-md border-2 border-dashed transition-colors ${
              loading
                ? 'border-gray-300 dark:border-gray-600 cursor-not-allowed'
                : 'border-primary-500 hover:border-primary-600 dark:border-primary-400 dark:hover:border-primary-300'
            }`}
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span className="text-gray-600 dark:text-gray-300">Processing...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-primary-500 dark:text-primary-400" />
                <span className="text-primary-600 dark:text-primary-400">Select Excel File</span>
              </>
            )}
          </button>

          {debugLog.length > 0 && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400"
            >
              {showDebug ? 'Hide Debug Log' : 'Show Debug Log'}
            </button>
          )}
        </div>

        {showDebug && debugLog.length > 0 && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium">
              Debug Log
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {debugLog.map((entry, index) => (
                <div 
                  key={index}
                  className={`p-4 ${
                    entry.status === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium">Row {entry.rowNumber}</span>
                    <span className={`text-sm ${
                      entry.status === 'success' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {entry.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{entry.message}</p>
                  <pre className="mt-2 text-xs overflow-x-auto">
                    {JSON.stringify(entry.originalData, null, 2)}
                  </pre>
                  {entry.processedData && (
                    <pre className="mt-2 text-xs overflow-x-auto text-green-600 dark:text-green-400">
                      {JSON.stringify(entry.processedData, null, 2)}
                    </pre>
                  )}
                  {entry.feedback && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Latest Feedback:</p>
                      <pre className="text-xs overflow-x-auto text-blue-600 dark:text-blue-400">
                        {JSON.stringify(entry.feedback, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};