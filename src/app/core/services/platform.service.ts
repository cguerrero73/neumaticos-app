import { Injectable } from '@angular/core';

/**
 * Platform detection service
 * Detecta si la app corre en web, iOS o Android
 */
@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private platform: 'web' | 'ios' | 'android' = 'web';

  constructor() {
    this.detectPlatform();
  }

  private detectPlatform(): void {
    // @ts-ignore - Capacitor globals
    if (typeof window !== 'undefined' && window['Capacitor']) {
      // @ts-ignore
      const { Capacitor } = window;
      this.platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android';
    }
  }

  getPlatform(): 'web' | 'ios' | 'android' {
    return this.platform;
  }

  isMobile(): boolean {
    return this.platform === 'ios' || this.platform === 'android';
  }

  isWeb(): boolean {
    return this.platform === 'web';
  }

  needsVerticalWheels(): boolean {
    // Mobile apps need vertical wheel orientation
    return this.isMobile();
  }
}
