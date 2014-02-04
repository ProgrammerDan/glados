'use strict';

/* Controllers */

var gladosControllers = angular.module('gladosControllers', [])
gladosControllers.controller('PlayerListCtrl', ['$scope', '$http', '$stateParams', function($scope, $http, $stateParams) {
  $scope.token = $stateParams.token;
  $scope.minecraftName = $stateParams.minecraftName;
  $scope.redditName = $stateParams.redditName;
  $scope.host = '216.249.101.26';
  $http.get('http://' + $scope.host + ':3000/playerlist').success(function(data) {
    $scope.allPlayers = data;
  });
  $http.get('http://' + $scope.host + ':3000/players').success(function(data) {
    $scope.players = data;
    console.log(data);
  });
  $scope.submit = function () {
    console.log('hey');
    $scope.query = '';
    if($scope.query) {
      console.log($scope.query);
      setPage('details', {playerUsername: $scope.query});
    }
  };
}]);

gladosControllers.controller('PlayerCtrl', ['$scope', '$routeParams', '$stateParams', '$http', function($scope, $routeParams, $stateParams, $http) {
  $scope.host = 'localhost';
  console.log($routeParams);
  $http.get('http://' + $scope.host + ':3000/civbounty/perpetrators/active/').success(function(data) {
    for (var i = 0; i < data.perpetrators.length; i++) {
      if(data.perpetrators[i].name === $stateParams.playerUsername) {
        $http.get('http://' + $scope.host + ':3000/civbounty/perpetrators/' + data.perpetrators[i].id + '.json').success(function(perpData) {
          $scope.perpData = perpData.active_reports;
          $scope.bounty = perpData.active_reports[0].bounty;
        });
      }
    }
  });
  console.log('2heeeeey');
  console.log($stateParams);
  console.log('2heeeeey');
  // console.log('heyheyhey');
  // console.log($scope.token);
  // console.log('heyheyhey');
  $http.get('http://' + $scope.host + ':3000/entries?limit=100&token=' + $scope.token + '&username=' + $stateParams.playerUsername).success(function(data) {
    console.log('hey!');
    $scope.entries = data;
  });

  console.log($stateParams.playerUsername);
  $http.get('http://' + $scope.host + ':3000/players/login?limit=1&logout=false&username=' + $stateParams.playerUsername).success(function(loginData) {
    $scope.loginDate = loginData[0].date;
    var online = '';
    for(var i = 0; i < $scope.players.length; i++) {
      if($scope.players[i].username === $stateParams.playerUsername) {
        $scope.online = true;
      }
    }
    $http.get('http://' + $scope.host + ':3000/players/login?limit=1&logout=true&username=' + $stateParams.playerUsername).success(function(logoutData) {
      $scope.logoutDate = logoutData[0].date;
    });
  });
  
  $scope.orderProp = 'date';
  $scope.orderReverse = {
    snitchName: false,
    date: true,
    snitchGroup: false
  };
  $scope.playerUsername = $stateParams.playerUsername;
}]);

gladosControllers.controller('PlayersAboutCtrl', ['$scope', '$http', function($scope, $http) {
}]);

gladosControllers.controller('LoggedInCtrl', ['$scope', '$routeParams', '$stateParams', '$http', function($scope, $routeParams, $stateParams, $http) {
  console.log($stateParams);
  $scope.token = $stateParams.token;
  $scope.minecraftName = $stateParams.minecraftName;
  $scope.redditName = $stateParams.redditName;
}]);
