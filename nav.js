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

export async function renderNavbar(rootId='app-nav') {
  const root = document.getElementById(rootId) || document.body.insertBefore(document.createElement('div'), document.body.firstChild);
  root.id = rootId;
  root.className = 'app-nav';

  const wrap = el('div', { class: 'wrap' });
  root.appendChild(wrap);

  const mobileToggle = el('button', {
    class: 'mobile-toggle',
    type: 'button',
    'aria-label': '메뉴 열기',
    'aria-expanded': 'false'
  });
  ['bar', 'bar', 'bar'].forEach(() => mobileToggle.appendChild(el('span', { class: 'bar' })));
  wrap.appendChild(mobileToggle);

  // 왼쪽 메뉴 (공통 네비게이션)
  const navLeft = el('div', { class: 'nav-left' });
  wrap.appendChild(navLeft);

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

  // 오른쪽 메뉴
  const navRight = el('div', { class: 'nav-right' });
  wrap.appendChild(navRight);

  const overlay = el('div', { class: 'nav-overlay' });
  root.appendChild(overlay);

  const setMobileMenuState = (open) => {
    root.classList.toggle('nav-open', open);
    mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('nav-menu-open', open);
  };

  const toggleMobileMenu = () => {
    setMobileMenuState(!root.classList.contains('nav-open'));
  };

  mobileToggle.addEventListener('click', toggleMobileMenu);
  overlay.addEventListener('click', () => setMobileMenuState(false));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      setMobileMenuState(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMobileMenuState(false);
    }
  });
  root.addEventListener('click', (event) => {
    if (window.innerWidth > 900) return;
    if (event.target.closest('.nav-link, .dropdown-item, .logout-btn, .notification-icon')) {
      setMobileMenuState(false);
    }
  });

  const { user, isAdmin, isMate } = await getRoles();

  // 비로그인 상태
  if (!user) {
    const _redir = encodeURIComponent(location.pathname + location.search);
    navRight.appendChild(el('a', { 
      class: 'nav-link', 
      href: 'auth_combo.html?redirect=' + _redir 
    }, 'ログイン'));
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
      class: 'dropdown-btn',
      onclick: () => toggleDropdown(userDropdown)
    }, [
      el('i', { class: 'fas fa-user' }),
      el('span', {}, user.email?.split('@')[0] || '사용자'),
      el('i', { class: 'fas fa-chevron-down', style: 'font-size: 0.8rem; margin-left: 4px;' })
    ]);
    
    const userMenu = el('div', { class: 'dropdown-menu' }, [
      el('a', { class: 'dropdown-item', href: 'my_favorites.html' }, [
        el('i', { class: 'fas fa-heart', style: 'margin-right: 8px; color: #f093fb;' }),
        el('span', {}, 'ネチムリスト')
      ]),
      el('a', { class: 'dropdown-item', href: 'my_bookings.html' }, [
        el('i', { class: 'fas fa-calendar-check', style: 'margin-right: 8px; color: #667eea;' }),
        el('span', {}, '私の予約リスト')
      ]),
      el('a', { class: 'dropdown-item', href: 'my_profile.html' }, [
        el('i', { class: 'fas fa-user-edit', style: 'margin-right: 8px; color: #764ba2;' }),
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
      class: 'dropdown-btn',
      onclick: () => toggleDropdown(mateDropdown)
    }, [
      el('i', { class: 'fas fa-user-tie' }),
      el('span', {}, '메이트'),
      el('i', { class: 'fas fa-chevron-down', style: 'font-size: 0.8rem; margin-left: 4px;' })
    ]);
    
    const mateMenu = el('div', { class: 'dropdown-menu' }, [
      el('a', { class: 'dropdown-item', href: `mate_like.html?mate_id=${user.id}` }, [
        el('i', { class: 'fas fa-id-card', style: 'margin-right: 8px; color: #667eea;' }),
        el('span', {}, '내 프로필')
      ]),
      el('a', { class: 'dropdown-item', href: 'mate_dashboard.html' }, [
        el('i', { class: 'fas fa-chart-line', style: 'margin-right: 8px; color: #764ba2;' }),
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
      class: 'dropdown-btn',
      onclick: () => toggleDropdown(adminDropdown)
    }, [
      el('i', { class: 'fas fa-cog' }),
      el('span', {}, '관리자'),
      el('i', { class: 'fas fa-chevron-down', style: 'font-size: 0.8rem; margin-left: 4px;' })
    ]);
    
    const adminMenu = el('div', { class: 'dropdown-menu' }, [
      el('a', { class: 'dropdown-item', href: 'admin_plus.html' }, [
        el('i', { class: 'fas fa-tachometer-alt', style: 'margin-right: 8px; color: #667eea;' }),
        el('span', {}, '관리자')
      ]),
      el('a', { class: 'dropdown-item', href: 'admin_mates.html' }, [
        el('i', { class: 'fas fa-users', style: 'margin-right: 8px; color: #764ba2;' }),
        el('span', {}, '메이트 관리')
      ]),
      el('a', { class: 'dropdown-item', href: 'admin_identity_verification.html' }, [
        el('i', { class: 'fas fa-id-card', style: 'margin-right: 8px; color: #f093fb;' }),
        el('span', {}, '신원확인 관리')
      ]),
      el('a', { class: 'dropdown-item', href: 'qna.html' }, [
        el('i', { class: 'fas fa-question-circle', style: 'margin-right: 8px; color: #f093fb;' }),
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

  // 드롭다운 외부 클릭 처리 설정
  setupDropdownClose();
}

document.addEventListener('DOMContentLoaded', () => renderNavbar());