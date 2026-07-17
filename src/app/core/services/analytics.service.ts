import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly appsScriptUrl = 'https://script.google.com/macros/s/AKfycbwJ6wdT7YQfxwUDWQ9pvnx7SFu3qm8r2AVYaRWZJWnx4YJGZNx9xkrkp0a5WB426uJd/exec';
  private sessionStartTime: number = Date.now();
  private maxScrollDepth: number = 0;
  private isBrowser: boolean;
  private hasLoggedClose: boolean = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.setupScrollTracking();
      this.setupUnloadTracking();
    }
  }

  /** Tracks how far down the page the user scrolls */
  private setupScrollTracking(): void {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const pct = Math.round((scrollTop / docHeight) * 100);
        this.maxScrollDepth = Math.max(this.maxScrollDepth, pct);
      }
    }, { passive: true });
  }

  /** Captures page unload/tab close and logs the final session stats */
  private setupUnloadTracking(): void {
    const sendCloseLog = () => {
      if (this.hasLoggedClose) return;
      this.hasLoggedClose = true;

      const specs = this.getBrowserSpecs();
      
      // Fetch battery status synchronously if cached, or skip to avoid blocking page close
      this.sendDataToSheet({
        ...specs,
        actionType: 'Page Close',
        batteryLevel: 'Closed',
        batteryCharging: 'Closed',
        ip: 'Closed',
        country: 'Closed',
        city: 'Closed',
        isp: 'Closed'
      });
    };

    // Modern mobile & desktop browsers use 'pagehide' for tab closes / page transitions
    window.addEventListener('pagehide', sendCloseLog);

    // Fallback: fires when the tab is backgrounded
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendCloseLog();
      }
    });
  }

  /** Fires on page load — collects all specs and sends to Google Sheets */
  public logVisit(): void {
    if (!this.isBrowser) return;

    const specs = this.getBrowserSpecs();

    // Battery status API
    const batteryPromise = (navigator as any).getBattery
      ? (navigator as any).getBattery().then((b: any) => ({
          batteryLevel: `${Math.round(b.level * 100)}%`,
          batteryCharging: b.charging ? 'Yes' : 'No'
        }))
      : Promise.resolve({ batteryLevel: 'Unknown', batteryCharging: 'Unknown' });

    // Geolocation IP lookup
    const geoPromise = fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .catch(() => ({}));

    Promise.all([batteryPromise, geoPromise]).then(([battery, geo]) => {
      this.sendDataToSheet({
        ...specs,
        ...battery,
        actionType: 'Page Load',
        ip: geo.ip || 'Unknown',
        country: geo.country_name || 'Unknown',
        city: geo.city || 'Unknown',
        isp: geo.org || 'Unknown',
        timezone: geo.timezone || specs.timezone
      });
    });
  }

  /** Logs custom user events (like high score or email submission) */
  public logEvent(eventName: string, detail: string | number): void {
    if (!this.isBrowser) return;

    const specs = this.getBrowserSpecs();
    this.sendDataToSheet({
      ...specs,
      actionType: `Event: ${eventName}`,
      score: detail.toString()
    });
  }

  private getBrowserSpecs() {
    // GPU model via WebGL
    let gpu = 'Unknown';
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as any;
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      }
    } catch (e) {}

    // Page load speed
    let loadTime = 'Unknown';
    try {
      const entries = performance.getEntriesByType('navigation');
      if (entries?.length) {
        loadTime = `${Math.round((entries[0] as any).duration)} ms`;
      } else if (performance.timing) {
        const t = performance.timing;
        loadTime = `${t.loadEventEnd - t.navigationStart} ms`;
      }
    } catch (e) {}

    // Ad-blocker check
    let adBlocker = 'No';
    try {
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads ad-id';
      Object.assign(testAd.style, { position: 'absolute', top: '-9999px', left: '-9999px' });
      document.body.appendChild(testAd);
      if (testAd.offsetHeight === 0) adBlocker = 'Yes';
      document.body.removeChild(testAd);
    } catch (e) {}

    // Connection info
    let connectionType = 'Unknown', downlink = 'Unknown', rtt = 'Unknown';
    try {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        connectionType = conn.effectiveType || 'Unknown';
        downlink = conn.downlink != null ? `${conn.downlink} Mbps` : 'Unknown';
        rtt = conn.rtt != null ? `${conn.rtt} ms` : 'Unknown';
      }
    } catch (e) {}

    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const pixelRatio = window.devicePixelRatio || 1;

    // Detect specific OS / device type from User Agent
    let deviceOS = 'Unknown';
    if (/iPhone/.test(ua)) {
      const match = ua.match(/iPhone OS (\d+_\d+)/);
      const version = match ? match[1].replace('_', '.') : '';
      deviceOS = `iPhone iOS ${version}`.trim();
    } else if (/iPad/.test(ua)) {
      const match = ua.match(/OS (\d+_\d+)/);
      const version = match ? match[1].replace('_', '.') : '';
      deviceOS = `iPad iOS ${version}`.trim();
    } else if (/Android/.test(ua)) {
      const match = ua.match(/Android ([\d.]+)/);
      const version = match ? match[1] : '';
      deviceOS = `Android ${version}`.trim();
    } else if (/Windows NT 10/.test(ua)) {
      deviceOS = 'Windows 10/11';
    } else if (/Windows NT 6.3/.test(ua)) {
      deviceOS = 'Windows 8.1';
    } else if (/Macintosh/.test(ua)) {
      const match = ua.match(/Mac OS X ([\d_]+)/);
      const version = match ? match[1].replace(/_/g, '.') : '';
      deviceOS = `macOS ${version}`.trim();
    } else if (/Linux/.test(ua)) {
      deviceOS = 'Linux';
    }

    return {
      // Identity & Device
      userAgent: ua,
      deviceType: isMobile ? 'Mobile' : 'Desktop',
      deviceOS,
      touchSupport: ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'Yes' : 'No',

      // Hardware
      gpu,
      cpu: navigator.hardwareConcurrency || 'Unknown',
      ram: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Unknown',

      // Display
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: `${screen.colorDepth}-bit`,
      pixelRatio: pixelRatio.toFixed(1),
      isRetina: pixelRatio >= 2 ? 'Yes' : 'No',

      // Locale
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      language: navigator.language || 'Unknown',
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light',

      // Network
      connectionType,
      downlink,
      rtt,

      // Settings
      cookiesEnabled: navigator.cookieEnabled ? 'Yes' : 'No',
      pluginCount: navigator.plugins?.length || 0,
      isOnline: navigator.onLine ? 'Yes' : 'No',
      adBlocker,

      // Performance
      loadTime,
      scrollDepth: `${this.maxScrollDepth}%`,
      duration: Math.round((Date.now() - this.sessionStartTime) / 1000),

      // Source
      referrer: document.referrer || 'Direct',
    };
  }

  private sendDataToSheet(data: any): void {
    fetch(this.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true, // Crucial for reliable delivery on page close/exit!
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.warn('Analytics log failed:', err));
  }
}
