(function() {
	var app = angular.module('customerApp', ['ngRoute','ngMessages']);
	app.service('sharedProperties', function() {

       var customerInfo = {

       };
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