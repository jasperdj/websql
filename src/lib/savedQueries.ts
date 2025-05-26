export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'websql-saved-queries';

class SavedQueriesService {
  private savedQueries: SavedQuery[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.savedQueries = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load saved queries from localStorage:', error);
      this.savedQueries = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedQueries));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save queries to localStorage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getAll(): SavedQuery[] {
    return [...this.savedQueries];
  }

  getById(id: string): SavedQuery | undefined {
    return this.savedQueries.find(q => q.id === id);
  }

  save(name: string, query: string): SavedQuery {
    const now = Date.now();
    const newQuery: SavedQuery = {
      id: now.toString(),
      name,
      query,
      createdAt: now,
      updatedAt: now,
    };

    this.savedQueries.push(newQuery);
    this.saveToStorage();
    return newQuery;
  }

  update(id: string, updates: Partial<Pick<SavedQuery, 'name' | 'query'>>): SavedQuery | null {
    const index = this.savedQueries.findIndex(q => q.id === id);
    if (index === -1) return null;

    const query = this.savedQueries[index];
    this.savedQueries[index] = {
      ...query,
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveToStorage();
    return this.savedQueries[index];
  }

  delete(id: string): boolean {
    const index = this.savedQueries.findIndex(q => q.id === id);
    if (index === -1) return false;

    this.savedQueries.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  exists(name: string): boolean {
    return this.savedQueries.some(q => q.name === name);
  }

  findByName(name: string): SavedQuery | undefined {
    return this.savedQueries.find(q => q.name === name);
  }
}

export const savedQueriesService = new SavedQueriesService();