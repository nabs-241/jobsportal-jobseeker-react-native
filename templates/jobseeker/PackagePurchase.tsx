import React, { useState, useEffect, useCallback } from 'react';
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
// @ts-ignore - react-native-webview types after npm install
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../Header';
import { useTranslation } from 'react-i18next';
import { packageService, API_CONFIG } from '../../services';
import { getAuthToken } from '../../services/authStorage';
import type { PackageDetail, PackageDetailPaymentGateway } from '../../services/packageService';
import { isStripeNativeAvailable } from '../../utils/stripeNativeAvailable';

interface PackagePurchaseProps {
  packageId: number;
  onBack: () => void;
  onSuccess?: () => void;
}

const PackagePurchase: React.FC<PackagePurchaseProps> = ({ packageId, onBack, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [activating, setActivating] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [stripeFormVisible, setStripeFormVisible] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  /** Only show payment WebView/form after user has explicitly chosen a method (never auto-open). */
  const [userChosePaymentMethod, setUserChosePaymentMethod] = useState(false);
  /** After payment success, show success screen with purchased package info before going back. */
  const [paymentSuccessDetail, setPaymentSuccessDetail] = useState<PackageDetail | null>(null);

  const loadDetail = useCallback(async () => {
    const res = await packageService.getPackageDetail(packageId);
    if (res.success && res.data) {
      setDetail(res.data);
      setError(null);
    } else {
      setError(res.error || t('something_went_wrong'));
      setDetail(null);
    }
  }, [packageId, t]);

  useEffect(() => {
    setLoading(true);
    loadDetail().finally(() => setLoading(false));
  }, [loadDetail]);

  const formatPrice = (price: number, currency: string | undefined | null) => {
    const defaultCurrency = (API_CONFIG as any).PACKAGES_DEFAULT_CURRENCY;
    const c = (currency && currency.trim()) || defaultCurrency || 'USD';
    const sym = c === 'USD' ? '$' : c === 'EUR' ? '€' : c;
    return `${sym}${price}`;
  };

  const handleActivateFree = async () => {
    if (!detail?.is_free) return;
    setActivating(true);
    const res = await packageService.orderFreePackage(detail.id);
    setActivating(false);
    if (res.success) {
      Alert.alert(t('success'), t('package_activated_successfully') || 'Package activated successfully.', [
        { text: 'OK', onPress: () => { onSuccess?.(); onBack(); } },
      ]);
    } else {
      Alert.alert(t('error'), res.error || t('something_went_wrong'));
    }
  };

  const handlePaymentGateway = async (gateway: PackageDetailPaymentGateway) => {
    if (!detail) return;
    const key = (gateway.key || '').toLowerCase();
    setUserChosePaymentMethod(true);

    if (key === 'paypal') {
      setInitiatingPayment(true);
      const res = await packageService.initiatePayPalPayment(detail.id);
      setInitiatingPayment(false);
      const url =
        res.data?.approval_url ||
        (res.data as any)?.approvalUrl ||
        (res.data as any)?.payment_url ||
        (res.data as any)?.redirect_url;
      if (res.success && url) {
        setWebViewLoading(true);
        setPaymentUrl(url);
      } else {
        setUserChosePaymentMethod(false);
        Alert.alert(t('error'), res.error || res.message || t('something_went_wrong'));
      }
      return;
    }

    if (key === 'stripe') {
      const pk = gateway.publishable_key?.trim();
      if (!pk) {
        setUserChosePaymentMethod(false);
        Alert.alert(t('error'), t('stripe_not_configured') || 'Stripe is not configured for this site.');
        return;
      }
      if (isStripeNativeAvailable()) {
        setStripePublishableKey(pk);
        setStripeFormVisible(true);
        return;
      }
      setInitiatingPayment(true);
      const stripeRes = await packageService.createUserStripeCheckoutSession(detail.id);
      setInitiatingPayment(false);
      const checkoutUrl = stripeRes.data?.checkout_url;
      if (stripeRes.success && checkoutUrl) {
        setWebViewLoading(true);
        setPaymentUrl(checkoutUrl);
      } else {
        setUserChosePaymentMethod(false);
        Alert.alert(t('error'), stripeRes.error || stripeRes.message || t('something_went_wrong'));
      }
      return;
    }

    if (key === 'paystack') {
      setInitiatingPayment(true);
      const res = await packageService.initiatePaystackPayment(detail.id);
      setInitiatingPayment(false);
      const url = res.data?.authorization_url;
      if (res.success && url) {
        setWebViewLoading(true);
        setPaymentUrl(url);
      } else {
        setUserChosePaymentMethod(false);
        Alert.alert(t('error'), res.error || res.message || t('something_went_wrong'));
      }
      return;
    }

    if (key === 'iyzico') {
      setInitiatingPayment(true);
      const res = await packageService.initiateIyzicoPayment(detail.id);
      setInitiatingPayment(false);
      const url = res.data?.payment_page_url;
      if (res.success && url) {
        setWebViewLoading(true);
        setPaymentUrl(url);
      } else {
        setUserChosePaymentMethod(false);
        Alert.alert(t('error'), res.error || res.message || t('something_went_wrong'));
      }
      return;
    }

    if (key === 'razorpay') {
      const webBase = (API_CONFIG as any).PACKAGES_ORDER_WEB_BASE;
      const baseUrl = API_CONFIG.BASE_URL || '';
      const siteBase = webBase || baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      let orderUrl = `${siteBase}/razorpay-order-form/${detail.id}/new`;
      const token = await getAuthToken();
      if (token) {
        orderUrl += (orderUrl.includes('?') ? '&' : '?') + 'api_token=' + encodeURIComponent(token);
      }
      setWebViewLoading(true);
      setPaymentUrl(orderUrl);
      return;
    }

    if (key === 'payu') {
      const webBase = (API_CONFIG as any).PACKAGES_ORDER_WEB_BASE;
      const baseUrl = API_CONFIG.BASE_URL || '';
      const siteBase = webBase || baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      let orderUrl = `${siteBase}/payu-order-package?package_id=${detail.id}`;
      const token = await getAuthToken();
      if (token) {
        orderUrl += (orderUrl.includes('?') ? '&' : '?') + 'api_token=' + encodeURIComponent(token);
      }
      setWebViewLoading(true);
      setPaymentUrl(orderUrl);
      return;
    }

    // Paytm or other: open web order URL in WebView (order-package may default to PayPal on web)
    const webBase = (API_CONFIG as any).PACKAGES_ORDER_WEB_BASE;
    const baseUrl = API_CONFIG.BASE_URL || '';
    const siteBase = webBase || baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    let orderUrl = `${siteBase}/order-package/${detail.id}`;
    const token = await getAuthToken();
    if (token) {
      orderUrl += (orderUrl.includes('?') ? '&' : '?') + 'api_token=' + encodeURIComponent(token);
    }
    setWebViewLoading(true);
    setPaymentUrl(orderUrl);
  };

  const successPatterns: string[] = Array.isArray((API_CONFIG as any).PACKAGES_PAYMENT_SUCCESS_URL_PATTERNS)
    ? (API_CONFIG as any).PACKAGES_PAYMENT_SUCCESS_URL_PATTERNS
    : (API_CONFIG as any).PACKAGES_PAYMENT_SUCCESS_URL_CONTAINS
      ? [(API_CONFIG as any).PACKAGES_PAYMENT_SUCCESS_URL_CONTAINS]
      : ['paypal-execute', 'payment-status', 'paystack-callback', 'iyzico-callback', 'payment-success', 'order-success', 'razorpay', 'success'];

  const handlePaymentCallbackUrl = (url: string): boolean => {
    if (!url) return false;
    const isMatch = successPatterns.some((p: string) => p && url.includes(p)) || url.includes('user/paypal-execute');
    if (!isMatch) return false;

    // PayPal callback must include both identifiers; otherwise likely cancel/error page.
    if (url.includes('paypal-execute')) {
      const hasPaymentId = /[?&]paymentId=/.test(url);
      const hasPayerId = /[?&]PayerID=/.test(url);
      if (!hasPaymentId || !hasPayerId) return false;
    }

    setPaymentUrl(null);
    setWebViewLoading(true);
    setUserChosePaymentMethod(false);
    if (detail) setPaymentSuccessDetail(detail);
    return true;
  };

  const handleWebViewNavigationStateChange = (navState: { url: string }) => {
    const url = navState?.url || '';
    if (url.includes('stripe-checkout-cancel')) {
      closePaymentWebView();
      return;
    }
    if (url.includes('stripe-checkout-complete')) {
      return;
    }
    if (handlePaymentCallbackUrl(url)) {
      setPaymentUrl(null);
    }
  };

  const handlePaymentWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.stripe_checkout === 'success') {
        setPaymentUrl(null);
        setUserChosePaymentMethod(false);
        if (detail) setPaymentSuccessDetail(detail);
        return;
      }
      if (data.stripe_checkout === 'cancelled') {
        closePaymentWebView();
        return;
      }
      if (data.stripe_checkout === 'failed') {
        closePaymentWebView();
        Alert.alert(t('error'), t('payment_failed') || 'Payment could not be completed.');
      }
    } catch (_) {
      // ignore non-JSON messages
    }
  };

  const closePaymentWebView = () => {
    setPaymentUrl(null);
    setWebViewLoading(true);
    setUserChosePaymentMethod(false);
  };

  const closeStripeForm = () => {
    setStripeFormVisible(false);
    setStripePublishableKey(null);
    setUserChosePaymentMethod(false);
  };

  // Success screen: show what was purchased, then Done goes back
  if (paymentSuccessDetail) {
    const successDetail = paymentSuccessDetail;
    const handleDone = () => {
      setPaymentSuccessDetail(null);
      onSuccess?.();
      onBack();
    };
    return (
      <View style={styles.container}>
        <Header title={t('payment_success') || 'Payment Success'} onMenuPress={() => {}} onBack={onBack} showBack showMenu={false} />
        <View style={styles.successWrap}>
          <MaterialIcons name="check-circle" size={80} color="#6366F1" />
          <Text style={styles.successTitle}>{t('payment_success') || 'Payment successful'}</Text>
          <Text style={styles.successMessage}>
            {t('payment_success_purchased') || 'You have successfully purchased:'}
          </Text>
          <View style={styles.successCard}>
            <Text style={styles.successPackageTitle}>{successDetail.package_title}</Text>
            <Text style={styles.successMeta}>
              {formatPrice(successDetail.package_price, successDetail.currency)} • {successDetail.package_num_days} {t('days')}
              {successDetail.package_num_listings != null && successDetail.package_num_listings > 0
                ? ` • ${successDetail.package_num_listings} ${t('job_applications')}`
                : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleDone}>
            <Text style={styles.primaryButtonText}>{t('done') || 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Stripe native form only (dev build). Otherwise Checkout opens in WebView below.
  if (userChosePaymentMethod && stripeFormVisible && stripePublishableKey && detail && isStripeNativeAvailable()) {
    try {
      const StripeNativeForm = require('./StripeNativeForm').default;
      return (
        <StripeNativeForm
          publishableKey={stripePublishableKey}
          detail={detail}
          formatPrice={formatPrice}
          onSuccess={() => { if (detail) setPaymentSuccessDetail(detail); closeStripeForm(); }}
          onClose={closeStripeForm}
          t={t}
          onStripeOrder={async (pkgId: number, token: string) => {
            const res = await packageService.stripeOrderPackage(pkgId, token);
            return { success: !!res.success, error: (res as any).error, message: (res as any).message };
          }}
        />
      );
    } catch (_) {
      // fall through
    }
  }

  // PayPal or Stripe Checkout (hosted) in app WebView
  if (userChosePaymentMethod && paymentUrl) {
    const u = (paymentUrl || '').toLowerCase();
    const isPayPal = u.includes('paypal');
    const isStripeHosted = u.includes('checkout.stripe.com');
    const headerTitle = isPayPal
      ? (t('pay_with_paypal') || 'Pay with PayPal')
      : isStripeHosted
        ? (t('pay_with_stripe') || 'Pay with Stripe')
        : (t('payment_method') || 'Payment');
    return (
      <View style={styles.paymentScreenRoot}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        {Platform.OS === 'ios' ? (
          <SafeAreaView style={styles.paymentSafeArea}>
            <View style={styles.webViewHeader}>
              <TouchableOpacity style={styles.webViewCloseBtn} onPress={closePaymentWebView}>
                <MaterialIcons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.webViewHeaderTitle} numberOfLines={1}>{headerTitle}</Text>
              <View style={styles.webViewHeaderRight} />
            </View>
            {webViewLoading && (
              <View style={styles.webViewLoadingWrap}>
                <ActivityIndicator size="large" color="#17D27C" />
                <Text style={styles.loadingText}>{t('loading')}...</Text>
              </View>
            )}
            <WebView
              source={{ uri: paymentUrl }}
              style={[styles.webView, webViewLoading && styles.webViewHidden]}
              onLoadStart={() => setWebViewLoading(true)}
              onLoadEnd={() => setWebViewLoading(false)}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              onMessage={handlePaymentWebViewMessage}
              onShouldStartLoadWithRequest={(request) => !handlePaymentCallbackUrl(request.url || '')}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              scalesPageToFit
              originWhitelist={['*']}
              setSupportMultipleWindows={false}
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
            />
          </SafeAreaView>
        ) : (
          <View style={styles.paymentSafeArea}>
            <View style={[styles.webViewHeader, { paddingTop: (StatusBar.currentHeight ?? 0) + 8 }]}>
              <TouchableOpacity style={styles.webViewCloseBtn} onPress={closePaymentWebView}>
                <MaterialIcons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.webViewHeaderTitle} numberOfLines={1}>{headerTitle}</Text>
              <View style={styles.webViewHeaderRight} />
            </View>
            {webViewLoading && (
              <View style={styles.webViewLoadingWrap}>
                <ActivityIndicator size="large" color="#17D27C" />
                <Text style={styles.loadingText}>{t('loading')}...</Text>
              </View>
            )}
            <WebView
              source={{ uri: paymentUrl }}
              style={[styles.webView, webViewLoading && styles.webViewHidden]}
              onLoadStart={() => setWebViewLoading(true)}
              onLoadEnd={() => setWebViewLoading(false)}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              onMessage={handlePaymentWebViewMessage}
              onShouldStartLoadWithRequest={(request) => !handlePaymentCallbackUrl(request.url || '')}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              scalesPageToFit
              originWhitelist={['*']}
              mixedContentMode={Platform.OS === 'android' ? 'compatibility' : undefined}
              setSupportMultipleWindows={false}
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
            />
          </View>
        )}
      </View>
    );
  }

  if (loading && !detail) {
    return (
      <View style={styles.container}>
        <Header title={t('package_purchase')} onMenuPress={() => {}} onBack={onBack} showBack showMenu={false} />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{t('loading')}...</Text>
        </View>
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={styles.container}>
        <Header title={t('package_purchase')} onMenuPress={() => {}} onBack={onBack} showBack showMenu={false} />
        <View style={styles.centerWrap}>
          <MaterialIcons name="error-outline" size={56} color="#94A3B8" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); loadDetail().finally(() => setLoading(false)); }}>
            <Text style={styles.retryButtonText}>{t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!detail) return null;

  const isFeatured = detail.package_for === 'make_featured';
  const sortPayPalStripe = (gateways: PackageDetailPaymentGateway[]) =>
    [...gateways].sort((a, b) => {
      const ka = (a.key || '').toLowerCase();
      const kb = (b.key || '').toLowerCase();
      if (ka === 'paypal' && kb !== 'paypal') return -1;
      if (kb === 'paypal' && ka !== 'paypal') return 1;
      if (ka === 'stripe') return -1;
      if (kb === 'stripe') return 1;
      return 0;
    });

  const renderPaymentCard = (gw: PackageDetailPaymentGateway) => {
    const key = (gw.key || '').toLowerCase();
    const isPayPal = key === 'paypal';
    const isStripe = key === 'stripe';
    const paypalLoading = isPayPal && initiatingPayment;
    const anyLoading = initiatingPayment;

    if (isPayPal) {
      return (
        <TouchableOpacity
          key="paypal"
          style={[styles.payMethodCard, styles.payPalCardShadow, anyLoading && styles.gatewayButtonDisabled]}
          onPress={() => handlePaymentGateway(gw)}
          activeOpacity={0.88}
          disabled={anyLoading}
        >
          <LinearGradient colors={['#0070BA', '#003087']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.payMethodIconWrap}>
            {paypalLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FontAwesome5 name="paypal" size={32} color="#fff" />
            )}
          </LinearGradient>
          <View style={styles.payMethodBody}>
            <Text style={styles.payMethodTitle}>PayPal</Text>
            <Text style={styles.payMethodSubtitle}>{t('checkout_with_paypal') || 'Pay with your PayPal account or card'}</Text>
            <View style={styles.payMethodBadgeRow}>
              <View style={styles.securePill}>
                <MaterialIcons name="lock" size={12} color="#0070BA" />
                <Text style={styles.securePillText}>{t('secure') || 'Secure'}</Text>
              </View>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={18} color="#0070BA" style={styles.payMethodChevron} />
        </TouchableOpacity>
      );
    }

    if (isStripe) {
      return (
        <TouchableOpacity
          key="stripe"
          style={[styles.payMethodCard, styles.stripeCardShadow, anyLoading && styles.gatewayButtonDisabled]}
          onPress={() => handlePaymentGateway(gw)}
          activeOpacity={0.88}
          disabled={anyLoading}
        >
          <LinearGradient colors={['#635BFF', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.payMethodIconWrap}>
            <View style={styles.stripeIconStack}>
              <FontAwesome5 name="stripe" size={26} color="#fff" />
              <MaterialIcons name="credit-card" size={18} color="rgba(255,255,255,0.85)" />
            </View>
          </LinearGradient>
          <View style={styles.payMethodBody}>
            <Text style={styles.payMethodTitle}>Stripe</Text>
            <Text style={styles.payMethodSubtitle}>{t('pay_with_card_stripe') || 'Visa, Mastercard, Apple Pay & more'}</Text>
            <View style={styles.payMethodBadgeRow}>
              <View style={[styles.securePill, styles.stripePill]}>
                <MaterialIcons name="verified-user" size={12} color="#635BFF" />
                <Text style={[styles.securePillText, styles.stripePillText]}>{t('encrypted') || 'Encrypted'}</Text>
              </View>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={18} color="#635BFF" style={styles.payMethodChevron} />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#EEF2FF', '#F0FDF4', '#F8FAFC']} locations={[0, 0.45, 1]} style={styles.bgGradient} />
      <Header title={t('package_purchase')} onMenuPress={() => {}} onBack={onBack} showBack showMenu={false} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#3730A3', '#4F46E5', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <MaterialIcons name="work" size={14} color="#E0E7FF" />
            <Text style={styles.heroBadgeText}>{t('package_purchase') || 'Package purchase'}</Text>
          </View>
          <Text style={styles.heroTitle}>{detail.package_title}</Text>
          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPrice}>{formatPrice(detail.package_price, detail.currency)}</Text>
            <Text style={styles.heroDuration}> / {detail.package_num_days} {t('days')}</Text>
          </View>
          {detail.package_num_listings != null && detail.package_num_listings > 0 && (
            <View style={styles.heroChip}>
              <MaterialIcons name="check-circle" size={16} color="#A7F3D0" />
              <Text style={styles.heroChipText}>{detail.package_num_listings} {t('job_applications')}</Text>
            </View>
          )}
          {isFeatured && (
            <Text style={styles.heroChipText}>{t('featured_profile_benefit')}</Text>
          )}
        </LinearGradient>

        {detail.is_free ? (
          <TouchableOpacity
            style={[styles.primaryButton, activating && styles.buttonDisabled]}
            onPress={handleActivateFree}
            disabled={activating}
          >
            {activating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={22} color="#fff" />
                <Text style={styles.primaryButtonText}>{t('activate_free')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.paymentSection}>
            <View style={styles.paymentSectionHeader}>
              <Text style={styles.paymentSectionKicker}>{t('step_2_checkout') || 'Checkout'}</Text>
              <Text style={styles.paymentSectionTitle}>{t('choose_payment_method')}</Text>
              <Text style={styles.paymentSectionHint}>{t('choose_payment_method_hint') || 'Pick a payment method to complete your purchase.'}</Text>
            </View>
            {(() => {
              const allowedGateways = sortPayPalStripe(
                detail.payment_gateways.filter(
                  (gw) => gw.enabled !== false && ['paypal', 'stripe'].includes((gw.key || '').toLowerCase())
                )
              );
              return allowedGateways.length === 0 ? (
                <View style={styles.emptyGateways}>
                  <MaterialIcons name="payment" size={40} color="#CBD5E1" />
                  <Text style={styles.emptyGatewaysText}>{t('no_payment_methods')}</Text>
                  <Text style={styles.emptyGatewaysSub}>{t('contact_support')}</Text>
                </View>
              ) : (
                <View style={styles.payMethodsStack}>{allowedGateways.map((gw) => renderPaymentCard(gw))}</View>
              );
            })()}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  bgGradient: { ...StyleSheet.absoluteFillObject },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 8 },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    shadowColor: '#3730A3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 14,
  },
  heroBadgeText: { color: '#E0E7FF', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12, lineHeight: 28 },
  heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  heroPrice: { fontSize: 34, fontWeight: '800', color: '#fff' },
  heroDuration: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroChipText: { color: '#ECFDF5', fontSize: 14, fontWeight: '600' },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successWrap: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 32 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginTop: 16 },
  successMessage: { fontSize: 16, color: '#64748B', marginTop: 12, textAlign: 'center' },
  successCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  successPackageTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  successMeta: { fontSize: 14, color: '#64748B' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  errorText: { marginTop: 12, fontSize: 16, color: '#64748B', textAlign: 'center' },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6366F1',
    borderRadius: 12,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  paymentSection: { marginBottom: 8 },
  paymentSectionHeader: { marginBottom: 18 },
  paymentSectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  paymentSectionTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  paymentSectionHint: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  payMethodsStack: {},
  payMethodCard: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payPalCardShadow: {
    shadowColor: '#0070BA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderColor: '#BFDBFE',
  },
  stripeCardShadow: {
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderColor: '#E9D5FF',
  },
  payMethodIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stripeIconStack: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  payMethodBody: { flex: 1, minWidth: 0 },
  payMethodTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  payMethodSubtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
  payMethodBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stripePill: { backgroundColor: '#F5F3FF' },
  securePillText: { fontSize: 11, fontWeight: '700', color: '#0070BA' },
  stripePillText: { color: '#635BFF' },
  payMethodChevron: { marginLeft: 4 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  buttonDisabled: { opacity: 0.7 },
  gatewayButtonDisabled: { opacity: 0.7 },
  emptyGateways: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyGatewaysText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  emptyGatewaysSub: { marginTop: 6, fontSize: 14, color: '#94A3B8' },
  bottomSpacer: { height: 40 },
  paymentScreenRoot: { flex: 1, backgroundColor: '#fff' },
  paymentSafeArea: { flex: 1, backgroundColor: '#fff' },
  webViewHeader: {
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
  webViewCloseBtn: {
    padding: 8,
    marginLeft: -8,
  },
  webViewHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  webViewHeaderRight: { width: 40 },
  webView: { flex: 1 },
  webViewHidden: { opacity: 0 },
  webViewLoadingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
});

export default PackagePurchase;
