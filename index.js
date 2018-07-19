'use strict'

var sh = require('shelljs')
var walk = require('walk')
var fs = require('fs')
var plugin = require('./plugin')
var path = require('path')
var config = {}
var sourceDir = './src'
var targetDir = './output'

function readConfig (pwdir) {
    var packageInfo = require('./package.json')
    var pkg = path.resolve(pwdir, 'package.json')
    config = packageInfo.buildConf || {}
    if (fs.existsSync(pkg)) {
        var pkgInfo = require(pkg)
        if (pkgInfo.buildConf) {
            config = pkgInfo.buildConf
        }
    }
    if (config.source && config.output) {
        targetDir = path.resolve(pwdir, config.output)
        sourceDir = path.resolve(pwdir, config.source)
    }
    if (targetDir) {
        sh.mkdir('-p', targetDir)
    }
}

function outputFile (fileInfo) {
    fs.writeFileSync(fileInfo.target, fileInfo.content)
    exports.log('[buildFile] %s ~ %s', fileInfo.realPath, fileInfo.target)
    // 只有子目录的文件夹需要建立alias文件
    if (fileInfo.alias && sourceDir !== root) {
        var moduleName = path.basename(path.dirname(fileInfo.target))
        fs.writeFileSync(fileInfo.alias, fileInfo.content.replace('./', './' + moduleName + '/'))
        exports.log('[alias] %s ~ %s', fileInfo.realPath, fileInfo.alias)
    }
}

exports.compileFile = function (filePath, targetPath, next) {
    var content = fs.readFileSync(filePath, {encoding: 'utf8'})
    var extname = path.extname(filePath).toLowerCase().substr(1)
    var fileInfo = {
        realPath: filePath,
        extname: extname,
        rawContent: content, // 原始内容
        content: content, // 构建过程变化内容
        target: targetPath
    }
    // 如果有插件支持改类型文件处理
    if (plugin.hasOwnProperty(extname)) {
        plugin[extname].call({fileInfo: fileInfo}, function () {
            outputFile(fileInfo)
            next && next()
        })
    } else {
        outputFile(fileInfo)
        next && next()
    }
    return fileInfo
}

exports.compact = function (filePath, target, next) {
    var fold = path.resolve(process.cwd(), path.dirname(filePath))
    var tempDir = path.dirname(fold) + '/temp'
    sh.cp('-rf', fold, tempDir)
    sh.cp(filePath, path.resolve(tempDir, filePath))
    var tf = filePath.replace('.js', '.temp.js')
    var fileInfo = exports.compileFile(filePath, tf)
    if (fileInfo.deps) {
        fileInfo.deps.forEach(function (dep) {
            dep.source = path.resolve(tempDir, dep.source)
            dep.target = path.resolve(tempDir, dep.target)
            exports.compileFile(dep.source, dep.target)
        })
    }
    fileInfo.realPath = tf
    fileInfo.target = target || path.join(tempDir, '.bundle.js')
    plugin.compact.call({fileInfo: fileInfo}, next)
}

exports.compactFile = function (filePath, targetPath, next) {
    var fileInfo = exports.compileFile(filePath, targetPath, next)
    plugin.compact.call({fileInfo: fileInfo}, next)
}

exports.compileDir = function (folderName) {
    sourceDir = folderName
    targetDir = path.resolve(folderName, '../output')

    var pwd = process.cwd()
    readConfig(pwd)
    var packList = []

    exports.log('[compileDir] %s', sourceDir)

    // 开始遍历文件夹
    var walker = walk.walk(sourceDir, {
        followLinks: false,
        filters: ['doc', 'output', 'node_modules']
    })

    walker.on('file', function (root, fileStats, next) {
        var filePath = path.resolve(root, fileStats.name)
        var targetPath = filePath.replace(sourceDir, targetDir)
        var fileInfo = exports.compileFile(filePath, targetPath, next)
        if (fileInfo.target.match(/index.js$/)) {
            packList.push(fileInfo.target)
        }
    })

    walker.on('directory', function (root, dirStat, next) {
        var dirname = path.resolve(root, dirStat.name)
        var tdir = dirname.replace(sourceDir, targetDir)
        sh.mkdir('-p', tdir)
        next()
    })

    walker.on('errors', function (root, nodeStatsArray, next) {
        next()
    })

    // 构建结束打包所有文件
    walker.on('end', function () {
        exports.log('[compileDir finished] %s', folderName)
        packList.forEach(function (filePath) {
            var target = filePath.replace('index.js', 'bundle.js')
            exports.compactFile(filePath, target, function () {
                exports.log('[compact] %s', target)
            })
        })
    })
}

exports.log = function (...args) {
    console.log(...args)
    // verbose
}
