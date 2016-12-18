angular.module('customerApp')
.controller('updateCtrl', function($scope, $http,  sharedProperties, authFact) {

	//console.log(sharedProperties.getInfoObj());
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
					bootbox.alert({ 
					   size: "small",
					   title: "System message",
					   message: "Your Information is updated!", 
					   callback: function(){
					   	  window.location = "#/";
					   }
					});

				}, function(){
					console.log("putting failed")
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
				$http({
					method : "POST",
					url : APIRoot + "address",
					data: {
						'street' : addressComponents.street_name + " " + addressComponents.street_suffix,
						'number' : addressComponents.primary_number,
						'city' : addressComponents.city_name,
						'state' : addressComponents.state_abbreviation,
						'zipcode' : addressComponents.zipcode
					}
				}).then(function(response){

					var new_UUID = response.data.UUID;
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
			/*
			var verificationURLRoot = 'https://us-street.api.smartystreets.com/street-address?auth-id=4374541424434028&candidates=1&';
			suggestions = response.data.suggestions;
			
			confirmedSuggestions = [];
			for(var i in suggestions){
				var suggestion = suggestions[i];
				var queryStr = "";
				queryStr += "street="+ $scope.replaceSpaceWithPlus(suggestion.street_line);
				queryStr += "&city=" + $scope.replaceSpaceWithPlus(suggestion.city);
				queryStr += "&state=" + $scope.replaceSpaceWithPlus(suggestion.state);
				var getURL = verificationURLRoot + queryStr;
				$http({
					method : "GET",
					url : verificationURLRoot + queryStr
				}).then(function(response){
					if(response.data.length!= 0){
						confirmedSuggestions.push(response.data[0]);
						console.log(response.config.url + " confirmed")
					} else{
						console.log(response.config.url+ " can not be confirmed")
					}

				}, function(response){
					console.log("address confirmation fail");
				});

			}
			$scope.addressSuggestions = confirmedSuggestions;
			*/
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

	$scope.logout = function() {
		init();
	};



	$scope.deleteAccount = function() {
		var url = APIRoot + "customer/" + $scope.customer.email;
		console.log('break1');
		bootbox.confirm({ 
			size: "small",
			message: "Are you sure?", 
		    callback: function(result){
		    	if (result) {
		    		$http.delete(url).then(
		    			function(response){
		    			// success callback
				         init();
				         bootbox.alert({ 
						   size: "small",
						   title: "System message",
						   message: "Your Account is deleted", 
						   callback: function(){
						   	  window.location = "#/";
						   }
						});
				     }, 
				        function(response){
				           // failure call back
				           alert("Got a problem with deleteAccount");
				       }
				     )
		    	}
		    	else {
		    		window.location = "#/update";
		    	}
		    }
		})
	};

	function init() {
		console.log('break2');
		var obj = {};
		var accessToken = undefined;
		sharedProperties.setInfoObj(obj);
		authFact.setAccessToken(accessToken);
		window.location = "#/";
	}

});