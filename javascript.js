  /* ============ CHẶN DEVTOOLS & BẢO VỆ NGUỒN ============ */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (
      e.keyCode === 123 || 
      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || 
      (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) 
    ) {
      e.preventDefault();
      return false;
    }
  });

  setInterval(() => {
    const startTime = performance.now();
    debugger;
    const endTime = performance.now();
    if (endTime - startTime > 100) {
      document.body.innerHTML = "Access Denied";
    }
  }, 1000);

  /* ============ KHỞI TẠO BIẾN CƠ BẢN ============ */
  const gate = document.getElementById('gate');
  const main = document.getElementById('main');
  const bgVideo = document.getElementById('bg-video');
  const music = document.getElementById('bg-music');
  const disc = document.getElementById('disc-player');
  const discLabel = document.getElementById('disc-label');
  const discTip = document.getElementById('disc-tip');
  const musicBox = document.getElementById('music-box');
  const musicTitle = document.getElementById('music-title');
  const albumCover = document.getElementById('album-cover');
  const musicPrev = document.getElementById('music-prev');
  const musicNext = document.getElementById('music-next');
  
  const trackMenuBtn = document.getElementById('track-menu-btn');
  const trackListPanel = document.getElementById('track-list-panel');
  const trackListClose = document.getElementById('track-list-close');
  const trackListEl = document.getElementById('track-list');

  const card = document.querySelector('.card');
  const dock = document.getElementById('dock');
  const bioConfig = window.bioConfig || {};
  const tracks = Array.isArray(bioConfig.tracks) && bioConfig.tracks.length ? bioConfig.tracks : [{
    title: 'Tên bài hát — nghệ sĩ',
    file: 'song1.mp3',
    disc: 'images1.png'
  }];
  let currentTrackIndex = Number.isInteger(bioConfig.defaultIndex) ? bioConfig.defaultIndex : 0;

  if (albumCover && bioConfig.avatar) {
    albumCover.src = bioConfig.avatar;
  }

  function applyTrack(index, autoplay) {
    if (!tracks.length) return;
    const wasPlaying = autoplay !== undefined ? autoplay : !music.paused;
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];

    if (track.title) musicTitle.textContent = track.title;
    if (discLabel) discLabel.style.backgroundImage = track.disc ? `url('${track.disc}')` : '';

    if (track.file) {
      const source = music.querySelector('source');
      source.src = track.file;
      music.load();
      if (wasPlaying) {
        music.play().catch(() => {});
      }
    }
    updateTrackListActiveState();
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function renderTrackList(){
    if (!trackListEl) return;
    trackListEl.innerHTML = tracks.map((t, i) => `
      <li class="track-item${i === currentTrackIndex ? ' active' : ''}" data-index="${i}">
        <span class="t-index">${i + 1}</span>
        <img class="t-cover" src="${t.disc || ''}" alt="" loading="lazy">
        <p class="t-title">${escapeHtml(t.title || 'Không tên')}</p>
        <div class="mini-bars">
          <span class="m-bar"></span>
          <span class="m-bar"></span>
          <span class="m-bar"></span>
        </div>
      </li>
    `).join('');
  }

  function updateTrackListActiveState(){
    if (!trackListEl) return;
    trackListEl.querySelectorAll('.track-item').forEach((item) => {
      item.classList.toggle('active', Number(item.dataset.index) === currentTrackIndex);
    });
  }

  function openTrackList(){
    if (!trackListPanel) return;
    trackListPanel.classList.add('open');
    trackMenuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeTrackList(){
    if (!trackListPanel) return;
    trackListPanel.classList.remove('open');
    trackMenuBtn.setAttribute('aria-expanded', 'false');
  }

  if (trackMenuBtn && trackListPanel) {
    renderTrackList();

    trackMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trackListPanel.classList.contains('open') ? closeTrackList() : openTrackList();
    });

    trackListClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTrackList();
    });

    trackListEl.addEventListener('click', (e) => {
      const item = e.target.closest('.track-item');
      if (!item) return;
      applyTrack(Number(item.dataset.index), true);
      closeTrackList();
    });

    document.addEventListener('click', (e) => {
      if (!trackListPanel.classList.contains('open')) return;
      if (trackListPanel.contains(e.target) || trackMenuBtn.contains(e.target)) return;
      closeTrackList();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTrackList();
    });
  }

  if (tracks.length) {
    applyTrack(currentTrackIndex);
  }

  function setMusicState(isPlaying) {
    musicBox.classList.toggle('is-playing', isPlaying);
    discTip.textContent = isPlaying ? 'đang phát — bấm để tắt' : 'bấm để phát nhạc';
  }

  gate.addEventListener('click', () => {
    gate.classList.add('hidden');
    setTimeout(() => {
      gate.hidden = true;
      main.hidden = false;
      requestAnimationFrame(() => { card.classList.add('in'); dock.classList.add('in'); });
      bgVideo.play().catch(()=>{});
      music.play().then(() => setMusicState(true)).catch(() => setMusicState(false));
    }, 600);
  });

  music.addEventListener('play', () => setMusicState(true));
  music.addEventListener('pause', () => setMusicState(false));

  disc.addEventListener('click', () => {
    if (music.paused) music.play().catch(() => {});
    else music.pause();
  });

  musicPrev.addEventListener('click', () => applyTrack(currentTrackIndex - 1, true));
  musicNext.addEventListener('click', () => applyTrack(currentTrackIndex + 1, true));
  music.addEventListener('ended', () => applyTrack(currentTrackIndex + 1, true));

  /* ============ THỜI GIAN & PROGRESS BAR ============ */
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');

  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  music.addEventListener('loadedmetadata', () => {
    durationTimeEl.textContent = formatTime(music.duration);
  });

  music.addEventListener('timeupdate', () => {
    if (music.duration) {
      const percent = (music.currentTime / music.duration) * 100;
      progressFill.style.width = `${percent}%`;
      currentTimeEl.textContent = formatTime(music.currentTime);
    }
  });

  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (music.duration) music.currentTime = percent * music.duration;
  });

  /* ============ ÂM LƯỢNG (VOLUME) ============ */
  const volumeBtn = document.getElementById('volume-btn');
  const volumeSliderContainer = document.getElementById('volume-slider-container');
  const volumeSliderFill = document.getElementById('volume-slider-fill');
  const volWave = document.querySelector('.vol-wave');
  let lastVolume = 1;

  function updateVolume(val) {
    val = Math.max(0, Math.min(1, val));
    if (music) music.volume = val;
    if (volumeSliderFill) volumeSliderFill.style.width = `${val * 100}%`;
    if (volWave) volWave.style.display = val === 0 ? 'none' : 'block';
  }

  updateVolume(1);
  let isDraggingVol = false;

  function handleVolMove(e) {
    if (!volumeSliderContainer) return;
    const rect = volumeSliderContainer.getBoundingClientRect();
    if (rect.width === 0) return; 
    const percent = (e.clientX - rect.left) / rect.width;
    updateVolume(percent);
  }

  volumeSliderContainer.addEventListener('mousedown', (e) => {
    isDraggingVol = true;
    handleVolMove(e);
  });

  document.addEventListener('mousemove', (e) => {
    if (isDraggingVol) {
      e.preventDefault();
      handleVolMove(e);
    }
  });

  document.addEventListener('mouseup', () => { isDraggingVol = false; });

  volumeBtn.addEventListener('click', () => {
    const currentVol = music ? music.volume : 1;
    if (currentVol > 0) {
      lastVolume = currentVol;
      updateVolume(0);
    } else {
      updateVolume(lastVolume || 1);
    }
  });

  /* ============ VISUALIZER ÂM THANH XỬ LÝ CHUẨN ============ */
  let audioCtx, analyser, source;
  let isAudioContextInit = false;

  function initVisualizer() {
    if (isAudioContextInit || !music) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256; 

    source = audioCtx.createMediaElementSource(music);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    isAudioContextInit = true;
    renderFrame();
  }

  function renderFrame() {
    requestAnimationFrame(renderFrame);

    const bars = document.querySelectorAll('.music-bars .bar');
    const allMiniBars = document.querySelectorAll('.mini-bars .m-bar');
    const activeMiniBars = document.querySelectorAll('.track-item.active .mini-bars .m-bar');

    // Dừng hoặc chưa bật -> Reset scale tránh đóng băng
    if (!analyser || music.paused) {
      bars.forEach(bar => bar.style.transform = 'scaleY(0.08)');
      allMiniBars.forEach(mb => mb.style.transform = 'scaleY(0.1)');
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const sampleIndices = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

    // Visualizer khung Player chính
    bars.forEach((bar, index) => {
      const sampleIndex = sampleIndices[index];
      const value = dataArray[sampleIndex] || 0;
      let scale = (value / 255) * 0.85;
      scale = Math.max(0.08, Math.min(1.0, scale));
      bar.style.transform = `scaleY(${scale})`;
    });

    // Reset những bài hát không active
    allMiniBars.forEach(mb => mb.style.transform = 'scaleY(0.1)');

    // Visualizer mini cho bài active trong danh sách
    if (activeMiniBars.length > 0) {
      const miniIndices = [1, 4, 8];
      activeMiniBars.forEach((mBar, index) => {
        const val = dataArray[miniIndices[index]] || 0;
        let miniScale = (val / 255) * 0.9;
        miniScale = Math.max(0.1, Math.min(1.0, miniScale));
        mBar.style.transform = `scaleY(${miniScale})`;
      });
    }
  }

  if (music) {
    music.addEventListener('play', () => {
      if (!isAudioContextInit) {
        initVisualizer();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    });
  }