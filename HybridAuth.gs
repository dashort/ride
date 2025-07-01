function hashPassword(password) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return raw.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function findUserRecord(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(String);
  const emailCol = headers.indexOf('email');
  const passCol = headers.indexOf('hashedPassword');
  const roleCol = headers.indexOf('role');
  const statusCol = headers.indexOf('status');
  const nameCol = headers.indexOf('name');
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[emailCol] === email) {
      return {
        email: row[emailCol],
        hashedPassword: row[passCol],
        role: row[roleCol],
        status: row[statusCol],
        name: row[nameCol]
      };
    }
  }
  return null;
}

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function createCustomSession(user) {
  const session = {
    email: user.email,
    name: user.name,
    role: user.role,
    expires: Date.now() + SESSION_DURATION_MS
  };
  PropertiesService.getUserProperties().setProperty('CUSTOM_SESSION', JSON.stringify(session));
  return session;
}

function getCustomSession() {
  const prop = PropertiesService.getUserProperties().getProperty('CUSTOM_SESSION');
  if (!prop) return null;
  try {
    const sess = JSON.parse(prop);
    if (sess.expires > Date.now()) {
      return sess;
    }
  } catch (e) {}
  PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
  return null;
}

function loginWithCredentials(email, password) {
  const user = findUserRecord(email);
  if (!user || user.status !== 'active') {
    return { success: false, message: 'Invalid credentials' };
  }
  if (hashPassword(password) !== String(user.hashedPassword)) {
    return { success: false, message: 'Invalid credentials' };
  }
  createCustomSession(user);
  return { success: true, url: getWebAppUrlSafe() };
}

function loginWithGoogle() {
  const auth = authenticateUser();
  if (auth.success) {
    createCustomSession(auth.user);
    return { success: true, url: getWebAppUrlSafe() };
  }
  return auth;
}

function logoutUser() {
  PropertiesService.getUserProperties().deleteProperty('CUSTOM_SESSION');
  return { success: true };
}
