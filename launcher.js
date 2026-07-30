(function (global) {
    'use strict';

    const KEY = 'personal_workbench_selected_variant_v1';
    const VALID_VARIANTS = ['adult', 'child', 'preschool'];
    const ROOT_PATHS = {
        adult: './成人成长工作台/',
        child: './儿童学习工作台/',
        preschool: './preschool-workbench/'
    };
    const SIBLING_PATHS = {
        adult: '../成人成长工作台/',
        child: '../儿童学习工作台/',
        preschool: '../preschool-workbench/'
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

    function remember(variant) {
        if (!isValidVariant(variant)) return null;
        try {
            if (global.localStorage) global.localStorage.setItem(KEY, variant);
        } catch (error) {
            console.warn('[PersonalWorkbenchLauncher] 保存选择失败', error);
        }
        return variant;
    }

    function getPath(variant) {
        return isValidVariant(variant) ? ROOT_PATHS[variant] : '';
    }

    function getSiblingPath(currentVariant, targetVariant) {
        if (!isValidVariant(currentVariant) || !isValidVariant(targetVariant)) return '';
        if (currentVariant === targetVariant) return './';
        return SIBLING_PATHS[targetVariant];
    }

    function shouldAutoRedirect(search) {
        const params = new URLSearchParams(String(search || ''));
        return params.get('choose') !== '1' && Boolean(getSelected());
    }

    function bindRememberingLinks() {
        if (!global.document) return;
        global.document.addEventListener('click', function (event) {
            const link = event.target.closest('[data-workbench-variant]');
            if (link) remember(link.dataset.workbenchVariant);
        });
    }

    global.PersonalWorkbenchLauncher = {
        KEY: KEY,
        VALID_VARIANTS: VALID_VARIANTS.slice(),
        isValidVariant: isValidVariant,
        getSelected: getSelected,
        remember: remember,
        getPath: getPath,
        getSiblingPath: getSiblingPath,
        shouldAutoRedirect: shouldAutoRedirect
    };

    bindRememberingLinks();
})(typeof window !== 'undefined' ? window : globalThis);
