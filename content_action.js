// 说明：为避免污染知乎页面样式/DOM，这里使用扩展自有的 DOM 结构与 CSS 前缀（zhmag-）。
(function() {
    'use strict';

    var AVATAR_SELECTOR = '.avatar img, img.avatar, img.Avatar, img.zm-item-img-avatar, img.zm-list-avatar, img.zm-item-img-avatar50, img.Avatar-hemingway';
    var HIDE_DELAY = 500;
    var touchLikeInput = navigator.maxTouchPoints > 0 ||
        (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches);

    var imgUrl = '';
    var btnHideTimer = null;
    var activeAvatar = null;
    var lastPointerType = '';

    var mask = createElement('<div id="zhmag-mask" class="zhmag-mask" aria-hidden="true"></div>');
    var modal = createElement([
        '<div id="zhmag-modal" class="zhmag-modal" role="dialog" aria-modal="true" aria-hidden="true">',
        '  <div class="zhmag-modal-inner" role="document">',
        '    <button type="button" class="zhmag-close" aria-label="Close">×</button>',
        '    <div class="zhmag-status" aria-live="polite">图片加载中...</div>',
        '    <img class="zhmag-img" src="" alt="avatar">',
        '    <div class="zhmag-footer">',
        '      <a class="zhmag-origin" href="" target="_blank" rel="noreferrer noopener">查看原图</a>',
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
        var parts = srcset.split(',').map(function(part) {
            return part.trim();
        }).filter(Boolean);

        if (!parts.length) return '';

        return parts[parts.length - 1].split(/\s+/)[0] || '';
    }

    function getOriginalAvatarUrl(src) {
        if (!src) return '';

        try {
            var url = new URL(src, window.location.href);
            var originalPath = url.pathname
                .replace(/_[a-z0-9]{1,20}(?=\.[a-z0-9]{3,5}$)/i, '')
                .replace(/_(?:hd|xl|l|m|s|xs)(?=\.[a-z0-9]{3,5}$)/i, '');

            url.pathname = originalPath;
            return url.href;
        } catch (e) {
            return src.replace(/_[a-z0-9]{1,20}\.(?=[a-z0-9]{3,5}(?:\?|$))/i, '.');
        }
    }

    function positionButton(image) {
        var rect = image.getBoundingClientRect();
        show(btn);

        var btnWidth = btn.offsetWidth || 0;
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

        return target.closest(AVATAR_SELECTOR);
    }

    function shouldOpenFromAvatarClick() {
        return lastPointerType === 'touch' || lastPointerType === 'pen' ||
            (!lastPointerType && touchLikeInput);
    }

    function showLoadedImage() {
        hide(status);
        show(img);
        show(footer);
    }

    function showImageError() {
        hide(img);
        hide(footer);
        show(status);
        status.textContent = '图片加载失败';
    }

    document.addEventListener('pointerdown', function(event) {
        if (!closestAvatar(event.target)) return;

        lastPointerType = event.pointerType || '';
    }, true);

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
        if (!shouldOpenFromAvatarClick()) return;

        var image = closestAvatar(event.target);
        if (!image || !document.contains(image)) return;
        if (!prepareAvatar(image)) return;

        event.preventDefault();
        event.stopPropagation();
        openModal(imgUrl);
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
    });
    window.addEventListener('resize', function() {
        if (activeAvatar && btn.style.display !== 'none') {
            positionButton(activeAvatar);
        }
    });
})();
