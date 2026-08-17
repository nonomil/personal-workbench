(function (global) {
    'use strict';

    var HOWTO = {
        'motion-01': '沿着地上的线慢慢走，脚尖对着脚跟。',
        'motion-02': '双手向上举高，再轻轻弯腰，手指朝脚的方向。',
        'motion-03': '跟着节奏拍手，拍一下，停一下。',
        'motion-04': '听到“走”就走，听到“停”就马上站住。',
        'motion-05': '一格一格往前跳，落稳了再跳下一格。',
        'motion-06': '双手把软球投给旁边的大人。',
        'motion-07': '坐下或蹲好，双手接住滚过来的球。',
        'motion-08': '一只脚站稳，另一只脚抬起来，可以扶墙。',
        'motion-09': '绕开地上的障碍，慢慢走到对面。',
        'motion-10': '看一看，找出两张一样的图。',
        'motion-11': '先听完两步指令，再按顺序做。',
        'motion-12': '记住刚才走过的路线，再走一遍。',
        'motion-13': '跳开时双脚分开举手，跳回来时拍手。',
        'motion-14': '双脚踩稳，慢慢蹲下，再站起来。膝盖不要往里扣。',
        'motion-15': '在原地跑，脚下留空，不要跑出门。',
        'motion-16': '轮流把膝盖抬高，可以轻轻扶墙。'
    };

    function frame(inner) {
        return '<svg class="preschool-motion-svg" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="160" height="160" rx="28" fill="#eefae4"/>' + inner + '</svg>';
    }

    function head(cx, cy) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="#f4c27a" stroke="#2c7a45" stroke-width="3"/>';
    }

    var ART = {
        'motion-01': frame('<path d="M28 118 H132" stroke="#8ecf6a" stroke-width="8" stroke-linecap="round"/><path d="M36 118 H124" stroke="#2d8748" stroke-width="2" stroke-dasharray="8 8"/>' + head(58, 54) + '<path d="M58 66 L58 92 L46 118 M58 92 L78 118 M48 78 L70 78" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/>'),
        'motion-02': frame(head(80, 38) + '<path d="M80 50 L80 86 M80 62 L48 48 M80 62 L112 48 M80 86 L62 122 M80 86 L98 122" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><path d="M48 48 L40 28 M112 48 L120 28" fill="none" stroke="#f09137" stroke-width="4" stroke-linecap="round"/>'),
        'motion-03': frame(head(58, 50) + '<path d="M58 62 L58 96 L46 122 M58 96 L74 122 M50 78 L42 70" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><circle cx="112" cy="58" r="16" fill="none" stroke="#f09137" stroke-width="5"/><circle cx="128" cy="78" r="16" fill="none" stroke="#2d8748" stroke-width="5"/>'),
        'motion-04': frame('<rect x="28" y="36" width="44" height="88" rx="16" fill="#fff3e4" stroke="#f09137" stroke-width="3"/>' + head(50, 58) + '<path d="M50 70 L50 96" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><path d="M96 118 H132" stroke="#2d8748" stroke-width="6" stroke-linecap="round"/>' + head(114, 54) + '<path d="M114 66 L114 92 L102 118 M114 92 L128 118" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/>'),
        'motion-05': frame('<rect x="28" y="96" width="32" height="28" rx="6" fill="#c8e8b0"/><rect x="64" y="96" width="32" height="28" rx="6" fill="#8ecf6a"/><rect x="100" y="96" width="32" height="28" rx="6" fill="#c8e8b0"/>' + head(80, 40) + '<path d="M80 52 L80 78 L64 96 M80 78 L98 96 M68 66 L92 66" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/>'),
        'motion-06': frame(head(52, 50) + '<path d="M52 62 L52 96 L40 122 M52 96 L68 122 M52 74 L92 58" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><circle cx="112" cy="50" r="14" fill="#f09137" stroke="#2c7a45" stroke-width="3"/>'),
        'motion-07': frame('<ellipse cx="80" cy="126" rx="46" ry="10" fill="#c8e8b0"/>' + head(80, 48) + '<path d="M80 60 L80 88 L58 110 M80 88 L102 110 M58 78 L48 92 M102 78 L112 92" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><circle cx="48" cy="118" r="10" fill="#f09137" stroke="#2c7a45" stroke-width="3"/>'),
        'motion-08': frame(head(80, 40) + '<path d="M80 52 L80 86 L62 122 M80 86 L92 104 L80 118" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><path d="M62 70 L48 58" stroke="#8ecf6a" stroke-width="5" stroke-linecap="round"/>'),
        'motion-09': frame('<circle cx="48" cy="108" r="12" fill="#f4c27a" stroke="#2c7a45" stroke-width="3"/><circle cx="80" cy="86" r="12" fill="#8ecf6a" stroke="#2c7a45" stroke-width="3"/><circle cx="112" cy="108" r="12" fill="#f09137" stroke="#2c7a45" stroke-width="3"/>' + head(80, 36) + '<path d="M80 48 L80 70" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/>'),
        'motion-10': frame('<rect x="28" y="44" width="44" height="72" rx="12" fill="#fffaf2" stroke="#2d8748" stroke-width="3"/><rect x="88" y="44" width="44" height="72" rx="12" fill="#fffaf2" stroke="#2d8748" stroke-width="3"/><circle cx="50" cy="80" r="10" fill="#f09137"/><circle cx="110" cy="80" r="10" fill="#f09137"/>'),
        'motion-11': frame(head(80, 46) + '<path d="M80 58 L80 92 L64 122 M80 92 L96 122 M64 74 L50 66 M96 74 L110 66" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><path d="M36 36 H60 M100 36 H124" stroke="#f09137" stroke-width="6" stroke-linecap="round"/>'),
        'motion-12': frame('<path d="M36 120 C60 40, 100 140, 124 48" fill="none" stroke="#8ecf6a" stroke-width="8" stroke-linecap="round"/>' + head(52, 96) + '<circle cx="124" cy="48" r="8" fill="#f09137"/>'),
        'motion-13': frame(head(80, 36) + '<path d="M80 48 L80 78 M56 60 L104 60 M56 78 L48 70 M104 78 L112 70 M62 78 L48 118 M98 78 L112 118" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/>'),
        'motion-14': frame(head(80, 42) + '<path d="M80 54 L80 78 L54 110 L48 122 M80 78 L106 110 L112 122 M54 86 L106 86" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/>'),
        'motion-15': frame(head(80, 40) + '<path d="M80 52 L80 86 L64 118 M80 86 L100 118 M60 70 L48 58 M100 70 L118 58" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><path d="M36 122 H124" stroke="#8ecf6a" stroke-width="6" stroke-linecap="round"/>'),
        'motion-16': frame(head(80, 38) + '<path d="M80 50 L80 86 L58 122 M80 86 L104 70 L96 48" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/><path d="M104 70 L118 62" stroke="#f09137" stroke-width="4" stroke-linecap="round"/>')
    };

    function howTo(motion) {
        const id = motion && motion.id ? String(motion.id) : '';
        if (HOWTO[id]) return HOWTO[id];
        const name = motion && motion.name ? String(motion.name) : '这个动作';
        return '跟爸爸妈妈一起做：' + name + '。';
    }

    function render(motion) {
        const id = motion && motion.id ? String(motion.id) : '';
        return ART[id] || frame(head(80, 48) + '<path d="M80 60 L80 96 L64 122 M80 96 L96 122 M64 76 L96 76" fill="none" stroke="#2c7a45" stroke-width="5" stroke-linecap="round"/>');
    }

    global.PersonalWorkbenchPreschoolMotionArt = {
        howTo: howTo,
        render: render
    };
}(typeof window !== 'undefined' ? window : globalThis));
