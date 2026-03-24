export enum Role {
  User = 'user',
  Model = 'model',
}

export interface Message {
  role: Role;
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface ExtractedData {
  text: string;
  timestamp: number;
}

export interface ImageFile {
  data: string; // base64
  mimeType: string;
  preview: string;
}

export interface AppState {
  image: ImageFile | null;
  extractedData: ExtractedData | null;
  isLoading: boolean;
  error: string | null;
}