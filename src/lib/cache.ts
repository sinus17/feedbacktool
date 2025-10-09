/**
 * Simple in-memory cache utility
 * Stores data with TTL (Time To Live) for performance optimization
 */

interface CacheEntry<T> {
  data: T | null;
  timestamp: number | null;
  ttl: number;
}

class SimpleCache {
  private caches: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get data from cache if valid
   */
  get<T>(key: string): T | null {
    const entry = this.caches.get(key);
    if (!entry || !entry.data || !entry.timestamp) {
      return null;
    }

    const now = Date.now();
    const isValid = now - entry.timestamp < entry.ttl;

    if (!isValid) {
      console.log(`⏰ Cache expired for ${key}`);
      this.invalidate(key);
      return null;
    }

    const age = Math.round((now - entry.timestamp) / 1000);
    console.log(`⚡ Cache hit for ${key} (age: ${age}s)`);
    return entry.data;
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttl: number = 2 * 60 * 1000): void {
    this.caches.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    console.log(`💾 Cached ${key} (TTL: ${ttl / 1000}s)`);
  }

  /**
   * Invalidate (clear) cache for a specific key
   */
  invalidate(key: string): void {
    this.caches.delete(key);
    console.log(`🗑️  Cache invalidated for ${key}`);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.clear();
    console.log('🗑️  All caches cleared');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.caches.size,
      keys: Array.from(this.caches.keys())
    };
  }
}

// Export singleton instance
export const cache = new SimpleCache();
