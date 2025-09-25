// === swipe-fix.js — pause auto-advance while touching/dragging ===
// This file assumes script.js already defined changeSlide/goToSlide/startAutoSlide
// and the markup contains #aboutSwipeContainer and #safetySwipeContainer.
// Load this AFTER script.js (and after swipe-hero.js if used).

(function(){
  const CONTAINERS = ['aboutSwipeContainer','safetySwipeContainer'];
  const STATE = {
    interacting: Object.create(null),
    cooldownUntil: Object.create(null),
  };

  const COOLDOWN_MS = 1500; // ignore auto-advance for 1.5s after a user swipe

  function setInteracting(id, on){
    STATE.interacting[id] = !!on;
    if (!on){
      STATE.cooldownUntil[id] = Date.now() + COOLDOWN_MS;
    }
  }
  function shouldBlockAuto(id){
    if (STATE.interacting[id]) return true;
    if (STATE.cooldownUntil[id] && Date.now() < STATE.cooldownUntil[id]) return true;
    return false;
  }

  // Keep a reference to original globals if present
  const _origChangeSlide = window.changeSlide;
  const _origGoToSlide = window.goToSlide;

  // Wrap changeSlide so timers won't skip/jump while user interacts
  window.changeSlide = function(containerId, direction){
    if (shouldBlockAuto(containerId)) return; // block auto-advance or accidental double-fires
    if (typeof _origChangeSlide === 'function'){
      _origChangeSlide(containerId, direction);
    }
    // Keep dataset in sync (helps robustness)
    try {
      const c = document.getElementById(containerId);
      const act = c?.querySelector('.swipe-slide.active');
      const all = c?.querySelectorAll('.swipe-slide') || [];
      if (c && act) c.dataset.currentSlide = String(Array.from(all).indexOf(act) || 0);
    } catch {}
  };

  // Wrap goToSlide similarly
  window.goToSlide = function(containerId, index){
    if (shouldBlockAuto(containerId)) return;
    if (typeof _origGoToSlide === 'function'){
      _origGoToSlide(containerId, index);
    }
    try {
      const c = document.getElementById(containerId);
      if (c) c.dataset.currentSlide = String(index);
    } catch {}
  };

  // Attach interaction listeners to pause auto
  function attachGuards(){
    CONTAINERS.forEach(id => {
      const c = document.getElementById(id);
      if (!c) return;

      // Touch
      c.addEventListener('touchstart', () => setInteracting(id, true), {passive:true});
      c.addEventListener('touchend', () => setInteracting(id, false));
      c.addEventListener('touchcancel', () => setInteracting(id, false));

      // Mouse
      c.addEventListener('mousedown', () => setInteracting(id, true));
      c.addEventListener('mouseup', () => setInteracting(id, false));
      c.addEventListener('mouseleave', () => setInteracting(id, false));

      // Keyboard arrows also create a short cooldown
      c.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
          setInteracting(id, true);
          setTimeout(() => setInteracting(id, false), COOLDOWN_MS);
        }
      });
    });
  }

  // If startAutoSlide already created timers, we can't cancel them here,
  // but our wrappers will ignore their calls during interaction/cooldown.
  // We still attach guards after DOM is ready.
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attachGuards);
  } else {
    attachGuards();
  }
})();
