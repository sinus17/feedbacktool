export interface VideoRow {
  Name: string;
  'Unterelemente': string;
  'Verantwortliche/r': string;
  Status: string;
  'Dropbox-Link': string;
  'Link to 👥 Kunden': string;
  'Anzahl Korrekturen': number;
  'Content Art': string;
}

export interface FeedbackRow {
  'Item Name': string;
  'Created At': string;
  'Update Content': string;
  'Status'?: string;
}

export interface ProcessedFeedback {
  projectName: string;
  createdAt: string;
  message: string;
  status?: string;
}