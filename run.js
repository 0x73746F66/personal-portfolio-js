#!/bin/env node

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
//async       = require('async'),
    socketio = require('socket.io'),
    express = require('express'),
    db = require('./data/api'),
    app = require('./helpers'),
    router = express(),
    server = http.createServer(router),
    io = socketio.listen(server),

    room_db = new db.Ns('room'),
    user_db = new db.Ns('user'),
    rooms = {};

router.use(express.static(path.resolve(__dirname, 'client')));

fs.readdir(__dirname + '/data/room', function (err, files) {
    "use strict";
    if (err) {
        app.log(err);
    }
    files.forEach(function (fileName) {
        var roomName = fileName.replace('.json', '');
        room_db.get(roomName, function (data) {
            rooms[roomName] = data;
        });
    });
});
var userJoinRoom = function (profile) {
    "use strict";
    if (!rooms[profile.room].members[profile.gid]) {
        rooms[profile.room].members[profile.gid] = {
            admin: false,
            owner: false
        };
    } else {
        rooms[profile.room].members[profile.gid].online = true;
    }
    rooms[profile.room].members[profile.gid].name = profile.name;
    rooms[profile.room].members[profile.gid].image = profile.image;
    rooms[profile.room].members[profile.gid].color = profile.color;
    rooms[profile.room].members[profile.gid].url = profile.url;
};
// emit everyone                                connection.emit( 'message' , resp );
// emitOthers                                   socket.broadcast.emit( 'message' , resp );
// emitSelf                                     socket.emit( 'message' , resp );
// all in room                                  socket.broadcast.to( room ).emit(' message' , resp );

io.of('/landing').on('connection', function (socket) {
    "use strict";
    var sockets = [];
    sockets.push(socket);

    socket.on('connect', function (data) {
        try {
            var profile = {};
            if (!data.gid) {
                profile = app.defaultProfile();
                socket.emit('update-profile', profile);
                socket.emit('checkLogin', {});
            } else {
                user_db.get(data.gid, function (profile) {
                    socket.emit('auth', profile);
                });
            }
        } catch (e) {
            app.log(e);
        }
    });
});
var connection = io.of('/app').on('connection', function (socket) {
    "use strict";
    var sockets = [];
    sockets.push(socket);

    socket.on('login', function (data) {
        try {
            socket.set('gid', data.gid, function (err) {
                if (err) {
                    app.log(err);
                }
                user_db.check(data.gid, function () {
                    user_db.get(data.gid, function (profile) {
                        profile.image = data.image;
                        userJoinRoom(profile);
                        socket.join(profile.room);
                        connection.emit('rooms', rooms);
                        socket.broadcast.to(profile.room).emit('roomUserJoin', profile);
                        rooms[profile.room].messages.forEach(function (message) {
                            socket.emit('receive-message', message);
                        });
                        socket.emit('auth', profile);
                        socket.emit('alert', {
                            type: 'success',
                            msg: "Welcome! Open Group Chat can be configured in the top right icon."
                        });
                        user_db.set(data.gid, profile);
                    });
                }, app.defaultProfile(data.gid));
            });
        } catch (e) {
            app.log(e);
        }
    });

    socket.on('disconnect', function () {
        try {
            socket.get('gid', function (err, gid) {
                if (err) {
                    app.log(err);
                }
                if (gid) {
                    app.log(gid + ' disconnected');
                    user_db.get(gid, function (profile) {
                        rooms[profile.room].members[gid].online = false;
                        socket.leave(profile.room);
                        socket.broadcast.to(profile.room).emit('roomUserLogout', profile);
                        connection.emit('rooms', rooms);
                    });
                }
            });
        } catch (e) {
            app.log(e);
        }
    });

    socket.on('save-settings', function (settings) {
        try {
            socket.get('gid', function (err, gid) {
                if (err) {
                    app.log(err);
                }
                user_db.get(gid, function (profile) {
                    profile.settings = settings;
                    profile.name = settings.name;
                    profile.color = settings.color;
                    profile.url = settings.url;
                    rooms[profile.room].members[gid].name = settings.name;
                    rooms[profile.room].members[gid].color = settings.color;
                    rooms[profile.room].members[gid].url = settings.url;
                    user_db.set(gid, profile);
                    socket.emit('alert', {
                        type: 'success',
                        msg: "Settings Updated."
                    });
                    connection.emit('rooms', rooms);
                    socket.emit('update-profile', profile);
                });
            });
        } catch (e) {
            app.log(e);
        }
    });

    socket.on('new-message', function (text) {
        try {
            var resp = {
                text: String(text || '')
            };
            socket.get('gid', function (err, gid) {
                if (err) {
                    app.log(err);
                }
                user_db.get(gid, function (profile) {
                    resp.color = profile.color;
                    resp.name = profile.name;
                    resp.image = profile.image;
                    socket.broadcast.to(profile.room).emit('new-message', resp);
                    rooms[profile.room].messages.push(resp);
                    if (rooms[profile.room].messages.length > 10) {
                        rooms[profile.room].messages = rooms[profile.room].messages.slice(1, 11);
                    }
                });
            });
        } catch (e) {
            app.log(e);
        }
    });

    socket.on('add-room', function (data) {
        try {
            if (data.private && data.password.length < 6) {
                socket.emit('alert', {
                    type: 'danger',
                    msg: 'password must be at least 6 characters'
                });
            }
            var roomId = app.camelcase(data.name);
            socket.get('gid', function (err, gid) {
                if (err) {
                    app.log(err);
                }
                if (!rooms[roomId]) {
                    rooms[roomId] = {
                        id: roomId,
                        name: data.name,
                        private: data.private,
                        password: String(data.password || ''),
                        created: new Date(),
                        owner: gid,
                        members: {},
                        messages: []
                    };
                    rooms[roomId].members[gid] = {online: false, admin: true, owner: true};
                    room_db.set(roomId, rooms[roomId]);
                    connection.emit('rooms', rooms);
                    socket.emit('alert', {
                        type: 'success',
                        msg: "Room " + data.name + " Created."
                    });
                } else {
                    socket.emit('alert', {
                        type: 'danger',
                        msg: data.name + ' exists'
                    });
                }
            });
        } catch (e) {
            app.log(e);
        }
    });

    socket.on('join-room', function (data) {
        try {
            socket.get('gid', function (err, gid) {
                if (err) {
                    app.log(err);
                }
                // @TODO check if already pre-auth for this room
                if (( !rooms[data.id].private ) || ( data.password.length > 2 && rooms[data.id].password === data.password )) {
                    user_db.get(gid, function (profile) {
                        // @TODO set pre-auth for this room
                        rooms[profile.room].members[gid].online = false;
                        socket.leave(profile.room);
                        socket.broadcast.to(profile.room).emit('roomUserLeft', profile);
                        profile.room = data.id;
                        userJoinRoom(profile);
                        socket.join(data.id);
                        socket.broadcast.to(profile.room).emit('roomUserJoin', profile);
                        socket.emit('update-profile', profile);
                        user_db.set(gid, profile);
                        connection.emit('rooms', rooms);
                        socket.emit('clear-messages');
                        rooms[data.id].messages.forEach(function (message) {
                            socket.emit('receive-message', message);
                        });
                    });
                } else {
                    socket.emit('alert', {
                        type: 'warning',
                        msg: 'incorrect password'
                    });
                }
            });
        } catch (e) {
            app.log(e);
        }
    });

    // @TODO edit room - must clear pre-auth if password changes

});

server.listen(process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 80, process.env.OPENSHIFT_NODEJS_IP || process.env.IP || "0.0.0.0", function () {
    "use strict";
    console.log("Chat server listening at", server.address().address + ":" + server.address().port);
});

