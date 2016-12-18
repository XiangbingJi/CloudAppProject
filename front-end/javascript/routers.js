angular.module('customerApp')
 .config(function($routeProvider){
 	$routeProvider.when('/',{
 		templateUrl: 'templates/login.html',
 		controller: 'loginCtrl'
 	})
 	.when('/register/customer',{
 		templateUrl: '/templates/register-customer.html',
 		controller: 'registerCustomerCtrl'
 	})
 	.when('/register/address',{
 		templateUrl: '/templates/register-address.html',
 		controller: 'registerAddressCtrl'
 	})
 	.when('/update',{
 		templateUrl: '/templates/update.html',
 		controller: 'updateCtrl',
 		authenticated: true
 	})
 	.otherwise({ redirectTo: '/' });
});