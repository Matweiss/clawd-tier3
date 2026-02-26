// error-handler.js - Tier 3: Self-healing error handling
// Auto-retry, exponential backoff, circuit breaker pattern

class ErrorHandler {
  constructor() {
    this.circuitBreakers = new Map();
    this.retryCounts = new Map();
    this.errorLog = [];
  }

  async execute(operation, options = {}) {
    const {
      name = 'unnamed',
      maxRetries = 3,
      backoffMs = 1000,
      circuitThreshold = 5,
      timeoutMs = 30000
    } = options;

    // Check circuit breaker
    if (this.isCircuitOpen(name)) {
      const err = new Error(`Circuit breaker open for: ${name}`);
      err.code = 'CIRCUIT_OPEN';
      throw err;
    }

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[RETRY] ${name} - Attempt ${attempt}/${maxRetries}`);
        
        const result = await this.runWithTimeout(operation, timeoutMs);
        
        // Success - reset counters
        this.recordSuccess(name);
        return result;
        
      } catch (err) {
        lastError = err;
        this.recordError(name, err);
        
        if (attempt < maxRetries) {
          const delay = backoffMs * Math.pow(2, attempt - 1); // Exponential
          console.log(`[RETRY] Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.openCircuit(name, circuitThreshold);
    this.logPermanentFailure(name, lastError);
    throw lastError;
  }

  async runWithTimeout(operation, timeoutMs) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  }

  isCircuitOpen(name) {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) return false;
    
    if (breaker.open) {
      // Check if it's time to try again (5 min cooldown)
      const cooldown = 5 * 60 * 1000;
      if (Date.now() - breaker.openedAt > cooldown) {
        console.log(`[CIRCUIT] Half-open for: ${name}`);
        breaker.open = false; // Half-open, allow one request
        return false;
      }
      return true;
    }
    return false;
  }

  openCircuit(name, threshold) {
    const errors = this.retryCounts.get(name) || [];
    if (errors.length >= threshold) {
      this.circuitBreakers.set(name, { open: true, openedAt: Date.now() });
      console.error(`[CIRCUIT] OPEN for: ${name} - too many failures`);
    }
  }

  recordSuccess(name) {
    this.retryCounts.set(name, []);
  }

  recordError(name, error) {
    const errors = this.retryCounts.get(name) || [];
    errors.push({ time: Date.now(), error: error.message });
    this.retryCounts.set(name, errors);
    
    this.errorLog.push({
      operation: name,
      error: error.message,
      timestamp: new Date(),
      type: error.code || 'UNKNOWN'
    });
  }

  logPermanentFailure(name, error) {
    console.error(`[FAILURE] ${name} permanently failed after all retries:`);
    console.error(error.message);
    
    // Notify admin
    this.notifyFailure(name, error);
  }

  async notifyFailure(name, error) {
    const notifier = require('./smart-notifications.js');
    await notifier.send({
      type: 'system_error',
      priority: 'high',
      content: `⚠️ ${name} failed permanently: ${error.message}`
    });
  }

  getHealthStatus() {
    const status = {};
    for (const [name, errors] of this.retryCounts) {
      status[name] = {
        errorCount: errors.length,
        lastError: errors[errors.length - 1]?.time,
        circuitOpen: this.isCircuitOpen(name)
      };
    }
    return status;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ErrorHandler;

// Usage example:
// const handler = new ErrorHandler();
// const result = await handler.execute(
//   () => fetchHubSpotDeals(),
//   { name: 'hubspot_fetch', maxRetries: 3 }
// );
