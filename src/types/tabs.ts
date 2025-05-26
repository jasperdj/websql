export interface Tab {
  id: string;
  title: string;
  query: string;
  isDirty: boolean;
  isActive: boolean;
  createdAt: number;
  savedQueryId?: string; // If this tab represents a saved query
  isEditing?: boolean; // For inline tab renaming
}