var app = window.ogc;

app.module.controller('IndexCtrl', function ($scope) {
    "use strict";
    $scope.profile = {};
    $scope.auth = false;
    $scope.newArticle = {};

    var newNotification = function (options) {
        var notification; // isWindowFocused = document.querySelector(":focus") === null ? false : true;
        if (window.Notification) { /* Safari 6, Chrome (23+) */
            notification = new Notification(options.title, {
                icon: options.icon,
                body: options.body,
                tag: options.tag
            });
        } else if (window.webkitNotifications) { /* FF with html5Notifications plugin installed */
            notification = window.webkitNotifications.createNotification(options.icon, options.title, options.body);
        } else if (navigator.mozNotification) { /* Firefox Mobile */
            notification = navigator.mozNotification.createNotification(options.title, options.body, options.icon);
        } else if (window.external && window.external.msIsSiteMode()) { /* IE9+ */
            //Clear any previous notifications
            window.external.msSiteModeClearIconOverlay();
            window.external.msSiteModeSetIconOverlay(options.icon, options.title);
            window.external.msSiteModeActivate();
            notification = {
                "ieVerification": Math.floor((Math.random() * 10) + 1) + 1
            };
        }
        //if (!isWindowFocused) notification.show();
        return notification;
    };

    app.index.on('auth', function (data) {
        $scope.profile = data;
        $scope.auth = true;
        $scope.$apply();
    });

    app.index.on('update-profile', function (data) {
        $scope.profile = data;
        $scope.$apply();
    });

    $scope.add = function () {
        app.connection.emit('add-article', $scope.newArticle);
        $scope.newArticle = {};
        jQuery('#newArticle').modal('hide');
    };
});
