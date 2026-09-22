/* ---------------------------------------------------------------
   DRAWINGS
   Every drawing and icon on the site lives here, once, so the shop
   page and the owner page stay in step.

   The script writes itself into the page where the <script> tag
   sits, which must be the first thing inside <body>. That way the
   shapes exist before anything that points at them is read.
---------------------------------------------------------------- */

(function () {
  'use strict';

  const SPRITE = `
<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip-pie"><ellipse cx="100" cy="82" rx="49" ry="14"/></clipPath>
  </defs>

  <!-- brand mark: cat in a bun -->
  <symbol id="i-cat" viewBox="0 0 64 64">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 40c0-9 10-15 23-15s23 6 23 15-10 15-23 15S9 49 9 40z" fill="var(--mark-bun, #f6e7d2)"/>
      <path d="M20 21l-1-10 10 5M44 21l1-10-10 5"/>
      <path d="M19 28c0-7 6-12 13-12s13 5 13 12-6 13-13 13-13-6-13-13z" fill="var(--mark-face, #fbf3e7)"/>
      <path d="M27 27v1M37 27v1" stroke-width="4"/>
      <path d="M30 33h4l-2 2z" fill="currentColor"/>
      <path d="M13 29h5M13 34h5M46 29h5M46 34h5" stroke-width="2"/>
      <path d="M22 47q4-5 8 0M34 47q4-5 8 0" stroke-width="2.4"/>
      <path d="M55 45q9 1 5-9"/>
    </g>
  </symbol>

  <!-- hero: cat sitting beside a layer cake -->
  <symbol id="i-hero" viewBox="0 0 280 220">
    <g fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M240 190q17 5 11-15"/>
      <path d="M180 196q0-48 30-48t30 48z" fill="#f6e7d2"/>
      <path d="M190 196q6-9 13 0M217 196q6-9 13 0" stroke-width="2.6"/>
      <path d="M189 112l-2-17 16 8M231 112l2-17-16 8"/>
      <path d="M183 124c0-14 12-25 27-25s27 11 27 25-12 25-27 25-27-11-27-25z" fill="#fbf3e7"/>
      <path d="M201 121v2M219 121v2" stroke-width="4.8"/>
      <path d="M206 131h8l-4 3.5z" fill="currentColor"/>
      <path d="M175 122h9M175 130h9M236 122h9M236 130h9" stroke-width="2.2"/>
      <path d="M36 104h132v66q0 8-8 8H44q-8 0-8-8z" fill="#f2dcc0"/>
      <path d="M36 130h132M36 154h132" stroke-width="2.4"/>
      <path d="M36 104q11-13 22 0t22 0 22 0 22 0 22 0 22 0" fill="#fbf3e7"/>
      <circle cx="69" cy="92" r="8" fill="#e0a596"/>
      <circle cx="102" cy="87" r="8" fill="#e0a596"/>
      <circle cx="135" cy="92" r="8" fill="#e0a596"/>
      <path d="M30 178h144M102 178v11M80 192q22 6 44 0"/>
      <path d="M14 196h252"/>
    </g>
  </symbol>

  <!-- round layer cake -->
  <symbol id="i-cake" viewBox="0 0 200 150">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M54 56h92v56q0 7-7 7H61q-7 0-7-7z" fill="var(--illo-tint)"/>
      <path d="M54 76h92M54 97h92" stroke-width="2.2"/>
      <path d="M54 56q10-12 20 0t20 0 20 0 20 0 12 0" fill="#fbf3e7"/>
      <circle cx="80" cy="45" r="6.5" fill="#dfa192"/>
      <circle cx="110" cy="41" r="6.5" fill="#dfa192"/>
      <path d="M44 119h112M100 119v14M78 137q22 7 44 0"/>
    </g>
  </symbol>

  <!-- tall cake with a drip -->
  <symbol id="i-drip" viewBox="0 0 200 150">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M58 48h84v64q0 7-7 7H65q-7 0-7-7z" fill="var(--illo-tint)"/>
      <path d="M58 96h84" stroke-width="2.2"/>
      <path d="M58 48h84v14q-7 16-14 0-7 10-14 0-7 20-14 0-7 8-14 0-7 14-14 0-7 10-14 0z" fill="#fbf3e7"/>
      <path d="M70 48q0-11 9-11t9 11zM91 48q0-13 9-13t9 13zM112 48q0-11 9-11t9 11z" fill="#fbf3e7"/>
      <path d="M46 119h108M100 119v14M80 137q20 7 40 0"/>
    </g>
  </symbol>

  <!-- lattice pie -->
  <symbol id="i-pie" viewBox="0 0 200 150">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="100" cy="82" rx="60" ry="20" fill="var(--illo-tint)"/>
      <ellipse cx="100" cy="82" rx="49" ry="14" stroke-width="2.4"/>
      <g clip-path="url(#clip-pie)" stroke-width="2.2">
        <path d="M70 66l26 32M88 62l26 32M106 62l26 32M124 66l22 28"/>
        <path d="M130 66l-26 32M112 62l-26 32M94 62l-26 32M76 66l-22 28"/>
      </g>
      <path d="M40 82v10q0 18 60 18t60-18V82"/>
      <path d="M30 116q70 18 140 0"/>
    </g>
  </symbol>

  <!-- nut tart -->
  <symbol id="i-tart" viewBox="0 0 200 150">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="100" cy="82" rx="58" ry="18" fill="var(--illo-tint)"/>
      <path d="M42 82v12q0 16 58 16t58-16V82"/>
      <path d="M52 92v10M66 97v11M82 100v11M100 101v12M118 100v11M134 97v11M148 92v10" stroke-width="2.2"/>
      <ellipse cx="78" cy="78" rx="11" ry="7" transform="rotate(-14 78 78)"/>
      <ellipse cx="104" cy="86" rx="11" ry="7" transform="rotate(8 104 86)"/>
      <ellipse cx="124" cy="75" rx="11" ry="7" transform="rotate(-8 124 75)"/>
    </g>
  </symbol>

  <!-- stacked cookies -->
  <symbol id="i-cookie" viewBox="0 0 200 150">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="96" cy="112" rx="46" ry="14" fill="var(--illo-tint)"/>
      <ellipse cx="104" cy="88" rx="46" ry="14" fill="var(--illo-tint)"/>
      <ellipse cx="98" cy="62" rx="46" ry="14" fill="var(--illo-tint)"/>
      <path d="M84 60h.5M106 57h.5M118 65h.5M92 68h.5" stroke-width="7"/>
      <path d="M88 86h.5M112 84h.5M126 91h.5" stroke-width="7"/>
    </g>
  </symbol>

  <!-- cupcake -->
  <symbol id="i-cupcake" viewBox="0 0 200 150">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M66 82h68l-9 42q-1 6-7 6H82q-6 0-7-6z" fill="var(--illo-tint)"/>
      <path d="M84 86l-4 44M100 86v44M116 86l4 44" stroke-width="2.2"/>
      <path d="M66 82q0-16 14-20 2-16 20-16t20 16q14 4 14 20z" fill="#fbf3e7"/>
      <path d="M78 74q10-8 20 0t24-2" stroke-width="2.2"/>
      <circle cx="100" cy="30" r="7" fill="#dfa192"/>
      <path d="M100 23q2-8 9-9" stroke-width="2.2"/>
    </g>
  </symbol>

  <!-- interface icons -->
  <symbol id="i-bag" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 8h15l-1.2 11.2a1.6 1.6 0 0 1-1.6 1.4H7.3a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M8.6 10.5V6.8a3.4 3.4 0 0 1 6.8 0v3.7"/></g></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.6l2.5 5.3 5.6.8-4.1 4.1 1 5.8-5-2.7-5 2.7 1-5.8L3.9 9.7l5.6-.8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5.5v13M5.5 12h13"/></g></symbol>
  <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5.5 12h13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></g></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.8a8.4 8.4 0 0 1-12.4 7.4L3.6 20.4l1.3-4.8A8.4 8.4 0 1 1 21 11.8z"/><path d="M9.2 9.1c.3 3 2.7 5.4 5.7 5.7l1-1.4 2 1c-.4 1.3-1.8 1.9-3.1 1.6A8 8 0 0 1 8.6 10c-.3-1.3.3-2.7 1.6-3.1l1 2z"/></g></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><path d="M6.6 3.5h3l1.5 3.7-1.9 1.4a11 11 0 0 0 5.2 5.2l1.4-1.9 3.7 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.6 6.6L12 12.8l8.4-6.2"/></g></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/></g></symbol>
  <symbol id="i-instagram" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/></g></symbol>
  <symbol id="i-facebook" viewBox="0 0 24 24"><path d="M14.8 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.5V4.3A21 21 0 0 0 15.6 4c-2.3 0-3.9 1.4-3.9 4.1v2.3H9v3h2.7V21z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></g></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>

  <!-- owner page icons -->
  <symbol id="i-pencil" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16.4 3.9l3.7 3.7L8.5 19.2l-4.6.9.9-4.6z"/><path d="M14.2 6.1l3.7 3.7"/></g></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.6 6.6h14.8M9.4 6.6V4.4h5.2v2.2"/><path d="M6.6 6.6l.9 12.2a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l.9-12.2"/><path d="M10.3 10.3v6.4M13.7 10.3v6.4"/></g></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 12l6-6 6 6"/></g></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v13M6 12l6 6 6-6"/></g></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="8.6" y="8.6" width="11.4" height="11.4" rx="2"/><path d="M15.4 5.4a1.8 1.8 0 0 0-1.8-1.4H5.8A1.8 1.8 0 0 0 4 5.8v7.8a1.8 1.8 0 0 0 1.4 1.8"/></g></symbol>
  <symbol id="i-download" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.8v11M7.6 10.4l4.4 4.4 4.4-4.4"/><path d="M4.4 16.4v2.2a1.6 1.6 0 0 0 1.6 1.6h12a1.6 1.6 0 0 0 1.6-1.6v-2.2"/></g></symbol>
  <symbol id="i-image" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3.4" y="4.8" width="17.2" height="14.4" rx="2"/><circle cx="8.8" cy="9.8" r="1.6"/><path d="M3.9 16.6l4.7-4.2 4 3.4 3-2.6 4.5 3.9"/></g></symbol>
  <symbol id="i-back" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></g></symbol>
  <symbol id="i-undo" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 5.5v5h5"/><path d="M5.2 10.2a7.6 7.6 0 1 1-.9 5"/></g></symbol>
</svg>`;

  const here = document.currentScript;
  if (here) here.insertAdjacentHTML('afterend', SPRITE);
  else document.body.insertAdjacentHTML('afterbegin', SPRITE);
})();
