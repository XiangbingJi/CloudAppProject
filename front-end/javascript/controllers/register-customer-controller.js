angular.module('customerApp')
.controller('registerCustomerCtrl', function($scope, $http, sharedProperties) {

	$('#myModal').on('shown.bs.modal', function () {
  		$('#myInput').focus()
	})
	$scope.logCustomer = function(){
		console.log($scope.customer);
	}
	$scope.displayAddress=false;
	$scope.customer = {};
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
	$scope.submit = function(check){
		console.log($scope.customer);
		$scope.loginValid= check;
		if ($scope.loginValid) {
			// get email check if it exists
			// put
			var APIRoot = sharedProperties.getAPIRoot();
			var POSTData = {
					'firstname' : $scope.customer.firstname,
					'lastname' : $scope.customer.lastname,
					'phone_num' : $scope.customer.phonenumber,
					'email' : $scope.customer.email,
					'address' : $scope.customer.address.UUID
				};
			console.log(POSTData);
			$http({
				method : "POST",
				url : APIRoot + "customer/",
				data: POSTData
			}).then(function(response){
				window.location = "#/";
			}, function(response){
				console.log("error");
				console.log(response);
			});
		} else {
			console.log("input is not valid");
		}

	}

	$scope.replaceSpaceWithPlus = function(str){
		return str.split(" ").join("+");
	}
	$scope.selectAddress = function(address){
		var verificationURLRoot = 'https://us-street.api.smartystreets.com/street-address?auth-id=4374541424434028&candidates=1&';
		var queryStr = "";
		queryStr += "street="+ $scope.replaceSpaceWithPlus(address.street_line);
		queryStr += "&city=" + $scope.replaceSpaceWithPlus(address.city);
		queryStr += "&state=" + $scope.replaceSpaceWithPlus(address.state);
		var getURL = verificationURLRoot + queryStr;
		console.log(getURL);
		$http({
			method : "GET",
			url : verificationURLRoot + queryStr
		}).then(function(response){
			//console.log(response.data);	
			if(response.data.length == 0){
				//Display warning message
				address.button_class = "btn-warning";
				address.button_text = "Invalid";
				
			} else {
				var APIRoot = sharedProperties.getAPIRoot();
				var addressComponents = response.data[0].components;
				var POSTData = {
						'street' : addressComponents.street_name + " " + addressComponents.street_suffix,
						'number' : addressComponents.primary_number,
						'city' : addressComponents.city_name,
						'state' : addressComponents.state_abbreviation,
						'zipcode' : addressComponents.zipcode
					};
				$http({
					method : "POST",
					url : APIRoot + "address",
					data: POSTData
				}).then(function(response){

					var new_UUID = response.data.UUID;
					$scope.customer.address = POSTData;
					$scope.customer.address.UUID = new_UUID;
					$("#myModal").modal('hide');
					$scope.displayAddress = true;
					console.log($scope.customer);
					/*
					$http({
						method : "PUT",
						url : $scope.customer.href,
						data: {
							'address': new_UUID,
						}

					}).then(function(response){
						console.log("putting successed");
						$("#myModal").modal('hide');


						//refresh customer data
						APIRoot = sharedProperties.getAPIRoot();
						$http({
							method : "GET",
							url : APIRoot + "customer/" + $scope.customer.email
						}).then(function(response){
							var data = response.data;
							addressHref = response.data.address.href;			
							$http({
								method : "GET",
								url : addressHref
							}).then(function(response){

								data['address'] = response.data;
								//Temperary hack, I don't really need to do this
								data['address']['href'] = addressHref;
								console.log(data);
								$scope.customer = JSON.parse(JSON.stringify(data));
								
							}, function(){
								console.log("get on address is not working");
								$scope.customer = JSON.parse(JSON.stringify(data));
							})
						}, function(response){
							console.log("customer refreshing fail");
						});



					}, function(){
						console.log("putting failed")
					});
					*/

				}, function(){
					console.log("post on address is not working");
				})
				

			}

			
		}, function(response){
			console.log("address confirmation fail");
		});
	}
	$scope.autocompleteAddress = function(){
		var urlRoot = 'https://us-autocomplete.api.smartystreets.com/suggest?auth-id=4374541424434028&';
		var address = $scope.address;
		var addressQueryStr = "";
		if(address.line1){
			addressQueryStr = addressQueryStr + address.line1.split(" ").join("+");
		}
		if(address.city){
			if(addressQueryStr.length != 0) addressQueryStr = addressQueryStr + "+";
			addressQueryStr = addressQueryStr + address.city.split(" ").join("+");
		}
		if(address.state){
			if(addressQueryStr.length != 0) addressQueryStr = addressQueryStr + "+";
			addressQueryStr = addressQueryStr + address.state.split(" ").join("+");
		}
		if(address.zipcode){
			if(addressQueryStr.length != 0) addressQueryStr = addressQueryStr + "+";
			addressQueryStr = addressQueryStr + address.zipcode.split(" ").join("+");
		}
		console.log("Querystr for autocomplete is [" + addressQueryStr + "]");
		$http({
			method : "GET",
			url : urlRoot + "prefix=" + addressQueryStr
		}).then(function(response){

			$scope.addressSuggestions = response.data.suggestions;
			for(var i in $scope.addressSuggestions){
				($scope.addressSuggestions)[i].button_class='btn-primary';
				($scope.addressSuggestions)[i].button_text='Select';
			}
			console.log($scope.addressSuggestions);
		}, function(response){
			console.log("autocomplete query fail");
		});
	}
});