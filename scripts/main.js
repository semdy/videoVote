;(function (window, undefined) {

  function formatDate (source, format) {
    var o = {
      'M+': source.getMonth() + 1, // 月份
      'd+': source.getDate(), // 日
      'H+': source.getHours(), // 小时
      'm+': source.getMinutes(), // 分
      's+': source.getSeconds(), // 秒
      'q+': Math.floor((source.getMonth() + 3) / 3), // 季度
      'f+': source.getMilliseconds() // 毫秒
    };
    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (source.getFullYear() + '').substr(4 - RegExp.$1.length))
    }
    for (var k in o) {
      if (new RegExp('(' + k + ')').test(format)) {
        format = format.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
      }
    }
    return format
  }

  var requestAnimationFrame =
    window.requestAnimationFrame        ||
    window.webkitRequestAnimationFrame  ||
    window.mozRequestAnimationFrame     ||
    function (callback) {
      return setTimeout(callback, 1000 / 60);
    };

  var cancelAnimationFrame =
    window.cancelAnimationFrame        ||
    window.webkitCancelAnimationFrame  ||
    window.mozCancelAnimationFrame     ||
    function (id) {
      return clearTimeout(id);
    };

  var Circular = {
    Out: function (k) {
      return Math.sqrt(1 - (--k * k));
    }
  }

  var tween = function (cur, dest, duration, onUpdate, onDone) {
    var diff = dest - cur
    var startTime = Date.now()
    if (diff === 0) {
      return
    }
    var execRun = function () {
      var rAF = requestAnimationFrame(execRun)
      var per = (Date.now() - startTime) / duration
      per = per > 1 ? 1 : per
      onUpdate(cur + diff * Circular.Out(per), per)
      if (per === 1) {
        cancelAnimationFrame(rAF)
        if (typeof onDone === 'function') {
          onDone()
        }
      }
    }

    execRun()
  }

  function setScrollTop(top) {
    document.body.scrollTop = document.documentElement.scrollTop = top
  }

  function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r !== null) return unescape(r[2]); return null;
  }

  function tpl(str, data) {
    return str.replace(/\{\{([^}}]+)\}\}/gm, function (match, name) {
       if (data[name] !== undefined) {
         return data[name]
       }
       return ''
    })
  }

  var pageIndex = {
    page: $('#video-index'),
    _scrollToPage2: function () {
      tween(window.pageYOffset, window.innerHeight + 17, 700, function (v) {
        setScrollTop(v)
      })
    },
    init: function () {
      this.page.show().find('.page-hint').on('click', this._scrollToPage2)
    },
    dispose: function () {
      this.page.hide().find('.page-hint').off('click', this._scrollToPage2)
    }
  }

  var pageList = {
    page: $('#video-list'),
    init: function () {
      this.page.show()
        .on('click', '.list-tab-item', this._tabHandle)
        .on('click', '.video-cover', this._itemClickHandle)
        .on('click', '.video-vote-star', this._handleStar)
      this.page.find('.vote-videos').one('shown', this.showVotes)
      this.page.find('.videos-bill').one('shown', this.showBill)
      this.page.find('.list-tab-item').first().trigger('click')
    },
    dispose: function () {
      this.page.hide()
        .off('click')
        .find('.vote-videos').off('shown', this.showVotes)
        .find('.videos-bill').off('shown', this.showBill)
    },
    showVotes: function () {
      console.log('vote')
    },
    showBill: function () {
      console.log('bill')
    },
    getData: function () {

    },
    _tabHandle: function () {
      $(this).addClass('current').siblings().removeClass('current')
      var index = $(this).index()
      var curPane = $('#video-list').find('.list-pane').eq(index)
      curPane.show().siblings('.list-pane').hide()
      curPane.trigger('shown')
    },
    _itemClickHandle: function () {
      location.hash = '#/detail'
    },
    _handleStar: function () {

    },
  }

  var pageDetail = {
    page: $('#video-detail'),
    video: $('#video').get(0),
    init: function () {
      var self = this
      this.page.show()
      this.showDetail()
      this.page.find('#vplay').show().on('click', function () {
        $(this).hide()
        self.video.play()
      })
    },
    showDetail: function () {

    },
    showModal: function () {
      this.page.find('.vote-modal').show().one('click', function () {
        $(this).hide()
      })
    },
    hideModal: function () {
      this.page.find('.vote-modal').hide().off('click')
    },
    dispose: function () {
      this.page.hide()
      this.hideModal()
      self.video.pause()
    }
  }

  function runApp() {
    var hash = window.location.hash.substring(1)
    if (hash === '') {
      location.hash = '#/index'
      return
    }
    switch (hash) {
      case '/index':
        pageIndex.init()
        pageList.init()
        pageDetail.dispose()
        break
      case '/detail':
        pageDetail.init()
        pageIndex.dispose()
        pageList.dispose()
        break
      default:
        //
    }
    setScrollTop(0)
  }

  function main() {
    window.addEventListener("hashchange", runApp, false)
    runApp()
  }

  $(function () {
    main()
  })

})(window);
