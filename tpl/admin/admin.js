/* 팝업 플레이 (triplepopup) v3.9.0 · 2026-11-15 · 플레이웹 playwebon.com */
(function () {
    'use strict';

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    ready(function () {
        var root = document.querySelector('.triplepopup-admin');
        if (!root) return;

        /* ---------- 인라인 편집 토글 ---------- */
        function panels()  { return root.querySelectorAll('.triplepopup-edit'); }
        function toggles() { return root.querySelectorAll('.triplepopup-edit-toggle'); }

        function closeAll(except) {
            var ps = panels();
            for (var i = 0; i < ps.length; i++) {
                if (ps[i] !== except) ps[i].hidden = true;
            }
            var ts = toggles();
            for (var j = 0; j < ts.length; j++) {
                ts[j].classList.remove('triplepopup-is-active');
            }
        }

        root.addEventListener('click', function (e) {
            var toggle = e.target.closest ? e.target.closest('.triplepopup-edit-toggle') : null;
            if (toggle) {
                var slot  = toggle.getAttribute('data-slot');
                var panel = root.querySelector('.triplepopup-edit[data-slot="' + slot + '"]');
                if (!panel) return;
                var willOpen = panel.hidden;
                closeAll(willOpen ? panel : null);
                panel.hidden = !willOpen;
                toggle.classList.toggle('triplepopup-is-active', willOpen);
                if (willOpen && panel.scrollIntoView) {
                    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                return;
            }
            if (e.target.closest && e.target.closest('.triplepopup-edit-cancel')) {
                closeAll(null);
            }
        });

        /* ---------- 추천 색상 칩 ---------- */
        function normHex(v) { return (v || '').trim().toLowerCase(); }

        function syncChips(presets) {
            if (!presets) return;
            var target = presets.getAttribute('data-target');
            var field  = presets.closest ? presets.closest('.triplepopup-field') : null;
            var input  = field ? (field.querySelector('input[type="color"][name="' + target + '"]') || field.querySelector('input[type="text"][name="' + target + '"]')) : null;
            var cur    = input ? normHex(input.value) : '';
            var chips  = presets.querySelectorAll('.triplepopup-chip');
            for (var i = 0; i < chips.length; i++) {
                chips[i].classList.toggle('triplepopup-is-selected', normHex(chips[i].getAttribute('data-color')) === cur);
            }
        }

        function syncAllChips() {
            var ps = root.querySelectorAll('.triplepopup-presets');
            for (var i = 0; i < ps.length; i++) syncChips(ps[i]);
        }

        root.addEventListener('click', function (e) {
            var chip = e.target.closest ? e.target.closest('.triplepopup-chip') : null;
            if (!chip) return;
            var presets = chip.closest('.triplepopup-presets');
            var field   = presets ? presets.closest('.triplepopup-field') : null;
            var target  = presets ? presets.getAttribute('data-target') : '';
            var input   = field ? (field.querySelector('input[type="color"][name="' + target + '"]') || field.querySelector('input[type="text"][name="' + target + '"]')) : null;
            if (input) {
                input.value = chip.getAttribute('data-color');
                try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {}
            }
            syncChips(presets);
        });

        // 네이티브 피커로 직접 바꿨을 때도 칩 선택 상태 갱신
        root.addEventListener('input', function (e) {
            if (e.target && (e.target.type === 'color' || (e.target.type === 'text' && e.target.name === 'border_color'))) {
                var field   = e.target.closest ? e.target.closest('.triplepopup-field') : null;
                var presets = field ? field.querySelector('.triplepopup-presets') : null;
                if (presets) syncChips(presets);
            }
        });

        /* ---------- 머리말·하단 버튼 색상: HEX 직접 입력/붙여넣기 ↔ 색상표 동기화 ---------- */
        function pickerOfMini(mini) {
            var form = mini.form || (mini.closest ? mini.closest('form') : null);
            return form ? form.querySelector('input[type="color"][name="' + mini.getAttribute('data-for') + '"]') : null;
        }

        root.addEventListener('input', function (e) {
            var t = e.target;
            if (!t || !t.classList) return;
            if (t.classList.contains('triplepopup-hexmini')) {
                var hex = expandHex(t.value);
                var pk  = pickerOfMini(t);
                if (hex && pk && pk.value !== hex) {
                    pk.value = hex;
                    try { pk.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {} // 미리보기·칩 갱신
                }
            } else if (t.type === 'color' && t.name) {
                var form = t.form || (t.closest ? t.closest('form') : null);
                var mini = form ? form.querySelector('.triplepopup-hexmini[data-for="' + t.name + '"]') : null;
                if (mini && document.activeElement !== mini) mini.value = t.value;
            }
        });

        root.addEventListener('change', function (e) {
            var t = e.target;
            if (!t || !t.classList || !t.classList.contains('triplepopup-hexmini')) return;
            var pk = pickerOfMini(t);
            t.value = expandHex(t.value) || (pk ? pk.value : '');
        });

        /* ---------- 배경 어둡기 슬라이더: 퍼센트 표시 갱신 ---------- */
        root.addEventListener('input', function (e) {
            if (!e.target || e.target.name !== 'overlay_dim') return;
            var out = e.target.parentNode ? e.target.parentNode.querySelector('.triplepopup-range-out') : null;
            if (out) out.textContent = e.target.value + '%';
        });

        /* ---------- 배너 테두리 색상: 색상표 ↔ #hex 직접 입력 동기화 ---------- */
        function expandHex(v) {
            v = (v || '').trim();
            if (v.charAt(0) !== '#') v = '#' + v;
            if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2) + v.charAt(3) + v.charAt(3);
            return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '';
        }

        root.addEventListener('input', function (e) {
            var wrap = e.target && e.target.closest ? e.target.closest('.triplepopup-hexcolor') : null;
            if (!wrap) return;
            var picker = wrap.querySelector('input[type="color"]');
            var text   = wrap.querySelector('input[type="text"]');
            if (e.target === picker) {
                text.value = picker.value;
                text.dispatchEvent(new Event('input', { bubbles: true })); // 미리보기 갱신
            } else if (e.target === text && expandHex(text.value)) {
                picker.value = expandHex(text.value);
                var fld = wrap.closest('.triplepopup-field');
                var pre = fld ? fld.querySelector('.triplepopup-presets') : null;
                if (pre) syncChips(pre);
            }
        });

        // 입력을 마치면 #없이 쓴 값·3자리 값을 보정하고, 잘못된 값은 색상표의 현재 색으로 되돌린다
        root.addEventListener('change', function (e) {
            var wrap = e.target && e.target.closest ? e.target.closest('.triplepopup-hexcolor') : null;
            var text = wrap ? wrap.querySelector('input[type="text"]') : null;
            if (!text || e.target !== text) return;
            var before = text.value;
            var picker = wrap.querySelector('input[type="color"]');
            if (!before.trim()) {
                // 비워두면 기본색 #ffaa56 적용
                var def = wrap.getAttribute('data-default') || '#ffaa56';
                text.value = def;
                picker.value = def;
            } else {
                text.value = expandHex(text.value) || picker.value;
            }
            if (text.value !== before) text.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // 목록의 상태 배지 클릭 → 활성/비활성 전환 (완료 후 새로고침해 예정·종료 상태까지 다시 계산)
        root.addEventListener('click', function (e) {
            var pill = e.target.closest ? e.target.closest('.triplepopup-pill-toggle') : null;
            if (!pill || pill.disabled || typeof Rhymix === 'undefined') return;
            pill.disabled = true;
            Rhymix.ajax('triplepopup.procTriplepopupAdminToggleItem', {
                slot_number: pill.getAttribute('data-slot'),
                is_active: pill.getAttribute('data-active') === 'Y' ? 'N' : 'Y'
            }, function () {
                location.reload();
            }, function () {
                pill.disabled = false;
            });
        });

        syncAllChips();

        /* ---------- 실시간 미리보기 ---------- */
        var LANG_RE = /^\$user_lang-(?:>|&(?:amp;)?gt;)/;

        // 라이믹스 다국어 UI가 적용된 필드는 화면에 보이는 표시 입력란(#lang_아이디)의 값을 사용
        function fieldVal(form, name) {
            var el = form.querySelector('[name="' + name + '"]');
            if (!el) return '';
            var disp = el.id ? document.getElementById('lang_' + el.id) : null;
            if (disp && !LANG_RE.test(disp.value)) return disp.value;
            if (LANG_RE.test(el.value)) return el.getAttribute('data-lang-display') || '';
            return el.value;
        }

        // 미리보기 전용 간이 정제 (script·iframe 등 제거, on* 속성과 javascript: 주소 제거). 실제 저장 값은 서버 HTMLFilter 가 정제한다.
        function cleanPreviewHtml(html) {
            var doc  = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
            var bad  = doc.body.querySelectorAll('script, style, iframe, object, embed, link, meta, base, form, svg, math');
            var i, j;
            for (i = 0; i < bad.length; i++) bad[i].parentNode.removeChild(bad[i]);
            var all = doc.body.querySelectorAll('*');
            for (i = 0; i < all.length; i++) {
                var attrs = Array.prototype.slice.call(all[i].attributes);
                for (j = 0; j < attrs.length; j++) {
                    var name = attrs[j].name.toLowerCase();
                    var val  = attrs[j].value.replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
                    if (name.indexOf('on') === 0 || /^(javascript:|vbscript:|data:(?!image\/))/.test(val)) {
                        all[i].removeAttribute(attrs[j].name);
                    }
                }
            }
            return doc.body.innerHTML;
        }

        function setPreviewHtml(el, html) {
            if (!el) return;
            if (el.getAttribute('data-src') !== html) {
                el.innerHTML = html ? cleanPreviewHtml(html) : '';
                el.setAttribute('data-src', html);
            }
            el.hidden = !html;
        }

        function updatePreview(form) {
            var card = form.querySelector('.triplepopup-preview-card');
            if (!card) return;

            var title    = fieldVal(form, 'title_text');
            var sub      = fieldVal(form, 'sub_text');
            var badge    = fieldVal(form, 'badge_text');
            var badgeBg  = fieldVal(form, 'badge_bg_color') || '#0071e3';
            var badgeFg  = fieldVal(form, 'badge_text_color') || '#ffffff';
            var footer   = fieldVal(form, 'footer_text');
            var footerBg = fieldVal(form, 'footer_bg_color') || '#0071e3';
            var footerFg = fieldVal(form, 'footer_text_color') || '#ffffff';

            var elTitle   = card.querySelector('.triplepopup-pv-title');
            var elSub     = card.querySelector('.triplepopup-pv-sub');
            var elOverlay = card.querySelector('.triplepopup-pv-overlay');
            var elBadge   = card.querySelector('.triplepopup-pv-badge');
            var elFooter  = card.querySelector('.triplepopup-pv-footer');

            if (elTitle) { elTitle.textContent = title; elTitle.hidden = !title.trim(); }
            if (elSub)   { elSub.textContent = sub; elSub.hidden = !sub.trim(); }
            if (elOverlay) elOverlay.hidden = !(title.trim() || sub.trim());

            var htmlVal = fieldVal(form, 'html_content').trim();
            var htmlOv  = fieldVal(form, 'html_position') === 'overlay';
            var htmlBg  = fieldVal(form, 'html_bg_color') || '#ffffff';
            setPreviewHtml(card.querySelector('.triplepopup-pv-html-top'),     htmlOv ? '' : htmlVal);
            setPreviewHtml(card.querySelector('.triplepopup-pv-html-overlay'), htmlOv ? htmlVal : '');

            // 본문 배경색: 카드 전체에 적용 (이미지가 있어도 텍스트 영역 배경으로 사용)
            var htmlTrans = Math.max(0, Math.min(100, parseInt(fieldVal(form, 'html_bg_trans'), 10) || 0));
            var transIn   = form.querySelector('[name="html_bg_trans"]');
            var transOut  = transIn && transIn.parentNode ? transIn.parentNode.querySelector('.triplepopup-range-out') : null;
            if (transOut) transOut.textContent = htmlTrans + '%';
            var hx = htmlBg.replace('#', '');
            if (hx.length === 3) hx = hx.charAt(0) + hx.charAt(0) + hx.charAt(1) + hx.charAt(1) + hx.charAt(2) + hx.charAt(2);
            card.style.background = /^[0-9a-fA-F]{6}$/.test(hx)
                ? 'rgba(' + parseInt(hx.substr(0, 2), 16) + ',' + parseInt(hx.substr(2, 2), 16) + ',' + parseInt(hx.substr(4, 2), 16) + ',' + (1 - htmlTrans / 100) + ')'
                : '#ffffff';

            // 배너 테두리: 굵기 0 이거나 색상이 올바르지 않으면 미리보기 기본 테두리 유지
            var bdW = Math.max(0, Math.min(20, parseInt(fieldVal(form, 'border_width'), 10) || 0));
            var bdC = fieldVal(form, 'border_color').trim() || '#ffaa56';
            card.style.border = (bdW > 0 && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(bdC)) ? bdW + 'px solid ' + bdC : '';

            // 배너 그림자: 숨김이면 미리보기 카드에서도 제거
            card.style.boxShadow = (fieldVal(form, 'card_shadow') === 'Y') ? '' : 'none';

            // 이미지·머리말·타이틀 없이 글만 있으면 실제 팝업처럼 이미지 영역 없이 텍스트 카드로 표시
            var pvImg  = card.querySelector('.triplepopup-pv-img');
            var hasImg = !!(pvImg && !pvImg.hidden && pvImg.getAttribute('src'));
            card.classList.toggle('triplepopup-pv-textonly', !!htmlVal && !htmlOv && !hasImg && !badge.trim() && !title.trim() && !sub.trim());

            if (elBadge) {
                if (badge.trim()) { elBadge.textContent = badge; elBadge.style.background = badgeBg; elBadge.style.color = badgeFg; elBadge.hidden = false; }
                else { elBadge.hidden = true; }
            }
            // 하단 로그인 / SNS 로그인: 각각 따로 선택 — 미리보기에 해당 영역을 표시하고, 맨 위 영역에는 배너 테두리를 적용
            var loginOn = !!form.querySelector('[name="footer_login"]:checked');
            var snsOn   = !!form.querySelector('[name="footer_sns"]:checked');
            var elLogin = card.querySelector('.triplepopup-pv-login');
            var elSns   = card.querySelector('.triplepopup-pv-sns');
            var elNote  = form.querySelector('.triplepopup-login-note');
            var topLine = (bdW > 0 && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(bdC)) ? bdW + 'px solid ' + bdC : '';
            if (elLogin) {
                elLogin.hidden = !loginOn;
                elLogin.style.borderTop = topLine;
                var elLoginBtn = elLogin.querySelector('.triplepopup-pv-login-btn');
                if (elLoginBtn) { elLoginBtn.style.background = footerBg; elLoginBtn.style.color = footerFg; }
            }
            if (elSns) {
                elSns.hidden = !snsOn;
                elSns.style.borderTop = loginOn ? '' : topLine;
            }
            if (elNote) elNote.hidden = !(loginOn || snsOn);
            if (elFooter) {
                if (footer.trim()) { elFooter.textContent = footer; elFooter.style.background = footerBg; elFooter.style.color = footerFg; elFooter.hidden = false; }
                else { elFooter.hidden = true; }
            }
        }

        function applyPreviewRatio(card, w, h) {
            if (!card) return;
            var g = globalRatio();
            if (g) { w = g.w; h = g.h; }
            if (!w || !h) return;
            card.setAttribute('data-nat', w + ' / ' + h);
            var media = card.querySelector('.triplepopup-preview-media');
            if (media) media.style.aspectRatio = w + ' / ' + h;
        }

        function bindPreviewImage(form) {
            var card = form.querySelector('.triplepopup-preview-card');
            if (!card) return;

            // 기존(서버) 이미지가 있으면 그 비율로 미리보기 반영
            var existing = card.querySelector('.triplepopup-pv-img');
            if (existing && existing.getAttribute('src')) {
                if (existing.complete && existing.naturalWidth) {
                    applyPreviewRatio(card, existing.naturalWidth, existing.naturalHeight);
                } else {
                    existing.addEventListener('load', function () {
                        applyPreviewRatio(card, existing.naturalWidth, existing.naturalHeight);
                    });
                }
            }

            var fileInput = form.querySelector('input[type="file"][name="body_image"]');

            // 기본 배경이미지 선택 → 미리보기 반영 (마지막에 한 동작이 우선: 프리셋 선택 시 선택해 둔 파일은 비움)
            function showPresetPreview(src) {
                var pimg   = card.querySelector('.triplepopup-pv-img');
                var pnoimg = card.querySelector('.triplepopup-pv-noimg');
                if (!pimg) return;
                if (src) {
                    pimg.onload = function () {
                        if (pimg.naturalWidth && pimg.naturalHeight) applyPreviewRatio(card, pimg.naturalWidth, pimg.naturalHeight);
                    };
                    pimg.src = src;
                    pimg.hidden = false;
                    if (pnoimg) pnoimg.hidden = true;
                } else {
                    pimg.removeAttribute('src');
                    pimg.hidden = true;
                    if (pnoimg) pnoimg.hidden = false;
                }
                updatePreview(form);
            }
            var presetRadios = form.querySelectorAll('input[name="body_preset"]');
            for (var pr = 0; pr < presetRadios.length; pr++) {
                presetRadios[pr].addEventListener('change', function () {
                    var hasFile = fileInput && fileInput.files && fileInput.files[0];
                    if (this.value !== '0') {
                        if (fileInput) fileInput.value = '';
                    } else if (hasFile) {
                        return;
                    }
                    showPresetPreview(this.getAttribute('data-src') || '');
                });
            }

            if (!fileInput) return;
            fileInput.addEventListener('change', function () {
                var img   = card.querySelector('.triplepopup-pv-img');
                var noimg = card.querySelector('.triplepopup-pv-noimg');
                var file  = fileInput.files && fileInput.files[0];
                if (file && img) {
                    var reader = new FileReader();
                    reader.onload = function (ev) {
                        img.onload = function () {
                            if (img.naturalWidth && img.naturalHeight) {
                                applyPreviewRatio(card, img.naturalWidth, img.naturalHeight);
                            }
                        };
                        img.src = ev.target.result;
                        img.hidden = false;
                        if (noimg) noimg.hidden = true;
                        var uploadRadio = form.querySelector('input[name="body_preset"][value="0"]');
                        if (uploadRadio) uploadRadio.checked = true; // 파일을 고르면 '직접 업로드'로 전환
                        updatePreview(form);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        var pvForms = root.querySelectorAll('.triplepopup-edit form');
        for (var p = 0; p < pvForms.length; p++) {
            (function (form) {
                if (!form.querySelector('.triplepopup-preview-card')) return;
                updatePreview(form);
                bindPreviewImage(form);
                updateMedia(form);
                updateCategoryVisibility(form);
                form.addEventListener('input', function () { updatePreview(form); updateMedia(form); });
                form.addEventListener('change', function () {
                    updatePreview(form);
                    updateMedia(form);
                    updateCategoryVisibility(form);
                });
                // 다국어 해제(×) 버튼 클릭 후 반영
                form.addEventListener('click', function (e) {
                    if (e.target && e.target.closest && e.target.closest('.g11n')) {
                        setTimeout(function () { updatePreview(form); }, 0);
                    }
                });
            })(pvForms[p]);
        }

        /* ---------- 팝업 비율 · 가로 배너 수 (선택 즉시 저장) ---------- */
        function globalRatio() {
            var on = root.querySelector('.triplepopup-ratio-input:checked');
            var item = on && on.closest ? on.closest('.triplepopup-ratio-item') : null;
            if (!item) return null;
            var w = parseFloat(item.getAttribute('data-w')), h = parseFloat(item.getAttribute('data-h'));
            if (!w || !h) return null;
            return { w: w, h: h, label: on.value, rec: item.getAttribute('data-rec') || '' };
        }

        function colsCurrent() {
            var on = root.querySelector('.triplepopup-cols-input:checked');
            var n = on ? parseInt(on.value, 10) : 3;
            return (n >= 1 && n <= 4) ? n : 3;
        }

        function refreshRatio() {
            var g = globalRatio();
            var items = root.querySelectorAll('.triplepopup-ratio-item');
            for (var i = 0; i < items.length; i++) {
                var inp = items[i].querySelector('.triplepopup-ratio-input');
                items[i].classList.toggle('triplepopup-is-checked', !!(inp && inp.checked));
            }
            var minis = root.querySelectorAll('.triplepopup-ratio-mini');
            var autoRatios = ['7 / 8', '3 / 4', '1 / 1'];
            var cols = colsCurrent();
            var colItems = root.querySelectorAll('.triplepopup-cols-item');
            for (var ci = 0; ci < colItems.length; ci++) {
                var cinp = colItems[ci].querySelector('.triplepopup-cols-input');
                colItems[ci].classList.toggle('triplepopup-is-checked', !!(cinp && cinp.checked));
            }
            var maxMini = [0, 132, 110, 84, 60][cols];
            // '팝업 가로 크기'를 직접 지정했으면 그 폭이 모든 가로 배너 수에 적용된다 (popup.js 와 같은 규칙)
            var wInput  = root.querySelector('input[name="popup_width"]');
            var ovr     = wInput ? Math.max(0, parseInt(wInput.value, 10) || 0) : 0;
            var widths  = ovr > 0 ? [0, ovr, ovr, ovr, ovr] : ((g && g.label === '16:9') ? [0, 960, 720, 560, 440] : [0, 560, 480, 420, 380]);
            var comma   = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
            for (var cw = 0; cw < colItems.length; cw++) {
                var cin = colItems[cw].querySelector('.triplepopup-cols-input');
                var cn  = cin ? parseInt(cin.value, 10) : 0;
                var metas = colItems[cw].querySelectorAll('.triplepopup-ratio-meta');
                if (!widths[cn] || metas.length < 2) continue;
                metas[0].textContent = '전체 폭 ' + comma(widths[cn] * cn + 20 * (cn - 1)) + 'px';
                metas[1].textContent = '배너 ' + widths[cn] + 'px';
            }
            var cardPx  = widths[cols];
            var totalPx = cardPx * cols + 20 * (cols - 1);
            var elCols  = root.querySelector('.triplepopup-cols-cur');
            var elTotal = root.querySelector('.triplepopup-cols-total');
            var elCard  = root.querySelector('.triplepopup-cols-card');
            if (elCols)  elCols.textContent  = cols + '개';
            if (elTotal) elTotal.textContent = comma(totalPx) + 'px';
            if (elCard)  elCard.textContent  = cardPx + 'px';
            for (var m = 0; m < minis.length; m++) {
                var pic = minis[m].querySelector('i');
                var r = g ? (g.w / g.h) : 0;
                var w = !g ? Math.min(80, maxMini) : Math.max(34, Math.min(maxMini, Math.round(158 * r)));
                minis[m].hidden = m >= cols;
                minis[m].style.width = w + 'px';
                if (pic) pic.style.aspectRatio = g ? (g.w + ' / ' + g.h) : autoRatios[m % 3];
            }
            var cur = root.querySelector('.triplepopup-ratio-cur');
            var rec = root.querySelector('.triplepopup-ratio-rec');
            var recLine = root.querySelector('.triplepopup-ratio-recline');
            if (cur) cur.textContent = g ? g.label : '원본 크기 그대로';
            if (rec) rec.textContent = g ? g.rec : '';
            if (recLine) recLine.hidden = !g;
            var sizes = root.querySelectorAll('.triplepopup-rec-size');
            for (var s = 0; s < sizes.length; s++) sizes[s].textContent = g ? (g.rec + 'px') : (sizes[s].getAttribute('data-auto') || '840 × 960px');
            var recHints = root.querySelectorAll('.triplepopup-rec-hint');
            for (var rh = 0; rh < recHints.length; rh++) recHints[rh].hidden = (recHints[rh].getAttribute('data-mode') === 'fixed') !== !!g;
            var ratios = root.querySelectorAll('.triplepopup-rec-ratio');
            for (var t = 0; t < ratios.length; t++) ratios[t].textContent = g ? g.label : '7:8';
            setTimeout(syncAllMedia, 0);
            var cards = root.querySelectorAll('.triplepopup-preview-card');
            for (var c = 0; c < cards.length; c++) {
                var media = cards[c].querySelector('.triplepopup-preview-media');
                var img = cards[c].querySelector('.triplepopup-pv-img');
                if (!media) continue;
                if (g) media.style.aspectRatio = g.w + ' / ' + g.h;
                else if (img && img.naturalWidth) media.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
                else media.style.aspectRatio = '';
            }
        }
        function showStatus(selector, text, bad) {
            var el = root.querySelector(selector);
            if (!el) return;
            el.textContent = text;
            el.classList.toggle('triplepopup-is-bad', !!bad);
            el.classList.add('triplepopup-is-on');
            clearTimeout(el._tpTimer);
            if (!bad) el._tpTimer = setTimeout(function () { el.classList.remove('triplepopup-is-on'); }, 2200);
        }
        function saveSetting(cardSelector, statusSelector, field, value) {
            var card = root.querySelector(cardSelector);
            var url = card ? card.getAttribute('data-save-url') : '';
            if (!url) return;
            showStatus(statusSelector, '저장 중…');
            var fd = new FormData();
            fd.append(field, value);
            fetch(url, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: fd,
                credentials: 'same-origin'
            }).then(function (res) { return res.json(); }).then(function (data) {
                if (!data || Number(data.error) !== 0) throw new Error('save');
                showStatus(statusSelector, '저장되었습니다');
            }).catch(function () {
                showStatus(statusSelector, '저장하지 못했습니다. 다시 선택해 주세요.', true);
            });
        }
        root.addEventListener('change', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('triplepopup-ratio-input')) {
                refreshRatio();
                saveSetting('.triplepopup-ratio', '.triplepopup-ratio-status', 'popup_ratio', e.target.value);
            }
            if (e.target && e.target.classList && e.target.classList.contains('triplepopup-cols-input')) {
                refreshRatio();
                saveSetting('.triplepopup-cols', '.triplepopup-ratio-status', 'popup_cols', e.target.value);
            }
        });

        var wInputEl = root.querySelector('input[name="popup_width"]');
        if (wInputEl) wInputEl.addEventListener('input', refreshRatio);

        /* ---------- 업로드 이미지 크기 확인 (고정 비율일 때만) ---------- */
        function sameRatio(w1, h1, w2, h2) {
            return Math.abs((w1 / h1) - (w2 / h2)) / (w2 / h2) < 0.01;
        }

        function baseImageSize() {
            var first = root.querySelector('.triplepopup-tbody-group');
            var img = first ? first.querySelector('.triplepopup-trow img.triplepopup-thumb') : null;
            if (!img || !img.naturalWidth || !img.naturalHeight) return null;
            return { w: img.naturalWidth, h: img.naturalHeight };
        }

        function showSizeWarning(opt) {
            var old = root.querySelector('.triplepopup-modal');
            if (old) old.parentNode.removeChild(old);

            var modal = document.createElement('div');
            modal.className = 'triplepopup-modal';
            var box = document.createElement('div');
            box.className = 'triplepopup-modal-box';
            box.setAttribute('role', 'alertdialog');
            box.setAttribute('aria-modal', 'true');

            var title = document.createElement('div');
            title.className = 'triplepopup-modal-title';
            title.textContent = opt.title;
            box.appendChild(title);

            var list = document.createElement('div');
            list.className = 'triplepopup-modal-list';
            for (var i = 0; i < opt.rows.length; i++) {
                var row = document.createElement('div');
                row.className = 'triplepopup-modal-row' + (opt.rows[i].bad ? ' triplepopup-is-bad' : '');
                var k = document.createElement('span'); k.textContent = opt.rows[i].label;
                var v = document.createElement('b');    v.textContent = opt.rows[i].value;
                row.appendChild(k); row.appendChild(v);
                list.appendChild(row);
            }
            box.appendChild(list);

            for (var d = 0; d < opt.lines.length; d++) {
                var p = document.createElement('p');
                p.className = 'triplepopup-modal-desc';
                p.textContent = opt.lines[d];
                box.appendChild(p);
            }

            var actions = document.createElement('div');
            actions.className = 'triplepopup-modal-actions';
            var keep = document.createElement('button');
            keep.type = 'button';
            keep.className = 'triplepopup-btn triplepopup-btn-ghost';
            keep.textContent = '그대로 사용';
            var retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'triplepopup-btn triplepopup-btn-primary';
            retry.textContent = '다시 선택';
            actions.appendChild(keep); actions.appendChild(retry);
            box.appendChild(actions);
            modal.appendChild(box);
            root.appendChild(modal);

            function close() { if (modal.parentNode) modal.parentNode.removeChild(modal); }
            keep.addEventListener('click', close);
            retry.addEventListener('click', function () { close(); if (opt.onRetry) opt.onRetry(); });
            retry.focus();
        }

        function checkImageSize(input, w, h) {
            var g = globalRatio();
            if (!g) return;
            var group = input.closest ? input.closest('.triplepopup-tbody-group') : null;
            var first = root.querySelector('.triplepopup-tbody-group');
            var picked = w + ' × ' + h + 'px';

            function retry() {
                input.value = '';
                try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) {}
                input.click();
            }

            if (group === first) {
                if (sameRatio(w, h, g.w, g.h)) return;
                showSizeWarning({
                    title: '선택한 팝업 비율과 이미지 비율이 다릅니다',
                    rows: [
                        { label: '팝업 비율', value: g.label + ' (권장 ' + g.rec + 'px)' },
                        { label: '선택한 이미지', value: picked, bad: true }
                    ],
                    lines: ['1번 배너는 다른 배너의 기준이 됩니다.', '그대로 올리면 가운데를 기준으로 잘려 표시됩니다.'],
                    onRetry: retry
                });
                return;
            }

            var base = baseImageSize();
            if (!base) return;
            if (base.w === w && base.h === h) return;
            var same = sameRatio(w, h, base.w, base.h);
            showSizeWarning({
                title: '1번 배너와 이미지 크기가 다릅니다',
                rows: [
                    { label: '1번 배너 (기준)', value: base.w + ' × ' + base.h + 'px' },
                    { label: '선택한 이미지', value: picked, bad: true }
                ],
                lines: same
                    ? ['비율은 같아서 잘리지 않습니다.', '크기만 달라 화질 차이가 날 수 있습니다.']
                    : ['비율이 달라 그대로 올리면 가운데를 기준으로 잘려 표시됩니다.', '1번 배너와 같은 크기로 다시 만들어 올리는 것을 권장합니다.'],
                onRetry: retry
            });
        }

        root.addEventListener('change', function (e) {
            var input = e.target;
            if (!input || input.type !== 'file' || !input.closest || !input.closest('.triplepopup-edit')) return;
            var file = input.files && input.files[0];
            if (!file || !/^image\//.test(file.type) || !window.URL || !URL.createObjectURL) return;
            var url = URL.createObjectURL(file);
            var probe = new Image();
            probe.onload = function () {
                var w = probe.naturalWidth, h = probe.naturalHeight;
                URL.revokeObjectURL(url);
                if (w && h) checkImageSize(input, w, h);
            };
            probe.onerror = function () { URL.revokeObjectURL(url); };
            probe.src = url;
        });

        /* ---------- 팝업 등장 효과 (20가지) · 실제 팝업 미리보기 ---------- */
        // 실제 팝업 미리보기에 넘길 설정: 저장 전의 입력값(가로 폭·슬라이드·닫는 날짜·자동 종료)까지 반영한다
        function previewOpts() {
            var g = globalRatio();
            var cfg = { popup_effect: fxCurrent(), popup_cols: colsCurrent(), popup_ratio: g ? g.label : 'auto' };
            var w = root.querySelector('input[name="popup_width"]');
            cfg.popup_width = w ? Math.max(0, parseInt(w.value, 10) || 0) : 0;
            ['slide_interval', 'close_days', 'auto_close'].forEach(function (name) {
                var el = root.querySelector('input[name="' + name + '"]');
                if (el && el.value !== '' && !isNaN(parseInt(el.value, 10))) cfg[name] = parseInt(el.value, 10);
            });
            return { preview: true, cfg: cfg };
        }

        var fxPlayTimer = null;
        function fxCurrent() {
            var on = root.querySelector('.triplepopup-fx-input:checked');
            var n = on ? parseInt(on.value, 10) : 1;
            return (n >= 1 && n <= 20) ? n : 1;
        }
        function fxPlay() {
            var view = root.querySelector('.triplepopup-fx-view');
            if (!view) return;
            var n = fxCurrent();
            clearTimeout(fxPlayTimer);
            view.className = 'triplepopup-fx-view';
            void view.offsetWidth;
            view.className = 'triplepopup-fx-view triplepopup-pop-entering triplepopup-pop-fx' + n;
            fxPlayTimer = setTimeout(function () { view.className = 'triplepopup-fx-view'; }, 1400);
        }
        function fxRefresh() {
            var n = fxCurrent();
            var items = root.querySelectorAll('.triplepopup-fx-item');
            var name = '';
            for (var i = 0; i < items.length; i++) {
                var inp = items[i].querySelector('.triplepopup-fx-input');
                var on = !!(inp && inp.checked);
                items[i].classList.toggle('triplepopup-is-checked', on);
                if (on) { var nm = items[i].querySelector('.triplepopup-fx-name'); name = nm ? nm.textContent : ''; }
            }
            var cur = root.querySelector('.triplepopup-fx-cur');
            if (cur) cur.textContent = n + '. ' + name;
        }
        root.addEventListener('change', function (e) {
            if (e.target && e.target.classList && e.target.classList.contains('triplepopup-fx-input')) {
                fxRefresh();
                fxPlay();
                saveSetting('.triplepopup-fx', '.triplepopup-fx-status', 'popup_effect', e.target.value);
            }
        });
        root.addEventListener('click', function (e) {
            if (!e.target.closest) return;
            if (e.target.closest('.triplepopup-fx-replay')) fxPlay();
            if (e.target.closest('.triplepopup-fx-open') && typeof window.triplepopupOpen === 'function') {
                window.triplepopupOpen(previewOpts());
            }
        });
        fxRefresh();

        /* ---------- 오른쪽 따라다니는 저장 막대 (저장 · 미리보기 · 맨 위로) ---------- */
        /* ---------- 폴딩: 팝업 비율·배치 설정 / 팝업 등장 효과 (기본 닫힘) ---------- */
        var foldCards = root.querySelectorAll('.triplepopup-fold');
        for (var fc = 0; fc < foldCards.length; fc++) {
            (function (card) {
                var head = card.querySelector('.triplepopup-card-head');
                if (!head) return;
                head.setAttribute('role', 'button');
                head.setAttribute('tabindex', '0');
                head.setAttribute('aria-expanded', card.classList.contains('triplepopup-is-closed') ? 'false' : 'true');
                function toggle() {
                    var closed = card.classList.toggle('triplepopup-is-closed');
                    head.setAttribute('aria-expanded', closed ? 'false' : 'true');
                }
                head.addEventListener('click', toggle);
                head.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
                });
            })(foldCards[fc]);
        }

        var floatBar = root.querySelector('.triplepopup-float');
        if (floatBar) {
            var setForms = root.querySelectorAll('.triplepopup-settings-form');
            var floatTimer = null;
            var floatBase = [];

            var floatFields = function () {
                var out = [];
                for (var i = 0; i < setForms.length; i++) {
                    var els = setForms[i].querySelectorAll('input, select, textarea');
                    for (var j = 0; j < els.length; j++) {
                        var el = els[j];
                        if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
                        out.push((el.type === 'checkbox' || el.type === 'radio') ? (el.checked ? '1' : '0') : el.value);
                    }
                }
                return out;
            };
            var floatSet = function (state, label, count) {
                floatBar.setAttribute('data-state', state);
                var lb = floatBar.querySelector('.triplepopup-float-label');
                var ct = floatBar.querySelector('.triplepopup-float-count');
                if (lb) lb.textContent = label;
                if (ct) { ct.textContent = count || ''; ct.hidden = !count; }
            };
            var floatCount = function () {
                var now = floatFields(), n = 0;
                for (var i = 0; i < now.length; i++) if (now[i] !== floatBase[i]) n++;
                return n;
            };
            // 지금 펼쳐져 있고 값이 바뀐 배너 편집 폼 (없으면 null)
            var bannerForm = function () {
                var open = root.querySelectorAll('.triplepopup-edit:not([hidden]) form');
                for (var i = 0; i < open.length; i++) if (open[i]._tpDirty) return open[i];
                return null;
            };
            var floatRefresh = function () {
                if (floatBar.getAttribute('data-state') === 'saving') return;
                clearTimeout(floatTimer);
                var n = floatCount() + (bannerForm() ? 1 : 0);
                floatSet(n ? 'dirty' : 'idle', '저장', n);
            };
            var floatSave = function () {
                var url = floatBar.getAttribute('data-save-url');
                if (!url || floatBar.getAttribute('data-state') === 'saving') return;
                var bf = bannerForm();
                // 배너 저장은 기존 '등록/수정' 버튼과 같은 방식(페이지 이동)으로 처리한다
                var submitBanner = function () {
                    var btn = bf.querySelector('.triplepopup-edit-actions button[type="submit"]');
                    floatSet('saving', '저장 중', 0);
                    if (btn) btn.click(); else if (bf.requestSubmit) bf.requestSubmit(); else bf.submit();
                };
                if (!floatCount()) {
                    if (bf) submitBanner(); else floatRefresh();
                    return;
                }
                var sent = floatFields();
                var fd = new FormData();
                for (var i = 0; i < setForms.length; i++) {
                    var part = new FormData(setForms[i]);
                    part.forEach(function (value, key) { fd.append(key, value); });
                }
                floatSet('saving', '저장 중', 0);
                fetch(url, {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    body: fd,
                    credentials: 'same-origin'
                }).then(function (res) { return res.json(); }).then(function (data) {
                    if (!data || Number(data.error) !== 0) throw new Error('save');
                    floatBase = sent;
                    if (bf) { submitBanner(); return; } // 설정을 먼저 저장한 뒤 배너를 저장
                    floatSet('saved', '저장됨', 0);
                    floatTimer = setTimeout(function () { floatBar.setAttribute('data-state', 'idle'); floatRefresh(); }, 1800);
                }).catch(function () {
                    floatSet('error', '저장 실패', floatCount());
                    floatTimer = setTimeout(function () { floatBar.setAttribute('data-state', 'idle'); floatRefresh(); }, 2600);
                });
            };

            for (var sf = 0; sf < setForms.length; sf++) {
                setForms[sf].addEventListener('input', floatRefresh);
                setForms[sf].addEventListener('change', floatRefresh);
                setForms[sf].addEventListener('click', function () { setTimeout(floatRefresh, 0); });
                setForms[sf].addEventListener('submit', function (e) { e.preventDefault(); floatSave(); });
            }
            // 배너 편집 폼: 값이 바뀌면 저장 막대를 활성화하고, 펼침/닫힘에 맞춰 상태 갱신
            root.addEventListener('input', function (e) { markBanner(e); });
            root.addEventListener('change', function (e) { markBanner(e); });
            function markBanner(e) {
                var f = e.target && e.target.closest ? e.target.closest('.triplepopup-edit form') : null;
                if (!f) return;
                f._tpDirty = true;
                floatRefresh();
            }
            root.addEventListener('click', function (e) {
                if (e.target.closest && e.target.closest('.triplepopup-edit-toggle, .triplepopup-edit-cancel')) setTimeout(floatRefresh, 0);
            });
            // 배너 저장(등록/수정 버튼 포함)으로 페이지가 이동할 때는 이탈 경고를 띄우지 않는다
            root.addEventListener('submit', function (e) {
                if (e.target.closest && e.target.closest('.triplepopup-edit')) floatBar.setAttribute('data-state', 'saving');
            }, true);
            floatBar.addEventListener('click', function (e) {
                var btn = e.target.closest ? e.target.closest('.triplepopup-float-btn') : null;
                if (!btn) return;
                if (btn.classList.contains('triplepopup-float-save')) floatSave();
                else if (btn.classList.contains('triplepopup-float-top')) window.scrollTo({ top: 0, behavior: 'smooth' });
                else if (btn.classList.contains('triplepopup-float-preview') && typeof window.triplepopupOpen === 'function') {
                    window.triplepopupOpen(previewOpts());
                }
            });
            window.addEventListener('beforeunload', function (e) {
                if (floatBar.getAttribute('data-state') !== 'dirty') return;
                e.preventDefault();
                e.returnValue = '';
            });
            setTimeout(function () { floatBase = floatFields(); floatRefresh(); }, 0);
        }
        /* ---------- 배너 종류(이미지/유튜브) ---------- */
        function youtubeId(url) {
            var m = String(url || '').trim().match(/^https?:\/\/(?:[a-z0-9-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/i);
            return m ? m[1] : '';
        }

        function ytPlayerSrc(form, id) {
            function on(name) { var el = form.querySelector('input[name="' + name + '"]'); return !!(el && el.checked); }
            var startEl = form.querySelector('input[name="yt_start"]');
            var start = startEl ? Math.max(0, parseInt(startEl.value, 10) || 0) : 0;
            var q = ['playsinline=1', 'rel=0', 'mute=1', 'autoplay=' + (on('yt_autoplay') ? 1 : 0), 'controls=' + (on('yt_controls') ? 1 : 0)];
            if (on('yt_loop')) { q.push('loop=1'); q.push('playlist=' + id); }
            if (start > 0) q.push('start=' + start);
            return 'https://www.youtube.com/embed/' + id + '?' + q.join('&');
        }

        function syncYtPreview(form, yt, id, shorts) {
            var box   = yt.querySelector('.triplepopup-pv-ytbox');
            var frame = yt.querySelector('.triplepopup-pv-ytframe');
            if (!box || !frame) return;

            var visible = !yt.hidden && form.offsetParent !== null;
            var w = yt.clientWidth, h = yt.clientHeight;
            if (visible && w && h) {
                var vr = shorts ? (9 / 16) : (16 / 9);
                var cover = form.querySelector('input[name="yt_cover"]');
                var wide = (w / h) > vr;
                var fill = !!(cover && cover.checked);
                var bw = (wide === fill) ? w : h * vr;
                box.style.aspectRatio = 'auto';
                box.style.width  = Math.ceil(bw) + 'px';
                box.style.height = Math.ceil(bw / vr) + 'px';
            }

            var src = (visible && id) ? ytPlayerSrc(form, id) : '';
            if (frame.getAttribute('data-src') === src) return;
            frame.setAttribute('data-src', src);
            clearTimeout(frame._tpTimer);
            if (!src) { frame.innerHTML = ''; return; }
            frame._tpTimer = setTimeout(function () {
                if (frame.getAttribute('data-src') !== src) return;
                frame.innerHTML = '';
                var el = document.createElement('iframe');
                el.title = '유튜브 미리보기';
                el.setAttribute('frameborder', '0');
                el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                el.src = src;
                frame.appendChild(el);
            }, 400);
        }

        function syncAllMedia() {
            var forms = root.querySelectorAll('.triplepopup-edit form');
            for (var i = 0; i < forms.length; i++) updateMedia(forms[i]);
        }

        function updateMedia(form) {
            var on = form.querySelector('input[name="media_type"]:checked');
            var type = on ? on.value : 'image';
            var blocks = form.querySelectorAll('[data-media]');
            for (var i = 0; i < blocks.length; i++) blocks[i].hidden = blocks[i].getAttribute('data-media') !== type;

            var auto = form.querySelector('input[name="yt_autoplay"]');
            var mute = form.querySelector('input[name="yt_mute"]');
            if (auto && mute) {
                if (auto.checked) mute.checked = true;
                var box = mute.closest ? mute.closest('.triplepopup-opt') : null;
                if (box) box.classList.toggle('triplepopup-is-locked', auto.checked);
            }

            var url = form.querySelector('input[name="youtube_url"]');
            var id = url ? youtubeId(url.value) : '';
            var status = form.querySelector('.triplepopup-yt-status');
            if (status) {
                var has = url && url.value.trim() !== '';
                status.textContent = !has ? '' : (id ? '영상 주소를 확인했습니다.' : '유튜브 주소 형식이 아닙니다.');
                status.classList.toggle('triplepopup-is-ok', !!id);
                status.classList.toggle('triplepopup-is-bad', has && !id);
            }

            var card = form.querySelector('.triplepopup-preview-card');
            if (!card) return;
            var yt = card.querySelector('.triplepopup-pv-yt');
            var img = card.querySelector('.triplepopup-pv-img');
            var noimg = card.querySelector('.triplepopup-pv-noimg');
            var over = card.querySelector('.triplepopup-pv-overlay');
            if (yt) {
                yt.hidden = type !== 'youtube';
                syncYtPreview(form, yt, type === 'youtube' ? id : '', !!(url && /\/shorts\//i.test(url.value)));
            }
            if (type === 'youtube') {
                if (img) img.hidden = true;
                if (noimg) noimg.hidden = true;
                if (over) over.hidden = true;
            } else {
                var hasImg = !!(img && img.getAttribute('src'));
                if (img) img.hidden = !hasImg;
                if (noimg) noimg.hidden = hasImg;
            }
        }

        /* ---------- 게시글 보기 화면 숨김 시 카테고리 영역 토글 ---------- */
        function updateCategoryVisibility(form) {
            if (!form) return;
            var chk = form.querySelector('input[name="hide_on_document"]');
            var field = form.querySelector('.triplepopup-category-field');
            if (!field) return;
            field.hidden = !!(chk && chk.checked);
        }

        function syncAllCategoryVisibility() {
            var forms = root.querySelectorAll('.triplepopup-edit form');
            for (var i = 0; i < forms.length; i++) updateCategoryVisibility(forms[i]);
        }

        root.addEventListener('change', function (e) {
            if (e.target && e.target.name === 'hide_on_document') {
                var form = e.target.form || (e.target.closest && e.target.closest('form'));
                updateCategoryVisibility(form);
            }
        });
        syncAllCategoryVisibility();

        refreshRatio();

        /* ---------- 텍스트 본문 에디터 (라이믹스 에디터 모듈 — 에디터 컴포넌트 지원) ---------- */
        // 에디터 내용이 바뀌면 숨겨진 html_content 값을 갱신하고 미리보기에 알린다
        function hookEditors() {
            CKEDITOR.on('instanceReady', function (evt) {
                var seq = evt.editor.config.xe_editor_sequence;
                var rel = window.editorRelKeys && window.editorRelKeys[seq];
                var ta  = rel && rel.content;
                if (!ta) return;
                function fire() {
                    ta.value = evt.editor.getData();
                    if (ta.form && ta.form.__tpHtmlSync) ta.form.__tpHtmlSync();
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
                evt.editor.on('change', fire);
                evt.editor.on('mode', fire);
            });
        }
        (function waitCke(tries) {
            if (window.CKEDITOR && CKEDITOR.on) { hookEditors(); return; }
            if (tries > 50) return;
            setTimeout(function () { waitCke(tries + 1); }, 100);
        })(0);

        // 저장 직전에 에디터 내용을 한 번 더 폼 필드에 반영 (소스 편집 직후 저장 등)
        root.addEventListener('submit', function (e) {
            var rel = window.editorRelKeys || {};
            for (var k in rel) {
                if (!rel[k] || !rel[k].content || !e.target.contains(rel[k].content)) continue;
                try { rel[k].content.value = rel[k].func(k); } catch (err) {}
            }
            if (e.target.__tpHtmlSync) e.target.__tpHtmlSync();
        }, true);

        /* ---------- 텍스트 본문 언어별 탭 (에디터 1개를 언어별 내용으로 바꿔 가며 편집) ---------- */
        var htmlTabWraps = root.querySelectorAll('.triplepopup-htmltabs');
        for (var hw = 0; hw < htmlTabWraps.length; hw++) {
            (function (wrap) {
                var form  = wrap.closest('form');
                var store = form.querySelector('input[name="html_contents"]');
                var ta    = form.querySelector('textarea[name="html_content"]');
                var tabs  = wrap.querySelectorAll('.triplepopup-htmltab');
                var data  = {};
                var cur   = '_default';
                try { data = JSON.parse(store.value) || {}; } catch (err) { data = {}; }

                function getInstance() {
                    var rel = window.editorRelKeys || {};
                    for (var k in rel) {
                        if (rel[k] && rel[k].content && form.contains(rel[k].content) && typeof window._getCkeInstance === 'function') {
                            return window._getCkeInstance(k) || null;
                        }
                    }
                    return null;
                }

                // 지금 편집 중인 내용을 저장 대상(JSON)에 반영
                form.__tpHtmlSync = function () {
                    var inst = getInstance();
                    data[cur] = (inst && inst.getData) ? inst.getData() : ta.value;
                    store.value = JSON.stringify(data);
                    for (var i = 0; i < tabs.length; i++) {
                        tabs[i].classList.toggle('triplepopup-has-img', !!(data[tabs[i].getAttribute('data-lang')] || '').trim());
                    }
                };
                form.__tpHtmlSync();

                wrap.addEventListener('click', function (e) {
                    var tab  = e.target.closest ? e.target.closest('.triplepopup-htmltab') : null;
                    var inst = getInstance();
                    if (!tab || !inst || !inst.setData) return;
                    var code = tab.getAttribute('data-lang');
                    if (code === cur) return;
                    form.__tpHtmlSync();
                    cur = code;
                    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('triplepopup-is-active', tabs[i] === tab);
                    inst.setData(data[code] || '', function () {
                        ta.value = inst.getData();
                        ta.dispatchEvent(new Event('input', { bubbles: true })); // 미리보기 갱신
                    });
                });
            })(htmlTabWraps[hw]);
        }

        /* ---------- 언어별 이미지 탭 ---------- */
        function setPreviewImage(form, src) {
            var card = form.querySelector('.triplepopup-preview-card');
            if (!card) return;
            var img = card.querySelector('.triplepopup-pv-img');
            var noimg = card.querySelector('.triplepopup-pv-noimg');
            if (!img) return;
            if (!img.hasAttribute('data-default-src')) img.setAttribute('data-default-src', img.getAttribute('src') || '');
            src = src || img.getAttribute('data-default-src');
            if (src) { img.src = src; img.hidden = false; if (noimg) noimg.hidden = true; }
            else { img.hidden = true; if (noimg) noimg.hidden = false; }
            updatePreview(form);
            updateMedia(form);
        }

        var langWraps = root.querySelectorAll('.triplepopup-langimg');
        for (var w = 0; w < langWraps.length; w++) {
            (function (wrap) {
                var form = wrap.closest('form');
                var tabs = wrap.querySelectorAll('.triplepopup-langimg-tab');
                var panes = wrap.querySelectorAll('.triplepopup-langimg-pane');

                function paneSrc(pane) {
                    var del = pane.querySelector('input[type="checkbox"]');
                    if (del && del.checked) return '';
                    return pane.getAttribute('data-preview') || pane.getAttribute('data-image') || '';
                }
                function show(code) {
                    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('triplepopup-is-active', tabs[i].getAttribute('data-lang') === code);
                    for (var k = 0; k < panes.length; k++) {
                        var on = panes[k].getAttribute('data-lang') === code;
                        panes[k].hidden = !on;
                        if (on) setPreviewImage(form, paneSrc(panes[k]));
                    }
                }
                wrap.addEventListener('click', function (e) {
                    var tab = e.target.closest ? e.target.closest('.triplepopup-langimg-tab') : null;
                    if (tab) show(tab.getAttribute('data-lang'));
                });
                wrap.addEventListener('change', function (e) {
                    var pane = e.target.closest ? e.target.closest('.triplepopup-langimg-pane') : null;
                    if (!pane) return;
                    if (e.target.type === 'file') {
                        var file = e.target.files && e.target.files[0];
                        if (!file) return;
                        var reader = new FileReader();
                        reader.onload = function (ev) {
                            pane.setAttribute('data-preview', ev.target.result);
                            var thumb = pane.querySelector('.triplepopup-langimg-thumb');
                            if (thumb) thumb.innerHTML = '<img src="' + ev.target.result + '" alt="" />';
                            setPreviewImage(form, ev.target.result);
                        };
                        reader.readAsDataURL(file);
                    } else if (e.target.type === 'checkbox') {
                        setPreviewImage(form, paneSrc(pane));
                    }
                });
                if (tabs.length) show(tabs[0].getAttribute('data-lang'));
            })(langWraps[w]);
        }

        function updateAllPreviews() {
            for (var q = 0; q < pvForms.length; q++) updatePreview(pvForms[q]);
        }

        // 라이믹스 다국어 UI 이벤트 연동 (다국어 선택 · 비동기 값 로드)
        if (window.jQuery) {
            jQuery(root).on('selected.g11n', function () { setTimeout(updateAllPreviews, 0); });
            jQuery(document).ajaxComplete(function () { setTimeout(updateAllPreviews, 0); });
        }

        /* ---------- 동작 모듈설정 (노출 대상 다중선택) ---------- */
        (function () {
            var wrap = root.querySelector('.triplepopup-modules');
            if (!wrap) return;

            var allBtn  = root.querySelector('.triplepopup-modules-all');
            var countEl = root.querySelector('.triplepopup-modcount-num');

            function boxes() { return wrap.querySelectorAll('input[type="checkbox"]'); }

            function refresh() {
                var list = boxes(), total = list.length, checked = 0;
                for (var i = 0; i < total; i++) {
                    var on = list[i].checked;
                    if (on) checked++;
                    var item = list[i].closest('.triplepopup-module-item');
                    if (item) item.classList.toggle('triplepopup-is-checked', on);
                }
                if (countEl) countEl.textContent = checked;
                if (allBtn) {
                    var allOn = (total > 0 && checked === total);
                    allBtn.textContent = allOn ? '전체 해제' : '전체 선택';
                    allBtn.classList.toggle('triplepopup-is-active', allOn);
                }
            }

            if (allBtn) {
                allBtn.addEventListener('click', function () {
                    var list = boxes(), total = list.length, checked = 0;
                    for (var i = 0; i < total; i++) { if (list[i].checked) checked++; }
                    var turnOn = !(total > 0 && checked === total); // 전부 선택돼 있으면 해제, 아니면 전체 선택
                    for (var j = 0; j < total; j++) list[j].checked = turnOn;
                    refresh();
                });
            }

            // 정렬 기준 변경 → 목록을 즉시 재정렬 (메인 모듈은 항상 맨 앞, 서버 정렬 규칙과 동일)
            var sortSel = root.querySelector('.triplepopup-modsort-select');
            if (sortSel) {
                sortSel.addEventListener('change', function () {
                    var key   = sortSel.value;
                    var items = Array.prototype.slice.call(wrap.querySelectorAll('.triplepopup-module-item'));
                    items.sort(function (a, b) {
                        var am = a.classList.contains('triplepopup-is-main'), bm = b.classList.contains('triplepopup-is-main');
                        if (am !== bm) return am ? -1 : 1;
                        if (key === 'created') return (parseInt(a.getAttribute('data-srl'), 10) || 0) - (parseInt(b.getAttribute('data-srl'), 10) || 0);
                        var av = (a.getAttribute(key === 'mid' ? 'data-mid' : 'data-title') || '').toLowerCase();
                        var bv = (b.getAttribute(key === 'mid' ? 'data-mid' : 'data-title') || '').toLowerCase();
                        return av < bv ? -1 : (av > bv ? 1 : 0);
                    });
                    for (var k = 0; k < items.length; k++) wrap.appendChild(items[k]);
                });
            }

            // 카드(라벨) 클릭 → 내부 체크박스 토글 → change 발생
            wrap.addEventListener('change', function (e) {
                if (e.target && e.target.type === 'checkbox') refresh();
            });

            refresh();
        }());

        /* ---------- 배너 노출 회원그룹 (선택 카드 표시) ---------- */
        root.addEventListener('change', function (e) {
            var t = e.target;
            if (!t || !t.classList || !t.classList.contains('triplepopup-group-input')) return;
            var item = t.closest('.triplepopup-group-item');
            if (item) item.classList.toggle('triplepopup-is-checked', t.checked);
        });

        /* ---------- 숫자 입력 증감 버튼 (▲▼) ---------- */
        Array.prototype.forEach.call(root.querySelectorAll('input.triplepopup-input-spin'), function (input) {
            var svg = function (pts) {
                return '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="' + pts + '"></polyline></svg>';
            };
            var box = document.createElement('span');
            box.className = 'triplepopup-spin';
            box.innerHTML = '<button type="button" class="triplepopup-spin-btn" data-dir="1" tabindex="-1" aria-label="증가">' + svg('2 7 5 3 8 7') + '</button>' +
                            '<button type="button" class="triplepopup-spin-btn" data-dir="-1" tabindex="-1" aria-label="감소">' + svg('2 3 5 7 8 3') + '</button>';
            input.parentNode.insertBefore(box, input.nextSibling);

            box.addEventListener('click', function (e) {
                var btn = e.target.closest ? e.target.closest('.triplepopup-spin-btn') : null;
                if (!btn) return;
                var min = parseInt(input.min, 10), max = parseInt(input.max, 10);
                var v = parseInt(input.value, 10);
                v = isNaN(v) ? (isNaN(min) ? 0 : min) : v + parseInt(btn.getAttribute('data-dir'), 10);
                if (!isNaN(min) && v < min) v = min;
                if (!isNaN(max) && v > max) v = max;
                input.value = v;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });

        /* ---------- 드래그 순서 변경 ---------- */
        /* ---------- 모듈 번호 클릭 시 복사 (카드 선택은 바뀌지 않음) ---------- */
        root.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('.triplepopup-module-srl') : null;
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            var srl = btn.getAttribute('data-srl') || '';
            var label = btn.getAttribute('data-label') || btn.textContent;
            btn.setAttribute('data-label', label);

            function done(ok) {
                btn.textContent = ok ? '복사됨 ' + srl : '복사하지 못했습니다';
                btn.classList.toggle('triplepopup-is-copied', ok);
                clearTimeout(btn._tpTimer);
                btn._tpTimer = setTimeout(function () {
                    btn.textContent = label;
                    btn.classList.remove('triplepopup-is-copied');
                }, 1400);
            }
            function fallback() {
                var ta = document.createElement('textarea');
                ta.value = srl;
                ta.setAttribute('readonly', 'readonly');
                ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
                document.body.appendChild(ta);
                ta.select();
                var ok = false;
                try { ok = document.execCommand('copy'); } catch (err) {}
                document.body.removeChild(ta);
                done(ok);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(srl).then(function () { done(true); }, fallback);
            } else {
                fallback();
            }
        });

        var table = root.querySelector('.triplepopup-table');
        if (!table) return;
        var orderUrl = table.getAttribute('data-order-url') || '';
        var dragging = null;

        function groups() { return table.querySelectorAll('.triplepopup-tbody-group'); }

        function renumber() {
            var gs = groups();
            for (var i = 0; i < gs.length; i++) {
                var no = gs[i].querySelector('.triplepopup-order-no');
                if (no) no.textContent = i + 1;
                var en = gs[i].querySelector('.triplepopup-edit-no');
                if (en) en.textContent = i + 1;
            }
        }

        function currentOrder() {
            var gs = groups(), arr = [];
            for (var i = 0; i < gs.length; i++) {
                arr.push(gs[i].getAttribute('data-slot'));
            }
            return arr.join(',');
        }

        function saveOrder() {
            if (!orderUrl) return;
            var fd = new FormData();
            fd.append('order', currentOrder());
            fetch(orderUrl, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: fd,
                credentials: 'same-origin'
            }).catch(function () {});
        }

        table.addEventListener('dragstart', function (e) {
            var handle = e.target.closest ? e.target.closest('.triplepopup-drag') : null;
            if (!handle) { e.preventDefault(); return; }
            dragging = handle.closest('.triplepopup-tbody-group');
            if (!dragging) return;
            closeAll(null); // 편집 영역은 접고 드래그
            dragging.classList.add('triplepopup-dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', dragging.getAttribute('data-slot')); } catch (err) {}
            }
        });

        table.addEventListener('dragover', function (e) {
            if (!dragging) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            var target = e.target.closest ? e.target.closest('.triplepopup-tbody-group') : null;
            if (!target || target === dragging) return;
            var rect = target.getBoundingClientRect();
            var before = (e.clientY - rect.top) < (rect.height / 2);
            if (before) {
                table.insertBefore(dragging, target);
            } else {
                table.insertBefore(dragging, target.nextSibling);
            }
        });

        table.addEventListener('drop', function (e) {
            if (dragging) e.preventDefault();
        });

        table.addEventListener('dragend', function () {
            if (!dragging) return;
            dragging.classList.remove('triplepopup-dragging');
            dragging = null;
            renumber();
            saveOrder();
        });
    });
}());
