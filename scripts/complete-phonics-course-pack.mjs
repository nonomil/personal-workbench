import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'prj');
const dataDir = path.join(root, 'data', 'preschool', 'english', 'phonics');
const source = { kind: 'project-original', license: 'project-original', attribution: '个人工作台自然拼读课程组' };

const readJson = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const writeJson = (name, value) => fs.writeFileSync(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const lesson = (day, stageId, title, objective, newPatterns, reviewPatterns, activityType, examples, sentenceIds = []) => ({
    id: `preschool-english-phonics-day-${String(day).padStart(3, '0')}`,
    routeId: 'preschool-english-phonics',
    day,
    stageId,
    title,
    objective,
    newPatterns,
    reviewPatterns,
    activityType,
    durationMin: day >= 45 ? 15 : 12,
    coreEligible: true,
    examples,
    sentenceIds,
    reward: { source: 'existing-preschool-activity', kind: 'core', duplicatePolicy: 'canonical-event-id' },
    source
});

const lessons = [
    lesson(21, 'short-vowels-and-families', '短 o 的圆圆声音', '听出短 o，并读出 -ot 词族。', ['short-o', '-ot'], ['short-a', 'short-i', 'cvc-blending'], 'word-family', ['hot', 'pot', 'not'], ['phonics-text-tom-hot']),
    lesson(22, 'short-vowels-and-families', '跳进 -op 词族', '用换首音的方法读 hop、mop、top。', ['-op', 'word-family'], ['short-o', '-ot', 'short-a'], 'word-chain', ['hop', 'mop', 'top'], ['phonics-text-hop-top']),
    lesson(23, 'short-vowels-and-families', '小狗和 -og', '读出 dog、log、fog，并找出中间的短 o。', ['-og'], ['short-o', '-ot', '-op'], 'meaning-match', ['dog', 'log', 'fog'], ['phonics-text-dog-log']),
    lesson(24, 'short-vowels-and-families', '短元音分拣站', '区分短 a、短 i、短 o 的中间音。', ['short-vowel-contrast'], ['short-a', 'short-i', 'short-o', 'word-family'], 'vowel-sort', ['cat', 'sit', 'hot'], ['phonics-text-mixed-vowels']),
    lesson(25, 'short-vowels-and-families', '短 e 的小门', '听出短 e，并读出 -et、-en 词族。', ['short-e', '-et', '-en'], ['short-a', 'short-i', 'short-o'], 'word-family', ['pet', 'get', 'ten'], ['phonics-text-ben-pet']),
    lesson(26, 'short-vowels-and-families', '短 u 的小伞', '听出短 u，并读出 -ug、-un 词族。', ['short-u', '-ug', '-un'], ['short-e', 'short-o'], 'word-family', ['bug', 'mug', 'sun'], ['phonics-text-sun-up']),
    lesson(27, 'short-vowels-and-families', '五个短元音花盆', '把已学 CVC 词按中间元音分类。', ['mixed-short-vowels'], ['short-a', 'short-i', 'short-o', 'short-e', 'short-u'], 'vowel-sort', ['map', 'pin', 'dog', 'pet', 'sun'], ['phonics-text-five-vowels']),
    lesson(28, 'short-vowels-and-families', '词族复习小书', '读混合短元音词，并用图片说出一个词的意思。', ['mixed-cvc-fluency'], ['word-family', 'mixed-short-vowels'], 'decodable-read', ['cat', 'dog', 'pet', 'sun'], ['phonics-text-five-vowels']),
    lesson(29, 'common-digraphs', 'sh 在开头', '认识 sh 的组合音，并读 ship、shop、shut。', ['sh-initial'], ['mixed-short-vowels', 'cvc-blending'], 'digraph-match', ['ship', 'shop', 'shut'], ['phonics-text-ship-shop']),
    lesson(30, 'common-digraphs', 'sh 在词尾', '在 fish、dish 中找到词尾 sh。', ['sh-final'], ['sh-initial', 'short-i'], 'digraph-position', ['fish', 'dish', 'wish'], ['phonics-text-fish-dash']),
    lesson(31, 'common-digraphs', 'ch 小火车', '认识 ch 的组合音，并读 chip、chat、chop。', ['ch-initial'], ['sh-initial', 'short-a', 'short-o'], 'digraph-match', ['chip', 'chat', 'chop'], ['phonics-text-chad-chop']),
    lesson(32, 'common-digraphs', 'ch 换位置', '在 rich、much 中定位词尾 ch。', ['ch-final'], ['ch-initial', 'sh-final'], 'digraph-position', ['rich', 'much', 'such'], ['phonics-text-rich-much']),
    lesson(33, 'common-digraphs', 'th 的轻轻声音', '听辨 th，并读 thin、that、this 中的组合。', ['th'], ['sh', 'ch', 'short-i', 'short-a'], 'digraph-sound-sort', ['thin', 'that', 'this'], ['phonics-text-that-fish']),
    lesson(34, 'common-digraphs', 'ck 结尾咔哒响', '认识 ck 词尾，并读 back、pick、kick。', ['ck'], ['sh', 'ch', 'th', 'short-a', 'short-i'], 'digraph-final', ['back', 'pick', 'kick'], ['phonics-text-jack-kick']),
    lesson(35, 'common-digraphs', 'ng 拉长声音', '认识 ng 词尾，并读 sing、ring、long。', ['ng'], ['ck', 'th', 'short-i', 'short-o'], 'digraph-final', ['sing', 'ring', 'long'], ['phonics-text-king-sing']),
    lesson(36, 'common-digraphs', '组合音复习', '混合识别 sh、ch、th、ck、ng，并配对词义。', ['mixed-digraphs'], ['sh', 'ch', 'th', 'ck', 'ng'], 'digraph-review', ['ship', 'chip', 'thin', 'kick', 'sing'], ['phonics-text-ship-shop', 'phonics-text-king-sing']),
    lesson(37, 'consonant-blends', 'st 站起来', '保持两个辅音的声音，读 stop、step、stand。', ['st'], ['mixed-digraphs', 'short-e', 'short-o'], 'blend-track', ['stop', 'step', 'stand'], ['phonics-text-stop-spin']),
    lesson(38, 'consonant-blends', 'sp 转转转', '读 spin、spot、spun，并听出两个开头音。', ['sp'], ['st', 'short-i', 'short-o', 'short-u'], 'blend-track', ['spin', 'spot', 'spun'], ['phonics-text-stop-spin']),
    lesson(39, 'consonant-blends', 'sl 慢慢滑', '读 slam、slip、slap，不在辅音之间加元音。', ['sl'], ['st', 'sp', 'short-a', 'short-i'], 'blend-track', ['slam', 'slip', 'slap'], ['phonics-text-slam-slip']),
    lesson(40, 'consonant-blends', 'sk 滑过小路', '读 skip、skin、skit，并保持连缀。', ['sk'], ['st', 'sp', 'sl', 'short-i'], 'blend-track', ['skip', 'skin', 'skit'], ['phonics-text-skip-skin']),
    lesson(41, 'consonant-blends', 'nd 手牵手', '读 hand、sand、send，找到词尾 nd。', ['nd'], ['st', 'sp', 'sl', 'sk', 'short-a', 'short-e'], 'blend-final', ['hand', 'sand', 'send'], ['phonics-text-hand-sand']),
    lesson(42, 'consonant-blends', 'nt 小帐篷', '读 tent、mint、pant，找到词尾 nt。', ['nt'], ['nd', 'short-e', 'short-i', 'short-a'], 'blend-final', ['tent', 'mint', 'pant'], ['phonics-text-tent-mint']),
    lesson(43, 'consonant-blends', 'mp 跳一跳', '读 lamp、jump、camp，找到词尾 mp。', ['mp'], ['nd', 'nt', 'short-a', 'short-u'], 'blend-final', ['lamp', 'jump', 'camp'], ['phonics-text-jump-camp']),
    lesson(44, 'consonant-blends', 'ft 轻轻落地', '读 left、gift、soft，找到词尾 ft。', ['ft'], ['nd', 'nt', 'mp', 'short-e', 'short-o'], 'blend-final', ['left', 'gift', 'soft'], ['phonics-text-left-hand']),
    lesson(45, 'decodable-sentences', '两句短元音小路', '先逐词合成，再读两句短元音短文。', ['sentence-reading'], ['mixed-short-vowels', 'cvc-blending'], 'decodable-read', ['Tom got hot.', 'Ben got a pet.'], ['phonics-text-tom-hot', 'phonics-text-ben-pet']),
    lesson(46, 'decodable-sentences', 'sh 和 ch 小故事', '读含 sh/ch 的两句短文，并指出图片线索。', ['sentence-meaning'], ['sh', 'ch', 'short-a', 'short-i'], 'decodable-read', ['Ship is in a shop.', 'Chad can chop.'], ['phonics-text-ship-shop', 'phonics-text-chad-chop']),
    lesson(47, 'decodable-sentences', '组合音侦探', '在短文中圈出 th、ck、ng。', ['sentence-pattern-hunt'], ['th', 'ck', 'ng'], 'pattern-hunt', ['That fish is thin.', 'King can sing.'], ['phonics-text-that-fish', 'phonics-text-king-sing']),
    lesson(48, 'decodable-sentences', 'st 和 sp 赛跑', '读两句含 st/sp 的句子并按动作排序。', ['sentence-fluency'], ['st', 'sp', 'short-i', 'short-o'], 'read-and-order', ['Stop and spin.', 'Stan can skip.'], ['phonics-text-stop-spin', 'phonics-text-stan-skip']),
    lesson(49, 'decodable-sentences', 'sl 和 sk 小路', '读 sl/sk 句子，找出人物正在做的动作。', ['sentence-comprehension'], ['sl', 'sk', 'short-a', 'short-i'], 'read-and-match', ['Slug is on a step.', 'Skip to the skin.'], ['phonics-text-slam-slip', 'phonics-text-skip-skin']),
    lesson(50, 'decodable-sentences', '词尾连缀搬运工', '读含 nd/nt/mp/ft 的句子，指出词尾组合。', ['ending-blend-reading'], ['nd', 'nt', 'mp', 'ft'], 'ending-blend-hunt', ['Hand and tent.', 'Jump and camp.'], ['phonics-text-hand-sand', 'phonics-text-jump-camp']),
    lesson(51, 'decodable-sentences', '四句花园小书', '连续朗读四句短文，并用一张图复述意义。', ['mini-story'], ['mixed-digraphs', 'consonant-blends', 'mixed-short-vowels'], 'mini-story', ['Sam has a red cap.', 'Sam can sit.', 'Sam can tap.', 'Sam can hop.'], ['phonics-text-sam-cap-story']),
    lesson(52, 'decodable-sentences', '读完再回答', '读短文后回答人物、动作或地点问题。', ['meaning-after-reading'], ['sentence-reading', 'mini-story'], 'read-and-answer', ['Who?', 'What?', 'Where?'], ['phonics-text-garden-story']),
    lesson(53, 'transfer-and-review', '我的短元音错音卡', '从个人复习队列中选择一个短元音并重新合成。', ['personal-review'], ['short-a', 'short-i', 'short-o', 'short-e', 'short-u'], 'mistake-review', ['cat', 'pin', 'dog', 'pet', 'sun']),
    lesson(54, 'transfer-and-review', '我的组合音错音卡', '从个人复习队列中复习一个 digraph，并在新词中寻找。', ['personal-review'], ['sh', 'ch', 'th', 'ck', 'ng'], 'mistake-review', ['ship', 'chip', 'thin', 'kick', 'sing']),
    lesson(55, 'transfer-and-review', '我的连缀错音卡', '从个人复习队列中复习一个词首或词尾连缀。', ['personal-review'], ['st', 'sp', 'sl', 'sk', 'nd', 'nt', 'mp', 'ft'], 'mistake-review', ['stop', 'spin', 'slip', 'hand', 'jump']),
    lesson(56, 'transfer-and-review', '新词探险', '用已学规则尝试读三个新词，并记录需要帮助的词。', ['transfer-to-new-words'], ['mixed-short-vowels', 'mixed-digraphs', 'consonant-blends'], 'novel-word-read', ['shop', 'back', 'left']),
    lesson(57, 'transfer-and-review', '制作个人词卡', '选择一个会读的词，完成字母、声音和图片三面卡。', ['word-card'], ['personal-review', 'meaning-match'], 'portfolio-card', ['选择一个词', '画一张图']),
    lesson(58, 'transfer-and-review', '熟悉短文再读一次', '用更顺的节奏重新朗读熟悉短文，不追求速度。', ['fluency-reread'], ['sentence-reading', 'mini-story'], 'reread-with-meaning', ['停顿', '指读', '复述']),
    lesson(59, 'transfer-and-review', '亲子轮流朗读', '孩子读已准备的词或句，家长只在需要时提示。', ['parent-reading'], ['personal-review', 'fluency-reread'], 'parent-read-along', ['我先读', '你来读']),
    lesson(60, 'transfer-and-review', '自然拼读毕业小书', '展示一个词、两句短文和一次迁移应用。', ['mastery-showcase'], ['mixed-review', 'parent-reading'], 'portfolio-showcase', ['词卡', '短文', '生活中的英文词'], ['phonics-text-garden-story'])
];

const wordRows = [
    ['hot', ['h', 'o', 't'], ['h', 'o', 't']], ['pot', ['p', 'o', 't'], ['p', 'o', 't']], ['not', ['n', 'o', 't'], ['n', 'o', 't']], ['hop', ['h', 'o', 'p'], ['h', 'o', 'p']], ['mop', ['m', 'o', 'p'], ['m', 'o', 'p']], ['top', ['t', 'o', 'p'], ['t', 'o', 'p']], ['dog', ['d', 'o', 'g'], ['d', 'o', 'g']], ['log', ['l', 'o', 'g'], ['l', 'o', 'g']], ['fog', ['f', 'o', 'g'], ['f', 'o', 'g']],
    ['pet', ['p', 'e', 't'], ['p', 'e', 't']], ['get', ['g', 'e', 't'], ['g', 'e', 't']], ['ten', ['t', 'e', 'n'], ['t', 'e', 'n']], ['bed', ['b', 'e', 'd'], ['b', 'e', 'd']], ['bug', ['b', 'u', 'g'], ['b', 'u', 'g']], ['mug', ['m', 'u', 'g'], ['m', 'u', 'g']], ['sun', ['s', 'u', 'n'], ['s', 'u', 'n']], ['run', ['r', 'u', 'n'], ['r', 'u', 'n']], ['fun', ['f', 'u', 'n'], ['f', 'u', 'n']],
    ['ship', ['sh', 'i', 'p'], ['sh', 'i', 'p']], ['shop', ['sh', 'o', 'p'], ['sh', 'o', 'p']], ['shut', ['sh', 'u', 't'], ['sh', 'u', 't']], ['fish', ['f', 'i', 'sh'], ['f', 'i', 'sh']], ['dish', ['d', 'i', 'sh'], ['d', 'i', 'sh']], ['wish', ['w', 'i', 'sh'], ['w', 'i', 'sh']],
    ['chip', ['ch', 'i', 'p'], ['ch', 'i', 'p']], ['chat', ['ch', 'a', 't'], ['ch', 'a', 't']], ['chop', ['ch', 'o', 'p'], ['ch', 'o', 'p']], ['rich', ['r', 'i', 'ch'], ['r', 'i', 'ch']], ['much', ['m', 'u', 'ch'], ['m', 'u', 'ch']], ['such', ['s', 'u', 'ch'], ['s', 'u', 'ch']],
    ['thin', ['th', 'i', 'n'], ['th', 'i', 'n']], ['that', ['th', 'a', 't'], ['th', 'a', 't']], ['this', ['th', 'i', 's'], ['th', 'i', 's']], ['back', ['b', 'a', 'ck'], ['b', 'a', 'ck']], ['pick', ['p', 'i', 'ck'], ['p', 'i', 'ck']], ['kick', ['k', 'i', 'ck'], ['k', 'i', 'ck']], ['sing', ['s', 'i', 'ng'], ['s', 'i', 'ng']], ['ring', ['r', 'i', 'ng'], ['r', 'i', 'ng']], ['long', ['l', 'o', 'ng'], ['l', 'o', 'ng']],
    ['stop', ['st', 'o', 'p'], ['s', 't', 'o', 'p']], ['step', ['st', 'e', 'p'], ['s', 't', 'e', 'p']], ['stand', ['st', 'a', 'nd'], ['s', 't', 'a', 'n', 'd']], ['spin', ['sp', 'i', 'n'], ['s', 'p', 'i', 'n']], ['spot', ['sp', 'o', 't'], ['s', 'p', 'o', 't']], ['spun', ['sp', 'u', 'n'], ['s', 'p', 'u', 'n']], ['slam', ['sl', 'a', 'm'], ['s', 'l', 'a', 'm']], ['slip', ['sl', 'i', 'p'], ['s', 'l', 'i', 'p']], ['slap', ['sl', 'a', 'p'], ['s', 'l', 'a', 'p']], ['skip', ['sk', 'i', 'p'], ['s', 'k', 'i', 'p']], ['skin', ['sk', 'i', 'n'], ['s', 'k', 'i', 'n']], ['skit', ['sk', 'i', 't'], ['s', 'k', 'i', 't']], ['hand', ['h', 'a', 'nd'], ['h', 'a', 'n', 'd']], ['sand', ['s', 'a', 'nd'], ['s', 'a', 'n', 'd']], ['send', ['s', 'e', 'nd'], ['s', 'e', 'n', 'd']], ['tent', ['t', 'e', 'nt'], ['t', 'e', 'n', 't']], ['mint', ['m', 'i', 'nt'], ['m', 'i', 'n', 't']], ['pant', ['p', 'a', 'nt'], ['p', 'a', 'n', 't']], ['lamp', ['l', 'a', 'mp'], ['l', 'a', 'm', 'p']], ['jump', ['j', 'u', 'mp'], ['j', 'u', 'm', 'p']], ['camp', ['c', 'a', 'mp'], ['c', 'a', 'm', 'p']], ['left', ['l', 'e', 'ft'], ['l', 'e', 'f', 't']], ['gift', ['g', 'i', 'ft'], ['g', 'i', 'f', 't']], ['soft', ['s', 'o', 'ft'], ['s', 'o', 'f', 't']]
];

const sentenceRows = [
    ['phonics-text-tom-hot', 'Tom got hot.', ['t', 'o', 'm', 'g', 'h'], [], 100, 'short-vowels-and-families'],
    ['phonics-text-hop-top', 'Hop on top.', ['h', 'o', 'p', 't'], ['on'], 80, 'short-vowels-and-families'],
    ['phonics-text-dog-log', 'A dog is on a log.', ['d', 'o', 'g', 'i', 's', 'n', 'l'], ['A', 'is', 'on', 'a'], 60, 'short-vowels-and-families'],
    ['phonics-text-mixed-vowels', 'A cat can sit.', ['c', 'a', 't', 'n', 's', 'i'], ['A', 'can'], 75, 'short-vowels-and-families'],
    ['phonics-text-ben-pet', 'Ben got a pet.', ['b', 'e', 'n', 'g', 'o', 't', 'p'], ['a'], 86, 'short-vowels-and-families'],
    ['phonics-text-sun-up', 'Sun is up.', ['s', 'u', 'n', 'i', 'p'], ['is'], 80, 'short-vowels-and-families'],
    ['phonics-text-five-vowels', 'A cat, a pig, a dog, a pet, and a sun.', ['c', 'a', 't', 'p', 'i', 'g', 'd', 'o', 'g', 'e', 's', 'u', 'n'], ['A', 'a', 'and'], 55, 'short-vowels-and-families'],
    ['phonics-text-ship-shop', 'Ship is in a shop.', ['sh', 'i', 'p', 's', 'n', 'a', 'o'], ['is', 'in', 'a'], 78, 'common-digraphs'],
    ['phonics-text-fish-dash', 'Fish can dash.', ['f', 'i', 'sh', 'c', 'a', 'n', 'd'], ['can'], 86, 'common-digraphs'],
    ['phonics-text-chad-chop', 'Chad can chop.', ['ch', 'a', 'd', 'c', 'o', 'p'], ['can'], 92, 'common-digraphs'],
    ['phonics-text-rich-much', 'Rich has much.', ['r', 'i', 'ch', 'h', 'a', 's', 'm', 'u'], ['has'], 80, 'common-digraphs'],
    ['phonics-text-that-fish', 'That fish is thin.', ['th', 'a', 't', 'f', 'i', 'sh', 's', 'n'], ['is'], 82, 'common-digraphs'],
    ['phonics-text-jack-kick', 'Jack can kick.', ['j', 'a', 'ck', 'c', 'n', 'i'], ['can'], 88, 'common-digraphs'],
    ['phonics-text-king-sing', 'King can sing.', ['k', 'i', 'ng', 'c', 'n', 's'], ['can'], 88, 'common-digraphs'],
    ['phonics-text-stop-spin', 'Stop and spin.', ['st', 'o', 'p', 'sp', 'i', 'n'], ['and'], 88, 'consonant-blends'],
    ['phonics-text-stan-skip', 'Stan can skip.', ['st', 'a', 'n', 'c', 'sk', 'i', 'p'], ['can'], 90, 'consonant-blends'],
    ['phonics-text-slam-slip', 'Slam and slip.', ['sl', 'a', 'm', 'nd', 'i', 'p'], ['and'], 86, 'consonant-blends'],
    ['phonics-text-skip-skin', 'Skip to the skin.', ['sk', 'i', 'p', 't', 'o', 'th', 'e', 'n'], ['to', 'the'], 70, 'consonant-blends'],
    ['phonics-text-hand-sand', 'Hand and sand.', ['h', 'a', 'nd', 's', 'd'], ['and'], 88, 'consonant-blends'],
    ['phonics-text-tent-mint', 'A tent has mint.', ['t', 'e', 'nt', 'h', 'a', 's', 'm', 'i'], ['A', 'has'], 75, 'consonant-blends'],
    ['phonics-text-jump-camp', 'Jump and camp.', ['j', 'u', 'mp', 'a', 'nd', 'c'], ['and'], 88, 'consonant-blends'],
    ['phonics-text-left-hand', 'Left hand.', ['l', 'e', 'ft', 'h', 'a', 'nd'], [], 100, 'consonant-blends'],
    ['phonics-text-sam-cap-story', 'Sam has a red cap. Sam can sit. Sam can tap. Sam can hop.', ['s', 'a', 'm', 'h', 'r', 'e', 'd', 'c', 'p', 'n', 'i', 't', 'o'], ['has', 'a', 'can'], 72, 'decodable-sentences'],
    ['phonics-text-garden-story', 'A cat can fish. A dog can run. The sun is hot.', ['c', 'a', 't', 'n', 'f', 'i', 'sh', 'd', 'o', 'g', 'r', 'u', 'th', 's', 'h'], ['A', 'can', 'The', 'is'], 68, 'decodable-sentences']
];

const words = readJson('word-bank.json');
const knownWordIds = new Set(words.map(item => item.id));
for (const [index, [text, graphemes, phonemes]] of wordRows.entries()) {
    const id = `word-${text.toLowerCase()}`;
    const stageId = index < 18 ? 'short-vowels-and-families' : index < 39 ? 'common-digraphs' : 'consonant-blends';
    if (!knownWordIds.has(id)) words.push({ id, text, graphemes, phonemes, stageId, source });
}
writeJson('word-bank.json', words);

const sentences = readJson('sentence-bank.json');
const legacySentenceMap = {
    'phonics-text-001': 'phonics-text-sam-sat',
    'phonics-text-002': 'phonics-text-pat-sat',
    'phonics-text-003': 'phonics-text-mat',
    'phonics-text-004': 'phonics-text-map',
    'phonics-text-005': 'phonics-text-cat-sat',
    'phonics-text-006': 'phonics-text-sit',
    'phonics-text-007': 'phonics-text-pin',
    'phonics-text-008': 'phonics-text-hat',
    'phonics-text-009': 'phonics-text-dip',
    'phonics-text-010': 'phonics-text-bat',
    'phonics-text-011': 'phonics-text-man',
    'phonics-text-012': 'phonics-text-ham',
    'phonics-text-013': 'phonics-text-hat',
    'phonics-text-014': 'phonics-text-bat',
    'phonics-text-015': 'phonics-text-sam-sat',
    'phonics-text-016': 'phonics-text-pat-sat'
};
const knownSentenceIds = new Set(sentences.map(item => item.id));
for (const [id, text, allowedPatterns, trickyWords, decodabilityPercent, stageId] of sentenceRows) {
    if (!knownSentenceIds.has(id)) sentences.push({ id, text, allowedPatterns, trickyWords, decodabilityPercent, stageId, source });
}
writeJson('sentence-bank.json', sentences);

const currentLessons = readJson('lessons.json');
for (const item of currentLessons) {
    item.sentenceIds = (item.sentenceIds ?? []).map(id => legacySentenceMap[id] ?? id);
    item.reward = { ...(item.reward ?? {}), source: 'existing-preschool-activity', kind: 'core', duplicatePolicy: 'canonical-event-id' };
    item.source = { ...item.source, ...source };
}
const existingDays = new Set(currentLessons.map(item => item.day));
for (const item of lessons) if (!existingDays.has(item.day)) currentLessons.push(item);
currentLessons.sort((a, b) => a.day - b.day);
writeJson('lessons.json', currentLessons);

console.log(`completed phonics pack: ${currentLessons.length} lessons, ${words.length} words, ${sentences.length} sentences`);
