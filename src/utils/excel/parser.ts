import { read, utils } from 'xlsx';
import { processFeedback } from './processor';
import { validateVideoRow } from './validator';
import { processVideoRow } from './processor';
import type { VideoRow, FeedbackRow } from './types';

export async function parseExcelFile(file: File) {
  const data = await file.arrayBuffer();
  const workbook = read(data);
  
  // Get videos from first sheet
  const videosSheet = workbook.Sheets[workbook.SheetNames[0]];
  const videos: VideoRow[] = utils.sheet_to_json(videosSheet, { range: 2 })
    .filter(row => row.Name || row['Dropbox-Link']); // Filter out empty rows

  // Get feedback from second sheet if it exists
  const feedbackSheet = workbook.Sheets[workbook.SheetNames[1]];
  const feedback: FeedbackRow[] = feedbackSheet ? 
    utils.sheet_to_json(feedbackSheet, { range: 1 }) : 
    [];

  return { videos, feedback };
}