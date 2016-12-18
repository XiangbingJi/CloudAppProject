(function() {
	var app = angular.module('customerApp', ['ngRoute','ngMessages']);

  app.run(function($rootScope, $window, authFact) {

    window.fbAsyncInit = function() {
      
      FB.init({
        appId      : '148126892255083',

        xfbml      : true,

        version    : 'v2.8'
      
      });
      FB.AppEvents.logPageView();
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];

       if (d.getElementById(id)) {return;}

       js = d.createElement(s); js.id = id;

       js.src = "//connect.facebook.net/en_US/sdk.js";

       fjs.parentNode.insertBefore(js, fjs);

     }(document, 'script', 'facebook-jssdk'));

    $rootScope.$on('$routeChangeStart', function(event, next, current) {
      if (next.$$route.authenticated) {
        var userAuth = authFact.getAccessToken();
        console.log(userAuth);
        if (!userAuth) {
          window.location = "#/";
        }
      }
    });
  });

  app.service('authFact', function() {
    var authFact = {authToken: undefined};
    return {
      setAccessToken: function(accessToken) {
        authFact.authToken = accessToken;
        console.log('accessToken');
        console.log(authFact);
      },
      getAccessToken: function() {
         return authFact.authToken;
         console.log('getAccessToken')
       }
     }
  });

	app.service('sharedProperties', function() {
    var customerInfo = {};
     return {
      getInfoObj: function() {
          return customerInfo;
      },
      setInfoObj: function(obj) {
      	customerInfo = obj;
      },
      getAPIRoot: function(){
      	return 'https://i1zu432nj9.execute-api.us-east-1.amazonaws.com/dev/';
      } 
    }
  });
})();