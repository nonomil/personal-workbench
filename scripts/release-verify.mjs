import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const CONTENT_ROOT = path.join(PROJECT_ROOT, 'prj');

export const PRESCHOOL_THEMES = [
  'garden-defense',
  'voxel-adventure',
  'platform-quest'
];

export const GENERAL_VARIANTS = ['adult', 'child'];

const LAUNCHER_CARDS = [
  {
    variant: 'preschool',
    theme: 'garden-defense',
    href: './preschool-workbench/index.html?theme=garden-defense',
    asset: './assets/generated/preschool-pvz-2d/background/published/pvz-garden-lawn-bg.png'
  },
  {
    variant: 'preschool',
    theme: 'voxel-adventure',
    href: './preschool-workbench/index.html?theme=voxel-adventure',
    asset: './assets/generated/preschool-theme-assets/voxel-v2/reference/voxel-hero.png'
  },
  {
    variant: 'preschool',
    theme: 'platform-quest',
    href: './preschool-workbench/index.html?theme=platform-quest',
    asset: './assets/generated/preschool-theme-assets/platform-v2/reference/platform-page-bg.webp'
  },
  {
    variant: 'adult',
    href: './成人成长工作台/index.html',
    asset: './assets/generated/workbench-hero-adult.webp'
  },
  {
    variant: 'child',
    href: './儿童学习工作台/index.html',
    asset: './assets/generated/workbench-hero-child.webp'
  }
];

const RUNTIME_VERSION_FILES = [
  'config.js',
  '成人成长工作台/index.html',
  '儿童学习工作台/index.html',
  'preschool-workbench/index.html'
];

function readLauncherHtml(contentRoot) {
  return fs.readFileSync(path.join(contentRoot, 'index.html'), 'utf8');
}

function sourcePathForHref(contentRoot, href) {
  const withoutPrefix = href.replace(/^\.\//, '').split('?')[0];
  return path.join(contentRoot, ...withoutPrefix.split('/'));
}

function addError(errors, condition, message) {
  if (!condition) errors.push(message);
}

export function verifyLauncherContract(projectRoot = PROJECT_ROOT) {
  const errors = [];
  const contentRoot = path.join(projectRoot, 'prj');
  let html = '';
  let version = null;

  try {
    html = readLauncherHtml(contentRoot);
  } catch (error) {
    return {
      ok: false,
      errors: [`无法读取 prj/index.html：${error.message}`],
      preschoolThemes: [],
      generalVariants: [],
      checkedAssets: 0
    };
  }

  const preschoolGroup = html.indexOf('data-launcher-group="preschool-worlds"');
  const generalGroup = html.indexOf('data-launcher-group="general-workbenches"');
  addError(errors, preschoolGroup >= 0, '缺少幼儿游戏世界分组');
  addError(errors, generalGroup >= 0, '缺少成人与少儿工作台分组');
  addError(errors, preschoolGroup >= 0 && generalGroup > preschoolGroup, '入口分组顺序不是幼儿在前、通用在后');

  const preschoolThemes = [...html.matchAll(/data-workbench-variant="preschool" data-workbench-theme="([^"]+)" href="([^"]+)"/g)].map((match) => match[1]);
  const preschoolHrefs = [...html.matchAll(/data-workbench-variant="preschool" data-workbench-theme="([^"]+)" href="([^"]+)"/g)].map((match) => match[2]);
  const generalVariants = [...html.matchAll(/data-workbench-variant="(adult|child)" href="([^"]+)"/g)].map((match) => match[1]);
  const generalHrefs = [...html.matchAll(/data-workbench-variant="(adult|child)" href="([^"]+)"/g)].map((match) => match[2]);

  addError(errors, JSON.stringify(preschoolThemes) === JSON.stringify(PRESCHOOL_THEMES), `幼儿主题顺序或数量错误：${preschoolThemes.join(', ')}`);
  addError(errors, JSON.stringify(generalVariants) === JSON.stringify(GENERAL_VARIANTS), `通用入口顺序或数量错误：${generalVariants.join(', ')}`);

  for (const card of LAUNCHER_CARDS) {
    addError(errors, html.includes(`href="${card.href}"`), `入口缺少链接：${card.href}`);
    addError(errors, html.includes(`src="${card.asset}"`), `入口缺少卡片素材引用：${card.asset}`);
    addError(errors, fs.existsSync(sourcePathForHref(contentRoot, card.href)), `入口目标不存在：${card.href}`);
    addError(errors, fs.existsSync(sourcePathForHref(contentRoot, card.asset)), `卡片素材文件不存在：${card.asset}`);
  }

  addError(errors, html.includes('launcher.js'), '入口未加载 launcher.js');
  addError(errors, html.includes('choose=1'), '入口缺少重新选择入口');

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'));
    version = String(packageJson.version || '');
    addError(errors, /^\d+\.\d+\.\d+$/.test(version), `package.json 版本号无效：${version}`);
    addError(errors, packageLock.version === packageJson.version, 'package.json 与 package-lock.json 版本不一致');
    addError(errors, packageLock.packages?.['']?.version === packageJson.version, 'package-lock 根包版本不一致');
    for (const relativePath of RUNTIME_VERSION_FILES) {
      const runtimeText = fs.readFileSync(path.join(contentRoot, relativePath), 'utf8');
      addError(errors, runtimeText.includes(`v${version}`), `prj/${relativePath} 未包含 v${version} 版本标识`);
    }
  } catch (error) {
    errors.push(`无法验证版本合同：${error.message}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    version,
    preschoolThemes,
    preschoolHrefs,
    generalVariants,
    generalHrefs,
    checkedAssets: LAUNCHER_CARDS.length,
    contentRoot: CONTENT_ROOT
  };
}

function isDirectInvocation() {
  return process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT_PATH);
}

// ── 素材白名单 ─────────────────────────────────────────────
// 商标形象(马里奥/史蒂夫/苦力怕)只允许本地自用:可以留在工作树,但必须被 git
// ignore(不入库、不随 git 发布制品出去);主角发布槽位必须与 papermc 原创备份逐字节一致。

export const TRADEMARK_NAME_RE = /mario|steve|creeper/i;

export const HERO_SLOT_CONTRACTS = [
  {
    game: 'platform-quest',
    slots: ['explorer-idle.png', 'explorer-walk-a.png', 'explorer-walk-b.png', 'explorer-jump.png']
  },
  {
    game: 'voxel-adventure',
    slots: ['explorer-idle.png', 'explorer-walk-a.png', 'explorer-walk-b.png', 'explorer-jump.png', 'explorer-mine.png']
  }
];

function walkFiles(root, out = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

export function md5FileSync(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
}

function gitIgnored(projectRoot, relativePath, git) {
  const result = git(['check-ignore', '--', relativePath], projectRoot);
  return result.status === 0;
}

export function verifyAssetAllowlist(projectRoot = PROJECT_ROOT, options = {}) {
  const errors = [];
  const contentRoot = path.join(projectRoot, 'prj');
  const git = options.git || function gitFn(args, cwd) {
    return spawnSync('git', args, { cwd, encoding: 'utf8' });
  };

  try {
    const files = walkFiles(contentRoot);

    // 规则A:商标命名文件必须被 git ignore(未 ignore = 会入库发布 = 违规)
    const offenders = files.filter((file) => TRADEMARK_NAME_RE.test(path.basename(file)));
    for (const file of offenders) {
      const rel = path.relative(projectRoot, file).split(path.sep).join('/');
      if (/(?:^|\/)(?:vocab|vocab-mc|英语)\//.test(rel) || rel.includes('/assets/vocab/') || rel.includes('/assets/img/vocab-mc/') || rel.includes('/assets/audio/vocab-mc/')) {
        continue;
      }
      if (!gitIgnored(projectRoot, rel, git)) {
        errors.push(`商标命名素材未被 git ignore,会进入发布制品:${rel}`);
      }
    }

    // 规则B:主角发布槽位必须等于 papermc 原创备份(md5)
    for (const contract of HERO_SLOT_CONTRACTS) {
      const heroDir = path.join(contentRoot, 'games', contract.game, 'assets', 'hero');
      const backupDir = path.join(heroDir, 'papermc');
      for (const slot of contract.slots) {
        const slotPath = path.join(heroDir, slot);
        const backupPath = path.join(backupDir, slot);
        if (!fs.existsSync(backupPath)) {
          errors.push(`缺少原创主角备份,无法校验槽位:${path.relative(projectRoot, backupPath)}`);
          continue;
        }
        if (!fs.existsSync(slotPath)) {
          errors.push(`主角槽位缺失:${path.relative(projectRoot, slotPath)}`);
          continue;
        }
        if (md5FileSync(slotPath) !== md5FileSync(backupPath)) {
          errors.push(`主角槽位不是原创备份内容(疑似本地形象覆盖未还原):${path.relative(projectRoot, slotPath)}`);
        }
      }
    }

    // 规则C:本地参考仓 ref/ 必须被 ignore
    if (fs.existsSync(path.join(contentRoot, 'games', 'ref')) && !gitIgnored(projectRoot, 'prj/games/ref', git)) {
      errors.push('prj/games/ref/ 存在但未被 git ignore(商标素材原件会入库)');
    }

    // 规则D:platform 马里奥槽位(jumper-*,中性名)存在则必须被 ignore
    const jumperDir = path.join(contentRoot, 'games', 'platform-quest', 'assets', 'hero');
    if (fs.existsSync(jumperDir)) {
      for (const name of fs.readdirSync(jumperDir)) {
        if (/^jumper-.*\.png$/.test(name) && !gitIgnored(projectRoot, `prj/games/platform-quest/assets/hero/${name}`, git)) {
          errors.push(`本地专用主角未被 git ignore:prj/games/platform-quest/assets/hero/${name}`);
        }
      }
    }
  } catch (error) {
    errors.push(`素材白名单检查失败:${error.message}`);
  }

  return { ok: errors.length === 0, errors };
}

if (isDirectInvocation()) {
  const result = verifyLauncherContract();
  const assets = verifyAssetAllowlist();
  const allErrors = result.errors.concat(assets.errors);
  if (!result.ok || !assets.ok) {
    console.error('[release-verify] failed');
    allErrors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`[release-verify] ok: ${result.preschoolThemes.length} preschool themes + ${result.generalVariants.length} general workbenches; ${result.checkedAssets} assets checked; asset allowlist clean`);
  }
}
