/**
 * Returns HTML for an in-app Stripe card form (Stripe.js v3).
 * Creates a token via stripe.createToken(card) and posts it to RN via ReactNativeWebView.postMessage.
 * Backend expects this token in stripe-order-package (Charge API).
 */
function escapeForJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

export function getStripeCardFormHtml(publishableKey: string, amountDisplay: string, currencyDisplay: string): string {
  const key = escapeForJsString(publishableKey);
  const amount = escapeForJsString(amountDisplay);
  const currency = escapeForJsString(currencyDisplay);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; margin: 0; }
    h2 { font-size: 18px; color: #1E293B; margin: 0 0 16px 0; }
    #card-element { padding: 12px; border: 1px solid #E2E8F0; border-radius: 12px; margin: 12px 0; background: #fff; min-height: 48px; }
    #card-element:focus { border-color: #6366F1; outline: none; }
    .error { color: #dc2626; font-size: 14px; margin-top: 8px; }
    #pay-btn { background: #6366F1; color: white; border: none; padding: 14px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; width: 100%; margin-top: 16px; }
    #pay-btn:disabled { opacity: 0.6; }
    .amount { color: #64748B; font-size: 14px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h2>Pay with card</h2>
  <p class="amount" id="amount-line"></p>
  <div id="card-element"></div>
  <p class="error" id="err" style="display:none"></p>
  <button type="button" id="pay-btn">Pay</button>
  <script>
    (function() {
      var key = '${key}';
      var amount = '${amount}';
      var currency = '${currency}';
      document.getElementById('amount-line').textContent = 'Amount: ' + currency + ' ' + amount;
      var stripe = Stripe(key);
      var elements = stripe.elements();
      var card = elements.create('card', { style: { base: { fontSize: '16px', color: '#1E293B' } } });
      card.mount('#card-element');
      var btn = document.getElementById('pay-btn');
      var errEl = document.getElementById('err');
      btn.addEventListener('click', function() {
        btn.disabled = true;
        errEl.style.display = 'none';
        errEl.textContent = '';
        stripe.createToken(card).then(function(res) {
          if (res.error) {
            errEl.textContent = res.error.message || 'Payment failed';
            errEl.style.display = 'block';
            btn.disabled = false;
            return;
          }
          if (window.ReactNativeWebView && res.token && res.token.id) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ token: res.token.id }));
          } else {
            errEl.textContent = 'Could not get token';
            errEl.style.display = 'block';
            btn.disabled = false;
          }
        });
      });
    })();
  </script>
</body>
</html>`;
}
