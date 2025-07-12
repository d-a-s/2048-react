var gulp = require('gulp');
var sass = require('gulp-dart-sass');
var prefix = require('gulp-autoprefixer');
var babel = require('gulp-babel');

var styles = 'src/*.scss';
var scripts = 'src/*.js';

function stylesTask() {
  return gulp.src(styles)
    .pipe(sass())
    .pipe(prefix('last 2 versions', '> 1%', 'ie 8', 'ie 7'))
    .pipe(gulp.dest('built'));
}

function jsxTask() {
  return gulp.src(scripts)
    .pipe(babel({
      presets: ['es2015', 'react']
    }))
    .pipe(gulp.dest('built'));
}

function watchTask() {
  gulp.watch(styles, stylesTask);
  gulp.watch(scripts, jsxTask);
}

gulp.task('styles', stylesTask);
gulp.task('jsx', jsxTask);
gulp.task('watch', watchTask);
gulp.task('default', gulp.series(gulp.parallel('styles', 'jsx'), 'watch'));
gulp.task('build', gulp.parallel('styles', 'jsx'));
