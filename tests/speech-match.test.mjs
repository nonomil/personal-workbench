import assert from 'node:assert/strict';
import test from 'node:test';

await import('../prj/games/shared/speech-match.js');
const M = globalThis.SpeechMatch;

function words(n) {
  return Array.from({ length: n }, (_, i) => `w${String(i).padStart(2, '0')}`).join(' ');
}

function take(n, total) {
  return Array.from({ length: n }, (_, i) => `w${String(i).padStart(2, '0')}`).join(' ');
}

test('namespace exposes tokenize, lemma, lcsCoverage and evaluate', () => {
  assert.equal(typeof M, 'object');
  assert.equal(typeof M.tokenize, 'function');
  assert.equal(typeof M.lemma, 'function');
  assert.equal(typeof M.lcsCoverage, 'function');
  assert.equal(typeof M.evaluate, 'function');
});

test('tokenize keeps contractions, drops digits and CJK, keeps character spans', () => {
  const mixed = M.tokenize("Don't eat 2 apples，你好");
  assert.deepEqual(mixed.map((t) => t.word), ['don\'t', 'eat', 'apples']);
  assert.equal(mixed[0].start, 0);
  assert.equal(mixed[0].end, 5);
  assert.equal(mixed[2].lemma, 'apple');

  assert.deepEqual(M.tokenize('你好世界').map((t) => t.word), []);
  assert.deepEqual(M.tokenize('').map((t) => t.word), []);
});

test('lemma uses irregular table then suffix rules including doubled consonants', () => {
  assert.equal(M.lemma('went'), 'go');
  assert.equal(M.lemma('children'), 'child');
  assert.equal(M.lemma('mice'), 'mouse');
  assert.equal(M.lemma('better'), 'good');
  assert.equal(M.lemma('apples'), 'apple');
  assert.equal(M.lemma('boxes'), 'box');
  assert.equal(M.lemma('flies'), 'fly');
  assert.equal(M.lemma('walked'), 'walk');
  assert.equal(M.lemma('running'), 'run');
  assert.equal(M.lemma('playing'), 'play');
  assert.equal(M.lemma('Apple'), 'apple');
  assert.equal(M.lemma('xyzzy'), 'xyzzy');
});

test('LCS is order-preserving: scrambled sentence matches 3 of 6', () => {
  const ref = M.tokenize('the cat sat on the mat').map((t) => t.lemma);
  const hyp = M.tokenize('mat the cat sat').map((t) => t.lemma);
  const cover = M.lcsCoverage(ref, hyp);
  assert.equal(cover.matchedCount, 3);
  assert.equal(cover.totalTarget, 6);
  assert.equal(cover.score, 0.5);
  assert.ok(Array.isArray(cover.referenceIndexes));
  assert.ok(Array.isArray(cover.transcriptIndexes));
  assert.equal(cover.referenceIndexes.length, 3);
});

test('evaluate reports noEnglishDetected when the transcript has no English tokens', () => {
  const result = M.evaluate('the cat sat', '你好', 'sentence');
  assert.equal(result.status, 'noEnglishDetected');
  assert.equal(result.score, 0);
  assert.equal(result.pass, false);
  assert.equal(result.rating, 'KeepGoing');
});

test('word scene passes when lemmas match and fails on a different word', () => {
  const hit = M.evaluate('apple', 'apples', 'word');
  assert.equal(hit.pass, true);
  assert.equal(hit.score, 1);
  assert.equal(hit.rating, 'Perfect');

  const miss = M.evaluate('apple', 'banana', 'word');
  assert.equal(miss.pass, false);
  assert.equal(miss.score, 0);
});

test('sentence scene uses listen-and-repeat thresholds and 0.5 flow pass', () => {
  const ref20 = words(20);
  const perfect = M.evaluate(ref20, take(19, 20), 'sentence');
  assert.equal(perfect.score, 0.95);
  assert.equal(perfect.rating, 'Perfect');
  assert.equal(perfect.pass, true);

  const excellent = M.evaluate(ref20, take(16, 20), 'sentence');
  assert.equal(excellent.score, 0.8);
  assert.equal(excellent.rating, 'Excellent');

  const good = M.evaluate(ref20, take(12, 20), 'sentence');
  assert.equal(good.score, 0.6);
  assert.equal(good.rating, 'Good');

  const fairPass = M.evaluate(ref20, take(10, 20), 'sentence');
  assert.equal(fairPass.score, 0.5);
  assert.equal(fairPass.rating, 'Fair');
  assert.equal(fairPass.pass, true);

  const fairFail = M.evaluate(ref20, take(8, 20), 'sentence');
  assert.equal(fairFail.score, 0.4);
  assert.equal(fairFail.rating, 'Fair');
  assert.equal(fairFail.pass, false);

  const keep = M.evaluate(ref20, take(7, 20), 'sentence');
  assert.equal(keep.rating, 'KeepGoing');
  assert.equal(keep.pass, false);
});

test('retell scene uses wider thresholds and 0.4 flow pass', () => {
  const ref20 = words(20);
  const perfect = M.evaluate(ref20, take(18, 20), 'retell');
  assert.equal(perfect.score, 0.9);
  assert.equal(perfect.rating, 'Perfect');

  const excellent = M.evaluate(ref20, take(15, 20), 'retell');
  assert.equal(excellent.score, 0.75);
  assert.equal(excellent.rating, 'Excellent');

  const good = M.evaluate(ref20, take(10, 20), 'retell');
  assert.equal(good.score, 0.5);
  assert.equal(good.rating, 'Good');
  assert.equal(good.pass, true);

  const fair = M.evaluate(ref20, take(8, 20), 'retell');
  assert.equal(fair.score, 0.4);
  assert.equal(fair.rating, 'Fair');
  assert.equal(fair.pass, true);

  const keep = M.evaluate(ref20, take(4, 20), 'retell');
  assert.equal(keep.score, 0.2);
  assert.equal(keep.rating, 'Fair');
  assert.equal(keep.pass, false);
});

test('starsFromRating maps Perfect/Excellent to 3, Good to 2, Fair to 1', () => {
  assert.equal(M.starsFromRating('Perfect'), 3);
  assert.equal(M.starsFromRating('Excellent'), 3);
  assert.equal(M.starsFromRating('Good'), 2);
  assert.equal(M.starsFromRating('Fair'), 1);
  assert.equal(M.starsFromRating('KeepGoing'), 0);
});

test('evaluate segments keep source spans and mark LCS hits', () => {
  const result = M.evaluate('the cat sat', 'the dog sat', 'sentence');
  const refWords = result.referenceSegments.filter((s) => /[A-Za-z]/.test(s.text));
  assert.equal(refWords.length, 3);
  assert.equal(refWords[0].isMatched, true);
  assert.equal(refWords[1].isMatched, false);
  assert.equal(refWords[2].isMatched, true);
  assert.ok(result.referenceSegments.some((s) => s.text === ' ' && s.isMatched === false));

  const hypWords = result.transcriptSegments.filter((s) => /[A-Za-z]/.test(s.text));
  assert.equal(hypWords[0].isMatched, true);
  assert.equal(hypWords[1].isMatched, false);
  assert.equal(hypWords[2].isMatched, true);
});
