angular.module('customerApp')
.controller('loginCtrl', function($scope, $http, sharedProperties, authFact) {

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
                authFact.setAccessToken('login');
                window.location = "#/update";
            }, function(){
                console.log("get on address is not working");
                sharedProperties.setInfoObj(data);
                authFact.setAccessToken('login');
                window.location = "#/update";
            })
        }, function(response){
            console.log('debug4');
            $scope.loginValid = false;
            $scope.errorMessage = "email doesn't exist";
        });
    }

    $scope.FacebookLogin = function() {
        console.log('debug1');
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                console.log('logged in');
                getFBInfo();
                console.log('debug2');

            }
            else if (response.status === 'not_authorized') {
                console.log('log into this app');
            }
            else {
                console.log('please loginto facebook');
                FBLogin();
                console.log('debug2');
            }

        });

        function getFBInfo() {
            var FBInfo = {};
            console.log('Welcome!  Fetching your information.... ');
            FB.api('/me', {fields: 'first_name, last_name, email' }, function(response) {
                console.log('Successful login for: ' + response.first_name);
                console.log(response);
                var accessToken = FB.getAuthResponse().accessToken;
                console.log(accessToken);
                authFact.setAccessToken(accessToken);
                loginWithFBInfo(response);
            });
            return FBInfo;
        }
        function FBLogin(){
            FB.login(function(response) {
                if (response.authResponse) {
                    getFBInfo();
                } 
                else {
                    console.log('User cancelled login or did not fully authorize.');
                }
            }, { scope: 'email' });
        }
        function loginWithFBInfo(FBInfo){
            APIRoot = sharedProperties.getAPIRoot();
            $http({
                method : "GET",
                url : APIRoot + "customer/" + FBInfo.email
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
                console.log('debug3');
                var data = {};
                data['firstname'] = FBInfo.first_name;
                data['lastname'] = FBInfo.last_name
                data['email'] = FBInfo.email;
                data['FB'] = true;
                sharedProperties.setInfoObj(data);
                window.location = "#/register/customer";
            });
        }
    }
});