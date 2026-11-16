(function (global) {
    'use strict';

    const KEY = 'personal_workbench_selected_variant_v1';
    const THEME_KEY = 'personal_workbench_selected_preschool_theme_v1';
    const VALID_VARIANTS = ['adult', 'child', 'preschool'];
    const VALID_THEMES = ['garden-defense', 'voxel-adventure', 'platform-quest'];
    const ROOT_PATHS = {
        adult: './成人成长工作台/index.html',
        child: './儿童学习工作台/index.html',
        preschool: './preschool-workbench/index.html'
    };
    const SIBLING_PATHS = {
        adult: '../成人成长工作台/index.html',
        child: '../儿童学习工作台/index.html',
        preschool: '../preschool-workbench/index.html'
    };

    function wantsSimulatedAndroid() {
        try {
            const search = global.location && global.location.search;
            if (!search) return false;
            return new URLSearchParams(search).has('sim-android');
        } catch (error) {
            return false;
        }
    }

    function isNativeAndroid() {
        try {
            if (wantsSimulatedAndroid()) return true;
            const capacitor = global.Capacitor;
            if (!capacitor || typeof capacitor.getPlatform !== 'function') return false;
            if (capacitor.getPlatform() !== 'android') return false;
            return typeof capacitor.isNativePlatform !== 'function' || capacitor.isNativePlatform();
        } catch (error) {
            return false;
        }
    }

    if (global.document && isNativeAndroid()) {
        global.document.documentElement.classList.add('is-android-app');
    }

    function isValidVariant(value) {
        return VALID_VARIANTS.includes(String(value || ''));
    }

    function getSelected() {
        try {
            const stored = global.localStorage && global.localStorage.getItem(KEY);
            return isValidVariant(stored) ? stored : null;
        } catch (error) {
            console.warn('[PersonalWorkbenchLauncher] 读取选择失败', error);
            return null;
        }
    }

    function isValidTheme(value) {
        return VALID_THEMES.includes(String(value || ''));
    }

    function getSelectedTheme() {
        try {
            const stored = global.localStorage && global.localStorage.getItem(THEME_KEY);
            return isValidTheme(stored) ? stored : null;
        } catch (error) {
            console.warn('[PersonalWorkbenchLauncher] 读取幼儿主题失败', error);
            return null;
        }
    }

    function rememberTheme(theme) {
        if (!isValidTheme(theme)) return null;
        try {
            if (global.localStorage) global.localStorage.setItem(THEME_KEY, theme);
        } catch (error) {
            console.warn('[PersonalWorkbenchLauncher] 保存幼儿主题失败', error);
        }
        return theme;
    }

    function remember(variant) {
        if (!isValidVariant(variant)) return null;
        try {
            if (global.localStorage) global.localStorage.setItem(KEY, variant);
        } catch (error) {
            console.warn('[PersonalWorkbenchLauncher] 保存选择失败', error);
        }
        return variant;
    }

    function getPath(variant, theme) {
        if (!isValidVariant(variant)) return '';
        if (variant !== 'preschool') return ROOT_PATHS[variant];
        const selectedTheme = isValidTheme(theme) ? theme : getSelectedTheme();
        return `${ROOT_PATHS[variant]}${selectedTheme ? `?theme=${encodeURIComponent(selectedTheme)}` : ''}`;
    }

    function getSiblingPath(currentVariant, targetVariant) {
        if (!isValidVariant(currentVariant) || !isValidVariant(targetVariant)) return '';
        if (currentVariant === targetVariant) return './';
        return targetVariant === 'preschool' ? getPath(targetVariant).replace('./', '../') : SIBLING_PATHS[targetVariant];
    }

    function shouldAutoRedirect(search) {
        // Always show the multi-workbench launcher first; remembered
        // selection only powers the recent badge, not a cold-start skip.
        void search;
        return false;
    }

    function bindRememberingLinks() {
        if (!global.document) return;
        global.document.addEventListener('click', function (event) {
            const link = event.target.closest('[data-workbench-variant]');
            if (!link) return;
            remember(link.dataset.workbenchVariant);
            if (link.dataset.workbenchVariant === 'preschool' && link.dataset.workbenchTheme) rememberTheme(link.dataset.workbenchTheme);
        });
    }

    function setupLauncherPager() {
        if (!global.document) return;
        const pager = global.document.querySelector('.launcher-app-pager');
        const pages = Array.from(global.document.querySelectorAll('.launcher-app-page'));
        const buttons = Array.from(global.document.querySelectorAll('[data-launcher-page]'));
        if (!pager || !pages.length || !buttons.length) return;

        function markSelected(index) {
            buttons.forEach(function (button, buttonIndex) {
                button.setAttribute('aria-selected', buttonIndex === index ? 'true' : 'false');
            });
        }

        buttons.forEach(function (button, index) {
            button.addEventListener('click', function () {
                const page = pages[index];
                if (!page) return;
                pager.scrollTo({ left: page.offsetLeft, behavior: 'smooth' });
                markSelected(index);
            });
        });
        pager.addEventListener('scroll', function () {
            const width = Math.max(1, pager.clientWidth);
            markSelected(Math.max(0, Math.min(pages.length - 1, Math.round(pager.scrollLeft / width))));
        }, { passive: true });
        markSelected(0);
    }

    global.PersonalWorkbenchLauncher = {
        KEY: KEY,
        THEME_KEY: THEME_KEY,
        VALID_VARIANTS: VALID_VARIANTS.slice(),
        VALID_THEMES: VALID_THEMES.slice(),
        isValidVariant: isValidVariant,
        isValidTheme: isValidTheme,
        getSelected: getSelected,
        getSelectedTheme: getSelectedTheme,
        remember: remember,
        rememberTheme: rememberTheme,
        getPath: getPath,
        getSiblingPath: getSiblingPath,
        shouldAutoRedirect: shouldAutoRedirect
    };

    bindRememberingLinks();
    setupLauncherPager();
})(typeof window !== 'undefined' ? window : globalThis);
