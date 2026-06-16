// Web stub for @stripe/stripe-react-native (native-only, not available on web)
const React = require('react');

const StripeProvider = ({ children }) => children;
const CardField = () => null;
const useStripe = () => ({
  confirmPayment: async () => ({ error: { message: 'Not available on web' } }),
  createPaymentMethod: async () => ({ error: { message: 'Not available on web' } }),
  createToken: async () => ({ error: { message: 'Not available on web' } }),
  handleNextAction: async () => ({ error: { message: 'Not available on web' } }),
  retrievePaymentIntent: async () => ({ error: { message: 'Not available on web' } }),
  initPaymentSheet: async () => ({ error: { message: 'Not available on web' } }),
  presentPaymentSheet: async () => ({ error: { message: 'Not available on web' } }),
  confirmPaymentSheetPayment: async () => ({ error: { message: 'Not available on web' } }),
});

module.exports = { StripeProvider, CardField, useStripe };
