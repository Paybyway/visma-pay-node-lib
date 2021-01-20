var nock = require('nock');
var apiUrl = 'https://www.vismapay.com';

QUnit.module('without credentials', {
	before: function() {
		this.api = require('../lib/payment.js');
	}
});

test('create charge returns error if merchant id or private key not set', function(assert) {

	this.api.createCharge({}, function(err, charge, token){
		assert.equal(err.message, 'Private key or api key not set');
	});
});


test('check status returns error if merchant id or private key not set', function(assert) {
	this.api.checkStatusWithToken('token', function(err, token, result){
		assert.equal(err.message, 'Private key or api key not set');
		assert.equal(err.type, 2)
		assert.equal(token, 'token');
	});
});

QUnit.module('with credentials', {
	before: function() {
		this.api = require('../lib/payment.js');
		this.api.setPrivateKey('private_key');
		this.api.setApiKey('asd-213');

	}
});

test('create charge returns fails if invalid parameters', function(assert) {
	const done = assert.async();
	this.api.createCharge({}, function(err, charge, token){
		assert.equal(err.message, 'createCharge: Invalid parameters');
		done();
	});
});

test('create charge should fail if incident id given', function(assert) {
	const done = assert.async();
	var response = {
		result: 1,
		incident_id: 'abcd'
	};

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);
	
	this.api.createCharge({
		order_number: 'order2',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, result){
		assert.equal(charge.order_number, 'order2');
		assert.equal(result.result, 1);
		assert.equal(result.incident_id, 'abcd');
		done();
	});

});	

test('create charge fails if invalid json returned', function (assert) {
	const done = assert.async();
	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, 'äää');

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, token){
		assert.ok(err, 'err should be defined');
		assert.equal(charge.order_number, 'order3');
		done();
	});
});

test('create charge fails if not successful response', function (assert) {
	const done = assert.async();
	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, {result: 1});

	this.api.createCharge({
		order_number: 'order',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, result){
		assert.equal(result.result, 1);
		done();
	});
});

test('create charge returns token', function (assert) {
	const done = assert.async();

	var response = {
		result: 0,
		token: '123',
		type: 'card'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123
	}, function(err, charge, result){
		assert.equal(result.result, 0);
		assert.equal(result.token, '123');
		done();
	});
});


test('create charge returns token when customer and products set', function (assert) {
	const done = assert.async();
	var response = {
		result: 0,
		token: '123',
		type: 'card'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'order3',
		currency: 'EUR',
		payment_method: {
			type: 'card'
		},
		amount: 123,
		customer: {
			firstname: 'test',
			lastname: 'person',
			email: 'a@a.com',
			address_street: 'street',
			address_city: 'city',
			address_zip: '123',
		},
		products: [{
			id: '1',
			title: 'title',
			count: 1,
			tax: 0,
			price: 123,
			pretax_price: 123,
			type: 1
		}]
	}, function(err, charge, result){
		assert.equal(result.token, '123');
		assert.ok(charge.customer);
		assert.ok(charge.products);
		done();
	});
});

test('create charge with register card token', function (assert) {
	const done = assert.async();
	var response = {
		result: 0,
		token: '123',
		type: 'card'
	}

	nock(apiUrl).post('/pbwapi/auth_payment').reply(200, response);

	this.api.createCharge({
		order_number: 'cardtokenorder',
		currency: 'EUR',
		amount: 123,
		payment_method: {
			type: 'card',
			register_card_token: 1
		}
	}, function(err, charge, result) {
		assert.ok(charge.payment_method.register_card_token);
		done();
	});

});

test('charge card token', function (assert) {
	const done = assert.async();
	var response = {
		result: 0,
		settled: 1
	}

	nock(apiUrl).post('/pbwapi/charge_card_token', {
		'version': 'w3.1',
		'api_key': 'asd-213',
		'order_number': '234asa',
		'amount': '123',
		'currency': 'EUR',
		'card_token': 'asd4005-123',
		'authcode': '3BB8C1FAFB17B53209DEB7D22E444D88672C7CC9D9B99BF4B96E6253511B4B01'
	}).reply(200, response);

	this.api.chargeCardToken({
		order_number: '234asa',
		currency: 'EUR',
		amount: '123',
		card_token: 'asd4005-123'
	}, function(err, charge, result) {
		assert.equal(result.result, 0);
		done();
	});
});

test('charge card token CIT', function (assert) {
	const done = assert.async();
	var response = {
		result: 30,
		verify: {
			token: 'test_token',
			type: '3ds'
		}
	}

	nock(apiUrl).post('/pbwapi/charge_card_token', {
		'version': 'w3.1',
		'api_key': 'asd-213',
		'order_number': '234asa',
		'amount': '123',
		'currency': 'EUR',
		'card_token': 'asd4005-123',
		'authcode': '3BB8C1FAFB17B53209DEB7D22E444D88672C7CC9D9B99BF4B96E6253511B4B01',
		'initiator': {
			'type': 2,
			'return_url': 'https://localhost/return',
			'notify_url': 'https://localhost/notify'
		}
	}).reply(200, response);

	this.api.chargeCardToken({
		order_number: '234asa',
		currency: 'EUR',
		amount: '123',
		card_token: 'asd4005-123',
		initiator: {
			type: 2,
			return_url: 'https://localhost/return',
			notify_url: 'https://localhost/notify'
		}
	}, function(err, charge, result) {
		assert.equal(result.result, 30);
		done();
	});
});

test('check status returns error if no token', function(assert) {
	const done = assert.async();
	this.api.checkStatusWithToken('', function(err, token, result) {
		assert.equal(err.message, 'checkStatusWithToken: token missing');
		done();
	});
});

test('check status fails if invalid json returned', function(assert) {
	const done = assert.async();
	nock(apiUrl).post('/pbwapi/check_payment_status').reply(200, 'äää');

	this.api.checkStatusWithToken('token', function(err, token, result) {
		assert.ok(err, 'err should be defined');
		assert.equal(token, 'token');
		done();
	});
});

test('check status returns result if successful', function (assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/check_payment_status').reply(200, response);

	this.api.checkStatusWithToken('t', function(err, token, result) {
		assert.equal(result.result, 0);
		assert.equal(token, 't');
		done();
	});
});

test('check status with order_number returns result if successful', function (assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/check_payment_status').reply(200, response);

	this.api.checkStatusWithOrderNumber('order_number', function(err, token, result) {
		assert.equal(result.result, 0);
		assert.equal(token, 'order_number');
		done();
	});
});

test('check capture returns error if no order number', function(assert) {
	const done = assert.async();
	this.api.capture('', function(err, order_number, result) {
		assert.equal(err.message, 'capture: order number missing');
		done();
	});
});

test('capture fails if not successful response', function(assert) {
	const done = assert.async();
	var response = {
		result: 1
	}

	nock(apiUrl).post('/pbwapi/capture').reply(200, response);

	this.api.capture('123', function(err, order_number, result) {
		assert.equal(order_number, '123');
		assert.equal(result.result, 1);
		done();
	});
});

test('capture returns result if successful response', function(assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/capture').reply(200, response);

	this.api.capture('1234', function(err, order_number, result) {
		assert.equal(order_number, '1234');
		assert.equal(result.result, 0);
		done();
	});
});

test('cancel fails if not successful response', function(assert) {
	const done = assert.async();
	var response = {
		result: 1
	}

	nock(apiUrl).post('/pbwapi/cancel').reply(200, response);

	this.api.cancel('1234', function(err, order_number, result) {
		assert.equal(result.result, 1);
		assert.equal(order_number, '1234');
		done();
	});
});

test('cancel returns result if successful response', function(assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/cancel').reply(200, response);

	this.api.cancel('1234', function(err, order_number, result) {
		assert.equal(order_number, '1234');
		assert.equal(result.result, 0);
		done();
	});
});

test('get card token', function (assert) {
	const done = assert.async();
	var response = {
		result: 0,
		source: {
			object: "card",
			last4: "1111",
			brand: "Visa",
			exp_year: 2018,
			exp_month: 5,
			card_token: "card-123"
		}
	}

	nock(apiUrl).post('/pbwapi/get_card_token', {
		"version": "w3.1",
		"api_key": "asd-213",
		"card_token": "card-123",
		"authcode": "8F5C2A8768901DFC1621C7FD3D7E01A35F6117557F8AB181BD7D0DBC5B32CD8C"
	}).reply(200, response);

	this.api.getCardToken('card-123', function(err, card_token, result) {
		assert.equal(card_token, 'card-123');
		assert.equal(JSON.stringify(result), JSON.stringify(response));
		done();
	});
});

test('delete card token', function(assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/delete_card_token', {
		"version": "w3.1",
		"api_key": "asd-213",
		"card_token": "card-123",
		"authcode": "8F5C2A8768901DFC1621C7FD3D7E01A35F6117557F8AB181BD7D0DBC5B32CD8C"
	}).reply(200, response);

	this.api.deleteCardToken('card-123', function(err, card_token, result) {
		assert.equal(card_token, 'card-123');
		assert.equal(JSON.stringify(result), JSON.stringify(response));
		done();
	});
});	


test('doRequest returns malformed response', function(assert) {
	const done = assert.async();
	var response = {

	}

	nock(apiUrl).post('/pbwapi/delete_card_token').reply(200, response);

	this.api.doRequest({}, '/pbwapi/delete_card_token', function(err, params, result) {
		assert.equal(err.message, 'Malformed response from Visma Pay API');
		done();
	}, {});

});

test('set api version', function(assert) {
	assert.equal(this.api.apiVersion, 'w3.1');
	this.api.setApiVersion('wm1');
	assert.equal(this.api.apiVersion, 'wm1');
});

test('check return returns valid data', function(assert) {
	var paramsOkSettled = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		SETTLED: 1,
		AUTHCODE: '5FF25F1E945C0535327AA4B8150FAC9B4AB058ADFE4733AB353EA07D3EFDA791'
	};

	this.api.checkReturn(paramsOkSettled, function(error, result) {
		assert.equal(error, null);
		assert.equal(JSON.stringify(result), JSON.stringify(paramsOkSettled));
	});

	var paramsOk = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		SETTLED: 0,
		AUTHCODE: '75B7798715EFCD0B80B5DDCA8068BB2871F519EB4A7E65DD8F847CED0353D2B8'
	};

	this.api.checkReturn(paramsOk, function(error, result) {
		assert.equal(error, null);
		assert.equal(JSON.stringify(result), JSON.stringify(paramsOk));
	});


	var paramsOkSettledContactID = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		CONTACT_ID: 123,
		SETTLED: 1,
		AUTHCODE: '56F6CD01E3F7861D814CFB90D88F8FB8C8A51C131BC330E0CD4080B3EB198073'
	};

	this.api.checkReturn(paramsOkSettledContactID, function(error, result) {
		assert.equal(error, null);
		assert.equal(JSON.stringify(result), JSON.stringify(paramsOkSettledContactID));
	});

	var paramsOkContactID = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		CONTACT_ID: 123,
		SETTLED: 0,
		AUTHCODE: 'A983119EA78EAC739BDB4F5221D1864152432247598BD62DD159A3FC7FA6F6EB'
	};

	this.api.checkReturn(paramsOkContactID, function(error, result) {
		assert.equal(error, null);
		assert.equal(JSON.stringify(result), JSON.stringify(paramsOkContactID));
	});

	var paramsFailed = {
		RETURN_CODE: 1,
		ORDER_NUMBER: '123',
		AUTHCODE: '017FBFAD84D38BBBE23AE5CE4E780B51806F3BAFDE666BE438508A138BF6A893'
	};

	this.api.checkReturn(paramsFailed, function(error, result) {
		assert.equal(error, null);
		assert.equal(JSON.stringify(result), JSON.stringify(paramsFailed));
	});

	var paramsFailedIncident = {
		RETURN_CODE: 1,
		ORDER_NUMBER: '123',
		AUTHCODE: 'B23D41A26CCB2BA706E1CE5D354A25BDE1FE69D8EBADAF6FA2D689E62938DE8A',
		INCIDENT_ID: 'incident'
	};

	this.api.checkReturn(paramsFailedIncident, function(error, result) {
		assert.equal(error, null);
		assert.equal(JSON.stringify(result), JSON.stringify(paramsFailedIncident));
	});

	var paramsInvalidMacCode = {
		RETURN_CODE: 0,
		ORDER_NUMBER: '123',
		SETTLED: 1,
		AUTHCODE: '5FF25F1E945C0535327AA4B8150FAC9B4AB058ADFE4733AB353EA07D3EFDA792'
	}

	this.api.checkReturn(paramsInvalidMacCode, function(error, result) {
		assert.equal(error.type, 5);
		assert.equal(JSON.stringify(result), JSON.stringify(paramsInvalidMacCode));
	});

});

test('get merchant payment methods', function(assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/merchant_payment_methods', {
		"version": "2",
		"api_key": "asd-213",
		"currency": "",
		"authcode": "5821CF021565D574318F2DBA2BD9DBF56220EC4997A1DD4C3732E17B249F3EAA"
	}).reply(200, response);

	this.api.getMerchantPaymentMethods('', function(err, currency, result) {
		assert.equal(currency, '');
		assert.equal(JSON.stringify(result), JSON.stringify(response));
		done();
	});
});	

test('get merchant payment methods SEK currency', function(assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/merchant_payment_methods', {
		"version": "2",
		"api_key": "asd-213",
		"currency": "SEK",
		"authcode": "5821CF021565D574318F2DBA2BD9DBF56220EC4997A1DD4C3732E17B249F3EAA"
	}).reply(200, response);

	this.api.getMerchantPaymentMethods('SEK', function(err, currency, result) {
		assert.equal(currency, 'SEK');
		assert.equal(JSON.stringify(result), JSON.stringify(response));
		done();
	});
});	

test('get merchant payment methods return malformed response', function(assert) {
	const done = assert.async();
	var response = {};

	nock(apiUrl).post('/pbwapi/merchant_payment_methods', {
		"version": "2",
		"api_key": "asd-213",
		"currency": "SEK",
		"authcode": "5821CF021565D574318F2DBA2BD9DBF56220EC4997A1DD4C3732E17B249F3EAA"
	}).reply(200, response);

	this.api.getMerchantPaymentMethods('SEK', function(err, currency, result) {
		assert.equal(currency, 'SEK');
		assert.equal(err.message, 'Malformed response from Visma Pay API');
		done();
	});
});	

test('test get payment', function (assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/get_payment').reply(200, response);

	this.api.getPayment('order_number', function(err, order_number, result) {
		assert.equal(result.result, 0);
		assert.equal(order_number, 'order_number');
		done();
	});
});

test('test get refund', function (assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/get_refund').reply(200, response);

	this.api.getRefund(122, function(err, refund_id, result) {
		assert.equal(result.result, 0);
		assert.equal(refund_id, 122);
		done();
	});
});

test('test create refund', function (assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/create_refund').reply(200, response);

	var refund = {
		order_number: 'order_number',
		amount: 250
	}

	this.api.createRefund(refund, function(err, refund_object, result) {
		assert.equal(result.result, 0);
		assert.equal(refund_object, refund);
		done();
	});
});

test('test cancel refund', function (assert) {
	const done = assert.async();
	var response = {
		result: 0
	}

	nock(apiUrl).post('/pbwapi/cancel_refund').reply(200, response);

	this.api.cancelRefund(122, function(err, refund_id, result) {
		assert.equal(result.result, 0);
		assert.equal(refund_id, 122);
		done();
	});
});
