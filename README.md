# Cached request version

Allow you send cached requests. Depends on "request" module https://github.com/request/request/.
No extra configuration needed.

#### Installation
```sh
$ npm install -s cachedrequest
```

#### Simple:
```javascript
var request = require('cachedrequest');
request.cached('http://www.comlog.org', function(err, response, body) {
    console.info(response);
});
```

#### Set cache direcotry:
```javascript
var request = require('cachedrequest');
request.setCacheDirectory('/my/path/to/cache/folder');
request.cached('http://www.comlog.org', function(err, response, body) {
    console.info(response);
});
```

#### Clear cache:
```javascript
var request = require('cachedrequest');
request.setCacheDirectory('/my/path/to/cache/folder'); // if not standard
request.clearCache(function(errors, removed) {
    console.error(errors);
    console.info(removed);
});
```
