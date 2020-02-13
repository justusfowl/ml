var fs = require('fs');

function base64_encode(file) {
    var fileObj = fs.readFileSync(file);
    return new Buffer.from(fileObj).toString('base64');
}

module.exports = {
    base64_encode
}