var gulp = require('gulp'),
  eventstream = require('event-stream'),
  cssmin = require('gulp-minify-css'),
  uglify = require('gulp-uglify'),
  sass = require('gulp-sass'),
  minifyInline = require('gulp-minify-inline'),
  htmlmin = require('gulp-htmlmin'),
  clean = require('gulp-clean'),
  cache = require('gulp-cache'),
  replace = require('gulp-replace'),
  useref = require('gulp-useref'),
  gulpif = require('gulp-if'),
  lazypipe = require('lazypipe'),
  tinypng = require('gulp-tinypng'),
  postcss = require('gulp-postcss'),
  autoprefixer = require('autoprefixer'),
  pxtorem = require('postcss-pxtorem'),
  runSequence = require('gulp-run-sequence'),
  webserver = require('gulp-webserver'),
  ifaces = require('os').networkInterfaces(),
  config = require('./buildConfig.json')

gulp.task('compile-sass', function () {
  var plugins = [
    require('postcss-flexbugs-fixes'),
    autoprefixer({
      browsers: [
        '>1%',
        'last 4 versions',
        'Firefox ESR',
        'not ie < 9'
      ],
      flexbox: 'no-2009'
    }),
    pxtorem({
      rootValue: 75,
      propList: ['*', '!font', '!font-size'],
      selectorBlackList: [/^html$/],
      minPixelValue: 3
    })
  ]
  return gulp.src('./styles/**/*.scss')
    .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(gulp.dest('./styles'))
})

gulp.task('tinypng', function () {
  return gulp.src('./assets/**/*.{png,jpg,jpeg}')
    .pipe(cache(tinypng(config.tinypngapi)))
    .pipe(gulp.dest('./dist/assets'))
})

gulp.task('copy-files', function (done) {
  var tasks = []

  tasks.push(
    gulp.src('./scripts/vendor/**/*.js')
      .pipe(gulp.dest('./dist/scripts/vendor'))
  )

  tasks.push(
    gulp.src(['./assets/**/*.json', './assets/**/*.mp3'])
      .pipe(gulp.dest('./dist/assets'))
  )

  tasks.push(
    gulp.src(['./assets/images/**/*.svg'])
      .pipe(gulp.dest('./dist/assets/images'))
  )

  eventstream.merge(tasks).on('end', done)
})

var getProjectUrl = function () {
  var url = config.baseUrl + config.projectName
  if (url !== '') {
    return url + '/'
  }
  return ''
}

var buildHTML = lazypipe()
  .pipe(minifyInline, {
    js: {
      output: {
        comments: false
      }
    },
    jsSelector: 'script[type!="text/template"]',
    css: {
      keepSpecialComments: 1
    },
    cssSelector: 'style[data-minify!="false"]'
  })
  .pipe(replace, /(:\s*url\(['"]?)(\.\.)?([^)]+?)/gm, '$1' + getProjectUrl() + '$3')
  .pipe(replace, /(['"])(css|styles|scripts|assets|images|js)\/([^"]+?)(['"])/gm, '$1' + getProjectUrl() + '$2/$3' + '$4')

var buildJS = lazypipe()
  .pipe(uglify)
  .pipe(replace, /"(css|scripts|images|js)\/([^"]+?)"/gm, '"' + getProjectUrl() + '$1/$2' + '"')
  .pipe(replace, /(url:")([^"]+?)"/gm, '$1' + getProjectUrl() + 'assets/' + '$2' + '"')

var buildCSS = lazypipe().pipe(cssmin)

gulp.task('useref', function () {
  return gulp.src('./*.html')
    .pipe(useref())
    .pipe(gulpif('*.html', buildHTML()))
    .pipe(gulpif('*.js', buildJS()))
    .pipe(gulpif('*.css', buildCSS()))
    .pipe(gulp.dest('./dist'))

})

gulp.task('htmlmin', function () {
  return gulp.src('./dist/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('./dist'))

})

gulp.task('webserver', function () {
  return gulp.src('./')
    .pipe(webserver({
      host: getIP(),
      port: 8082,
      livereload: true,
      open: true,
      directoryListing: false
    }))
})

gulp.task('watch', function () {
  gulp.watch('./styles/**/*.scss', ['compile-sass'])
})

gulp.task('clean', function () {
  return gulp.src('./dist', {read: false})
    .pipe(clean({force: true}))
})

gulp.task('clean-cache', function (done) {
  return cache.clearAll(done)
})

gulp.task('default', ['compile-sass', 'watch', 'webserver'])

gulp.task('build', function (done) {
  runSequence('clean', 'useref', /*'htmlmin',*/ 'tinypng', 'copy-files', done)
})

function getIP() {
  var ip = 'localhost'
  for (var dev in ifaces) {
    ifaces[dev].every(function (details) {
      if (details.family === 'IPv4' && details.address !== '127.0.0.1' && !details.internal) {
        ip = details.address
        return false
      }
      return true
    })
  }
  return ip
}
