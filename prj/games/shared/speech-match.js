/**
 * 共享跟读评测（T20260819-E1-speech-match S1）
 * tokenize + lemma + LCS 覆盖率 + 分场景阈值。
 * 无 DOM / 无 fetch。浏览器挂 window.SpeechMatch，node 可 import。
 *
 * 不规则表：core-english-2026.08.15 词表里会出现的屈折 + 测试合同词。
 * 参数口径：docs/plans/T20260819-echoloop-borrow/04-机制参数速查.md
 */
(function (global) {
    'use strict';

    var TOKEN_RE = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

    // 来源：catalog 597 词中的不规则屈折 + 幼儿会说出口的常见变形。
    var IRREGULAR = {
        am: 'be',
        are: 'be',
        is: 'be',
        was: 'be',
        were: 'be',
        been: 'be',
        being: 'be',
        ate: 'eat',
        eaten: 'eat',
        better: 'good',
        best: 'good',
        bought: 'buy',
        brought: 'bring',
        came: 'come',
        children: 'child',
        could: 'can',
        did: 'do',
        does: 'do',
        done: 'do',
        feet: 'foot',
        fell: 'fall',
        felt: 'feel',
        flew: 'fly',
        found: 'find',
        gave: 'give',
        given: 'give',
        goes: 'go',
        going: 'go',
        gone: 'go',
        got: 'get',
        gotten: 'get',
        had: 'have',
        has: 'have',
        heard: 'hear',
        held: 'hold',
        kept: 'keep',
        knew: 'know',
        known: 'know',
        made: 'make',
        men: 'man',
        mice: 'mouse',
        ran: 'run',
        said: 'say',
        sat: 'sit',
        saw: 'see',
        seen: 'see',
        slept: 'sleep',
        spoke: 'speak',
        spoken: 'speak',
        stood: 'stand',
        swam: 'swim',
        taken: 'take',
        thought: 'think',
        told: 'tell',
        took: 'take',
        went: 'go',
        woke: 'wake',
        women: 'woman',
        wore: 'wear',
        would: 'will',
        wrote: 'write',
        written: 'write'
    };

    var VOWEL = /[aeiou]/;

    function isCons(ch) {
        return ch && !VOWEL.test(ch);
    }

    function undouble(stem) {
        var n = stem.length;
        if (n >= 3 && stem.charAt(n - 1) === stem.charAt(n - 2) && isCons(stem.charAt(n - 1)) && VOWEL.test(stem.charAt(n - 3))) {
            return stem.slice(0, -1);
        }
        return stem;
    }

    function lemma(form) {
        var word = String(form || '').toLowerCase();
        if (!word) return '';
        if (Object.prototype.hasOwnProperty.call(IRREGULAR, word)) return IRREGULAR[word];

        if (word.length >= 5 && word.slice(-3) === 'ies') {
            return word.slice(0, -3) + 'y';
        }
        if (word.length >= 5 && word.slice(-2) === 'es') {
            var stemEs = word.slice(0, -2);
            var tail = stemEs.slice(-2);
            var last = stemEs.charAt(stemEs.length - 1);
            if (last === 's' || last === 'x' || last === 'z' || tail === 'ch' || tail === 'sh') {
                return stemEs;
            }
        }
        if (word.length >= 4 && word.charAt(word.length - 1) === 's' && word.slice(-2) !== 'ss') {
            return word.slice(0, -1);
        }
        if (word.length >= 5 && word.slice(-2) === 'ed') {
            return undouble(word.slice(0, -2));
        }
        if (word.length >= 6 && word.slice(-3) === 'ing') {
            return undouble(word.slice(0, -3));
        }
        return word;
    }

    function tokenize(text) {
        var src = String(text || '');
        var tokens = [];
        TOKEN_RE.lastIndex = 0;
        var match;
        while ((match = TOKEN_RE.exec(src))) {
            var raw = match[0];
            var word = raw.toLowerCase();
            var base = lemma(word);
            if (!base) continue;
            tokens.push({
                word: word,
                lemma: base,
                start: match.index,
                end: match.index + raw.length
            });
        }
        return tokens;
    }

    function lcsCoverage(refTokens, hypTokens) {
        var ref = refTokens || [];
        var hyp = hypTokens || [];
        var n = ref.length;
        var m = hyp.length;
        var dp = [];
        var i;
        var j;
        for (i = 0; i <= n; i++) {
            dp[i] = [];
            for (j = 0; j <= m; j++) dp[i][j] = 0;
        }
        for (i = 1; i <= n; i++) {
            for (j = 1; j <= m; j++) {
                if (ref[i - 1] === hyp[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = dp[i - 1][j] > dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
            }
        }
        var referenceIndexes = [];
        var transcriptIndexes = [];
        i = n;
        j = m;
        while (i > 0 && j > 0) {
            if (ref[i - 1] === hyp[j - 1]) {
                referenceIndexes.push(i - 1);
                transcriptIndexes.push(j - 1);
                i--;
                j--;
            } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        referenceIndexes.reverse();
        transcriptIndexes.reverse();
        var matchedCount = referenceIndexes.length;
        var totalTarget = n;
        return {
            matchedCount: matchedCount,
            totalTarget: totalTarget,
            score: totalTarget === 0 ? 0 : matchedCount / totalTarget,
            referenceIndexes: referenceIndexes,
            transcriptIndexes: transcriptIndexes
        };
    }

    var SENTENCE_BANDS = [
        { rating: 'Perfect', min: 0.95 },
        { rating: 'Excellent', min: 0.8 },
        { rating: 'Good', min: 0.6 },
        { rating: 'Fair', min: 0.4 }
    ];
    var RETELL_BANDS = [
        { rating: 'Perfect', min: 0.9 },
        { rating: 'Excellent', min: 0.75 },
        { rating: 'Good', min: 0.5 },
        { rating: 'Fair', min: 0.2 }
    ];

    function ratingOf(score, scene) {
        var bands = scene === 'retell' ? RETELL_BANDS : SENTENCE_BANDS;
        for (var i = 0; i < bands.length; i++) {
            if (score >= bands[i].min) return bands[i].rating;
        }
        return 'KeepGoing';
    }

    function passOf(score, scene) {
        if (scene === 'word') return score === 1;
        if (scene === 'retell') return score >= 0.4;
        return score >= 0.5;
    }

    function buildSegments(text, tokens, matchedIndexes) {
        var src = String(text || '');
        var hit = {};
        (matchedIndexes || []).forEach(function (idx) { hit[idx] = true; });
        var segments = [];
        var cursor = 0;
        tokens.forEach(function (token, i) {
            if (cursor < token.start) {
                segments.push({ text: src.slice(cursor, token.start), isMatched: false });
            }
            segments.push({ text: src.slice(token.start, token.end), isMatched: !!hit[i] });
            cursor = token.end;
        });
        if (cursor < src.length) {
            segments.push({ text: src.slice(cursor), isMatched: false });
        }
        return segments;
    }

    function starsFromRating(rating) {
        if (rating === 'Perfect' || rating === 'Excellent') return 3;
        if (rating === 'Good') return 2;
        if (rating === 'Fair') return 1;
        return 0;
    }

    function evaluate(referenceText, transcript, scene) {
        var mode = scene || 'sentence';
        var refTokens = tokenize(referenceText);
        var hypTokens = tokenize(transcript);
        if (hypTokens.length === 0) {
            return {
                status: 'noEnglishDetected',
                score: 0,
                matchedCount: 0,
                totalTarget: refTokens.length,
                pass: false,
                rating: 'KeepGoing',
                referenceSegments: buildSegments(referenceText, refTokens, []),
                transcriptSegments: buildSegments(transcript, hypTokens, [])
            };
        }
        var cover = lcsCoverage(
            refTokens.map(function (t) { return t.lemma; }),
            hypTokens.map(function (t) { return t.lemma; })
        );
        var score = cover.score;
        return {
            status: passOf(score, mode) ? 'passed' : 'belowThreshold',
            score: score,
            matchedCount: cover.matchedCount,
            totalTarget: cover.totalTarget,
            pass: passOf(score, mode),
            rating: ratingOf(score, mode),
            referenceSegments: buildSegments(referenceText, refTokens, cover.referenceIndexes),
            transcriptSegments: buildSegments(transcript, hypTokens, cover.transcriptIndexes)
        };
    }

    global.SpeechMatch = {
        tokenize: tokenize,
        lemma: lemma,
        lcsCoverage: lcsCoverage,
        evaluate: evaluate,
        starsFromRating: starsFromRating,
        IRREGULAR: IRREGULAR
    };
}(typeof window !== 'undefined' ? window : globalThis));
