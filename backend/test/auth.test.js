const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpaqueToken, hashToken, safeTokenEquals } = require('../utils/auth');
const { isValidMeetupCode } = require('../utils/validation');

test('opaque tokens are high entropy and hash deterministically', () => {
  const token = createOpaqueToken();
  assert.equal(token.length, 64);
  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), hashToken(createOpaqueToken()));
});

test('token comparison rejects altered tokens', () => {
  const token = createOpaqueToken();
  assert.equal(safeTokenEquals(hashToken(token), hashToken(token)), true);
  assert.equal(safeTokenEquals(hashToken(token), hashToken(`${token}x`)), false);
});

test('meetup codes require 128 bits of hexadecimal entropy', () => {
  assert.equal(isValidMeetupCode('0123456789abcdef0123456789abcdef'), true);
  assert.equal(isValidMeetupCode('1234'), false);
  assert.equal(isValidMeetupCode('0123456789abcdef0123456789abcdeg'), false);
});
