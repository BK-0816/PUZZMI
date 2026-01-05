// PortOne (구 아임포트) 설정 파일

export const PORTONE_CONFIG = {
  // PortOne 가맹점 식별코드 (실제 사용시 본인의 코드로 변경 필요)
  // 테스트용: imp00000000 (테스트 가맹점 코드)
  IMP_CODE: 'imp00000000', // TODO: 실제 가맹점 코드로 변경

  // KG이니시스 일본 결제 PG 설정
  PG_PROVIDER: 'inicis_v2', // KG이니시스

  // 결제 수단
  PAY_METHODS: {
    CARD: 'card',           // 신용카드
    TRANS: 'trans',         // 실시간 계좌이체
    VBANK: 'vbank',         // 가상계좌
    PHONE: 'phone',         // 휴대폰 소액결제
    CVS: 'cvs',             // 편의점 결제 (일본)
    PAYPAY: 'paypay',       // PayPay (일본)
    LINEPAY: 'linepay'      // LINE Pay (일본)
  },

  // 통화 코드
  CURRENCY: {
    KRW: 'KRW',  // 한국 원
    JPY: 'JPY',  // 일본 엔
    USD: 'USD'   // 미국 달러
  }
};

/**
 * 포트원 결제 요청 파라미터 생성
 * @param {Object} options - 결제 옵션
 * @returns {Object} 포트원 결제 파라미터
 */
export function createPaymentParams(options) {
  const {
    merchantUid,      // 주문번호 (고유값)
    amount,           // 결제금액
    name,             // 상품명
    buyerName,        // 구매자명
    buyerTel,         // 구매자 전화번호
    buyerEmail,       // 구매자 이메일
    payMethod = 'card', // 결제수단 (기본: 카드)
    currency = 'JPY',   // 통화 (기본: 엔화)
    customData = {}     // 추가 데이터
  } = options;

  return {
    pg: PORTONE_CONFIG.PG_PROVIDER, // KG이니시스
    pay_method: payMethod,
    merchant_uid: merchantUid,
    name: name,
    amount: amount,
    currency: currency,
    buyer_name: buyerName,
    buyer_tel: buyerTel,
    buyer_email: buyerEmail,
    custom_data: customData,
    // 모바일 대응
    m_redirect_url: `${window.location.origin}/payment_complete.html`,
    // 팝업 닫기 URL
    popup: true
  };
}

/**
 * 주문번호 생성
 * @param {string} prefix - 접두사
 * @returns {string} 고유한 주문번호
 */
export function generateMerchantUid(prefix = 'PUZZMI') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 포트원 SDK 로드 확인
 * @returns {Promise<boolean>} SDK 로드 여부
 */
export function ensurePortOneSDK() {
  return new Promise((resolve) => {
    // 이미 로드되어 있는 경우
    if (window.IMP) {
      resolve(true);
      return;
    }

    // SDK 스크립트 추가
    const script = document.createElement('script');
    script.src = 'https://cdn.iamport.kr/v1/iamport.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * 포트원 초기화
 * @returns {Promise<Object>} 초기화된 IMP 객체
 */
export async function initPortOne() {
  const loaded = await ensurePortOneSDK();

  if (!loaded || !window.IMP) {
    throw new Error('포트원 SDK 로드 실패');
  }

  // 포트원 초기화
  window.IMP.init(PORTONE_CONFIG.IMP_CODE);

  return window.IMP;
}

/**
 * 결제 요청
 * @param {Object} paymentParams - 결제 파라미터
 * @returns {Promise<Object>} 결제 결과
 */
export async function requestPayment(paymentParams) {
  const IMP = await initPortOne();

  return new Promise((resolve, reject) => {
    IMP.request_pay(paymentParams, (response) => {
      if (response.success) {
        // 결제 성공
        resolve({
          success: true,
          imp_uid: response.imp_uid,           // 포트원 거래 고유번호
          merchant_uid: response.merchant_uid, // 주문번호
          paid_amount: response.paid_amount,   // 결제금액
          apply_num: response.apply_num,       // 카드 승인번호
          pg_tid: response.pg_tid,             // PG사 거래번호
          receipt_url: response.receipt_url    // 영수증 URL
        });
      } else {
        // 결제 실패
        reject({
          success: false,
          error_code: response.error_code,
          error_msg: response.error_msg
        });
      }
    });
  });
}
