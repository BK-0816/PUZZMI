// PortOne V2 설정 파일

export const PORTONE_CONFIG = {
  // PortOne V2 Store ID
  STORE_ID: 'store-79c6a0c1-e7e2-486c-aa42-914242b9ff69',

  // V2 API Secret (환경변수로 관리 권장)
  // API_SECRET은 서버사이드에서만 사용

  // KG이니시스 일본 결제 채널 키
  CHANNEL_KEY: 'channel-key-104b9122-a3c5-4206-bb92-1235cc021587',

  // 결제 수단
  PAY_METHODS: {
    CARD: 'CARD',           // 신용카드
    VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT', // 가상계좌
    TRANSFER: 'TRANSFER',   // 실시간 계좌이체
    MOBILE: 'MOBILE',       // 휴대폰 소액결제
    CONVENIENCE_STORE: 'CONVENIENCE_STORE', // 편의점 (일본)
    PAYPAY: 'PAYPAY',       // PayPay (일본)
    LINEPAY: 'LINEPAY'      // LINE Pay (일본)
  },

  // 통화 코드
  CURRENCY: {
    KRW: 'KRW',  // 한국 원
    JPY: 'JPY',  // 일본 엔
    USD: 'USD'   // 미국 달러
  }
};

/**
 * 포트원 V2 결제 요청 파라미터 생성
 * @param {Object} options - 결제 옵션
 * @returns {Object} 포트원 V2 결제 파라미터
 */
export function createPaymentParams(options) {
  const {
    paymentId,        // 결제 ID (고유값)
    orderName,        // 주문명
    totalAmount,      // 총 결제금액
    currency = 'JPY', // 통화 (기본: 엔화)
    payMethod = 'CARD', // 결제수단 (기본: 카드)
    customer = {},    // 구매자 정보
    customData = {}   // 추가 데이터
  } = options;

  return {
    storeId: PORTONE_CONFIG.STORE_ID,
    channelKey: PORTONE_CONFIG.CHANNEL_KEY,
    paymentId: paymentId,
    orderName: orderName,
    totalAmount: totalAmount,
    currency: currency,
    payMethod: payMethod,
    customer: {
      fullName: customer.name || 'Guest',
      phoneNumber: customer.tel || '',
      email: customer.email || ''
    },
    storeDetails: {
      storeName: 'PUZZMI',
      storeNameShort: 'PUZZMI',
      storeNameKana: 'パズミ',
      storeNameEn: 'PUZZMI',
      phoneNumber: '01094376167',
      email: 'choi.seojun0721@gmail.com'
    },
    customData: customData,
    redirectUrl: `${window.location.origin}/payment_complete.html`
  };
}

/**
 * 결제 ID 생성 (V2에서는 payment_id로 변경)
 * @param {string} prefix - 접두사
 * @returns {string} 고유한 결제 ID
 */
export function generatePaymentId(prefix = 'PUZZMI') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 주문번호 생성 (하위호환)
 * @param {string} prefix - 접두사
 * @returns {string} 고유한 주문번호
 */
export function generateMerchantUid(prefix = 'PUZZMI') {
  return generatePaymentId(prefix);
}

/**
 * 포트원 V2 SDK 로드 확인
 * @returns {Promise<boolean>} SDK 로드 여부
 */
export function ensurePortOneSDK() {
  return new Promise((resolve) => {
    // 이미 로드되어 있는 경우
    if (window.PortOne) {
      resolve(true);
      return;
    }

    // V2 SDK 스크립트 추가
    const script = document.createElement('script');
    script.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * 포트원 V2 초기화 (V2는 별도 초기화 불필요, SDK만 로드)
 * @returns {Promise<Object>} PortOne 객체
 */
export async function initPortOne() {
  const loaded = await ensurePortOneSDK();

  if (!loaded || !window.PortOne) {
    throw new Error('포트원 V2 SDK 로드 실패');
  }

  return window.PortOne;
}

/**
 * 포트원 V2 결제 요청
 * @param {Object} paymentParams - 결제 파라미터
 * @returns {Promise<Object>} 결제 결과
 */
export async function requestPayment(paymentParams) {
  await ensurePortOneSDK();

  if (!window.PortOne) {
    throw {
      success: false,
      error_code: 'SDK_NOT_LOADED',
      error_msg: '포트원 SDK를 불러올 수 없습니다.'
    };
  }

  try {
    console.log('포트원 결제 요청:', paymentParams);
    const response = await window.PortOne.requestPayment(paymentParams);
    console.log('포트원 결제 응답:', response);

    if (response.code !== undefined) {
      console.error('포트원 에러 응답:', response);
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
    console.error('포트원 결제 실패:', error);

    if (error.success === false) {
      throw error;
    }

    throw {
      success: false,
      error_code: error.code || error.error_code || 'PAYMENT_FAILED',
      error_msg: error.message || error.error_msg || '결제에 실패했습니다.'
    };
  }
}
