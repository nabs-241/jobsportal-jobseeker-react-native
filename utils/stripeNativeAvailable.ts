/**
 * Check if Stripe native module (OnrampSdk/StripeSdk) is available.
 * In Expo Go these are not present; in a dev build they are.
 * Use this to avoid requiring @stripe/stripe-react-native when running in Expo Go.
 */
let cached: boolean | null = null;

export function isStripeNativeAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    // Expo Go never has Stripe native modules – avoid loading @stripe/stripe-react-native at all
    const Constants = require('expo-constants').default;
    if (Constants.appOwnership === 'expo') {
      cached = false;
      return false;
    }
    const RN = require('react-native');
    if (RN.NativeModules?.OnrampSdk != null || RN.NativeModules?.StripeSdk != null) {
      cached = true;
      return true;
    }
    try {
      const Turbo = require('react-native/Libraries/TurboModule/TurboModuleRegistry');
      if (Turbo.get('OnrampSdk') != null || Turbo.get('StripeSdk') != null) {
        cached = true;
        return true;
      }
    } catch (_) {}
    cached = false;
    return false;
  } catch {
    cached = false;
    return false;
  }
}
