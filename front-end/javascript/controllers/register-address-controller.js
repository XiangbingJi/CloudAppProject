angular.module('customerApp')
.controller('registerAddressCtrl', function($scope,sharedProperties) {

	$scope.customerInfo = {};

	$scope.getInfo = function (){
		$scope.customerInfo = sharedProperties.getInfo();
		// customerInfo is the obj with customer Infomation get from the previous page
		console.log($scope.customerInfo);
	}

	$scope.validInfo = true;
	$scope.submit = function(){
		//check function
		if ($scope.validInfo) {
			// put
			window.location = "#/";
		}
		else {
			$scope.validInfo = false;
		}

	}
});