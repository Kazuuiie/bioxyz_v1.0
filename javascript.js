/* ============ BIẾN CƠ BẢN ============ */
const gate = document.getElementById('gate');
const main = document.getElementById('main');
const bgVideo = document.getElementById('bg-video');
const music = document.getElementById('bg-music');

const disc = document.getElementById('disc-player');            // nút Play/Pause
const discCover = document.getElementById('disc-player-cover'); // ảnh đĩa

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

/* ============ FIX: khai báo sớm để tránh lỗi TDZ (ReferenceError) ============
 * Các biến này trước đây được khai báo ở section VISUALIZER (bên dưới),
 * nhưng lại được dùng sớm hơn qua cacheTrackMiniBars() -> renderTrackList()
 * (được gọi ngay lúc khởi tạo trackMenuBtn ở trên). Vì dùng "let/const" có
 * temporal dead zone, việc gọi hàm dùng biến trước dòng khai báo gốc sẽ làm
 * toàn bộ script phía sau (gate, tooltip, discord...) không chạy được.
 * => Khai báo chúng NGAY TỪ ĐẦU, và đã xoá phần khai báo trùng ở dưới.
 */
const mainBarsCache = document.querySelectorAll('.music-bars .bar');
let miniBarsPerTrack = [];
let allMiniBarsFlat = [];
let visualizerDataArray = null;
let barsAreReset = true;

/* ============ CATEGORY ============ */
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
  return CATEGORY_LABELS[cat] ||
    (cat.charAt(0).toUpperCase() + cat.slice(1));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

let currentCategory = 'all';
const trackCategoryFiltersEl =
  document.getElementById('track-category-filters');

function renderCategoryFilters() {
  if (!trackCategoryFiltersEl) return;

  const cats = Array.from(
    new Set(
      tracks
        .map(t => t.category)
        .filter(Boolean)
    )
  );

  if (!cats.length) {
    trackCategoryFiltersEl.innerHTML = '';
    return;
  }

  const chips = ['all', ...cats];

  trackCategoryFiltersEl.innerHTML = chips.map(c => `
    <button
      type="button"
      class="category-chip${c === currentCategory ? ' active' : ''}"
      data-category="${escapeHtml(c)}"
      data-tooltip="${c === 'all'
        ? 'Tất cả bài hát'
        : escapeHtml(getCategoryLabel(c))}"
      role="tab"
      aria-selected="${c === currentCategory}">
      ${c === 'all'
        ? 'Tất cả'
        : escapeHtml(getCategoryLabel(c))}
    </button>
  `).join('');
}

if (albumCover && bioConfig.avatar) {
  albumCover.src = bioConfig.avatar;
}

/* ============ MUSIC ============ */

const tracks =
  Array.isArray(bioConfig.tracks) && bioConfig.tracks.length
    ? bioConfig.tracks
    : [{
        title: 'Tên bài hát — nghệ sĩ',
        file: 'song1.mp3',
        disc: 'images1.png'
      }];

let currentTrackIndex = Number.isInteger(bioConfig.defaultIndex)
  ? bioConfig.defaultIndex
  : 0;

function getTrackTitle(track) {
  return String(track?.title || 'Không tên').trim() || 'Không tên';
}

/*
 * FIX QUAN TRỌNG:
 * Tooltip của music-title lấy trực tiếp từ data-tooltip.
 * Mỗi lần bài hát đổi, hàm này đổi cả:
 *   1. textContent
 *   2. data-tooltip
 * Global MutationObserver phía dưới sẽ cập nhật tooltip
 * NGAY LẬP TỨC, kể cả khi con trỏ đang hover sẵn.
 */
function updateMusicTooltip(track) {
  if (!musicTitle) return;

  const title = getTrackTitle(track);
  const parts = title.split(/\s+-\s+/);
  const song = parts.shift()?.trim() || title;
  const artist = parts.join(' - ').trim();

  let mainEl = musicTitle.querySelector('.music-title-main');
  let sepEl = musicTitle.querySelector('.music-title-sep');
  let artistEl = musicTitle.querySelector('.music-title-artist');

  if (!mainEl || !sepEl || !artistEl) {
    musicTitle.textContent = '';

    mainEl = document.createElement('span');
    mainEl.className = 'music-title-main';

    sepEl = document.createElement('span');
    sepEl.className = 'music-title-sep';

    artistEl = document.createElement('span');
    artistEl.className = 'music-title-artist';

    musicTitle.append(mainEl, sepEl, artistEl);
  }

  mainEl.textContent = song;
  sepEl.textContent = artist ? '—' : '';
  artistEl.textContent = artist;
  artistEl.style.display = artist ? '' : 'none';
  musicTitle.setAttribute('data-tooltip', title);
}

function applyTrack(index, autoplay) {
  if (!tracks.length || !music) return;

  const wasPlaying =
    autoplay !== undefined
      ? autoplay
      : !music.paused;

  currentTrackIndex =
    (index + tracks.length) % tracks.length;

  const track = tracks[currentTrackIndex];
  const title = getTrackTitle(track);

  updateMusicTooltip(track);

  if (discLabel) {
    const discUrl = track.disc
      ? String(track.disc).replace(/'/g, "\\'")
      : '';

    discLabel.style.backgroundImage =
      discUrl ? `url('${discUrl}')` : '';
  }

  if (discCover) {
    discCover.setAttribute(
      'data-tooltip',
      title
    );
  }

  if (track.file) {
    const source = music.querySelector('source');

    if (source) {
      source.src = track.file;
      music.load();

      if (wasPlaying) {
        music.play().catch(() => {});
      }
    }
  }

  updateTrackListActiveState();
}

function renderTrackList() {
  if (!trackListEl) return;

  const filtered = tracks
    .map((t, i) => ({ t, i }))
    .filter(({ t }) =>
      currentCategory === 'all' ||
      t.category === currentCategory
    );

  if (!filtered.length) {
    trackListEl.innerHTML =
      '<li class="track-list-empty">Không có bài hát nào trong mục này</li>';
    cacheTrackMiniBars();
    return;
  }

  trackListEl.innerHTML = filtered.map(({ t, i }) => {
    const title = getTrackTitle(t);

    return `
      <li
        class="track-item${i === currentTrackIndex ? ' active' : ''}"
        data-index="${i}"
        data-tooltip="${escapeHtml(title)}">
        <span class="t-index">${i + 1}</span>
        <img
          class="t-cover"
          src="${escapeHtml(t.disc || '')}"
          alt=""
          loading="lazy">
        <div class="t-info">
          <p class="t-title">${escapeHtml(title)}</p>
          ${t.category
            ? `<span class="t-category">${escapeHtml(
                getCategoryLabel(t.category)
              )}</span>`
            : ''}
        </div>
        <div class="mini-bars">
          <span class="m-bar"></span>
          <span class="m-bar"></span>
          <span class="m-bar"></span>
        </div>
      </li>
    `;
  }).join('');

  cacheTrackMiniBars();
}

function updateTrackListActiveState() {
  if (!trackListEl) return;

  trackListEl
    .querySelectorAll('.track-item')
    .forEach(item => {
      item.classList.toggle(
        'active',
        Number(item.dataset.index) ===
          currentTrackIndex
      );
    });
}

function openTrackList() {
  if (!trackListPanel) return;

  trackListPanel.classList.add('open');

  if (trackMenuBtn) {
    trackMenuBtn.setAttribute(
      'aria-expanded',
      'true'
    );
  }
}

function closeTrackList() {
  if (!trackListPanel) return;

  trackListPanel.classList.remove('open');

  if (trackMenuBtn) {
    trackMenuBtn.setAttribute(
      'aria-expanded',
      'false'
    );
  }
}

if (trackCategoryFiltersEl) {
  trackCategoryFiltersEl.addEventListener(
    'click',
    e => {
      e.stopPropagation();

      const chip =
        e.target.closest('.category-chip');

      if (!chip) return;

      currentCategory =
        chip.dataset.category || 'all';

      renderCategoryFilters();
      renderTrackList();
    }
  );
}

if (trackMenuBtn && trackListPanel) {
  renderCategoryFilters();
  renderTrackList();

  trackMenuBtn.addEventListener(
    'click',
    e => {
      e.stopPropagation();

      trackListPanel.classList.contains('open')
        ? closeTrackList()
        : openTrackList();
    }
  );

  if (trackListClose) {
    trackListClose.addEventListener(
      'click',
      e => {
        e.stopPropagation();
        closeTrackList();
      }
    );
  }

  if (trackListEl) {
    trackListEl.addEventListener(
      'click',
      e => {
        const item =
          e.target.closest('.track-item');

        if (!item) return;

        applyTrack(
          Number(item.dataset.index),
          true
        );

        closeTrackList();
      }
    );
  }
}

if (tracks.length) {
  if (
    currentTrackIndex < 0 ||
    currentTrackIndex >= tracks.length
  ) {
    currentTrackIndex = 0;
  }

  applyTrack(currentTrackIndex);
}

function setMusicState(isPlaying) {
  if (musicBox) {
    musicBox.classList.toggle(
      'is-playing',
      isPlaying
    );
  }

  if (disc) {
    disc.setAttribute(
      'aria-pressed',
      isPlaying ? 'true' : 'false'
    );

    disc.setAttribute(
      'data-tooltip',
      isPlaying
        ? 'Tạm dừng nhạc'
        : 'Phát nhạc'
    );
  }

  if (discTip) {
    const tip = isPlaying
      ? 'đang phát — bấm để tắt'
      : 'bấm để phát nhạc';

    discTip.textContent = tip;
    discTip.setAttribute(
      'data-tooltip',
      tip
    );
  }
}

/* ============ GATE ============ */
const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

function spawnGateBurst(x, y) {
  if (prefersReducedMotion) return;

  const burst =
    document.createElement('div');

  burst.className = 'gate-burst';

  const size = 220;

  burst.style.left = x + 'px';
  burst.style.top = y + 'px';
  burst.style.width = size + 'px';
  burst.style.height = size + 'px';

  document.body.appendChild(burst);

  burst.addEventListener(
    'animationend',
    () => burst.remove(),
    { once: true }
  );
}

if (gate) {
  gate.addEventListener(
    'click',
    e => {
      const cx =
        e.clientX ||
        window.innerWidth / 2;

      const cy =
        e.clientY ||
        window.innerHeight / 2;

      spawnGateBurst(cx, cy);

      gate.classList.add('hidden');

      setTimeout(() => {
        gate.hidden = true;

        if (main) {
          main.hidden = false;
        }

        requestAnimationFrame(() => {
          if (card) card.classList.add('in');
          if (dock) dock.classList.add('in');
        });

        if (bgVideo) {
          bgVideo.play().catch(() => {});
        }

        if (music) {
          music.play()
            .then(() => setMusicState(true))
            .catch(() => setMusicState(false));
        }
      }, 600);
    }
  );
}

/* ============ CARD TILT ============ */
if (
  card &&
  window.matchMedia &&
  window.matchMedia(
    '(hover:hover) and (pointer:fine)'
  ).matches &&
  !prefersReducedMotion
) {
  let tiltRAF = null;
  let lastPx = 0;
  let lastPy = 0;

  card.addEventListener(
    'mouseenter',
    () => card.classList.add('tilt-ready')
  );

  card.addEventListener(
    'mousemove',
    e => {
      if (!card.classList.contains('in')) return;

      const rect =
        card.getBoundingClientRect();

      const px =
        (e.clientX - rect.left) /
          rect.width -
        0.5;

      const py =
        (e.clientY - rect.top) /
          rect.height -
        0.5;

      if (
        Math.abs(px - lastPx) < 0.01 &&
        Math.abs(py - lastPy) < 0.01
      ) return;

      lastPx = px;
      lastPy = py;

      if (tiltRAF) {
        cancelAnimationFrame(tiltRAF);
      }

      tiltRAF =
        requestAnimationFrame(() => {
          card.style.transform =
            `translateY(0) scale(1) rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg)`;
        });
    }
  );

  card.addEventListener(
    'mouseleave',
    () => {
      if (tiltRAF) {
        cancelAnimationFrame(tiltRAF);
      }

      card.style.transform =
        'translateY(0) scale(1) rotateX(0deg) rotateY(0deg)';
    }
  );
}

/* ============ MEDIA EVENTS ============ */
if (music) {
  music.addEventListener(
    'play',
    () => setMusicState(true)
  );

  music.addEventListener(
    'pause',
    () => setMusicState(false)
  );

  music.addEventListener(
    'ended',
    () => applyTrack(
      currentTrackIndex + 1,
      true
    )
  );
}

if (disc) {
  disc.addEventListener(
    'click',
    () => {
      if (!music) return;

      if (music.paused) {
        music.play().catch(() => {});
      } else {
        music.pause();
      }
    }
  );
}

if (musicPrev) {
  musicPrev.addEventListener(
    'click',
    () => applyTrack(
      currentTrackIndex - 1,
      true
    )
  );
}

if (musicNext) {
  musicNext.addEventListener(
    'click',
    () => applyTrack(
      currentTrackIndex + 1,
      true
    )
  );
}

/* ============ PROGRESS ============ */
const progressContainer =
  document.getElementById(
    'progress-container'
  );

const progressFill =
  document.getElementById(
    'progress-fill'
  );

const currentTimeEl =
  document.getElementById(
    'current-time'
  );

const durationTimeEl =
  document.getElementById(
    'duration-time'
  );

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';

  const mins =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);

  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

if (music) {
  music.addEventListener(
    'loadedmetadata',
    () => {
      if (durationTimeEl) {
        durationTimeEl.textContent =
          formatTime(music.duration);
      }
    }
  );

  music.addEventListener(
    'timeupdate',
    () => {
      if (!music.duration) return;

      const percent =
        music.currentTime /
        music.duration;

      if (progressFill) {
        progressFill.style.transform =
          `scaleX(${percent})`;
      }

      if (currentTimeEl) {
        currentTimeEl.textContent =
          formatTime(music.currentTime);
      }
    }
  );
}

if (progressContainer) {
  progressContainer.addEventListener(
    'click',
    e => {
      const rect =
        progressContainer.getBoundingClientRect();

      const percent =
        (e.clientX - rect.left) /
        rect.width;

      if (music && music.duration) {
        music.currentTime =
          Math.max(
            0,
            Math.min(1, percent)
          ) * music.duration;
      }
    }
  );
}

/* ============ VOLUME ============ */
const volumeBtn =
  document.getElementById(
    'volume-btn'
  );

const volumeSliderContainer =
  document.getElementById(
    'volume-slider-container'
  );

const volumeSliderFill =
  document.getElementById(
    'volume-slider-fill'
  );

const volWave =
  document.querySelector('.vol-wave');

const VOLUME_STORAGE_KEY =
  'bio-music-volume';

const LAST_VOLUME_STORAGE_KEY =
  'bio-music-last-volume';

function loadStoredVolume() {
  try {
    const raw =
      localStorage.getItem(
        VOLUME_STORAGE_KEY
      );

    const val = parseFloat(raw);

    if (
      !isNaN(val) &&
      val >= 0 &&
      val <= 1
    ) {
      return val;
    }
  } catch (e) {}

  return 1;
}

function loadStoredLastVolume(fallback) {
  try {
    const raw =
      localStorage.getItem(
        LAST_VOLUME_STORAGE_KEY
      );

    const val = parseFloat(raw);

    if (
      !isNaN(val) &&
      val > 0 &&
      val <= 1
    ) {
      return val;
    }
  } catch (e) {}

  return fallback;
}

function saveVolume(val) {
  try {
    localStorage.setItem(
      VOLUME_STORAGE_KEY,
      String(val)
    );
  } catch (e) {}
}

function saveLastVolume(val) {
  try {
    localStorage.setItem(
      LAST_VOLUME_STORAGE_KEY,
      String(val)
    );
  } catch (e) {}
}

const initialVolume =
  loadStoredVolume();

let lastVolume =
  loadStoredLastVolume(
    initialVolume > 0
      ? initialVolume
      : 1
  );

function updateVolume(
  val,
  persist = true
) {
  val =
    Math.max(
      0,
      Math.min(1, val)
    );

  if (music) {
    music.volume = val;
  }

  if (volumeSliderFill) {
    volumeSliderFill.style.transform =
      `scaleX(${val})`;
  }

  if (volWave) {
    volWave.style.display =
      val === 0
        ? 'none'
        : 'block';
  }

  if (persist) {
    saveVolume(val);
  }
}

updateVolume(
  initialVolume,
  false
);

let isDraggingVol = false;

function handleVolMove(e) {
  if (!volumeSliderContainer) return;

  const rect =
    volumeSliderContainer.getBoundingClientRect();

  if (!rect.width) return;

  const percent =
    (e.clientX - rect.left) /
    rect.width;

  updateVolume(percent);
}

if (volumeSliderContainer) {
  volumeSliderContainer.addEventListener(
    'mousedown',
    e => {
      isDraggingVol = true;
      handleVolMove(e);
    }
  );
}

document.addEventListener(
  'mousemove',
  e => {
    if (!isDraggingVol) return;

    e.preventDefault();
    handleVolMove(e);
  }
);

document.addEventListener(
  'mouseup',
  () => {
    isDraggingVol = false;
  }
);

if (volumeBtn) {
  volumeBtn.addEventListener(
    'click',
    () => {
      const currentVol =
        music ? music.volume : 1;

      if (currentVol > 0) {
        lastVolume = currentVol;
        saveLastVolume(lastVolume);
        updateVolume(0);
      } else {
        updateVolume(
          lastVolume || 1
        );
      }
    }
  );
}

/* ============ VISUALIZER ============ */
let audioCtx = null;
let analyser = null;
let source = null;
let isAudioContextInit = false;

/* FIX: mainBarsCache / miniBarsPerTrack / allMiniBarsFlat /
   visualizerDataArray / barsAreReset đã được khai báo sớm ở đầu file
   (xem section "BIẾN CƠ BẢN") để tránh lỗi TDZ ReferenceError. */

function cacheTrackMiniBars() {
  if (!trackListEl) return;

  const items =
    trackListEl.querySelectorAll(
      '.track-item'
    );

  miniBarsPerTrack =
    Array.from(items).map(item =>
      Array.from(
        item.querySelectorAll(
          '.m-bar'
        )
      )
    );

  allMiniBarsFlat =
    miniBarsPerTrack.flat();
}

cacheTrackMiniBars();

let rafId = null;

function initVisualizer() {
  if (
    isAudioContextInit ||
    !music
  ) {
    return;
  }

  const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContext) return;

  audioCtx =
    new AudioContext();

  analyser =
    audioCtx.createAnalyser();

  analyser.fftSize = 256;

  visualizerDataArray =
    new Uint8Array(
      analyser.frequencyBinCount
    );

  source =
    audioCtx.createMediaElementSource(
      music
    );

  source.connect(analyser);
  analyser.connect(
    audioCtx.destination
  );

  isAudioContextInit = true;
}

const SAMPLE_INDICES = [
  1, 2, 4, 6, 8, 10,
  12, 14, 16, 18, 20, 22
];

const MINI_INDICES = [1, 4, 8];

function resetBarsOnce() {
  if (barsAreReset) return;

  mainBarsCache.forEach(
    bar => {
      bar.style.transform =
        'scaleY(0.08)';
    }
  );

  allMiniBarsFlat.forEach(
    bar => {
      bar.style.transform =
        'scaleY(0.1)';
    }
  );

  barsAreReset = true;
}

function renderFrame() {
  if (
    !analyser ||
    !visualizerDataArray ||
    music.paused
  ) {
    resetBarsOnce();
    rafId = null;
    return;
  }

  barsAreReset = false;

  analyser.getByteFrequencyData(
    visualizerDataArray
  );

  mainBarsCache.forEach(
    (bar, index) => {
      const value =
        visualizerDataArray[
          SAMPLE_INDICES[index]
        ] || 0;

      let scale =
        (value / 255) * 0.85;

      scale =
        Math.max(
          0.08,
          Math.min(1.0, scale)
        );

      bar.style.transform =
        `scaleY(${scale})`;
    }
  );

  if (
    trackListPanel &&
    trackListPanel.classList.contains(
      'open'
    )
  ) {
    const activeMiniBars =
      miniBarsPerTrack[
        currentTrackIndex
      ];

    if (
      activeMiniBars &&
      activeMiniBars.length
    ) {
      activeMiniBars.forEach(
        (mBar, index) => {
          const val =
            visualizerDataArray[
              MINI_INDICES[index]
            ] || 0;

          let miniScale =
            (val / 255) * 0.9;

          miniScale =
            Math.max(
              0.1,
              Math.min(
                1.0,
                miniScale
              )
            );

          mBar.style.transform =
            `scaleY(${miniScale})`;
        }
      );
    }
  }

  rafId =
    requestAnimationFrame(
      renderFrame
    );
}

if (music) {
  music.addEventListener(
    'play',
    () => {
      if (!isAudioContextInit) {
        initVisualizer();
      }

      if (
        audioCtx &&
        audioCtx.state ===
          'suspended'
      ) {
        audioCtx.resume().catch(
          () => {}
        );
      }

      if (rafId === null) {
        rafId =
          requestAnimationFrame(
            renderFrame
          );
      }
    }
  );

  music.addEventListener(
    'pause',
    () => {
      if (rafId !== null) {
        cancelAnimationFrame(
          rafId
        );

        rafId = null;
      }

      resetBarsOnce();
    }
  );
}

/* ============ DISCORD / LANYARD ============ */
(function initDiscord() {
  const dmpRoot =
    document.getElementById(
      'discord-mini-profile'
    );

  const dmpZone =
    document.getElementById(
      'dmp-nameplate-zone'
    ) || dmpRoot;

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

  function applyDmpNameplate({
    videoUrl,
    staticUrl,
    palette
  } = {}) {
    if (
      !dmpRoot ||
      (!videoUrl && !staticUrl)
    ) {
      return;
    }

    if (
      palette &&
      DMP_PALETTE_COLORS[palette]
    ) {
      dmpRoot.style.setProperty(
        '--dmp-nameplate-color',
        DMP_PALETTE_COLORS[palette]
      );
    }

    if (staticUrl) {
      dmpRoot.style.setProperty(
        '--dmp-nameplate',
        `url('${staticUrl}')`
      );
    }

    const reduced =
      window.matchMedia &&
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (
      videoUrl &&
      !reduced
    ) {
      const video =
        document.createElement(
          'video'
        );

      video.className =
        'dmp-nameplate-video';

      video.src = videoUrl;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;

      video.setAttribute(
        'aria-hidden',
        'true'
      );

      video.onerror = () =>
        video.remove();

      dmpZone.prepend(video);

      video.play().catch(
        () => {}
      );
    }

    dmpRoot.classList.add(
      'has-nameplate'
    );
  }

  if (
    dmpRoot &&
    bioConfig.discordNameplateWorkerUrl
  ) {
    fetch(
      bioConfig.discordNameplateWorkerUrl
    )
      .then(res => res.json())
      .then(data => {
        if (
          data &&
          (
            data.nameplateUrl ||
            data.nameplateStaticUrl
          )
        ) {
          applyDmpNameplate({
            videoUrl:
              data.nameplateUrl,
            staticUrl:
              data.nameplateStaticUrl,
            palette:
              data.nameplatePalette
          });
        } else if (
          bioConfig.discordNameplateStaticUrl
        ) {
          applyDmpNameplate({
            staticUrl:
              bioConfig.discordNameplateStaticUrl
          });
        }
      })
      .catch(() => {
        if (
          bioConfig.discordNameplateStaticUrl
        ) {
          applyDmpNameplate({
            staticUrl:
              bioConfig.discordNameplateStaticUrl
          });
        }
      });
  } else if (
    dmpRoot &&
    bioConfig.discordNameplateStaticUrl
  ) {
    applyDmpNameplate({
      staticUrl:
        bioConfig.discordNameplateStaticUrl
    });
  }

  const discordId =
    bioConfig.discordId;

  if (!discordId) return;

  const dmpAvatar =
    document.getElementById(
      'dmp-avatar'
    );

  const dmpDecoration =
    document.getElementById(
      'dmp-decoration'
    );

  const dmpUsername =
    document.getElementById(
      'dmp-username'
    );

  const dmpBadges =
    document.getElementById(
      'dmp-badges'
    );

  const dmpActivity =
    document.getElementById(
      'dmp-activity'
    );

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

  function activityImageUrl(
    activity,
    key
  ) {
    if (
      !activity ||
      !activity.assets
    ) {
      return null;
    }

    const img =
      activity.assets[key];

    if (!img) return null;

    if (
      img.startsWith(
        'mp:external/'
      )
    ) {
      return `https://media.discordapp.net/external/${img.slice('mp:external/'.length)}`;
    }

    if (
      img.startsWith('spotify:')
    ) {
      return `https://i.scdn.co/image/${img.slice('spotify:'.length)}`;
    }

    if (
      img.startsWith('mp:')
    ) {
      return `https://media.discordapp.net/${img.slice(3)}`;
    }

    if (activity.application_id) {
      return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
    }

    return null;
  }

  function pickActivityCard(data) {
    if (
      data.listening_to_spotify &&
      data.spotify
    ) {
      const sp =
        data.spotify;

      return {
        name:
          '🎧 Đang nghe Spotify',
        details:
          sp.song || '',
        state:
          sp.artist
            ? `của ${sp.artist}`
            : '',
        image:
          sp.album_art_url || null,
        smallImage: null,
        start:
          sp.timestamps &&
          sp.timestamps.start
      };
    }

    const act =
      (data.activities || [])
        .find(a => a.type !== 4);

    if (!act) return null;

    return {
      name:
        `${ACTIVITY_TYPE_LABEL[act.type] || 'Đang hoạt động'} ${act.name || ''}`.trim(),
      details:
        act.details || '',
      state:
        act.state || '',
      image:
        activityImageUrl(
          act,
          'large_image'
        ),
      smallImage:
        activityImageUrl(
          act,
          'small_image'
        ),
      start:
        act.timestamps &&
        act.timestamps.start
    };
  }

  let activityTimerInterval = null;

  function startActivityTimer(
    startMs
  ) {
    clearInterval(
      activityTimerInterval
    );

    const el =
      document.getElementById(
        'dmp-act-time'
      );

    if (!el) return;

    if (!startMs) {
      el.textContent = '';
      return;
    }

    function tick() {
      const diff =
        Date.now() - startMs;

      if (diff < 0) {
        el.textContent = '';
        return;
      }

      const totalSec =
        Math.floor(
          diff / 1000
        );

      const h =
        Math.floor(
          totalSec / 3600
        );

      const m =
        Math.floor(
          (totalSec % 3600) / 60
        );

      const s =
        totalSec % 60;

      const mm =
        h > 0
          ? String(m).padStart(2, '0')
          : String(m);

      el.textContent =
        `⏱ ${h > 0 ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')} đã trôi qua`;
    }

    tick();

    activityTimerInterval =
      setInterval(
        tick,
        1000
      );
  }

  let isActivityEnabledByUser = true;
  let currentCardData = null;

  const toggleBtn =
    document.getElementById(
      'toggle-activity-btn'
    );

  function setActivityPanel(
    cardData
  ) {
    currentCardData =
      cardData;

    const panel =
      document.getElementById(
        'dmp-activity-panel'
      );

    if (!panel) return;

    if (
      !isActivityEnabledByUser
    ) {
      panel.classList.add(
        'user-collapsed'
      );

      panel.classList.remove(
        'open'
      );

      panel.style.maxHeight =
        '0px';

      clearInterval(
        activityTimerInterval
      );

      return;
    }

    if (!cardData) {
      panel.classList.remove(
        'open'
      );

      panel.style.maxHeight =
        '0px';

      clearInterval(
        activityTimerInterval
      );

      return;
    }

    const imgEl =
      document.getElementById(
        'dmp-act-img'
      );

    const imgSmallEl =
      document.getElementById(
        'dmp-act-img-small'
      );

    const nameEl =
      document.getElementById(
        'dmp-act-name'
      );

    const detailsEl =
      document.getElementById(
        'dmp-act-details'
      );

    const stateEl =
      document.getElementById(
        'dmp-act-state'
      );

    if (imgEl) {
      if (cardData.image) {
        imgEl.src =
          cardData.image;

        imgEl.style.display =
          'block';
      } else {
        imgEl.style.display =
          'none';
      }
    }

    if (imgSmallEl) {
      if (cardData.smallImage) {
        imgSmallEl.src =
          cardData.smallImage;

        imgSmallEl.style.display =
          'block';
      } else {
        imgSmallEl.style.display =
          'none';
      }
    }

    if (nameEl) {
      nameEl.textContent =
        cardData.name || '';
    }

    if (detailsEl) {
      detailsEl.textContent =
        cardData.details || '';

      detailsEl.style.display =
        cardData.details
          ? 'block'
          : 'none';
    }

    if (stateEl) {
      stateEl.textContent =
        cardData.state || '';

      stateEl.style.display =
        cardData.state
          ? 'block'
          : 'none';
    }

    startActivityTimer(
      cardData.start
    );

    panel.classList.remove(
      'user-collapsed'
    );

    panel.classList.add(
      'open'
    );

    requestAnimationFrame(
      () => {
        panel.style.maxHeight =
          panel.scrollHeight +
          'px';
      }
    );
  }

  if (toggleBtn) {
    toggleBtn.addEventListener(
      'click',
      e => {
        e.stopPropagation();

        isActivityEnabledByUser =
          !isActivityEnabledByUser;

        const panel =
          document.getElementById(
            'dmp-activity-panel'
          );

        toggleBtn.classList.toggle(
          'is-disabled',
          !isActivityEnabledByUser
        );

        toggleBtn.setAttribute(
          'data-tooltip',
          isActivityEnabledByUser
            ? 'Ẩn hoạt động'
            : 'Hiện hoạt động'
        );

        if (
          !isActivityEnabledByUser
        ) {
          if (panel) {
            panel.classList.add(
              'user-collapsed'
            );

            panel.classList.remove(
              'open'
            );

            panel.style.maxHeight =
              '0px';
          }

          clearInterval(
            activityTimerInterval
          );
        } else {
          if (panel) {
            panel.classList.remove(
              'user-collapsed'
            );
          }

          if (currentCardData) {
            setActivityPanel(
              currentCardData
            );
          }
        }
      }
    );
  }

  const BADGE_FLAGS = [
    { bit: 1 << 0, icon: '👷', label: 'Discord Staff' },
    { bit: 1 << 1, icon: '🤝', label: 'Partnered Server Owner' },
    { bit: 1 << 2, icon: '🎉', label: 'HypeSquad Events' },
    { bit: 1 << 3, icon: '🐛', label: 'Bug Hunter Level 1' },
    { bit: 1 << 6, icon: '💪', label: 'HypeSquad Bravery' },
    { bit: 1 << 7, icon: '💎', label: 'HypeSquad Brilliance' },
    { bit: 1 << 8, icon: '⚖️', label: 'HypeSquad Balance' },
    { bit: 1 << 9, icon: '🌱', label: 'Early Supporter' },
    { bit: 1 << 14, icon: '🐞', label: 'Bug Hunter Level 2' },
    { bit: 1 << 17, icon: '⭐', label: 'Early Verified Bot Developer' },
    { bit: 1 << 18, icon: '🛡️', label: 'Certified Moderator' },
    { bit: 1 << 22, icon: '💻', label: 'Active Developer' }
  ];

  function avatarUrl(data) {
    if (!data.discord_user) return '';

    const {
      id,
      avatar,
      discriminator
    } = data.discord_user;

    if (avatar) {
      const ext =
        avatar.startsWith('a_')
          ? 'gif'
          : 'png';

      return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`;
    }

    const fallbackIndex =
      discriminator &&
      discriminator !== '0'
        ? Number(discriminator) % 5
        : Number(
            (BigInt(id) >> 22n) % 6n
          );

    return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  }

  function decorationUrl(data) {
    const deco =
      data.discord_user &&
      data.discord_user
        .avatar_decoration_data;

    if (!deco || !deco.asset) {
      return null;
    }

    return `https://cdn.discordapp.com/avatar-decoration-presets/${deco.asset}.png?size=128`;
  }

  function renderBadges(data) {
    if (!dmpBadges) return;

    const flags =
      (data.discord_user &&
        data.discord_user.public_flags) ||
      0;

    dmpBadges.innerHTML =
      BADGE_FLAGS
        .filter(
          b =>
            (flags & b.bit) !== 0
        )
        .map(
          b =>
            `<span class="dmp-badge" data-tooltip="${escapeHtml(b.label)}">${b.icon}</span>`
        )
        .join('');
  }

  function activityText(data) {
    const custom =
      (data.activities || [])
        .find(a => a.type === 4);

    if (
      custom &&
      (custom.state || custom.emoji)
    ) {
      const emoji =
        custom.emoji
          ? (
              custom.emoji.name
                ? custom.emoji.name + ' '
                : ''
            )
          : '';

      return (
        `${emoji}${custom.state || ''}`
      ).trim();
    }

    if (
      data.listening_to_spotify &&
      data.spotify
    ) {
      return `🎧 ${data.spotify.song} — ${data.spotify.artist}`;
    }

    const game =
      (data.activities || [])
        .find(a => a.type === 0);

    if (game && game.name) {
      return `🎮 Đang chơi ${game.name}`;
    }

    return (
      STATUS_LABEL[
        data.discord_status
      ] ||
      STATUS_LABEL.offline
    );
  }

  function applyStatus(data) {
    if (
      !data ||
      !data.discord_user
    ) {
      return;
    }

    const username =
      data.discord_user.global_name ||
      data.discord_user.username ||
      'Unknown';

    const avatar =
      avatarUrl(data);

    const decoration =
      decorationUrl(data);

    const activity =
      activityText(data);

    if (dmpAvatar) {
      dmpAvatar.src = avatar;
    }

    if (dmpUsername) {
      dmpUsername.textContent =
        username;
    }

    if (dmpActivity) {
      dmpActivity.textContent =
        activity;
    }

    if (dmpRoot) {
      dmpRoot.classList.add('in');
    }

    const statusDot =
      document.getElementById(
        'dmp-status-dot'
      );

    if (statusDot) {
      const status =
        [
          'online',
          'idle',
          'dnd',
          'offline'
        ].includes(
          data.discord_status
        )
          ? data.discord_status
          : 'offline';

      statusDot.className =
        'dmp-status-dot ' +
        status;
    }

    if (dmpDecoration) {
      if (decoration) {
        dmpDecoration.src =
          decoration;

        dmpDecoration.style.display =
          'block';
      } else {
        dmpDecoration.style.display =
          'none';
      }
    }

    renderBadges(data);

    setActivityPanel(
      pickActivityCard(data)
    );
  }

  fetch(
    `https://api.lanyard.rest/v1/users/${discordId}`
  )
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        applyStatus(json.data);
      }
    })
    .catch(() => {
      if (dmpActivity) {
        dmpActivity.textContent =
          'không tải được trạng thái';
      }
    });

  let ws = null;
  let heartbeatInterval = null;

  function connectLanyardSocket() {
    ws =
      new WebSocket(
        'wss://api.lanyard.rest/socket'
      );

    ws.onmessage = event => {
      let msg;

      try {
        msg = JSON.parse(
          event.data
        );
      } catch {
        return;
      }

      switch (msg.op) {
        case 1:
          heartbeatInterval =
            setInterval(() => {
              if (
                ws.readyState ===
                WebSocket.OPEN
              ) {
                ws.send(
                  JSON.stringify({
                    op: 3
                  })
                );
              }
            }, msg.d.heartbeat_interval);

          ws.send(
            JSON.stringify({
              op: 2,
              d: {
                subscribe_to_id:
                  discordId
              }
            })
          );
          break;

        case 0:
          if (
            msg.t === 'INIT_STATE' ||
            msg.t === 'PRESENCE_UPDATE'
          ) {
            applyStatus(msg.d);
          }
          break;
      }
    };

    ws.onclose = () => {
      clearInterval(
        heartbeatInterval
      );

      setTimeout(
        connectLanyardSocket,
        5000
      );
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  }

  connectLanyardSocket();
})();

/* ============ FOOTER ============ */
(function initFooterTerminal() {
  const footEl =
    document.getElementById(
      'footer-bar'
    );

  const typedEl =
    document.getElementById(
      'foot-typed'
    );

  if (!footEl || !typedEl) return;

  const REDUCED_MOTION =
    window.matchMedia &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  const lines = [
    'cập nhật lần cuối · tháng 8, 2026',
    'hmm ✦',
    'hmm ✦'
  ];

  let currentIndex = 0;
  let generation = 0;
  let running = false;

  const sleep = ms =>
    new Promise(
      resolve =>
        setTimeout(resolve, ms)
    );

  async function typeText(
    text,
    gen,
    erase
  ) {
    const chars =
      Array.from(text);

    if (REDUCED_MOTION) {
      typedEl.textContent =
        erase ? '' : text;
      return;
    }

    let i =
      erase
        ? chars.length
        : 0;

    while (true) {
      if (
        gen !== generation
      ) {
        return;
      }

      typedEl.textContent =
        chars
          .slice(0, i)
          .join('');

      if (!erase) {
        i++;
        if (i > chars.length) {
          return;
        }
      } else {
        i--;
        if (i < 0) {
          return;
        }
      }

      await sleep(
        erase ? 16 : 40
      );
    }
  }

  async function goToNextLine() {
    if (running) return;

    running = true;
    generation++;

    const gen =
      generation;

    const nextIndex =
      (currentIndex + 1) %
      lines.length;

    await typeText(
      lines[currentIndex],
      gen,
      true
    );

    if (
      gen !== generation
    ) {
      running = false;
      return;
    }

    await typeText(
      lines[nextIndex],
      gen,
      false
    );

    if (
      gen === generation
    ) {
      currentIndex =
        nextIndex;

      running = false;
    }
  }

  footEl.addEventListener(
    'click',
    goToNextLine
  );

  footEl.addEventListener(
    'keydown',
    e => {
      if (
        e.key === 'Enter' ||
        e.key === ' '
      ) {
        e.preventDefault();
        goToNextLine();
      }
    }
  );

  typedEl.textContent =
    lines[currentIndex];
})();

/* ============ VIEW COUNTER ============ */
(function () {
  const VIEW_API =
    'https://views.ten870865.workers.dev';

  const OWNER_STORAGE_KEY =
    'bio_is_owner';

  const OWNER_URLKEY_STORAGE =
    'bio_owner_key';

  function checkOwnerFromUrl() {
    const params =
      new URLSearchParams(
        location.search
      );

    const key =
      params.get('key');

    if (key) {
      try {
        localStorage.setItem(
          OWNER_STORAGE_KEY,
          '1'
        );

        localStorage.setItem(
          OWNER_URLKEY_STORAGE,
          key
        );
      } catch (e) {}

      params.delete('key');

      const clean =
        location.pathname +
        (
          params.toString()
            ? '?' + params.toString()
            : ''
        );

      history.replaceState(
        {},
        '',
        clean
      );
    }
  }

  function isOwner() {
    try {
      return (
        localStorage.getItem(
          OWNER_STORAGE_KEY
        ) === '1'
      );
    } catch (e) {
      return false;
    }
  }

  function getStoredKey() {
    try {
      return (
        localStorage.getItem(
          OWNER_URLKEY_STORAGE
        ) || ''
      );
    } catch (e) {
      return '';
    }
  }

  function showViewCount(count) {
    let el =
      document.getElementById(
        'owner-view-count'
      );

    if (!el) {
      el =
        document.createElement(
          'div'
        );

      el.id =
        'owner-view-count';

      el.style.cssText =
        'position:fixed;bottom:12px;right:12px;z-index:200;' +
        'font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.04em;' +
        'background:rgba(20,16,15,.72);color:#fff8ee;padding:6px 12px;border-radius:20px;' +
        'backdrop-filter:blur(6px);pointer-events:none;';

      document.body.appendChild(el);
    }

    el.textContent =
      '👁 ' +
      count.toLocaleString('vi-VN') +
      ' views';
  }

  checkOwnerFromUrl();

  const ownerNow =
    isOwner();

  if (!ownerNow) {
    fetch(
      VIEW_API + '/hit',
      { method: 'POST' }
    ).catch(() => {});
  }

  if (ownerNow) {
    const key =
      getStoredKey();

    fetch(
      VIEW_API +
      '/count?key=' +
      encodeURIComponent(key)
    )
      .then(r => r.json())
      .then(data => {
        if (
          typeof data.count ===
          'number'
        ) {
          showViewCount(
            data.count
          );
        }
      })
      .catch(() => {});
  }
})();

/* ============ ĐỒNG HỒ VIỆT NAM ============ */
(function () {
  const clockEl =
    document.getElementById(
      'vn-clock'
    );

  if (!clockEl) return;

  const timeFormatter =
    new Intl.DateTimeFormat(
      'vi-VN',
      {
        timeZone:
          'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
    );

  const dateFormatter =
    new Intl.DateTimeFormat(
      'vi-VN',
      {
        timeZone:
          'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    );

  function capitalize(str) {
    return (
      str.charAt(0).toUpperCase() +
      str.slice(1)
    );
  }

  function tick() {
    const now =
      new Date();

    clockEl.textContent =
      `Việt Nam (UTC+7) · ${capitalize(dateFormatter.format(now))} · ${timeFormatter.format(now)}`;
  }

  tick();

  setInterval(
    tick,
    1000
  );
})();


/* ============================================================
 * LỊCH SỰ KIỆN VIỆT NAM
 * ============================================================
 * Giữ nguyên clock hiện tại; module này chỉ bổ sung lịch.
 * - Dương lịch lưu trực tiếp trong JS.
 * - Âm lịch đổi sang dương qua Huyền Minh /api/amlich.
 * - Cache localStorage để tránh gọi API liên tục.
 * - Mọi mốc thời gian được hiển thị theo Asia/Ho_Chi_Minh.
 * - Event hết -> tự loại khỏi DOM, không cần F5.
 * - Ưu tiên event còn lại của năm hiện tại.
 * ============================================================ */

(function initVietnamCalendar() {
  'use strict';

  const TIME_ZONE = 'Asia/Ho_Chi_Minh';
  const AM_LICH_API = 'https://huyenminh.com.vn/api/amlich';

  const CACHE_KEY = 'vn-calendar-amlich-cache-v3';
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

  const btn = document.getElementById('vn-calendar-btn');
  const popover = document.getElementById('vn-calendar-popover');
  const closeBtn = document.getElementById('vn-calendar-close');

  const nextCard = document.getElementById('vn-calendar-next');
  const nextName = document.getElementById('vn-calendar-next-name');
  const nextDates = document.getElementById('vn-calendar-next-dates');
  const nextCount = document.getElementById('vn-calendar-next-count');

  const daysEl = document.getElementById('vn-days');
  const hoursEl = document.getElementById('vn-hours');
  const minutesEl = document.getElementById('vn-minutes');
  const secondsEl = document.getElementById('vn-seconds');

  const listEl = document.getElementById('vn-calendar-events');
  const listCountEl = document.getElementById('vn-calendar-list-count');
  const yearLabelEl = document.getElementById('vn-calendar-year-label');
  const subEl = document.getElementById('vn-calendar-sub');
  const syncEl = document.getElementById('vn-calendar-sync');

  if (
    !btn ||
    !popover ||
    !closeBtn ||
    !nextCard ||
    !nextName ||
    !nextDates ||
    !listEl
  ) {
    return;
  }

  /* ===== DỮ LIỆU SỰ KIỆN ===== */

  const EVENTS = [
    {
      id: 'tet-duong-lich',
      title: 'Tết Dương lịch',
      icon: '🎉',
      kind: 'special',
      solar: { day: 1, month: 1 },
      lunarLabel: null
    },
    {
      id: 'quoc-khanh',
      title: 'Quốc Khánh Việt Nam',
      icon: '🇻🇳',
      kind: 'official',
      solar: { day: 2, month: 9 },
      lunarLabel: '11/07 Âm lịch'
    },
    {
      id: 'phu-nu',
      title: 'Ngày Phụ nữ Việt Nam',
      icon: '👩',
      kind: 'special',
      solar: { day: 20, month: 10 },
      lunarLabel: '09/09 Âm lịch'
    },
    {
      id: 'nha-giao',
      title: 'Ngày Nhà giáo Việt Nam',
      icon: '📖',
      kind: 'special',
      solar: { day: 20, month: 11 },
      lunarLabel: '11/10 Âm lịch'
    },
    {
      id: 'trung-thu',
      title: 'Tết Trung Thu',
      icon: '🌙',
      kind: 'special',
      lunar: { day: 15, month: 8, leap: false },
      lunarLabel: '15/08 Âm lịch'
    },
    {
      id: 'giang-sinh',
      title: 'Giáng sinh',
      icon: '🎄',
      kind: 'special',
      solar: { day: 25, month: 12 },
      lunarLabel: null
    }
  ];

  /* ===== CACHE ===== */

  let cache = {};

  try {
    cache = JSON.parse(
      localStorage.getItem(CACHE_KEY) || '{}'
    );
  } catch {
    cache = {};
  }

  function saveCache() {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(cache)
      );
    } catch {
      // localStorage bị chặn thì bỏ qua.
    }
  }

  function cacheKey(day, month, lunarYear, leap) {
    return [
      lunarYear,
      month,
      day,
      leap ? 1 : 0
    ].join('-');
  }

  /* ===== TIMEZONE HELPERS ===== */

  function vnParts(date = new Date()) {
    const parts =
      new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(date);

    const out = {};

    for (const part of parts) {
      if (part.type !== 'literal') {
        out[part.type] = Number(part.value);
      }
    }

    return out;
  }

  function vnYear(date = new Date()) {
    return vnParts(date).year;
  }

  function vnDate(year, month, day, hour = 0, minute = 0, second = 0, ms = 0) {
    // Asia/Ho_Chi_Minh = UTC+7, không DST.
    return new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour - 7,
        minute,
        second,
        ms
      )
    );
  }

  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  function formatSolarDate(date) {
    return dateFormatter.format(date);
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[ch])
    );
  }

  /* ===== ÂM -> DƯƠNG ===== */

  async function lunarToSolar(lunar, lunarYear) {
    const key = cacheKey(
      lunar.day,
      lunar.month,
      lunarYear,
      Boolean(lunar.leap)
    );

    const cached = cache[key];

    if (
      cached &&
      cached.iso &&
      Date.now() - Number(cached.timestamp || 0) < CACHE_TTL
    ) {
      return cached.iso;
    }

    const url = new URL(AM_LICH_API);

    url.searchParams.set('d', String(lunar.day));
    url.searchParams.set('m', String(lunar.month));
    url.searchParams.set('y', String(lunarYear));

    if (lunar.leap) {
      url.searchParams.set('nhuan', '1');
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data || typeof data.iso !== 'string') {
        throw new Error('API không trả về iso.');
      }

      cache[key] = {
        iso: data.iso,
        timestamp: Date.now()
      };

      saveCache();

      return data.iso;
    } catch (error) {
      console.warn('[VN CALENDAR] Không đổi được âm lịch:', error);
      return null;
    }
  }

  /* ===== RESOLVE EVENT ===== */

  async function resolveEvent(event, year) {
    let iso = null;

    if (event.solar) {
      iso =
        `${year}-${String(event.solar.month).padStart(2, '0')}-` +
        `${String(event.solar.day).padStart(2, '0')}`;
    } else if (event.lunar) {
      iso = await lunarToSolar(
        event.lunar,
        year
      );
    }

    if (!iso) {
      return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) {
      return null;
    }

    const resolvedYear = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const start = vnDate(
      resolvedYear,
      month,
      day
    );

    const end = vnDate(
      resolvedYear,
      month,
      day + 1
    );

    return {
      ...event,
      year: resolvedYear,
      month,
      day,
      iso,
      start,
      end
    };
  }

  let resolvedEvents = [];
  let building = false;

  async function rebuildEvents() {
    if (building) {
      return;
    }

    building = true;

    try {
      const currentYear = vnYear();
      const years = [
        currentYear,
        currentYear + 1
      ];

      const results = [];

      for (const event of EVENTS) {
        for (const year of years) {
          const item = await resolveEvent(
            event,
            year
          );

          if (!item) {
            continue;
          }

          const duplicate = results.some(
            x =>
              x.id === item.id &&
              x.iso === item.iso
          );

          if (!duplicate) {
            results.push(item);
          }
        }
      }

      resolvedEvents =
        results.sort(
          (a, b) =>
            a.start.getTime() -
            b.start.getTime()
        );

      updateSubtitle();
    } finally {
      building = false;
    }
  }

  /* ===== STATUS ===== */

  function eventStatus(event, now = new Date()) {
    const time = now.getTime();

    if (
      time >= event.start.getTime() &&
      time < event.end.getTime()
    ) {
      return 'ongoing';
    }

    if (time < event.start.getTime()) {
      return 'upcoming';
    }

    return 'ended';
  }

  function removeEnded(now = new Date()) {
    const before = resolvedEvents.length;

    resolvedEvents =
      resolvedEvents.filter(
        event =>
          eventStatus(event, now) !== 'ended'
      );

    return before !== resolvedEvents.length;
  }

  /* ===== YEAR PRIORITY ===== */

  function visibleEvents(now = new Date()) {
    const currentYear = vnYear(now);

    const active =
      resolvedEvents.filter(
        event =>
          eventStatus(event, now) !== 'ended'
      );

    // Ưu tiên toàn bộ event còn lại của năm hiện tại.
    const currentYearEvents =
      active.filter(
        event =>
          event.year === currentYear
      );

    if (currentYearEvents.length) {
      return currentYearEvents;
    }

    // Chỉ chuyển năm sau khi năm hiện tại hết event.
    return active.filter(
      event =>
        event.year > currentYear
    );
  }

  /* ===== COUNTDOWN ===== */

  function countdown(target, now) {
    let diff =
      Math.max(
        0,
        target.getTime() - now.getTime()
      );

    const totalSeconds =
      Math.floor(diff / 1000);

    const days =
      Math.floor(totalSeconds / 86400);

    const hours =
      Math.floor(
        (totalSeconds % 86400) / 3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60
      );

    const seconds =
      totalSeconds % 60;

    return {
      days,
      hours,
      minutes,
      seconds
    };
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function setCountdown(target, now) {
    const value =
      countdown(target, now);

    if (daysEl) {
      daysEl.textContent = String(
        value.days
      ).padStart(2, '0');
    }

    if (hoursEl) {
      hoursEl.textContent = pad2(
        value.hours
      );
    }

    if (minutesEl) {
      minutesEl.textContent = pad2(
        value.minutes
      );
    }

    if (secondsEl) {
      secondsEl.textContent = pad2(
        value.seconds
      );
    }
  }

  /* ===== NEXT EVENT ===== */

  function renderNext(now) {
    const events =
      visibleEvents(now);

    const next = events[0];

    if (!next) {
      nextName.textContent =
        'Không còn sự kiện';

      nextDates.textContent =
        'Hẹn gặp lại vào năm mới.';

      if (nextCount) {
        nextCount.innerHTML = `
          <div class="vn-calendar-ongoing">
            đã hoàn tất
          </div>
        `;
      }

      return;
    }

    const status =
      eventStatus(next, now);

    nextName.textContent =
      `${next.icon} ${next.title}`;

    const lunarText =
      next.lunarLabel
        ? ` · ${next.lunarLabel}`
        : '';

    nextDates.textContent =
      `${formatSolarDate(next.start)}${lunarText}`;

    if (status === 'ongoing') {
      if (nextCount) {
        nextCount.innerHTML = `
          <div class="vn-calendar-ongoing">
            đang diễn ra
          </div>
        `;
      }

      nextCard.classList.add('is-ongoing');
      return;
    }

    nextCard.classList.remove(
      'is-ongoing'
    );

    if (nextCount) {
      nextCount.innerHTML = `
        <div class="vn-calendar-count-grid">
          <div class="vn-count-box">
            <div class="vn-count-value" id="vn-days">00</div>
            <div class="vn-count-unit">Ngày</div>
          </div>
          <div class="vn-count-box">
            <div class="vn-count-value" id="vn-hours">00</div>
            <div class="vn-count-unit">Giờ</div>
          </div>
          <div class="vn-count-box">
            <div class="vn-count-value" id="vn-minutes">00</div>
            <div class="vn-count-unit">Phút</div>
          </div>
          <div class="vn-count-box">
            <div class="vn-count-value" id="vn-seconds">00</div>
            <div class="vn-count-unit">Giây</div>
          </div>
        </div>
      `;
    }

    /*
     * Re-cache vì innerHTML tạo lại 4 node.
     */
    const currentDays =
      document.getElementById('vn-days');
    const currentHours =
      document.getElementById('vn-hours');
    const currentMinutes =
      document.getElementById('vn-minutes');
    const currentSeconds =
      document.getElementById('vn-seconds');

    const value =
      countdown(next.start, now);

    if (currentDays) {
      currentDays.textContent =
        String(value.days).padStart(2, '0');
    }

    if (currentHours) {
      currentHours.textContent =
        pad2(value.hours);
    }

    if (currentMinutes) {
      currentMinutes.textContent =
        pad2(value.minutes);
    }

    if (currentSeconds) {
      currentSeconds.textContent =
        pad2(value.seconds);
    }
  }

  /* ===== LIST ===== */

  function renderList(now) {
    const events =
      visibleEvents(now);

    if (listCountEl) {
      listCountEl.textContent =
        String(events.length);
    }

    if (yearLabelEl) {
      yearLabelEl.textContent =
        String(
          events[0]?.year ||
          vnYear(now)
        );
    }

    if (!events.length) {
      listEl.innerHTML = `
        <div class="vn-calendar-empty">
          Không còn sự kiện trong năm hiện tại.
        </div>
      `;
      return;
    }

    listEl.innerHTML =
      events.map(event => {
        const status =
          eventStatus(event, now);

        const lunarText =
          event.lunarLabel || '';

        const right =
          status === 'ongoing'
            ? `<span class="vn-calendar-live">đang diễn ra</span>`
            : `còn ${Math.max(
                0,
                Math.ceil(
                  (
                    event.start.getTime() -
                    now.getTime()
                  ) / 86400000
                )
              )} ngày`;

        return `
          <div class="vn-calendar-event ${status}"
               data-event-id="${escapeHTML(event.id)}">

            <div class="vn-calendar-event-icon"
                 aria-hidden="true">
              ${escapeHTML(event.icon)}
            </div>

            <div class="vn-calendar-event-date">
              ${pad2(event.day)}/${pad2(event.month)}
            </div>

            <div class="vn-calendar-event-info">
              <p class="vn-calendar-event-name">
                ${escapeHTML(event.title)}
              </p>

              <p class="vn-calendar-event-meta">
                ${escapeHTML(formatSolarDate(event.start))}
                ${lunarText ? ` · ${escapeHTML(lunarText)}` : ''}
              </p>
            </div>

            <div class="vn-calendar-event-left">
              ${right}
            </div>

          </div>
        `;
      }).join('');
  }

  function updateSubtitle() {
    if (!subEl) {
      return;
    }

    subEl.textContent =
      'Lịch dương + âm · cập nhật realtime · UTC+7';
  }

  function render(now = new Date()) {
    removeEnded(now);
    renderNext(now);
    renderList(now);
  }

  /* ===== POPUP POSITION ===== */

  function positionPopover() {
    if (
      !popover.classList.contains('open')
    ) {
      return;
    }

    const rect =
      btn.getBoundingClientRect();

    const gap = 10;
    const margin = 8;

    /*
     * Desktop:
     * căn phải theo icon lịch,
     * giống popup nổi ngay dưới clock.
     */

    let left =
      rect.right -
      popover.offsetWidth;

    let top =
      rect.bottom + gap;

    const maxLeft =
      window.innerWidth -
      popover.offsetWidth -
      margin;

    left =
      Math.max(
        margin,
        Math.min(
          left,
          maxLeft
        )
      );

    /*
     * Nếu không đủ chỗ phía dưới,
     * mở lên phía trên.
     */

    if (
      top +
      popover.offsetHeight >
      window.innerHeight - margin
    ) {
      top =
        rect.top -
        popover.offsetHeight -
        gap;

      popover.style.transformOrigin =
        'bottom right';
    } else {
      popover.style.transformOrigin =
        'top right';
    }

    top =
      Math.max(
        margin,
        Math.min(
          top,
          window.innerHeight -
            popover.offsetHeight -
            margin
        )
      );

    popover.style.left =
      `${Math.round(left)}px`;

    popover.style.top =
      `${Math.round(top)}px`;
  }

  /* ===== OPEN / CLOSE ===== */

  function openCalendar() {
    render();

    popover.classList.add('open');

    btn.classList.add('is-open');
    btn.setAttribute(
      'aria-expanded',
      'true'
    );

    requestAnimationFrame(() => {
      positionPopover();
    });
  }

  function closeCalendar() {
    popover.classList.remove(
      'open'
    );

    btn.classList.remove('is-open');

    btn.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  btn.addEventListener(
    'click',
    event => {
      event.stopPropagation();

      if (
        popover.classList.contains('open')
      ) {
        closeCalendar();
      } else {
        openCalendar();
      }
    }
  );

  closeBtn.addEventListener(
    'click',
    event => {
      event.stopPropagation();
      closeCalendar();
    }
  );

  popover.addEventListener(
    'click',
    event => {
      event.stopPropagation();
    }
  );

  document.addEventListener(
    'click',
    event => {
      if (
        popover.classList.contains('open') &&
        !popover.contains(event.target) &&
        !btn.contains(event.target)
      ) {
        closeCalendar();
      }
    }
  );

  document.addEventListener(
    'keydown',
    event => {
      if (
        event.key === 'Escape' &&
        popover.classList.contains('open')
      ) {
        closeCalendar();
      }
    }
  );

  window.addEventListener(
    'resize',
    positionPopover,
    { passive: true }
  );

  window.addEventListener(
    'scroll',
    positionPopover,
    { passive: true }
  );

  /* ===== REALTIME ===== */

  let lastSecond = -1;
  let lastYear = vnYear();

  setInterval(() => {
    const now =
      new Date();

    const parts =
      vnParts(now);

    if (
      parts.year !== lastYear
    ) {
      lastYear =
        parts.year;

      rebuildEvents().then(() => {
        if (
          popover.classList.contains('open')
        ) {
          render(now);
          requestAnimationFrame(
            positionPopover
          );
        }
      });

      return;
    }

    /*
     * Chỉ cập nhật DOM mỗi khi giây đổi.
     */
    if (
      parts.second === lastSecond
    ) {
      return;
    }

    lastSecond =
      parts.second;

    /*
     * Event hết hạn -> tự xóa ngay.
     */
    const changed =
      removeEnded(now);

    if (
      changed ||
      popover.classList.contains('open')
    ) {
      if (
        popover.classList.contains('open')
      ) {
        render(now);
      }
    }

    if (syncEl) {
      syncEl.textContent =
        'Đang đồng bộ thời gian thực · UTC+7';
    }
  }, 250);

  /* ===== INIT ===== */

  rebuildEvents().then(() => {
    render();

    /*
     * Nếu popup đang mở do browser giữ state,
     * cập nhật vị trí sau khi resolve API.
     */
    if (
      popover.classList.contains('open')
    ) {
      requestAnimationFrame(
        positionPopover
      );
    }
  });

})();

/* ============ GLOBAL DATA-TOOLTIP ============ */
(function initGlobalTooltips() {
  'use strict';

  const tooltip =
    document.getElementById(
      'global-tooltip'
    );

  if (!tooltip) return;

  let currentTarget = null;
  let hideTimer = null;
  let raf = null;

  const OFFSET = 10;
  const EDGE = 8;

  function getText(el) {
    return (
      el?.getAttribute(
        'data-tooltip'
      )?.trim() || ''
    );
  }

  function position(el) {
    if (
      !el ||
      !tooltip.classList.contains(
        'is-visible'
      )
    ) {
      return;
    }

    const rect =
      el.getBoundingClientRect();

    const tip =
      tooltip.getBoundingClientRect();

    const width =
      tip.width;

    const height =
      tip.height;

    let left =
      rect.left +
      rect.width / 2 -
      width / 2;

    let top =
      rect.top -
      height -
      OFFSET;

    let bottom = false;

    if (top < EDGE) {
      top =
        rect.bottom +
        OFFSET;

      bottom = true;
    }

    left =
      Math.max(
        EDGE,
        Math.min(
          left,
          window.innerWidth -
            width -
            EDGE
        )
      );

    top =
      Math.max(
        EDGE,
        Math.min(
          top,
          window.innerHeight -
            height -
            EDGE
        )
      );

    tooltip.style.left =
      Math.round(left) +
      'px';

    tooltip.style.top =
      Math.round(top) +
      'px';

    tooltip.classList.toggle(
      'tooltip-bottom',
      bottom
    );
  }

  /* FIX: tooltip đuổi theo con trỏ chuột thay vì cố định
     theo vị trí phần tử. Dùng cho các sự kiện mouseenter/mousemove. */
  function positionAtMouse(x, y) {
    if (
      !tooltip.classList.contains(
        'is-visible'
      )
    ) {
      return;
    }

    const tip =
      tooltip.getBoundingClientRect();

    const width = tip.width;
    const height = tip.height;

    let left = x - width / 2;
    let top = y - height - OFFSET - 6;
    let bottom = false;

    if (top < EDGE) {
      top = y + OFFSET + 14;
      bottom = true;
    }

    left =
      Math.max(
        EDGE,
        Math.min(
          left,
          window.innerWidth - width - EDGE
        )
      );

    top =
      Math.max(
        EDGE,
        Math.min(
          top,
          window.innerHeight - height - EDGE
        )
      );

    tooltip.style.left = Math.round(left) + 'px';
    tooltip.style.top = Math.round(top) + 'px';

    tooltip.classList.toggle(
      'tooltip-bottom',
      bottom
    );
  }

  function schedulePosition() {
    if (!currentTarget) return;

    if (raf) {
      cancelAnimationFrame(
        raf
      );
    }

    raf =
      requestAnimationFrame(
        () => {
          raf = null;

          if (currentTarget) {
            position(
              currentTarget
            );
          }
        }
      );
  }

  /* FIX: show() giờ nhận thêm mouseEvt (tuỳ chọn) để định vị theo
     con trỏ chuột khi tooltip được mở bằng hover chuột. */
  function show(el, mouseEvt) {
    const text =
      getText(el);

    if (!text) return;

    clearTimeout(
      hideTimer
    );

    currentTarget = el;

    tooltip.textContent =
      text;

    tooltip.setAttribute(
      'aria-hidden',
      'false'
    );

    tooltip.classList.remove(
      'tooltip-bottom'
    );

    tooltip.classList.add(
      'is-visible'
    );

    requestAnimationFrame(
      () => {
        if (
          currentTarget !==
          el
        ) {
          return;
        }

        if (mouseEvt) {
          positionAtMouse(
            mouseEvt.clientX,
            mouseEvt.clientY
          );
        } else {
          position(el);
        }
      }
    );
  }

  function hide(
    immediate = false
  ) {
    clearTimeout(
      hideTimer
    );

    const run = () => {
      tooltip.classList.remove(
        'is-visible'
      );

      tooltip.setAttribute(
        'aria-hidden',
        'true'
      );

      tooltip.classList.remove(
        'tooltip-bottom'
      );

      currentTarget = null;
    };

    if (immediate) {
      run();
    } else {
      hideTimer =
        setTimeout(
          run,
          70
        );
    }
  }

  function init(el) {
    if (
      !el ||
      el.dataset.tooltipBound ===
        '1'
    ) {
      return;
    }

    el.dataset.tooltipBound =
      '1';

    /* FIX: mouseenter truyền kèm sự kiện chuột để tooltip xuất hiện
       ngay tại vị trí con trỏ; mousemove giúp tooltip "đuổi" theo
       chuột trong lúc hover. */
    /* data-tooltip-fixed="true" -> tooltip đứng yên theo vị trí
       phần tử (dùng position()), không đuổi theo chuột */
    const isFixed =
      el.getAttribute('data-tooltip-fixed') === 'true';

    el.addEventListener(
      'mouseenter',
      e => show(el, isFixed ? null : e)
    );

    if (!isFixed) {
      el.addEventListener(
        'mousemove',
        e => {
          if (
            currentTarget === el
          ) {
            positionAtMouse(
              e.clientX,
              e.clientY
            );
          }
        }
      );
    }

    el.addEventListener(
      'mouseleave',
      () => hide()
    );

    el.addEventListener(
      'focus',
      () => show(el)
    );

    el.addEventListener(
      'blur',
      () => hide(true)
    );

    el.addEventListener(
      'touchstart',
      e => {
        const text =
          getText(el);

        if (!text) return;

        e.stopPropagation();

        if (
          currentTarget ===
          el
        ) {
          hide(true);
        } else {
          show(el);
        }
      },
      { passive: true }
    );
  }

  function scan(
    root = document
  ) {
    if (
      root.matches?.(
        '[data-tooltip]'
      )
    ) {
      init(root);
    }

    root
      .querySelectorAll?.(
        '[data-tooltip]'
      )
      .forEach(init);
  }

  document.addEventListener(
    'click',
    e => {
      if (
        currentTarget &&
        !currentTarget.contains(
          e.target
        )
      ) {
        hide(true);
      }
    }
  );

  document.addEventListener(
    'keydown',
    e => {
      if (
        e.key === 'Escape'
      ) {
        hide(true);
      }
    }
  );

  window.addEventListener(
    'scroll',
    schedulePosition,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    schedulePosition,
    { passive: true }
  );

  /*
   * THEO DÕI REALTIME:
   * - node mới có data-tooltip
   * - data-tooltip bị đổi giá trị
   *
   * Trường hợp music-title đang hover:
   * applyTrack() -> setAttribute('data-tooltip', ...)
   * -> MutationObserver chạy
   * -> tooltip.textContent được thay ngay.
   */
  const observer =
    new MutationObserver(
      mutations => {
        for (const mutation of mutations) {
          if (
            mutation.type ===
            'childList'
          ) {
            mutation.addedNodes
              .forEach(node => {
                if (
                  node.nodeType ===
                  1
                ) {
                  scan(node);
                }
              });
          }

          if (
            mutation.type ===
              'attributes' &&
            mutation.target
          ) {
            init(
              mutation.target
            );

            if (
              mutation.target ===
              currentTarget
            ) {
              const text =
                getText(
                  currentTarget
                );

              if (text) {
                tooltip.textContent =
                  text;

                tooltip.classList.add(
                  'is-visible'
                );
              } else {
                hide(true);
                continue;
              }

              schedulePosition();
            }
          }
        }
      }
    );

  scan();

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-tooltip'
      ]
    }
  );
})();

/* ============ REAL CENTER-OUT TIME-DOMAIN WAVEFORM BARS ============ */
(function initCenterOutBars() {
  'use strict';

  const BAR_PAIRS = 28;
  const MIN_HEIGHT = 2.5;
  const MAX_HEIGHT = 30;
  const SMOOTH_ATTACK = 0.34;
  const SMOOTH_RELEASE = 0.16;

  function setup() {
    const host = document.getElementById('center-bars');
    if (!host) return;

    host.innerHTML = '';
    const bars = [];

    // DOM order: mép trái -> tâm -> mép phải.
    for (let i = 0; i < BAR_PAIRS * 2; i++) {
      const el = document.createElement('span');
      el.className = 'center-bar';
      el.setAttribute('aria-hidden', 'true');
      host.appendChild(el);
      bars.push(el);
    }

    const smoothValues = new Float32Array(BAR_PAIRS);
    const targetValues = new Float32Array(BAR_PAIRS);

    function reset() {
      for (const bar of bars) {
        bar.style.height = MIN_HEIGHT + 'px';
        bar.style.transform = 'scaleY(.08)';
        bar.style.opacity = '.22';
      }
      smoothValues.fill(0.02);
      targetValues.fill(0.02);
      statusBar?.classList.add('is-paused');
    }

    function getWindowEnergy(data, start, end) {
      let sum = 0;
      let peak = 0;
      let count = 0;

      for (let i = start; i < end; i++) {
        // 128 = silence. Chuẩn hóa biên độ waveform về 0..1.
        const sample = Math.abs(data[i] - 128) / 128;
        sum += sample * sample;
        if (sample > peak) peak = sample;
        count++;
      }

      if (!count) return 0;

      const rms = Math.sqrt(sum / count);

      // Trộn RMS + peak để bar vừa mượt vừa bắt được kick/transient thật.
      return Math.min(1, rms * 1.45 + peak * 0.32);
    }

    function update() {
      if (
        typeof analyser === 'undefined' || !analyser ||
        !visualizerDataArray ||
        !music
      ) {
        reset();
        requestAnimationFrame(update);
        return;
      }

      // Không phát => đứng nhẹ ở tâm.
      if (music.paused || music.ended) {
        reset();
        requestAnimationFrame(update);
        return;
      }

      // QUAN TRỌNG: lấy waveform theo thời gian thực, không phải frequency spectrum.
      analyser.getByteTimeDomainData(visualizerDataArray);

      const data = visualizerDataArray;
      const len = data.length;

      for (let pair = 0; pair < BAR_PAIRS; pair++) {
        // pair 0 = sát tâm, càng xa càng đi về hai đầu của waveform buffer.
        const t = pair / (BAR_PAIRS - 1);

        // Tập trung nhiều mẫu hơn ở vùng đầu để bắt transient/kick rõ hơn.
        const center = Math.floor(len * 0.5);
        const spread = Math.floor((len * 0.48) * Math.pow(t, 1.32));
        const windowSize = Math.max(2, Math.floor(2 + (1 - t) * 3));

        // Lấy hai vùng đối xứng quanh tâm của buffer.
        const leftCenter = Math.max(0, center - spread);
        const rightCenter = Math.min(len - 1, center + spread);
        const half = Math.floor(windowSize / 2);

        let energyL = getWindowEnergy(
          data,
          Math.max(0, leftCenter - half),
          Math.min(len, leftCenter + half + 1)
        );

        let energyR = getWindowEnergy(
          data,
          Math.max(0, rightCenter - half),
          Math.min(len, rightCenter + half + 1)
        );

        // Đối xứng bar nhưng giữ biến thiên thật của tín hiệu ở từng phía.
        let level = (energyL + energyR) * 0.5;

        // Tâm ưu tiên kick/bass/transient.
        if (pair < 6) {
          level *= 1.18 - pair * 0.025;
        }

        // Ngoài rìa nhỏ dần để đúng cảm giác waveform lan từ giữa.
        const edgeFade = 1 - Math.pow(t, 1.55) * 0.42;
        level *= edgeFade;

        // Gamma nhẹ để những đoạn nhạc nhỏ vẫn nhìn thấy.
        level = Math.pow(Math.min(1, level), 0.82);

        targetValues[pair] = Math.max(0.025, Math.min(1, level));

        // Attack nhanh, release chậm => giống nhịp nhạc thật, không rung nhiễu.
        const smoothing =
          targetValues[pair] > smoothValues[pair]
            ? SMOOTH_ATTACK
            : SMOOTH_RELEASE;

        smoothValues[pair] +=
          (targetValues[pair] - smoothValues[pair]) * smoothing;

        const h =
          MIN_HEIGHT +
          smoothValues[pair] * (MAX_HEIGHT - MIN_HEIGHT);

        const scale = Math.max(0.08, h / 18);
        const opacity =
          0.42 + Math.min(0.55, smoothValues[pair] * 0.95);

        // bars[0..27] = trái (mép -> tâm), bars[28..55] = phải (tâm -> mép)
        const left = bars[BAR_PAIRS - 1 - pair];
        const right = bars[BAR_PAIRS + pair];

        for (const bar of [left, right]) {
          bar.style.height = h.toFixed(2) + 'px';
          bar.style.transform = `scaleY(${scale.toFixed(3)})`;
          bar.style.opacity = opacity.toFixed(3);
        }
      }

      statusBar?.classList.remove('is-paused');
      requestAnimationFrame(update);
    }

    reset();
    update();
  }

  const statusBar = document.getElementById('status-bar');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
