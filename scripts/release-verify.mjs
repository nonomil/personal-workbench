import fs from 'node:fs';
import path from 'node:path';
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
    asset: './assets/generated/preschool-theme-assets/platform-v2/reference/platform-hero.png'
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

if (isDirectInvocation()) {
  const result = verifyLauncherContract();
  if (!result.ok) {
    console.error('[release-verify] failed');
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`[release-verify] ok: ${result.preschoolThemes.length} preschool themes + ${result.generalVariants.length} general workbenches; ${result.checkedAssets} assets checked`);
  }
}
