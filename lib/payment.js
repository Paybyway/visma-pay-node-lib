var querystring = require('querystring');
var https = require('https');
var HmacSHA256 = require('crypto-js/hmac-sha256');

/*
	Error types:
	1: Malformed response from Visma Pay API
	2: Private key or api key not set
	3: Invalid parameters
	4: Protocol error
	5: Mac check failed
*/

function PaymentError(message, type)
{
	this.message = message;
	this.type = type;
}

function Payment() {}

Payment.prototype.paths = {
	authPayment: '/pbwapi/auth_payment',
	status: '/pbwapi/check_payment_status',
	capture : '/pbwapi/capture',
	cancel : '/pbwapi/cancel',
	chargeCardToken : '/pbwapi/charge_card_token',
	getCardToken : '/pbwapi/get_card_token',
	deleteCardToken : '/pbwapi/delete_card_token',
	getMerchantPaymentMethods:  '/pbwapi/merchant_payment_methods',
	getPayment:  '/pbwapi/get_payment',
	getRefund:  '/pbwapi/get_refund',
	createRefund:  '/pbwapi/create_refund',
	cancelRefund:  '/pbwapi/cancel_refund'
};

Payment.prototype.defaultOptions = {
	host: 'www.vismapay.com',
	port: 443,
	method: 'POST',
	https: true
};

Payment.prototype.apiUrl = "https://www.vismapay.com/pbwapi/";
Payment.prototype.apiVersion = "w3.1";
Payment.prototype.merchantPaymentMethodsApiVersion = "2";
Payment.prototype.privateKey = "";
Payment.prototype.apiKey = "";

Payment.prototype.setApiVersion = function(apiVersion) {
	this.apiVersion = apiVersion;
}

Payment.prototype.setPrivateKey = function(privateKey) {
	this.privateKey = privateKey;
}

Payment.prototype.setApiKey  = function(apiKey) {
	this.apiKey  = apiKey;
}

Payment.prototype.doRequest = function(postDataObject, path, callBack, callbackParam) {
	var protocol, postData = JSON.stringify(postDataObject);

	var options = this.defaultOptions;	
	options.path = path;

	options.headers = {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(postData)
	};

	var r = https.request(options, function(response) {
		var received = "", parsed;
		response.on('data', function(data) { received += data; });			
		response.on('end', function() {

			try {
				parsed = JSON.parse(received);
			} 
			catch(error) {
				return callBack(error, callbackParam);
			}

			if(parsed && parsed.hasOwnProperty('result')) {
				return callBack(null, callbackParam, parsed);
			}

			return callBack(new PaymentError("Malformed response from Visma Pay API", 1), callbackParam);
		});
	});

	r.write(postData);
	r.end();

	r.on('error', function(error) {
		callBack(error, callbackParam);
	});
}

Payment.prototype.createCharge = function(charge, result) {

	if(this.privateKey === "" || this.apiKey === "")
		return result(new PaymentError("Private key or api key not set", 2));

	if(!charge || !charge.amount || !charge.currency || !charge.order_number || !charge.payment_method)
		return result(new PaymentError("createCharge: Invalid parameters", 3));

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'order_number': encodeURIComponent(charge.order_number),
		'amount': encodeURIComponent(charge.amount),
		'currency': encodeURIComponent(charge.currency),
		'payment_method': charge.payment_method,
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.order_number, this.privateKey).toString().toUpperCase())
	};

	if(charge.email)
		postDataObject.email = charge.email;

	if(charge.customer)
		postDataObject.customer = charge.customer;

	if(charge.products)
		postDataObject.products = charge.products;

	return this.doRequest(postDataObject, this.paths.authPayment, result, charge)
}

Payment.prototype.chargeCardToken = function(charge, result) {
	if(this.privateKey === "" || this.apiKey === "")
		return result(new PaymentError("Private key or api key not set", 1));

	if(!charge || !charge.amount || !charge.currency || !charge.card_token)
		return result(new PaymentError("createCharge: Invalid parameters", 3));

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'order_number': encodeURIComponent(charge.order_number),
		'amount': encodeURIComponent(charge.amount),
		'currency': encodeURIComponent(charge.currency),
		'card_token': encodeURIComponent(charge.card_token),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.order_number + '|' + charge.card_token, this.privateKey).toString().toUpperCase())
	};

	if(charge.email)
		postDataObject.email = charge.email;

	if(charge.customer)
		postDataObject.customer = charge.customer;

	if(charge.products)
		postDataObject.products = charge.products;

	if(charge.initiator)
		postDataObject.initiator = charge.initiator;

	return this.doRequest(postDataObject, this.paths.chargeCardToken, result, charge);
}

Payment.prototype.checkStatusWithToken = function(token, result) {
	
	if(this.privateKey === "" || this.apiKey === "")
		return result(new PaymentError("Private key or api key not set", 2), token);

	if(!token)
		return result(new PaymentError("checkStatusWithToken: token missing", 3), token);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + token, this.privateKey).toString().toUpperCase()),
		'token': encodeURIComponent(token)
	};


	return this.doRequest(postDataObject, this.paths.status, result, token)
}

Payment.prototype.checkStatusWithOrderNumber = function(orderNumber, result) {
	
	if(this.privateKey === "" || this.apiKey === "")
		return result(new PaymentError("Private key or api key not set", 2), orderNumber);

	if(!orderNumber)
		return result(new PaymentError("checkStatusWithOrderNumber: token missing", 3), orderNumber);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.paths.status, result, orderNumber)
}

Payment.prototype.capture = function(orderNumber, result) {
	if(!orderNumber)
		return result(new PaymentError("capture: order number missing", 3), orderNumber);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.paths.capture, result, orderNumber)
}

Payment.prototype.cancel = function(orderNumber, result) {
	if(!orderNumber)
		return result(new PaymentError("cancel: order number missing", 3), orderNumber);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.paths.cancel, result, orderNumber)
}

Payment.prototype.getCardToken = function(cardToken, result) {
	if(!cardToken)
		return result(new PaymentError("getCardToken: card token missing", 3), cardToken);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
		'card_token': encodeURIComponent(cardToken)
	};

	return this.doRequest(postDataObject, this.paths.getCardToken, result, cardToken)
}

Payment.prototype.deleteCardToken = function(cardToken, result) {
	if(!cardToken)
		return result(new PaymentError("deleteCardToken: card token missing", 3), cardToken);

	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
		'card_token': encodeURIComponent(cardToken)
	};

	return this.doRequest(postDataObject, this.paths.deleteCardToken, result, cardToken)
}

Payment.prototype.checkReturn = function(params, result) {

	if(params.hasOwnProperty('RETURN_CODE') 
		&& params.hasOwnProperty('AUTHCODE')
		&& params.hasOwnProperty('ORDER_NUMBER'))
	{

		var macInput = params.RETURN_CODE + '|' + params.ORDER_NUMBER;

		if(params.hasOwnProperty('SETTLED'))
			macInput += '|' + params.SETTLED;
		if(params.hasOwnProperty('CONTACT_ID'))
			macInput += '|' + params.CONTACT_ID;
		if(params.hasOwnProperty('INCIDENT_ID'))
			macInput += '|' + params.INCIDENT_ID;

		var calculatedMac = HmacSHA256(macInput, this.privateKey).toString().toUpperCase();

		if(calculatedMac === params.AUTHCODE)
			return result(null, params);

		return result(new PaymentError('checkReturn: MAC check failed', 5), params); 
	}

	return result(new PaymentError('checkReturn: Invalid parameters', 3), params);
}

Payment.prototype.getMerchantPaymentMethods = function(currency, result) {
	var postDataObject = {
		'version': encodeURIComponent(this.merchantPaymentMethodsApiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'currency': encodeURIComponent(currency),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey, this.privateKey).toString().toUpperCase()),
	};

	return this.doRequest(postDataObject, this.paths.getMerchantPaymentMethods, result, currency)
}

Payment.prototype.getPayment = function(orderNumber, result) {
	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(orderNumber)
	};

	return this.doRequest(postDataObject, this.paths.getPayment, result, orderNumber)
}

Payment.prototype.getRefund = function(refundId, result) {
	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + refundId, this.privateKey).toString().toUpperCase()),
		'refund_id': encodeURIComponent(refundId)
	};

	return this.doRequest(postDataObject, this.paths.getRefund, result, refundId)
}

Payment.prototype.createRefund = function(refund, result) {
	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + refund.order_number, this.privateKey).toString().toUpperCase()),
		'order_number': encodeURIComponent(refund.order_number)
	};

	if(refund.email)
		postDataObject.email = refund.email;

	if(refund.amount)
		postDataObject.amount = encodeURIComponent(refund.amount)
	else
		postDataObject.products = refund.products

	return this.doRequest(postDataObject, this.paths.createRefund, result, refund)
}

Payment.prototype.cancelRefund = function(refundId, result) {
	var postDataObject = {
		'version': encodeURIComponent(this.apiVersion),
		'api_key': encodeURIComponent(this.apiKey),
		'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + refundId, this.privateKey).toString().toUpperCase()),
		'refund_id': encodeURIComponent(refundId)
	};

	return this.doRequest(postDataObject, this.paths.cancelRefund, result, refundId)
}

module.exports = new Payment();
