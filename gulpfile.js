var gulp = require('gulp'),
    fs = require('fs-extra'),
    glob = require('glob'),
    exec = require('child_process').exec,
    uuid = require('node-uuid')

var watcher = gulp.watch('Temp/UnityTempFile-*', ['compile'])

var directoryName = __dirname.split("/").reverse()[0]

// default config
var config = {
    version: "0.0.0",
    organisation: "Organisation",
    module: "MyFirstModule",
    packageType: "UnityExtension",
    unityversions: ["4.6", "5.0"],
    defines: {
        "4.6": [
            "UNITY_4_6"
        ],
        "5.0": [
            "UNITY_5_0"
        ],
        "all": [
            "DEBUG"
        ]
    }
}

fs.readJson('./module-config.json', function (err, json) {
    if (err) return console.error(err)
    config = json
})

gulp.task('default', function () {
    if (fs.exists('build/')) {
        fs.unlink('build/')
    }
    watcher.on('change', function (event) {
        if (event.type == "added")
            config.unityversions.forEach(function (unityversion) {
                fs.copySync(event.path, event.path.replace("UnityTempFile-", unityversion + "_UnityTempFile-"))
            })
    })
});


function removeDefine(unityversion) {
    getTempFiles(unityversion).forEach(function (file) {
        var data = fs.readFileSync(file, {encoding: 'utf8'}).replace(/^-define:.*$[\s\S]/mg, '');
        fs.writeFileSync(file, data)
    })
}


function removeModuleReference(unityversion) {
    getTempFiles(unityversion).forEach(function (file) {
        var data = fs.readFileSync(file, {encoding: 'utf8'}).replace(/^-r:'.*[Data\\|Contents\/]UnityExtensions\/[^Unity\/].*'$[\s\S]/mg, "")
        fs.writeFileSync(file, data)
    })
}

function replaceOut(unityversion, path) {

    getTempFiles(unityversion).forEach(function (file) {
        var data = fs.readFileSync(file, {encoding: 'utf8'});
        pattern = /^\-out:'Temp\/(.*)\.dll'$/m
        editor_pattern = /-Editor/
        firstpass_pattern = /-firstpass$/
        if (pattern.test(data)) {
            match = data.match(pattern);
            out = path

            from = match[1]
            to = directoryName

            if (editor_pattern.test(from))
                to += from.match(editor_pattern)

            if (firstpass_pattern.test(from)) {
                to += from.match(firstpass_pattern)
                out += "Standard Assets/"
            }

            if (editor_pattern.test(from))
                out += "Editor/"


            exec('mkdir -p \'' + out + '\'')

            dll = out + to + ".dll"

            console.log('compiling ' + dll)
            fs.writeFileSync(file, data.replace(pattern, "-out:'" + dll + "'"))
        }
    })
}

function appendDefine(unityversion) {

    defines = []

    if (config.hasOwnProperty('defines')) {
        if (config.defines.hasOwnProperty(unityversion)) {
            defines = defines.concat(config.defines[unityversion])
        }

        if (config.defines.hasOwnProperty('all')) {
            defines = defines.concat(config.defines['all'])
        }
    }
    getTempFiles(unityversion).forEach(function (file) {
        data = fs.readFileSync(file, {encoding: 'utf8'});


        defines.forEach(function (define) {
            data += '-define:' + define + '\n'
        })
        fs.writeFileSync(file, data)
    })
}

gulp.task('compile', function () {
    config.unityversions.forEach(function (unityversion) {


        path = 'build/' + config.organisation + '/' + config.module + '/' + unityversion + '/'

        removeDefine(unityversion)
        removeModuleReference(unityversion)
        replaceOut(unityversion, path)

        appendDefine(unityversion)

        getTempFiles(unityversion).forEach(function (file) {
            exec("mcs -sdk:2 " + jointLine(file))
            fs.unlink(file)
        })

        ivy = template_ivy

        ivy = ivy.replace("#VERSION#", config.version)
            .replace("#ORGANISATION#", config.organisation)
            .replace("#MODULE#", config.module)
            .replace("#PACKAGETYPE#", config.packageType)
            .replace("#UNITYVERSION#", unityversion)

        artifactNames = glob.GlobSync(path + "/**/*.dll").found
        artifacts = []
        for (var i = 0; i < artifactNames.length; i++) {
            artifactName = artifactNames[i].split(unityversion)[1].substring(1).replace(/\.dll$/, '')
            artifact = template_artifact
            artifact = artifact.replace("#NAME#", artifactName)
                .replace("#GUID#", guid())
            sleep(0.1)
            artifacts.push(artifact)

        }

        ivy = ivy.replace("#ARTIFACTS#", artifacts.join('\n') + '\n')
        ivy_path = path + "ivy.xml"
        fs.exists(ivy_path) ? fs.writeFileSync(ivy_path, ivy) : fs.outputFileSync(ivy_path, ivy)
    })
});

function jointLine(file) {
    var data = fs.readFileSync(file, {encoding: 'utf8'});
    return data.replace(/$[\s\S]/mg, ' ');
}

function getTempFiles(unityversion) {
    return glob.GlobSync("Temp/" + unityversion + "_UnityTempFile-*").found
}
function guid() {
    return uuid.v1().replace(/-/g, '')
}

function sleep(second) {
    var e = new Date().getTime() + (second * 1000);
    while (new Date().getTime() <= e) {
    }
}

var template_ivy = '<?xml version="1.0" encoding="utf-8"?>\n'
template_ivy += '<ivy-module version="2.0">\n'
template_ivy += '  <info version="#VERSION#" organisation="#ORGANISATION#" module="#MODULE#" e:packageType="#PACKAGETYPE#" e:unityVersion="#UNITYVERSION#" xmlns:e="http://ant.apache.org/ivy/extra" />\n'
template_ivy += '  <publications xmlns:e="http://ant.apache.org/ivy/extra">\n'
template_ivy += '#ARTIFACTS#'
template_ivy += '  </publications>\n'
template_ivy += '</ivy-module>\n'

var template_artifact = '    <artifact name="#NAME#" type="dll" ext="dll" e:guid="#GUID#" />'