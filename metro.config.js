const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Mock @stripe/stripe-react-native for all platforms:
//  - web: native module unavailable in browser
//  - ios/android: unavailable in Expo Go (requires custom dev build)
// To enable real Stripe in a production EAS build, remove this resolver.
config.resolver = config.resolver || {};
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@stripe/stripe-react-native') {
    return {
      filePath: path.resolve(__dirname, 'mocks/stripe-react-native.web.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
