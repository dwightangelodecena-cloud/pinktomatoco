import { useLayoutEffect } from 'react';

// A highlight that slides to the active item in a list (the sidebar, the filter pills).
// The edge in the direction of travel moves first and the other edge catches up, so the
// highlight stretches as it goes and settles on the new item.
const LEAD = '.3s cubic-bezier(.4, 0, .2, 1)';
const TRAIL = '.52s cubic-bezier(.65, 0, .35, 1) .04s';
// Where each highlight last sat, so a list that is drawn again (a new tab) still slides from there.
const last = {};

export function useSlidePill(ref, selector, deps, memory) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return undefined;
    let pill = box.querySelector(':scope > .slide-pill');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'slide-pill';
      pill.setAttribute('aria-hidden', 'true');
      box.prepend(pill);
    }
    box.classList.add('has-slide-pill');
    if (memory && last[memory] && !pill.dataset.top) {
      // A fresh highlight starts where the previous one was, then slides to the new item.
      Object.keys(last[memory].edges).forEach((k) => { pill.style[k] = `${last[memory].edges[k]}px`; });
      pill.style.transition = 'none';
      pill.style.opacity = '1';
      pill.dataset.top = String(last[memory].top);
      pill.dataset.left = String(last[memory].left);
      pill.getBoundingClientRect();
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const place = (animate) => {
      const target = box.querySelector(selector);
      if (!target) {
        pill.style.opacity = '0';
        return;
      }
      const b = box.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const top = r.top - b.top + box.scrollTop - box.clientTop;
      const left = r.left - b.left + box.scrollLeft - box.clientLeft;
      const edges = { top, left, bottom: box.scrollHeight - top - r.height, right: box.scrollWidth - left - r.width };
      const before = pill.dataset.top ? { top: Number(pill.dataset.top), left: Number(pill.dataset.left) } : null;

      if (!animate || still || !before || pill.style.opacity === '0') {
        pill.style.transition = 'none';
      } else {
        // Moving down: the bottom edge leads. Moving right: the right edge leads. And the reverse.
        const down = top > before.top;
        const right = left > before.left;
        pill.style.transition = [
          `top ${down ? TRAIL : LEAD}`, `bottom ${down ? LEAD : TRAIL}`,
          `left ${right ? TRAIL : LEAD}`, `right ${right ? LEAD : TRAIL}`,
          'opacity .2s',
        ].join(', ');
      }
      Object.keys(edges).forEach((k) => { pill.style[k] = `${edges[k]}px`; });
      pill.style.opacity = '1';
      pill.dataset.top = String(top);
      pill.dataset.left = String(left);
      if (memory) last[memory] = { edges, top, left };
    };

    place(true);
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
