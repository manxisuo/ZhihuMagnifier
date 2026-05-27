// 说明：为避免污染知乎页面样式/DOM，这里使用扩展自有的 DOM 结构与 CSS 前缀（zhmag-）。

// 遮罩层
var maskTpl = '<div id="zhmag-mask" class="zhmag-mask" aria-hidden="true"></div>';

// 图片弹窗
var winTpl = [
    '<div id="zhmag-modal" class="zhmag-modal" role="dialog" aria-modal="true" aria-hidden="true">',
    '  <div class="zhmag-modal-inner" role="document">',
    '    <button type="button" class="zhmag-close" aria-label="Close">×</button>',
    '    <img class="zhmag-img" src="" alt="avatar">',
    '    <div class="zhmag-footer">',
    '      <a class="zhmag-origin" href="" target="_blank" rel="noreferrer noopener">查看原图</a>',
    '    </div>',
    '  </div>',
    '</div>'
].join('');

// “点击放大”按钮
var btnTpl = [
    '<div id="zhmag-btn" class="zhmag-btn">',
    '  <button type="button" class="zhmag-btn-inner">点击放大</button>',
    '</div>'
].join('');

var body = $(document.body);
var mask = $(maskTpl).hide().appendTo(body); // 创建蒙板
var win = $(winTpl).hide().appendTo(body); // 创建图片弹窗
var modalInner = win.find('.zhmag-modal-inner');
var img = win.find('.zhmag-img'); // 选择图片元素
var link = win.find('.zhmag-origin'); // 选择原图链接元素
var closeBtn = win.find('.zhmag-close');

// 待弹出的图片的原始图片的URL
var imgUrl = '';

// 创建"点击放大"按钮
var btn = $(btnTpl).hide().appendTo(body);
var btnHideTimer = null;

// 注入扩展自有样式（限定在 zhmag- 前缀，避免影响页面）
var styleTag = $(['<style id="zhmag-style">',
    '.zhmag-mask{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483646;}',
    '.zhmag-modal{position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:center;overflow:auto;z-index:2147483647;padding:60px 16px 40px;}',
    '.zhmag-modal-inner{position:relative;max-width:min(96vw,1100px);margin:0 auto;background:transparent;}',
    '.zhmag-img{display:block;max-width:96vw;max-height:calc(100vh - 160px);height:auto;margin:0 auto;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.35);background:#fff;}',
    '.zhmag-footer{text-align:center;margin:16px 0 0;}',
    '.zhmag-origin{display:inline-block;padding:10px 14px;border-radius:10px;background:#1677ff;color:#fff;text-decoration:none;font-size:14px;line-height:1;}',
    '.zhmag-origin:hover{filter:brightness(.95);}',
    '.zhmag-close{position:absolute;top:-10px;right:-10px;width:36px;height:36px;border-radius:18px;border:none;cursor:pointer;background:rgba(0,0,0,.6);color:#fff;font-size:22px;line-height:36px;}',
    '.zhmag-btn{position:absolute;z-index:2147483645;}',
    '.zhmag-btn-inner{cursor:pointer;border:none;border-radius:10px;padding:8px 12px;background:#1677ff;color:#fff;font-size:13px;line-height:1;box-shadow:0 8px 20px rgba(0,0,0,.18);}',
    '.zhmag-btn-inner:hover{filter:brightness(.95);}',
'</style>'].join(''));
$('html > head').append(styleTag);

function openModal(url) {
    if (!url) return;
    img.attr('src', '').attr('src', url);
    link.attr('href', url);
    btn.hide();
    mask.show().attr('aria-hidden', 'false');
    win.show().attr('aria-hidden', 'false');
}

function closeModal() {
    mask.hide().attr('aria-hidden', 'true');
    win.hide().attr('aria-hidden', 'true');
    // 可选：清空 src，避免长图占用内存
    img.attr('src', '');
}

(function() {
    var avatarSelector = '.avatar img, img.avatar, img.Avatar, img.zm-item-img-avatar, img.zm-list-avatar, img.zm-item-img-avatar50, img.Avatar-hemingway';
    $(document).on('mouseenter', avatarSelector, function(e) {
        var $img = $(this);
        var offset = $img.offset();

        // 兼容懒加载/响应式：优先取 data-original / data-src / srcset / src
        var src = $img.attr('data-original') || $img.attr('data-src') || '';
        if (!src) {
            var srcset = $img.attr('srcset') || '';
            if (srcset) {
                // 取 srcset 里最后一个（通常分辨率最高）
                var parts = srcset.split(',').map(function(s) { return $.trim(s); }).filter(Boolean);
                if (parts.length) {
                    src = parts[parts.length - 1].split(/\s+/)[0] || '';
                }
            }
        }
        if (!src) src = $img.attr('src') || '';
        if (!src) return;

        // 旧版知乎头像常见为 *_xx.jpg 这类缩略图，尝试还原为原图；失败则回退原链接
        var candidate = src.replace(/_\w{1,10}\.(?=[a-zA-Z]{3,4}(?:\?|$))/i, '.');
        imgUrl = candidate || src;

        // btn 初始是隐藏的，width() 会是 0；这里在 show 后取真实宽度再定位
        btn.show();
        var btnWidth = btn.outerWidth() || btn.width() || 0;
        btn.offset({
            left: offset.left + ($img.width() - btnWidth) / 2,
            top: offset.top + $img.height() + 5
        });
    });

    // 鼠标移出avatarSelector事件的监听函数：使用一个Timer来隐藏"点击放大"按钮
    $(document).on('mouseleave', avatarSelector, function(e) {
        if (btnHideTimer == null) {
            btnHideTimer = setTimeout(function() {
                btn.hide();
                btnHideTimer = null;
            }, 500);
        }
    });
})();

// 鼠标点击"点击放大"按钮事件的监听函数：弹窗显示大图
btn.on('click', function() {
    openModal(imgUrl);
});

// 鼠标移出"点击放大"按钮事件的监听函数：隐藏按钮
btn.on('mouseout', function() {
    btn.hide();
});

// 鼠标移入"点击放大"按钮事件的监听函数：清除隐藏按钮的Timer
btn.on('mouseover', function() {
    if (btnHideTimer) {
        clearTimeout(btnHideTimer);
        btnHideTimer = null;
    }
});

// 关闭弹窗：遮罩点击 / 关闭按钮 / ESC
mask.on('click', closeModal);
closeBtn.on('click', function(e) {
    e.preventDefault();
    closeModal();
});
// 点击弹窗空白处关闭（点击内容不关闭）
win.on('click', closeModal);
modalInner.on('click', function(e) {
    e.stopPropagation();
});
// 点击“查看原图”不触发关闭（只打开新标签）
link.on('click', function(e) {
    e.stopPropagation();
});
$(document).on('keydown', function(e) {
    if ((e.key === 'Escape' || e.keyCode === 27) && win.is(':visible')) {
        closeModal();
    }
});
// 页面滚动/缩放时隐藏浮动按钮，避免定位漂移
$(window).on('scroll resize', function() {
    btn.hide();
});
