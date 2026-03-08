# 포트원 KG이니시스 일본결제 V2 워크플로우 분석 리포트

## 현재 구현 상태

### 1. 프론트엔드 결제 플로우 (payment_page.js)

#### 장점:
- ✅ PortOne V2 SDK 올바르게 로드 (`https://cdn.portone.io/v2/browser-sdk.js`)
- ✅ `createPaymentParams()` 헬퍼 함수로 파라미터 구조화
- ✅ `requestPayment()` 함수로 결제 요청 실행
- ✅ 결제 토큰 기반 보안 링크 시스템
- ✅ 일본 시장 타겟팅 (JPY 통화, 일본어 상품명)

#### 개선 필요 사항:
1. **중복 검증 호출**: 결제 완료 후 프론트에서 `payment-complete` Edge Function을 호출하는데, 이는 불필요한 중복입니다.
   - PortOne V2는 webhook을 통해 자동으로 결제 상태 변경을 알려주므로, 프론트엔드에서 별도의 검증 API를 호출할 필요가 없습니다.

2. **redirectUrl 설정**:
   ```javascript
   redirectUrl: window.location.origin + '/payment_complete.html'
   ```
   - 이 방식은 정상이나, 결제 완료 후 페이지에서 추가적인 검증을 하지 말고 webhook 결과를 기다려야 합니다.

3. **customData 활용**:
   ```javascript
   customData: {
     booking_id: bookingData.id,
     user_id: bookingData.customer_id,
     mate_id: bookingData.mate_id
   }
   ```
   - 올바른 구조이나, webhook에서 이 데이터를 활용하는 로직이 누락되어 있습니다.

### 2. 포트원 설정 (portone_config.js)

#### 장점:
- ✅ V2 SDK 구조 준수
- ✅ 일본 결제 수단 포함 (PAYPAY, LINEPAY)
- ✅ 올바른 파라미터 구조

#### 개선 필요 사항:
1. **Channel Key 확인**:
   - `channel-key-104b9122-a3c5-4206-bb92-1235cc021587`이 실제 KG이니시스 일본 결제용 채널인지 확인 필요
   - 포트원 대시보드에서 채널 설정 확인 필요

2. **noticeUrls 파라미터**:
   - 현재 코드에서 `noticeUrls` 파라미터를 전달할 수 있도록 구현되어 있으나 실제로 사용하지 않음
   - Webhook URL을 여기에 추가하면 더 안정적인 알림을 받을 수 있습니다.

### 3. Webhook 처리 (portone-webhook/index.ts)

#### 장점:
- ✅ Webhook 서명 검증 구현 (HMAC SHA-256)
- ✅ Transaction.StatusChanged 이벤트 처리
- ✅ 상태 매핑 함수 구현
- ✅ PortOne API를 통한 결제 정보 재확인
- ✅ booking 테이블 자동 업데이트

#### 개선 필요 사항:
1. **customData 활용 누락**:
   - Webhook에서 `paymentData.customData`를 파싱하지만 실제로 활용하지 않음
   - booking_id, user_id 등을 customData에서 가져와서 업데이트에 활용할 수 있음

2. **에러 핸들링**:
   - API 호출 실패 시에도 webhook을 200으로 응답하는데, 재시도 로직이 필요할 수 있음

3. **V2 상태 매핑 불완전**:
   ```typescript
   function mapV2Status(v2Status: string): string {
     const statusMap: { [key: string]: string } = {
       "READY": "ready",
       "PAID": "paid",
       "FAILED": "failed",
       "CANCELLED": "cancelled",
       "PARTIAL_CANCELLED": "refunded",
     };
     return statusMap[v2Status] || "ready";
   }
   ```
   - "VIRTUAL_ACCOUNT_ISSUED" 등 다른 V2 상태들이 누락됨

### 4. 결제 완료 처리 (payment-complete/index.ts)

#### 문제점:
1. **불필요한 Edge Function**:
   - 이 함수는 프론트엔드에서 호출되는데, 이는 안티패턴입니다.
   - PortOne V2 워크플로우에서는 webhook이 자동으로 결제 상태를 업데이트하므로, 프론트엔드에서 별도의 검증 API를 호출할 필요가 없습니다.

2. **보안 위험**:
   - 프론트엔드에서 paymentId를 전달받아 검증하는 구조는 조작 가능성이 있습니다.
   - Webhook만 신뢰해야 합니다.

### 5. 데이터베이스 구조 (portone_payments 테이블)

#### 장점:
- ✅ 필요한 모든 필드 포함
- ✅ RLS 정책 구현
- ✅ 인덱스 최적화

#### 개선 필요 사항:
1. **user_id NULL 허용**:
   - 현재 payment_page.js:121에서 `user_id: null`로 설정
   - booking 테이블의 customer_id를 user_id로 매핑해야 함

2. **RLS 정책 문제**:
   - anon 사용자가 insert할 수 있도록 정책이 추가되었으나, user_id가 null이면 "Users can insert own payments" 정책과 충돌
   - webhook에서만 업데이트하도록 변경 필요

## 포트원 V2 KG이니시스 일본결제 권장 워크플로우

### 표준 플로우:

```
1. 사용자가 결제 버튼 클릭
   ↓
2. 프론트엔드: PortOne.requestPayment() 호출
   - customData에 booking_id 포함
   - redirectUrl 설정
   ↓
3. 사용자가 KG이니시스 결제창에서 결제 진행
   ↓
4. 결제 완료 후 redirectUrl로 리다이렉트
   ↓
5. PortOne이 자동으로 webhook 호출 (백엔드)
   - Transaction.StatusChanged 이벤트
   - 결제 정보 검증 및 DB 업데이트
   ↓
6. 프론트엔드: webhook 업데이트 대기 (polling 또는 realtime 구독)
   ↓
7. 결제 완료 페이지 표시
```

### 현재 구조와의 차이점:

#### 현재:
```
결제 완료 → 프론트엔드에서 payment-complete API 호출 → DB 업데이트
                         ↓
                    Webhook도 호출됨 (중복)
```

#### 권장:
```
결제 완료 → Webhook만 호출 → DB 업데이트 → 프론트엔드는 DB 변경 감지
```

## 구체적 개선 사항

### 1. payment_page.js 수정

#### 변경 전:
```javascript
const paymentResult = await requestPayment(paymentParams);

const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/payment-complete`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    paymentId: paymentResult.payment_id
  })
});
```

#### 변경 후:
```javascript
const paymentResult = await requestPayment(paymentParams);

// Webhook이 결제 정보를 업데이트할 때까지 대기
const { data: payment } = await supabase
  .from('portone_payments')
  .select('status')
  .eq('imp_uid', paymentResult.payment_id)
  .maybeSingle();

if (payment && payment.status === 'paid') {
  window.location.href = '/payment_complete.html?booking_id=' + bookingData.id;
} else {
  // Realtime 구독으로 상태 변경 감지
  const subscription = supabase
    .channel('payment-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'portone_payments',
      filter: `imp_uid=eq.${paymentResult.payment_id}`
    }, (payload) => {
      if (payload.new.status === 'paid') {
        window.location.href = '/payment_complete.html?booking_id=' + bookingData.id;
      }
    })
    .subscribe();
}
```

### 2. Webhook에서 customData 활용

#### 추가 코드:
```typescript
// customData 파싱
let customData: any = {};
if (paymentData?.customData) {
  try {
    customData = typeof paymentData.customData === 'string'
      ? JSON.parse(paymentData.customData)
      : paymentData.customData;
  } catch (e) {
    console.error('Failed to parse customData:', e);
  }
}

// booking_id를 customData에서 가져오기
const bookingId = customData.booking_id || payment?.booking_id;

if (bookingId) {
  // booking 업데이트
}
```

### 3. noticeUrls 추가

#### portone_config.js:
```javascript
const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portone-webhook`;

const params = {
  // ... 기존 파라미터
  noticeUrls: [webhookUrl]
};
```

### 4. 채널 설정 확인

포트원 대시보드에서 다음을 확인해야 합니다:

1. **채널 타입**: KG이니시스 (일본) 선택
2. **채널 키**: `channel-key-104b9122-a3c5-4206-bb92-1235cc021587` 확인
3. **PG 설정**:
   - MID (가맹점 ID)
   - iniapi key
   - 상점명 (일본어, 영어)
   - 연락처 정보
4. **Webhook URL 등록**:
   - `https://eevvgbbokenpjnvtmztk.supabase.co/functions/v1/portone-webhook`
5. **IP 화이트리스트**:
   - 테스트 환경에서는 프론트엔드 서버 IP를 이니시스에 등록해야 함

### 5. RLS 정책 수정

#### 문제:
- anon 사용자가 portone_payments에 insert할 수 있지만, user_id null 허용 문제
- 프론트엔드에서 직접 insert하는 것은 보안상 위험

#### 해결책:
```sql
-- anon insert 정책 제거하고, Edge Function에서 service_role로 insert
DROP POLICY IF EXISTS "Anon can insert payments" ON portone_payments;

-- 프론트엔드에서는 bookings 테이블에 payment_intent만 생성
-- Edge Function에서 portone_payments 레코드 생성
```

## 포트원 샘플과 비교

포트원 공식 샘플 (express-html 등)에서는:

1. **프론트엔드**:
   - PortOne SDK로 결제 요청만 수행
   - redirectUrl로 리다이렉트 처리

2. **백엔드**:
   - Webhook으로 결제 상태 수신
   - PortOne API로 결제 정보 검증
   - 데이터베이스 업데이트

3. **프론트엔드 검증 없음**:
   - 프론트엔드에서 별도의 검증 API를 호출하지 않음
   - Webhook이 모든 처리를 담당

## 결론

현재 구현은 대부분 올바르나, 다음 사항들을 개선해야 합니다:

### 필수 개선:
1. ❌ **payment-complete Edge Function 제거** - 프론트엔드 검증 API 불필요
2. ❌ **payment_page.js에서 검증 호출 제거** - Webhook만 신뢰
3. ❌ **Realtime 구독 추가** - Webhook 업데이트 감지

### 권장 개선:
4. ⚠️ **customData 활용** - Webhook에서 booking_id 추출
5. ⚠️ **noticeUrls 추가** - 더 안정적인 알림
6. ⚠️ **RLS 정책 개선** - 보안 강화
7. ⚠️ **user_id 매핑** - customer_id 활용

### 확인 필요:
8. ℹ️ **포트원 대시보드 설정** - 채널, MID, Webhook URL
9. ℹ️ **IP 화이트리스트** - 이니시스 테스트 환경
10. ℹ️ **환경변수** - PORTONE_API_SECRET, PORTONE_WEBHOOK_SECRET

이 개선사항들을 적용하면 포트원 V2 KG이니시스 일본결제가 공식 샘플과 동일한 수준의 안정성과 보안성을 갖추게 됩니다.
