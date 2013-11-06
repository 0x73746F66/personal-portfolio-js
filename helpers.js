exports.capitalize = function (str, allWords) {
    "use strict";
    if (allWords) {
        return str.split(' ').map(function (word) {
            return exports.capitalize(word);
        }).join(' ');
    }
    return str.charAt(0).toUpperCase() + str.substr(1);
};
exports.camelcase = function (str, uppercaseFirst) {
    "use strict";
    return str.replace(/[^\w\d ]+/g, '').split(' ').map(function (word, i) {
        if (i || (0 === i && uppercaseFirst)) {
            word = exports.capitalize(word);
        }
        return word;
    }).join('');
};
exports.underscore = function (str) {
    "use strict";
    return str.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();
};
exports.log = function (e) {
    "use strict";
    console.log(e);
    var fs = require('fs'),
        path = require('path'),
        doc_root = path.resolve(__dirname);
    fs.open(doc_root + "/client/logs/server.log", 'a', 666, function (err, id) {
        if (err) {
            console.log(err);
        }
        fs.write(id, e, null, 'utf8', function (err) {
            if (err) {
                console.log(err);
            }
            fs.close(id, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        });
    });
};
exports.defaultProfile = function (gid) {
    "use strict";
    return {
        gid: gid || false,
        name: 'Anonymous',
        url: '',
        color: '#333',
        image: '/asset/img/anonymous.gif',
        mod: false,
        room: 'Lobby',
        settings: {
            notifications: false,
            leave: false,
            join: false,
            login: false,
            lobby: false,
            messages: 10
        }
    };
};