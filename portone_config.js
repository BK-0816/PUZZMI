export const PORTONE_CONFIG = {
  STORE_ID: 'store-79c6a0c1-e7e2-486c-aa42-914242b9ff69',
  CHANNEL_KEY: 'channel-key-104b9122-a3c5-4206-bb92-1235cc021587',

  PAY_METHODS: {
    CARD: 'CARD',
    VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
    TRANSFER: 'TRANSFER',
    MOBILE: 'MOBILE',
    CONVENIENCE_STORE: 'CONVENIENCE_STORE',
    PAYPAY: 'PAYPAY',
    LINEPAY: 'LINEPAY'
  },

  CURRENCY: {
    KRW: 'KRW',
    JPY: 'JPY',
    USD: 'USD'
  }
};

export function createPaymentParams(options) {
  const {
    paymentId,
    orderName,
    totalAmount,
    currency = 'JPY',
    payMethod = 'CARD',
    customer = {},
    customData = {},
    products = [],
    noticeUrls = [],
    locale = 'ko'
  } = options;

  const params = {
    storeId: PORTONE_CONFIG.STORE_ID,
    channelKey: PORTONE_CONFIG.CHANNEL_KEY,
    paymentId: paymentId,
    orderName: orderName,
    totalAmount: totalAmount,
    currency: currency,
    payMethod: payMethod,
    customer: {
      fullName: customer.fullName || customer.name || '',
      phoneNumber: customer.phoneNumber || customer.tel || '',
      email: customer.email || ''
    },
    customData: typeof customData === 'string' ? customData : JSON.stringify(customData),
    storeDetails: {
      storeName: 'PUZZMI',
      storeNameShort: 'PUZZMI',
      storeNameEn: 'PUZZMI',
      storeNameKana: '\u30D1\u30BA\u30DF',
      contactName: 'LINE: @puzzmi',
      email: 'choi.seojun0721@gmail.com',
      phoneNumber: '01094376167',
      openingHours: {
        open: '09:00',
        close: '18:00'
      }
    },
    redirectUrl: window.location.origin + '/payment_complete.html'
  };

  if (products && products.length > 0) {
    params.products = products;
  }

  if (noticeUrls && noticeUrls.length > 0) {
    params.noticeUrls = noticeUrls;
  }

  if (locale) {
    params.locale = locale;
  }

  return params;
}

export function generatePaymentId(prefix = 'PUZZMI') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return prefix + '_' + timestamp + '_' + random;
}

export function generateMerchantUid(prefix = 'PUZZMI') {
  return generatePaymentId(prefix);
}

export function ensurePortOneSDK() {
  return new Promise((resolve) => {
    if (window.PortOne) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export async function initPortOne() {
  const loaded = await ensurePortOneSDK();

  if (!loaded || !window.PortOne) {
    throw new Error('포트원 V2 SDK 로드 실패');
  }

  return window.PortOne;
}

export async function requestPayment(paymentParams) {
  const PortOne = await initPortOne();

  try {
    const response = await PortOne.requestPayment(paymentParams);

    if (response.code != null) {
      throw {
        success: false,
        error_code: response.code,
        error_msg: response.message
      };
    }

    return {
      success: true,
      payment_id: response.paymentId,
      transaction_id: response.transactionId,
      paid_amount: response.amount,
      currency: response.currency,
      method: response.method,
      receipt_url: response.receiptUrl,
      requested_at: response.requestedAt,
      paid_at: response.paidAt
    };
  } catch (error) {
    throw {
      success: false,
      error_code: error.code || error.error_code || 'PAYMENT_FAILED',
      error_msg: error.message || error.error_msg || '결제에 실패했습니다.'
    };
  }
}
