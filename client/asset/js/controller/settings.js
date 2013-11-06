var app = window.ogc;

app.module.controller('SettingsCtrl', function ($scope) {
    "use strict";
    $scope.profile = {};
    $scope.auth = false;

    app.index.on('auth', function (data) {
        $scope.profile = data;
        $scope.auth = true;
        $scope.$apply();
    });

    app.index.on('update-profile', function (data) {
        $scope.profile = data;
        $scope.$apply();
    });

});
