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

// Ngưỡng nới từ 100ms -> 400ms + kiểm tra 2 lần liên tiếp mới kích hoạt,
// tránh việc tab bị throttle nền (đổi tab, máy yếu, mobile...) làm
// performance.now() lệch giả và tự động xóa trắng trang oan cho người dùng
// bình thường không hề mở DevTools.
let devtoolsStrikes = 0;
setInterval(() => {
  const startTime = performance.now();
  debugger;
  const endTime = performance.now();
  if (endTime - startTime > 400) {
    devtoolsStrikes++;
    if (devtoolsStrikes >= 2) {
      document.body.innerHTML = "Access Denied";
    }
  } else {
    devtoolsStrikes = 0;
  }
}, 1500);

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

/* ============ CATEGORY (THỂ LOẠI NHẠC) ============ */
const CATEGORY_LABELS = {
  bth: 'Bình thường',
  fonk: 'Phonk',
  remix: 'Remix',
  rap: 'Rap',
  lofi: 'Lo-fi',
  drill: 'Drill',
  edm: 'EDM',
  ballad: 'Ballad',
  chill: 'Chill',
  nhactrung: 'Nhạc Trung',
  nhactrungremix: 'Nhạc Trung Remix',
  nhacnhat: 'Nhạc Nhật'
};
function getCategoryLabel(cat) {
  if (!cat) return 'Khác';
  return CATEGORY_LABELS[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
}

let currentCategory = 'all';
const trackCategoryFiltersEl = document.getElementById('track-category-filters');

function renderCategoryFilters() {
  if (!trackCategoryFiltersEl) return;
  const cats = Array.from(new Set(tracks.map((t) => t.category).filter(Boolean)));
  if (!cats.length) {
    trackCategoryFiltersEl.innerHTML = '';
    return;
  }
  const chips = ['all', ...cats];
  trackCategoryFiltersEl.innerHTML = chips
    .map((c) => `
      <button type="button" class="category-chip${c === currentCategory ? ' active' : ''}" data-category="${escapeHtml(c)}" role="tab" aria-selected="${c === currentCategory}">
        ${c === 'all' ? 'Tất cả' : escapeHtml(getCategoryLabel(c))}
      </button>
    `)
    .join('');
}

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

  const filtered = tracks
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => currentCategory === 'all' || t.category === currentCategory);

  if (!filtered.length) {
    trackListEl.innerHTML = '<li class="track-list-empty">Không có bài hát nào trong mục này</li>';
    return;
  }

  trackListEl.innerHTML = filtered.map(({ t, i }) => `
    <li class="track-item${i === currentTrackIndex ? ' active' : ''}" data-index="${i}">
      <span class="t-index">${i + 1}</span>
      <img class="t-cover" src="${t.disc || ''}" alt="" loading="lazy">
      <div class="t-info">
        <p class="t-title">${escapeHtml(t.title || 'Không tên')}</p>
        ${t.category ? `<span class="t-category">${escapeHtml(getCategoryLabel(t.category))}</span>` : ''}
      </div>
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
  if (trackMenuBtn) trackMenuBtn.setAttribute('aria-expanded', 'true');
}

function closeTrackList(){
  if (!trackListPanel) return;
  trackListPanel.classList.remove('open');
  if (trackMenuBtn) trackMenuBtn.setAttribute('aria-expanded', 'false');
}

// FIX: mỗi lần renderTrackList() vẽ lại danh sách (đổi category), các node
// .m-bar cũ bị hủy nhưng miniBarsPerTrack vẫn trỏ tới node cũ đã "chết".
// -> gọi cacheTrackMiniBars() lại ngay sau mỗi renderTrackList() (hàm này
// được khai báo bên dưới, nhưng vì đây là function declaration nên hoisting
// vẫn hoạt động bình thường khi các listener chạy sau này).
if (trackCategoryFiltersEl) {
  trackCategoryFiltersEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    currentCategory = chip.dataset.category;
    renderCategoryFilters();
    renderTrackList();
    cacheTrackMiniBars();
  });
}

if (trackMenuBtn && trackListPanel) {
  renderCategoryFilters();
  renderTrackList();

  trackMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    trackListPanel.classList.contains('open') ? closeTrackList() : openTrackList();
  });

  if (trackListClose) {
    trackListClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTrackList();
    });
  }

  if (trackListEl) {
    trackListEl.addEventListener('click', (e) => {
      const item = e.target.closest('.track-item');
      if (!item) return;
      applyTrack(Number(item.dataset.index), true);
      closeTrackList();
    });
  }
}

if (tracks.length) {
  applyTrack(currentTrackIndex);
}

function setMusicState(isPlaying) {
  if (musicBox) musicBox.classList.toggle('is-playing', isPlaying);
  if (discTip) discTip.textContent = isPlaying ? 'đang phát — bấm để tắt' : 'bấm để phát nhạc';
}

/* ============ GATE ĐÃ ĐƠN GIẢN HÓA ============
   Bỏ hẳn hiệu ứng hạt sáng bay (chạy vô hạn ngay từ lúc load trang) và
   hiệu ứng 10 mảnh vỡ bay ra khi bấm — giờ chỉ còn 1 vòng tròn nổ đơn giản,
   chạy đúng 1 lần và tự dọn dẹp ngay sau đó. */
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function spawnGateBurst(x, y) {
  if (prefersReducedMotion) return;
  const burst = document.createElement('div');
  burst.className = 'gate-burst';
  const size = 220;
  burst.style.left = x + 'px';
  burst.style.top = y + 'px';
  burst.style.width = size + 'px';
  burst.style.height = size + 'px';
  document.body.appendChild(burst);
  burst.addEventListener('animationend', () => burst.remove());
}

if (gate) {
  gate.addEventListener('click', (e) => {
    const cx = e.clientX || window.innerWidth / 2;
    const cy = e.clientY || window.innerHeight / 2;
    spawnGateBurst(cx, cy);
    gate.classList.add('hidden');
    setTimeout(() => {
      gate.hidden = true;
      if (main) main.hidden = false;
      requestAnimationFrame(() => {
        if (card) card.classList.add('in');
        if (dock) dock.classList.add('in');
      });
      if (bgVideo) bgVideo.play().catch(()=>{});
      if (music) music.play().then(() => setMusicState(true)).catch(() => setMusicState(false));
    }, 600);
  });
}

/* ============ NGHIÊNG NHẸ THẺ BIO THEO CHUỘT (DESKTOP) ============ */
// FIX LAG: card chứa các khối có backdrop-filter (music-box, discord mini
// profile) bên trong. Khi card cha xoay rotateX/rotateY liên tục theo
// mousemove, trình duyệt phải build lại layer blur của các khối con gần
// như mỗi khung hình -> đây là nguồn giật hình chính. Giảm góc nghiêng
// (5/6deg -> 3/4deg) và bỏ qua các thay đổi quá nhỏ (dưới ngưỡng) để giảm
// đáng kể số lần phải vẽ lại, mà mắt gần như không nhận ra khác biệt.
if (card && window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches && !prefersReducedMotion) {
  let tiltRAF = null;
  let lastPx = 0, lastPy = 0;
  card.addEventListener('mouseenter', () => card.classList.add('tilt-ready'));
  card.addEventListener('mousemove', (e) => {
    if (!card.classList.contains('in')) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    if (Math.abs(px - lastPx) < 0.01 && Math.abs(py - lastPy) < 0.01) return;
    lastPx = px; lastPy = py;
    if (tiltRAF) cancelAnimationFrame(tiltRAF);
    tiltRAF = requestAnimationFrame(() => {
      card.style.transform = `translateY(0) scale(1) rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg)`;
    });
  });
  card.addEventListener('mouseleave', () => {
    if (tiltRAF) cancelAnimationFrame(tiltRAF);
    card.style.transform = 'translateY(0) scale(1) rotateX(0deg) rotateY(0deg)';
  });
}

if (music) {
  music.addEventListener('play', () => setMusicState(true));
  music.addEventListener('pause', () => setMusicState(false));
  music.addEventListener('ended', () => applyTrack(currentTrackIndex + 1, true));
}

if (disc) {
  disc.addEventListener('click', () => {
    if (music.paused) music.play().catch(() => {});
    else music.pause();
  });
}

if (musicPrev) musicPrev.addEventListener('click', () => applyTrack(currentTrackIndex - 1, true));
if (musicNext) musicNext.addEventListener('click', () => applyTrack(currentTrackIndex + 1, true));

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

if (music) {
  music.addEventListener('loadedmetadata', () => {
    if (durationTimeEl) durationTimeEl.textContent = formatTime(music.duration);
  });

  // FIX LAG: dùng transform: scaleX() thay vì width. Đổi width buộc trình
  // duyệt tính lại layout + paint lại mỗi lần timeupdate bắn ra (rất thường
  // xuyên khi đang phát nhạc). transform chỉ cần composite lại trên GPU,
  // mượt hơn nhiều — đặc biệt rõ trên máy yếu/mobile.
  music.addEventListener('timeupdate', () => {
    if (music.duration) {
      const percent = music.currentTime / music.duration;
      if (progressFill) progressFill.style.transform = `scaleX(${percent})`;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(music.currentTime);
    }
  });
}

if (progressContainer) {
  progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (music && music.duration) music.currentTime = percent * music.duration;
  });
}

/* ============ ÂM LƯỢNG (VOLUME) ============ */
const volumeBtn = document.getElementById('volume-btn');
const volumeSliderContainer = document.getElementById('volume-slider-container');
const volumeSliderFill = document.getElementById('volume-slider-fill');
const volWave = document.querySelector('.vol-wave');

const VOLUME_STORAGE_KEY = 'bio-music-volume';
const LAST_VOLUME_STORAGE_KEY = 'bio-music-last-volume';

function loadStoredVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0 && val <= 1) return val;
  } catch (e) { /* localStorage không khả dụng — bỏ qua, dùng mặc định */ }
  return 1;
}

function loadStoredLastVolume(fallback) {
  try {
    const raw = localStorage.getItem(LAST_VOLUME_STORAGE_KEY);
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0 && val <= 1) return val;
  } catch (e) { /* bỏ qua */ }
  return fallback;
}

function saveVolume(val) {
  try { localStorage.setItem(VOLUME_STORAGE_KEY, String(val)); } catch (e) { /* bỏ qua */ }
}

function saveLastVolume(val) {
  try { localStorage.setItem(LAST_VOLUME_STORAGE_KEY, String(val)); } catch (e) { /* bỏ qua */ }
}

const initialVolume = loadStoredVolume();
let lastVolume = loadStoredLastVolume(initialVolume > 0 ? initialVolume : 1);

// FIX LAG: dùng transform: scaleX() thay vì width cho thanh âm lượng, cùng
// lý do như progress bar ở trên — tránh trình duyệt phải tính lại layout
// mỗi lần kéo/chỉnh âm lượng.
function updateVolume(val, persist = true) {
  val = Math.max(0, Math.min(1, val));
  if (music) music.volume = val;
  if (volumeSliderFill) volumeSliderFill.style.transform = `scaleX(${val})`;
  if (volWave) volWave.style.display = val === 0 ? 'none' : 'block';
  if (persist) saveVolume(val);
}

updateVolume(initialVolume, false);
let isDraggingVol = false;

function handleVolMove(e) {
  if (!volumeSliderContainer) return;
  const rect = volumeSliderContainer.getBoundingClientRect();
  if (rect.width === 0) return;
  const percent = (e.clientX - rect.left) / rect.width;
  updateVolume(percent);
}

if (volumeSliderContainer) {
  volumeSliderContainer.addEventListener('mousedown', (e) => {
    isDraggingVol = true;
    handleVolMove(e);
  });
}

document.addEventListener('mousemove', (e) => {
  if (isDraggingVol) {
    e.preventDefault();
    handleVolMove(e);
  }
});

document.addEventListener('mouseup', () => { isDraggingVol = false; });

if (volumeBtn) {
  volumeBtn.addEventListener('click', () => {
    const currentVol = music ? music.volume : 1;
    if (currentVol > 0) {
      lastVolume = currentVol;
      saveLastVolume(lastVolume);
      updateVolume(0);
    } else {
      updateVolume(lastVolume || 1);
    }
  });
}

/* ============ VISUALIZER ÂM THANH XỬ LÝ CHUẨN ============ */
let audioCtx, analyser, source;
let isAudioContextInit = false;

const mainBarsCache = document.querySelectorAll('.music-bars .bar');
let miniBarsPerTrack = [];
let allMiniBarsFlat = [];
let visualizerDataArray = null;
let barsAreReset = true;

function cacheTrackMiniBars(){
  if (!trackListEl) return;
  const items = trackListEl.querySelectorAll('.track-item');
  miniBarsPerTrack = Array.from(items).map(item => Array.from(item.querySelectorAll('.m-bar')));
  allMiniBarsFlat = miniBarsPerTrack.flat();
}
cacheTrackMiniBars();

// FIX LAG QUAN TRỌNG: trước đây renderFrame() tự gọi requestAnimationFrame
// vô điều kiện -> vòng lặp 60fps chạy VĨNH VIỄN suốt vòng đời trang, kể cả
// khi nhạc chưa từng được bấm phát. Giờ chỉ khởi động rAF khi nhạc thực sự
// play, và hủy hẳn (cancelAnimationFrame) khi nhạc pause — đỡ tốn CPU/pin
// đáng kể, đặc biệt trên mobile.
let rafId = null;

function initVisualizer() {
  if (isAudioContextInit || !music) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);

  source = audioCtx.createMediaElementSource(music);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  isAudioContextInit = true;
}

const SAMPLE_INDICES = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const MINI_INDICES = [1, 4, 8];

function resetBarsOnce(){
  if (barsAreReset) return;
  mainBarsCache.forEach(bar => bar.style.transform = 'scaleY(0.08)');
  allMiniBarsFlat.forEach(mb => mb.style.transform = 'scaleY(0.1)');
  barsAreReset = true;
}

function renderFrame() {
  if (!analyser || music.paused) {
    resetBarsOnce();
    rafId = null; // dừng hẳn loop thay vì tiếp tục request rồi return sớm mỗi frame
    return;
  }
  barsAreReset = false;

  analyser.getByteFrequencyData(visualizerDataArray);

  mainBarsCache.forEach((bar, index) => {
    const value = visualizerDataArray[SAMPLE_INDICES[index]] || 0;
    let scale = (value / 255) * 0.85;
    scale = Math.max(0.08, Math.min(1.0, scale));
    bar.style.transform = `scaleY(${scale})`;
  });

  if (trackListPanel && trackListPanel.classList.contains('open')) {
    const activeMiniBars = miniBarsPerTrack[currentTrackIndex];
    if (activeMiniBars && activeMiniBars.length) {
      activeMiniBars.forEach((mBar, index) => {
        const val = visualizerDataArray[MINI_INDICES[index]] || 0;
        let miniScale = (val / 255) * 0.9;
        miniScale = Math.max(0.1, Math.min(1.0, miniScale));
        mBar.style.transform = `scaleY(${miniScale})`;
      });
    }
  }

  rafId = requestAnimationFrame(renderFrame);
}

if (music) {
  music.addEventListener('play', () => {
    if (!isAudioContextInit) {
      initVisualizer();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (rafId === null) {
      rafId = requestAnimationFrame(renderFrame);
    }
  });
  music.addEventListener('pause', () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    resetBarsOnce();
  });
}

/* ============ DISCORD STATUS THẬT (LANYARD API) ============ */
(function () {
  const dmpRoot = document.getElementById('discord-mini-profile');
  const dmpZone = document.getElementById('dmp-nameplate-zone') || dmpRoot;

  const DMP_PALETTE_COLORS = {
    crimson: '#c53434',
    berry: '#c2266d',
    sky: '#3b82c4',
    teal: '#1f9a8e',
    forest: '#2f7d4f',
    bubble_gum: '#e85fa0',
    violet: '#8b5cf6',
    cobalt: '#3654c9',
    clover: '#4ca94c',
    lemon: '#d9b23c',
    white: '#e8e8e8'
  };

  function applyDmpNameplate({ videoUrl, staticUrl, palette } = {}) {
    if (!dmpRoot || (!videoUrl && !staticUrl)) return;

    if (palette && DMP_PALETTE_COLORS[palette]) {
      dmpRoot.style.setProperty('--dmp-nameplate-color', DMP_PALETTE_COLORS[palette]);
    }

    if (staticUrl) {
      dmpRoot.style.setProperty('--dmp-nameplate', `url('${staticUrl}')`);
    }

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (videoUrl && !prefersReducedMotion) {
      const video = document.createElement('video');
      video.className = 'dmp-nameplate-video';
      video.src = videoUrl;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('aria-hidden', 'true');
      video.onerror = () => video.remove();
      dmpZone.prepend(video);
      video.play().catch(() => {});
    }

    dmpRoot.classList.add('has-nameplate');
  }

  if (dmpRoot && bioConfig.discordNameplateWorkerUrl) {
    fetch(bioConfig.discordNameplateWorkerUrl)
      .then(res => res.json())
      .then(data => {
        if (data && (data.nameplateUrl || data.nameplateStaticUrl)) {
          applyDmpNameplate({
            videoUrl: data.nameplateUrl,
            staticUrl: data.nameplateStaticUrl,
            palette: data.nameplatePalette
          });
        } else if (bioConfig.discordNameplateStaticUrl) {
          applyDmpNameplate({ staticUrl: bioConfig.discordNameplateStaticUrl });
        }
      })
      .catch(() => {
        if (bioConfig.discordNameplateStaticUrl) {
          applyDmpNameplate({ staticUrl: bioConfig.discordNameplateStaticUrl });
        }
      });
  } else if (dmpRoot && bioConfig.discordNameplateStaticUrl) {
    applyDmpNameplate({ staticUrl: bioConfig.discordNameplateStaticUrl });
  }

  const discordId = bioConfig.discordId;
  if (!discordId) return;

  const dmpAvatar = document.getElementById('dmp-avatar');
  const dmpDecoration = document.getElementById('dmp-decoration');
  const dmpUsername = document.getElementById('dmp-username');
  const dmpBadges = document.getElementById('dmp-badges');
  const dmpActivity = document.getElementById('dmp-activity');

  const STATUS_LABEL = {
    online: ' Trực tuyến',
    idle: ' Đang chờ',
    dnd: ' Không làm phiền',
    offline: 'Ngoại tuyến'
  };

  const ACTIVITY_TYPE_LABEL = {
    0: 'Đang chơi',
    1: 'Đang livestream',
    2: 'Đang nghe',
    3: 'Đang xem',
    5: 'Đang thi đấu'
  };

  function activityImageUrl(activity, key) {
    if (!activity || !activity.assets) return null;
    const img = activity.assets[key];
    if (!img) return null;
    if (img.startsWith('mp:external/')) {
      return `https://media.discordapp.net/external/${img.slice('mp:external/'.length)}`;
    }
    if (img.startsWith('spotify:')) {
      return `https://i.scdn.co/image/${img.slice('spotify:'.length)}`;
    }
    if (img.startsWith('mp:')) {
      return `https://media.discordapp.net/${img.slice(3)}`;
    }
    if (activity.application_id) {
      return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
    }
    return null;
  }

  function pickActivityCard(data) {
    if (data.listening_to_spotify && data.spotify) {
      const sp = data.spotify;
      return {
        name: '🎧 Đang nghe Spotify',
        details: sp.song || '',
        state: sp.artist ? `của ${sp.artist}` : '',
        image: sp.album_art_url || null,
        smallImage: null,
        start: sp.timestamps && sp.timestamps.start
      };
    }
    const act = (data.activities || []).find(a => a.type !== 4);
    if (!act) return null;
    return {
      name: `${ACTIVITY_TYPE_LABEL[act.type] || 'Đang hoạt động'} ${act.name || ''}`.trim(),
      details: act.details || '',
      state: act.state || '',
      image: activityImageUrl(act, 'large_image'),
      smallImage: activityImageUrl(act, 'small_image'),
      start: act.timestamps && act.timestamps.start
    };
  }

  let activityTimerInterval = null;
  function startActivityTimer(startMs) {
    clearInterval(activityTimerInterval);
    const el = document.getElementById('dmp-act-time');
    if (!el) return;
    if (!startMs) { el.textContent = ''; return; }
    function tick() {
      const diff = Date.now() - startMs;
      if (diff < 0) { el.textContent = ''; return; }
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
      el.textContent = `⏱ ${h > 0 ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')} đã trôi qua`;
    }
    tick();
    activityTimerInterval = setInterval(tick, 1000);
  }

  let isActivityEnabledByUser = true;
  let currentCardData = null;

  const toggleBtn = document.getElementById('toggle-activity-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isActivityEnabledByUser = !isActivityEnabledByUser;

      const panel = document.getElementById('dmp-activity-panel');
      toggleBtn.classList.toggle('is-disabled', !isActivityEnabledByUser);

      if (!isActivityEnabledByUser) {
        if (panel) {
          panel.classList.add('user-collapsed');
          panel.classList.remove('open');
          panel.style.maxHeight = '0px';
        }
        clearInterval(activityTimerInterval);
      } else {
        if (panel) {
          panel.classList.remove('user-collapsed');
        }
        if (currentCardData) {
          setActivityPanel(currentCardData);
        }
      }
    });
  }

  function setActivityPanel(cardData) {
    currentCardData = cardData;
    const panel = document.getElementById('dmp-activity-panel');
    if (!panel) return;

    if (!isActivityEnabledByUser) {
      panel.classList.add('user-collapsed');
      panel.classList.remove('open');
      panel.style.maxHeight = '0px';
      clearInterval(activityTimerInterval);
      return;
    }

    if (!cardData) {
      panel.classList.remove('open');
      panel.style.maxHeight = '0px';
      clearInterval(activityTimerInterval);
      return;
    }

    const imgEl = document.getElementById('dmp-act-img');
    const imgSmallEl = document.getElementById('dmp-act-img-small');
    const nameEl = document.getElementById('dmp-act-name');
    const detailsEl = document.getElementById('dmp-act-details');
    const stateEl = document.getElementById('dmp-act-state');

    if (imgEl) {
      if (cardData.image) { imgEl.src = cardData.image; imgEl.style.display = 'block'; }
      else { imgEl.style.display = 'none'; }
    }
    if (imgSmallEl) {
      if (cardData.smallImage) { imgSmallEl.src = cardData.smallImage; imgSmallEl.style.display = 'block'; }
      else { imgSmallEl.style.display = 'none'; }
    }
    if (nameEl) nameEl.textContent = cardData.name || '';
    if (detailsEl) {
      detailsEl.textContent = cardData.details || '';
      detailsEl.style.display = cardData.details ? 'block' : 'none';
    }
    if (stateEl) {
      stateEl.textContent = cardData.state || '';
      stateEl.style.display = cardData.state ? 'block' : 'none';
    }

    startActivityTimer(cardData.start);

    panel.classList.remove('user-collapsed');
    panel.classList.add('open');
    requestAnimationFrame(() => {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    });
  }

  const BADGE_FLAGS = [
    { bit: 1 << 0,  icon: '👷', label: 'Discord Staff' },
    { bit: 1 << 1,  icon: '🤝', label: 'Partnered Server Owner' },
    { bit: 1 << 2,  icon: '🎉', label: 'HypeSquad Events' },
    { bit: 1 << 3,  icon: '🐛', label: 'Bug Hunter Level 1' },
    { bit: 1 << 6,  icon: '💪', label: 'HypeSquad Bravery' },
    { bit: 1 << 7,  icon: '💎', label: 'HypeSquad Brilliance' },
    { bit: 1 << 8,  icon: '⚖️', label: 'HypeSquad Balance' },
    { bit: 1 << 9,  icon: '🌱', label: 'Early Supporter' },
    { bit: 1 << 14, icon: '🐞', label: 'Bug Hunter Level 2' },
    { bit: 1 << 17, icon: '⭐', label: 'Early Verified Bot Developer' },
    { bit: 1 << 18, icon: '🛡️', label: 'Certified Moderator' },
    { bit: 1 << 22, icon: '💻', label: 'Active Developer' },
  ];

  function avatarUrl(data) {
    if (!data.discord_user) return '';
    const { id, avatar, discriminator } = data.discord_user;
    if (avatar) {
      const ext = avatar.startsWith('a_') ? 'gif' : 'png';
      return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`;
    }
    const fallbackIndex = discriminator && discriminator !== '0'
      ? Number(discriminator) % 5
      : Number((BigInt(id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  }

  function decorationUrl(data) {
    const deco = data.discord_user && data.discord_user.avatar_decoration_data;
    if (!deco || !deco.asset) return null;
    return `https://cdn.discordapp.com/avatar-decoration-presets/${deco.asset}.png?size=128`;
  }

function renderBadges(data) {
    if (!dmpBadges) return;
    const flags = (data.discord_user && data.discord_user.public_flags) || 0;
    dmpBadges.innerHTML = BADGE_FLAGS
      .filter(b => (flags & b.bit) !== 0)
      .map(b => `<span class="dmp-badge" title="${b.label}">${b.icon}</span>`)
      .join('');
  }
  function activityText(data) {
    const custom = (data.activities || []).find(a => a.type === 4);
    if (custom && (custom.state || custom.emoji)) {
      const emoji = custom.emoji ? (custom.emoji.name ? custom.emoji.name + ' ' : '') : '';
      return `${emoji}${custom.state || ''}`.trim();
    }
    if (data.listening_to_spotify && data.spotify) {
      return `🎧 ${data.spotify.song} — ${data.spotify.artist}`;
    }
    const game = (data.activities || []).find(a => a.type === 0);
    if (game && game.name) return `🎮 Đang chơi ${game.name}`;
    return STATUS_LABEL[data.discord_status] || STATUS_LABEL.offline;
  }

  function applyStatus(data) {
    if (!data || !data.discord_user) return;
    const username = data.discord_user.global_name || data.discord_user.username || 'Unknown';
    const avatar = avatarUrl(data);
    const decoration = decorationUrl(data);
    const activity = activityText(data);

    if (dmpAvatar) dmpAvatar.src = avatar;
    if (dmpUsername) dmpUsername.textContent = username;
    if (dmpActivity) dmpActivity.textContent = activity;
    if (dmpRoot) dmpRoot.classList.add('in');

    const statusDot = document.getElementById('dmp-status-dot');
    if (statusDot) {
      const status = ['online', 'idle', 'dnd', 'offline'].includes(data.discord_status)
        ? data.discord_status : 'offline';
      statusDot.className = 'dmp-status-dot ' + status;
    }

    if (dmpDecoration) {
      if (decoration) {
        dmpDecoration.src = decoration;
        dmpDecoration.style.display = 'block';
      } else {
        dmpDecoration.style.display = 'none';
      }
    }

    renderBadges(data);
    setActivityPanel(pickActivityCard(data));
  }

  fetch(`https://api.lanyard.rest/v1/users/${discordId}`)
    .then(res => res.json())
    .then(json => { if (json.success) applyStatus(json.data); })
    .catch(() => {
      if (dmpActivity) dmpActivity.textContent = 'không tải được trạng thái';
    });

  let ws;
  let heartbeatInterval;

  function connectLanyardSocket() {
    ws = new WebSocket('wss://api.lanyard.rest/socket');

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.op) {
        case 1:
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 3 }));
            }
          }, msg.d.heartbeat_interval);

          ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: discordId }
          }));
          break;

        case 0:
          if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
            applyStatus(msg.d);
          }
          break;
      }
    };

    ws.onclose = () => {
      clearInterval(heartbeatInterval);
      setTimeout(connectLanyardSocket, 5000);
    };

    ws.onerror = () => ws.close();
  }

  connectLanyardSocket();
})();

/* ============ FOOTER TERMINAL NÂNG CẤP ============ */
(function initFooterTerminal() {
  const footEl = document.getElementById('footer-bar');
  const typedEl = document.getElementById('foot-typed');
  if (!footEl || !typedEl) return;

  const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lines = [
    'cập nhật lần cuối · tháng 8, 2026',
    'hmm ✦',
    'hmm ✦'
  ];

  let currentIndex = 0;
  let generation = 0;
  let running = false;

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function typeText(text, gen, erase) {
    const chars = Array.from(text);
    if (REDUCED_MOTION) {
      typedEl.textContent = erase ? '' : text;
      return;
    }
    let i = erase ? chars.length : 0;
    while (true) {
      if (gen !== generation) return;
      typedEl.textContent = chars.slice(0, i).join('');
      if (!erase) { i++; if (i > chars.length) return; } else { i--; if (i < 0) return; }
      await sleep(erase ? 16 : 40);
    }
  }

  async function goToNextLine() {
    if (running) return;
    running = true;
    generation++;
    const gen = generation;
    const nextIndex = (currentIndex + 1) % lines.length;

    await typeText(lines[currentIndex], gen, true);
    if (gen !== generation) { running = false; return; }
    await typeText(lines[nextIndex], gen, false);
    if (gen === generation) {
      currentIndex = nextIndex;
      running = false;
    }
  }

  footEl.addEventListener('click', goToNextLine);
  footEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToNextLine();
    }
  });

  typedEl.textContent = lines[currentIndex];
})();
/* ============ VIEW COUNTER — CHỈ CHỦ TRANG THẤY, KHÔNG TÍNH LƯỢT CỦA CHỦ ============ */
(function () {
  const VIEW_API = 'https://views.ten870865.workers.dev';
  const OWNER_STORAGE_KEY = 'bio_is_owner';
  const OWNER_URLKEY_STORAGE = 'bio_owner_key';

  function checkOwnerFromUrl() {
    const params = new URLSearchParams(location.search);
    const key = params.get('key');
    if (key) {
      try {
        localStorage.setItem(OWNER_STORAGE_KEY, '1');
        localStorage.setItem(OWNER_URLKEY_STORAGE, key);
      } catch (e) {}
      params.delete('key');
      const clean = location.pathname + (params.toString() ? '?' + params.toString() : '');
      history.replaceState({}, '', clean);
    }
  }

  function isOwner() {
    try { return localStorage.getItem(OWNER_STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function getStoredKey() {
    try { return localStorage.getItem(OWNER_URLKEY_STORAGE) || ''; } catch (e) { return ''; }
  }

  function showViewCount(count) {
    let el = document.getElementById('owner-view-count');
    if (!el) {
      el = document.createElement('div');
      el.id = 'owner-view-count';
      el.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:200;' +
        'font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.04em;' +
        'background:rgba(20,16,15,.72);color:#fff8ee;padding:6px 12px;border-radius:20px;' +
        'backdrop-filter:blur(6px);pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = '👁 ' + count.toLocaleString('vi-VN') + ' views';
  }

  checkOwnerFromUrl();

  const ownerNow = isOwner();

  // Chỉ tăng đếm nếu KHÔNG PHẢI chủ trang
  if (!ownerNow) {
    fetch(VIEW_API + '/hit', { method: 'POST' }).catch(() => {});
  }

  // Chỉ chủ trang mới thấy số (và số này không bị cộng thêm lượt của chính họ)
  if (ownerNow) {
    const key = getStoredKey();
    fetch(VIEW_API + '/count?key=' + encodeURIComponent(key))
      .then(r => r.json())
      .then(data => { if (typeof data.count === 'number') showViewCount(data.count); })
      .catch(() => {});
  }
})();

/* ============ ĐỒNG HỒ THỜI GIAN THỰC (VIỆT NAM, UTC+7) ============ */
(function () {
  const clockEl = document.getElementById('vn-clock');
  if (!clockEl) return;

  const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function tick() {
    const now = new Date();
    clockEl.textContent = `Việt Nam (UTC+7) · ${capitalize(dateFormatter.format(now))} · ${timeFormatter.format(now)}`;
  }

  tick();
  setInterval(tick, 1000);
})();


/* =========================================================
   GLOBAL TOOLTIP SYSTEM
   Dùng duy nhất data-tooltip cho toàn website.
   ========================================================= */
(() => {
  'use strict';

  let tooltip = null;
  let currentTarget = null;
  let hideTimer = null;

  const OFFSET = 10;
  const EDGE = 8;

  function ensureTooltip() {
    if (tooltip && document.body.contains(tooltip)) return tooltip;

    tooltip = document.createElement('div');
    tooltip.id = 'global-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tooltip);

    return tooltip;
  }

  function getText(el) {
    return el?.getAttribute('data-tooltip')?.trim() || '';
  }

  function position(el) {
    if (!tooltip || !el) return;

    const r = el.getBoundingClientRect();
    const t = tooltip.getBoundingClientRect();

    let left = r.left + r.width / 2 - t.width / 2;
    let top = r.top - t.height - OFFSET;
    let bottom = false;

    if (top < EDGE) {
      top = r.bottom + OFFSET;
      bottom = true;
    }

    if (left < EDGE) left = EDGE;
    if (left + t.width > innerWidth - EDGE) {
      left = innerWidth - t.width - EDGE;
    }

    if (top + t.height > innerHeight - EDGE) {
      top = Math.max(EDGE, innerHeight - t.height - EDGE);
    }

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.classList.toggle('tooltip-bottom', bottom);
  }

function position(x, y) {
  if (!tooltip) return;
  const t = tooltip.getBoundingClientRect();

  let left = x - t.width / 2;
  let top = y - t.height - OFFSET;
  let bottom = false;

  if (top < EDGE) { top = y + OFFSET; bottom = true; }
  if (left < EDGE) left = EDGE;
  if (left + t.width > innerWidth - EDGE) left = innerWidth - t.width - EDGE;
  if (top + t.height > innerHeight - EDGE) top = Math.max(EDGE, innerHeight - t.height - EDGE);

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.classList.toggle('tooltip-bottom', bottom);
}

function show(el, x, y) {
  const text = getText(el);
  if (!text) return;
  clearTimeout(hideTimer);
  currentTarget = el;
  const tip = ensureTooltip();
  tip.textContent = text;
  tip.setAttribute('aria-hidden', 'false');
  tip.classList.remove('tooltip-bottom');
  tip.classList.add('is-visible');
  position(x, y);
}

function hide() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  currentTarget = null;
  if (!tooltip) return;
  tooltip.classList.remove('is-visible');
  tooltip.setAttribute('aria-hidden', 'true');
}
function bind(el) {
  if (el.dataset.globalTooltipBound === '1') return;
  el.dataset.globalTooltipBound = '1';

  el.addEventListener('mouseenter', (e) => show(el, e.clientX, e.clientY));
  el.addEventListener('mousemove', (e) => { if (currentTarget === el) position(e.clientX, e.clientY); });
  el.addEventListener('mouseleave', hide);
  el.addEventListener('focusin', () => {
    const r = el.getBoundingClientRect();
    show(el, r.left + r.width/2, r.top);
  });
  el.addEventListener('focusout', hide);
}
  function scan() {
    document.querySelectorAll('[data-tooltip]').forEach(bind);
  }

  function init() {
    ensureTooltip();
    scan();

    // Các tooltip được tạo động bởi Discord/music cũng tự hoạt động.
    new MutationObserver(scan).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tooltip']
    });
  }

  document.addEventListener('click', (e) => {
    if (currentTarget && !currentTarget.contains(e.target)) hide();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });

  window.addEventListener('scroll', () => {
    if (currentTarget) position(currentTarget);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (currentTarget) position(currentTarget);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
