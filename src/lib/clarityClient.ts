// No-op Clarity module: analytics désactivés
export const initClarity = (): void => {};
export const setUserTag = (_key?: string, _value?: string): void => {};
export const trackEvent = (_eventName?: string, _properties?: Record<string, any>): void => {};
export const updateConsent = (_hasConsent?: boolean): void => {};