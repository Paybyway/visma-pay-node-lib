const vismapay = require('../lib/vismapay.js');
const vismapayClass = require('../lib/vismapay.js').class;

let hmacSpy;

beforeEach(() => {
  vismapay.setApiKey('apikey');
  vismapay.setPrivateKey('privatekey');
  hmacSpy = jest.spyOn(vismapay, 'getHmac');
});

afterEach(() => {
  hmacSpy.mockRestore();
});

const unSetKeys = () => {
  vismapay.setApiKey('');
  vismapay.setPrivateKey('');
};

test('createCharge without privatekey or apikey set', async () => {
  unSetKeys();
  await expect(vismapay.createCharge({})).rejects.toHaveProperty('type', 2);
});

test('createCharge without charge', async () => {
  await expect(vismapay.createCharge({})).rejects.toHaveProperty('type', 3);
});

test('createCharge returns a token with minimal params', async () => {
  const response = {
    result: 0,
    token: "the_token",
    type: "e-payment"
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.createCharge({
    amount: 1337,
    order_number: 'test-order-' + new Date().getTime(),
    currency: 'EUR',
    email: 'test@test.com',
    payment_method: {
      type: 'e-payment',
      return_url: 'https://testshop.fi/e-payment-return',
      notify_url: 'https://testshop.fi/e-payment-notify',
      lang: 'en'
    }
  })).resolves.toHaveProperty('token', 'the_token');
});

test('createCharge returns a token when all params are provided', async () => {
  const response = {
    result: 0,
    token: "the_token_2",
    type: "e-payment"
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.createCharge({
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
  })).resolves.toHaveProperty('token', 'the_token_2');
});

test('createCharge with error response', async () => {
  const response = {
    result: 1,
    errors: [
      "The amount must be an integer.",
      "The contact.email format is invalid.",
      "The product.price sum does not match with the total amount."
    ]
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const cc = vismapay.createCharge({
    amount: 1337,
    order_number: 'test-order-' + new Date().getTime(),
    currency: 'EUR',
    email: 'test@test.com',
    payment_method: {
      type: 'e-payment',
      return_url: 'https://testshop.fi/e-payment-return',
      notify_url: 'https://testshop.fi/e-payment-notify',
      lang: 'en'
    }
  });

  await expect(cc).rejects.toHaveProperty('type', 6);
  await expect(cc).rejects.toHaveProperty('result.result', 1);
});

test('checkStatusWithToken without keys', async () => {
  unSetKeys();
  await expect(vismapay.checkStatusWithToken('token')).rejects.toHaveProperty('type', 2);
});

test('checkStatusWithToken without token', async () => {
  await expect(vismapay.checkStatusWithToken('')).rejects.toHaveProperty('type', 3);
});

test('checkStatusWithToken success', async () => {
  const response = {
    result: 0,
    settled: 1,
    source: {
      // source data, not needed for this test
    }
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.checkStatusWithToken('token')).resolves.toHaveProperty('settled', 1);
});

test('checkStatusWithOrderNumber without keys', async () => {
  unSetKeys();
  await expect(vismapay.checkStatusWithOrderNumber('token')).rejects.toHaveProperty('type', 2);
});

test('checkStatusWithOrderNumber without order_num', async () => {
  await expect(vismapay.checkStatusWithOrderNumber('')).rejects.toHaveProperty('type', 3);
});

test('checkStatusWithOrderNumber success', async () => {
  const response = {
    result: 0,
    settled: 1,
    source: {
      // source data, not needed for this test
    }
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.checkStatusWithOrderNumber('ord_num')).resolves.toHaveProperty('settled', 1);
});

test('capture gives error with no order_number', async () => {
  await expect(vismapay.capture('')).rejects.toHaveProperty('type', 3);
});

test('capture fails if not successful response', async () => {
  const response = {
    result: 1
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const c = vismapay.capture('123');

  await expect(c).rejects.toHaveProperty('type', 6);
  await expect(c).rejects.toHaveProperty('result.result', 1);
});

test('capture success', async () => {
  const response = {
    result: 0
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.capture('123')).resolves.toHaveProperty('result', 0);
});


test('cancel gives error with no order_number', async () => {
  await expect(vismapay.cancel('')).rejects.toHaveProperty('type', 3);
});

test('cancel fails if not successful response', async () => {
  const response = {
    result: 1
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const c = vismapay.cancel('123');

  await expect(c).rejects.toHaveProperty('type', 6);
  await expect(c).rejects.toHaveProperty('result.result', 1);
});

test('cancel success', async () => {
  const response = {
    result: 0
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.cancel('123')).resolves.toHaveProperty('result', 0);
});

test('get card token', async () => {
  const response = {
    result: 0,
    source: {
      object: "card",
      last4: "1111",
      brand: "Visa",
      exp_year: 2018,
      exp_month: 5,
      card_token: "card-123"
    }
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const gct = vismapay.getCardToken('card-123');
  await expect(gct).resolves.toHaveProperty('result', 0);
  await expect(gct).resolves.toHaveProperty('source.card_token', 'card-123');

  expect(hmacSpy).toHaveReturnedWith('8FD80DB663871A0977D019465A5EADA4FF636582C7F6E09E1DED7D1D9566D963');
});

test('delete card token', async () => {
  const response = {
    result: 0
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.deleteCardToken('card-123')).resolves.toHaveProperty('result', 0);
  expect(hmacSpy).toHaveReturnedWith('8FD80DB663871A0977D019465A5EADA4FF636582C7F6E09E1DED7D1D9566D963');
});

test('check return with params OK Settled', async () => {
  const params = {
    RETURN_CODE: 0,
    ORDER_NUMBER: '123',
    SETTLED: 1,
    AUTHCODE: 'E5CD8307975FE9DA10C391EB47E48E47CBBA2A171C187E35782B920F268ECFC9'
  };

  await expect(vismapay.checkReturn(params)).resolves.toBeTruthy();
});

test('check return with params OK not Settled', async () => {
  const params = {
    RETURN_CODE: 0,
    ORDER_NUMBER: '123',
    SETTLED: 0,
    AUTHCODE: '5F7B2BBE36C952C7DF6E75577538ABA01AD871B384E8F8636A740F08E0D95724'
  };

  await expect(vismapay.checkReturn(params)).resolves.toBeTruthy();
});

test('check return with params OK Settled contact id', async () => {
  const params = {
    RETURN_CODE: 0,
    ORDER_NUMBER: '123',
    SETTLED: 1,
    CONTACT_ID: 123,
    AUTHCODE: '02BAD88FA52FE5FBE9FA16EDB5313FE9690D03DDCF476F0FBFFAD502CE2A64FF'
  };

  await expect(vismapay.checkReturn(params)).resolves.toBeTruthy();
});

test('check return with params OK not Settled contact id', async () => {
  const params = {
    RETURN_CODE: 0,
    ORDER_NUMBER: '123',
    SETTLED: 0,
    CONTACT_ID: 123,
    AUTHCODE: '5866C52ADEEA44EB1B04CA1EA840F5F97B92D337340DC5F2ED1B701DA8BF1150'
  };

  await expect(vismapay.checkReturn(params)).resolves.toBeTruthy();
});

test('check return with params FAILED', async () => {
  const params = {
    RETURN_CODE: 1,
    ORDER_NUMBER: '123',
    AUTHCODE: 'AF870E7BA31BC7A413E5FF24C6DA3CDBA1BF542EF591357CAD98B16662BFCF1F'
  };

  await expect(vismapay.checkReturn(params)).resolves.toBeTruthy();
});

test('check return with params FAILED incident id', async () => {
  const params = {
    RETURN_CODE: 1,
    ORDER_NUMBER: '123',
    INCIDENT_ID: 'incident',
    AUTHCODE: '98F6866F50BC63B27B170E44134BE2B692FCEF1E3391D7785BFFEBAB3CFB301B'
  };

  await expect(vismapay.checkReturn(params)).resolves.toBeTruthy();
});

test('check return with invalid MAC', async () => {
  const base = {
    RETURN_CODE: 0,
    ORDER_NUMBER: '123',
    SETTLED: 1,
  };

  await expect(vismapay.checkReturn({
    ...base,
    AUTHCODE: 'invalid'
  })).rejects.toHaveProperty('type', 5);

  await expect(vismapay.checkReturn({
    ...base,
    AUTHCODE: '98F6866F50BC63B27B170E44134BE2B692FCE81E3391D7785BFFEBAB3CFB301D'
  })).rejects.toHaveProperty('type', 5);
});

test('get payment', async () => {
  const response = {
    result: 0
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.getPayment('ord_num')).resolves.toHaveProperty('result', 0);
});

test('get refund', async () => {
  const response = {
    result: 0
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.getRefund(123)).resolves.toHaveProperty('result', 0);
});

test('create refund', async () => {
  const response = {
    result: 0
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.createRefund({
    order_number: 'ord_num',
    amount: 120
  })).resolves.toHaveProperty('result', 0);
});

test('cancel refund', async () => {
  const response = {
    result: 0
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  await expect(vismapay.cancelRefund(123)).resolves.toHaveProperty('result', 0);
});

test('get merchant payment methods', async () => {
  const response = {
    result: 0,
    payment_methods: [
      {
        name: 'dummy'
      }
    ]
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const mpm = vismapay.getMerchantPaymentMethods('EUR');
  await expect(mpm).resolves.toHaveProperty('result', 0);
  await expect(mpm).resolves.toHaveProperty('payment_methods[0].name', 'dummy');

  expect(hmacSpy).toHaveReturnedWith('CF0552506D3736E30FAC8AB39200A9FCC81C630AEFAE4732759F37880282585E');
});

test('get merchant payment methods with channel sub merchant ids', async () => {
  const response = {
    result: 0,
    payment_methods: [{ name: 'dummy' }]
  };

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const result = await vismapay.getMerchantPaymentMethods('EUR', ['1', '2']);
  expect(result).toHaveProperty('result', 0);

  const body = JSON.parse(fetch.mock.calls[fetch.mock.calls.length - 1][1].body);
  expect(body.channel_sub_merchant_ids).toEqual(['1', '2']);
});

test('class export', async () => {
  const vpay = new vismapayClass();
  await expect(vpay.createCharge({})).rejects.toHaveProperty('type', 2);
});

test('charge card token', async () => {
  const response = {
    result: 0,
    settled: 1
  }

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const cct = vismapay.chargeCardToken({
    order_number: '234asa',
    currency: 'EUR',
    amount: '123',
    card_token: 'asd4005-123'
  });

  await expect(cct).resolves.toHaveProperty('result', 0);
  await expect(cct).resolves.toHaveProperty('settled', 1);

  expect(hmacSpy).toHaveReturnedWith('6A012908616C06BE12FC95DD4962942FC9F78D96DE2A38E28A573DCAA8BF7968');
});

test('charge card token CIT', async () => {
  const response = {
    result: 30,
    verify: {
      token: 'test_token',
      type: '3ds'
    }
  }

  fetch.mockResponseOnce(JSON.stringify(response), { status: 200 });

  const cct = vismapay.chargeCardToken({
    order_number: '234asa',
    currency: 'EUR',
    amount: '123',
    card_token: 'asd4005-123',
    initiator: {
      type: 2,
      return_url: 'https://localhost/return',
      notify_url: 'https://localhost/notify'
    }
  });

  await expect(cct).rejects.toHaveProperty('type', 6);
  await expect(cct).rejects.toHaveProperty('result.result', 30);
  await expect(cct).rejects.toHaveProperty('result.verify.token', 'test_token');

  expect(hmacSpy).toHaveReturnedWith('6A012908616C06BE12FC95DD4962942FC9F78D96DE2A38E28A573DCAA8BF7968');
});

test('authcode calculation', () => {
  // hmacs always look the same with the same input,
  // so this is kind of a sanity check
  const hmac = vismapay.getHmac('some-data');
  expect(hmac).toEqual('E8ED30D361263D71ACF3CEB6EEB05E21386A9534762050D08122067BF956479D');
});
