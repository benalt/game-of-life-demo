'use strict';

const fs = require('fs');
const assert = require('assert');

let rawdTestData = fs.readFileSync('./test-data.json');
let testData = JSON.parse(rawdTestData);

testData.forEach(testItem => {
  assert (JSON.stringify(testItem.given) === JSON.stringify(testItem.expected));
  //assert (JSON.stringify(testItem.given) !== JSON.stringify(testItem.expected)), 'intentionally throws an error';
});
