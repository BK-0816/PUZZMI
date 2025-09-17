/* PUZZMI navbar – auth-aware & minimal menu */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://eevvgbbokenpjnvtmztk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnZnYmJva2VucGpudnRtenRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjI2OTgsImV4cCI6MjA3MzEzODY5OH0.aLoqYYeDW_0ZEwkr8c8IPFvXnEwQPZah1mQzwiyG2Y4";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false, isMate = false;
  if (user) {
    const a = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    isAdmin = !!a.data;
    const m = await supabase.from('mate_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
    isMate = !!m.data;
  }
  return { user, isAdmin, isMate };
}

export async function renderNavbar(rootId='app-nav') {
  const root = document.getElementById(rootId) || document.body.insertBefore(document.createElement('div'), document.body.firstChild);
  root.id = rootId;
  root.className = 'app-nav';
  const wrap = el('div', { class: 'wrap' });
  root.appendChild(wrap);

  const brand = el('a', { class: 'brand', href: 'index.html' }, [
    el('span', {}, 'PUZZMI')
  ]);
  wrap.appendChild(brand);

  const menu = el('div', { class: 'menu' });
  wrap.appendChild(menu);

  const { user, isAdmin, isMate } = await getRoles();

  // ✅ 비로그인: "로그인"만
  if (!user) {
    const _redir = encodeURIComponent(location.pathname + location.search);
    menu.appendChild(el('a', { href: 'auth_combo.html?redirect=' + _redir }, '로그인'));
    return;
  }

    if (user && !isAdmin && !isMate) {
    // 일반 유저
    menu.appendChild(el('a', { href: 'my_favorites.html' }, '내 찜'));
    menu.appendChild(el('a', { href: 'my_bookings.html' }, '내 예약'));
    menu.appendChild(el('a', { href: 'notification.html' }, '알림함'));
  }

  // ✅ 로그인: 이용고객 → "1:1문의", 관리자 → "Q&A관리"
  if (isAdmin) {
    
    menu.appendChild(el('a', { href: 'admin_plus.html' }, '관리자'));
    menu.appendChild(el('a', { href: 'admin_mates.html' }, '메이트 관리'));
    menu.appendChild(el('a', { href: 'qna.html' }, 'Q&A관리'));
  } else {
    menu.appendChild(el('a', { href: 'qna.html' }, '1:1문의'));
  }
  if (isMate) {
    menu.appendChild(el('a', { href: 'mate_dashboard.html' }, '메이트 대시보드'));
    menu.appendChild(el('a', { href: 'mate_edit.html' }, '프로필 편집'));
    menu.appendChild(el('a', { href: `mate_like.html?mate_id=${user.id}` }, '내 프로필'));

  }

  // 우측 로그인 정보/로그아웃
  const me = el('span', { class: 'pill' }, user.email || user.id);
  menu.appendChild(me);
  menu.appendChild(el('button', { onclick: async () => { await supabase.auth.signOut(); location.reload(); } }, '로그아웃'));
}

document.addEventListener('DOMContentLoaded', () => renderNavbar());
