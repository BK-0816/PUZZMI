// === Swipe controls for hero background (non-destructive patch) ===

// Reuse globals from script.js if available:
(function(){
  const heroSection = document.querySelector('.hero');
  const heroBg = document.querySelector('.hero-bg');
  if (!heroSection || !heroBg) return;

  // Ensure dependencies from the original script exist:
  // - heroBackgrounds: array of image URLs (['bg1.png', ...])
  // - backgroundTexts: array of overlay captions (same length)
  // - currentBgIndex: number index we will update
  // If they don't exist, create safe fallbacks.
  window.heroBackgrounds = Array.isArray(window.heroBackgrounds) && window.heroBackgrounds.length
    ? window.heroBackgrounds
    : ['bg1.png','bg2.png','bg3.png','bg4.png'];

  window.backgroundTexts = Array.isArray(window.backgroundTexts) && window.backgroundTexts.length
    ? window.backgroundTexts
    : ['ソウルの隠れた名所を発見','現地の友達と特別な思い出','本格的な韓国グルメ体験','あなただけのソウル旅行'];

  window.currentBgIndex = typeof window.currentBgIndex === 'number' ? window.currentBgIndex : 0;

  // Helper: apply background/image+text with fade
  function applyHeroByIndex(idx){
    if (!heroBg) return;
    const total = window.heroBackgrounds.length;
    window.currentBgIndex = ((idx % total) + total) % total; // wrap safely

    heroBg.style.opacity = '0';
    window.setTimeout(() => {
      heroBg.style.backgroundImage = `url('${window.heroBackgrounds[window.currentBgIndex]}')`;
      heroBg.setAttribute('data-text', window.backgroundTexts[window.currentBgIndex] || '');
      heroBg.style.opacity = '1';
      updateDots();
    }, 200);
  }

  // Build pagination dots
  let dotsRoot = document.querySelector('.hero-dots');
  if (!dotsRoot){
    dotsRoot = document.createElement('div');
    dotsRoot.className = 'hero-dots';
    for (let i=0; i<window.heroBackgrounds.length; i++){
      const b = document.createElement('span');
      b.className = 'hero-dot';
      // Click support (non-blocking, but nice on desktop)
      b.style.pointerEvents = 'auto';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        applyHeroByIndex(i);
        resetAuto();
      });
      dotsRoot.appendChild(b);
    }
    heroSection.appendChild(dotsRoot);
  }
  function updateDots(){
    const dots = dotsRoot.querySelectorAll('.hero-dot');
    dots.forEach((d,i)=>{
      if (i === window.currentBgIndex) d.classList.add('is-active');
      else d.classList.remove('is-active');
    });
  }
  updateDots();

  // Swipe / Drag logic (touch + mouse)
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let hasMoved = false;
  const THRESHOLD = 48; // pixels to trigger a swipe

  const onStart = (clientX) => {
    isDragging = true;
    hasMoved = false;
    startX = clientX;
    currentX = clientX;
    heroSection.classList.add('is-dragging');
  };

  const onMove = (clientX) => {
    if (!isDragging) return;
    currentX = clientX;
    if (Math.abs(currentX - startX) > 4) hasMoved = true;
  };

  const onEnd = () => {
    if (!isDragging) return;
    const delta = currentX - startX;
    heroSection.classList.remove('is-dragging');
    isDragging = false;

    if (Math.abs(delta) >= THRESHOLD){
      if (delta < 0){
        // swipe left -> next
        applyHeroByIndex(window.currentBgIndex + 1);
      } else {
        // swipe right -> prev
        applyHeroByIndex(window.currentBgIndex - 1);
      }
      resetAuto();
    }
  };

  // Touch events
  heroSection.addEventListener('touchstart', (e)=>{
    if (!e.touches || !e.touches.length) return;
    onStart(e.touches[0].clientX);
  }, {passive:true});
  heroSection.addEventListener('touchmove', (e)=>{
    if (!e.touches || !e.touches.length) return;
    onMove(e.touches[0].clientX);
  }, {passive:true});
  heroSection.addEventListener('touchend', onEnd);
  heroSection.addEventListener('touchcancel', onEnd);

  // Mouse events (desktop drag)
  heroSection.addEventListener('mousedown', (e)=> onStart(e.clientX));
  window.addEventListener('mousemove', (e)=> onMove(e.clientX));
  window.addEventListener('mouseup', onEnd);

  // Keyboard accessibility (optional)
  heroSection.setAttribute('tabindex','0');
  heroSection.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft'){ applyHeroByIndex(window.currentBgIndex - 1); resetAuto(); }
    if (e.key === 'ArrowRight'){ applyHeroByIndex(window.currentBgIndex + 1); resetAuto(); }
  });

  // Auto-advance reset (we can't cancel original setInterval without its id,
  // but we can add our own lightweight idle timer to avoid double-jumps right after manual swipes)
  let cooldown = null;
  function resetAuto(){
    if (cooldown) clearTimeout(cooldown);
    cooldown = setTimeout(()=>{ cooldown = null; }, 1200);
  }

  // Expose for debugging if needed
  window._heroSwipeApply = applyHeroByIndex;

  // Ensure UI matches current slide on load
  applyHeroByIndex(window.currentBgIndex);
})();
