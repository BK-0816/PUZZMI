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
  },

  // 언어 설정
  LOCALE: {
    KO_KR: 'KO_KR',  // 한국어
    EN_US: 'EN_US',  // 영어
    JA_JP: 'JA_JP',  // 일본어
    ZH_CN: 'ZH_CN'   // 중국어 간체
  },

  // 상품 유형 (휴대폰 소액결제 필수)
  PRODUCT_TYPE: {
    REAL: 'PRODUCT_TYPE_REAL',       // 실물 상품
    DIGITAL: 'PRODUCT_TYPE_DIGITAL'  // 디지털 상품
  },

  // 성별
  GENDER: {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER'
  },

  // 국가 코드 (ISO 3166-1 alpha-2)
  COUNTRY: {
    KR: 'KR',  // 대한민국
    JP: 'JP',  // 일본
    US: 'US',  // 미국
    CN: 'CN'   // 중국
  }
};

/**
 * 포트원 V2 결제 요청 파라미터 생성
 * @param {Object} options - 결제 옵션
 * @returns {Object} 포트원 V2 결제 파라미터
 */
export function createPaymentParams(options) {
  const {
    paymentId,
    orderName,
    totalAmount,
    currency = 'JPY',
    payMethod = 'CARD',
    customer = {},
    customData = {},
    taxFreeAmount,
    vatAmount,
    products = [],
    noticeUrls = [],
    locale = 'JA_JP',
    country = 'JP',
    productType,
    offerPeriod,
    address,
    isEscrow = false,
    isCulturalExpense = false
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
      customerId: customer.customerId,
      fullName: customer.fullName || customer.name || 'Guest Customer',
      phoneNumber: customer.phoneNumber || customer.tel || '000-0000-0000',
      email: customer.email || 'guest@puzzmi.com'
    },
    customData: customData,
    storeDetails: {
      storeName: 'PUZZMI',
      storeNameEn: 'PUZZMI',
      storeNameKana: 'パズミ',
      storeNameShort: 'PUZZMI',
      contactName: 'PUZZMI',
      phoneNumber: '02-1234-5678',
      email: 'support@puzzmi.com',
      openingHours: {
        open: '10:00',
        close: '22:00'
      },
      isEscrow: isEscrow,
      isCulturalExpense: isCulturalExpense
    },
    redirectUrl: `${window.location.origin}/payment_complete.html`,
    locale: locale,
    country: country,
    appScheme: window.location.origin
  };

  // 구매자 성별 정보 추가
  if (customer.gender) {
    params.customer.gender = customer.gender;
  }

  // 구매자 생년월일 추가
  if (customer.birthYear) {
    params.customer.birthYear = customer.birthYear;
  }
  if (customer.birthMonth) {
    params.customer.birthMonth = customer.birthMonth;
  }
  if (customer.birthDay) {
    params.customer.birthDay = customer.birthDay;
  }

  // 구매자 주소 추가
  if (address || customer.address) {
    const addr = address || customer.address;
    params.customer.address = {
      country: addr.country,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2,
      city: addr.city,
      province: addr.province,
      zipcode: addr.zipcode
    };
  }

  // 면세 금액
  if (taxFreeAmount !== undefined && taxFreeAmount !== null) {
    params.taxFreeAmount = taxFreeAmount;
  }

  // 부가세
  if (vatAmount !== undefined && vatAmount !== null) {
    params.vatAmount = vatAmount;
  }

  // 상품 정보
  if (products && products.length > 0) {
    params.products = products.map(product => ({
      id: product.id,
      name: product.name,
      code: product.code,
      amount: product.amount,
      quantity: product.quantity,
      tag: product.tag,
      link: product.link
    }));
  }

  // 웹훅 URL
  if (noticeUrls && noticeUrls.length > 0) {
    params.noticeUrls = noticeUrls;
  }

  // 상품 유형 (휴대폰 소액결제 필수)
  if (productType) {
    params.productType = productType;
  }

  // 서비스 제공 기간
  if (offerPeriod) {
    params.offerPeriod = offerPeriod;
  }

  return params;
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

/**
 * 포트원 에러 코드 처리
 * @param {string} code - 에러 코드
 * @returns {string} 사용자 친화적인 에러 메시지
 */
export function getErrorMessage(code) {
  const errorMessages = {
    'FAILURE_TYPE_PG': '결제대행사에서 오류가 발생했습니다.',
    'SDK_NOT_LOADED': '결제 모듈을 불러올 수 없습니다.',
    'PAYMENT_FAILED': '결제에 실패했습니다.',
    'USER_CANCELLED': '사용자가 결제를 취소했습니다.',
    'INVALID_REQUEST': '잘못된 결제 요청입니다.',
    'INSUFFICIENT_FUNDS': '잔액이 부족합니다.',
    'CARD_DECLINED': '카드가 거절되었습니다.',
    'EXPIRED_CARD': '카드 유효기간이 만료되었습니다.',
    'INVALID_CARD': '유효하지 않은 카드입니다.'
  };

  return errorMessages[code] || '결제 중 오류가 발생했습니다.';
}

/**
 * 통화별 스케일 팩터 적용
 * @param {number} amount - 원본 금액
 * @param {string} currency - 통화 코드
 * @returns {number} 스케일 팩터 적용된 금액
 */
export function applyScaleFactor(amount, currency) {
  const scaleFactors = {
    'KRW': 1,    // 한국 원 - 1배
    'JPY': 1,    // 일본 엔 - 1배
    'USD': 100,  // 미국 달러 - 100배 (센트 단위)
    'EUR': 100,  // 유로 - 100배
    'CNY': 100   // 중국 위안 - 100배
  };

  const factor = scaleFactors[currency] || 1;
  return Math.round(amount * factor);
}

/**
 * 상품 정보 검증
 * @param {Array} products - 상품 배열
 * @returns {boolean} 검증 결과
 */
export function validateProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return false;
  }

  return products.every(product => {
    return product.id &&
           product.name &&
           typeof product.amount === 'number' &&
           typeof product.quantity === 'number' &&
           product.amount >= 0 &&
           product.quantity > 0;
  });
}

/**
 * KG이니시스 주문명 검증 (최대 40바이트)
 * @param {string} orderName - 주문명
 * @returns {string} 검증된 주문명
 */
export function validateOrderName(orderName) {
  if (!orderName) {
    return 'PUZZMI Order';
  }

  // 바이트 길이 계산
  const byteLength = new Blob([orderName]).size;

  if (byteLength <= 40) {
    return orderName;
  }

  // 40바이트 초과시 37바이트로 자르고 "..." 추가
  let truncated = orderName;
  while (new Blob([truncated]).size > 37) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + '...';
}

/**
 * 결제 파라미터 검증
 * @param {Object} params - 결제 파라미터
 * @returns {Object} 검증 결과 { valid: boolean, errors: string[] }
 */
export function validatePaymentParams(params) {
  const errors = [];

  if (!params.storeId) {
    errors.push('storeId는 필수입니다.');
  }

  if (!params.channelKey) {
    errors.push('channelKey는 필수입니다.');
  }

  if (!params.paymentId) {
    errors.push('paymentId는 필수입니다.');
  } else if (!/^[\x00-\x7F]*$/.test(params.paymentId)) {
    errors.push('KG이니시스의 경우 paymentId는 ASCII 문자만 허용됩니다.');
  } else if (params.paymentId.length > 40) {
    errors.push('KG이니시스의 경우 paymentId는 40자 이하로 입력해야 합니다.');
  }

  if (!params.orderName) {
    errors.push('orderName은 필수입니다.');
  }

  if (typeof params.totalAmount !== 'number' || params.totalAmount <= 0) {
    errors.push('totalAmount는 0보다 큰 숫자여야 합니다.');
  }

  if (!params.currency) {
    errors.push('currency는 필수입니다.');
  }

  if (!params.payMethod) {
    errors.push('payMethod는 필수입니다.');
  }

  if (!params.customer || !params.customer.fullName || !params.customer.phoneNumber || !params.customer.email) {
    errors.push('PC 환경에서는 구매자 이름, 연락처, 이메일이 필수입니다.');
  }

  if (params.customer && params.customer.email && !/^[a-zA-Z0-9@.]+$/.test(params.customer.email)) {
    errors.push('KG이니시스의 경우 이메일은 @와 .만 특수문자로 허용됩니다.');
  }

  if (!params.storeDetails || !params.storeDetails.storeNameShort) {
    errors.push('이니시스 일본 결제(JPPG)인 경우 storeDetails.storeNameShort는 필수입니다.');
  }

  if (!params.storeDetails || !params.storeDetails.openingHours) {
    errors.push('이니시스 일본 결제(JPPG)인 경우 storeDetails.openingHours는 필수입니다.');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}
