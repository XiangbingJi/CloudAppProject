angular.module('customerApp')
.controller('loginCtrl', function($scope) {
	$scope.loginValid = true;
	$scope.attemptLogin = function(check){
		$scope.loginValid= check
		// get, see if email already in DB
		if ($scope.loginValid) {
			window.location = "#/update";
		}
		else {
			$scope.loginValid = false;
			$scope.errorMessage = "email doesn't exist";
		}

	}
});