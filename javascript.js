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
  if (trackMenuBtn) trackMenuBtn.setAttribute('aria-expanded', 'true');
}

function closeTrackList(){
  if (!trackListPanel) return;
  trackListPanel.classList.remove('open');
  if (trackMenuBtn) trackMenuBtn.setAttribute('aria-expanded', 'false');
}

if (trackMenuBtn && trackListPanel) {
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
  if (musicBox) musicBox.classList.toggle('is-playing', isPlaying);
  if (discTip) discTip.textContent = isPlaying ? 'đang phát — bấm để tắt' : 'bấm để phát nhạc';
}

if (gate) {
  gate.addEventListener('click', () => {
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

  music.addEventListener('timeupdate', () => {
    if (music.duration) {
      const percent = (music.currentTime / music.duration) * 100;
      if (progressFill) progressFill.style.width = `${percent}%`;
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
      updateVolume(0);
    } else {
      updateVolume(lastVolume || 1);
    }
  });
}

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

  if (!analyser || music.paused) {
    bars.forEach(bar => bar.style.transform = 'scaleY(0.08)');
    allMiniBars.forEach(mb => mb.style.transform = 'scaleY(0.1)');
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const sampleIndices = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

  bars.forEach((bar, index) => {
    const sampleIndex = sampleIndices[index];
    const value = dataArray[sampleIndex] || 0;
    let scale = (value / 255) * 0.85;
    scale = Math.max(0.08, Math.min(1.0, scale));
    bar.style.transform = `scaleY(${scale})`;
  });

  allMiniBars.forEach(mb => mb.style.transform = 'scaleY(0.1)');

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

/* ============ DISCORD STATUS THẬT (LANYARD API) ============ */
(function () {
  const discordId = bioConfig.discordId;
  if (!discordId) return;

  const dmpAvatar = document.getElementById('dmp-avatar');
  const dmpDecoration = document.getElementById('dmp-decoration');
  const dmpUsername = document.getElementById('dmp-username');
  const dmpBadges = document.getElementById('dmp-badges');
  const dmpActivity = document.getElementById('dmp-activity');
  const dmpRoot = document.getElementById('discord-mini-profile');

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
