/* 팝업 플레이 (triplepopup) v3.9.0 · 2026-11-15 · 플레이웹 playwebon.com */
(function () {
    'use strict';

    var COOKIE_NAME = 'rx_popup_hidden';
    var apiUrl = window.TRIPLEPOPUP_API || '/index.php?module=triplepopup&act=getTriplepopupData';
    var GAP    = 20;
    var BASE_W = 420;
    var BASE_H = 480;
    // 한 화면에 보이는 배너 수(1~4)별 카드 가로 폭 — 유튜브 16:9 비율은 영상이 잘 보이도록 더 넓게
    var CARD_W_BY_COLS = { 1: 560, 2: 480, 3: 420, 4: 380 };
    var WIDE_W_BY_COLS = { 1: 960, 2: 720, 3: 560, 4: 440 };
    var MIN_CARD_W   = 260;
    var MAX_MEDIA_VH = 0.72;
    var YT_ORIGIN    = 'https://www.youtube.com';
    var AUTO_DEFAULT = 0; // 모듈 설정의 팝업창 자동 종료 Time (초)
    // 배너의 자동 종료 초: 배너 값이 있으면 그 값(0 = 안 닫음), 비어 있으면 모듈 설정을 따른다
    function autoSecOf(item) {
        var raw = (item.auto_close_sec === null || item.auto_close_sec === undefined) ? '' : String(item.auto_close_sec).trim();
        return (raw === '') ? AUTO_DEFAULT : Math.max(0, Math.min(3600, parseInt(raw, 10) || 0));
    }
    var UI     = {}; // 접속 언어별 문구 (서버 lang/*.php → config.ui)
    function t(key, fallback) { return (UI[key] && UI[key] !== 'tp_' + key) ? UI[key] : fallback; }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var XPAD   = 20; // 그림자·X버튼·LogIn탭이 잘리지 않도록 뷰포트 4면 여백(px, CSS padding 과 동일)

    // '가로:세로' 비율 문자열 → 세로/가로 값 (auto 등 숫자가 아니면 0)
    function parseRatio(value) {
        var m = /^(\d+):(\d+)$/.exec(String(value || ''));
        if (!m) return 0;
        var w = parseInt(m[1], 10), h = parseInt(m[2], 10);
        return (w > 0 && h > 0) ? (h / w) : 0;
    }

    function getCookie(name) {
        try {
            var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            return match ? match[2] : null;
        } catch (e) { return null; }
    }

    // days 일간 숨김: 1 = 오늘 자정까지, 7 = 오늘 포함 7일째 자정까지
    function setCookieForDays(name, days) {
        var d = new Date();
        d.setDate(d.getDate() + days - 1);
        d.setHours(23, 59, 59, 0);
        try { document.cookie = name + '=1;expires=' + d.toUTCString() + ';path=/'; } catch (e) {}
    }

    // 뷰포트 너비·가로 배너 수(cols)에 따라 한 번에 보이는 카드 수와 카드 폭을 계산.
    // widthOverride: 관리자가 '팝업 가로 크기'를 직접 지정한 경우의 카드 폭 (0 = 가로 배너 수에 맞춘 기본 폭)
    function getLayout(count, fixedRatio, cols, widthOverride) {
        var vw = window.innerWidth;

        // 브레이크포인트: 1201px↑ = 설정한 수, 769~1200px = 최대 2장, 768px↓ = 1장
        var maxVisible = (vw <= 768) ? 1 : (vw <= 1200 ? Math.min(2, cols) : cols);
        var visible = Math.min(maxVisible, count);
        if (visible < 1) visible = 1;

        var side  = 40; // 오버레이 좌우 여백
        var avail = vw - side;
        var cardW = Math.floor((avail - GAP * (visible - 1)) / visible);
        while (cardW < MIN_CARD_W && visible > 1) {
            visible--;
            cardW = Math.floor((avail - GAP * (visible - 1)) / visible);
        }
        var wide = !!fixedRatio && Math.abs(fixedRatio - 9 / 16) < 0.001; // 유튜브 16:9
        var base = widthOverride > 0 ? widthOverride : ((wide ? WIDE_W_BY_COLS : CARD_W_BY_COLS)[cols] || BASE_W);
        if (cardW > base) cardW = base;
        if (cardW < 180)  cardW = 180;

        // 고정 비율이면 이미지 높이가 화면 높이의 일정 비율을 넘지 않도록 폭을 줄인다
        if (fixedRatio) {
            var byHeight = Math.floor((window.innerHeight * MAX_MEDIA_VH) / fixedRatio);
            if (cardW > byHeight) cardW = byHeight;
            if (cardW < 120) cardW = 120;
        }

        return { visible: visible, cardW: cardW };
    }

    // 관리자 미리보기에서 등록된 배너가 없을 때 쓰는 샘플 배너
    function sampleItems() {
        var colors = [['#0071e3', '#5ac8fa'], ['#ff6b35', '#f7c59f'], ['#2d6a4f', '#95d5b2']];
        var list = [];
        for (var i = 0; i < colors.length; i++) {
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="840" height="960" viewBox="0 0 840 960">'
                + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + colors[i][0] + '"/><stop offset="1" stop-color="' + colors[i][1] + '"/></linearGradient></defs>'
                + '<rect width="840" height="960" fill="url(#g)"/></svg>';
            list.push({
                media_type: 'image',
                body_image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
                badge_text: 'playwebon.com', badge_bg_color: colors[i][0], badge_text_color: '#ffffff',
                footer_text: '만든이 플레이웹', footer_bg_color: colors[i][0], footer_text_color: '#ffffff'
            });
        }
        return list;
    }

    // 서버 응답({error, config, items})로 팝업을 띄운다 (페이지에 넣어 둔 데이터 · 미리보기 응답 공통)
    function show(res, opts) {
        if (!res || res.error !== 0) return;
        var cfg = res.config || {};
        var items = res.items;
        if (opts.preview) {
            if (!items || !items.length) items = sampleItems();
            for (var k in (opts.cfg || {})) {
                if (Object.prototype.hasOwnProperty.call(opts.cfg, k)) cfg[k] = opts.cfg[k];
            }
        } else {
            if (cfg.is_active === 'N') return;
            if (!items || !items.length) return;
        }
        renderPopup(cfg, items, opts);
    }

    // opts.preview: 관리자 미리보기 (쿠키·활성화 설정을 무시하고, opts.cfg 의 값으로 설정을 덮어씀)
    function init(opts) {
        opts = opts || {};
        if (!opts.preview && getCookie(COOKIE_NAME)) return;
        // 일반 페이지: 서버가 페이지에 넣어 둔 데이터로 바로 그린다 (요청 대기 없음)
        if (!opts.preview && window.TRIPLEPOPUP_DATA) { show(window.TRIPLEPOPUP_DATA, opts); return; }
        var url = apiUrl + (opts.preview ? (apiUrl.indexOf('?') > -1 ? '&' : '?') + 'tp_preview=1' : '');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
            if (xhr.status !== 200) return;
            try { show(JSON.parse(xhr.responseText), opts); } catch (e) {}
        };
        xhr.send();
    }

    function renderPopup(config, items, opts) {
        opts = opts || {};
        var count    = Math.min(items.length, 6);
        items        = items.slice(0, count);
        var interval = Math.max(1, parseInt(config.slide_interval, 10) || 3) * 1000;
        var widthOverride = parseInt(config.popup_width, 10) || 0;
        var closeDays = Math.max(1, Math.min(365, parseInt(config.close_days, 10) || 1));
        UI = config.ui || {};
        AUTO_DEFAULT = Math.max(0, Math.min(3600, parseInt(config.auto_close, 10) || 0));

        var fixedRatio = parseRatio(config.popup_ratio);
        var cols = parseInt(config.popup_cols, 10);
        if (!(cols >= 1 && cols <= 4)) cols = 3;
        var effect = parseInt(config.popup_effect, 10);
        if (!(effect >= 1 && effect <= 20)) effect = 1;

        var layout       = getLayout(count, fixedRatio, cols, widthOverride);
        var slideTimer   = null;
        var slidePaused  = false; // 영상 재생 중 슬라이드 멈춤
        var focusPaused  = false; // 로그인 입력 중 슬라이드 멈춤
        var hasOverflow  = false;
        var stepping     = false;
        var stepTimer    = null;
        var ytSeq        = 0;
        var timers       = []; // 배너별 자동 종료·종료 카운트다운 타이머

        var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var SLIDE_MS   = reduceMotion ? 0 : 450;
        var entering   = !reduceMotion;
        var enterTimer = null;

        var overlay = document.createElement('div');
        overlay.id  = 'triplepopup-pop-root';
        overlay.className = 'triplepopup-pop-fx' + effect
            + (fixedRatio ? ' triplepopup-pop-ratio-fixed' : '')
            + (entering ? ' triplepopup-pop-entering' : '');

        var wrap = document.createElement('div');
        wrap.className = 'triplepopup-pop-wrap';

        /* 카드 무대(stage) — 좌우 버튼은 이 위에 겹쳐 띄움 */
        var stage = document.createElement('div');
        stage.className = 'triplepopup-pop-stage';

        var viewport = document.createElement('div');
        viewport.className = 'triplepopup-pop-viewport';

        var track = document.createElement('div');
        track.className = 'triplepopup-pop-track';
        track.style.gap = GAP + 'px';

        for (var i = 0; i < count; i++) {
            var cell = buildCard(items[i], layout.cardW, BASE_H / BASE_W, function () { syncHeights(); }, function (c) { removeCell(c); });
            track.appendChild(cell);
            startAutoClose(cell);
        }
        viewport.appendChild(track);
        stage.appendChild(viewport);

        var prevBtn = document.createElement('button');
        prevBtn.className = 'triplepopup-pop-nav-btn prev';
        prevBtn.setAttribute('aria-label', t('prev', '이전'));
        prevBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';

        var nextBtn = document.createElement('button');
        nextBtn.className = 'triplepopup-pop-nav-btn next';
        nextBtn.setAttribute('aria-label', t('next', '다음'));
        nextBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

        if (count > 1) {
            stage.appendChild(prevBtn);
            stage.appendChild(nextBtn);
        }
        wrap.appendChild(stage);

        /* 하단 바 */
        var bottom = document.createElement('div');
        bottom.className = 'triplepopup-pop-bottom';

        var todayBtn = document.createElement('button');
        todayBtn.className = 'triplepopup-pop-today-close';
        todayBtn.innerHTML = '&#10003; ' + esc((closeDays > 1) ? t('days_close', '%d일간 닫기').replace('%d', closeDays) : t('today_close', '오늘하루 그만보기'));

        var closeBtn = document.createElement('button');
        closeBtn.className = 'triplepopup-pop-close-btn';
        closeBtn.innerHTML = esc(t('close', '닫기')) + ' &times;';

        bottom.appendChild(todayBtn);
        bottom.appendChild(closeBtn);
        wrap.appendChild(bottom);
        overlay.appendChild(wrap);
        document.body.appendChild(overlay);

        // SNS 로그인 위젯이 있으면 그 스크립트를 불러와 화면에 그리게 함
        if (overlay.querySelector('.zzan-sns-login')) {
            var snsScript = document.createElement('script');
            snsScript.src = (window.request_uri || '/') + 'modules/zzan_snslogin/js/widget.js';
            document.body.appendChild(snsScript);
        }

        /* ---------- 유튜브 ---------- */
        function isVideoCard(card) {
            return !!(card && card._tpItem && card._tpItem.media_type === 'youtube' && card._tpItem.youtube_id);
        }

        // 영상이 재생 중이고 '재생 중 슬라이드 멈춤'이 켜져 있으면 자동 슬라이드를 멈춘다
        function updateSlidePause() {
            var cards = track.children, paused = false;
            for (var i = 0; i < cards.length; i++) {
                var opt = cards[i]._tpItem ? (cards[i]._tpItem.youtube || {}) : {};
                if (cards[i]._tpPlaying && opt.pause_slide) { paused = true; break; }
            }
            if (paused === slidePaused) return;
            slidePaused = paused;
            restartTimer();
        }

        function mountVideo(card) {
            if (card._tpFrame) return;
            var item = card._tpItem, opt = item.youtube || {};
            var holder = card.querySelector('.triplepopup-pop-frame');
            if (!holder) return;

            var q = ['playsinline=1', 'rel=0', 'enablejsapi=1',
                     'autoplay=' + (opt.autoplay ? 1 : 0),
                     'mute=' + ((opt.mute || opt.autoplay) ? 1 : 0),
                     'controls=' + (opt.controls ? 1 : 0)];
            if (opt.loop) { q.push('loop=1'); q.push('playlist=' + item.youtube_id); }
            if (opt.start > 0) q.push('start=' + parseInt(opt.start, 10));
            if (/^https?:/.test(window.location.protocol)) q.push('origin=' + encodeURIComponent(window.location.origin));

            var frame = document.createElement('iframe');
            frame.id = 'triplepopup-yt-' + (++ytSeq);
            frame.title = item.badge_text || item.footer_text || 'YouTube';
            frame.setAttribute('frameborder', '0');
            frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
            frame.setAttribute('allowfullscreen', 'allowfullscreen');
            // 재생 상태(재생/일시정지)를 받기 위해 플레이어에 구독 요청
            frame.addEventListener('load', function () {
                try {
                    var win = frame.contentWindow;
                    win.postMessage(JSON.stringify({ event: 'listening', id: frame.id, channel: 'widget' }), YT_ORIGIN);
                    win.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: frame.id, channel: 'widget' }), YT_ORIGIN);
                } catch (e) {}
            });
            frame.src = YT_ORIGIN + '/embed/' + encodeURIComponent(item.youtube_id) + '?' + q.join('&');
            holder.appendChild(frame);
            card._tpFrame = frame;
        }

        function unmountVideo(card) {
            if (!card._tpFrame) return;
            if (card._tpFrame.parentNode) card._tpFrame.parentNode.removeChild(card._tpFrame);
            card._tpFrame = null;
            card._tpPlaying = false;
        }

        // 화면에 보이는 카드의 영상만 재생 준비(나머지는 제거해 소리·트래픽을 막는다)
        function syncVideos() {
            var cards = track.children;
            var to = hasOverflow ? layout.visible : cards.length;
            for (var i = 0; i < cards.length; i++) {
                if (!isVideoCard(cards[i])) continue;
                if (i < to) mountVideo(cards[i]);
                else unmountVideo(cards[i]);
            }
            sizeFrames();
            updateSlidePause();
        }

        // '영상 꽉 채우기': 칸 비율과 영상 비율이 다르면 영상을 확대해 여백 없이 채운다
        function sizeFrames() {
            var cards = track.children;
            for (var i = 0; i < cards.length; i++) {
                if (!isVideoCard(cards[i])) continue;
                var holder = cards[i].querySelector('.triplepopup-pop-frame');
                var media  = cards[i].querySelector('.triplepopup-pop-media');
                if (!holder || !media) continue;
                var item = cards[i]._tpItem, opt = item.youtube || {};
                var w = media.clientWidth, h = media.clientHeight;
                if (!opt.cover || !w || !h) {
                    holder.style.width = '100%';
                    holder.style.height = '100%';
                    continue;
                }
                var vr = item.youtube_shorts ? (9 / 16) : (16 / 9);
                var fw, fh;
                if (w / h < vr) { fh = h; fw = h * vr; } else { fw = w; fh = w / vr; }
                holder.style.width  = Math.ceil(fw) + 'px';
                holder.style.height = Math.ceil(fh) + 'px';
            }
        }

        function onPlayerMessage(e) {
            if (e.origin !== YT_ORIGIN) return;
            var data;
            try { data = (typeof e.data === 'string') ? JSON.parse(e.data) : e.data; } catch (err) { return; }
            if (!data) return;
            var state = null;
            if (data.event === 'onStateChange' && typeof data.info === 'number') state = data.info;
            else if (data.event === 'infoDelivery' && data.info && typeof data.info.playerState === 'number') state = data.info.playerState;
            if (state === null) return;
            var cards = track.children;
            for (var i = 0; i < cards.length; i++) {
                if (cards[i]._tpFrame && cards[i]._tpFrame.contentWindow === e.source) {
                    cards[i]._tpPlaying = (state === 1 || state === 3); // 재생 중 · 버퍼링
                    break;
                }
            }
            updateSlidePause();
        }
        window.addEventListener('message', onPlayerMessage);
        overlay._tpDestroy = function () { destroy(); };

        function destroy() {
            clearInterval(slideTimer);
            clearTimeout(stepTimer);
            clearTimeout(resizeTimer);
            clearTimeout(enterTimer);
            for (var i = 0; i < timers.length; i++) clearInterval(timers[i]);
            if (cardObserver) cardObserver.disconnect();
            window.removeEventListener('resize', onResize);
            window.removeEventListener('message', onPlayerMessage);
            overlay.parentNode && overlay.parentNode.removeChild(overlay);
        }

        // 가로(카드 폭)만 지정하고 세로는 이미지/HTML 콘텐츠 높이에 맞춰 자동. 고정 비율·영상은 비율대로 높이를 준다.
        function sizeMedias(cardW) {
            var maxH   = Math.round(window.innerHeight * MAX_MEDIA_VH);
            var medias = track.querySelectorAll('.triplepopup-pop-media');
            for (var i = 0; i < medias.length; i++) {
                var isVid = medias[i].classList.contains('triplepopup-pop-video');
                if (!fixedRatio && !isVid) { medias[i].style.height = ''; continue; } // 원본 비율: 이미지 자연 높이 사용
                var ratio = fixedRatio || parseFloat(medias[i].getAttribute('data-ratio'));
                if (!ratio || ratio <= 0) ratio = BASE_H / BASE_W;
                medias[i].style.height = Math.min(Math.round(cardW * ratio), maxH) + 'px';
            }
            sizeFrames();
        }

        function syncHeights() {
            if (!overlay.parentNode) return;
            sizeMedias(layout.cardW);
            var cells = track.children;
            var maxH = 0;
            for (var i = 0; i < cells.length; i++) {
                // 로그인 탭이 카드 밖에 있으므로 cell 전체 높이 기준
                if (cells[i].offsetHeight > maxH) maxH = cells[i].offsetHeight;
            }
            if (maxH > 0) viewport.style.height = (maxH + XPAD * 2) + 'px';
        }

        // ── 마우스로 팝업 끌어서 옮기기 (마우스·펜 전용, 터치는 스크롤과 충돌하므로 제외) ──
        var dragX = 0, dragY = 0, dragMoved = false;

        // 팝업이 화면 밖으로 완전히 사라지지 않도록 최소 80px 는 화면 안에 남긴다
        function clampOffset(x, y) {
            var r  = wrap.getBoundingClientRect();
            var bx = r.left - dragX, by = r.top - dragY; // 이동 전 기준 위치
            var keep = 80;
            return {
                x: Math.max(keep - r.width  - bx, Math.min(window.innerWidth  - keep - bx, x)),
                y: Math.max(keep - r.height - by, Math.min(window.innerHeight - keep - by, y))
            };
        }
        function setOffset(x, y) {
            dragX = x; dragY = y;
            wrap.style.transform = (x || y) ? 'translate(' + x + 'px,' + y + 'px)' : '';
        }

        wrap.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'touch' || e.button !== 0) return;
            // 링크·버튼·입력창에서 시작한 클릭은 그대로 동작
            if (e.target.closest && e.target.closest('a, button, input, select, textarea, label')) return;
            var sx = e.clientX, sy = e.clientY, ox = dragX, oy = dragY, moving = false;

            function move(ev) {
                var dx = ev.clientX - sx, dy = ev.clientY - sy;
                if (!moving) {
                    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return; // 살짝 흔들린 클릭은 드래그로 보지 않음
                    moving = true;
                    dragMoved = true;
                    overlay.classList.add('triplepopup-pop-dragging');
                    if (window.getSelection) window.getSelection().removeAllRanges();
                }
                var c = clampOffset(ox + dx, oy + dy);
                setOffset(c.x, c.y);
            }
            function up() {
                document.removeEventListener('pointermove', move);
                document.removeEventListener('pointerup', up);
                document.removeEventListener('pointercancel', up);
                overlay.classList.remove('triplepopup-pop-dragging');
                setTimeout(function () { dragMoved = false; }, 0); // 드래그 직후 발생하는 click 만 막는다
            }
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
            document.addEventListener('pointercancel', up);
        });
        // 드래그한 직후에는 이미지·카드 클릭(링크 열기)이 실행되지 않게 차단
        wrap.addEventListener('click', function (e) {
            if (dragMoved) { e.stopPropagation(); e.preventDefault(); }
        }, true);
        // 이미지를 끌 때 브라우저 기본 이미지 드래그가 시작되지 않게 함
        wrap.addEventListener('dragstart', function (e) { e.preventDefault(); });

        // 팝업 뒤 전체 화면 배경: 지금 남아 있는 배너 중 가장 높은 어둡기를 사용 (기본 42 = CSS 기본값, 0 이면 흐림 효과도 끔)
        function applyDim() {
            var cards = track.querySelectorAll('.triplepopup-pop-card');
            var dim = -1;
            for (var i = 0; i < cards.length; i++) {
                var v = parseInt(cards[i].getAttribute('data-dim'), 10);
                if (!isNaN(v) && v > dim) dim = v;
            }
            if (dim < 0) dim = 42;
            overlay.style.background = (dim === 42) ? '' : 'rgba(0,0,0,' + (dim / 100) + ')';
            overlay.style.webkitBackdropFilter = (dim === 0) ? 'none' : '';
            overlay.style.backdropFilter       = (dim === 0) ? 'none' : '';
            // 어둡기 0 이면 팝업 뒤 화면을 클릭·스크롤할 수 있도록 전체 배경이 클릭을 통과시킴 (카드·버튼은 그대로 반응)
            overlay.style.pointerEvents        = (dim === 0) ? 'none' : '';
            // 하단 버튼(오늘하루 그만보기·닫기) 글자 뒤 배경: 전체 배경과 합쳐 약 42% 가 되도록 보정
            // (어둡기 42% 이상이면 0 = 보이지 않음, 0% 면 42%)
            var btnA = (dim >= 42) ? 0 : 1 - 0.58 / (1 - dim / 100);
            overlay.style.setProperty('--tpop-btn-a', btnA.toFixed(3));
        }

        function applyLayout() {
            applyDim();
            layout = getLayout(count, fixedRatio, cols, widthOverride);
            var vwTotal = layout.cardW * layout.visible + GAP * (layout.visible - 1);

            // 보이는 수보다 카드가 많을 때만 좌우 버튼 노출 + 자동 슬라이드(무한 반복)
            hasOverflow = count > layout.visible;

            stage.style.width     = vwTotal + 'px';
            viewport.style.width   = (vwTotal + XPAD * 2) + 'px';
            track.style.width      = (layout.cardW * count + GAP * (count - 1)) + 'px';
            bottom.style.width     = vwTotal + 'px';

            var cells = track.children;
            for (var c = 0; c < cells.length; c++) {
                var card = cells[c].querySelector('.triplepopup-pop-card');
                if (card) {
                    card.style.width    = layout.cardW + 'px';
                    card.style.minWidth = layout.cardW + 'px';
                }
                // 로그인 패널이 카드보다 넓어 래퍼가 늘어나면 카드가 오른쪽으로 밀리므로 래퍼 폭도 고정
                cells[c].style.width    = layout.cardW + 'px';
                cells[c].style.minWidth = layout.cardW + 'px';
                cells[c].style.maxWidth = layout.cardW + 'px';
            }

            syncHeights();

            prevBtn.style.display = hasOverflow ? 'flex' : 'none';
            nextBtn.style.display = hasOverflow ? 'flex' : 'none';

            // 쉬는 상태에서는 항상 맨 앞 카드부터 보이도록 위치를 되돌린다
            clearTimeout(stepTimer);
            stepping = false;
            track.style.transition = 'none';
            track.style.transform  = 'translateX(0)';

            if (dragX || dragY) {
                var pos = clampOffset(dragX, dragY);
                setOffset(pos.x, pos.y);
            }
            syncVideos();
        }

        // 개별 배너 닫기(X)·자동 종료: 해당 카드만 제거하고 남은 카드로 다시 배치, 전부 닫히면 팝업 종료
        function removeCell(cell) {
            if (!cell.parentNode) return;
            unmountVideo(cell);
            cell.parentNode.removeChild(cell);
            count--;
            if (count < 1) { destroy(); return; }
            applyLayout();
            restartTimer();
        }

        // 배너별 자동 종료: 남은 초는 X 버튼 옆 숫자로 표시하고, 0 이 되면 이 배너만 닫는다
        function startAutoClose(cell) {
            var left = autoSecOf(cell._tpItem);
            if (left < 1) return;
            var counter = cell.querySelector('.triplepopup-pop-card-count');
            var tm = setInterval(function () {
                if (!cell.isConnected) { clearInterval(tm); return; } // 이미 닫힘
                if (--left < 1) { clearInterval(tm); removeCell(cell); return; }
                if (counter) counter.textContent = left;
            }, 1000);
            timers.push(tm);
        }

        /* ---------- 무한 반복 슬라이드: 맨 앞 카드를 맨 뒤로(또는 반대로) 돌려 끝없이 이어 붙인다 ---------- */
        function slideMs() { return SLIDE_MS ? 'transform ' + SLIDE_MS + 'ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none'; }

        function goNext() {
            if (!hasOverflow || stepping) return;
            stepping = true;
            track.style.transition = slideMs();
            track.style.transform  = 'translateX(-' + (layout.cardW + GAP) + 'px)';
            stepTimer = setTimeout(function () {
                var first = track.firstElementChild;
                unmountVideo(first); // 노드를 옮기면 영상이 다시 로드되므로 먼저 걷어 낸다
                track.style.transition = 'none';
                track.appendChild(first);
                track.style.transform = 'translateX(0)';
                void track.offsetWidth;
                stepping = false;
                syncVideos();
            }, SLIDE_MS + 30);
        }

        function goPrev() {
            if (!hasOverflow || stepping) return;
            stepping = true;
            track.style.transition = 'none';
            track.insertBefore(track.lastElementChild, track.firstElementChild);
            track.style.transform = 'translateX(-' + (layout.cardW + GAP) + 'px)';
            void track.offsetWidth;
            track.style.transition = slideMs();
            track.style.transform  = 'translateX(0)';
            stepTimer = setTimeout(function () {
                stepping = false;
                syncVideos();
            }, SLIDE_MS + 30);
        }

        function restartTimer() {
            clearInterval(slideTimer);
            if (hasOverflow && !slidePaused && !focusPaused && !entering) slideTimer = setInterval(goNext, interval);
        }

        // 등장 효과: 처음 화면에 보이는 카드만 효과 대상으로 표시 (나머지는 효과가 끝날 때까지 숨김)
        function markEntering() {
            var cells = track.children;
            var n = hasOverflow ? layout.visible : cells.length;
            for (var k = 0; k < n; k++) {
                var cell = cells[k];
                if (!cell) continue;
                var pos = (n === 1) ? 'c' : (k === 0 ? 'l' : (k === n - 1 ? 'r' : 'c'));
                cell.classList.add('triplepopup-pop-in');
                cell.classList.add('triplepopup-pop-in-' + pos);
                cell.style.setProperty('--tpop-i', k);
            }
        }

        function finishEnter() {
            if (!entering) return;
            entering = false;
            clearTimeout(enterTimer);
            overlay.classList.remove('triplepopup-pop-entering');
            var marked = track.querySelectorAll('.triplepopup-pop-in');
            for (var m = 0; m < marked.length; m++) {
                marked[m].classList.remove('triplepopup-pop-in', 'triplepopup-pop-in-l', 'triplepopup-pop-in-c', 'triplepopup-pop-in-r');
            }
            restartTimer();
        }

        var cardObserver = null;
        var resizeTimer;
        function onResize() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                finishEnter();
                applyLayout();
                restartTimer();
            }, 100);
        }

        applyLayout();
        if (entering) {
            markEntering();
            enterTimer = setTimeout(finishEnter, 1400);
        } else {
            restartTimer();
        }

        // 카드 높이가 나중에 바뀌어도(SNS 로그인 위젯 로딩, 이미지 로딩, 오류 메시지 등) 잘리지 않고 팝업이 자동으로 늘어나게 함
        if (window.ResizeObserver) {
            cardObserver = new ResizeObserver(function () { syncHeights(); });
            for (var o = 0; o < track.children.length; o++) cardObserver.observe(track.children[o]);
        } else {
            setTimeout(syncHeights, 600);
            setTimeout(syncHeights, 2000);
        }

        window.addEventListener('resize', onResize);

        // 로그인 입력 중에는 자동 슬라이드를 멈춰 입력하던 카드가 넘어가지 않게 함
        wrap.addEventListener('focusin', function (e) {
            if (e.target.closest && e.target.closest('.triplepopup-pop-login')) { focusPaused = true; restartTimer(); }
        });
        wrap.addEventListener('focusout', function (e) {
            if (e.target.closest && e.target.closest('.triplepopup-pop-login') && !(e.relatedTarget && wrap.contains(e.relatedTarget))) {
                focusPaused = false;
                restartTimer();
            }
        });

        prevBtn.addEventListener('click', function () { finishEnter(); focusPaused = false; goPrev(); restartTimer(); });
        nextBtn.addEventListener('click', function () { finishEnter(); focusPaused = false; goNext(); restartTimer(); });

        todayBtn.addEventListener('click', function () {
            if (!opts.preview) setCookieForDays(COOKIE_NAME, closeDays);
            destroy();
        });

        closeBtn.addEventListener('click', function () {
            destroy();
        });

        // 자동 종료는 배너별로 동작한다(startAutoClose). 모든 배너가 자동으로 닫히는 경우에만
        // 팝업이 끝날 때까지 남은 시간을 '닫기 (5) ×' 형태로 표시한다 (표시 전용, 쿠키 없음)
        var autoLeft = 0;
        var allAuto  = items.length > 0;
        for (var ai = 0; ai < items.length; ai++) {
            var aSec = autoSecOf(items[ai]);
            if (aSec < 1) allAuto = false; else if (aSec > autoLeft) autoLeft = aSec;
        }
        if (allAuto) {
            closeBtn.innerHTML = esc(t('close', '닫기')) + ' (' + autoLeft + ') &times;';
            var autoTimer = setInterval(function () {
                if (!overlay.parentNode || --autoLeft < 1) { clearInterval(autoTimer); return; }
                closeBtn.innerHTML = esc(t('close', '닫기')) + ' (' + autoLeft + ') &times;';
            }, 1000);
            timers.push(autoTimer);
        }
    }

    // 카드 1장 = 카드 + (로그인 탭) + X 버튼 + (자동 종료 숫자)를 감싼 cell 을 만들어 돌려준다
    function buildCard(item, w, baseRatio, onImgLoad, onClose) {
        var card = document.createElement('div');
        card.className    = 'triplepopup-pop-card';
        card.style.width    = w + 'px';
        card.style.minWidth = w + 'px';

        // 배너 테두리 (굵기 0 = 없음, 색상은 #rgb / #rrggbb 만 허용)
        var borderW = Math.max(0, Math.min(20, parseInt(item.border_width, 10) || 0));
        if (borderW > 0 && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(item.border_color || '')) {
            card.style.border = borderW + 'px solid ' + item.border_color;
        }

        // 배너 그림자 (기본 숨김, 'Y' 이면 표시)
        if (item.card_shadow !== 'Y') card.style.boxShadow = 'none';

        // 이 배너의 배경 어둡기(0~100%, 기본 42) — 카드에 기록해 두고 팝업 전체 배경 계산에 사용
        var cardDim = parseInt(item.overlay_dim, 10);
        card.setAttribute('data-dim', isNaN(cardDim) ? 42 : Math.max(0, Math.min(100, cardDim)));

        // 본문 배경색 (기본 #ffffff)
        var htmlBg    = item.html_bg_color || '#ffffff';
        var htmlTrans = Math.max(0, Math.min(100, parseInt(item.html_bg_trans, 10) || 0));
        if (htmlBg.toLowerCase() !== '#ffffff' || htmlTrans > 0) {
            card.style.background = toRgba(htmlBg, htmlTrans);
        }

        var isVideo  = (item.media_type === 'youtube' && !!item.youtube_id);
        var hasImage = !isVideo && !!item.body_image;

        if (isVideo || hasImage) {
            // ── 이미지·영상 카드: 배지·타이틀을 미디어 위 오버레이로 표시 ──
            var media = document.createElement('div');
            media.className = 'triplepopup-pop-media';
            media.setAttribute('data-ratio', baseRatio);

            if (isVideo) {
                // 영상: 썸네일(poster) 위에 iframe 칸을 두고, 실제 iframe 은 화면에 보일 때 JS 가 붙인다
                media.classList.add('triplepopup-pop-video');
                media.setAttribute('data-ratio', item.youtube_shorts ? (16 / 9) : (9 / 16));
                var poster = document.createElement('img');
                poster.className = 'triplepopup-pop-poster';
                poster.alt = '';
                poster.onerror = function () { if (poster.parentNode) poster.parentNode.removeChild(poster); };
                poster.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(item.youtube_id) + '/hqdefault.jpg';
                media.appendChild(poster);
                var holder = document.createElement('div');
                holder.className = 'triplepopup-pop-frame';
                media.appendChild(holder);
            } else {
                if (item.click_url) {
                    media.classList.add('triplepopup-pop-clickable');
                    media.addEventListener('click', makeOpener(item.click_url, item.click_target));
                }

                var img = document.createElement('img');
                img.alt = item.title_text || item.badge_text || '';
                img.onload = function () {
                    if (img.naturalWidth && img.naturalHeight) {
                        media.setAttribute('data-ratio', img.naturalHeight / img.naturalWidth);
                        if (typeof onImgLoad === 'function') onImgLoad();
                    }
                };
                img.src = item.body_image;
                media.appendChild(img);
            }

            if (item.badge_text) {
                var badge = document.createElement('span');
                badge.className        = 'triplepopup-pop-badge';
                badge.style.background = item.badge_bg_color || '#0071e3';
                badge.style.color      = item.badge_text_color || '#ffffff';
                badge.textContent      = item.badge_text;
                media.appendChild(badge);
            }

            // 유튜브 배너에는 이미지 위 타이틀·서브문구를 표시하지 않는다
            if (!isVideo && (item.title_text || item.sub_text)) {
                var overlay = document.createElement('div');
                overlay.className = 'triplepopup-pop-overlay';
                if (item.title_text) {
                    var title = document.createElement('div');
                    title.className   = 'triplepopup-pop-title';
                    title.textContent = item.title_text;
                    overlay.appendChild(title);
                }
                if (item.sub_text) {
                    var sub = document.createElement('div');
                    sub.className   = 'triplepopup-pop-sub';
                    sub.textContent = item.sub_text;
                    overlay.appendChild(sub);
                }
                media.appendChild(overlay);
            }

            // HTML: 이미지 위 겹침 또는 카드 상단
            if (item.html_content) {
                var htmlBox = document.createElement('div');
                htmlBox.innerHTML = item.html_content;
                var htmlImgs = htmlBox.getElementsByTagName('img');
                for (var k = 0; k < htmlImgs.length; k++) {
                    if (typeof onImgLoad === 'function') htmlImgs[k].addEventListener('load', onImgLoad);
                }
                if (item.html_position === 'overlay') {
                    htmlBox.className = 'triplepopup-pop-html triplepopup-pop-html-overlay' + (item.html_raw === 'Y' ? ' triplepopup-pop-html-raw' : '');
                    htmlBox.addEventListener('click', function (e) {
                        if (e.target.closest && e.target.closest('a, button')) e.stopPropagation();
                    });
                    media.appendChild(htmlBox);
                } else {
                    htmlBox.className = 'triplepopup-pop-html triplepopup-pop-html-top' + (item.html_raw === 'Y' ? ' triplepopup-pop-html-raw' : '');
                    card.appendChild(htmlBox);
                }
            }

            card.appendChild(media);
        } else {
            // ── 이미지 없는 카드: 배지·타이틀·HTML을 일반 흐름으로 표시 ──
            if (item.badge_text) {
                var badgeWrap = document.createElement('div');
                badgeWrap.className = 'triplepopup-pop-badge-bar';
                var badge2 = document.createElement('span');
                badge2.className        = 'triplepopup-pop-badge triplepopup-pop-badge-static';
                badge2.style.background = item.badge_bg_color || '#0071e3';
                badge2.style.color      = item.badge_text_color || '#ffffff';
                badge2.textContent      = item.badge_text;
                badgeWrap.appendChild(badge2);
                card.appendChild(badgeWrap);
            }

            if (item.title_text || item.sub_text) {
                var textHead = document.createElement('div');
                textHead.className = 'triplepopup-pop-texthead';
                if (item.title_text) {
                    var title2 = document.createElement('div');
                    title2.className   = 'triplepopup-pop-title triplepopup-pop-title-static';
                    title2.textContent = item.title_text;
                    textHead.appendChild(title2);
                }
                if (item.sub_text) {
                    var sub2 = document.createElement('div');
                    sub2.className   = 'triplepopup-pop-sub triplepopup-pop-sub-static';
                    sub2.textContent = item.sub_text;
                    textHead.appendChild(sub2);
                }
                card.appendChild(textHead);
            }

            if (item.html_content) {
                var htmlBox2 = document.createElement('div');
                htmlBox2.className = 'triplepopup-pop-html triplepopup-pop-html-top triplepopup-pop-html-text';
                htmlBox2.innerHTML = item.html_content;
                if (item.html_raw === 'Y') htmlBox2.classList.add('triplepopup-pop-html-raw');
                var htmlImgs2 = htmlBox2.getElementsByTagName('img');
                for (var j = 0; j < htmlImgs2.length; j++) {
                    if (typeof onImgLoad === 'function') htmlImgs2[j].addEventListener('load', onImgLoad);
                }
                if (item.click_url) {
                    htmlBox2.classList.add('triplepopup-pop-clickable');
                    htmlBox2.addEventListener('click', function (e) {
                        if (e.target.closest && e.target.closest('a, button')) return;
                        makeOpener(item.click_url, item.click_target)();
                    });
                }
                card.appendChild(htmlBox2);
            }
        }

        // 하단 CTA 버튼 — 이미지 유무와 관계없이 문구가 있으면 표시
        if (item.footer_text) {
            var footer = document.createElement('div');
            footer.className         = 'triplepopup-pop-footer';
            footer.style.background  = item.footer_bg_color || '#0071e3';
            footer.style.color       = item.footer_text_color || '#ffffff';
            footer.textContent       = item.footer_text + ' \u203a';
            if (item.click_url) {
                footer.classList.add('triplepopup-pop-clickable');
                footer.addEventListener('click', makeOpener(item.click_url, item.click_target));
            }
            card.appendChild(footer);
        }

        // 카드는 overflow:hidden 이라 X 버튼·로그인 탭이 밖으로 나가지 못하므로, 같은 래퍼(cell)에 나란히 둔다
        var cell = document.createElement('div');
        cell.className = 'triplepopup-pop-cell';
        cell._tpItem = item;
        cell.appendChild(card);

        // 로그인 탭은 카드 테두리 바깥(아래)에 둔다
        if (item.footer_login === 'Y' || item.footer_sns === 'Y') {
            cell.appendChild(buildAuthBox(item, borderW));
        }

        // 우측 상단 X 버튼 — 이 배너만 닫기
        var xBtn = document.createElement('button');
        xBtn.type = 'button';
        xBtn.className = 'triplepopup-pop-card-close';
        xBtn.setAttribute('aria-label', t('banner_close', '이 배너 닫기'));
        xBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';
        xBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            onClose(cell);
        });
        cell.appendChild(xBtn);

        // 배너별 자동 종료 남은 시간 표시 칸 (숫자는 팝업 쪽 타이머가 갱신)
        var autoSec = autoSecOf(item);
        if (autoSec > 0) {
            var counter = document.createElement('span');
            counter.className   = 'triplepopup-pop-card-count';
            counter.textContent = autoSec;
            cell.appendChild(counter);
        }
        return cell;
    }

    // 로그인·SNS 로그인 영역 — 카드 테두리 아래 탭(LogIn, 테두리색)으로 접고 펼침
    function buildAuthBox(item, borderW) {
        var box = document.createElement('div');
        box.className = 'triplepopup-pop-auth';

        var toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'triplepopup-pop-auth-toggle';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', t('login_open', '로그인 열기'));
        // 탭 색상 = 배너 테두리 색상 (없으면 기본 오렌지)
        var borderColor = '#f5a623';
        if (borderW > 0 && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(item.border_color || '')) {
            borderColor = item.border_color;
        }
        toggleBtn.style.background = borderColor;
        toggleBtn.style.borderColor = borderColor;
        toggleBtn.style.color = '#ffffff';
        toggleBtn.innerHTML = '<span class="triplepopup-pop-auth-toggle-label">LogIn</span>';

        var panel = document.createElement('div');
        panel.className = 'triplepopup-pop-auth-panel';
        panel.hidden = true;
        // 상단 카드와 동일한 테두리 적용
        if (borderW > 0 && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(borderColor)) {
            panel.style.border = borderW + 'px solid ' + borderColor;
        }

        if (item.footer_login === 'Y') panel.appendChild(buildLoginForm(item));
        if (item.footer_sns === 'Y') {
            // zzan_snslogin 위젯 (스크립트는 팝업이 화면에 붙은 뒤 renderPopup 에서 불러온다)
            var snsBox = document.createElement('div');
            snsBox.className = 'triplepopup-pop-sns';
            var snsTitle = document.createElement('div');
            snsTitle.className = 'triplepopup-pop-sns-title';
            snsTitle.textContent = t('sns_login', 'SNS 로그인');
            var snsWidget = document.createElement('div');
            snsWidget.className = 'zzan-sns-login';
            snsWidget.setAttribute('data-services', 'kakao,google');
            snsWidget.setAttribute('data-base', (window.request_uri || '/') + 'index.php?module=zzan_snslogin&act=dispZzan_snsloginConnectSns');
            snsBox.appendChild(snsTitle);
            snsBox.appendChild(snsWidget);
            panel.appendChild(snsBox);
        }

        toggleBtn.addEventListener('click', function () {
            var open = panel.hidden;
            panel.hidden = !open;
            box.classList.toggle('is-open', open);
            toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggleBtn.setAttribute('aria-label', open ? t('login_fold', '로그인 접기') : t('login_open', '로그인 열기'));
            var label = toggleBtn.querySelector('.triplepopup-pop-auth-toggle-label');
            if (label) label.textContent = open ? 'Close' : 'LogIn';
        });

        box.appendChild(toggleBtn);
        box.appendChild(panel);
        return box;
    }

    // 하단 로그인 폼 — 라이믹스 member.procMemberLogin 을 exec_json 으로 호출 (CSRF 토큰은 exec_json 이 자동 처리)
    function buildLoginForm(item) {
        var form = document.createElement('form');
        form.className = 'triplepopup-pop-login';
        form.noValidate = true;

        var fields = document.createElement('div');
        fields.className = 'triplepopup-pop-login-fields';

        var inputs = {};
        [['user_id', 'text', t('user_id', '아이디'), 'username'], ['password', 'password', t('password', '비밀번호'), 'current-password']].forEach(function (f) {
            var input = document.createElement('input');
            input.className = 'triplepopup-pop-login-input';
            input.name = f[0];
            input.type = f[1];
            input.placeholder = f[2];
            input.setAttribute('aria-label', f[2]);
            input.setAttribute('autocomplete', f[3]);
            if (f[0] === 'user_id') { input.setAttribute('autocapitalize', 'none'); input.setAttribute('spellcheck', 'false'); }
            inputs[f[0]] = input;
            fields.appendChild(input);
        });

        var keepLabel = document.createElement('label');
        keepLabel.className = 'triplepopup-pop-login-keep';
        var keep = document.createElement('input');
        keep.type = 'checkbox';
        keep.name = 'keep_signed';
        keepLabel.appendChild(keep);
        keepLabel.appendChild(document.createTextNode(' ' + t('keep_login', '로그인 유지')));
        fields.appendChild(keepLabel);

        var msg = document.createElement('div');
        msg.className = 'triplepopup-pop-login-msg';
        msg.setAttribute('role', 'alert');
        fields.appendChild(msg);
        form.appendChild(fields);

        var btn = document.createElement('button');
        btn.type = 'submit';
        btn.className = 'triplepopup-pop-login-btn';
        btn.style.background = item.footer_bg_color || '#0071e3';
        btn.style.color      = item.footer_text_color || '#ffffff';
        btn.textContent      = t('login', '로그인');

        // 회원가입 버튼 — 라이믹스 회원가입 화면으로 이동
        var signup = document.createElement('button');
        signup.type = 'button';
        signup.className = 'triplepopup-pop-signup-btn';
        signup.style.color = item.footer_bg_color || '#0071e3';
        signup.style.borderColor = item.footer_bg_color || '#0071e3';
        signup.textContent = t('signup', '회원가입');
        signup.addEventListener('click', function () {
            window.location.href = (window.request_uri || '/') + 'index.php?act=dispMemberSignUpForm';
        });

        var actions = document.createElement('div');
        actions.className = 'triplepopup-pop-login-actions';
        actions.appendChild(btn);
        actions.appendChild(signup);
        fields.appendChild(actions);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var userId = inputs.user_id.value.trim();
            var pw     = inputs.password.value;
            if (!userId || !pw) { msg.textContent = t('need_idpw', '아이디와 비밀번호를 입력해 주세요.'); return; }
            if (typeof window.exec_json !== 'function') { msg.textContent = t('login_unavailable', '이 페이지에서는 로그인을 사용할 수 없습니다. 새로고침 후 다시 시도해 주세요.'); return; }
            msg.textContent = '';
            btn.disabled = true;
            window.exec_json('member.procMemberLogin', { user_id: userId, password: pw, keep_signed: keep.checked ? 'Y' : 'N' }, function () {
                window.location.reload();
            }, function (res) {
                btn.disabled = false;
                inputs.password.value = '';
                msg.textContent = (res && res.message) ? String(res.message).replace(/\\n/g, ' ') : t('login_failed', '로그인에 실패했습니다.');
                return false; // 기본 경고창 대신 팝업 안에 메시지 표시
            });
        });
        return form;
    }

    // #rgb / #rrggbb + 투명도(%) → rgba() 문자열 (투명도 0 = 불투명)
    function toRgba(hex, trans) {
        var h = String(hex || '').replace('#', '');
        if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return '#ffffff';
        return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + (1 - trans / 100) + ')';
    }

    function isSafeUrl(url) {
        return /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(String(url || ''));
    }

    function makeOpener(url, target) {
        return function () {
            if (!isSafeUrl(url)) return;
            if (target === 'self') {
                window.location.href = url;
            } else {
                window.open(url, '_blank', 'noopener');
            }
        };
    }

    // 관리자 화면에서 실제 팝업으로 미리보기: window.triplepopupOpen({ preview: true, cfg: { popup_effect: 3, ... } })
    window.triplepopupOpen = function (opts) {
        var old = document.getElementById('triplepopup-pop-root');
        if (old && old._tpDestroy) old._tpDestroy();
        init(opts || {});
    };

    // 관리자 화면(관리자 주소·모듈 관리 화면)에서는 자동으로 띄우지 않는다 — 미리보기 버튼(triplepopupOpen)으로만 열린다
    function isAdminScreen() {
        return !!(document.querySelector('.triplepopup-admin')
            || /(^|[?&])module=admin(&|$)/.test(window.location.search)
            || /(^|[?&])act=disp\w*Admin/i.test(window.location.search)
            || /^\/admin(\/|$)/.test(window.location.pathname));
    }

    // <head>에서 불러오므로 본문(body)이 생기는 즉시 팝업을 띄워 기본 화면보다 먼저 보이게 한다
    function whenBody(fn) {
        if (document.body) { fn(); return; }
        var observer = new MutationObserver(function () {
            if (!document.body) return;
            observer.disconnect();
            fn();
        });
        observer.observe(document.documentElement, { childList: true });
    }

    if (!window.TRIPLEPOPUP_MANUAL) {
        whenBody(function () { if (!isAdminScreen()) init(); });
    }
}());
