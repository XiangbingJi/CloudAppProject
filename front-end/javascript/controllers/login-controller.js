angular.module('customerApp')
.controller('loginCtrl', function($scope,$http, sharedProperties) {

	$scope.loginValid = true;
	$scope.attemptLogin = function(check){
		if(!check){
			return;
		}

		// get, see if email already in DB

		APIRoot = sharedProperties.getAPIRoot();
		$http({
			method : "GET",
			url : APIRoot + "customer/" + $scope.loginEmail
		}).then(function(response){
			data = response.data;
			addressHref = response.data.address.href;			
			$http({
				method : "GET",
				url : addressHref
			}).then(function(response){

				data['address'] = response.data;
				//Temperary hack, I don't really need to do this
				data['address']['href'] = addressHref;
				sharedProperties.setInfoObj(data);
				window.location = "#/update";
			}, function(){
				console.log("get on address is not working");
				sharedProperties.setInfoObj(data);
				window.location = "#/update";
			})
		}, function(response){
			$scope.loginValid = false;
			$scope.errorMessage = "email doesn't exist";
		});
	}
});