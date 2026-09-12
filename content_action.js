// 说明：为避免污染知乎页面样式/DOM，这里使用扩展自有的 DOM 结构与 CSS 前缀（zhmag-）。
(function() {
    'use strict';

    var AVATAR_SELECTOR = '.avatar img, img.avatar, img.Avatar, img.zm-item-img-avatar, img.zm-list-avatar, img.zm-item-img-avatar50, img.Avatar-hemingway';
    var HIDE_DELAY = 500;
    var LONG_PRESS_DELAY = 500;
    var LONG_PRESS_MOVE_TOLERANCE = 10;

    var imgUrl = '';
    var btnHideTimer = null;
    var activeAvatar = null;
    var btnWidth = 0;
    var suppressNextClick = false;
    var pressTimer = null;
    var pressStart = null;

    var mask = createElement('<div id="zhmag-mask" class="zhmag-mask" aria-hidden="true"></div>');
    var modal = createElement([
        '<div id="zhmag-modal" class="zhmag-modal" role="dialog" aria-modal="true" aria-hidden="true">',
        '  <div class="zhmag-modal-inner" role="document">',
        '    <button type="button" class="zhmag-close" aria-label="Close">×</button>',
        '    <div class="zhmag-status" aria-live="polite">图片加载中...</div>',
        '    <img class="zhmag-img" alt="avatar">',
        '    <div class="zhmag-footer">',
        '      <a class="zhmag-origin" target="_blank" rel="noreferrer noopener">查看原图</a>',
        '    </div>',
        '  </div>',
        '</div>'
    ].join(''));
    var btn = createElement([
        '<div id="zhmag-btn" class="zhmag-btn">',
        '  <button type="button" class="zhmag-btn-inner">点击放大</button>',
        '</div>'
    ].join(''));
    var styleTag = createElement(['<style id="zhmag-style">',
        '.zhmag-mask{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483646;display:none;}',
        '.zhmag-modal{position:fixed;inset:0;display:none;align-items:flex-start;justify-content:center;overflow:auto;z-index:2147483647;padding:60px 16px 40px;}',
        '.zhmag-modal-inner{position:relative;max-width:min(96vw,1100px);margin:0 auto;background:transparent;}',
        '.zhmag-img{display:none;max-width:96vw;max-height:calc(100vh - 160px);height:auto;margin:0 auto;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.35);background:#fff;}',
        '.zhmag-status{min-width:180px;margin:40px auto 0;padding:12px 16px;border-radius:8px;background:#fff;color:#1f2328;font-size:14px;line-height:1.4;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.22);}',
        '.zhmag-footer{text-align:center;margin:16px 0 0;display:none;}',
        '.zhmag-origin{display:inline-block;padding:10px 14px;border-radius:10px;background:#1677ff;color:#fff;text-decoration:none;font-size:14px;line-height:1;}',
        '.zhmag-origin:hover{filter:brightness(.95);}',
        '.zhmag-close{position:absolute;top:-10px;right:-10px;width:36px;height:36px;border-radius:18px;border:none;cursor:pointer;background:rgba(0,0,0,.6);color:#fff;font-size:22px;line-height:36px;}',
        // 214748364x keeps the extension UI above Zhihu page chrome without exceeding CSS integer limits.
        '.zhmag-btn{position:absolute;z-index:2147483645;display:none;}',
        '.zhmag-btn-inner{cursor:pointer;border:none;border-radius:10px;padding:8px 12px;background:#1677ff;color:#fff;font-size:13px;line-height:1;box-shadow:0 8px 20px rgba(0,0,0,.18);}',
        '.zhmag-btn-inner:hover{filter:brightness(.95);}',
    '</style>'].join(''));

    var modalInner = modal.querySelector('.zhmag-modal-inner');
    var img = modal.querySelector('.zhmag-img');
    var link = modal.querySelector('.zhmag-origin');
    var closeBtn = modal.querySelector('.zhmag-close');
    var status = modal.querySelector('.zhmag-status');
    var footer = modal.querySelector('.zhmag-footer');

    document.head.appendChild(styleTag);
    document.body.appendChild(mask);
    document.body.appendChild(modal);
    document.body.appendChild(btn);

    function createElement(html) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = html.trim();
        return wrapper.firstElementChild;
    }

    function show(element) {
        element.style.display = element.classList.contains('zhmag-modal') ? 'flex' : 'block';
    }

    function hide(element) {
        element.style.display = 'none';
    }

    function openModal(url) {
        if (!url) return;

        status.textContent = '图片加载中...';
        show(status);
        hide(img);
        hide(footer);

        link.href = url;
        img.src = url;
        if (img.complete) {
            if (img.naturalWidth > 0) {
                showLoadedImage();
            } else {
                showImageError();
            }
        }

        hide(btn);
        show(mask);
        mask.setAttribute('aria-hidden', 'false');
        show(modal);
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        hide(mask);
        mask.setAttribute('aria-hidden', 'true');
        hide(modal);
        modal.setAttribute('aria-hidden', 'true');
        img.removeAttribute('src');
        hide(status);
        hide(img);
        hide(footer);
    }

    function getAvatarSource(image) {
        var src = image.getAttribute('data-original') || image.getAttribute('data-src') || '';
        var srcset = image.getAttribute('srcset') || '';

        if (!src && srcset) {
            src = parseBestSrcsetCandidate(srcset);
        }

        return src || image.currentSrc || image.src || '';
    }

    function parseBestSrcsetCandidate(srcset) {
        var candidates = srcset.split(',').map(function(part) {
            var bits = part.trim().split(/\s+/);
            var descriptor = (bits[1] || '').match(/^([\d.]+)(w|x)$/i);

            return {
                url: bits[0] || '',
                value: descriptor ? parseFloat(descriptor[1]) : 0,
                unit: descriptor ? descriptor[2].toLowerCase() : ''
            };
        }).filter(function(candidate) {
            return candidate.url;
        });

        if (!candidates.length) return '';

        var pickUnit = function(unit) {
            return candidates.filter(function(candidate) {
                return candidate.unit === unit;
            });
        };
        // w 描述符优先于 x（同一 srcset 里两者互斥）；都没有描述符时退回最后一项。
        var widths = pickUnit('w');
        var densities = pickUnit('x');
        var pool = widths.length ? widths : (densities.length ? densities : candidates);

        return pool.reduce(function(best, candidate) {
            return candidate.value >= best.value ? candidate : best;
        }).url;
    }

    function getOriginalAvatarUrl(src) {
        if (!src) return '';

        try {
            var url = new URL(src, window.location.href);

            // 只剥离知乎已知的尺寸标记，避免把 avatar_2023.jpg 这类真实文件名也削掉。
            url.pathname = url.pathname
                .replace(/_(?:hd|xll|xl|xs|b|l|m|s)(?=\.[a-z0-9]{3,5}$)/i, '');

            return url.href;
        } catch (e) {
            return src.replace(/_(?:hd|xll|xl|xs|b|l|m|s)\.(?=[a-z0-9]{3,5}(?:\?|$))/i, '.');
        }
    }

    function positionButton(image) {
        var rect = image.getBoundingClientRect();
        show(btn);

        // 按钮尺寸固定，首次测量后缓存，避免每次 hover 读 offsetWidth 触发强制重排。
        if (!btnWidth) btnWidth = btn.offsetWidth;

        var left = window.scrollX + rect.left + (rect.width - btnWidth) / 2;
        var top = window.scrollY + rect.bottom + 5;

        btn.style.left = Math.max(window.scrollX, left) + 'px';
        btn.style.top = top + 'px';
    }

    function prepareAvatar(image) {
        var src = getAvatarSource(image);
        if (!src) return false;

        imgUrl = getOriginalAvatarUrl(src) || src;
        activeAvatar = image;
        positionButton(image);
        return true;
    }

    function scheduleButtonHide() {
        if (btnHideTimer !== null) return;

        btnHideTimer = window.setTimeout(function() {
            hide(btn);
            btnHideTimer = null;
        }, HIDE_DELAY);
    }

    function clearButtonHideTimer() {
        if (!btnHideTimer) return;

        window.clearTimeout(btnHideTimer);
        btnHideTimer = null;
    }

    function closestAvatar(target) {
        if (!target || target.nodeType !== Node.ELEMENT_NODE) return null;
        // AVATAR_SELECTOR 各项都以 img 结尾，且 img 是空元素（无子节点），
        // 所以非 IMG 的 target 不可能命中，可省掉整趟 closest() 祖先遍历。
        if (target.tagName !== 'IMG') return null;

        return target.closest(AVATAR_SELECTOR);
    }

    function clearPressTimer() {
        if (pressTimer === null) return;

        window.clearTimeout(pressTimer);
        pressTimer = null;
        pressStart = null;
    }

    function startLongPress(image, event) {
        pressStart = { x: event.clientX, y: event.clientY };
        pressTimer = window.setTimeout(function() {
            pressTimer = null;
            pressStart = null;
            if (!document.contains(image) || !prepareAvatar(image)) return;

            suppressNextClick = true;
            openModal(imgUrl);
        }, LONG_PRESS_DELAY);
    }

    function showLoadedImage() {
        hide(status);
        show(img);
        show(footer);
    }

    function showImageError() {
        // closeModal 移除 src 可能异步派发一次 error，忽略它以免误标下一次打开的图片。
        if (!img.getAttribute('src')) return;

        hide(img);
        hide(footer);
        show(status);
        status.textContent = '图片加载失败';
    }

    document.addEventListener('pointerdown', function(event) {
        // 每次按下都重置，避免上一次长按遗留的抑制标记吃掉无关点击。
        suppressNextClick = false;
        clearPressTimer();

        // 只有没有 hover 的指针走长按；鼠标仍然用悬停按钮。
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

        var image = closestAvatar(event.target);
        if (image) startLongPress(image, event);
    }, true);

    document.addEventListener('pointermove', function(event) {
        if (pressTimer === null || !pressStart) return;

        if (Math.abs(event.clientX - pressStart.x) > LONG_PRESS_MOVE_TOLERANCE ||
            Math.abs(event.clientY - pressStart.y) > LONG_PRESS_MOVE_TOLERANCE) {
            clearPressTimer();
        }
    }, { capture: true, passive: true });

    document.addEventListener('pointerup', clearPressTimer, true);
    document.addEventListener('pointercancel', clearPressTimer, true);

    document.addEventListener('mouseover', function(event) {
        var image = closestAvatar(event.target);
        if (!image || !document.contains(image)) return;

        clearButtonHideTimer();
        prepareAvatar(image);
    });

    document.addEventListener('mouseout', function(event) {
        var image = closestAvatar(event.target);
        if (!image || !document.contains(image)) return;
        if (event.relatedTarget && image.contains(event.relatedTarget)) return;

        scheduleButtonHide();
    });

    document.addEventListener('click', function(event) {
        // 长按松手后浏览器仍会派发一次 click，这里把它彻底吞掉：既阻止跳转，
        // 也避免遮罩或弹层把它当成一次关闭操作。
        if (suppressNextClick) {
            suppressNextClick = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        // 触摸点按会合成 mouseover 弹出悬停按钮，点按结束后要收起它。
        hide(btn);
    }, true);

    btn.addEventListener('click', function() {
        openModal(imgUrl);
    });

    btn.addEventListener('mouseout', function(event) {
        if (event.relatedTarget && btn.contains(event.relatedTarget)) return;

        hide(btn);
    });

    btn.addEventListener('mouseover', clearButtonHideTimer);

    img.addEventListener('load', showLoadedImage);

    img.addEventListener('error', showImageError);

    mask.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', function(event) {
        event.preventDefault();
        closeModal();
    });
    modal.addEventListener('click', closeModal);
    modalInner.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    link.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    document.addEventListener('keydown', function(event) {
        if ((event.key === 'Escape' || event.keyCode === 27) && modal.style.display !== 'none') {
            closeModal();
        }
    });

    window.addEventListener('scroll', function() {
        hide(btn);
    }, { passive: true });
    window.addEventListener('resize', function() {
        if (activeAvatar && btn.style.display !== 'none') {
            positionButton(activeAvatar);
        }
    });
})();
