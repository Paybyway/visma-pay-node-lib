const { createHmac } = require('crypto');

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
		this.apiVersion = 'w3.2';
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

	getHmac (data) {
		const hmac = createHmac('sha256', this.privateKey);
		return hmac.update(Buffer.from(data, 'utf-8')).digest('hex').toUpperCase();
	}

	async doRequest (bodyJson, path) {
		const http = this.useHttps ? 'https://' : 'http://';

		const response = await fetch(http + this.defaultHost + path, {
			method: 'POST',
			body: JSON.stringify(bodyJson),
			headers: {'Content-Type': 'application/json'}
		});

		let data;
		
		try {
			data = await response.json();
		} catch (e) {
			throw new VismapayError('Malformed response from Visma Pay API', 1);
		}

		if (data.result !== undefined) {
			if (data.result === 0) {
				return data;
			} else {
				throw new VismapayError('Error', 6, data);
			}
		} else {
			throw new VismapayError('Malformed response from Visma Pay API', 1);
		}
	}

	async createCharge (charge) {
		if (this.apiKey == '' || this.privateKey == '') {
			throw new VismapayError('Private key or api key not set', 2);
		}

		if(!charge || !charge.amount || !charge.currency || !charge.order_number || !charge.payment_method) {
			throw new VismapayError('createCharge: Invalid parameters', 3);
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'order_number': encodeURIComponent(charge.order_number),
			'amount': encodeURIComponent(charge.amount),
			'currency': encodeURIComponent(charge.currency),
			'payment_method': charge.payment_method,
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + charge.order_number))
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

		return await this.doRequest(bodyJson, this.paths.authPayment);
	}

	async checkStatusWithToken (token) {
		if (this.apiKey == '' || this.privateKey == '') {
			throw new VismapayError('Private key or api key not set', 2);
		}

		if(!token) {
			throw new VismapayError('checkStatusWithToken: token missing', 3);
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + token)),
			'token': encodeURIComponent(token)
		};

		return await this.doRequest(bodyJson, this.paths.status);
	}

	async checkStatusWithOrderNumber (orderNumber) {
		if (this.apiKey == '' || this.privateKey == '') {
			throw new VismapayError('Private key or api key not set', 2);
		}

		if(!orderNumber) {
			throw new VismapayError('checkStatusWithOrderNumber: order number missing', 3);
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + orderNumber)),
			'order_number': encodeURIComponent(orderNumber)
		};

		return await this.doRequest(bodyJson, this.paths.status);
	}

	async capture (orderNumber) {
		if(!orderNumber) {
			throw new VismapayError('capture: order number missing', 3);
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + orderNumber)),
			'order_number': encodeURIComponent(orderNumber)
		};

		return await this.doRequest(bodyJson, this.paths.capture);
	}

	async cancel (orderNumber) {
		if(!orderNumber) {
			throw new VismapayError('cancel: order number missing', 3);
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + orderNumber)),
			'order_number': encodeURIComponent(orderNumber)
		};

		return await this.doRequest(bodyJson, this.paths.cancel);
	}

	async getCardToken (cardToken) {
		if(!cardToken) {
			throw new VismapayError('getCardToken: card token missing', 3);
		}

		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + cardToken)),
			'card_token': encodeURIComponent(cardToken)
		};

		return await this.doRequest(bodyJson, this.paths.getCardToken)
	}

	async deleteCardToken (cardToken) {
		if(!cardToken) {
			throw new VismapayError('deleteCardToken: card token missing', 3);
		}
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + cardToken)),
			'card_token': encodeURIComponent(cardToken)
		};

		return await this.doRequest(bodyJson, this.paths.deleteCardToken);
	}

	async checkReturn (params) {
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

			const calculatedMac = this.getHmac(macInput);

			if(calculatedMac === params.AUTHCODE) {
				return Promise.resolve(true);
			}

			throw new VismapayError('checkReturn: MAC check failed', 5);
		}

		throw new VismapayError('checkReturn: Invalid parameters', 3);
	}

	async getPayment (orderNumber) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + orderNumber)),
			'order_number': encodeURIComponent(orderNumber)
		};

		return await this.doRequest(bodyJson, this.paths.getPayment)
	}

	async getRefund (refundId) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + refundId)),
			'refund_id': encodeURIComponent(refundId)
		};

		return await this.doRequest(bodyJson, this.paths.getRefund)
	}

	async createRefund (refund) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + refund.order_number)),
			'order_number': encodeURIComponent(refund.order_number)
		};

		if(refund.email)
			bodyJson.email = refund.email;

		if(refund.notify_url)
			bodyJson.notify_url = refund.notify_url;

		if(refund.amount)
			bodyJson.amount = encodeURIComponent(refund.amount)
		else
			bodyJson.products = refund.products

		return await this.doRequest(bodyJson, this.paths.createRefund)
	}

	async cancelRefund (refundId) {
		const bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + refundId)),
			'refund_id': encodeURIComponent(refundId)
		};

		return await this.doRequest(bodyJson, this.paths.cancelRefund);
	}

	async chargeCardToken (charge) {
		if (this.apiKey == '' || this.privateKey == '') {
			throw new VismapayError('Private key or api key not set', 2);
		}

		if(!charge || !charge.amount || !charge.currency || !charge.card_token) {
			throw new VismapayError('createCharge: Invalid parameters', 3);
		}

		var bodyJson = {
			'version': encodeURIComponent(this.apiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'order_number': encodeURIComponent(charge.order_number),
			'amount': encodeURIComponent(charge.amount),
			'currency': encodeURIComponent(charge.currency),
			'card_token': encodeURIComponent(charge.card_token),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey + '|' + charge.order_number + '|' + charge.card_token))
		};

		if(charge.email)
			bodyJson.email = charge.email;

		if(charge.customer)
			bodyJson.customer = charge.customer;

		if(charge.products)
			bodyJson.products = charge.products;

		if(charge.initiator)
			bodyJson.initiator = charge.initiator;

		return await this.doRequest(bodyJson, this.paths.chargeCardToken);
	}

	async getMerchantPaymentMethods (currency) {
		const bodyJson = {
			'version': encodeURIComponent(this.merchantPaymentMethodsApiVersion),
			'api_key': encodeURIComponent(this.apiKey),
			'currency': encodeURIComponent(currency),
			'authcode': encodeURIComponent(this.getHmac(this.apiKey)),
		};

		return await this.doRequest(bodyJson, this.paths.getMerchantPaymentMethods)
	}
}

module.exports = exports = new Vismapay();
exports.default = exports;
exports.class = Vismapay;
exports.VismapayError = VismapayError;
