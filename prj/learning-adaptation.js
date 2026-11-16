(function (global) {
    'use strict';

    const DEFAULT_POLICY = Object.freeze({
        accuracyBand: [0.90, 0.96],
        unknownRateMax: 0.25,
        dailyNewCap: 4,
        handoffLimit: 10
    });

    function number(value, fallback) {
        return Number.isFinite(Number(value)) ? Number(value) : fallback;
    }

    function normalizeRecord(record) {
        const source = record && typeof record === 'object' ? record : {};
        return {
            contentId: String(source.contentId || source.key || source.id || '').trim(),
            track: String(source.track || 'unknown').trim(),
            attempts: Math.max(0, Math.floor(number(source.attempts, 0))),
            knownCount: Math.max(0, Math.floor(number(source.knownCount, 0))),
            unsureCount: Math.max(0, Math.floor(number(source.unsureCount, 0))),
            slipCount: Math.max(0, Math.floor(number(source.slipCount, 0))),
            unknownCount: Math.max(0, Math.floor(number(source.unknownCount, 0))),
            needsReteach: source.needsReteach === true,
            lastOutcome: String(source.lastOutcome || '').trim()
        };
    }

    function classifyOutcome(input) {
        const source = input && typeof input === 'object' ? input : {};
        const value = String(source.input || source.outcome || '').trim().toLowerCase();
        if (value === 'unknown' || value === 'skip' || value === '不会' || value === '不会/跳过') {
            return { outcome: 'unknown', grade: null, penalize: false, reward: false };
        }
        if (value === 'wrong' || value === 'incorrect' || value === 'again') {
            return { outcome: 'slip', grade: 'again', penalize: false, reward: false };
        }
        if (value === 'correct' || value === 'known' || value === 'good' || value === 'easy') {
            const provisional = source.firstAttempt === true
                || source.usedHint === true
                || (Number(source.optionCount) > 0 && Number(source.optionCount) <= 2)
                || source.provisional === true;
            return provisional
                ? { outcome: 'unsure', grade: 'good', penalize: false, reward: true }
                : { outcome: 'known', grade: value === 'easy' ? 'easy' : 'good', penalize: false, reward: true };
        }
        return { outcome: 'unknown', grade: null, penalize: false, reward: false };
    }

    function computeNewBudget(input, policy) {
        const limits = Object.assign({}, DEFAULT_POLICY, policy || {});
        let budget = Math.max(0, Math.min(limits.dailyNewCap, number(input && input.previousBudget, 2)));
        const unknownRate = number(input && input.unknownRate, NaN);
        const accuracy = number(input && input.retrievalAccuracy, NaN);
        if (Number.isFinite(unknownRate) && unknownRate > limits.unknownRateMax) budget -= 2;
        else if (Number.isFinite(accuracy) && accuracy < limits.accuracyBand[0]) budget -= 1;
        else if (Number.isFinite(accuracy) && accuracy > limits.accuracyBand[1] && unknownRate < 0.10) budget += 1;
        return Math.max(0, Math.min(limits.dailyNewCap, Math.floor(budget)));
    }

    function buildHandoff(rows, limit) {
        const max = Math.max(0, Math.min(10, Math.floor(number(limit, DEFAULT_POLICY.handoffLimit))));
        return (Array.isArray(rows) ? rows : []).slice(0, max).map(function (row) {
            const item = normalizeRecord(row);
            const reasonCode = item.unknownCount > 0 || item.needsReteach
                ? 'repeated-unknown'
                : item.slipCount > 0
                    ? 'lapses'
                    : item.unsureCount > 0 ? 'unsure' : 'practice';
            return Object.assign({}, item, {
                reasonCode: reasonCode,
                reason: reasonCode === 'repeated-unknown' ? '主动选择了不会 / 跳过，需要重新教一遍。'
                    : reasonCode === 'lapses' ? '最近有答错或混淆，适合做对比辨析。'
                        : reasonCode === 'unsure' ? '答对还不够稳定，适合让孩子说一遍。' : '安排一次轻量复习。',
                action: reasonCode === 'repeated-unknown' ? '用实物、动作或图片重新讲一遍，再让孩子说出来。'
                    : reasonCode === 'lapses' ? '只对比两个容易混淆的答案，不连续刷题。'
                        : '遮住选项，请孩子独立读出或说出答案。'
            });
        });
    }

    global.PersonalWorkbenchLearningAdaptation = Object.freeze({
        DEFAULT_POLICY: DEFAULT_POLICY,
        normalizeRecord: normalizeRecord,
        classifyOutcome: classifyOutcome,
        computeNewBudget: computeNewBudget,
        buildHandoff: buildHandoff
    });
}(typeof window !== 'undefined' ? window : globalThis));
