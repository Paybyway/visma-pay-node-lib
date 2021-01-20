var testrunner = require('qunit');

var callback = function (err, report) {
  if (err) {
    console.dir(err);
  } else {
    console.dir(report);

    if (report.failed > 0) {
      process.exit(1);
    }
  }
};

testrunner.run({
  code : 'lib/payment.js',
  tests : 'tests/test.js'
}, callback);

