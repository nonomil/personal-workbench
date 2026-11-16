/**
 * TTS Engine - MP3 Only 模式
 * 所有语音播放都用预生成的 MP3 文件
 * 不依赖浏览器 speechSynthesis（移动端/各种设备上不可靠）
 *
 * 工作原理：
 * 1. 加载 map.json（文本→MP3 文件名映射）
 * 2. speakText() → ttsPlay() → 查映射表 → 播放 MP3
 * 3. 未命中时静默跳过（不降级到 speechSynthesis）
 */
(function(){
  var ttsMap = {};
  var ttsMapLoaded = false;
  var ttsAudio = null;

  // 加载映射表
  function loadTTSMap() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'audio/tts/map.json?' + Date.now(), true);
    xhr.onload = function() {
      try { ttsMap = JSON.parse(xhr.responseText); ttsMapLoaded = true; } catch(e) {}
    };
    xhr.onerror = function() {};
    xhr.send();
  }

  // 清理文本
  function ttsClean(text) {
    if (!text) return '';
    return text.replace(/<[^>]+>/g, '')
               .replace(/[\u0300-\u036f\u200d\ufe0f\u20e3\u20e4]/g, '')
               .replace(/['"]/g, '')
               .trim();
  }

  // 主入口
  window.ttsPlay = function(text) {
    var clean = ttsClean(text);
    if (!clean) return;

    if (ttsMapLoaded && ttsMap[clean]) {
      // 播放 MP3
      if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
      ttsAudio = new Audio('audio/tts/' + ttsMap[clean] + '.mp3');
      ttsAudio.volume = 0.9;
      ttsAudio.play().catch(function(){});
      return;
    }

    // 再用原文（含标点）试一次
    if (ttsMapLoaded) {
      var raw = text.replace(/<[^>]+>/g, '').trim();
      if (ttsMap[raw]) {
        if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
        ttsAudio = new Audio('audio/tts/' + ttsMap[raw] + '.mp3');
        ttsAudio.volume = 0.9;
        ttsAudio.play().catch(function(){});
        return;
      }
    }
  };

  // 初始化
  loadTTSMap();
})();
