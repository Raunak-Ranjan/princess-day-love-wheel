/* Minimal smooth love wheel — FIXED placement to avoid overlap
   - dynamic safe radius based on bubble size
   - drag / wheel / keyboard
   - center shows current message
   - Send button copies message & sparkle
   - Edit 'messages' to personalize
*/

const messages = [
  "You are my favorite hello and my sweetest forever.",
  "A princess today, my queen for a lifetime.",
  "Your smile makes my heart do little dances.",
  "Tiny kisses, big love — always yours.",
  "You wear the crown of my heart effortlessly.",
  "Every day with you feels like the best chapter.",
  "I love the way you make ordinary things magical.",
  "Your laugh is my favorite melody.",
  "To the loveliest soul — you are my everything.",
  "Smooch you now, adore you forever."
];

const wheel = document.getElementById('wheel');
const centerBadge = document.getElementById('centerBadge');
const note = document.getElementById('note');
const spinBtn = document.getElementById('spin');
const sendBtn = document.getElementById('send');

let angle = 0;
const total = messages.length;
const step = 360 / total;
let dragging = false, startX = 0, startAngle = 0;
let items = [];

/* Build items and measure bubble size to compute safe radius */
function build(){
  wheel.innerHTML = '';
  items = [];

  // add items (in DOM) to measure
  messages.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.dataset.base = i * step;
    el.dataset.index = i;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `<span>${m}</span>`;
    el.appendChild(bubble);

    // place in center temporarily for correct sizing
    el.style.left = '50%';
    el.style.top = '50%';
    wheel.appendChild(el);
    items.push({ el, base: i * step, bubble });
  });

  // next tick let browser render, then compute radius and position
  // (use requestAnimationFrame to ensure sizes are read after paint)
  requestAnimationFrame(() => {
    place(true);
    updateFront(); // <-- FIX #1: Was 'renderCenter()', which is not defined
  });
}

/* Compute a safe radius based on largest bubble dimensions */
function computeSafeRadius(){
  const W = wheel.clientWidth;
  const H = wheel.clientHeight;
  const cx = W / 2;
  const cy = H / 2;

  // measure max bubble half-size
  let maxW = 0, maxH = 0;
  items.forEach(({bubble}) => {
    const r = bubble.getBoundingClientRect();
    maxW = Math.max(maxW, r.width);
    maxH = Math.max(maxH, r.height);
  });

  // ensure items don't overlap center or edges
  // minimal spacing margin
  const margin = 12;
  // pick radius so bubble centers lie on circumference with enough space
  const maxBubbleRadius = Math.max(maxW, maxH) / 2;
  // available radius is distance from center to inner edge minus bubble radius & margin
  const avail = Math.min(cx, cy) - maxBubbleRadius - margin;
  // keep at least a sensible minimum
  const r = Math.max(avail, 90); // 90px fallback if very small
  return r;
}

/* place items around computed radius and counter-rotate bubbles */
function place(skipFront = false){
  const W = wheel.offsetWidth;
  const H = wheel.offsetHeight;
  const cx = W / 2;
  const cy = H / 2;

  const r = computeSafeRadius();

  items.forEach(({el, base}, i) => {
    const angDeg = base + angle;
    const theta = (angDeg - 90) * Math.PI / 180;

    // compute position on circle
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // counter-rotate so bubble text is upright
    const counter = -angDeg;
    el.style.transform = `translate(-50%,-50%) rotate(${counter}deg)`;
    const bubble = el.querySelector('.bubble');
     if (bubble) bubble.style.transform = `rotate(${-counter}deg)`;
  });

  if (!skipFront) updateFront();
}

/* compute which index is front (closest to top) and style stacking */
function updateFront(){
  let front = Math.round(angle / step) * -1;
  front = ((front % total) + total) % total;

  items.forEach(({el}, i) => {
    el.removeAttribute('data-front');
    const d = Math.min(Math.abs(i - front), total - Math.abs(i - front));
    el.style.zIndex = String(200 - d * 6);
    if (i === front) {
      el.setAttribute('data-front', 'true');
      // ensure front bubble z is highest
      el.style.zIndex = 999;
    }
  });

  centerBadge.textContent = messages[front];
  note.textContent = '';
}

/* snap animation to nearest item */
function snap(duration = 360){
  const target = Math.round(angle / step) * step;
  const start = angle;
  const delta = target - start;
  const t0 = performance.now();
  function frame(t){
    const p = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    angle = start + delta * eased;
    place();
    if (p < 1) requestAnimationFrame(frame);
    else { angle = target; place(); }
  }
  requestAnimationFrame(frame);
}

/* interactions */
wheel.addEventListener('pointerdown', (e) => {
  dragging = true; startX = e.clientX; startAngle = angle;
  wheel.setPointerCapture(e.pointerId);
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - startX;
  angle = startAngle + dx * 0.55;
  place();
});
window.addEventListener('pointerup', () => {
  if (!dragging) return;
  dragging = false;
  snap(300);
});

wheel.addEventListener('wheel', (e) => {
  e.preventDefault();
  const d = Math.sign(e.deltaY || e.wheelDelta || -e.deltaX);
  angle += d * step * 0.6;
  snap(260);
}, { passive: false });

wheel.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { angle += step; snap(); }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { angle -= step; snap(); }
});

/* spin button */
spinBtn.addEventListener('click', () => {
  const spins = 6 + Math.floor(Math.random() * 8);
  const extra = Math.random() * step;
  const start = angle;
  const target = angle - spins * step - extra;
  const duration = 1000 + Math.random() * 800;
  const t0 = performance.now();
  function frame(t){
    const p = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 4);
    angle = start + (target - start) * eased;
    place();
    if (p < 1) requestAnimationFrame(frame);
    else { angle = target; place(); }
  }
  requestAnimationFrame(frame);
});

/* send button: copy + sparkle */
sendBtn.addEventListener('click', async () => {
  const frontElem = wheel.querySelector('.item[data-front="true"] .bubble span');
  const text = frontElem ? frontElem.textContent : messages[0];
  try {
    await navigator.clipboard.writeText(text);
    showSparkle();
    note.textContent = 'Smooch copied to clipboard 💋';
  } catch {
    note.textContent = 'Copy failed — select and copy manually';
  }
});

/* sparkle animation */
function showSparkle(){
  const s = document.createElement('div');
  s.textContent = '💋';
  s.style.position = 'absolute';
  s.style.left = '50%';
  s.style.top = '50%';
  s.style.transform = 'translate(-50%,-50%)';
  s.style.fontSize = '28px';
  s.style.opacity = '0';
  s.style.pointerEvents = 'none';
  wheel.appendChild(s);
  s.animate([{opacity:1, transform:'translate(-50%,-60%) scale(1.1)'},{opacity:0, transform:'translate(-50%,-120%) scale(1.6)'}], {duration:700, easing:'cubic-bezier(.2,.8,.2,1)'});
  setTimeout(()=> s.remove(), 800);
}

/* init */
build();
// place(); // <-- FIX #2: Removed this redundant call
window.addEventListener('resize', () => { build(); });
