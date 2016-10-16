angular.module('customerApp')
.controller('registerCustomerCtrl', function($scope, sharedProperties) {

	$scope.setInfo = function (firstName,lastName,email,phoneNumber){
		var customerInfo = {
			'firstname' :firstName,
			'lastname':lastName,
			'email': email,
			"phonenumber": phoneNumber
		};
		sharedProperties.setInfo(customerInfo);
	}

	$scope.loginValid = true;
	$scope.redirect = function(check){
		
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