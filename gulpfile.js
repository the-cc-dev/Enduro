var gulp = require('gulp')
var watch = require('gulp-watch')
var browser_sync = require('browser-sync').create()
var sass = require('gulp-sass')
var url = require('url')
var fs = require('fs')
var bulkSass = require('gulp-sass-bulk-import')
var kiska_logger = require('./libs/kiska_logger')
var scsslint = require('gulp-scss-lint')
var spritesmith = require('gulp.spritesmith')
var sourcemaps = require('gulp-sourcemaps')
var checkGem = require('gulp-check-gems')
var autoprefixer = require('gulp-autoprefixer')
var iconfont = require('gulp-iconfont')
var iconfontCss = require('gulp-iconfont-css')
var handlebars = require('gulp-handlebars')
var defineModule = require('gulp-define-module')
var flatten = require('gulp-flatten')
var concat = require('gulp-concat')
var filterBy = require('gulp-filter-by')
var wrap = require('gulp-wrap')
var path = require('path')

var enduro_helpers = require(ENDURO_FOLDER + '/libs/flat_utilities/enduro_helpers')

// Gulp tasks
var pagelist_generator = require(ENDURO_FOLDER + '/libs/build_tools/pagelist_generator').init(gulp)
var prettyfier = require(ENDURO_FOLDER + '/libs/build_tools/prettyfier').init(gulp)
var htmlvalidator = require(ENDURO_FOLDER + '/libs/build_tools/html_validator').init(gulp)

gulp.set_refresh = function (callback) {
	gulp.enduro_refresh = callback
}

gulp.enduro_refresh = function () {
	kiska_logger.err('refresh not defined')
}

// * ———————————————————————————————————————————————————————— * //
// * 	browser sync task
// * ———————————————————————————————————————————————————————— * //
gulp.task('browser_sync', ['sass'], function() {
	browsersync_start(false)
})

gulp.task('browser_sync_norefresh', ['sass'], function() {
	browsersync_start(true)
})

function browsersync_start(norefresh) {
	kiska_logger.timestamp('browsersync started', 'enduro_events')
	browser_sync.init({
		server: {
			baseDir: CMD_FOLDER + '/_src',
			middleware: function(req, res, next) {

				if(req.url.split('/')[1] && config.cultures.indexOf(req.url.split('/')[1]) + 1){
					return next()
				}

				// serve files without html
				if(!(req.url.indexOf('.') + 1) && req.url.length > 3) {
					req.url += '.html'
				}

				// patch to enable development of admin ui in enduro
				static_path_pattern = new RegExp(config.static_path_prefix + '\/(.*)')
				if(static_path_pattern.test(req.url)){
					req.url = '/' + req.url.match(static_path_pattern)[1]
				}

				// server admin/index file on /admin url
				if(req.url == '/admin/'){ req.url = '/admin/index.html' }

				return next()
			},
		},
		ui: false,
		logLevel: 'silent',
		notify: false,
		logPrefix: 'Enduro',
		startPath: START_PATH,
		open: !norefresh
	})
	watch([ CMD_FOLDER + '/assets/css/**/*', CMD_FOLDER + '/assets/fonticons/*', '!' + CMD_FOLDER + '/assets/css/sprites/*'],
				() => { gulp.start('sass') })									// Watch for scss

	if(!flags.nojswatch) {
		watch([CMD_FOLDER + '/assets/js/**/*'], () => { gulp.start('js'); browser_sync.reload() })							// Watch for js
	}

	watch([CMD_FOLDER + '/assets/img/**/*'], () => { gulp.start('img') })						// Watch for images
	watch([CMD_FOLDER + '/assets/vendor/**/*'], () => { gulp.start('vendor') })					// Watch for vendor files
	watch([CMD_FOLDER + '/assets/fonts/**/*'], () => { gulp.start('fonts') })					// Watch for fonts
	watch([CMD_FOLDER + '/assets/hbs_helpers/**/*'], () => { gulp.start('hbs_helpers') })		// Watch for local handlebars helpers
	watch([CMD_FOLDER + '/assets/spriteicons/*.png'], () => { gulp.start('sass') })				// Watch for png icons
	watch([CMD_FOLDER + '/assets/fonticons/*.svg'], () => {
		gulp.start('iconfont')
		gulp.enduro_refresh(() => {})
	})			// Watch for font icon
	watch([CMD_FOLDER + '/components/**/*.hbs'], () => { gulp.start('hbs_templates') })			// Watch for hbs templates

	// Watch for enduro changes
	if(!flags.nocmswatch) {
		watch([CMD_FOLDER + '/pages/**/*.hbs', CMD_FOLDER + '/components/**/*.hbs', CMD_FOLDER + '/cms/**/*.js'], function() {
			gulp.enduro_refresh(() => {
				browser_sync.reload()
			})
		})
	}
}


// * ———————————————————————————————————————————————————————— * //
// * 	Sass Task
// *	Processes assets/css/main.scss file
// *	All other scss files need to be imported in main.scss to get compiled
// *	Uses bulkSass for @import subfolder/* funcionality
// * ———————————————————————————————————————————————————————— * //
gulp.task('sass', function() {
	kiska_logger.timestamp('Sass compiling started', 'enduro_events')

	return gulp.src(CMD_FOLDER + '/assets/css/main.scss')
		.pipe(bulkSass())
		.pipe(sourcemaps.init())
		.pipe(sass())
		.on('error', function(err){
			kiska_logger.err_blockStart('Sass error')
			kiska_logger.err(err.message)
			kiska_logger.err_blockEnd()
			this.emit('end')
		})
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(CMD_FOLDER + '/_src/assets/css'))
		.pipe(browser_sync.stream())
		.on('end', () => {
			kiska_logger.timestamp('Sass compiling finished', 'enduro_events')
		})
})


// * ———————————————————————————————————————————————————————— * //
// * 	Scss lint
// * ———————————————————————————————————————————————————————— * //
gulp.task('scss-lint', function() {
	try{
		kiska_logger.timestamp('Sass lint started', 'enduro_events')
		return gulp.src(CMD_FOLDER + '/assets/css/**/*')
			.pipe(checkGem({gemfile: 'scss-lint'}, scsslint(
				{
					'config': __dirname + '/support_files/scss-lint.yml'
				}
			).on('end', () => {
				kiska_logger.timestamp('Sass lint finished', 'enduro_events')
			})))

	}
	catch(err){
		return kiska_logger('No liting. you need to install scss_lint')
	}
})


// * ———————————————————————————————————————————————————————— * //
// * 	js
// *	Todo: require js optimization should go here
// * ———————————————————————————————————————————————————————— * //
gulp.task('js', function() {

	return gulp.src(CMD_FOLDER + '/assets/js/**/*')
		.pipe(gulp.dest(CMD_FOLDER + '/_src/assets/js'))

})


// * ———————————————————————————————————————————————————————— * //
// * 	img
// * ———————————————————————————————————————————————————————— * //
gulp.task('img', function() {
	return gulp.src(CMD_FOLDER + '/assets/img/**/*')
		.pipe(gulp.dest(CMD_FOLDER + '/_src/assets/img'))
})


// * ———————————————————————————————————————————————————————— * //
// * 	vendor
// * ———————————————————————————————————————————————————————— * //
gulp.task('vendor', function() {
	return gulp.src(CMD_FOLDER + '/assets/vendor/**/*')
		.pipe(gulp.dest(CMD_FOLDER + '/_src/assets/vendor'))
})


// * ———————————————————————————————————————————————————————— * //
// * 	fonts
// * ———————————————————————————————————————————————————————— * //
gulp.task('fonts', function() {
	return gulp.src(CMD_FOLDER + '/assets/fonts/**/*')
		.pipe(gulp.dest(CMD_FOLDER + '/_src/assets/fonts'))
})


// * ———————————————————————————————————————————————————————— * //
// * 	spriteicons
// *	will get all pngs out of assets/spriteicons folder
// *	and generate spritesheet out of them
// * ———————————————————————————————————————————————————————— * //
gulp.task('png_sprites', function() {
	return gulp.src(CMD_FOLDER + '/assets/spriteicons/*.png')
		.pipe(spritesmith({
			imgName: '_src/assets/spriteicons/spritesheet.png',
			cssName: '_src/_prebuilt/sprites.scss',
			padding: 3,
			cssTemplate: path.join(__dirname, 'support_files', 'sprite_generator.handlebars'),
			retinaSrcFilter: [path.join(CMD_FOLDER, 'assets/spriteicons/*@2x.png')],
			retinaImgName: '_src/assets/spriteicons/spritesheet@2x.png',
		}))
		.pipe(gulp.dest(CMD_FOLDER))
})


// * ———————————————————————————————————————————————————————— * //
// * 	iconfont
// * ———————————————————————————————————————————————————————— * //
gulp.task('iconfont', function(cb){
	return gulp.src([CMD_FOLDER + '/assets/fonticons/*.svg'])
		.pipe(iconfontCss({
			fontName: config.project_slug + '_icons',
			path: 'assets/fonticons/icons_template.scss',
			targetPath: '../../../_src/_prebuilt/icons.scss',
			fontPath: '/assets/iconfont/',
		}))
		.pipe(iconfont({
			fontName: config.project_slug + '_icons',
			prependUnicode: true,
			fontHeight: 1024,
			normalize: true,
			formats: ['ttf', 'eot', 'woff'],
			log: () => {}
		}))
		.on('glyphs', function(glyphs, options) {
			glyphs = glyphs.map(function(glyph){
				glyph.unicode = glyph.unicode[0].charCodeAt(0).toString(16)
				return glyph
			})
			var icon_json_file_path = CMD_FOLDER + '/_src/_prebuilt/icons.json'
			enduro_helpers.ensureDirectoryExistence(icon_json_file_path)
				.then(() => {
					fs.writeFileSync(icon_json_file_path, JSON.stringify(glyphs))
					cb()
				})
		})
		.pipe(gulp.dest('_src/assets/iconfont/'))
})


// * ———————————————————————————————————————————————————————— * //
// * 	JS Handlebars - Not enduro, page-generation related
// * ———————————————————————————————————————————————————————— * //
gulp.task('hbs_templates', function(){
	gulp.src(CMD_FOLDER + '/components/**/*.hbs')
		.pipe(handlebars({
			// Pass local handlebars
			handlebars: __templating_engine
		}))
		.pipe(defineModule('amd'))
		.pipe(flatten())
		.pipe(gulp.dest(CMD_FOLDER + '/_src/assets/hbs_templates'))
})


// * ———————————————————————————————————————————————————————— * //
// * 	Handlebars helpers
// * ———————————————————————————————————————————————————————— * //
gulp.task('hbs_helpers', function() {
	return gulp.src([CMD_FOLDER + '/assets/hbs_helpers/**/*.js', ENDURO_FOLDER + '/hbs_helpers/**/*.js'])
		.pipe(filterBy(function(file) {
			return file.contents.toString().indexOf('enduro_nojs') == -1
		}))
		.pipe(concat('hbs_helpers.js'))
		.pipe(wrap('define([],function(){ return function(__templating_engine){ \n\n<%= contents %>\n\n }})'))
		.pipe(gulp.dest(CMD_FOLDER + '/_src/assets/hbs_helpers/'))
})


// * ———————————————————————————————————————————————————————— * //
// * 	Default Task
// * ———————————————————————————————————————————————————————— * //
//gulp.task('default', ['hbs_templates', 'sass', 'js', 'img', 'vendor', 'fonts', 'hbs_helpers', 'browser_sync'])
gulp.task('default', ['hbs_templates', 'sass', 'js', 'img', 'vendor', 'fonts', 'hbs_helpers', 'browser_sync'])
gulp.task('default_norefresh', ['hbs_templates', 'sass', 'js', 'img', 'vendor', 'fonts', 'hbs_helpers', 'browser_sync_norefresh'])


// * ———————————————————————————————————————————————————————— * //
// * 	Preproduction Task
// *	Tasks that need to be done before doing the enduro render
// * ———————————————————————————————————————————————————————— * //
gulp.task('preproduction', ['iconfont', 'png_sprites', pagelist_generator])


// * ———————————————————————————————————————————————————————— * //
// * 	Production Task
// *	No browser_sync, no watching for anything
// * ———————————————————————————————————————————————————————— * //
gulp.task('production', ['sass', 'hbs_templates', 'js', 'img', 'vendor', 'fonts', 'hbs_helpers', prettyfier])


// * ———————————————————————————————————————————————————————— * //
// * 	check task
// * ———————————————————————————————————————————————————————— * //
gulp.task('check', [htmlvalidator, prettyfier, 'scss-lint'])

// Export gulp to enable access for enduro
module.exports = gulp