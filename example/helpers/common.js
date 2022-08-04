module.exports = {

    getErrorMessageFromReturnCode(returnCode) {
		switch(returnCode)
		{
			case '1':
				return 'Payment failed!';
			case '4':
				return 'Transaction status could not be updated after customer returned from the web page of a bank.';
			case '10':
				return 'Maintenance break';
			default:
				return 'Unknown return value';
		}
    }

}