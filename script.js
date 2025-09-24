// 다국어 번역 데이터
const translations = {
    ko: {
        // Navigation
        "nav-home": "홈",
        "nav-about": "서비스 소개",
        "nav-friends": "친구들",
        "nav-how": "이용방법",
        "nav-reviews": "후기",
        "nav-contact": "FAQ",
        
        // Hero Section
        "hero-title": "서울에서 특별한 친구와 함께하는<br>잊을 수 없는 여행",
        "hero-subtitle": "현지인 친구와 함께 진짜 서울을 경험해보세요. 맛집, 핫플레이스, 숨겨진 명소까지!",
        "hero-btn-primary": "친구 찾기",
        "hero-btn-secondary": "서비스 알아보기",
        "stat-friends": "활동 친구들",
        "stat-tours": "성공한 투어",
        "stat-rating": "평균 평점",
        
        // About Section
        "about-title": "PUZZMI가 특별한 이유",
        "about-subtitle": "단순한 가이드가 아닌, 진짜 친구와 함께하는 서울 여행",
        "feature1-title": "검증된 현지 친구들",
        "feature1-desc": "모든 친구들은 신원확인과 면접을 통해 검증된 서울 현지인들입니다.",
        "feature2-title": "맞춤형 여행 경험",
        "feature2-desc": "관광책에 없는 진짜 서울을 경험하고 싶은 당신의 취향에 맞춘 여행.",
        "feature3-title": "안전한 서비스",
        "feature3-desc": "24시간 고객지원과 안전보험으로 걱정 없는 여행을 보장합니다.",
        
        // Friends Section
        "friends-title": "우리 친구들을 만나보세요",
        "friends-subtitle": "다양한 매력을 가진 메이트들이 여러분을 기다리고 있어요",
        "filter-all": "전체",
        "filter-food": "맛집 투어",
        "filter-culture": "문화 체험",
        "filter-shopping": "쇼핑",
        "per-day": "/일",
        "jieun-specialties": "맛집 탐방, 한국 문화",
        "jieun-desc": "안녕하세요! 서울 토박이 지은입니다. 숨겨진 맛집과 전통문화를 소개해드려요.",
        "minjun-specialties": "쇼핑, K-팝 문화",
        "minjun-desc": "K-팝과 패션을 사랑하는 민준이에요. 홍대, 강남의 핫플레이스를 안내해드려요!",
        "soyoung-specialties": "나이트라이프, 바 투어",
        "soyoung-desc": "서울의 밤을 즐기고 싶다면 저와 함께해요! 루프탑바부터 숨겨진 펫집까지.",
        "hyunwoo-specialties": "역사, 전통 문화",
        "hyunwoo-desc": "서울의 역사와 전통을 사랑하는 현우입니다. 궁궐과 한옥마을을 함께 둘러봐요.",
        
        // How It Works
        "how-title": "이용 방법",
        "how-subtitle": "간단한 3단계로 서울에서 특별한 친구를 만나보세요",
        "step1-title": "친구 선택",
        "step1-desc": "프로필을 보고 취향에 맞는 친구를 선택하세요. 언어, 관심사, 전문분야를 확인할 수 있어요.",
        "step2-title": "일정 예약",
        "step2-desc": "원하는 날짜와 시간, 활동을 선택하여 예약하세요. 친구와 미리 채팅으로 계획을 세울 수 있어요.",
        "step3-title": "만나서 즐기기",
        "step3-desc": "약속 장소에서 친구를 만나 서울의 진짜 매력을 경험하세요. 평생 잊지 못할 추억을 만들어보세요!",
        
        // Reviews
        "reviews-title": "생생한 후기",
        "reviews-subtitle": "PUZZMI와 함께한 여행객들의 이야기",
        "reviewer1-location": "미국, 뉴욕",
        "reviewer2-location": "일본, 도쿄",
        "reviewer3-location": "영국, 런던",
        "review1-text": "지은이와 함께한 서울 여행은 정말 최고였어요! 관광 가이드북에서는 찾을 수 없는 숨겨진 맛집들을 발견할 수 있었고, 한국 문화를 진짜로 체험할 수 있었습니다. 완전 추천해요!",
        "review2-text": "민준 씨 덕분에 홍대와 강남의 진짜 모습을 볼 수 있었어요. K-팝 문화에 대해서도 많이 배웠고, 쇼핑도 너무 재미있었습니다. 다음에 또 이용하고 싶어요!",
        "review3-text": "소영이와 함께한 서울 나이트라이프는 정말 환상적이었어요! 안전하면서도 재미있는 밤 문화를 경험할 수 있었습니다. 혼자서는 절대 갈 수 없었을 곳들을 가봤어요.",
        
        // Contact
        "contact-title": "문의하기",
        "contact-desc": "궁금한 점이 있으시거나 특별한 요청이 있으시면 언제든 연락주세요. 24시간 고객지원팀이 도와드려요.",
        "contact-email-title": "이메일",
        "contact-phone-title": "전화",
        "contact-address-title": "주소",
        "contact-address": "서울특별시 강남구 테헤란로 123",
        "contact-hours-title": "운영시간",
        "contact-hours": "24시간 연중무휴",
        "form-name": "이름",
        "form-email": "이메일 주소",
        "form-subject": "제목",
        "form-message": "메시지를 입력해주세요",
        "form-submit": "메시지 보내기",
        
        // Footer
        "footer-desc": "서울에서 진짜 친구와 함께하는<br>특별한 여행 경험",
        "footer-service": "서비스",
        "footer-find-friend": "친구 찾기",
        "footer-become-friend": "친구 되기",
        "footer-pricing": "요금안내",
        "footer-safety": "안전정책",
        "footer-support": "고객지원",
        "footer-help": "도움말",
        "footer-faq": "자주묻는질문",
        "footer-contact-us": "문의하기",
        "footer-refund": "환불정책",
        "footer-company": "회사소개",
        "footer-about-us": "회사소개",
        "footer-careers": "채용정보",
        "footer-press": "보도자료",
        "footer-blog": "블로그",
        "footer-rights": "All rights reserved.",
        "footer-terms": "이용약관",
        "footer-privacy": "개인정보처리방침"
    },
    
    ja: {
        // Navigation
        "nav-home": "ホーム",
        "nav-about": "サービス紹介",
        "nav-friends": "友達",
        "nav-how": "利用方法",
        "nav-reviews": "レビュー",
        "nav-contact": "お問い合わせ",
        "header-cta": "友達を探す",
        
        // Hero Section
        "hero-title": "ソウルで特別な友達と一緒に<br>忘れられない旅行を",
        "hero-subtitle": "現地の友達と一緒に本当のソウルを体験してみてください。グルメ、話題のスポット、隠れた名所まで！",
        "hero-btn-primary": "友達を探す",
        "hero-btn-secondary": "サービスについて",
        "stat-friends": "活動中の友達",
        "stat-tours": "成功したツアー",
        "stat-rating": "平均評価",
        
        // About Section
        "about-title": "PUZZMIが特別な理由",
        "about-subtitle": "単純なガイドではなく、本当の友達と一緒にするソウル旅行",
        "feature1-title": "認証された現地の友達",
        "feature1-desc": "すべての友達は身元確認と面接を通じて認証されたソウルの現地人です。",
        "feature2-title": "カスタマイズされた旅行体験",
        "feature2-desc": "観光ガイドブックにない本当のソウルを体験したいあなたの好みに合わせた旅行。",
        "feature3-title": "安全なサービス",
        "feature3-desc": "24時間カスタマーサポートと安全保険で心配のない旅行を保証します。",
        
        // Friends Section
        "friends-title": "私たちの友達に会ってみてください",
        "friends-subtitle": "様々な魅力を持つソウルの友達があなたを待っています",
        "filter-all": "全て",
        "filter-food": "グルメツアー",
        "filter-culture": "文化体験",
        "filter-shopping": "ショッピング",
        "filter-nightlife": "ナイトライフ",
        "per-day": "/日",
        "jieun-specialties": "グルメ探訪、韓国文化",
        "jieun-desc": "こんにちは！ソウル生まれのジウンです。隠れたグルメと伝統文化をご紹介します。",
        "minjun-specialties": "ショッピング、K-POP文化",
        "minjun-desc": "K-POPとファッションを愛するミンジュンです。弘大、江南の人気スポットをご案内します！",
        "soyoung-specialties": "ナイトライフ、バーツアー",
        "soyoung-desc": "ソウルの夜を楽しみたいなら私と一緒に！ルーフトップバーから隠れた居酒屋まで。",
        "hyunwoo-specialties": "歴史、伝統文化",
        "hyunwoo-desc": "ソウルの歴史と伝統を愛するヒョンウです。宮殿と韓屋村を一緒に回りましょう。",
        
        // How It Works
        "how-title": "利用方法",
        "how-subtitle": "簡単な3ステップでソウルで特別な友達に出会えます",
        "step1-title": "友達選択",
        "step1-desc": "プロフィールを見て好みに合う友達を選んでください。言語、興味、専門分野を確認できます。",
        "step2-title": "スケジュール予約",
        "step2-desc": "希望する日時と活動を選んで予約してください。友達と事前にチャットで計画を立てることができます。",
        "step3-title": "会って楽しむ",
        "step3-desc": "約束の場所で友達に会ってソウルの本当の魅力を体験してください。一生忘れられない思い出を作りましょう！",
        
        // Reviews
        "reviews-title": "生の声",
        "reviews-subtitle": "PUZZMIと一緒にした旅行者たちの本当の話",
        "reviewer1-location": "アメリカ、ニューヨーク",
        "reviewer2-location": "日本、東京",
        "reviewer3-location": "イギリス、ロンドン",
        "review1-text": "ジウンさんと一緒にしたソウル旅行は本当に最高でした！観光ガイドブックでは見つけることができない隠れたグルメを発見でき、韓国文化を本当に体験できました。完全におすすめです！",
        "review2-text": "ミンジュンさんのおかげで弘大と江南の本当の姿を見ることができました。K-POP文化についてもたくさん学び、ショッピングもとても楽しかったです。また利用したいです！",
        "review3-text": "ソヨンさんと一緒にしたソウルのナイトライフは本当に幻想的でした！安全で楽しい夜の文化を体験できました。一人では絶対に行けなかった場所に行けました。",
        
        // Contact
        "contact-title": "お問い合わせ",
        "contact-desc": "ご質問や特別なご要望がございましたら、いつでもご連絡ください。24時間カスタマーサポートチームがサポートします。",
        "contact-email-title": "メール",
        "contact-phone-title": "電話",
        "contact-address-title": "住所",
        "contact-address": "ソウル特別市江南区テヘラン路123",
        "contact-hours-title": "営業時間",
        "contact-hours": "24時間年中無休",
        "form-name": "お名前",
        "form-email": "メールアドレス",
        "form-subject": "件名",
        "form-message": "メッセージを入力してください",
        "form-submit": "メッセージを送信",
        
        // Footer
        "footer-desc": "ソウルで本当の友達と一緒にする<br>特別な旅行体験",
        "footer-service": "サービス",
        "footer-find-friend": "友達を探す",
        "footer-become-friend": "友達になる",
        "footer-pricing": "料金案内",
        "footer-safety": "安全ポリシー",
        "footer-support": "カスタマーサポート",
        "footer-help": "ヘルプ",
        "footer-faq": "よくある質問",
        "footer-contact-us": "お問い合わせ",
        "footer-refund": "返金ポリシー",
        "footer-company": "会社案内",
        "footer-about-us": "会社案内",
        "footer-careers": "採用情報",
        "footer-press": "報道資料",
        "footer-blog": "ブログ",
        "footer-rights": "All rights reserved.",
        "footer-terms": "利用規約",
        "footer-privacy": "プライバシーポリシー"
    },
    
    en: {
        // Navigation
        "nav-home": "Home",
        "nav-about": "About",
        "nav-friends": "Friends",
        "nav-how": "How It Works",
        "nav-reviews": "Reviews",
        "nav-contact": "Contact",
        "header-cta": "Find Friends",
        
        // Hero Section
        "hero-title": "Unforgettable Journey in Seoul<br>with Special Local Friends",
        "hero-subtitle": "Experience the real Seoul with local friends. From hidden gems to hotspots and secret locations!",
        "hero-btn-primary": "Find Friends",
        "hero-btn-secondary": "Learn More",
        "stat-friends": "Active Friends",
        "stat-tours": "Successful Tours",
        "stat-rating": "Average Rating",
        
        // About Section
        "about-title": "Why PUZZMI is Special",
        "about-subtitle": "Not just a guide, but a real Seoul journey with genuine friends",
        "feature1-title": "Verified Local Friends",
        "feature1-desc": "All friends are verified Seoul locals through identity checks and interviews.",
        "feature2-title": "Customized Travel Experience",
        "feature2-desc": "Experience the real Seoul that's not in guidebooks, tailored to your preferences.",
        "feature3-title": "Safe Service",
        "feature3-desc": "24/7 customer support and safety insurance guarantee worry-free travel.",
        
        // Friends Section
        "friends-title": "Meet Our Friends",
        "friends-subtitle": "Seoul friends with various charms are waiting for you",
        "filter-all": "All",
        "filter-food": "Food Tour",
        "filter-culture": "Culture",
        "filter-shopping": "Shopping",
        "filter-nightlife": "Nightlife",
        "per-day": "/day",
        "jieun-specialties": "Food exploration, Korean culture",
        "jieun-desc": "Hello! I'm Jieun, a Seoul native. I'll introduce you to hidden restaurants and traditional culture.",
        "minjun-specialties": "Shopping, K-pop culture",
        "minjun-desc": "I'm Minjun who loves K-pop and fashion. I'll guide you through Hongdae and Gangnam hotspots!",
        "soyoung-specialties": "Nightlife, Bar tours",
        "soyoung-desc": "If you want to enjoy Seoul nights, come with me! From rooftop bars to hidden pubs.",
        "hyunwoo-specialties": "History, Traditional culture",
        "hyunwoo-desc": "I'm Hyunwoo who loves Seoul's history and traditions. Let's explore palaces and hanok villages together.",
        
        // How It Works
        "how-title": "How It Works",
        "how-subtitle": "Meet special friends in Seoul with simple 3 steps",
        "step1-title": "Choose a Friend",
        "step1-desc": "Look at profiles and choose a friend that matches your taste. You can check languages, interests, and specialties.",
        "step2-title": "Book Schedule",
        "step2-desc": "Select your preferred date, time, and activities to book. You can chat with friends to plan ahead.",
        "step3-title": "Meet and Enjoy",
        "step3-desc": "Meet your friend at the meeting point and experience Seoul's real charm. Create unforgettable memories!",
        
        // Reviews
        "reviews-title": "Real Reviews",
        "reviews-subtitle": "Real stories from travelers who journeyed with PUZZMI",
        "reviewer1-location": "USA, New York",
        "reviewer2-location": "Japan, Tokyo",
        "reviewer3-location": "UK, London",
        "review1-text": "The Seoul trip with Jieun was absolutely amazing! I discovered hidden restaurants that you can't find in tourist guidebooks and truly experienced Korean culture. Highly recommend!",
        "review2-text": "Thanks to Minjun, I could see the real side of Hongdae and Gangnam. I learned a lot about K-pop culture and shopping was so much fun. I want to use this service again!",
        "review3-text": "Seoul nightlife with Soyoung was fantastic! I experienced safe yet fun night culture. I went to places I never could have gone alone.",
        
        // Contact
        "contact-title": "Contact Us",
        "contact-desc": "If you have any questions or special requests, please contact us anytime. Our 24/7 customer support team will help you.",
        "contact-email-title": "Email",
        "contact-phone-title": "Phone",
        "contact-address-title": "Address",
        "contact-address": "123 Teheran-ro, Gangnam-gu, Seoul",
        "contact-hours-title": "Operating Hours",
        "contact-hours": "24/7 Year Round",
        "form-name": "Name",
        "form-email": "Email Address",
        "form-subject": "Subject",
        "form-message": "Please enter your message",
        "form-submit": "Send Message",
        
        // Footer
        "footer-desc": "Special travel experiences<br>with real friends in Seoul",
        "footer-service": "Service",
        "footer-find-friend": "Find Friends",
        "footer-become-friend": "Become a Friend",
        "footer-pricing": "Pricing",
        "footer-safety": "Safety Policy",
        "footer-support": "Support",
        "footer-help": "Help",
        "footer-faq": "FAQ",
        "footer-contact-us": "Contact Us",
        "footer-refund": "Refund Policy",
        "footer-company": "Company",
        "footer-about-us": "About Us",
        "footer-careers": "Careers",
        "footer-press": "Press",
        "footer-blog": "Blog",
        "footer-rights": "All rights reserved.",
        "footer-terms": "Terms of Service",
        "footer-privacy": "Privacy Policy"
    }
};

// 현재 언어 상태
let currentLanguage = 'ko';

// DOM 요소들
const langButtons = document.querySelectorAll('.lang-btn');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.querySelector('.nav-menu');
const filterButtons = document.querySelectorAll('.filter-btn');
const friendCards = document.querySelectorAll('.friend-card');
const contactForm = document.querySelector('.contact-form');
const heroBackgrounds = [
    'bg1.png',
    'bg2.png',
    'bg3.png',
    'bg4.png'
];
// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeLanguage();
    initializeAnimations();
    initializeSmoothScrolling();
    initializeMobileMenu();
    initializeFilters();
    initializeContactForm();
    initializeHeaderScroll();
    decorateSectionHeaders();
    prepareReveals();
    initializeEnhancedAnimations();
    initializeScrollProgress();
    initializeHeroParallax();
    initializeFAQ();
    initializeSwipeCards();
});

// 스와이프 카드 시스템 초기화
function initializeSwipeCards() {
    // 각 스와이프 컨테이너에 터치 이벤트 추가
    const containers = document.querySelectorAll('.swipe-container');
    
    containers.forEach(container => {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        
        const wrapper = container.querySelector('.swipe-wrapper');
        if (!wrapper) return;
        
        // 터치 시작
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            wrapper.style.transition = 'none';
        }, { passive: true });
        
        // 터치 이동
        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;
            const currentSlide = parseInt(container.dataset.currentSlide || '0');
            
            // 현재 슬라이드 위치에서 드래그 거리만큼 이동
            const currentTranslate = -(currentSlide * 100);
            const dragPercent = (diffX / container.offsetWidth) * 100;
            const translateX = currentTranslate + dragPercent;
            wrapper.style.transform = `translateX(${translateX}%)`;
        }, { passive: true });
        
        // 터치 종료
        container.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            wrapper.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            
            const diffX = currentX - startX;
            const threshold = container.offsetWidth * 0.2; // 20% 이상 스와이프해야 넘어감
            
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    // 오른쪽으로 스와이프 - 이전 슬라이드
                    changeSlide(container.id, -1);
                } else {
                    // 왼쪽으로 스와이프 - 다음 슬라이드
                    changeSlide(container.id, 1);
                }
            } else {
                // 임계값 미달 - 원래 위치로 복귀
                const currentSlide = parseInt(container.dataset.currentSlide || '0');
                goToSlide(container.id, currentSlide);
            }
        }, { passive: true });
        
        // 마우스 드래그 지원 (데스크톱)
        let isMouseDown = false;
        
        container.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isMouseDown = true;
            wrapper.style.transition = 'none';
            wrapper.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            currentX = e.clientX;
            const diffX = currentX - startX;
            const currentSlide = parseInt(container.dataset.currentSlide || '0');
            
            const currentTranslate = -(currentSlide * 100);
            const dragPercent = (diffX / container.offsetWidth) * 100;
            const translateX = currentTranslate + dragPercent;
            wrapper.style.transform = `translateX(${translateX}%)`;
        });
        
        container.addEventListener('mouseup', (e) => {
            if (!isMouseDown) return;
            
            isMouseDown = false;
            wrapper.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            wrapper.style.cursor = 'grab';
            
            const diffX = currentX - startX;
            const threshold = container.offsetWidth * 0.2;
            
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    changeSlide(container.id, -1);
                } else {
                    changeSlide(container.id, 1);
                }
            } else {
                const currentSlide = parseInt(container.dataset.currentSlide || '0');
                goToSlide(container.id, currentSlide);
            }
        });
        
        container.addEventListener('mouseleave', () => {
            if (isMouseDown) {
                isMouseDown = false;
                wrapper.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                wrapper.style.cursor = 'grab';
                const currentSlide = parseInt(container.dataset.currentSlide || '0');
                goToSlide(container.id, currentSlide);
            }
        });
        
        // 초기 슬라이드 설정
        container.dataset.currentSlide = '0';
        goToSlide(container.id, 0);
    });
    
    // 자동 슬라이드 (선택사항)
    startAutoSlide();
}

// 슬라이드 변경 함수
function changeSlide(containerId, direction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const slides = container.querySelectorAll('.swipe-slide');
    const currentIndex = parseInt(container.dataset.currentSlide || '0');
    let newIndex = currentIndex + direction;
    
    // 순환 처리
    if (newIndex < 0) {
        newIndex = slides.length - 1;
    } else if (newIndex >= slides.length) {
        newIndex = 0;
    }
    
    goToSlide(containerId, newIndex);
}

// 특정 슬라이드로 이동
function goToSlide(containerId, index) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const wrapper = container.querySelector('.swipe-wrapper');
    const slides = container.querySelectorAll('.swipe-slide');
    const indicators = container.querySelectorAll('.indicator');
    
    if (!wrapper || !slides.length) return;
    
    // 인덱스 범위 체크
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    
    // 퍼센트 기반으로 슬라이드 이동
    const translateX = -(index * 100);
    wrapper.style.transform = `translateX(${translateX}%)`;
    
    // 활성 상태 업데이트
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    
    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });
    
    // 현재 슬라이드 인덱스 저장
    container.dataset.currentSlide = index.toString();
}

// 자동 슬라이드 (8초마다)
function startAutoSlide() {
    const containers = ['aboutSwipeContainer', 'safetySwipeContainer'];
    
    containers.forEach(containerId => {
        setInterval(() => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            // 마우스가 컨테이너 위에 있으면 자동 슬라이드 중지
            if (container.matches(':hover')) return;
            
            changeSlide(containerId, 1);
        }, 8000); // 8초마다
    });
}

// 전역 함수로 등록 (HTML onclick에서 사용)
window.changeSlide = changeSlide;
window.goToSlide = goToSlide;

// 언어 초기화
function initializeLanguage() {
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            switchLanguage(lang);
        });
    });
}

// 언어 전환 함수
function switchLanguage(lang) {
    currentLanguage = lang;
    
    // 언어 버튼 상태 업데이트
    langButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        }
    });
    
    // HTML lang 속성 업데이트
    document.documentElement.lang = lang;
    
    // 모든 번역 가능한 요소 업데이트
    const elementsToTranslate = document.querySelectorAll('[data-key]');
    elementsToTranslate.forEach(element => {
        const key = element.dataset.key;
        if (translations[lang] && translations[lang][key]) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translations[lang][key];
            } else {
                element.innerHTML = translations[lang][key];
            }
        }
    });
    
    // 플레이스홀더 업데이트
    const placeholderElements = document.querySelectorAll('[data-placeholder-key]');
    placeholderElements.forEach(element => {
        const key = element.dataset.placeholderKey;
        if (translations[lang] && translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });
}

// 로고 변경을 위한 코드
const navBrand = document.querySelector('.nav-brand');
navBrand.innerHTML = `<img src="puzzmi_original.png" alt="PUZZMI 로고" class="logo"><span>PUZZMI</span>`;
//navBrand.querySelector('.logo').style.height = '40px';
//navBrand.querySelector('.logo').style.marginRight = '10px';
navBrand.querySelector('.logo').style.verticalAlign = 'middle';

// 히어로 배경 이미지 순환 로직
let currentBgIndex = 0;
const heroBgElement = document.querySelector('.hero-bg');
const backgroundTexts = [
    'ソウルの隠れた名所を発見',
    '現地の友達と特別な思い出',
    '本格的な韓国グルメ体験',
    'あなただけのソウル旅行'
];

function changeHeroBackground() {
    if (!heroBgElement) return;
    
    // 다음 이미지 인덱스로 업데이트
    currentBgIndex = (currentBgIndex + 1) % heroBackgrounds.length;
    
    // 페이드 아웃
    heroBgElement.style.opacity = '0';
    
    setTimeout(() => {
        // 새로운 배경 이미지 설정
        heroBgElement.style.backgroundImage = `url('${heroBackgrounds[currentBgIndex]}')`;
        
        // 배경 텍스트 업데이트 (data-text 속성 사용)
        heroBgElement.setAttribute('data-text', backgroundTexts[currentBgIndex]);
        
        // 페이드 인
        heroBgElement.style.opacity = '1';
    }, 500);
}

// 초기 설정 및 배경 변경 시작
function initializeHeroBackground() {
    if (!heroBgElement) return;
    
    // 초기 배경 이미지 설정
    heroBgElement.style.backgroundImage = `url('${heroBackgrounds[currentBgIndex]}')`;
    heroBgElement.style.opacity = '1';
    
    // 초기 배경 텍스트 설정 (data-text 속성 사용)
    heroBgElement.setAttribute('data-text', backgroundTexts[currentBgIndex]);
    
    // 5초마다 배경 변경 (조금 더 여유있게)
    setInterval(changeHeroBackground, 5000);
}

// 페이지 로드 시 히어로 배경 초기화
document.addEventListener('DOMContentLoaded', initializeHeroBackground);

// 애니메이션 초기화
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // 애니메이션할 요소들 관찰
    const animateElements = document.querySelectorAll('.feature, .friend-card, .step, .review-card');
    animateElements.forEach(el => observer.observe(el));
}

// 부드러운 스크롤링
function initializeSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // 모바일 메뉴 닫기
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                }
            }
        });
    });
}

// "Q&A(안심 서비스)" 블록을 사진(about-image) 바로 아래로 이동
function relocateSafetyBlock() {
  const container = document.querySelector('#about .about-content');
  const imgCol = container?.querySelector('.about-image');
  const textCol = container?.querySelector('.about-text');
  if (!container || !imgCol || !textCol) return;

  // about-text 안의 .section-subtitle 중 h3 + ol을 함께 가진 블록을 Q&A로 간주(언어 변경에도 안전)
  const candidates = textCol.querySelectorAll('.section-subtitle');
  let qaBlock = null;
  candidates.forEach(el => {
    if (el.querySelector('h3') && el.querySelector('ol')) qaBlock = el;
  });
  if (!qaBlock) return;

  // 래퍼 카드 생성 후 Q&A 블록을 이동
  const wrap = document.createElement('div');
  wrap.className = 'about-safety reveal reveal-left';
  wrap.appendChild(qaBlock);
  imgCol.insertAdjacentElement('afterend', wrap);

  // 아이콘(선택) 추가: fa-shield (Font Awesome 6.0 호환)
  const h3 = wrap.querySelector('h3');
  if (h3 && !h3.querySelector('i')) {
    const ico = document.createElement('i');
    ico.className = 'fas fa-shield';
    ico.setAttribute('aria-hidden', 'true');
    h3.prepend(ico);
  }
}

// 모바일 메뉴
function initializeMobileMenu() {
    if (!mobileMenuBtn || !navMenu) {
        return; // 요소가 없으면 함수 종료
    }
    
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
    
    // 모바일 메뉴 스타일 추가
    if (!document.querySelector('#mobile-menu-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-menu-styles';
        style.textContent = `
            @media (max-width: 1024px) {
                .nav-menu {
                    position: fixed;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    flex-direction: column;
                    padding: 20px;
                    box-shadow: var(--shadow-medium);
                    transform: translateY(-100%);
                    opacity: 0;
                    visibility: hidden;
                    transition: var(--transition);
                    z-index: 999;
                }
                
                .nav-menu.active {
                    transform: translateY(0);
                    opacity: 1;
                    visibility: visible;
                }
                
                .nav-menu li {
                    margin: 10px 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// 필터 기능
function initializeFilters() {
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            
            // 필터 버튼 상태 업데이트
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 친구 카드 필터링
            friendCards.forEach(card => {
                if (filter === 'all' || card.dataset.category.includes(filter)) {
                    card.classList.remove('hide');
                    card.classList.add('show');
                } else {
                    card.classList.add('hide');
                    card.classList.remove('show');
                }
            });
        });
    });
}

// 연락처 폼
function initializeContactForm() {
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // 폼 데이터 수집
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);
            
            // 여기서 실제 백엔드로 데이터를 전송하거나 처리
            console.log('Form submitted:', data);
            
            // 성공 메시지 표시
            alert(currentLanguage === 'ko' ? '메시지가 성공적으로 전송되었습니다!' : 
                  currentLanguage === 'ja' ? 'メッセージが正常に送信されました！' : 
                  'Message sent successfully!');
            
            // 폼 리셋
            contactForm.reset();
        });
    }
}

// 헤더 스크롤 효과
function initializeHeaderScroll() {
    const header = document.querySelector('.app-nav');
    
    if (!header) {
        return; // Exit if navigation element is not found
    }
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// 유틸리티 함수들
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 윈도우 리사이즈 핸들러
window.addEventListener('resize', debounce(() => {
    // 모바일 메뉴 초기화
    if (window.innerWidth > 1024 && navMenu) {
        navMenu.classList.remove('active');
    }
}, 250));

// 키보드 네비게이션 지원
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        navMenu.classList.remove('active');
    }
});

document.addEventListener('DOMContentLoaded', () => {
  const obs = new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.style.opacity=1; e.target.style.transform='none'; obs.unobserve(e.target); }
  }), {threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>{
    el.style.opacity=0; el.style.transform='translateY(12px)'; obs.observe(el);
  });
});

// 섹션 헤더 아이브로우(라벨) 주입
function decorateSectionHeaders(){
  const map = new Map([
    ['#about','ABOUT'],
    ['#friends','FRIENDS'],
    ['#how-it-works','HOW IT WORKS'],
    ['#reviews','REVIEWS'],
    ['#contact','CONTACT']
  ]);
  map.forEach((label, sel) => {
    const el = document.querySelector(sel + ' .section-header');
    if (el) el.setAttribute('data-eyebrow', label);
  });
}

// 등장 애니메이션 대상 준비
function prepareReveals(){
  const selectors = '.section-header, .feature, .friend-card, .step, .review-card, .contact-item, .contact-form-container';
  document.querySelectorAll(selectors).forEach((el, i) => {
    el.classList.add('reveal');
    // 친구 카드 섹션은 좌/우 번갈아 등장
    if (el.closest('.friends')) el.classList.add(i % 2 ? 'reveal-right' : 'reveal-left');
  });
}

// 회원가입 API 호출 함수
async function registerUser(email, password, nickname) {
  const url = 'http://localhost:3000/auth/register';
  
  // CORS 문제가 발생할 수 있으므로, headers에 Content-Type을 반드시 포함해야 합니다.
  const headers = {
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    email: email,
    password: password,
    nickname: nickname
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      // 서버에서 200번대 응답이 아닌 경우
      const errorData = await response.json();
      throw new Error(errorData.message || '회원가입 실패');
    }

    const data = await response.json();
    console.log('회원가입 성공:', data);
    return data;
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    alert(error.message); // 사용자에게 오류 메시지 표시
    return null;
  }
}

// 예시: 버튼 클릭 시 함수 실행
// 실제 HTML에 있는 회원가입 폼에 맞게 수정해야 합니다.
const registerButton = document.getElementById('register-button'); 

if (registerButton) {
  registerButton.addEventListener('click', () => {
    // 폼 입력 값 가져오기
    const userEmail = 'testuser@example.com'; 
    const userPassword = 'password123';
    const userNickname = '테스터1';
    
    // API 호출
    registerUser(userEmail, userPassword, userNickname);
  });
}

// 인터섹션 옵저버로 .reveal → .in 토글
function initializeEnhancedAnimations(){
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        obs.unobserve(en.target);
      }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// 상단 스크롤 프로그레스바
function initializeScrollProgress(){
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.appendChild(bar);
  const style = document.createElement('style');
  style.textContent = `
    #scroll-progress{position:fixed;top:0;left:0;height:3px;width:0;
      background: var(--brand-gradient); z-index: 2000;}
  `;
  document.head.appendChild(style);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// 히어로 패럴랙스(살짝) – 웹플로우 느낌의 상호작용
function initializeHeroParallax(){
  const hero = document.querySelector('.hero');
  const content = document.querySelector('.hero-content');
  if (!hero || !content) return;
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    content.style.transform = `translate3d(${dx*8}px, ${dy*6}px, 0)`;
  });
  hero.addEventListener('mouseleave', () => content.style.transform = 'translate3d(0,0,0)');
}

// FAQ 아코디언 기능
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // 다른 모든 FAQ 아이템 닫기
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // 현재 아이템 토글
            item.classList.toggle('active', !isActive);
        });
    });
}

// 접근성 개선
function improveAccessibility() {
    // 포커스 가능한 요소들에 포커스 스타일 추가
    const focusableElements = document.querySelectorAll('button, a, input, textarea, select');
    
    focusableElements.forEach(element => {
        element.addEventListener('focus', () => {
            element.style.outline = '2px solid var(--primary-color)';
            element.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', () => {
            element.style.outline = 'none';
        });
    });
    
    // 스킵 링크 추가
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = currentLanguage === 'ko' ? '본문으로 건너뛰기' : 
                          currentLanguage === 'ja' ? 'メインコンテンツへスキップ' : 
                          'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: var(--primary-color);
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 9999;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
}

// 페이지 로드 완료 후 접근성 개선
window.addEventListener('load', improveAccessibility);