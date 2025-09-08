import { API_CONFIG } from '../config/api';

/**
 * Background health check for PyMuPDF server
 * Logs status to console for debugging without visual UI elements
 */
class ServerHealthMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private lastStatus: 'online' | 'offline' | 'unknown' = 'unknown';
  private isFirstCheck = true;

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.PYMUPDF_SERVER_URL}/health`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          if (this.lastStatus !== 'online' || this.isFirstCheck) {
            console.log('✅ PyMuPDF Server Online:', API_CONFIG.PYMUPDF_SERVER_URL);
            this.lastStatus = 'online';
          }
          this.isFirstCheck = false;
          return true;
        }
      }
      
      throw new Error(`Server unhealthy: ${response.status}`);
    } catch (error) {
      if (this.lastStatus !== 'offline' || this.isFirstCheck) {
        console.warn('⚠️ PyMuPDF Server Offline:', API_CONFIG.PYMUPDF_SERVER_URL);
        console.warn('   To fix: python3 pymupdf_highlight_server.py');
        if (error instanceof Error) {
          console.debug('   Error details:', error.message);
        }
        this.lastStatus = 'offline';
      }
      this.isFirstCheck = false;
      return false;
    }
  }

  startMonitoring(intervalMs = 30000): void {
    // Initial check
    this.checkHealth();
    
    // Stop any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Perform a one-time health check with detailed error reporting
   * Used before critical operations like PDF analysis
   */
  async ensureServerAvailable(): Promise<void> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      throw new Error(
        `PyMuPDF server is not available at ${API_CONFIG.PYMUPDF_SERVER_URL}. ` +
        `Please ensure the server is running: python3 pymupdf_highlight_server.py`
      );
    }
  }
}

// Export singleton instance
export const serverHealthMonitor = new ServerHealthMonitor();

// Auto-start monitoring in development
if (import.meta.env.DEV) {
  serverHealthMonitor.startMonitoring();
}