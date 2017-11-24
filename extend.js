/**
 * Created by Anatolij on 25.10.2016.
 */

const _os = require('os'),
    _crypto = require('crypto'),
    _fs = require('fs'),
    _path = require('path');

var
    cacheDirectory = _os.tmpdir(),
    prefix = 'cr_';

/* !-- Temp verzeichniss oder Link Finden --> */
try {
	if (!_fs.statSync(cacheDirectory).isDirectory()) {
		throw new Error('Kein temp');
	}
} catch (e) {
	var check = [
		_path.dirname(__filename)+_path.sep+'temp',
		_path.dirname(_path.dirname(__filename))+_path.sep+'temp',
		_path.dirname(_path.dirname(_path.dirname(__filename)))+_path.sep+'temp',
		_path.dirname(_path.dirname(_path.dirname(_path.dirname(__filename))))+_path.sep+'temp'
	];
	while(check.length > 0) {
		var p = check.shift();
		try {
			if (_fs.statSync(p).isDirectory()) {
				cacheDirectory = p;
				break;
			}
		} catch (e) {}
	}
}
/* <-- Temp verzeichniss oder Link Finden --! */

module.exports = function(request) {

    var uriToCachePath = function(uri) {
        var md5sum = _crypto.createHash('md5');
        md5sum.update(uri && uri.uri ? uri.uri : (uri && uri.url ? uri.url : uri));
        return _path.normalize(cacheDirectory + _path.sep + prefix + md5sum.digest('hex') + '.json');
    }

    var saveCache = function(uri, data, callback) {
        callback = callback || data;

        // Expires from cache-control
        if (!data.headers['expires'] && data.headers['cache-control']) {
            var maxAgePos = -1;
            if ((maxAgePos = data.headers['cache-control'].toUpperCase().indexOf('MAX-AGE=')) > -1) {
                var maxAgePosEnd = data.headers['cache-control'].indexOf(',', maxAgePos);
                if (maxAgePosEnd < maxAgePos) maxAgePosEnd = data.headers['cache-control'].length;
                var maxAge = data.headers['cache-control'].substring(maxAgePos+8, maxAgePosEnd).trim();
                if (!isNaN(maxAge)) {
                    maxAge = parseInt(maxAge);
                    var expires = new Date();
                    expires.setTime(expires.getTime()+maxAge*1000);
                    data.headers['expires'] = expires+'';
                }
            }
        }

        // no-cache
        if (data.headers['pragma'] && data.headers['pragma'].toUpperCase().indexOf('NO-CACHE') > -1) {
            callback(null, null);
        }

        // expired
        if (data.headers['expires']) {
            var expires = new Date(data.headers['expires']);
            if (expires.getTime() < (new Date()).getTime()) callback(null, null);
        }

        var cacheFile = uriToCachePath(uri);
        _fs.unlink(cacheFile, function(uerr) {
            _fs.writeFile(cacheFile, JSON.stringify(data), function(err) {
                callback(err, cacheFile);
            });
        });
    };

    var readCache = function(uri, callback) {
        var cacheFile = uriToCachePath(uri);
        _fs.readFile(uriToCachePath(uri), 'utf8',  function(err, data) {
            if (err)
                callback(null);
            else {
                var data = JSON.parse(data);
                // cache check
                if (data.headers.expires) {
                    expires = new Date(data.headers.expires);
                    if ((new Date()).getTime() > expires.getTime()) {
                        callback(null);
                    } else {
                        callback(data);
                    }
                }
                else {
                    if (data.headers['last-modified']) {
                        request.head(uri, function(err, response) {
                            if (err) {
                                callback(null);
                            }
                            else if (response.headers['last-modified']) {
                                var d1 = new Date(data.headers['last-modified']);
                                var d2 = new Date(response.headers['last-modified']);
                                if (d1.getTime() == d2.getTime()) {
                                    response.body = data.body;
                                    callback(response);
                                } else {
                                    callback(null);
                                }
                            }
                            else {
                                callback(null);
                            }
                        });
                    }
                    else {
                        callback(null);
                    }
                }
            }
        });
    };

    var _apply = function (method, uri, options, callback) {
        var cb = callback || options;
        //if (!options.headers) options.headers = {};
        //options.headers['Cache-Control'] = 'max-age=0';
        readCache(uri, function(data) {
            if (!data) {
                var f = !method ? request : request[method];
                var r = f(uri, options, function (err, response, body) {
                    if (err)
                        cb(err, response);
                    else
                        saveCache(uri, response, function (err2, cacheFile) {
                            console.info(cacheFile);
                            cb(err2, response);
                        });
                });
            } else {
                cb(null, data, data.body);
            }
        });
    };

    /**
     * Send cached request
     * @param {string} uri
     * @param {object|Function} options settings or Calback function
     * @param {Function} [callback]
     */
    if (!request.cached) request.cached = function (uri, options, callback) { return _apply(null, uri, options, callback); };
    if (!request.get.cached) request.get.cached = function (uri, options, callback) { return _apply('get', uri, options, callback); };
    if (!request.post.cached) request.post.cached = function (uri, options, callback) { return _apply('post', uri, options, callback); };
    if (!request.put.cached) request.put.cached = function (uri, options, callback) { return _apply('put', uri, options, callback); };
    if (!request.patch.cached) request.patch.cached = function (uri, options, callback) { return _apply('patch', uri, options, callback); };
    if (!request.del.cached) request.del.cached = function (uri, options, callback) { return _apply('del', uri, options, callback); };

    /**
     * Remove all cache data
     * @param {Function} cb
     */
    request.clearCache = function (cb) {
        var errors = [],
            success = [],
            handleFiles = function(files, hcb) {
                if (files && files.length > 0) {
                    var file = files.shift();
                    if (file.substr(0, prefix.length) == prefix && file.substr(file.length - 4) == 'json') {
                        _fs.unlink(cacheDirectory+_path.sep+file, function (err) {
                            if (err) errors.push(cacheDirectory+_path.sep+file);
                            else success.push(cacheDirectory+_path.sep+file);
                            handleFiles(files, hcb);
                        });
                    }
                    else {
                        handleFiles(files, hcb);
                    }
                }
                else {
                    cb(errors.length > 0 ? errors : null, success);
                }
            };

        _fs.readdir(cacheDirectory, function (err, files) {
            if (err) cb(err);
            else {
                handleFiles(files, cb);
            }
        });
    };

    request.setCacheDirectory = function(dir) {
        cacheDirectory = dir;
    };

    return request;
};