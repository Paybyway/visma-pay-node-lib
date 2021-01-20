// Express package is required for this example
var express = require('express');
//var sys = require('sys');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');

var app = express();
var router = express.Router();

var webProtocol = require('http');
var server = webProtocol.createServer(app);

var vismaPay = require("../../lib/payment.js");

// Set private key and api key
vismaPay.setPrivateKey('');
vismaPay.setApiKey('');

var orderCounter = 1;

router.get('/', express.static(__dirname + '/../page'));

router.get('/create-charge/:selected?', function(req, res) {
	var selected = typeof req.params.selected !== 'undefined' ? req.params.selected : null;

	var chargeObject = {
		amount: 100,
		order_number: 'test-order-' + (orderCounter++) + '-' + new Date().getTime(), // Order number shall be unique for every order
		currency: 'EUR',
		payment_method: {
			type: 'e-payment',
			return_url: req.protocol + '://' + req.get('host') + '/e-payment-return',
			notify_url: req.protocol + '://' + req.get('host') + '/e-payment-notify',
			lang: 'en'
		},
		customer: { // Optional customer details

			// All fields are optional
			firstname: 'Test',
			lastname: 'Person',
			email: 'testperson@test.fi',
			address_street: 'Testaddress 1',
			address_city: 'Testlandia',
			address_zip: '12345'
		},
		products: [{ // Optional product fields

				// All fields required
				id: 'test-product-1',
				title: 'Test Product 1',
				count: 1,
				pretax_price: 50,
				tax: 0,
				price: 50, // Product prices must match with the total amount
				type: 1
			},
			{
				id: 'test-product-2',
				title: 'Test Product 2',
				count: 1,
				pretax_price: 50,
				tax: 0,
				price: 50,
				type: 1
			}
		]
	};

	if(selected)
		chargeObject.payment_method.selected = [selected];

	vismaPay.createCharge(chargeObject, function(error, charge, result) {

		console.log('createCharge response: ', result);

		var token = "";
		if(error) {
			console.log("Error: " + error.message);
			res.status(500);
		}
		else {
			// A payment token is returned in a successful response
			if(result.result == 0) {
				console.log("Got token = " + result.token + " for charge = " + charge.order_number);
				token = result.token;
			}
		}

		if(token !== "")
			res.redirect(vismaPay.apiUrl + 'token/' + token);
		else
			res.end('Something went wrong when creating a charge.');
	});
});

router.get('/e-payment-return', function(req, res) {
	console.log('E-payment return, params:', req.query);

	vismaPay.checkReturn(req.query, function(error, result) {

		var message = '<html><body><p>';

		if(error)
		{
			console.log("Got error: " + error.message);
			message += error.message;
			res.status(500);
		}
		else
		{
			switch(result.RETURN_CODE)
			{
				case '0':
					message += 'Payment was successful for order number: ' + result.ORDER_NUMBER;
					break;
				case '4':
					message += 'Transaction status could not be updated after customer returned from the web page of a bank.';
					break;
				case '10':
					message += 'Maintence break';
					break;
				case '1':
					message += 'Payment failed!';
					break;
				default:
					message += 'Unknown return value';
			}
		}

		message += '</p><a href="/">Start again</a></body></html>';
		res.end(message);
	});
});

router.get('/e-payment-notify', function(req, res) {
	console.log('Got notify, params:', req.query);

	vismaPay.checkReturn(req.query, function(error, result) {

		if(error)
			console.log("Got error: " + error.message);
		else
			console.log("Return code = " + result.RETURN_CODE + " for order number = " + result.ORDER_NUMBER);
	});

	res.end('');
});

router.get('/get-merchant-payment-methods', function(req, res) {
	vismaPay.getMerchantPaymentMethods("", function(error, currency, result) {
		
		var response = '';

		if(error)
		{
			console.log("Got error: " + error.message);
			res.status(500)
		}
		else if(result.result !== 0)
		{
			console.log("Unable to get merchant payment methods");
			res.status(500)
		}
		else
		{
			response = JSON.stringify(result.payment_methods);
		}

		res.end(response);
	});
});

app.use(router);
var port = 8000;
server.listen(port);

console.log("Server running at port " + port);
