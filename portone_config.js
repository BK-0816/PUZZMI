export const PORTONE_CONFIG = {
  STORE_ID: 'store-79c6a0c1-e7e2-486c-aa42-914242b9ff69',
  CHANNEL_KEY: 'channel-key-104b9122-a3c5-4206-bb92-1235cc021587',

  PAY_METHODS: {
    CARD: 'CARD',
    CONVENIENCE_STORE: 'CONVENIENCE_STORE',
    EASY_PAY: 'EASY_PAY'
  },

  CURRENCY: {
    JPY: 'CURRENCY_JPY'
  }
};

export function createPaymentParams(options) {
  const {
    paymentId,
    totalAmount,
    durationHours = 2, // 기본값 설정
    currency = 'CURRENCY_JPY',
    payMethod = 'CARD',
    customer = {},
    customData = {}
  } = options;

  // 🚨 [보안/오류방지] JPPG 해쉬 에러 방지를 위해 상품명은 무조건 영문/숫자로 고정
  const safeOrderName = 'PUZZMI Booking ' + durationHours + 'h';

  return {
    storeId: PORTONE_CONFIG.STORE_ID,
    channelKey: PORTONE_CONFIG.CHANNEL_KEY,
    paymentId: paymentId,
    orderName: safeOrderName, 
    totalAmount: totalAmount,
    currency: currency,
    payMethod: payMethod,
    customer: {
      fullName: customer.fullName || customer.name || 'Guest',
      firstNameKana: customer.firstNameKana || 'ゲスト',
      lastNameKana: customer.lastNameKana || 'ゲスト',
      phoneNumber: customer.phoneNumber || customer.tel || '08000000000',
      email: customer.email || 'guest@puzzmi.com'
    },
    customData: typeof customData === 'string' ? customData : JSON.stringify(customData),
    
    // 🚨 JPPG(이니시스 일본결제) 필수 8개 파라미터 완벽 적용
    storeDetails: {
      storeName: 'パズミ',
      storeNameShort: 'パズミ',
      storeNameEn: 'PUZZMI',
      storeNameKana: 'パズミ',
      contactName: 'PUZZMI Support',
      email: 'puzzmi0721@gmail.com',
      phoneNumber: '0312345678',
      openingHours: {
        open: '09:00',
        close: '18:00'
      }
    },
    redirectUrl: window.location.href.split('?')[0].replace('payment_page.html', 'payment_complete.html'),
    noticeUrls: ['https://eevvgbbokenpjnvtmztk.supabase.co/functions/v1/portone-webhook']
  };
}

export function generatePaymentId(prefix = 'PUZZMI') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return prefix + '_' + timestamp + '_' + random;
}

export function ensurePortOneSDK() {
  return new Promise((resolve) => {
    if (window.PortOne) {
      resolve(true); return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export async function requestPayment(paymentParams) {
  const loaded = await ensurePortOneSDK();
  if (!loaded || !window.PortOne) throw new Error('포트원 SDK 로드 실패');

  try {
    const response = await window.PortOne.requestPayment(paymentParams);
    if (response.code != null) {
      throw { success: false, error_msg: response.message };
    }
    return { success: true, payment_id: response.paymentId };
  } catch (error) {
    throw { success: false, error_msg: error.message || '결제에 실패했습니다.' };
  }
}