// 格式化字符串的函数
var format = (function() {
    var REG = /\{(\d+)\}/g;
    return function (str) {
        var rArgs = Array.prototype.slice.call(arguments, 1);
        return str.replace(REG, function(a, b) {
            return rArgs[b] || '';
        });
    }
})();

// 蒙板HTML
var maskTpl = '<div class="modal-dialog-bg zm-light-box-background" style="opacity: 0.5; width: 100%; height: 100%;" aria-hidden="true"></div>';

// 图片弹窗HTML
var winTpl = '<div class="modal-dialog zm-light-box zm-light-box-fullscreen-image" tabindex="0" role="dialog" aria-labelledby=":9h"><div class="modal-dialog-title modal-dialog-title-draggable"><span class="modal-dialog-title-text" id=":9h" role="heading"></span><span class="modal-dialog-title-close" role="button" tabindex="0" aria-label="Close"></span></div><div class="modal-dialog-content"><div class="zm-light-box-x1" id="zm-light-box-x1"><div class="zm-light-box-x2" id="zm-light-box-x2" style="margin-top: 80px;"><img src="{0}" class="zm-light-box-img-el"><div class="zm-light-box-footer"><a class="zm-light-box-show-origin" href="{1}" target="_blank">查看原图</a></div></div></div></div><div class="modal-dialog-buttons"><button name="cancel">取消</button><button name="ok" class="goog-buttonset-default">确定</button></div></div>';

// "点击放大"按钮HTML
var btnTpl = '<div style="position: absolute; z-index: 999; padding: 0 !important" class="modal-dialog-buttons"><button name="ok" class="goog-buttonset-default">点击放大</button></div>';

var body = $(document.body);
var mask = $(maskTpl).hide().appendTo(body); // 创建蒙板
var win = $(format(winTpl, '', '')).hide().appendTo(body); // 创建图片弹窗
var img = win.find('.zm-light-box-img-el'); // 选择图片元素
var link = win.find('.zm-light-box-show-origin').css({'color': 'red'}); // 选择原图链接元素

// 待弹出的图片的原始图片的URL
var imgUrl = '';

// 创建"点击放大"按钮
var btn = $(btnTpl).hide().appendTo(body);
var btnWidth = btn.width();

(function() {
    var avatarSelector = '.avatar img, img.avatar, img.zm-item-img-avatar, img.zm-list-avatar, img.zm-item-img-avatar50';
    $(document).on('mouseover', avatarSelector, function(e) {
        var img = $(this);
        var offset = img.offset();

        imgUrl = img.attr('src').replace((/_\w\./), '.');

        btn.show().offset({
            left: offset.left + (img.width() - btnWidth) / 2,
            top: offset.top + img.height() + 5
        });
    });
})();

// 鼠标点击"点击放大"按钮事件的监听函数：弹窗显示大图
btn.on('click', function() {
    img.attr('src', '').attr('src', imgUrl);
    link.attr('href', imgUrl);
    btn.hide();
    mask.show();
    win.show();
});

// 鼠标移出"点击放大"按钮事件的监听函数：隐藏按钮
btn.on('mouseout', function() {
    btn.hide();
});

// 点击图片弹窗事件事件的监听函数：隐藏弹窗
win.on('click', function() {
    mask.hide();
    win.hide();
});
