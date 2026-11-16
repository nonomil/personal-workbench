(function (global) {
    'use strict';

    function createClock() {
        let paused = false;
        let nextId = 1;
        let tasks = [];

        function schedule(callback, delayMs) {
            if (typeof callback !== 'function') throw new TypeError('Clock callback must be a function');
            const task = {
                id: nextId++,
                callback: callback,
                remaining: Math.max(0, Number(delayMs) || 0)
            };
            tasks.push(task);
            return task.id;
        }

        function cancel(id) {
            const before = tasks.length;
            tasks = tasks.filter(function (task) { return task.id !== id; });
            return tasks.length !== before;
        }

        function setPaused(value) {
            paused = Boolean(value);
        }

        function tick(elapsedMs) {
            if (paused || !tasks.length) return 0;
            const elapsed = Math.max(0, Number(elapsedMs) || 0);
            const ready = [];
            tasks.forEach(function (task) {
                task.remaining -= elapsed;
                if (task.remaining <= 0) ready.push(task);
            });
            if (!ready.length) return 0;
            const readyIds = new Set(ready.map(function (task) { return task.id; }));
            tasks = tasks.filter(function (task) { return !readyIds.has(task.id); });
            ready.forEach(function (task) { task.callback(); });
            return ready.length;
        }

        function clear() {
            tasks = [];
        }

        function snapshot() {
            return { paused: paused, pending: tasks.length };
        }

        return Object.freeze({
            schedule: schedule,
            cancel: cancel,
            setPaused: setPaused,
            tick: tick,
            clear: clear,
            snapshot: snapshot
        });
    }

    function runSimulationSteps(canContinue, steps, elapsedMs) {
        const list = Array.isArray(steps) ? steps : [];
        let completed = 0;
        for (let index = 0; index < list.length; index += 1) {
            if (typeof canContinue === 'function' && !canContinue()) break;
            if (typeof list[index] !== 'function') continue;
            list[index](elapsedMs);
            completed += 1;
        }
        return completed;
    }

    function createAttemptRecorder(bridge) {
        const recorded = new Set();
        const pending = new Map();

        function persist(entry) {
            if (!entry || !bridge) return false;
            try {
                let result = null;
                if (entry.card.track === 'hanzi' && typeof bridge.recordSubjectAnswer === 'function') {
                    result = bridge.recordSubjectAnswer('literacy', entry.card.key, entry.correct);
                } else if (entry.card.track === 'word' && typeof bridge.recordWordAnswer === 'function') {
                    result = bridge.recordWordAnswer(entry.card.key, entry.correct, {
                        source: 'learning-defense',
                        cardId: entry.card.id
                    });
                }
                return Boolean(result);
            } catch (error) {
                return false;
            }
        }

        function record(card, correct) {
            const id = String(card && card.id || '').trim();
            if (!id) return false;
            if (recorded.has(id)) return true;
            const entry = { card: card, correct: Boolean(correct) };
            pending.set(id, entry);
            if (!persist(entry)) return false;
            pending.delete(id);
            recorded.add(id);
            return true;
        }

        function flush() {
            let saved = 0;
            Array.from(pending.entries()).forEach(function (pair) {
                const id = pair[0];
                const entry = pair[1];
                if (!persist(entry)) return;
                pending.delete(id);
                recorded.add(id);
                saved += 1;
            });
            return saved;
        }

        function snapshot() {
            return { recorded: recorded.size, pending: pending.size };
        }

        return Object.freeze({ record: record, flush: flush, snapshot: snapshot });
    }

    global.LearningDefenseRuntime = Object.freeze({
        createClock: createClock,
        runSimulationSteps: runSimulationSteps,
        createAttemptRecorder: createAttemptRecorder
    });
}(typeof window !== 'undefined' ? window : globalThis));
