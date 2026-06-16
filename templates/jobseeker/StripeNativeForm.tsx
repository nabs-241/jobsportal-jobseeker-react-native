/**
 * Native Stripe card form. Only require this file when isStripeNativeAvailable() is true
 * (e.g. in a dev build). In Expo Go the native module is missing, so PackagePurchase uses WebView instead.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { CardField, useStripe, StripeProvider } from '@stripe/stripe-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { packageService } from '../../services';
import type { PackageDetail } from '../../services/packageService';

export type StripeOrderFn = (packageId: number, stripeToken: string) => Promise<{ success: boolean; error?: string; message?: string }>;

const StripeCardFormView: React.FC<{
  detail: PackageDetail | { id: number; package_title: string; package_price: number; currency: string };
  formatPrice: (price: number, currency: string | undefined | null) => string;
  onSuccess: () => void;
  onClose: () => void;
  t: (key: string) => string;
  onStripeOrder?: StripeOrderFn;
}> = ({ detail, formatPrice, onSuccess, onClose, t, onStripeOrder }) => {
  const stripe = useStripe();
  const [cardComplete, setCardComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!cardComplete || !stripe) {
      Alert.alert(t('error'), t('invalid_card') || 'Please enter complete card details.');
      return;
    }
    setLoading(true);
    try {
      const { token, error } = await stripe.createToken({ type: 'Card' });
      if (error) {
        Alert.alert(t('error'), error.message || t('something_went_wrong'));
        setLoading(false);
        return;
      }
      if (!token?.id) {
        Alert.alert(t('error'), t('something_went_wrong'));
        setLoading(false);
        return;
      }
      const res = onStripeOrder
        ? await onStripeOrder(detail.id, token.id)
        : await packageService.stripeOrderPackage(detail.id, token.id);
      setLoading(false);
      if (res.success) {
        onClose();
        Alert.alert(t('success'), t('package_activated_successfully') || 'Package activated successfully.', [
          { text: 'OK', onPress: onSuccess },
        ]);
      } else {
        Alert.alert(t('error'), res.error || res.message || t('something_went_wrong'));
      }
    } catch (e) {
      setLoading(false);
      Alert.alert(t('error'), t('something_went_wrong'));
    }
  };

  const stripeFormStyles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 52,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    closeBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
    headerRight: { width: 40 },
    scroll: { flex: 1 },
    scrollContent: { padding: 20 },
    summaryCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    summaryTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    summaryPrice: { fontSize: 20, fontWeight: '800', color: '#6366F1' },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 12 },
    cardInputWrap: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    payButton: {
      backgroundColor: '#6366F1',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    payButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });

  return (
    <View style={stripeFormStyles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {Platform.OS === 'android' ? (
        <View style={{ height: StatusBar.currentHeight ?? 0, backgroundColor: '#fff' }} />
      ) : null}
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
        <View style={stripeFormStyles.header}>
          <TouchableOpacity style={stripeFormStyles.closeBtn} onPress={onClose} disabled={loading} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={stripeFormStyles.headerTitle} numberOfLines={1}>
            {t('pay_with_stripe') || 'Pay with Stripe'}
          </Text>
          <View style={stripeFormStyles.headerRight} />
        </View>
        <ScrollView style={stripeFormStyles.scroll} contentContainerStyle={stripeFormStyles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={stripeFormStyles.summaryCard}>
          <Text style={stripeFormStyles.summaryTitle}>{detail.package_title}</Text>
          <Text style={stripeFormStyles.summaryPrice}>{formatPrice(detail.package_price, detail.currency)}</Text>
        </View>
        <Text style={stripeFormStyles.sectionTitle}>{t('credit_debit_card') || 'Credit or Debit Card'}</Text>
        <View style={stripeFormStyles.cardInputWrap}>
          <CardField
            postalCodeEnabled={false}
            placeholders={{ number: '4242 4242 4242 4242' }}
            cardStyle={{ backgroundColor: '#ffffff', textColor: '#1E293B' }}
            style={{ width: '100%', height: 50 }}
            onCardChange={(cardDetails) => setCardComplete(cardDetails.complete)}
          />
        </View>
        <TouchableOpacity style={stripeFormStyles.payButton} onPress={handlePay} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={stripeFormStyles.payButtonText}>
              {t('pay') || 'Pay'} {formatPrice(detail.package_price, detail.currency)}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export interface StripeNativeFormProps {
  publishableKey: string;
  detail: PackageDetail | { id: number; package_title: string; package_price: number; currency: string };
  formatPrice: (price: number, currency: string | undefined | null) => string;
  onSuccess: () => void;
  onClose: () => void;
  t: (key: string) => string;
  onStripeOrder?: StripeOrderFn;
}

const StripeNativeForm: React.FC<StripeNativeFormProps> = (props) => (
  <StripeProvider publishableKey={props.publishableKey}>
    <StripeCardFormView
      detail={props.detail}
      formatPrice={props.formatPrice}
      onSuccess={props.onSuccess}
      onClose={props.onClose}
      t={props.t}
      onStripeOrder={props.onStripeOrder}
    />
  </StripeProvider>
);

export default StripeNativeForm;
