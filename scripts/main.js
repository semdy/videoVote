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

  function getDocScrollHeight () {
    return document.body.scrollHeight || document.documentElement.scrollHeight
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
      ret += tpl(itemTpl, $.extend({}, item, {$index: i + 1, lightCls: !item.isVote ? 'light' : ''}))
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
    })
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
    tabIndex: 0,
    pageNum: 1,
    inited: false,
    lastScrollTop: 0,
    init: function () {
      if (this.inited) {
        this.page.show()
        setScrollTop(this.lastScrollTop)
        this.bindScroll()
        return
      }

      this.pageNum = 1
      this.page.show()
        .on('click', '.list-tab-item', this._tabHandle)
        .on('click', '.video-cover', this._itemClickHandle)
        .on('click', '.video-bill-item', this._itemClickHandle)
        .on('click', '.video-vote-star', this._handleStar)
      this.page.find('.vote-videos').one('shown', this.showVideos)
      this.page.find('.videos-bill').one('shown', this.showBill)
      this.page.find('.list-tab-item').eq(sessionStorage.__from === 'bill' ? 1 : 0).trigger('click')
      sessionStorage.removeItem('__from')
      this.bindScroll()
      this.inited = true;
    },
    bindScroll: function () {
      var self = this
      $(window).on('scroll.appendlist', function () {
        self.lastScrollTop = window.pageYOffset
        if (window.pageYOffset + window.innerHeight === getDocScrollHeight() ) {
          self.showVideos(true)
        }
      })
    },
    dispose: function () {
      this.page.hide()
       /* .off('click')
        .find('.vote-videos').off('shown', this.showVideos)
        .find('.videos-bill').off('shown', this.showBill)*/
      $(window).off('scroll.appendlist')
    },
    showVideos: function (isAppend) {
      var videoItemTpl = '<div class="video-item">' +
        '      <div class="video-cover" data-type="list" data-vid="{{id}}">' +
        '        <img src="http://mnvideo.kurite.com/img/{{cover}}" />' +
        '      </div>' +
        '      <div class="video-footer">' +
        '        <span class="video-name">{{title}}</span>' +
        '        <span class="video-vote-star {{lightCls}}" data-vid="{{id}}">{{votes}}</span>' +
        '      </div>' +
        '    </div>'
      $.post(serverUrl + '/video/videoList', {openId: openId, page: pageList.pageNum, limit: 10}).then(function (res) {
         if (res.success) {
           if (res.data.docs.length > 0) {
             pageList.pageNum++
             var videoList = buildVideoList(videoItemTpl, res.data.docs)
             if (!isAppend) {
               $('#video-list').find('.vote-videos').html(videoList)
             } else {
               $('#video-list').find('.vote-videos').append(videoList)
             }
           }
         } else {
           alert(res.message)
         }
      })
    },
    showBill: function () {
      var billItemTpl = '<div class="video-bill-item {{topCls}}" data-type="bill" data-vid="{{id}}">' +
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
      pageList.tabIndex = index
      curPane.show().siblings('.list-pane').hide()
      curPane.trigger('shown')
      if (index === 0) {
        document.title = docTitle + ' - 投票列表'
      } else {
        document.title = docTitle + ' - 排行榜'
      }
    },
    _itemClickHandle: function (e) {
      var vid = e.currentTarget.dataset.vid
      var type = e.currentTarget.dataset.type
      if (vid) {
        sessionStorage.__from = type
        location.hash = '#/detail/' + vid
      }
    },
    _handleStar: function (e) {
      var target = e.currentTarget
      var vid = target.dataset.vid
      if (vid) {
        userVote(vid, function (res) {
          $(target).addClass('light').text(+$(target).text() + 1)
          alert(res.message)
        })
      }
    },
  }

  var pageDetail = {
    page: $('#video-detail'),
    pageNum: 1,
    init: function (vid) {
      var self = this
      this.pageNum = 1
      this.page.show()
      this.showDetail(vid)
      /*this.page.on('click', '#vplay', function () {
        $(this).hide()
        $('#video').get(0).play()
      })*/
      this.page.on('click', '[data-action="vote"]', function (e) {
        var vid = e.currentTarget.dataset.vid
        if (vid) {
          userVote(vid, function (res) {
            $(e.currentTarget).addClass('disabled')
            self.showModal(res.data)
            self.refresh(vid)
          })
        }
      }).on('click', '[data-action="expand"]', function () {
        $('#video-desc').toggleClass('expand')
        $(this).toggleClass('active')
      }).on('click', '[data-action="comment"]', function () {
        var top = $('#comments').offset().top - self.page.find('.index-header').height();
        setScrollTop(top)
      }).on('click', '[data-action="comment-pub"]', function () {
        $('#comment-form').submit()
      })

      setTimeout(function () {
        this.bindEvents(vid)
      }.bind(this), 100)
    },
    bindEvents: function (vid) {
      var timer = null
      var self = this

      $(window).on('resize.video', function () {
        if (timer) clearTimeout(timer)
        timer = setTimeout(function () {
          self.setVideoSize()
        }, 200)
      })

      $(window).on('scroll.appendcomment', function () {console.log(2233)
        if (window.pageYOffset + window.innerHeight === getDocScrollHeight() ) {
          self.getComments(vid, true)
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
        '    <div class="video-summary-panel">' +
        '      <h4>视频介绍</h4>' +
        '      <div id="video-desc" class="video-summary-desc">' +
        '        {{detail}}' +
        '      </div>' +
        '       <div class="summary-expand" data-action="expand" style="display: {{expandShow}}">' +
        '         <span></span>' +
        '       </div>' +
        '    </div>' +
        '   <div id="comments"></div>' +
        ' <div class="vd-vote-action">' +
        '   <div class="commit-wrap">' +
        '   <form id="comment-form">' +
        '     <input type="text" name="comment" placeholder="添加评论..." />' +
        '   </form>' +
        '     <span class="commit-emot"></span>' +
        '   </div>' +
        '   <div class="comment-pub" data-action="comment-pub">' +
        '     发布' +
        '</div>' +
        '   <div class="commit-info">' +
        '     <span data-action="comment"><i class="comment-count"></i></span>' +
        '     <span data-action="vote" data-vid="{{id}}" class="{{disabledCls}}"><i class="vd-count">{{votes}}</i></span>' +
        '   </div>' +
        '  </div>'

      $.post(serverUrl + '/video/videoDetail', {videoId: vid, openId: openId}).then(function (res) {
        if (res.success) {
          document.title = res.data.title
          var detail = tpl(detailTpl, $.extend(res.data, {disabledCls: !res.data.isVote ? 'disabled' : '', expandShow: res.data.detail.length > 60 ? 'block' : 'none'}))
          self.page.find('.detail-wrapper').html(detail)
          self.getComments(vid)
          self.setVideoSize()
        } else {
          alert(res.message)
        }
      })
    },
    getComments: function (vid, isAppend, refresh) {
      var self = this
      var ItemTpl =  '<div class="vd-vote-item">' +
        '          <div class="vd-vote-user">' +
        '            <img src="{{headImg}}" class="vote-avatar" alt="{{name}}">' +
        '          </div>' +
        '          <div class="vd-vote-cont">' +
        '             <div class="vd-vote-hd">' +
        '               <span>{{name}}</span>' +
        '               <div class="vd-vote-date">{{date}}</div>' +
        '             </div>' +
        '             <div class="vd-vote-comment">{{comment}}</div>' +
        '         </div>' +
        '        </div>'
      if (refresh) {
        pageDetail.pageNum = 1
      }
      $.post(serverUrl + '/comment/getComment', {videoId: vid, page: pageDetail.pageNum, limit: 20}).then(function (res) {
        if (res.success) {
          if (res.data.docs.length > 0) {
            pageDetail.pageNum++
            var ret = '';
            res.data.docs.forEach(function (item) {
              ret += tpl(ItemTpl, item)
            })
            if (isAppend) {
              $('#comments').append(ret)
            } else {
              $('#comments').html(ret)
            }
          }
          self.page.find('.comment-count').text(res.data.total)
          self.bindComment(vid)
        } else {
          alert(res.message)
        }
      })
    },
    bindComment: function (vid) {
      var $form = $('#comment-form')
      var $bwrap = $form.closest('.vd-vote-action')

      $form.find('input').focus(function () {
        $bwrap.addClass('focus')
      }).blur(function () {
        setTimeout(function () {
          $bwrap.removeClass('focus')
        })
      })

      $form.off('submit').on('submit', function (e) {
        e.preventDefault();
        var that = this;
        var comment = this.comment.value
        if ($.trim(comment) === '') {
          return alert('请输入有效的评论')
        }
        $.post(serverUrl + '/comment/addComment', {openId: openId, videoId: vid, comment: comment}).then(function (res) {
          if (res.success) {
            that.comment.value = ''
            that.comment.blur()
            pageDetail.refresh(vid, true)
            alert(res.message)
          } else {
            alert(res.message)
          }
        })
      })
    },
    refresh: function (vid) {
      var self = this
      $.post(serverUrl + '/video/videoDetail', {videoId: vid}).then(function (res) {
        self.page.find('.vd-count').text(res.data.votes)
        self.getComments(vid, false, true)
        if (!res.data.isVote) {
          self.page.find('[data-action="vote"]').addClass('disabled')
        }
      })
    },
    setVideoSize: function () {
      this.page.find('.video-container').height(423*window.innerWidth/750)
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
      this.page.hide().off('click').find('.detail-wrapper').html('')
      this.hideModal()
      $(window).off('resize.video').off('scroll.appendcomment')
    }
  }

  var lastPath = null

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
        pageList.dispose()
        pageDetail.dispose()
        pageIndex.init()
        break
      case 'list':
        pageIndex.dispose()
        pageDetail.dispose()
        pageList.init()
        break
      case 'detail':
        pageIndex.dispose()
        pageList.dispose()
        pageDetail.init(hashParams)
        break
      default:
        //
    }
    lastPath = hashKey
    //setScrollTop(0)
  }

  function main() {
    window.addEventListener("hashchange", runApp, false)
    runApp()
  }

  $(function () {
    main()
  })

})(window);
