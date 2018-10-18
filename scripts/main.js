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

  function buildVideoList(itemTpl, data) {
    if (!Array.isArray(data)) return
    var ret = ''
    data.forEach(function (item, i) {
      ret += tpl(itemTpl, $.extend({}, item, {$index: i + 1, lightCls: item.votes > 0 ? 'light' : ''}))
    })
    return ret
  }

  function buildBillList(itemTpl, data) {
    if (!Array.isArray(data)) return
    var ret = ''
    data.forEach(function (item, i) {
      ret += tpl(itemTpl, $.extend({}, item, {$index: i + 1, topCls: i < 3 ? 'top' : ''}))
    })
    return ret
  }

  var serverUrl = 'http://mnvideo.kurite.com/api'
  var openId = getQueryString('openId')
  var docTitle = document.title

  if (!openId) {
    alert('url参数缺少openId')
  }

  var userVote = function (vid, callback) {
    $.post(serverUrl + '/user/vote', {openId: openId, videoId: vid}).then(function (res) {
      if (res.success) {
        callback(res)
      } else {
        alert(res.message)
      }
    }, 'json')
  }

  var pageIndex = {
    page: $('#video-index'),
    init: function () {
      document.title = docTitle
      this.page.show().on('click', '.page-hint', function () {
        /* tween(window.pageYOffset, window.innerHeight + 17, 700, function (v) {
             setScrollTop(v)
           })*/
        location.hash = '#/list'
      })
    },
    dispose: function () {
      this.page.hide().off('click')
    }
  }

  var pageList = {
    page: $('#video-list'),
    init: function () {
      this.page.show()
        .on('click', '.list-tab-item', this._tabHandle)
        .on('click', '.video-cover', this._itemClickHandle)
        .on('click', '.video-bill-item', this._itemClickHandle)
        .on('click', '.video-vote-star', this._handleStar)
      this.page.find('.vote-videos').one('shown', this.showVideos)
      this.page.find('.videos-bill').one('shown', this.showBill)
      this.page.find('.list-tab-item').first().trigger('click')
    },
    dispose: function () {
      this.page.hide()
        .off('click')
        .find('.vote-videos').off('shown', this.showVotes)
        .find('.videos-bill').off('shown', this.showBill)
    },
    showVideos: function () {
      var videoItemTpl = '<div class="video-item">' +
        '      <div class="video-cover" data-vid="{{id}}">' +
        '        <img src="http://mnvideo.kurite.com/img/{{cover}}" />' +
        '      </div>' +
        '      <div class="video-footer">' +
        '        <span class="video-name">{{title}}</span>' +
        '        <span class="video-vote-star {{lightCls}}" data-vid="{{id}}">{{votes}}</span>' +
        '      </div>' +
        '    </div>'
      $.getJSON(serverUrl + '/video/videoList').then(function (res) {
         if (res.success) {
           var videoList = buildVideoList(videoItemTpl, res.data)
           $('#video-list').find('.vote-videos').html(videoList)
         } else {
           alert(res.message)
         }
      })
    },
    showBill: function () {
      var billItemTpl = '<div class="video-bill-item {{topCls}}" data-vid="{{id}}">' +
        '      <div class="video-bill-img">' +
        '        <img src="http://mnvideo.kurite.com/img/{{cover}}" />' +
        '      </div>' +
        '      <div class="video-bill-name">{{title}}</div>' +
        '      <div class="video-bill-count"><em>{{votes}}</em>票</div>' +
        '      <div class="video-bill-order">{{$index}}</div>' +
        '    </div>'
      $.getJSON(serverUrl + '/video/ranKing').then(function (res) {
        if (res.success) {
          var billList = buildBillList(billItemTpl, res.data)
          $('#video-list').find('.videos-bill').html(billList)
        } else {
          alert(res.message)
        }
      })
    },
    _tabHandle: function () {
      $(this).addClass('current').siblings().removeClass('current')
      var index = $(this).index()
      var curPane = $('#video-list').find('.list-pane').eq(index)
      curPane.show().siblings('.list-pane').hide()
      curPane.trigger('shown')
    },
    _itemClickHandle: function (e) {
      var vid = e.currentTarget.dataset.vid
      if (vid) {
        location.hash = '#/detail/' + vid
      }
    },
    _handleStar: function (e) {
      var target = e.currentTarget
      var vid = target.dataset.vid
      if (vid) {
        userVote(vid, function () {
          $(target).addClass('light').text(+$(target).text() + 1)
        })
      }
    },
  }

  var pageDetail = {
    page: $('#video-detail'),
    init: function (vid) {
      var self = this
      this.page.show()
      this.showDetail(vid)
      /*this.page.on('click', '#vplay', function () {
        $(this).hide()
        $('#video').get(0).play()
      })*/
      this.page.on('click', '.vote-button', function (e) {
        var vid = e.currentTarget.dataset.vid
        if (vid) {
          userVote(vid, function (res) {
            self.showModal(res.data)
          })
        }
      })
    },
    showDetail: function (vid) {
      if (!vid) {
        return alert('缺少视频ID参数')
      }
      var self = this
      var detailTpl = '<div class="video-container">' +
        /*'      <video id="video" src="{{href}}" x5-video-player-type="h5" x5-video-player-fullscreen="true" webkit-playsinline="true" x-webkit-airplay="true" playsinline="true"></video>' +*/
        '<iframe id="video" frameborder="0" src="{{href}}" allowFullScreen="false"></iframe>' +
        '      <span id="vplay" class="video-play" style="display: none;"></span>' +
        '    </div>' +
        '    <div class="video-vote-info">' +
        '      <div class="video-vote-summary">' +
        '        <span class="vd-label">累计票数</span>' +
        '        <span class="vd-count">{{votes}}</span>' +
        '      </div>' +
        '      <div class="vd-vote-users">' +
        '      {{userList}}'+
        '      </div>' +
        '    </div>' +
        '    <div class="video-summary-panel">' +
        '      <h4>视频介绍</h4>' +
        '      <div class="video-summary-desc">' +
        '        <p>{{detail}}</p>' +
        '      </div>' +
        '    </div>' +
        '<div class="vd-vote-action">' +
        '    <button class="vote-button {{disabledCls}}" data-vid="{{id}}">投票</button>' +
        '  </div>'
      var userItemTpl =  '<div class="vd-vote-item">' +
        '          <div class="vd-vote-user">' +
        '            <img src="{{headImg}}" class="vote-avatar" alt="{{name}}">' +
        '            <span>{{name}}</span>' +
        '          </div>' +
        '          <div class="vd-vote-trend">+1</div>' +
        '        </div>'

      $.getJSON(serverUrl + '/video/videoDetail', {videoId: vid}).then(function (res) {
        if (res.success) {
          var userList = ''
          document.title = res.data.title
          res.data.voteList.forEach(function (item) {
            userList += tpl(userItemTpl, item)
          })
          var detail = tpl(detailTpl, $.extend(res.data, {userList: userList, disabledCls: res.data.isEnd ? 'disabled' : ''}))
          self.page.find('.detail-wrapper').html(detail)
        } else {
          alert(res.message)
        }
      })
    },
    showModal: function (votesLeft) {
      $('#votesLeft').text(votesLeft)
      this.page.find('.vote-modal').show().one('click', function () {
        $(this).hide()
      })
    },
    hideModal: function () {
      this.page.find('.vote-modal').hide().off('click')
    },
    dispose: function () {
      this.page.hide().off('click')
      this.hideModal()
      $('#video').remove()
    }
  }

  function runApp() {
    var hash = window.location.hash.substring(1)
    if (hash === '') {
      location.hash = '#/index'
      return
    }
    var hashStack = hash.substring(1).split('/')
    var hashKey = hashStack[0]
    var hashParams = hashStack[1]
    switch (hashKey) {
      case 'index':
        pageIndex.init()
        pageList.dispose()
        pageDetail.dispose()
        break
      case 'list':
        pageList.init()
        pageIndex.dispose()
        pageDetail.dispose()
        break
      case 'detail':
        pageDetail.init(hashParams)
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
