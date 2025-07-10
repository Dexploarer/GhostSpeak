/**
 * Memory-Optimized Data Structures and Algorithms
 * 
 * High-performance data structures optimized for memory usage and speed,
 * including efficient algorithms for sorting, searching, and data manipulation.
 */

/**
 * Memory-optimized circular buffer for high-frequency data
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add item to buffer (O(1))
   */
  push(item: T): boolean {
    if (this.size === this.capacity) {
      // Overwrite oldest item
      this.head = (this.head + 1) % this.capacity;
    } else {
      this.size++;
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    return true;
  }

  /**
   * Remove and return oldest item (O(1))
   */
  shift(): T | undefined {
    if (this.size === 0) return undefined;

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined as any; // Help GC
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }

  /**
   * Get item at index without removing (O(1))
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.size) return undefined;
    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Get current size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Check if buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.buffer.fill(undefined as any);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }

  /**
   * Convert to array (maintains order)
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i)!);
    }
    return result;
  }

  /**
   * Get current length (alias for getSize for Array compatibility)
   */
  get length(): number {
    return this.size;
  }

  /**
   * Reduce method compatible with Array.reduce
   */
  reduce<U>(
    callback: (previousValue: U, currentValue: T, currentIndex: number, array: CircularBuffer<T>) => U,
    initialValue: U
  ): U {
    let accumulator = initialValue;
    for (let i = 0; i < this.size; i++) {
      accumulator = callback(accumulator, this.get(i)!, i, this);
    }
    return accumulator;
  }
}

/**
 * Memory-efficient priority queue using binary heap
 */
export class PriorityQueue<T> {
  private heap: Array<{ item: T; priority: number }> = [];
  private readonly isMinHeap: boolean;

  constructor(isMinHeap = true) {
    this.isMinHeap = isMinHeap;
  }

  /**
   * Add item with priority (O(log n))
   */
  enqueue(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * Remove and return highest priority item (O(log n))
   */
  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop()!.item;

    const root = this.heap[0].item;
    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);
    return root;
  }

  /**
   * Peek at highest priority item without removing (O(1))
   */
  peek(): T | undefined {
    return this.heap.length > 0 ? this.heap[0].item : undefined;
  }

  /**
   * Get current size
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.heap = [];
  }

  private heapifyUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (!this.shouldSwap(index, parentIndex)) break;

      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private heapifyDown(index: number): void {
    while (true) {
      let targetIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && this.shouldSwap(leftChild, targetIndex)) {
        targetIndex = leftChild;
      }

      if (rightChild < this.heap.length && this.shouldSwap(rightChild, targetIndex)) {
        targetIndex = rightChild;
      }

      if (targetIndex === index) break;

      this.swap(index, targetIndex);
      index = targetIndex;
    }
  }

  private shouldSwap(childIndex: number, parentIndex: number): boolean {
    const childPriority = this.heap[childIndex].priority;
    const parentPriority = this.heap[parentIndex].priority;

    return this.isMinHeap ? childPriority < parentPriority : childPriority > parentPriority;
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

/**
 * Memory-efficient LRU cache with automatic cleanup
 */
export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly map = new Map<K, { value: V; prev: Node<K> | null; next: Node<K> | null }>();
  private head: Node<K> | null = null;
  private tail: Node<K> | null = null;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Get value and mark as recently used (O(1))
   */
  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;

    // Move to head (most recently used)
    this.moveToHead(key);
    return node.value;
  }

  /**
   * Set value and mark as recently used (O(1))
   */
  set(key: K, value: V): void {
    if (this.map.has(key)) {
      // Update existing
      this.map.get(key)!.value = value;
      this.moveToHead(key);
    } else {
      // Add new
      if (this.map.size >= this.maxSize) {
        this.removeLeastUsed();
      }
      this.addToHead(key, value);
    }
  }

  /**
   * Remove key from cache (O(1))
   */
  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;

    this.removeNode(key);
    return true;
  }

  /**
   * Check if key exists (O(1))
   */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /**
   * Get current size
   */
  size(): number {
    return this.map.size;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get all keys in LRU order (least to most recent)
   */
  keys(): K[] {
    const keys: K[] = [];
    let current = this.tail;
    while (current) {
      keys.push(current.key);
      current = current.prev;
    }
    return keys;
  }

  private addToHead(key: K, value: V): void {
    const newNode = { value, prev: null, next: this.head };
    
    if (this.head) {
      this.head.prev = newNode;
    } else {
      this.tail = newNode;
    }
    
    this.head = newNode;
    this.map.set(key, newNode);
  }

  private moveToHead(key: K): void {
    if (this.head?.key === key) return; // Already at head

    const node = this.map.get(key);
    if (!node) return;
    
    // Store the value before removing
    const value = node.value;
    this.removeNode(key);
    this.addToHead(key, value);
  }

  private removeNode(key: K): void {
    const node = this.map.get(key);
    if (!node) return;

    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.map.delete(key);
  }

  private removeLeastUsed(): void {
    if (this.tail) {
      this.removeNode(this.tail.key);
    }
  }
}

interface Node<K> {
  key: K;
  prev: Node<K> | null;
  next: Node<K> | null;
}

/**
 * Memory-efficient bloom filter for fast set membership testing
 */
export class BloomFilter {
  private readonly bitArray: Uint8Array;
  private readonly size: number;
  private readonly hashFunctions: number;

  constructor(expectedElements: number, falsePositiveRate = 0.01) {
    // Calculate optimal bit array size and number of hash functions
    this.size = Math.ceil((-expectedElements * Math.log(falsePositiveRate)) / (Math.log(2) ** 2));
    this.hashFunctions = Math.ceil((this.size / expectedElements) * Math.log(2));
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
  }

  /**
   * Add item to filter
   */
  add(item: string): void {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this.hash(item, i);
      const bitIndex = hash % this.size;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.bitArray[byteIndex] |= (1 << bitOffset);
    }
  }

  /**
   * Test if item might be in the set (no false negatives, possible false positives)
   */
  test(item: string): boolean {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this.hash(item, i);
      const bitIndex = hash % this.size;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      
      if ((this.bitArray[byteIndex] & (1 << bitOffset)) === 0) {
        return false; // Definitely not in set
      }
    }
    return true; // Probably in set
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.bitArray.fill(0);
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    return this.bitArray.length;
  }

  private hash(item: string, seed: number): number {
    // Simple hash function (in production, use a more robust one)
    let hash = seed;
    for (let i = 0; i < item.length; i++) {
      hash = (hash * 31 + item.charCodeAt(i)) & 0x7fffffff;
    }
    return hash;
  }
}

/**
 * Memory-efficient trie for fast string prefix operations
 */
export class Trie {
  private root: TrieNode = new TrieNode();
  private wordCount = 0;

  /**
   * Insert word into trie (O(m) where m is word length)
   */
  insert(word: string): void {
    let current = this.root;
    
    for (const char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    
    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      this.wordCount++;
    }
  }

  /**
   * Search for exact word (O(m))
   */
  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEndOfWord;
  }

  /**
   * Check if any word starts with prefix (O(m))
   */
  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  /**
   * Get all words with given prefix (O(p + n) where p is prefix length, n is results)
   */
  getWordsWithPrefix(prefix: string): string[] {
    const node = this.findNode(prefix);
    if (!node) return [];

    const results: string[] = [];
    this.dfs(node, prefix, results);
    return results;
  }

  /**
   * Delete word from trie (O(m))
   */
  delete(word: string): boolean {
    return this.deleteHelper(this.root, word, 0);
  }

  /**
   * Get total number of words
   */
  size(): number {
    return this.wordCount;
  }

  /**
   * Clear all words
   */
  clear(): void {
    this.root = new TrieNode();
    this.wordCount = 0;
  }

  /**
   * Get memory usage estimation
   */
  getMemoryUsage(): number {
    return this.calculateMemoryUsage(this.root);
  }

  private findNode(str: string): TrieNode | null {
    let current = this.root;
    
    for (const char of str) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }
    
    return current;
  }

  private dfs(node: TrieNode, currentWord: string, results: string[]): void {
    if (node.isEndOfWord) {
      results.push(currentWord);
    }

    for (const [char, childNode] of node.children) {
      this.dfs(childNode, currentWord + char, results);
    }
  }

  private deleteHelper(node: TrieNode, word: string, index: number): boolean {
    if (index === word.length) {
      if (!node.isEndOfWord) return false;
      
      node.isEndOfWord = false;
      this.wordCount--;
      return node.children.size === 0;
    }

    const char = word[index];
    const childNode = node.children.get(char);
    if (!childNode) return false;

    const shouldDeleteChild = this.deleteHelper(childNode, word, index + 1);

    if (shouldDeleteChild) {
      node.children.delete(char);
      return !node.isEndOfWord && node.children.size === 0;
    }

    return false;
  }

  private calculateMemoryUsage(node: TrieNode): number {
    let usage = 32; // Base node size estimate
    
    for (const childNode of node.children.values()) {
      usage += 8 + this.calculateMemoryUsage(childNode); // 8 bytes for Map entry
    }
    
    return usage;
  }
}

class TrieNode {
  children = new Map<string, TrieNode>();
  isEndOfWord = false;
}

/**
 * Memory pool for object reuse to reduce GC pressure
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private readonly createFn: () => T;
  private readonly resetFn: (obj: T) => void;
  private readonly maxSize: number;
  private created = 0;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * Get object from pool or create new one
   */
  acquire(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    this.created++;
    return this.createFn();
  }

  /**
   * Return object to pool for reuse
   */
  release(obj: T): void {
    if (this.available.length < this.maxSize) {
      this.resetFn(obj);
      this.available.push(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    available: number;
    created: number;
    utilization: number;
  } {
    return {
      available: this.available.length,
      created: this.created,
      utilization: this.created > 0 ? (this.created - this.available.length) / this.created : 0,
    };
  }

  /**
   * Clear all pooled objects
   */
  clear(): void {
    this.available = [];
  }
}

/**
 * High-performance sorting algorithms
 */
export class FastSort {
  /**
   * Optimized quicksort with 3-way partitioning for arrays with duplicates
   */
  static quickSort<T>(arr: T[], compareFn?: (a: T, b: T) => number): T[] {
    const compare = compareFn || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const result = [...arr];
    this.quickSortHelper(result, 0, result.length - 1, compare);
    return result;
  }

  /**
   * Tim sort implementation (stable, adaptive)
   */
  static timSort<T>(arr: T[], compareFn?: (a: T, b: T) => number): T[] {
    const compare = compareFn || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const result = [...arr];
    
    if (result.length < 32) {
      return this.insertionSort(result, compare);
    }

    // Use native sort which is typically optimized Tim sort
    return result.sort(compare);
  }

  /**
   * Radix sort for integers (O(k*n) where k is number of digits)
   */
  static radixSort(arr: number[]): number[] {
    const result = [...arr];
    const max = Math.max(...result);
    
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
      this.countingSort(result, exp);
    }
    
    return result;
  }

  private static quickSortHelper<T>(
    arr: T[],
    low: number,
    high: number,
    compare: (a: T, b: T) => number
  ): void {
    if (low < high) {
      const [lt, gt] = this.partition3Way(arr, low, high, compare);
      this.quickSortHelper(arr, low, lt - 1, compare);
      this.quickSortHelper(arr, gt + 1, high, compare);
    }
  }

  private static partition3Way<T>(
    arr: T[],
    low: number,
    high: number,
    compare: (a: T, b: T) => number
  ): [number, number] {
    const pivot = arr[low];
    let lt = low;
    let gt = high;
    let i = low;

    while (i <= gt) {
      const cmp = compare(arr[i], pivot);
      if (cmp < 0) {
        [arr[lt], arr[i]] = [arr[i], arr[lt]];
        lt++;
        i++;
      } else if (cmp > 0) {
        [arr[i], arr[gt]] = [arr[gt], arr[i]];
        gt--;
      } else {
        i++;
      }
    }

    return [lt, gt];
  }

  private static insertionSort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
    for (let i = 1; i < arr.length; i++) {
      const key = arr[i];
      let j = i - 1;
      
      while (j >= 0 && compare(arr[j], key) > 0) {
        arr[j + 1] = arr[j];
        j--;
      }
      
      arr[j + 1] = key;
    }
    
    return arr;
  }

  private static countingSort(arr: number[], exp: number): void {
    const output = new Array(arr.length);
    const count = new Array(10).fill(0);

    // Count occurrences
    for (let i = 0; i < arr.length; i++) {
      count[Math.floor(arr[i] / exp) % 10]++;
    }

    // Calculate positions
    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1];
    }

    // Build output array
    for (let i = arr.length - 1; i >= 0; i--) {
      const digit = Math.floor(arr[i] / exp) % 10;
      output[count[digit] - 1] = arr[i];
      count[digit]--;
    }

    // Copy back to original array
    for (let i = 0; i < arr.length; i++) {
      arr[i] = output[i];
    }
  }
}

/**
 * High-performance searching algorithms
 */
export class FastSearch {
  /**
   * Binary search on sorted array (O(log n))
   */
  static binarySearch<T>(
    arr: T[],
    target: T,
    compareFn?: (a: T, b: T) => number
  ): number {
    const compare = compareFn || ((a, b) => a < b ? -1 : a > b ? 1 : 0);
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cmp = compare(arr[mid], target);

      if (cmp === 0) return mid;
      if (cmp < 0) left = mid + 1;
      else right = mid - 1;
    }

    return -1;
  }

  /**
   * Interpolation search for uniformly distributed data (O(log log n) average)
   */
  static interpolationSearch(arr: number[], target: number): number {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right && target >= arr[left] && target <= arr[right]) {
      if (left === right) {
        return arr[left] === target ? left : -1;
      }

      // Interpolation formula
      const pos = left + Math.floor(
        ((target - arr[left]) / (arr[right] - arr[left])) * (right - left)
      );

      if (arr[pos] === target) return pos;
      if (arr[pos] < target) left = pos + 1;
      else right = pos - 1;
    }

    return -1;
  }

  /**
   * Boyer-Moore string search algorithm (O(n/m) best case)
   */
  static boyerMooreSearch(text: string, pattern: string): number[] {
    const results: number[] = [];
    const badCharTable = this.buildBadCharTable(pattern);
    const goodSuffixTable = this.buildGoodSuffixTable(pattern);

    let i = 0;
    while (i <= text.length - pattern.length) {
      let j = pattern.length - 1;

      while (j >= 0 && pattern[j] === text[i + j]) {
        j--;
      }

      if (j < 0) {
        results.push(i);
        i += goodSuffixTable[0];
      } else {
        const badCharShift = badCharTable.get(text[i + j]) || pattern.length;
        const goodSuffixShift = goodSuffixTable[j + 1];
        i += Math.max(badCharShift - pattern.length + 1 + j, goodSuffixShift);
      }
    }

    return results;
  }

  private static buildBadCharTable(pattern: string): Map<string, number> {
    const table = new Map<string, number>();
    
    for (let i = 0; i < pattern.length; i++) {
      table.set(pattern[i], pattern.length - 1 - i);
    }
    
    return table;
  }

  private static buildGoodSuffixTable(pattern: string): number[] {
    const table = new Array(pattern.length + 1).fill(pattern.length);
    const borderPos = new Array(pattern.length + 1).fill(-1);
    
    let i = pattern.length;
    let j = pattern.length + 1;
    borderPos[i] = j;

    while (i > 0) {
      while (j <= pattern.length && pattern[i - 1] !== pattern[j - 1]) {
        if (table[j] === pattern.length) {
          table[j] = j - i;
        }
        j = borderPos[j];
      }
      i--;
      j--;
      borderPos[i] = j;
    }

    j = borderPos[0];
    for (i = 0; i <= pattern.length; i++) {
      if (table[i] === pattern.length) {
        table[i] = j;
      }
      if (i === j) {
        j = borderPos[j];
      }
    }

    return table;
  }
}

/**
 * Memory-efficient array operations
 */
export class MemoryEfficientArray {
  /**
   * In-place array deduplication (preserves order)
   */
  static deduplicate<T>(arr: T[]): T[] {
    if (arr.length <= 1) return arr;

    const seen = new Set<T>();
    let writeIndex = 0;

    for (let readIndex = 0; readIndex < arr.length; readIndex++) {
      if (!seen.has(arr[readIndex])) {
        seen.add(arr[readIndex]);
        arr[writeIndex] = arr[readIndex];
        writeIndex++;
      }
    }

    arr.length = writeIndex;
    return arr;
  }

  /**
   * Memory-efficient array intersection
   */
  static intersection<T>(arr1: T[], arr2: T[]): T[] {
    if (arr1.length === 0 || arr2.length === 0) return [];

    const [smaller, larger] = arr1.length < arr2.length ? [arr1, arr2] : [arr2, arr1];
    const set = new Set(smaller);
    const result: T[] = [];

    for (const item of larger) {
      if (set.has(item)) {
        result.push(item);
        set.delete(item); // Avoid duplicates
      }
    }

    return result;
  }

  /**
   * Memory-efficient array union
   */
  static union<T>(arr1: T[], arr2: T[]): T[] {
    const set = new Set(arr1);
    for (const item of arr2) {
      set.add(item);
    }
    return Array.from(set);
  }

  /**
   * Chunked processing for large arrays
   */
  static async processInChunks<T, R>(
    arr: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize = 1000
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
    }

    return results;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceUtils {
  /**
   * Measure function execution time
   */
  static async measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; timeMs: number }> {
    const start = performance.now();
    const result = await fn();
    const timeMs = performance.now() - start;
    return { result, timeMs };
  }

  /**
   * Memory usage measurement (approximate)
   */
  static measureMemory<T>(fn: () => T): { result: T; memoryMB: number } {
    // Force garbage collection if available (Node.js)
    if (global.gc) {
      global.gc();
    }

    const memBefore = this.getMemoryUsage();
    const result = fn();
    const memAfter = this.getMemoryUsage();

    return {
      result,
      memoryMB: Math.max(0, memAfter - memBefore),
    };
  }

  /**
   * Benchmark function performance
   */
  static async benchmark<T>(
    fn: () => Promise<T> | T,
    iterations = 1000
  ): Promise<{
    avgTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
    totalTimeMs: number;
    opsPerSecond: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { timeMs } = await this.measureTime(fn);
      times.push(timeMs);
    }

    const totalTimeMs = times.reduce((sum, time) => sum + time, 0);
    const avgTimeMs = totalTimeMs / iterations;
    const minTimeMs = Math.min(...times);
    const maxTimeMs = Math.max(...times);
    const opsPerSecond = 1000 / avgTimeMs;

    return {
      avgTimeMs,
      minTimeMs,
      maxTimeMs,
      totalTimeMs,
      opsPerSecond,
    };
  }

  private static getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    
    // Browser fallback (very rough estimate)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }

    return 0;
  }
}

/**
 * Pre-allocated arrays for common operations to reduce GC pressure
 */
export class ArrayPool {
  private static pools = new Map<string, any[][]>();

  /**
   * Get array from pool or create new one
   */
  static getArray<T>(type: string, size?: number): T[] {
    const poolKey = `${type}-${size || 'dynamic'}`;
    let pool = this.pools.get(poolKey);
    
    if (!pool) {
      pool = [];
      this.pools.set(poolKey, pool);
    }

    if (pool.length > 0) {
      const arr = pool.pop();
      arr.length = 0; // Clear array
      return arr;
    }

    return size ? new Array(size) : [];
  }

  /**
   * Return array to pool for reuse
   */
  static returnArray(type: string, arr: any[], size?: number): void {
    const poolKey = `${type}-${size || 'dynamic'}`;
    let pool = this.pools.get(poolKey);
    
    if (!pool) {
      pool = [];
      this.pools.set(poolKey, pool);
    }

    if (pool.length < 10) { // Limit pool size
      arr.length = 0; // Clear array
      pool.push(arr);
    }
  }

  /**
   * Clear all pools
   */
  static clearPools(): void {
    this.pools.clear();
  }
}

// Export commonly used instances
export const responseTimeBuffer = new CircularBuffer<number>(1000);
export const requestQueue = new PriorityQueue<any>();
export const accountCache = new LRUCache<string, any>(10000);
export const signatureFilter = new BloomFilter(100000, 0.01);
export const addressTrie = new Trie();