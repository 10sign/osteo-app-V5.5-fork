// No-op Matomo module: analytics désactivés
export const initMatomoTagManager = (): void => {};
export const trackPageView = (_path?: string, _title?: string): void => {};
export const trackEvent = (_category?: string, _action?: string, _name?: string, _value?: number): void => {};
export const setCustomDimension = (_dimensionId?: number, _value?: string): void => {};
export const setUserId = (_userId?: string): void => {};

export default {
  initMatomoTagManager,
  trackPageView,
  trackEvent,
  setCustomDimension,
  setUserId
};