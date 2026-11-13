(function () {
    'use strict';

    var COOKIE_NAME = 'rx_popup_hidden';
    var apiUrl = window.TRIPLEPOPUP_API || '/index.php?module=triplepopup&act=getTriplepopupData';
    var GAP    = 20;
    var UI     = {}; // 접속 언어별 문구 (서버 lang/*.php → config.ui)
    function t(key, fallback) { return (UI[key] && UI[key] !== 'tp_' + key) ? UI[key] : fallback; }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var XPAD   = 20; // 그림자·X버튼·LogIn탭이 잘리지 않도록 뷰포트 4면 여백(px, CSS padding 과 동일)

    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    }

    // days 일간 숨김: 1 = 오늘 자정까지, 7 = 오늘 포함 7일째 자정까지
    function setCookieForDays(name, days) {
        var d = new Date();
        d.setDate(d.getDate() + days - 1);
        d.setHours(23, 59, 59, 0);
        document.cookie = name + '=1;expires=' + d.toUTCString() + ';path=/';
    }

    // 뷰포트 너비에 따라 한 번에 보이는 카드 수(3/2/1)와 카드 크기를 계산.
    // maxW: 관리자에서 지정한 카드 최대 가로폭. 가용 공간에 맞춰 축소하여 가로 넘침을 방지한다.
    function getLayout(count, maxW) {
        var vw = window.innerWidth;
        if (!maxW || maxW < 180) maxW = 420;
        if (maxW > 900) maxW = 900;

        // 브레이크포인트: 1201px↑ = 3장, 769~1200px = 2장, 768px↓ = 1장
        var maxVisible = (vw <= 768) ? 1 : (vw <= 1200 ? 2 : 3);
        var visible = Math.min(maxVisible, count);
        if (visible < 1) visible = 1;

        var side  = 40; // 오버레이 좌우 여백
        var avail = vw - side;
        var cardW = Math.floor((avail - GAP * (visible - 1)) / visible);
        if (cardW > maxW) cardW = maxW; // 설정한 최대 폭을 넘지 않음
        if (cardW < 180)  cardW = 180;  // 최소 폭

        return { visible: visible, cardW: cardW };
    }

    function init() {
        if (getCookie(COOKIE_NAME)) return;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', apiUrl, true);
        xhr.onload = function () {
            if (xhr.status !== 200) return;
            try {
                var res = JSON.parse(xhr.responseText);
                if (res.error !== 0) return;
                var cfg = res.config || {};
                if (cfg.is_active === 'N') return;
                var items = res.items;
                if (!items || !items.length) return;
                renderPopup(cfg, items);
            } catch (e) {}
        };
        xhr.send();
    }

    function renderPopup(config, items) {
        var count    = Math.min(items.length, 6);
        items        = items.slice(0, count);
        var interval = Math.max(1, parseInt(config.slide_interval, 10) || 3) * 1000;
        var maxW     = parseInt(config.popup_width, 10) || 420;
        var closeDays = Math.max(1, Math.min(365, parseInt(config.close_days, 10) || 1));
        UI = config.ui || {};

        var layout       = getLayout(count, maxW);
        var currentIndex = 0;
        var slideTimer   = null;
        var hasOverflow  = false;

        var overlay = document.createElement('div');
        overlay.id  = 'triplepopup-pop-root';

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
            track.appendChild(buildCard(items[i], layout.cardW, 480 / 420, function () { syncHeights(); }, function (c) { removeCard(c); }));
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

        // 가로(카드 폭)만 지정하고 세로는 이미지/HTML 콘텐츠 높이에 맞춰 자동.
        // 이미지에는 CSS(max-height:72vh)로 상한만 두고, JS에서 강제 height를 넣지 않는다.
        function syncHeights() {
            var cards = track.querySelectorAll('.triplepopup-pop-card');
            var maxH = 0;
            for (var i = 0; i < cards.length; i++) {
                // 이전에 강제 지정했던 media height 제거 → 콘텐츠 자연 높이 사용
                var media = cards[i].querySelector('.triplepopup-pop-media');
                if (media) media.style.height = '';
                // 로그인 탭이 카드 밖에 있으므로 cell 전체 높이 기준
                var cell = cards[i].closest ? cards[i].closest('.triplepopup-pop-cell') : cards[i].parentNode;
                var h = (cell && cell.classList && cell.classList.contains('triplepopup-pop-cell'))
                    ? cell.offsetHeight
                    : cards[i].offsetHeight;
                if (h > maxH) maxH = h;
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
            layout = getLayout(count, maxW);
            var vwTotal = layout.cardW * layout.visible + GAP * (layout.visible - 1);

            stage.style.width     = vwTotal + 'px';
            viewport.style.width   = (vwTotal + XPAD * 2) + 'px';
            track.style.width      = (layout.cardW * count + GAP * (count - 1)) + 'px';
            bottom.style.width     = vwTotal + 'px';

            var cards = track.querySelectorAll('.triplepopup-pop-card');
            for (var c = 0; c < cards.length; c++) {
                cards[c].style.width    = layout.cardW + 'px';
                cards[c].style.minWidth = layout.cardW + 'px';
                // 로그인 패널이 카드보다 넓어 래퍼가 늘어나면 카드가 오른쪽으로 밀리므로 래퍼 폭도 고정
                var cellBox = cards[c].parentNode;
                if (cellBox && cellBox.classList && cellBox.classList.contains('triplepopup-pop-cell')) {
                    cellBox.style.width    = layout.cardW + 'px';
                    cellBox.style.minWidth = layout.cardW + 'px';
                    cellBox.style.maxWidth = layout.cardW + 'px';
                }
            }

            syncHeights();

            // 보이는 수보다 카드가 많을 때만 좌우 버튼 노출 + 자동 슬라이드
            hasOverflow = count > layout.visible;
            prevBtn.style.display = hasOverflow ? 'flex' : 'none';
            nextBtn.style.display = hasOverflow ? 'flex' : 'none';

            moveTo(currentIndex, false);

            if (dragX || dragY) {
                var pos = clampOffset(dragX, dragY);
                setOffset(pos.x, pos.y);
            }
        }

        // 개별 배너 닫기(X): 해당 카드만 제거하고 남은 카드로 다시 배치, 전부 닫히면 팝업 종료
        function removeCard(card) {
            var cell = card.parentNode; // 카드 + X 버튼을 감싼 래퍼
            if (cell && cell.parentNode) cell.parentNode.removeChild(cell);
            count--;
            if (count < 1) {
                clearInterval(slideTimer);
                overlay.parentNode && overlay.parentNode.removeChild(overlay);
                return;
            }
            applyLayout();
            restartTimer();
        }

        function maxIndex() { return Math.max(0, count - layout.visible); }

        function moveTo(idx, animate) {
            track.style.transition = (animate === false)
                ? 'none'
                : 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
            currentIndex = Math.max(0, Math.min(idx, maxIndex()));
            track.style.transform = 'translateX(-' + (currentIndex * (layout.cardW + GAP)) + 'px)';
        }

        function goNext() { moveTo(currentIndex >= maxIndex() ? 0 : currentIndex + 1, true); }
        function goPrev() { moveTo(currentIndex <= 0 ? maxIndex() : currentIndex - 1, true); }

        function restartTimer() {
            clearInterval(slideTimer);
            if (hasOverflow) slideTimer = setInterval(goNext, interval);
        }

        applyLayout();
        restartTimer();

        // 카드 높이가 나중에 바뀌어도(SNS 로그인 위젯 로딩, 이미지 로딩, 오류 메시지 등) 잘리지 않고 팝업이 자동으로 늘어나게 함
        if (window.ResizeObserver) {
            var cardObserver = new ResizeObserver(function () { syncHeights(); });
            var observed = track.querySelectorAll('.triplepopup-pop-cell');
            if (!observed.length) observed = track.querySelectorAll('.triplepopup-pop-card');
            for (var o = 0; o < observed.length; o++) cardObserver.observe(observed[o]);
        } else {
            setTimeout(syncHeights, 600);
            setTimeout(syncHeights, 2000);
        }

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                applyLayout();
                restartTimer();
            }, 100);
        });

        // 로그인 입력 중에는 자동 슬라이드를 멈춰 입력하던 카드가 넘어가지 않게 함
        wrap.addEventListener('focusin', function (e) {
            if (e.target.closest && e.target.closest('.triplepopup-pop-login')) clearInterval(slideTimer);
        });
        wrap.addEventListener('focusout', function (e) {
            if (e.target.closest && e.target.closest('.triplepopup-pop-login') && !(e.relatedTarget && wrap.contains(e.relatedTarget))) restartTimer();
        });

        prevBtn.addEventListener('click', function () { goPrev(); restartTimer(); });
        nextBtn.addEventListener('click', function () { goNext(); restartTimer(); });

        todayBtn.addEventListener('click', function () {
            setCookieForDays(COOKIE_NAME, closeDays);
            clearInterval(slideTimer);
            overlay.parentNode && overlay.parentNode.removeChild(overlay);
        });

        closeBtn.addEventListener('click', function () {
            clearInterval(slideTimer);
            overlay.parentNode && overlay.parentNode.removeChild(overlay);
        });
    }

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

        // 배너 그림자 (기본 표시, 'N' 이면 숨김 — 투명 배경에서 카드 경계가 보이지 않게)
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

        var hasImage = !!(item.body_image);

        if (hasImage) {
            // ── 이미지 있는 카드: 배지·타이틀을 이미지 위 오버레이로 표시 ──
            var media = document.createElement('div');
            media.className = 'triplepopup-pop-media';
            media.setAttribute('data-ratio', baseRatio);
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

            if (item.badge_text) {
                var badge = document.createElement('span');
                badge.className        = 'triplepopup-pop-badge';
                badge.style.background = item.badge_bg_color || '#0071e3';
                badge.style.color      = item.badge_text_color || '#ffffff';
                badge.textContent      = item.badge_text;
                media.appendChild(badge);
            }

            if (item.title_text || item.sub_text) {
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

        // 로그인 탭은 카드 테두리 바깥(아래)에 두기 위해 cell 에 붙임
        var authBox = null;
        if (item.footer_login === 'Y' || item.footer_sns === 'Y') {
            authBox = buildAuthBox(item, borderW);
        }

        // 우측 상단 X 버튼 — 이 배너만 닫기
        if (typeof onClose === 'function') {
            var xBtn = document.createElement('button');
            xBtn.type = 'button';
            xBtn.className = 'triplepopup-pop-card-close';
            xBtn.setAttribute('aria-label', t('banner_close', '이 배너 닫기'));
            xBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';
            xBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                onClose(card);
            });
            // 카드는 overflow:hidden 이라 버튼이 밖으로 나가지 못하므로, 카드와 버튼을 같은 래퍼에 나란히 둔다
            var cell = document.createElement('div');
            cell.className = 'triplepopup-pop-cell';
            cell.appendChild(card);
            if (authBox) cell.appendChild(authBox);
            cell.appendChild(xBtn);
            return cell;
        }

        if (authBox) {
            var wrapOnly = document.createElement('div');
            wrapOnly.className = 'triplepopup-pop-cell';
            wrapOnly.appendChild(card);
            wrapOnly.appendChild(authBox);
            return wrapOnly;
        }
        return card;
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
