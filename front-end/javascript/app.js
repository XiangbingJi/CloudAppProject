(function() {
	var app = angular.module('customerApp', ['ngRoute','ngMessages']);

	app.service('sharedProperties', function() {

	var customerInfo = {
		'firstname': 'Donald',
		'lastname': 'Trump',
		'email': 'DonaldTrump@gmail.com',
		"phoneNumber": '1234567890'
	};
    
    return {
        getInfo: function() {
            return customerInfo;
        },
        setInfo: function(obj) {
        	customerInfo = obj;
        }
    }
});
})();