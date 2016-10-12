angular.module('customerApp')
.controller('registerCustomerCtrl', function($scope) {
	$scope.loginValid = true;
	$scope.redirect = function(check){
		console.log(check);
		$scope.loginValid= check;
		if ($scope.loginValid) {
			// get email check if it exists
			// put
			window.location = "#/register/address";
		}
		else {
			$scope.loginValid = false;
		}

	}
});