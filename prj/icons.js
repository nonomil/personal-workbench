(function () {
    'use strict';

    // Lucide-compatible inline paths keep the standalone project offline-capable.
    const icons = {
        'layout-dashboard': '<rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect>',
        'clipboard-check': '<rect width="8" height="4" x="8" y="3" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2h2"></path><path d="m8 13 2 2 4-4"></path>',
        'book-open': '<path d="M12 7v14"></path><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v18H5.5A2.5 2.5 0 0 1 3 18.5Z"></path><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v18h6.5a2.5 2.5 0 0 0 2.5-2.5Z"></path>',
        target: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.42 1.42"></path><path d="m17.65 17.65 1.42 1.42"></path>',
        'rotate-ccw': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>',
        'settings-2': '<path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle>',
        menu: '<line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="18" y2="18"></line>',
        x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
        plus: '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
        'arrow-up-right': '<path d="M7 17 17 7"></path><path d="M7 7h10v10"></path>',
        check: '<path d="m5 12 4 4L19 6"></path>',
        'trash-2': '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6v14H5V6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path>',
        'edit-3': '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
        'chevron-right': '<path d="m9 18 6-6-6-6"></path>',
        'calendar-days': '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path>',
        'clock-3': '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
        sparkles: '<path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2Z"></path><path d="m19 15-.6 2.4L16 18l2.4.6L19 21l.6-2.4L22 18l-2.4-.6Z"></path>',
        'chart-column': '<path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path>',
        'book-marked': '<path d="M10 2v8l3-2 3 2V2"></path><path d="M15 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13"></path><path d="M18 15v7l3-2 3 2v-7a3 3 0 0 0-6 0Z"></path>',
        flag: '<path d="M4 22V4a1 1 0 0 1 1-1h11l4 4-4 4H5"></path><path d="M4 15h12"></path>',
        archive: '<rect width="20" height="5" x="2" y="4" rx="1"></rect><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"></path><path d="M10 13h4"></path>',
        'more-horizontal': '<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>',
        download: '<path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>',
        upload: '<path d="M12 3v12"></path><path d="m17 8-5-5-5 5"></path><path d="M5 21h14"></path>',
        sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
        'circle-check': '<circle cx="12" cy="12" r="9"></circle><path d="m9 12 2 2 4-4"></path>',
        pencil: '<path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path><path d="m15 5 3 3"></path>',
        'heart-pulse': '<path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6.1a5 5 0 0 1 7.5 6.5Z"></path><path d="M4 12h4l1.5-3 3 6 1.5-3H20"></path>',
        'list-todo': '<rect width="13" height="13" x="8" y="3" rx="2"></rect><path d="m9 12 2 2 4-4"></path><path d="M4 7h1"></path><path d="M4 12h1"></path><path d="M4 17h1"></path>',
        'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path>',
        lightbulb: '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.1 14c.5-.4.9-.9 1.2-1.5A5 5 0 1 0 7.7 14c.4.3.7.8.8 1.3L9 17h6l.1-3Z"></path>',
        'cloud-off': '<path d="m2 2 20 20"></path><path d="M5.7 5.7A7 7 0 0 1 19 9.5"></path><path d="M17.7 17.7A7 7 0 0 1 5 14.5"></path><path d="M2 14h3"></path><path d="M19 14h3"></path><path d="M12 3v2"></path>',
        'notebook-pen': '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.4"></path><path d="M2 6h4"></path><path d="M2 10h4"></path><path d="M2 14h4"></path><path d="M2 18h4"></path><path d="M18 2a2.1 2.1 0 0 1 3 3L11 15l-4 1 1-4Z"></path>',
        sliders: '<line x1="4" x2="4" y1="21" y2="14"></line><line x1="4" x2="4" y1="10" y2="3"></line><line x1="12" x2="12" y1="21" y2="12"></line><line x1="12" x2="12" y1="8" y2="3"></line><line x1="20" x2="20" y1="21" y2="16"></line><line x1="20" x2="20" y1="12" y2="3"></line><line x1="2" x2="6" y1="14" y2="14"></line><line x1="10" x2="14" y1="8" y2="8"></line><line x1="18" x2="22" y1="16" y2="16"></line>',
        album: '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M9 3v6"></path><path d="M15 3v6"></path><path d="M7 14h.01"></path><path d="M12 14h.01"></path><path d="M17 14h.01"></path>',
        'arrow-right': '<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>',
        bomb: '<circle cx="11" cy="13" r="9"></circle><path d="M14.35 4.65 16.3 2.7a2.41 2.41 0 0 1 3.4 0l1.6 1.6a2.4 2.4 0 0 1 0 3.4l-1.95 1.95"></path><path d="m22 2-1.5 1.5"></path>',
        bug: '<path d="m8 2 1.9 2.1"></path><path d="m16 2-1.9 2.1"></path><path d="M9 7.5a3 3 0 0 1 6 0v3.7a3 3 0 0 1-6 0Z"></path><path d="M4 10h5"></path><path d="M15 10h5"></path><path d="M5 15h4"></path><path d="M15 15h4"></path><path d="M12 14v8"></path>',
        cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"></path>',
        'cloud-download': '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"></path><path d="M12 12v6"></path><path d="m9 15 3 3 3-3"></path>',
        'cloud-upload': '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"></path><path d="M12 18v-6"></path><path d="m9 15 3-3 3 3"></path>',
        'cloud-cog': '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"></path><path d="m16 14 .6.6"></path><path d="m19 16-.8.1"></path><path d="m17 18-.6-.6"></path><path d="m14 16 .8-.1"></path>',
        droplets: '<path d="M7 16.5a3.5 3.5 0 1 0 7 0C14 14.7 10.5 10 10.5 10S7 14.7 7 16.5Z"></path><path d="M16 7c0 1.1.9 2 2 2s2-.9 2-2c0-1-2-4-2-4s-2 3-2 4Z"></path>',
        flame: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 1-3 3-3 5-2-1-3-3-3-5-2 2-4 5-4 9a7 7 0 0 0 7 8Z"></path><path d="M12 22a3 3 0 0 0 3-3c0-1.7-1.2-2.8-2.4-4.3-.8.8-1.6 1.8-1.6 3.3a3 3 0 0 0 1 4Z"></path>',
        gift: '<rect width="18" height="13" x="3" y="8" rx="1"></rect><path d="M12 8v13"></path><path d="M3 12h18"></path><path d="M12 8H8.5a2.5 2.5 0 1 1 2.5-2.5V8Z"></path><path d="M12 8h3.5a2.5 2.5 0 1 0-2.5-2.5V8Z"></path>',
        'heart-handshake': '<path d="M19 14c1.5-1.5 3-3 3-5.2A4.8 4.8 0 0 0 12 6.1 4.8 4.8 0 0 0 2 8.8C2 12 5.5 14.2 8 16.5L12 20l2.5-2.2"></path><path d="m15 12 2 2 4-4"></path><path d="m14 17 2 2 4-4"></path>',
        house: '<path d="m3 10 9-7 9 7"></path><path d="M5 9v11h14V9"></path><path d="M9 20v-6h6v6"></path>',
        'lock-keyhole': '<rect width="14" height="11" x="5" y="11" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path><circle cx="12" cy="16" r="1"></circle>',
        'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path>',
        'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>',
        'message-circle-heart': '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.8-4A8.3 8.3 0 1 1 21 11.5Z"></path><path d="M12 16s-4-2.2-4-4.8a2.2 2.2 0 0 1 4-1.3 2.2 2.2 0 0 1 4 1.3C16 13.8 12 16 12 16Z"></path>',
        play: '<path d="m7 4 13 8-13 8Z"></path>',
        send: '<path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path>',
        'server-cog': '<rect width="20" height="8" x="2" y="2" rx="2"></rect><rect width="20" height="8" x="2" y="14" rx="2"></rect><path d="M6 6h.01"></path><path d="M6 18h.01"></path><path d="m17 16 .8.8"></path><path d="m20 18-1 .1"></path><path d="m17 20-.8-.8"></path><path d="m14 18 1-.1"></path>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path>',
        'shield-check': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="m9 12 2 2 4-4"></path>',
        'shield-alert': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
        shirt: '<path d="m16 3 5 3-3 5-2-1v11H8V10L6 11 3 6l5-3c.5 1.7 1.9 3 4 3s3.5-1.3 4-3Z"></path>',
        sprout: '<path d="M7 20h10"></path><path d="M12 20V10"></path><path d="M12 10C8 10 5 8 5 4c4 0 7 2 7 6Z"></path><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6Z"></path>',
        'triangle-alert': '<path d="m21.7 18-8.2-14a1.7 1.7 0 0 0-3 0L4.3 18a1.7 1.7 0 0 0 1.5 2.5h14.4A1.7 1.7 0 0 0 21.7 18Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
        'user-round-plus': '<path d="M18 21a6 6 0 0 0-12 0"></path><circle cx="12" cy="7" r="4"></circle><path d="M19 8v6"></path><path d="M22 11h-6"></path>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.9"></path><path d="M16 3.1a4 4 0 0 1 0 7.8"></path>',
        calculator: '<rect width="16" height="20" x="4" y="2" rx="2"></rect><rect width="8" height="4" x="8" y="6" rx="1"></rect><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path>',
        languages: '<path d="m5 8 6 6"></path><path d="m4 14 6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="M22 22 16 10l-6 12"></path><path d="M14 18h4"></path>',
        'gamepad-2': '<line x1="6" x2="10" y1="11" y2="11"></line><line x1="8" x2="8" y1="9" y2="13"></line><line x1="15" x2="15.01" y1="12" y2="12"></line><line x1="18" x2="18.01" y1="10" y2="10"></line><path d="M6.5 6h11a4 4 0 0 1 3.8 5l-1.2 5a3 3 0 0 1-5.4 1.1L13 15h-2l-1.7 2.1A3 3 0 0 1 3.9 16l-1.2-5A4 4 0 0 1 6.5 6Z"></path>',
        'graduation-cap': '<path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path><path d="M22 10v6"></path>',
        map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"></path><path d="M9 3v15"></path><path d="M15 6v15"></path>',
        heart: '<path d="M20.8 8.6a5.5 5.5 0 0 0-9-1.7 5.5 5.5 0 0 0-9 1.7C1 13 6.4 16.7 11.8 21c5.4-4.3 10.8-8 9-12.4Z"></path>',
        moon: '<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"></path>',
        'flower-2': '<path d="M12 7v14"></path><path d="M12 7a4 4 0 1 1 4-4c0 2.2-2 4-4 4Z"></path><path d="M12 7a4 4 0 1 0-4-4c0 2.2 2 4 4 4Z"></path><path d="M12 12a4 4 0 1 1 4 4c-2.2 0-4-2-4-4Z"></path><path d="M12 12a4 4 0 1 0-4 4c2.2 0 4-2 4-4Z"></path>',
        rainbow: '<path d="M3 18a9 9 0 0 1 18 0"></path><path d="M6 18a6 6 0 0 1 12 0"></path><path d="M9 18a3 3 0 0 1 6 0"></path>',
        trees: '<path d="M10 21v-7"></path><path d="M7 21h6"></path><path d="m10 14-4-5h3L7 5l3-3 3 3h-2l3 4h-3Z"></path><path d="M17 21v-5"></path><path d="M14 21h6"></path><path d="m17 16-3-4h2l-2-3 3-3 3 3h-2l3 4h-3Z"></path>',
        'tree-pine': '<path d="m17 14 3 3h-4l3 4H5l3-4H4l3-3-2-2h4L7 8h3L12 3l2 5h3l-2 4h4Z"></path><path d="M12 3v18"></path>',
        crown: '<path d="m2 4 3 16h14l3-16-6 5-4-7-4 7Z"></path><path d="M5 20h14"></path>',
        sparkle: '<path d="m12 3-1.5 6.5L4 11l6.5 1.5L12 19l1.5-6.5L20 11l-6.5-1.5Z"></path>',
        'alert-triangle': '<path d="m21.7 18-8.2-14a1.7 1.7 0 0 0-3 0L4.3 18a1.7 1.7 0 0 0 1.5 2.5h14.4A1.7 1.7 0 0 0 21.7 18Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
        'archive-check': '<rect width="20" height="5" x="2" y="4" rx="1"></rect><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"></path><path d="m9 14 2 2 4-4"></path>',
        'arrow-left': '<path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path>',
        'badge-check': '<circle cx="12" cy="12" r="9"></circle><path d="m9 12 2 2 4-4"></path>',
        'book-check': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path><path d="m9 11 2 2 4-4"></path>',
        'calendar-check-2': '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="m8 15 2 2 4-4"></path>',
        'calendar-clock': '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><circle cx="16" cy="16" r="3"></circle><path d="M16 14v2l1 1"></path>',
        'check-check': '<path d="m3 12 4 4 5-5"></path><path d="m12 12 4 4 5-5"></path>',
        'chevron-down': '<path d="m6 9 6 6 6-6"></path>',
        'chevron-left': '<path d="m15 18-6-6 6-6"></path>',
        circle: '<circle cx="12" cy="12" r="9"></circle>',
        database: '<ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"></path>',
        exam: '<rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M8 6h8"></path><path d="M8 10h8"></path><path d="m8 14 2 2 4-4"></path>',
        footprints: '<path d="M7 20c-1.7 0-3-1.3-3-3 0-2.2 1.5-4 3.5-4s3.5 1.8 3.5 4c0 1.7-1.3 3-3 3Z"></path><path d="M17 14c-1.7 0-3-1.3-3-3 0-2.2 1.5-4 3.5-4S21 8.8 21 11c0 1.7-1.3 3-3 3Z"></path><path d="M8.5 10C7 10 6 8.8 6 7.2 6 5.4 7.2 4 8.8 4s2.8 1.4 2.8 3.2c0 1.6-1.1 2.8-3.1 2.8Z"></path><path d="M15.5 6C14 6 13 4.8 13 3.2 13 1.4 14.2 0 15.8 0s2.8 1.4 2.8 3.2c0 1.6-1.1 2.8-3.1 2.8Z"></path>',
        ghost: '<path d="M9 22V12a3 3 0 0 1 6 0v10l-3-2-3 2Z"></path><path d="M5 22V10a7 7 0 0 1 14 0v12l-3-2-3 2-3-2-3 2Z"></path><path d="M9 10h.01"></path><path d="M15 10h.01"></path>',
        'grid-2x2': '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect>',
        'layers-3': '<path d="m12 2 9 5-9 5-9-5 9-5Z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 17 9 5 9-5"></path>',
        'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect>',
        'list-checks': '<path d="M3 5h.01"></path><path d="M3 12h.01"></path><path d="M3 19h.01"></path><path d="M8 5h13"></path><path d="M8 12h13"></path><path d="m8 19 2 2 4-4"></path>',
        'music-2': '<circle cx="8" cy="18" r="3"></circle><path d="M11 18V5l10-2v13"></path><circle cx="18" cy="16" r="3"></circle>',
        pause: '<rect width="4" height="14" x="6" y="5" rx="1"></rect><rect width="4" height="14" x="14" y="5" rx="1"></rect>',
        'play-circle': '<circle cx="12" cy="12" r="9"></circle><path d="m10 8 6 4-6 4Z"></path>',
        'sliders-horizontal': '<line x1="21" x2="14" y1="4" y2="4"></line><line x1="10" x2="3" y1="4" y2="4"></line><line x1="21" x2="12" y1="12" y2="12"></line><line x1="8" x2="3" y1="12" y2="12"></line><line x1="21" x2="16" y1="20" y2="20"></line><line x1="12" x2="3" y1="20" y2="20"></line><line x1="14" x2="14" y1="2" y2="6"></line><line x1="10" x2="10" y1="10" y2="14"></line><line x1="16" x2="16" y1="18" y2="22"></line>',
        swords: '<path d="m14.5 17.5 3 3"></path><path d="m6.5 3.5 3 3"></path><path d="m3 3 6 6"></path><path d="m21 21-6-6"></path><path d="m3 21 6-6"></path><path d="m21 3-6 6"></path><path d="m14 10 4.5-4.5"></path><path d="m10 14-4.5 4.5"></path>',
        'user-round': '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
        'volume-2': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M19 5a10 10 0 0 1 0 14"></path>',
        dumbbell: '<path d="m6.5 6.5 11 11"></path><path d="m17.5 6.5-11 11"></path><path d="M4 8 8 4"></path><path d="M16 20l4-4"></path><path d="M4 16 8 20"></path><path d="m16 4 4 4"></path><path d="M3 7h4"></path><path d="M17 17h4"></path><path d="M3 17h4"></path><path d="M17 7h4"></path>',
        feather: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5Z"></path><path d="M16 8 2 22"></path><path d="M17.5 15H9"></path>',
        'shopping-basket': '<path d="m5 11 1-6"></path><path d="m18 11-1-6"></path><path d="M4 11h16l-1.5 8.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5Z"></path><path d="M8 11V7a4 4 0 0 1 8 0v4"></path><path d="M3 11h18"></path>',
        snowflake: '<path d="M12 2v20"></path><path d="m17 5-5 5-5-5"></path><path d="m7 19 5-5 5 5"></path><path d="M2 12h20"></path><path d="m5 7 5 5-5 5"></path><path d="m19 7-5 5 5 5"></path>',
        stamp: '<path d="M5 21h14"></path><path d="M19 21v-4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v4"></path><path d="M12 15a4 4 0 1 0-4-4V7a4 4 0 1 1 8 0v4a4 4 0 0 0-4 4Z"></path>',
        star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-5-4.9 6.9-1Z"></path>',
        telescope: '<path d="m10.5 6.5 8 4.5"></path><path d="m3 17 8-4.5"></path><path d="m6 21 4-8"></path><path d="m14 21-4-8"></path><path d="M5 3h4l4 8-7 4-4-8Z"></path><path d="M18 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"></path>',
        'wallet-cards': '<rect width="20" height="14" x="2" y="5" rx="2"></rect><path d="M2 10h20"></path><path d="M16 15h2"></path><path d="M6 3h12a2 2 0 0 1 2 2v0H4v0a2 2 0 0 1 2-2Z"></path>',
        tv: '<rect width="20" height="15" x="2" y="4" rx="2"></rect><path d="m8 21 4-2 4 2"></path><path d="M8 2l4 2 4-2"></path>',
        zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9Z"></path>',
        'calendar-range': '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path><path d="M8 14h3"></path><path d="M8 18h8"></path>',
        'repeat-2': '<path d="m2 9 3-3 3 3"></path><path d="M5 6h9a4 4 0 0 1 4 4v1"></path><path d="m22 15-3 3-3-3"></path><path d="M19 18h-9a4 4 0 0 1-4-4v-1"></path>'
    };

    function createIcons(options) {
        const root = options && options.root ? options.root : document;
        root.querySelectorAll('[data-lucide]').forEach(function (node) {
            const name = node.getAttribute('data-lucide');
            if (!icons[name]) return;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('class', node.getAttribute('class') || 'icon');
            svg.innerHTML = icons[name];
            node.replaceWith(svg);
        });
    }

    window.lucide = { createIcons: createIcons };
})();
