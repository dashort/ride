/**
 * Frontend Performance Optimizations
 * Addresses the 150+ google.script.run calls and large bundle sizes
 * identified in the performance analysis.
 */

/**
 * API Batcher - Reduces individual google.script.run calls by batching them
 * This replaces the 150+ individual API calls with efficient batched requests
 */
class APIBatcher {
  constructor() {
    this.queue = [];
    this.batchTimeout = 50; // milliseconds
    this.maxBatchSize = 10;
    this.batchTimer = null;
    this.pendingRequests = new Map();
    this.stats = {
      totalCalls: 0,
      batchedCalls: 0,
      savedRequests: 0
    };
  }

  /**
   * Queue an API call for batching
   * @param {string} functionName - Google Apps Script function name
   * @param {Array} params - Function parameters
   * @return {Promise} Promise that resolves with the function result
   */
  async call(functionName, params = []) {
    return new Promise((resolve, reject) => {
      this.stats.totalCalls++;
      
      // Add to queue
      this.queue.push({
        functionName,
        params,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Start batch timer if it's the first item
      if (this.queue.length === 1) {
        this.scheduleBatch();
      }
      
      // Process immediately if batch is full
      else if (this.queue.length >= this.maxBatchSize) {
        this.processBatch();
      }
    });
  }

  /**
   * Schedule batch processing
   */
  scheduleBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.batchTimeout);
  }

  /**
   * Process the current batch of API calls
   */
  async processBatch() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0);
    this.stats.batchedCalls++;
    this.stats.savedRequests += Math.max(0, batch.length - 1);

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    console.log(`📦 Processing batch of ${batch.length} API calls`);

    try {
      // Single batch request to Google Apps Script
      const batchRequest = {
        calls: batch.map(({ functionName, params }) => ({ functionName, params }))
      };

      const results = await this.makeGoogleScriptCall('processBatchRequest', [batchRequest]);
      
      // Resolve individual promises with their results
      batch.forEach((call, index) => {
        const result = results[index];
        if (result && result.success) {
          call.resolve(result.data);
        } else {
          call.reject(new Error(result?.error || 'Unknown batch error'));
        }
      });

    } catch (error) {
      console.error('Batch processing error:', error);
      
      // Fallback: execute calls individually
      await this.executeIndividually(batch);
    }
  }

  /**
   * Fallback to individual execution
   */
  async executeIndividually(batch) {
    console.log('🔄 Falling back to individual execution');
    
    for (const call of batch) {
      try {
        const result = await this.makeGoogleScriptCall(call.functionName, call.params);
        call.resolve(result);
      } catch (error) {
        call.reject(error);
      }
    }
  }

  /**
   * Make a Google Apps Script call with error handling
   */
  makeGoogleScriptCall(functionName, params = []) {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.script || !google.script.run) {
        reject(new Error('Google Apps Script not available'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout calling ${functionName}`));
      }, 30000); // 30 second timeout

      google.script.run
        .withSuccessHandler((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .withFailureHandler((error) => {
          clearTimeout(timeoutId);
          reject(error);
        })[functionName](...params);
    });
  }

  /**
   * Get batching statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      efficiency: this.stats.totalCalls > 0 ? 
        ((this.stats.savedRequests / this.stats.totalCalls) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

/**
 * Lazy Loader - Loads components only when needed
 * Reduces initial bundle size by deferring non-critical components
 */
class LazyLoader {
  constructor() {
    this.loadedComponents = new Set();
    this.loadingComponents = new Map();
    this.componentRegistry = new Map();
  }

  /**
   * Register a component for lazy loading
   */
  registerComponent(name, loadFunction) {
    this.componentRegistry.set(name, loadFunction);
  }

  /**
   * Load a component lazily
   */
  async loadComponent(componentName) {
    // Return immediately if already loaded
    if (this.loadedComponents.has(componentName)) {
      return Promise.resolve();
    }

    // Return existing promise if currently loading
    if (this.loadingComponents.has(componentName)) {
      return this.loadingComponents.get(componentName);
    }

    // Get the load function
    const loadFunction = this.componentRegistry.get(componentName);
    if (!loadFunction) {
      throw new Error(`Component ${componentName} not registered`);
    }

    // Start loading
    console.log(`🔄 Lazy loading component: ${componentName}`);
    const loadPromise = loadFunction()
      .then(() => {
        this.loadedComponents.add(componentName);
        this.loadingComponents.delete(componentName);
        console.log(`✅ Component loaded: ${componentName}`);
      })
      .catch((error) => {
        this.loadingComponents.delete(componentName);
        console.error(`❌ Failed to load component ${componentName}:`, error);
        throw error;
      });

    this.loadingComponents.set(componentName, loadPromise);
    return loadPromise;
  }

  /**
   * Load multiple components in parallel
   */
  async loadComponents(componentNames) {
    const loadPromises = componentNames.map(name => this.loadComponent(name));
    return Promise.all(loadPromises);
  }
}

/**
 * DOM Optimizer - Efficient DOM manipulation utilities
 * Reduces reflows and repaints by batching DOM operations
 */
class DOMOptimizer {
  constructor() {
    this.pendingUpdates = [];
    this.updateTimer = null;
  }

  /**
   * Batch DOM update
   */
  batchUpdate(element, updates) {
    this.pendingUpdates.push({ element, updates });
    
    if (!this.updateTimer) {
      this.updateTimer = requestAnimationFrame(() => {
        this.processPendingUpdates();
      });
    }
  }

  /**
   * Process all pending DOM updates
   */
  processPendingUpdates() {
    console.log(`🔄 Processing ${this.pendingUpdates.length} DOM updates`);
    
    // Group updates by element to minimize DOM access
    const updatesByElement = new Map();
    
    this.pendingUpdates.forEach(({ element, updates }) => {
      if (!updatesByElement.has(element)) {
        updatesByElement.set(element, []);
      }
      updatesByElement.get(element).push(updates);
    });

    // Apply all updates
    updatesByElement.forEach((updatesList, element) => {
      const combinedUpdates = updatesList.reduce((acc, updates) => {
        return { ...acc, ...updates };
      }, {});

      this.applyUpdates(element, combinedUpdates);
    });

    // Clear pending updates
    this.pendingUpdates = [];
    this.updateTimer = null;
  }

  /**
   * Apply updates to an element
   */
  applyUpdates(element, updates) {
    if (!element) return;

    // Apply style updates
    if (updates.style) {
      Object.assign(element.style, updates.style);
    }

    // Apply attribute updates
    if (updates.attributes) {
      Object.entries(updates.attributes).forEach(([attr, value]) => {
        element.setAttribute(attr, value);
      });
    }

    // Apply class updates
    if (updates.classes) {
      if (updates.classes.add) {
        element.classList.add(...updates.classes.add);
      }
      if (updates.classes.remove) {
        element.classList.remove(...updates.classes.remove);
      }
    }

    // Apply content updates
    if (updates.textContent !== undefined) {
      element.textContent = updates.textContent;
    }
    if (updates.innerHTML !== undefined) {
      element.innerHTML = updates.innerHTML;
    }
  }

  /**
   * Efficient table updates
   */
  updateTable(tableElement, data, renderRowFunction) {
    const tbody = tableElement.querySelector('tbody');
    const fragment = document.createDocumentFragment();
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Create all rows in memory
    data.forEach(rowData => {
      const row = renderRowFunction(rowData);
      fragment.appendChild(row);
    });
    
    // Single DOM update
    tbody.appendChild(fragment);
  }
}

/**
 * Performance Monitor - Tracks and reports performance metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTimes: [],
      apiCalls: [],
      domUpdates: 0,
      errors: []
    };
    this.startTime = performance.now();
  }

  /**
   * Mark a performance milestone
   */
  mark(name) {
    const time = performance.now() - this.startTime;
    console.log(`⏱️ ${name}: ${time.toFixed(2)}ms`);
    return time;
  }

  /**
   * Record an API call time
   */
  recordAPICall(functionName, duration) {
    this.metrics.apiCalls.push({
      functionName,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Record a page load time
   */
  recordLoadTime(pageName, duration) {
    this.metrics.loadTimes.push({
      pageName,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Record an error
   */
  recordError(error, context) {
    this.metrics.errors.push({
      error: error.message,
      context,
      timestamp: Date.now()
    });
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const avgLoadTime = this.metrics.loadTimes.length > 0 ?
      this.metrics.loadTimes.reduce((sum, item) => sum + item.duration, 0) / this.metrics.loadTimes.length : 0;

    const avgAPITime = this.metrics.apiCalls.length > 0 ?
      this.metrics.apiCalls.reduce((sum, item) => sum + item.duration, 0) / this.metrics.apiCalls.length : 0;

    return {
      totalLoadTimes: this.metrics.loadTimes.length,
      averageLoadTime: avgLoadTime.toFixed(2) + 'ms',
      totalAPICalls: this.metrics.apiCalls.length,
      averageAPITime: avgAPITime.toFixed(2) + 'ms',
      domUpdates: this.metrics.domUpdates,
      errorCount: this.metrics.errors.length
    };
  }
}

/**
 * Application Performance Manager
 * Main class that coordinates all performance optimizations
 */
class AppPerformanceManager {
  constructor() {
    this.apiBatcher = new APIBatcher();
    this.lazyLoader = new LazyLoader();
    this.domOptimizer = new DOMOptimizer();
    this.performanceMonitor = new PerformanceMonitor();
    this.isInitialized = false;
  }

  /**
   * Initialize performance optimizations
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🚀 Initializing frontend performance optimizations...');
    
    try {
      // Register common components for lazy loading
      this.registerLazyComponents();
      
      // Set up global error handling
      this.setupErrorHandling();
      
      // Initialize performance monitoring
      this.setupPerformanceMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Frontend optimizations initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize performance optimizations:', error);
      this.performanceMonitor.recordError(error, 'initialization');
    }
  }

  /**
   * Register components for lazy loading
   */
  registerLazyComponents() {
    // Register table components
    this.lazyLoader.registerComponent('ridersTable', () => 
      this.loadTableComponent('riders-table')
    );
    
    this.lazyLoader.registerComponent('requestsTable', () => 
      this.loadTableComponent('requests-table')
    );
    
    this.lazyLoader.registerComponent('assignmentsTable', () => 
      this.loadTableComponent('assignments-table')
    );
    
    // Register form components
    this.lazyLoader.registerComponent('riderForm', () => 
      this.loadFormComponent('rider-form')
    );
    
    this.lazyLoader.registerComponent('requestForm', () => 
      this.loadFormComponent('request-form')
    );
  }

  /**
   * Load a table component
   */
  async loadTableComponent(componentName) {
    // Simulate component loading - in real implementation,
    // this would load external scripts/modules
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Table component ${componentName} loaded`);
  }

  /**
   * Load a form component
   */
  async loadFormComponent(componentName) {
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`Form component ${componentName} loaded`);
  }

  /**
   * Set up global error handling
   */
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      this.performanceMonitor.recordError(event.error, 'global');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.performanceMonitor.recordError(event.reason, 'promise');
    });
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor navigation timing
    if (performance.navigation) {
      const loadTime = performance.now();
      this.performanceMonitor.recordLoadTime('initial', loadTime);
    }

    // Monitor resource loading
    if (performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource');
      console.log(`📊 Loaded ${resources.length} resources`);
    }
  }

  /**
   * Optimized API call wrapper
   */
  async callAPI(functionName, params = []) {
    const startTime = performance.now();
    
    try {
      const result = await this.apiBatcher.call(functionName, params);
      const duration = performance.now() - startTime;
      
      this.performanceMonitor.recordAPICall(functionName, duration);
      return result;
      
    } catch (error) {
      this.performanceMonitor.recordError(error, `API call: ${functionName}`);
      throw error;
    }
  }

  /**
   * Get comprehensive performance stats
   */
  getPerformanceStats() {
    return {
      apiStats: this.apiBatcher.getStats(),
      performanceMetrics: this.performanceMonitor.getSummary(),
      lazyLoadedComponents: Array.from(this.lazyLoader.loadedComponents),
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        total: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
      };
    }
    return null;
  }
}

// Global instance
const appPerformanceManager = new AppPerformanceManager();

/**
 * Initialize performance optimizations when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    appPerformanceManager.initialize();
  });
} else {
  appPerformanceManager.initialize();
}

/**
 * Global utility functions for optimized operations
 */

// Optimized google.script.run replacement
window.optimizedAPI = {
  call: (functionName, ...params) => appPerformanceManager.callAPI(functionName, params),
  batch: (calls) => calls.map(({ func, params }) => appPerformanceManager.callAPI(func, params))
};

// Optimized DOM manipulation
window.optimizedDOM = {
  updateTable: (tableId, data, renderFunction) => {
    const table = document.getElementById(tableId);
    if (table) {
      appPerformanceManager.domOptimizer.updateTable(table, data, renderFunction);
    }
  },
  
  batchUpdate: (elementId, updates) => {
    const element = document.getElementById(elementId);
    if (element) {
      appPerformanceManager.domOptimizer.batchUpdate(element, updates);
    }
  }
};

// Performance monitoring utilities
window.performanceUtils = {
  mark: (name) => appPerformanceManager.performanceMonitor.mark(name),
  getStats: () => appPerformanceManager.getPerformanceStats(),
  recordLoadTime: (pageName, duration) => 
    appPerformanceManager.performanceMonitor.recordLoadTime(pageName, duration)
};

console.log('📈 Frontend performance optimizations loaded');