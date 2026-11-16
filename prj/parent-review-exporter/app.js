(function () {
    'use strict';

    const jsonField = document.getElementById('package-json');
    const fileField = document.getElementById('package-file');
    const previewButton = document.getElementById('preview-button');
    const previewSummary = document.getElementById('preview-summary');
    const previewList = document.getElementById('preview-list');
    const itemCount = document.getElementById('item-count');
    const exportStatus = document.getElementById('export-status');
    const health = document.getElementById('tool-health');
    let currentPackage = null;

    const sample = {
        schemaVersion: 'learning-review-package/v1',
        child: { id: 'local-child', name: '小星' },
        range: { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
        items: [{
            contentId: 'pinyin:ba1', track: 'pinyin', label: 'bā · 八', prompt: '听一听，选出正确的音节', answer: 'bā', meaning: '数字八', example: '八只小鸟',
            reasonCode: 'repeated-unknown', reason: '最近主动点了 3 次不会 / 跳过', action: '用八个积木重新讲一遍，再让孩子说出 bā。', practiceType: 'speak',
            options: [{ label: 'bā', correct: true }, { label: 'pā', correct: false }, { label: '不会 / 跳过', kind: 'unknown' }]
        }]
    };

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
        });
    }

    function setStatus(message, kind) {
        exportStatus.textContent = message;
        exportStatus.className = 'export-status' + (kind ? ' is-' + kind : '');
    }

    function parsePackage() {
        try {
            const parsed = JSON.parse(jsonField.value);
            if (!parsed || parsed.schemaVersion !== 'learning-review-package/v1') throw new Error('schemaVersion 不兼容');
            if (!parsed.child || !(parsed.child.id || parsed.child.name)) throw new Error('缺少 child 身份');
            if (!Array.isArray(parsed.items)) throw new Error('缺少 items 数组');
            currentPackage = parsed;
            renderPreview(parsed);
            setStatus('已检查：可以生成复习单。', 'success');
            return parsed;
        } catch (error) {
            currentPackage = null;
            itemCount.textContent = '未载入';
            previewSummary.innerHTML = '<div class="empty-state"><strong>数据格式需要修正</strong><p>' + escapeHtml(error.message) + '</p></div>';
            previewList.innerHTML = '';
            setStatus('无法预览：' + error.message, 'error');
            return null;
        }
    }

    function renderPreview(pkg) {
        const items = Array.isArray(pkg.items) ? pkg.items.slice(0, 10) : [];
        itemCount.textContent = items.length + ' 条重点';
        previewSummary.innerHTML = '<div class="summary-strip"><div class="summary-cell"><strong>' + escapeHtml(pkg.child.name || pkg.child.id) + '</strong><small>本次复习</small></div><div class="summary-cell"><strong>' + items.length + '</strong><small>家长重点</small></div><div class="summary-cell"><strong>A4</strong><small>打印版式</small></div></div>';
        previewList.innerHTML = items.length ? items.map(function (item, index) {
            const reason = item.reasonCode === 'repeated-unknown' ? '重复不会' : item.reasonCode === 'lapses' ? '有混淆' : item.reasonCode === 'unsure' ? '还不稳定' : '轻量复习';
            return '<div class="preview-item"><span class="preview-index">' + (index + 1) + '</span><div><strong>' + escapeHtml(item.label || item.contentId) + '</strong><small>' + escapeHtml(item.action || item.prompt || '带孩子读一遍') + '</small></div><span class="reason-tag">' + reason + '</span></div>';
        }).join('') : '<div class="empty-state"><strong>暂时没有需要带学的内容</strong><p>回到工作台完成几次学习后再生成。</p></div>';
    }

    async function checkHealth() {
        try {
            const response = await fetch('/api/health');
            const result = await response.json();
            const docx = result.tools && result.tools.docx && result.tools.docx.available;
            const pdf = result.tools && result.tools.pdf && result.tools.pdf.available;
            health.className = 'tool-health ' + (docx || pdf ? 'is-ready' : 'is-error');
            health.innerHTML = '<span class="health-dot"></span><span>DOCX ' + (docx ? '可用' : '未找到') + ' · PDF ' + (pdf ? '可用' : '未找到') + '</span>';
        } catch (error) {
            health.className = 'tool-health is-error';
            health.innerHTML = '<span class="health-dot"></span><span>本地服务未启动</span>';
        }
    }

    async function exportPackage(format) {
        if (!currentPackage && !parsePackage()) return;
        const formats = format === 'all' ? ['markdown', 'html', 'docx', 'pdf'] : [format];
        const buttons = Array.prototype.slice.call(document.querySelectorAll('.export-card'));
        buttons.forEach(function (button) { button.disabled = true; });
        setStatus('正在生成 ' + formats.join('、') + '，请稍候…');
        try {
            const response = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package: currentPackage, formats: formats }) });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || '导出失败');
            const generated = Object.keys(result.files || {}).filter(function (key) { return result.files[key]; }).join('、');
            const skipped = Object.keys(result.conversions || {}).filter(function (key) { return result.conversions[key] && result.conversions[key].skipped; });
            setStatus('已生成：' + generated + (skipped.length ? '；转换工具缺失：' + skipped.join('、') + '，HTML 仍可打印。' : '。'), skipped.length && generated === 'html' ? '' : 'success');
        } catch (error) {
            setStatus('导出失败：' + error.message, 'error');
        } finally {
            buttons.forEach(function (button) { button.disabled = false; });
        }
    }

    document.getElementById('load-sample').addEventListener('click', function () { jsonField.value = JSON.stringify(sample, null, 2); parsePackage(); });
    previewButton.addEventListener('click', parsePackage);
    Array.prototype.forEach.call(document.querySelectorAll('.export-card'), function (button) { button.addEventListener('click', function () { exportPackage(button.dataset.format); }); });
    fileField.addEventListener('change', function () {
        const file = fileField.files && fileField.files[0];
        if (!file) return;
        file.text().then(function (value) { jsonField.value = value; parsePackage(); }).catch(function () { setStatus('读取 JSON 文件失败。', 'error'); });
    });
    const drop = document.querySelector('.file-drop');
    ['dragenter', 'dragover'].forEach(function (eventName) { drop.addEventListener(eventName, function (event) { event.preventDefault(); drop.classList.add('is-dragging'); }); });
    ['dragleave', 'drop'].forEach(function (eventName) { drop.addEventListener(eventName, function (event) { event.preventDefault(); drop.classList.remove('is-dragging'); }); });
    drop.addEventListener('drop', function (event) { const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]; if (file) { file.text().then(function (value) { jsonField.value = value; parsePackage(); }); } });
    jsonField.value = JSON.stringify(sample, null, 2);
    checkHealth();
}());
