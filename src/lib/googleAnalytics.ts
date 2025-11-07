// No-op Google Analytics module: analytics désactivés
export const initGoogleAnalytics = (): void => {};
export const trackPageView = (_path?: string, _title?: string): void => {};
export const trackEvent = (_eventName?: string, _params?: Record<string, any>): void => {};
export const setUserProperties = (_properties?: Record<string, any>): void => {};
export const setUserId = (_userId?: string): void => {};

export default {
  initGoogleAnalytics,
  trackPageView,
  trackEvent,
  setUserProperties,
  setUserId
};