angular.module('customerApp')
.controller('registerAddressCtrl', function($scope) {
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