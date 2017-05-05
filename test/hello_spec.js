var sayHello = require('../src/hello.js');


describe('Hello', function () {
	it("say hello to receiver", function () {
		expect(sayHello('Baikal')).toBe("Hello Baikal!");
	});
});