angular.module('customerApp')
.controller('updateCtrl', function($scope) {

	//get
	$scope.firstname = "Donald";
	$scope.lastname = "Trump";
	$scope.phoneNumber = "1234567890";
	$scope.state = "NY";
	$scope.city = "New York";
	$scope.street = "5th Avenue";
	$scope.number = "725";
	$scope.zipcode = "10022";

	$scope.validInfo = true;
	$scope.submit = function(){
		//check function
		if ($scope.validInfo) {
			// post
			window.location = "#/";
		}
		else {
			$scope.validInfo = false;
		}

	}
	$scope.delete = function(){
		// delete
		window.location = "#/";
	}
});