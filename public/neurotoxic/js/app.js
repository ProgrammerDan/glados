// 'use strict';


// // Declare app level module which depends on filters, and services
// var gladosApp = angular.module('gladosApp', ['ngRoute', 'ui.router', 'gladosControllers']);
// // gladosApp.config(['$routeProvider',
// //     function($routeProvider) {
// //       $routeProvider.
// //         when('/players', {
// //           templateUrl: 'partials/playerlist.html',
// //           controller: 'PlayerListCtrl'
// //         });
// //       $routeProvider.
// //       when('/players/:playerUsername', {templateUrl: 'partials/player.html', controller: 'PlayerCtrl'});
// //       $routeProvider.otherwise({redirectTo: '/players'});
// // }]);

// gladosApp.config(['$stateProvider', /*'$urlRouterProvider',*/ function($stateProvider/*, $urlRouterProvider*/) {
//   // $urlRouterProvider.otherwise('/players');
//   var players = {
//     name: 'players',
//     url: '/',
//     templateUrl: 'partials/players.html'
//   };
//   var playersList = {
//     name: 'list',
//     url: '/players',
//     parent: 'players',
//     templateUrl: 'partials/players.list.html',
//     controller: 'PlayerListCtrl'
//   };
//   var playersDetails = {
//     name: 'details',
//     url: '/players/:playerUsername',
//     parent: 'players',
//     templateUrl: 'partials/players.details.html',
//     controller: 'PlayerCtrl'
//   };

//   $stateProvider.state(players);
//   $stateProvider.state(playersList);
//   $stateProvider.state(playersDetails);
// }])
// .run(['$state', function ($state) {
//   $state.transitionTo('players'); 
// }])

// function MainCtrl ($state) {
//   $state.transitionTo('list');
// };

angular.module('gladosApp', ['ui.router', 'ngRoute', 'gladosControllers'])
    .config(['$stateProvider', function ($stateProvider) {
        var players = {
          name: 'players',
          url: '/:token/:minecraftName/:redditName',
          templateUrl: 'partials/players.html',
          controller: 'PlayerListCtrl'
        };
        var playersAbout = {
          name: 'about',
          url: '/about',
          parent: players,
          templateUrl: 'partials/players.about.html',
          controller: 'PlayersAboutCtrl'
        };
        var playersDetails = {
          name: 'details',
          url: '/player/:playerUsername',
          parent: players,
          templateUrl: 'partials/players.details.html',
          controller: 'PlayerCtrl'
        };
        var loggedIn = {
          name: 'loggedin',
          url: '/loggedin/:token/:minecraftName/:redditName',
          templateUrl: 'partials/loggedin.html',
          controller: 'LoggedInCtrl'
        };
    
        $stateProvider.state(players);
        $stateProvider.state(playersDetails);
        $stateProvider.state(playersAbout);
        $stateProvider.state(loggedIn);
    }])
    .run(['$state', function ($state) {
       $state.transitionTo('players'); 
    }])

    .controller('MainCtrl', function ($scope, $state) {

    setPage = function (page) {
        $state.go(page);
    };
});
