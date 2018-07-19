'use strict'

var less = require('less')
var vueify = require('vueify')
var compiler = vueify.compiler
var babel = require('babel-core')
var browserify = require('browserify')
var fs = require('fs')
var path = require('path')

function fixExtName (fileInfo) {
    var content = fileInfo.content
    var deps = []

    // 内容中得文件后缀改为js
    content = content.replace(/'([\.\/\-\_a-z]+).vue'/gi, function (source, target) {
        if (target) {
            deps.push({
                source: source.replace(/\'/g, ''),
                target: target + '.js'
            })
        }
        return '\'' + target + '\''
    })

    if (deps.length) {
        fileInfo.deps = deps
    }
    // 文件输出后缀修改为js
    fileInfo.target = fileInfo.target.replace('.vue', '.js')
    fileInfo.content = content
}

exports.compact = function (callback) {
    var fileInfo = this.fileInfo
    var stream = browserify(fileInfo.realPath).transform('babelify', {presets: ['es2015']}).bundle().pipe(fs.createWriteStream(fileInfo.target, {autoClose: true}))
    callback && stream.on('end', callback)
}

exports.js = function (callback) {
    var fileInfo = this.fileInfo
    fixExtName(fileInfo)
    fileInfo.content = babel.transform(fileInfo.content, {'presets': ['es2015']}).code
    callback && callback(fileInfo)
}

exports.less = function (callback) {
    var fileInfo = this.fileInfo
    fileInfo.target = fileInfo.target || fileInfo.realPath.replace('.less', '.css')
    var paths = [path.dirname(fileInfo.realPath)]
    less.render(fileInfo.content, {paths: paths}).then(function (output) {
        if (output && output.css) {
            fileInfo.content = output.css
        }
        callback && callback(fileInfo)
    }, function (error) {
        console.error(error)
    })
}

exports.vue = function (callback) {
    var fileInfo = this.fileInfo
    fileInfo.target = fileInfo.target || fileInfo.realPath.replace('.vue', '.js')
    fixExtName(fileInfo)
    compiler.compile(fileInfo.content, fileInfo.realPath, function (err, result) {
        if (err) {
            console.error(err)
        }
        fileInfo.content = result
        callback && callback(fileInfo)
    })
}
