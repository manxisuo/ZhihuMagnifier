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
var winTpl = '<div class="modal-dialog zm-light-box zm-light-box-fullscreen-image" tabindex="0" role="dialog" aria-labelledby=":9h"><div class="modal-dialog-title modal-dialog-title-draggable"><span class="modal-dialog-title-text" id=":9h" role="heading"></span><span class="modal-dialog-title-close" role="button" tabindex="0" aria-label="Close"></span></div><div class="modal-dialog-content"><div class="zm-light-box-x1" id="zm-light-box-x1"><div class="zm-light-box-x2" id="zm-light-box-x2" style="margin-top: 40px; width: 500px;"><img src="{0}" class="zm-light-box-img-el"><div class="zm-light-box-footer"><a class="zm-light-box-show-origin" href="{1}" target="_blank">查看原图</a></div></div></div></div><div class="modal-dialog-buttons"><button name="cancel">取消</button><button name="ok" class="goog-buttonset-default">确定</button></div></div>';

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

// 鼠标移入头像图片事件的监听函数
var avatarHoverHandler = function(arguments) {
    var avatars = $('img.zm-item-img-avatar, img.zm-list-avatar, img.zm-item-img-avatar50');
    avatars.off('mouseover').on('mouseover', function(e) {
        var img = $(this);
        var offset = img.offset();

        imgUrl = img.attr('src').replace((/_\w\./), '.');

        btn.show().offset({
            left: offset.left + (img.width() - btnWidth) / 2,
            top: offset.top + img.height() + 5
        });
    });
/*    $('.avatar img, img.avatar, img.zm-item-img-avatar, img.zm-list-avatar, img.zm-item-img-avatar50').mouseout(function(){
        btn.hide();
    })*/
    avatars.off('mouseout').on('mouseout',function(e){
        btn.hide();
    });
};
var HaveHandler=function(arguments){
    var avatars = $('.avatar img, img.avatar, img.zm-item-img-avatar, img.zm-list-avatar, img.zm-item-img-avatar50');

};

// 知乎首页动态插入节点(新动态)事件的监听函数：为所有头像图片的鼠标移入事件注册监听器
(function() {
    var ts0 = -1;
    $('#js-home-feed-list').on('DOMNodeInserted', function(){
        var ts = new Date().getTime();

        // 防止一次插入多个节点时触发多次注册动作
        if (ts - ts0 >= 500) {
            setTimeout(avatarHoverHandler); // 加入到事件队列的末尾
        }

        ts0 = ts;
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

// 首次载入脚本时触发一次avatarHoverHandler
avatarHoverHandler();
