/**
 * Simple authentication service for the web app.
 * Stores hashed passwords for a few demo users and
 * uses UserProperties to keep track of login state.
 */

const AUTH_USERS = {
  'admin@example.com': '713bfda78870bf9d1b261f565286f85e97ee614efe5f0faf7c34e7ca4f65baca', // adminpass
  'rider@example.com': 'e1ba0863b3d203dfab67357b0ee651032aca5b10b1a780e8cf5de5abf6c229db'  // riderpass
};

/**
 * Hashes a plain text password using SHA-256.
 * @param {string} password The plain text password.
 * @return {string} Hex encoded hash.
 */
function hashPassword(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return digest.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

/**
 * Validates a user's credentials.
 * @param {string} email The user email.
 * @param {string} password The plain text password.
 * @return {boolean} True if credentials are valid.
 */
function authenticateUser(email, password) {
  if (!email || !password || !AUTH_USERS[email]) return false;
  return AUTH_USERS[email] === hashPassword(password);
}

/**
 * Logs a user in and stores a session token in UserProperties.
 * @param {string} email The user email.
 * @param {string} password The user password.
 * @return {Object} Result of the login attempt.
 */
function loginUser(email, password) {
  if (authenticateUser(email, password)) {
    const props = PropertiesService.getUserProperties();
    const token = Utilities.getUuid();
    props.setProperty('authToken', token);
    props.setProperty('authEmail', email);
    return { success: true };
  }
  return { success: false, message: 'Invalid credentials' };
}

/**
 * Clears the session token for the current user.
 */
function logoutUser() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty('authToken');
  props.deleteProperty('authEmail');
  return { success: true };
}

/**
 * Checks whether the current user is logged in.
 * @return {boolean} True if logged in.
 */
function isUserLoggedIn() {
  const props = PropertiesService.getUserProperties();
  return !!props.getProperty('authToken');
}
