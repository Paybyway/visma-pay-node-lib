const fetch = require('node-fetch');
const HmacSHA256 = require('crypto-js/hmac-sha256');
const Promise = require('bluebird');

class VismapayError {
	constructor(error, type, result) {
		this.error = error;
		this.type = type;
		this.result = result;
	}

	errCode2Text (code) {
		const codes = {
			'1': 'Malformed response from Visma Pay API',
			'2': 'Private key or api key not set',
			'3': 'Invalid parameters',
			'4': 'Protocol error',
			'5': 'Mac check failed',
			'6': 'API returned an error'
		}
		return codes[code] ? codes[code] : 'Unknown error code';
	}
}

class Vismapay {
	constructor () {
		this.apiKey = '';
		this.privateKey = '';
		this.apiVersion = 'w3.1';
		this.merchantPaymentMethodsApiVersion = '2';

		this.defaultHost = 'www.vismapay.com';
		this.apiUrl = 'https://www.vismapay.com/pbwapi';
		this.useHttps = true;

		this.paths = {
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
	}

	setApiKey (apiKey) {
		this.apiKey = apiKey;
	}

	setPrivateKey (privateKey) {
		this.privateKey = privateKey;
	}

	setApiVersion (version) {
		this.apiVersion = version;
	}

	setDefaultHost (host) {
		this.defaultHost = host;
	}

	setUseHttps (value) {
		this.useHttps = value;
	}

	doRequest(bodyJson, path) {
		const http = this.useHttps ? 'https://' : 'http://';

		return fetch(http + this.defaultHost + path, {
			method: 'POST',
			body: JSON.stringify(bodyJson),
      headers: {'Content-Type': 'application/json'}
		})
		.then(res => res.json())
		.then(data => {
			if (data.result !== undefined) {
				if (data.result === 0) {
					return data;
				} else {
					return new Promise.reject(new VismapayError('Error', 6, data));
				}
			} else {
				return new Promise.reject(new VismapayError('Malformed response from Visma Pay API', 1));
			}
		});
	}

	createCharge (charge) {
		if (this.apiKey == '' || this.privateKey == '') {
			return new Promise.reject(new VismapayError('Private key or api key not set', 2));
		}

		if(!charge || !charge.amount || !charge.currency || !charge.order_number || !charge.payment_method) {
			return new Promise.reject(new VismapayError('createCharge: Invalid parameters', 3));
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'order_number': encodeURIComponent(charge.order_number),
			'amount': encodeURIComponent(charge.amount),
			'currency': encodeURIComponent(charge.currency),
			'payment_method': charge.payment_method,
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.order_number, this.privateKey).toString().toUpperCase())
		};

		if(charge.email) {
			bodyJson.email = charge.email;
		}

		if(charge.customer) {
			bodyJson.customer = charge.customer;
		}

		if(charge.products) {
			bodyJson.products = charge.products;
		}

		return this.doRequest(bodyJson, this.paths.authPayment);
	}

	checkStatusWithToken (token) {
		if (this.apiKey == '' || this.privateKey == '') {
			return new Promise.reject(new VismapayError('Private key or api key not set', 2));
		}

		if(!token) {
			return new Promise.reject(new VismapayError('checkStatusWithToken: token missing', 3));
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + token, this.privateKey).toString().toUpperCase()),
			'token': encodeURIComponent(token)
		};

		return this.doRequest(bodyJson, this.paths.status);
	}

	checkStatusWithOrderNumber (orderNumber) {
		if (this.apiKey == '' || this.privateKey == '') {
			return new Promise.reject(new VismapayError('Private key or api key not set', 2));
		}

		if(!orderNumber) {
			return new Promise.reject(new VismapayError('checkStatusWithOrderNumber: order number missing', 3));
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
			'order_number': encodeURIComponent(orderNumber)
		};

		return this.doRequest(bodyJson, this.paths.status);
	}

	capture (orderNumber) {
		if(!orderNumber) {
			return new Promise.reject(new VismapayError('capture: order number missing', 3));
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
			'order_number': encodeURIComponent(orderNumber)
		};

		return this.doRequest(bodyJson, this.paths.capture);
	}

	cancel (orderNumber) {
		if(!orderNumber) {
			return new Promise.reject(new VismapayError('cancel: order number missing', 3));
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
			'order_number': encodeURIComponent(orderNumber)
		};

		return this.doRequest(bodyJson, this.paths.cancel);
	}

	getCardToken (cardToken) {
		if(!cardToken) {
			return new Promise.reject(new VismapayError('getCardToken: card token missing', 3));
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
			'card_token': encodeURIComponent(cardToken)
		};

		return this.doRequest(bodyJson, this.paths.getCardToken)
	}

	deleteCardToken (cardToken) {
		if(!cardToken) {
			return new Promise.reject(new VismapayError('deleteCardToken: card token missing', 3));
		}
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + cardToken, this.privateKey).toString().toUpperCase()),
			'card_token': encodeURIComponent(cardToken)
		};

		return this.doRequest(bodyJson, this.paths.deleteCardToken);
	}

	checkReturn (params) {
		if('RETURN_CODE' in params && 'AUTHCODE' in params && 'ORDER_NUMBER' in params) {

			let macInput = params.RETURN_CODE + '|' + params.ORDER_NUMBER;

			if('SETTLED' in params) {
				macInput += '|' + params.SETTLED;
			}

			if('CONTACT_ID' in params) {
				macInput += '|' + params.CONTACT_ID;
			}

			if('INCIDENT_ID' in params) {
				macInput += '|' + params.INCIDENT_ID;
			}

			const calculatedMac = HmacSHA256(macInput, this.privateKey).toString().toUpperCase();

			if(calculatedMac === params.AUTHCODE) {
				return new Promise.resolve(true);
			}

			return new Promise.reject(new VismapayError('checkReturn: MAC check failed', 5));
		}

		return new Promise.reject(new VismapayError('checkReturn: Invalid parameters', 3));
	}

	getPayment (orderNumber) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + orderNumber, this.privateKey).toString().toUpperCase()),
			'order_number': encodeURIComponent(orderNumber)
		};

		return this.doRequest(bodyJson, this.paths.getPayment)
	}

	getRefund (refundId) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + refundId, this.privateKey).toString().toUpperCase()),
			'refund_id': encodeURIComponent(refundId)
		};

		return this.doRequest(bodyJson, this.paths.getRefund)
	}

	createRefund (refund) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + refund.order_number, this.privateKey).toString().toUpperCase()),
			'order_number': encodeURIComponent(refund.order_number)
		};

		if(refund.email)
			bodyJson.email = refund.email;

		if(refund.amount)
			bodyJson.amount = encodeURIComponent(refund.amount)
		else
			bodyJson.products = refund.products

		return this.doRequest(bodyJson, this.paths.createRefund)
	}

	cancelRefund (refundId) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + refundId, this.privateKey).toString().toUpperCase()),
			'refund_id': encodeURIComponent(refundId)
		};

		return this.doRequest(bodyJson, this.paths.cancelRefund);
	}

	chargeCardToken (charge) {
		if (this.apiKey == '' || this.privateKey == '') {
			return new Promise.reject(new VismapayError('Private key or api key not set', 2));
		}

		if(!charge || !charge.amount || !charge.currency || !charge.card_token) {
			return new Promise.reject(new VismapayError('createCharge: Invalid parameters', 3));
		}

		var bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'order_number': encodeURIComponent(charge.order_number),
			'amount': encodeURIComponent(charge.amount),
			'currency': encodeURIComponent(charge.currency),
			'card_token': encodeURIComponent(charge.card_token),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey + '|' + charge.order_number + '|' + charge.card_token, this.privateKey).toString().toUpperCase())
		};

		if(charge.email)
			bodyJson.email = charge.email;

		if(charge.customer)
			bodyJson.customer = charge.customer;

		if(charge.products)
			bodyJson.products = charge.products;

		if(charge.initiator)
			bodyJson.initiator = charge.initiator;

		return this.doRequest(bodyJson, this.paths.chargeCardToken);
	}

	getMerchantPaymentMethods (currency) {
		const bodyJson = {
			'version': encodeURIComponent(this.merchantPaymentMethodsApiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'currency': encodeURIComponent(currency),
			'authcode': encodeURIComponent(HmacSHA256(this.apiKey, this.privateKey).toString().toUpperCase()),
		};

		return this.doRequest(bodyJson, this.paths.getMerchantPaymentMethods)
	}
}

module.exports = exports = new Vismapay();
exports.default = exports;
exports.class = Vismapay;
