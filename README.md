# Translate vue single file to js

## use as a lib

```js
var tue = require('tue')

// single file
tue.compact(sourFilePath, targetfilePath)

// compile Director
tue.compileDir(flags.dir)

```

## use in client command

```sh
npm install tue -g

## get helper
tue --help

## compile single vue to js file
tue -s ./App.vue -t ./App.js

## compile folders
tue -d ./source
```

## project config

config in ${projectDir}/package.json

```js
{
  "buildConf": {
    "output": "./output",
    "source": "./test",
    "main": "index.js",
    "bundle": "bundle.js",
    "minify": true
  }
}
```

