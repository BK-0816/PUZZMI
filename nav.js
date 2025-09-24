/* PUZZMI navbar – redesigned with responsive dropdowns */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export constants for use in other modules
export { SUPABASE_ANON_KEY, SUPABASE_URL };

function el(tag, attrs={}, children=[]) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'href') e.setAttribute('href', v);
    else if (k === 'onclick') e.addEventListener('click', v);
    else e.setAttribute(k, v);
  });
  (Array.isArray(children)?children:[children]).filter(Boolean).forEach(c => {
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}

async function getRoles() {
  let user = null;
  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) {
      // Handle any authentication error by clearing auth state
      console.log('Auth error detected, clearing auth state:', error.message);
      await supabase.auth.signOut();
      return { user: null, isAdmin: false, isMate: false };
    }
    user = authUser;
  } catch (error) {
    console.error('Auth error:', error);
    // Clear invalid session and return null user
    await supabase.auth.signOut();
    return { user: null, isAdmin: false, isMate: false };
  }
  
  let isAdmin = false, isMate = false;
  if (user) {
    const a = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    isAdmin = !!a.data;
    const m = await supabase.from('mate_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
    isMate = !!m.data;
  }
  return { user, isAdmin, isMate };
}

// 알림 개수 가져오기
async function getNotificationCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count || 0;
}

// 메이트용 알림 개수 가져오기 (신규 예약, 취소)
async function getMateNotificationCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', ['booking_requested', 'booking_canceled_by_customer'])
    .is('read_at', null);
  return count || 0;
}

// 드롭다운 토글 함수
function toggleDropdown(dropdownEl) {
  const isActive = dropdownEl.classList.contains('active');
  
  // 모든 드롭다운 닫기
  document.querySelectorAll('.dropdown.active').forEach(dd => {
    dd.classList.remove('active');
  });
  
  // 클릭한 드롭다운만 토글
  if (!isActive) {
    dropdownEl.classList.add('active');
  }
}

// 외부 클릭 시 드롭다운 닫기
function setupDropdownClose() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.active').forEach(dd => {
        dd.classList.remove('active');
      });
    }
  });
}

// 모바일 메뉴 토글 함수
function toggleMobileMenu() {
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  
  if (mobileMenu && mobileMenuBtn) {
    const isActive = mobileMenu.classList.contains('active');
    
    if (isActive) {
      mobileMenu.classList.remove('active');
      mobileMenuBtn.classList.remove('active');
    } else {
      mobileMenu.classList.add('active');
      mobileMenuBtn.classList.add('active');
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
  }
}
export async function renderNavbar(rootId='app-nav') {
  const root = document.getElementById(rootId) || document.body.insertBefore(document.createElement('div'), document.body.firstChild);
  root.id = rootId;
  root.className = 'app-nav';
  
  const wrap = el('div', { class: 'nav-container' });
  root.appendChild(wrap);

  // 브랜드 로고
  const brand = el('a', { class: 'nav-brand', href: 'index.html' }, [
    el('img', { src: 'puzzmi_original.png', alt: 'PUZZMI 로고' }),
    el('span', {}, 'PUZZMI')
  ]);
  wrap.appendChild(brand);

  // 왼쪽 메뉴 (공통 네비게이션)
  const navLeft = el('div', { class: 'nav-left' });

  // 공통 메뉴 항목들
  const commonMenus = [
    { href: 'index.html#home', text: 'ホーム' },
    { href: 'index.html#about', text: 'サービス紹介' },
    { href: 'index.html#how-it-works', text: 'ご利用流れ' },
    { href: 'index.html#friends', text: 'メイト予約' },
    { href: 'index.html#reviews', text: '口コミ' },
    { href: 'index.html#contact', text: 'FAQ' }
  ];

  commonMenus.forEach(menu => {
    navLeft.appendChild(el('a', { class: 'nav-link', href: menu.href }, menu.text));
  });
  
  wrap.appendChild(navLeft);

  // 오른쪽 메뉴
  const navRight = el('div', { class: 'nav-right' });

  const { user, isAdmin, isMate } = await getRoles();

  // 비로그인 상태
  if (!user) {
    const _redir = encodeURIComponent(location.pathname + location.search);
    navRight.appendChild(el('a', { 
      class: 'nav-link', 
      href: 'auth_combo.html?redirect=' + _redir 
    }, 'ログイン'));
    
    // 모바일 메뉴 버튼 추가
    const mobileMenuBtn = el('button', { 
      class: 'mobile-menu-btn',
      onclick: toggleMobileMenu
    }, [
      el('div', { class: 'hamburger' }, [
        el('span'),
        el('span'),
        el('span')
      ])
    ]);
    navRight.appendChild(mobileMenuBtn);
    
    wrap.appendChild(navRight);
    
    // 모바일 메뉴 생성
    createMobileMenu(root, commonMenus, user, isAdmin, isMate);
    return;
  }

  // 로그인 상태 - 알림 아이콘
  if (user && !isAdmin && !isMate) {
    // 일반 고객 - 알림 아이콘
    const notifCount = await getNotificationCount(user.id);
    const notifIcon = el('a', { 
      class: 'notification-icon', 
      href: 'notification.html',
      title: '알림함'
    }, [
      el('i', { class: 'fas fa-bell' }),
      notifCount > 0 ? el('span', { class: 'notification-badge' }, String(notifCount)) : null
    ].filter(Boolean));
    navRight.appendChild(notifIcon);
  }

  if (isMate) {
    // 메이트 - 메이트 전용 알림 아이콘
    const mateNotifCount = await getMateNotificationCount(user.id);
    const mateNotifIcon = el('a', { 
      class: 'notification-icon', 
      href: 'notification.html',
      title: '메이트 알림함'
    }, [
      el('i', { class: 'fas fa-calendar-alt' }),
      mateNotifCount > 0 ? el('span', { class: 'notification-badge' }, String(mateNotifCount)) : null
    ].filter(Boolean));
    navRight.appendChild(mateNotifIcon);
  }

  // 사용자 드롭다운
  if (user && !isAdmin && !isMate) {
    // 일반 고객 드롭다운
    const userDropdown = el('div', { class: 'dropdown' });
    
    const userBtn = el('button', { 
      class: 'dropdown-toggle',
      onclick: () => toggleDropdown(userDropdown)
    }, [
      el('i', { class: 'fas fa-user' }),
      el('span', {}, user.email?.split('@')[0] || '사용자'),
      el('i', { class: 'fas fa-chevron-down dropdown-icon' })
    ]);
    
    const userMenu = el('div', { class: 'dropdown-menu' }, [
      el('a', { class: 'dropdown-item', href: 'my_favorites.html' }, [
        el('i', { class: 'fas fa-heart' }),
        el('span', {}, 'ネチムリスト')
      ]),
      el('a', { class: 'dropdown-item', href: 'my_bookings.html' }, [
        el('i', { class: 'fas fa-calendar-check' }),
        el('span', {}, '私の予約リスト')
      ]),
      el('a', { class: 'dropdown-item', href: 'my_profile.html' }, [
        el('i', { class: 'fas fa-user-edit' }),
        el('span', {}, '私の情報')
      ])
    ]);
    
    userDropdown.appendChild(userBtn);
    userDropdown.appendChild(userMenu);
    navRight.appendChild(userDropdown);
  }

  if (isMate) {
    // 메이트 드롭다운
    const mateDropdown = el('div', { class: 'dropdown' });
    
    const mateBtn = el('button', { 
      class: 'dropdown-toggle',
      onclick: () => toggleDropdown(mateDropdown)
    }, [
      el('i', { class: 'fas fa-user-tie' }),
      el('span', {}, '메이트'),
      el('i', { class: 'fas fa-chevron-down dropdown-icon' })
    ]);
    
    const mateMenu = el('div', { class: 'dropdown-menu' }, [
      el('a', { class: 'dropdown-item', href: `mate_like.html?mate_id=${user.id}` }, [
        el('i', { class: 'fas fa-id-card' }),
        el('span', {}, '내 프로필')
      ]),
      el('a', { class: 'dropdown-item', href: 'mate_dashboard.html' }, [
        el('i', { class: 'fas fa-chart-line' }),
        el('span', {}, '메이트 대시보드')
      ])
    ]);
    
    mateDropdown.appendChild(mateBtn);
    mateDropdown.appendChild(mateMenu);
    navRight.appendChild(mateDropdown);
  }

  if (isAdmin) {
    // 관리자 드롭다운
    const adminDropdown = el('div', { class: 'dropdown' });
    
    const adminBtn = el('button', { 
      class: 'dropdown-toggle',
      onclick: () => toggleDropdown(adminDropdown)
    }, [
      el('i', { class: 'fas fa-cog' }),
      el('span', {}, '관리자'),
      el('i', { class: 'fas fa-chevron-down dropdown-icon' })
    ]);
    
    const adminMenu = el('div', { class: 'dropdown-menu' }, [
      el('a', { class: 'dropdown-item', href: 'admin_plus.html' }, [
        el('i', { class: 'fas fa-tachometer-alt' }),
        el('span', {}, '관리자')
      ]),
      el('a', { class: 'dropdown-item', href: 'admin_mates.html' }, [
        el('i', { class: 'fas fa-users' }),
        el('span', {}, '메이트 관리')
      ]),
      el('a', { class: 'dropdown-item', href: 'admin_identity_verification.html' }, [
        el('i', { class: 'fas fa-id-card' }),
        el('span', {}, '신원확인 관리')
      ]),
      el('a', { class: 'dropdown-item', href: 'qna.html' }, [
        el('i', { class: 'fas fa-question-circle' }),
        el('span', {}, 'Q&A 관리')
      ])
    ]);
    
    adminDropdown.appendChild(adminBtn);
    adminDropdown.appendChild(adminMenu);
    navRight.appendChild(adminDropdown);
  }

  // 로그아웃 버튼
  navRight.appendChild(el('button', { 
    class: 'logout-btn',
    onclick: async () => { 
      await supabase.auth.signOut(); 
      location.reload(); 
    }
  }, 'ログアウト'));

  // 모바일 메뉴 버튼 추가
  const mobileMenuBtn = el('button', { 
    class: 'mobile-menu-btn',
    onclick: toggleMobileMenu
  }, [
    el('div', { class: 'hamburger' }, [
      el('span'),
      el('span'),
      el('span')
    ])
  ]);
  navRight.appendChild(mobileMenuBtn);
  
  wrap.appendChild(navRight);
  
  // 모바일 메뉴 생성
  createMobileMenu(root, commonMenus, user, isAdmin, isMate, navRight);
  // 드롭다운 외부 클릭 처리 설정
  setupDropdownClose();
}

// 모바일 메뉴 생성 함수
function createMobileMenu(root, commonMenus, user, isAdmin, isMate, navRight) {
  const mobileMenu = el('div', { class: 'mobile-menu' });
  
  const mobileMenuContent = el('div', { class: 'mobile-menu-content' });
  
  // 모바일 메뉴 헤더
  const mobileMenuHeader = el('div', { class: 'mobile-menu-header' }, [
    el('div', { class: 'nav-brand' }, [
      el('img', { src: 'puzzmi_original.png', alt: 'PUZZMI 로고' }),
      el('span', {}, 'PUZZMI')
    ]),
    el('button', { 
      class: 'mobile-menu-close',
      onclick: closeMobileMenu
    }, '×')
  ]);
  
  mobileMenuContent.appendChild(mobileMenuHeader);
  
  // 모바일 메뉴 네비게이션
  const mobileMenuNav = el('div', { class: 'mobile-menu-nav' });
  
  // 공통 메뉴
  const commonSection = el('div', { class: 'mobile-menu-section' }, [
    el('div', { class: 'mobile-menu-section-title' }, 'メニュー')
  ]);
  
  commonMenus.forEach(menu => {
    commonSection.appendChild(el('a', { 
      class: 'mobile-menu-link', 
      href: menu.href,
      onclick: closeMobileMenu
    }, [
      el('i', { class: 'fas fa-circle' }),
      el('span', {}, menu.text)
    ]));
  });
  
  mobileMenuNav.appendChild(commonSection);
  
  // 사용자별 메뉴
  if (user) {
    const userSection = el('div', { class: 'mobile-menu-section' }, [
      el('div', { class: 'mobile-menu-section-title' }, 'マイページ')
    ]);
    
    if (!isAdmin && !isMate) {
      // 일반 사용자 메뉴
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'my_favorites.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-heart' }),
        el('span', {}, 'ネチムリスト')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'my_bookings.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-calendar-check' }),
        el('span', {}, '私の予約リスト')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'my_profile.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-user-edit' }),
        el('span', {}, '私の情報')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'notification.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-bell' }),
        el('span', {}, '알림함')
      ]));
    }
    
    if (isMate) {
      // 메이트 메뉴
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: `mate_like.html?mate_id=${user.id}`,
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-id-card' }),
        el('span', {}, '내 프로필')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'mate_dashboard.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-chart-line' }),
        el('span', {}, '메이트 대시보드')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'notification.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-calendar-alt' }),
        el('span', {}, '메이트 알림함')
      ]));
    }
    
    if (isAdmin) {
      // 관리자 메뉴
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'admin_plus.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-tachometer-alt' }),
        el('span', {}, '관리자')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'admin_mates.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-users' }),
        el('span', {}, '메이트 관리')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'admin_identity_verification.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-id-card' }),
        el('span', {}, '신원확인 관리')
      ]));
      
      userSection.appendChild(el('a', { 
        class: 'mobile-menu-link', 
        href: 'qna.html',
        onclick: closeMobileMenu
      }, [
        el('i', { class: 'fas fa-question-circle' }),
        el('span', {}, 'Q&A 관리')
      ]));
    }
    
    mobileMenuNav.appendChild(userSection);
    
    // 로그아웃 버튼
    const logoutSection = el('div', { class: 'mobile-menu-section' });
    logoutSection.appendChild(el('button', { 
      class: 'mobile-menu-link logout-btn',
      onclick: async () => { 
        await supabase.auth.signOut(); 
        location.reload(); 
      }
    }, [
      el('i', { class: 'fas fa-sign-out-alt' }),
      el('span', {}, 'ログアウト')
    ]));
    
    mobileMenuNav.appendChild(logoutSection);
  }
  
  mobileMenuContent.appendChild(mobileMenuNav);
  mobileMenu.appendChild(mobileMenuContent);
  
  // 오버레이 클릭 시 메뉴 닫기
  mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) {
      closeMobileMenu();
    }
  });
  
  root.appendChild(mobileMenu);
}

// 스크롤 효과 추가
function initScrollEffects() {
  const navbar = document.querySelector('.app-nav');
  if (!navbar) return;
  
  let lastScrollY = window.scrollY;
  
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > 100) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScrollY = currentScrollY;
  }, { passive: true });
}
document.addEventListener('DOMContentLoaded', () => renderNavbar());
document.addEventListener('DOMContentLoaded', initScrollEffects);

// ESC 키로 모바일 메뉴 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileMenu();
    // 드롭다운도 닫기
    document.querySelectorAll('.dropdown.active').forEach(dd => {
      dd.classList.remove('active');
    });
  }
});