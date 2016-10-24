/**
 * Created by COMLOG GmbH on 21.10.2016.
 */

var req = require('../');
/*var start = (new Date()).getTime();
console.info('Start cached:'+start);
for(var i=0; i < 100; i++) {
    req.cached('http://test.speedorder.local/js/jquery-3.1475578826.min.js', function (err, res) {
        console.info((new Date()).getTime()-start);
    });
}

var start = (new Date()).getTime();
console.info('Start normal:'+start);
for(var i=0; i < 100; i++) {
    req('http://test.speedorder.local/js/jquery-3.1475578826.min.js', function (err, res) {
        console.info((new Date()).getTime()-start);
    });
}*/

req.cached.clear(function (errors, success) {
    console.info(success);
    console.error(errors);
});
