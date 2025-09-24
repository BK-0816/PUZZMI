/* PUZZMI navbar – redesigned with responsive dropdowns */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_ANON_KEY, SUPABASE_URL };

// DOM 요소 생성 헬퍼 함수
function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'onclick') {
      element.addEventListener('click', value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  const childArray = Array.isArray(children) ? children : [children];
  childArray.filter(Boolean).forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  
  return element;
}

// 사용자 역할 확인
async function getUserRoles() {
  let user = null;
  let isAdmin = false;
  let isMate = false;
  
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) {
      console.log('Auth error:', error.message);
      await supabase.auth.signOut();
      return { user: null, isAdmin: false, isMate: false };
    }
    user = authUser;
  } catch (error) {
    console.error('Auth error:', error);
    await supabase.auth.signOut();
    return { user: null, isAdmin: false, isMate: false };
  }
  
  if (user) {
    try {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      isAdmin = !!adminData;
      
      const { data: mateData } = await supabase
        .from('mate_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      isMate = !!mateData;
    } catch (error) {
      console.error('Role check error:', error);
    }
  }
  
  return { user, isAdmin, isMate };
}

// 알림 개수 가져오기
async function getNotificationCount(userId) {
  try {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    return count || 0;
  } catch (error) {
    console.error('Notification count error:', error);
    return 0;
  }
}

// 드롭다운 토글
function toggleDropdown(dropdownElement) {
  const isActive = dropdownElement.classList.contains('active');
  
  // 모든 드롭다운 닫기
  document.querySelectorAll('.dropdown.active').forEach(dropdown => {
    dropdown.classList.remove('active');
  });
  
  // 클릭한 드롭다운만 토글
  if (!isActive) {
    dropdownElement.classList.add('active');
  }
}

// 모바일 메뉴 토글
function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  
  if (mobileMenu && mobileMenuBtn) {
    const isActive = mobileMenu.classList.contains('active');
    
    if (isActive) {
      mobileMenu.classList.remove('active');
      mobileMenuBtn.classList.remove('active');
      document.body.style.overflow = '';
    } else {
      mobileMenu.classList.add('active');
      mobileMenuBtn.classList.add('active');
      document.body.style.overflow = 'hidden';
      // 다른 드롭다운 메뉴들 모두 닫기
      document.querySelectorAll('.dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  }
}

// 모바일 메뉴 닫기
function closeMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  
  if (mobileMenu && mobileMenuBtn) {
    mobileMenu.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// 전역 함수로 등록
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;

// 네비게이션바 렌더링
export async function renderNavbar(rootId = 'app-nav') {
  const root = document.getElementById(rootId);
  if (!root) {
    console.error('Navigation root element not found:', rootId);
    return;
  }
  
  // 기존 내용 초기화
  root.innerHTML = '';
  root.className = 'app-nav';
  
  // 네비게이션 컨테이너
  const container = createElement('div', { class: 'nav-container' });
  
  // 브랜드 로고
  const brand = createElement('a', { class: 'nav-brand', href: 'index.html' }, [
    createElement('img', { src: 'puzzmi_original.png', alt: 'PUZZMI 로고' }),
    createElement('span', {}, 'PUZZMI')
  ]);
  container.appendChild(brand);
  
  // 왼쪽 메뉴 (데스크톱용)
  const navLeft = createElement('div', { class: 'nav-left' });
  const commonMenus = [
    { href: 'index.html#home', text: 'ホーム' },
    { href: 'index.html#about', text: 'サービス紹介' },
    { href: 'index.html#how-it-works', text: 'ご利用流れ' },
    { href: 'index.html#friends', text: 'メイト予約' },
    { href: 'index.html#reviews', text: '口コミ' },
    { href: 'index.html#contact', text: 'FAQ' }
  ];
  
  commonMenus.forEach(menu => {
    navLeft.appendChild(createElement('a', { class: 'nav-link', href: menu.href }, menu.text));
  });
  container.appendChild(navLeft);
  
  // 오른쪽 액션 영역
  const navRight = createElement('div', { class: 'nav-right' });
  
  const { user, isAdmin, isMate } = await getUserRoles();
  
  // 비로그인 상태
  if (!user) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    navRight.appendChild(createElement('a', { 
      class: 'nav-link', 
      href: `auth_combo.html?redirect=${redirectParam}` 
    }, 'ログイン'));
  } else {
    // 로그인 상태 - 알림 아이콘
    const notifCount = await getNotificationCount(user.id);
    const notifIcon = createElement('a', { 
      class: 'notification-icon', 
      href: 'notification.html',
      title: '알림함'
    }, [
      createElement('i', { class: 'fas fa-bell' }),
      notifCount > 0 ? createElement('span', { class: 'notification-badge' }, String(notifCount)) : null
    ].filter(Boolean));
    navRight.appendChild(notifIcon);
    
    // 사용자 드롭다운
    const userDropdown = createElement('div', { class: 'dropdown' });
    
    const userToggle = createElement('button', { 
      class: 'dropdown-toggle',
      onclick: () => toggleDropdown(userDropdown)
    }, [
      createElement('i', { class: 'fas fa-user' }),
      createElement('span', {}, user.email?.split('@')[0] || '사용자'),
      createElement('i', { class: 'fas fa-chevron-down dropdown-icon' })
    ]);
    
    const userMenu = createElement('div', { class: 'dropdown-menu' });
    
    // 일반 사용자 메뉴
    if (!isAdmin && !isMate) {
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'my_favorites.html' }, [
        createElement('i', { class: 'fas fa-heart' }),
        createElement('span', {}, 'ネチムリスト')
      ]));
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'my_bookings.html' }, [
        createElement('i', { class: 'fas fa-calendar-check' }),
        createElement('span', {}, '私の予約リスト')
      ]));
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'my_profile.html' }, [
        createElement('i', { class: 'fas fa-user-edit' }),
        createElement('span', {}, '私の情報')
      ]));
    }
    
    // 메이트 메뉴
    if (isMate) {
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: `mate_like.html?mate_id=${user.id}` }, [
        createElement('i', { class: 'fas fa-id-card' }),
        createElement('span', {}, '내 프로필')
      ]));
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'mate_dashboard.html' }, [
        createElement('i', { class: 'fas fa-chart-line' }),
        createElement('span', {}, '메이트 대시보드')
      ]));
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'mate_edit.html' }, [
        createElement('i', { class: 'fas fa-edit' }),
        createElement('span', {}, '프로필 편집')
      ]));
    }
    
    // 관리자 메뉴
    if (isAdmin) {
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'admin_plus.html' }, [
        createElement('i', { class: 'fas fa-tachometer-alt' }),
        createElement('span', {}, '관리자')
      ]));
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'admin_mates.html' }, [
        createElement('i', { class: 'fas fa-users' }),
        createElement('span', {}, '메이트 관리')
      ]));
      userMenu.appendChild(createElement('a', { class: 'dropdown-item', href: 'qna.html' }, [
        createElement('i', { class: 'fas fa-question-circle' }),
        createElement('span', {}, 'Q&A 관리')
      ]));
    }
    
    userDropdown.appendChild(userToggle);
    userDropdown.appendChild(userMenu);
    navRight.appendChild(userDropdown);
    
    // 로그아웃 버튼
    navRight.appendChild(createElement('button', { 
      class: 'logout-btn',
      onclick: async () => { 
        await supabase.auth.signOut(); 
        location.reload(); 
      }
    }, 'ログアウト'));
  }
  
  // 모바일 메뉴 버튼
  const mobileMenuBtn = createElement('button', { 
    class: 'mobile-menu-btn',
    onclick: toggleMobileMenu
  }, [
    createElement('div', { class: 'hamburger' }, [
      createElement('span'),
      createElement('span'),
      createElement('span')
    ])
  ]);
  navRight.appendChild(mobileMenuBtn);
  
  container.appendChild(navRight);
  root.appendChild(container);
  
  // 모바일 메뉴 생성
  createMobileMenu(root, commonMenus, user, isAdmin, isMate);
  
  // 이벤트 리스너 설정
  setupEventListeners();
}

// 모바일 메뉴 생성
function createMobileMenu(root, commonMenus, user, isAdmin, isMate) {
  const mobileMenu = createElement('div', { class: 'mobile-menu' });
  const mobileMenuContent = createElement('div', { class: 'mobile-menu-content' });
  
  // 모바일 메뉴 헤더
  const mobileMenuHeader = createElement('div', { class: 'mobile-menu-header' }, [
    createElement('div', { class: 'nav-brand' }, [
      createElement('img', { src: 'puzzmi_original.png', alt: 'PUZZMI 로고' }),
      createElement('span', {}, 'PUZZMI')
    ])
  ]);
  mobileMenuContent.appendChild(mobileMenuHeader);
  
  // 모바일 메뉴 네비게이션
  const mobileMenuNav = createElement('div', { class: 'mobile-menu-nav' });
  
  // 공통 메뉴 섹션
  const commonSection = createElement('div', { class: 'mobile-menu-section' }, [
    createElement('div', { class: 'mobile-menu-section-title' }, '🏠 メインメニュー')
  ]);
  
  commonMenus.forEach(menu => {
    commonSection.appendChild(createElement('a', { 
      class: 'mobile-menu-link', 
      href: menu.href,
      onclick: closeMobileMenu
    }, [
      createElement('i', { class: 'fas fa-circle' }),
      createElement('span', {}, menu.text)
    ]));
  });
  mobileMenuNav.appendChild(commonSection);
  
  // 사용자별 메뉴
  if (user) {
    const userSection = createElement('div', { class: 'mobile-menu-section' }, [
      createElement('div', { class: 'mobile-menu-section-title' }, '👤 マイページ')
    ]);
    
    if (!isAdmin && !isMate) {
      // 일반 사용자 메뉴
      userSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'my_favorites.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-heart' }),
        createElement('span', {}, 'ネチムリスト')
      ]));
      
      userSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'my_bookings.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-calendar-check' }),
        createElement('span', {}, '私の予約リスト')
      ]));
      
      userSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'my_profile.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-user-edit' }),
        createElement('span', {}, '私の情報')
      ]));
      
      userSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'notification.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-bell' }),
        createElement('span', {}, '알림함')
      ]));
    }
    
    if (isMate) {
      const mateSection = createElement('div', { class: 'mobile-menu-section' }, [
        createElement('div', { class: 'mobile-menu-section-title' }, '👨‍💼 메이트 메뉴')
      ]);
      
      mateSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: `mate_like.html?mate_id=${user.id}`,
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-id-card' }),
        createElement('span', {}, '내 프로필')
      ]));
      
      mateSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'mate_dashboard.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-chart-line' }),
        createElement('span', {}, '메이트 대시보드')
      ]));
      
      mateSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'mate_edit.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-edit' }),
        createElement('span', {}, '프로필 편집')
      ]));
      
      mobileMenuNav.appendChild(mateSection);
    }
    
    if (isAdmin) {
      const adminSection = createElement('div', { class: 'mobile-menu-section' }, [
        createElement('div', { class: 'mobile-menu-section-title' }, '⚙️ 관리자 메뉴')
      ]);
      
      adminSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'admin_plus.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-tachometer-alt' }),
        createElement('span', {}, '관리자')
      ]));
      
      adminSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'admin_mates.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-users' }),
        createElement('span', {}, '메이트 관리')
      ]));
      
      adminSection.appendChild(createElement('a', { 
        class: 'mobile-menu-link', 
        href: 'qna.html',
        onclick: closeMobileMenu
      }, [
        createElement('i', { class: 'fas fa-question-circle' }),
        createElement('span', {}, 'Q&A 관리')
      ]));
      
      mobileMenuNav.appendChild(adminSection);
    }
    
    mobileMenuNav.appendChild(userSection);
    
    // 로그아웃 섹션
    const logoutSection = createElement('div', { class: 'mobile-menu-section' }, [
      createElement('div', { class: 'mobile-menu-section-title' }, '🚪 계정')
    ]);
    
    logoutSection.appendChild(createElement('button', { 
      class: 'mobile-menu-link logout-btn',
      onclick: async () => { 
        await supabase.auth.signOut(); 
        location.reload(); 
      }
    }, [
      createElement('i', { class: 'fas fa-sign-out-alt' }),
      createElement('span', {}, 'ログアウト')
    ]));
    
    mobileMenuNav.appendChild(logoutSection);
  }
  
  mobileMenuContent.appendChild(mobileMenuNav);
  mobileMenu.appendChild(mobileMenuContent);
  root.appendChild(mobileMenu);
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 드롭다운 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
  
  // ESC 키로 메뉴 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      document.querySelectorAll('.dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
  
  // 스크롤 효과
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.app-nav');
    if (!navbar) return;
    
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > 100) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScrollY = currentScrollY;
  }, { passive: true });
}

// 페이지 로드 시 네비게이션 렌더링
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
});