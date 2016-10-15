angular.module('customerApp')
.controller('updateCtrl', function($scope,$http,sharedProperties) {

	console.log(sharedProperties.getInfoObj());
	$scope.customer = JSON.parse(JSON.stringify(sharedProperties.getInfoObj()));
	$scope.validInfo = true;

	$('#myModal').on('shown.bs.modal', function () {
  		$('#myInput').focus()
	})

	$scope.submit = function(){
		//check function
		if ($scope.validInfo) {
			// post
			var APIRoot = sharedProperties.getAPIRoot();
			var originalInfo = sharedProperties.getInfoObj();
			var customerKeyList = ['firstname', 'lastname', 'phonenumber'];
			var addressKeyList = [];
			var customerChanged = false;
			for(var ki in customerKeyList){
				var key = customerKeyList[ki];
				if($scope.customer[key] != originalInfo[key]){
					customerChanged = true;
				}
			}
			if(customerChanged){
				console.log("Puting");
				$http({
					method : "PUT",
					url : $scope.customer.href,
					data: {
						'firstname': $scope.customer.firstname,
						'lastname' : $scope.customer.lastname,
						'phone_num' : $scope.customer.phonenumber 
					}

				}).then(function(response){
					console.log("successed");

				}, function(){
					console.log("failed")
				})

			}
			//window.location = "#/";
		}
		//else {
			//$scope.validInfo = false;
		//}

	}
	$scope.delete = function(){
		// delete
		window.location = "#/";
	}
});