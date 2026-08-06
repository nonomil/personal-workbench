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
        const params = new URLSearchParams(String(search || ''));
        return params.get('choose') !== '1' && Boolean(getSelected());
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
})(typeof window !== 'undefined' ? window : globalThis);
