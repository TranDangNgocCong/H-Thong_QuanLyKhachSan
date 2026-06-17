const assert = require('assert');
const userModel = require('../models/userModel');

// Stub
userModel.findById = async (id) => {
  if (id === 1) return { id: 1, role: 'admin', isActive: true };
  if (id === 2) return { id: 2, role: 'receptionist', isActive: true };
  if (id === 3) return { id: 3, role: 'accountant', isActive: true };
  if (id === 4) return { id: 4, role: 'cleaner', isActive: false }; // inactive
  return null;
};

const { protect, restrictTo } = require('../middleware/authMiddleware');

async function testProtect() {
  console.log('Running protect tests...');

  // Case 1: No Authorization Header
  {
    const req = { headers: {} };
    let statusVal = null;
    let jsonVal = null;
    const res = {
      status(s) {
        statusVal = s;
        return {
          json(j) {
            jsonVal = j;
          }
        };
      }
    };
    await protect(req, res, () => {
      throw new Error('Should not call next()');
    });
    assert.strictEqual(statusVal, 401);
    assert.strictEqual(jsonVal.success, false);
    assert.strictEqual(jsonVal.message, 'Chưa đăng nhập hệ thống');
  }

  // Case 2: Invalid Authorization Format
  {
    const req = { headers: { authorization: 'Basic 12345' } };
    let statusVal = null;
    let jsonVal = null;
    const res = {
      status(s) {
        statusVal = s;
        return {
          json(j) {
            jsonVal = j;
          }
        };
      }
    };
    await protect(req, res, () => {
      throw new Error('Should not call next()');
    });
    assert.strictEqual(statusVal, 401);
    assert.strictEqual(jsonVal.success, false);
    assert.strictEqual(jsonVal.message, 'Chưa đăng nhập hệ thống');
  }

  // Case 3: Invalid Mock Token Format
  {
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    let statusVal = null;
    let jsonVal = null;
    const res = {
      status(s) {
        statusVal = s;
        return {
          json(j) {
            jsonVal = j;
          }
        };
      }
    };
    await protect(req, res, () => {
      throw new Error('Should not call next()');
    });
    assert.strictEqual(statusVal, 401);
    assert.strictEqual(jsonVal.success, false);
    assert.strictEqual(jsonVal.message, 'Phiên đăng nhập không hợp lệ');
  }

  // Case 4: Non-existent User
  {
    const req = { headers: { authorization: 'Bearer mock-jwt-token-for-user-999' } };
    let statusVal = null;
    let jsonVal = null;
    const res = {
      status(s) {
        statusVal = s;
        return {
          json(j) {
            jsonVal = j;
          }
        };
      }
    };
    await protect(req, res, () => {
      throw new Error('Should not call next()');
    });
    assert.strictEqual(statusVal, 401);
    assert.strictEqual(jsonVal.success, false);
    assert.strictEqual(jsonVal.message, 'Tài khoản không tồn tại trên hệ thống');
  }

  // Case 5: Inactive User
  {
    const req = { headers: { authorization: 'Bearer mock-jwt-token-for-user-4' } };
    let statusVal = null;
    let jsonVal = null;
    const res = {
      status(s) {
        statusVal = s;
        return {
          json(j) {
            jsonVal = j;
          }
        };
      }
    };
    await protect(req, res, () => {
      throw new Error('Should not call next()');
    });
    assert.strictEqual(statusVal, 403);
    assert.strictEqual(jsonVal.success, false);
    assert.strictEqual(jsonVal.message, 'Tài khoản hiện đang bị khóa');
  }

  // Case 6: Valid Active User
  {
    const req = { headers: { authorization: 'Bearer mock-jwt-token-for-user-1' } };
    const res = {};
    let nextCalled = false;
    await protect(req, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.userId, 1);
    assert.strictEqual(req.user.role, 'admin');
  }

  console.log('protect tests passed!');
}

async function testRestrictTo() {
  console.log('Running restrictTo tests...');

  // Case 1: Unauthorized Role
  {
    const req = { user: { role: 'receptionist' } };
    let statusVal = null;
    let jsonVal = null;
    const res = {
      status(s) {
        statusVal = s;
        return {
          json(j) {
            jsonVal = j;
          }
        };
      }
    };
    const middleware = restrictTo('admin', 'accountant');
    middleware(req, res, () => {
      throw new Error('Should not call next()');
    });
    assert.strictEqual(statusVal, 403);
    assert.strictEqual(jsonVal.success, false);
    assert.strictEqual(jsonVal.message, 'Access Denied / Quyền truy cập bị từ chối');
  }

  // Case 2: Authorized Role
  {
    const req = { user: { role: 'accountant' } };
    const res = {};
    let nextCalled = false;
    const middleware = restrictTo('admin', 'accountant');
    middleware(req, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  }

  console.log('restrictTo tests passed!');
}

async function runAll() {
  try {
    await testProtect();
    await testRestrictTo();
    console.log('All middleware unit tests passed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runAll();
