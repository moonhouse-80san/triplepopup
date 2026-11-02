(function () {
    'use strict';

    var COOKIE_NAME = 'rx_popup_hidden';
    var apiUrl = window.TRIPLEPOPUP_API || '/index.php?module=triplepopup&act=getTriplepopupData';
    var GAP    = 20;

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
            track.appendChild(buildCard(items[i], layout.cardW, 480 / 420, function () { syncHeights(); }));
        }
        viewport.appendChild(track);
        stage.appendChild(viewport);

        var prevBtn = document.createElement('button');
        prevBtn.className = 'triplepopup-pop-nav-btn prev';
        prevBtn.setAttribute('aria-label', '이전');
        prevBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';

        var nextBtn = document.createElement('button');
        nextBtn.className = 'triplepopup-pop-nav-btn next';
        nextBtn.setAttribute('aria-label', '다음');
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
        todayBtn.innerHTML = (closeDays > 1) ? '&#10003; ' + closeDays + '일간 닫기' : '&#10003; 오늘하루 그만보기';

        var closeBtn = document.createElement('button');
        closeBtn.className = 'triplepopup-pop-close-btn';
        closeBtn.innerHTML = '닫기 &times;';

        bottom.appendChild(todayBtn);
        bottom.appendChild(closeBtn);
        wrap.appendChild(bottom);
        overlay.appendChild(wrap);
        document.body.appendChild(overlay);

        // 가로(카드 폭)만 지정하고 세로는 이미지/HTML 콘텐츠 높이에 맞춰 자동.
        // 이미지에는 CSS(max-height:72vh)로 상한만 두고, JS에서 강제 height를 넣지 않는다.
        function syncHeights() {
            var cards = track.querySelectorAll('.triplepopup-pop-card');
            var maxH = 0;
            for (var i = 0; i < cards.length; i++) {
                // 이전에 강제 지정했던 media height 제거 → 콘텐츠 자연 높이 사용
                var media = cards[i].querySelector('.triplepopup-pop-media');
                if (media) media.style.height = '';
                if (cards[i].offsetHeight > maxH) maxH = cards[i].offsetHeight;
            }
            if (maxH > 0) viewport.style.height = maxH + 'px';
        }

        function applyLayout() {
            layout = getLayout(count, maxW);
            var vwTotal = layout.cardW * layout.visible + GAP * (layout.visible - 1);

            stage.style.width     = vwTotal + 'px';
            viewport.style.width   = vwTotal + 'px';
            track.style.width      = (layout.cardW * count + GAP * (count - 1)) + 'px';
            bottom.style.width     = vwTotal + 'px';

            var cards = track.querySelectorAll('.triplepopup-pop-card');
            for (var c = 0; c < cards.length; c++) {
                cards[c].style.width    = layout.cardW + 'px';
                cards[c].style.minWidth = layout.cardW + 'px';
            }

            syncHeights();

            // 보이는 수보다 카드가 많을 때만 좌우 버튼 노출 + 자동 슬라이드
            hasOverflow = count > layout.visible;
            prevBtn.style.display = hasOverflow ? 'flex' : 'none';
            nextBtn.style.display = hasOverflow ? 'flex' : 'none';

            moveTo(currentIndex, false);
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

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                applyLayout();
                restartTimer();
            }, 100);
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

    function buildCard(item, w, baseRatio, onImgLoad) {
        var card = document.createElement('div');
        card.className    = 'triplepopup-pop-card';
        card.style.width    = w + 'px';
        card.style.minWidth = w + 'px';

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

        return card;
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
