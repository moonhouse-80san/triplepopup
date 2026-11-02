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
            var input  = field ? field.querySelector('input[type="color"][name="' + target + '"]') : null;
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
            var input   = field ? field.querySelector('input[type="color"][name="' + target + '"]') : null;
            if (input) {
                input.value = chip.getAttribute('data-color');
                try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (err) {}
            }
            syncChips(presets);
        });

        // 네이티브 피커로 직접 바꿨을 때도 칩 선택 상태 갱신
        root.addEventListener('input', function (e) {
            if (e.target && e.target.type === 'color') {
                var field   = e.target.closest ? e.target.closest('.triplepopup-field') : null;
                var presets = field ? field.querySelector('.triplepopup-presets') : null;
                if (presets) syncChips(presets);
            }
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
            var transOut  = form.querySelector('.triplepopup-range-out');
            if (transOut) transOut.textContent = htmlTrans + '%';
            var hx = htmlBg.replace('#', '');
            if (hx.length === 3) hx = hx.charAt(0) + hx.charAt(0) + hx.charAt(1) + hx.charAt(1) + hx.charAt(2) + hx.charAt(2);
            card.style.background = /^[0-9a-fA-F]{6}$/.test(hx)
                ? 'rgba(' + parseInt(hx.substr(0, 2), 16) + ',' + parseInt(hx.substr(2, 2), 16) + ',' + parseInt(hx.substr(4, 2), 16) + ',' + (1 - htmlTrans / 100) + ')'
                : '#ffffff';

            // 이미지·머리말·타이틀 없이 글만 있으면 실제 팝업처럼 이미지 영역 없이 텍스트 카드로 표시
            var pvImg  = card.querySelector('.triplepopup-pv-img');
            var hasImg = !!(pvImg && !pvImg.hidden && pvImg.getAttribute('src'));
            card.classList.toggle('triplepopup-pv-textonly', !!htmlVal && !htmlOv && !hasImg && !badge.trim() && !title.trim() && !sub.trim());

            if (elBadge) {
                if (badge.trim()) { elBadge.textContent = badge; elBadge.style.background = badgeBg; elBadge.style.color = badgeFg; elBadge.hidden = false; }
                else { elBadge.hidden = true; }
            }
            if (elFooter) {
                if (footer.trim()) { elFooter.textContent = footer; elFooter.style.background = footerBg; elFooter.style.color = footerFg; elFooter.hidden = false; }
                else { elFooter.hidden = true; }
            }
        }

        function applyPreviewRatio(card, w, h) {
            if (!card || !w || !h) return;
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
                form.addEventListener('input', function () { updatePreview(form); });
                form.addEventListener('change', function () { updatePreview(form); });
                // 다국어 해제(×) 버튼 클릭 후 반영
                form.addEventListener('click', function (e) {
                    if (e.target && e.target.closest && e.target.closest('.g11n')) {
                        setTimeout(function () { updatePreview(form); }, 0);
                    }
                });
            })(pvForms[p]);
        }

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
        }, true);

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
