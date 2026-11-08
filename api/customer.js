import { isSameSite, readJson, sendJson } from './_lib/bigcommerce.js';
import { listCustomerOrders } from './_lib/orders.js';
import { endSession, readSession, startSession } from './_lib/session.js';
import { storefront } from './_lib/storefront.js';

const CUSTOMER_FIELDS = 'entityId firstName lastName email';

const LOGIN = `mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    customer { ${CUSTOMER_FIELDS} }
    customerAccessToken { value expiresAt }
  }
}`;

const REGISTER = `mutation Register($input: RegisterCustomerInput!) {
  customer { registerCustomer(input: $input) { customer { entityId } errors { __typename ... on Error { message } } } }
}`;

const REQUEST_RESET = `mutation RequestReset($input: RequestResetPasswordInput!) {
  customer { requestResetPassword(input: $input) { errors { __typename ... on Error { message } } } }
}`;

const RESET = `mutation Reset($input: ResetPasswordInput!) {
  customer { resetPassword(input: $input) { errors { __typename ... on Error { message } } } }
}`;

const LOGOUT = 'mutation Logout { logout { result } }';

const toCustomer = (c) => ({ id: c.entityId, firstName: c.firstName, lastName: c.lastName, email: c.email });

async function login(req, res, email, password) {
  const { data, errors } = await storefront(LOGIN, { email, password });
  if (errors?.length || !data?.login?.customer) return sendJson(res, 401, { error: "That email and password don't match. Try again or reset your password." });
  const customer = toCustomer(data.login.customer);
  startSession(req, res, customer, data.login.customerAccessToken);
  sendJson(res, 200, { customer });
}

async function register(req, res, { firstName, lastName, email, password }) {
  if (![firstName, lastName, email, password].every((v) => typeof v === 'string' && v.trim())) {
    return sendJson(res, 400, { error: 'Please enter your first and last name, email and password.' });
  }
  const input = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password };
  const { data, errors } = await storefront(REGISTER, { input });
  const result = data?.customer?.registerCustomer;
  const problem = result?.errors?.[0];
  if (problem?.__typename === 'EmailAlreadyInUseError') return sendJson(res, 409, { error: 'An account with this email already exists. Try signing in instead.' });
  if (errors?.length || problem || !result?.customer) {
    console.error('Customer sign-up failed:', problem?.__typename ?? errors?.[0]?.message);
    return sendJson(res, 400, { error: problem?.message || "We couldn't create your account. Please try again." });
  }
  await login(req, res, input.email, password);
}

async function requestReset(res, email) {
  const { data, errors } = await storefront(REQUEST_RESET, { input: { email } });
  const problem = errors?.[0] ?? data?.customer?.requestResetPassword?.errors?.[0];
  if (problem) console.error('Password reset failed:', problem.__typename ?? problem.message);
  // The reply is the same either way, so this can't reveal who has an account.
  sendJson(res, 200, { ok: true });
}

async function resetPassword(res, { customerId, token, password }) {
  if (!Number.isInteger(customerId) || customerId < 1 || typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
    return sendJson(res, 400, { error: 'This reset link is not complete. Please ask for a new one.' });
  }
  const { data, errors } = await storefront(RESET, { input: { customerEntityId: customerId, token, newPassword: password } });
  const problem = errors?.[0] ?? data?.customer?.resetPassword?.errors?.[0];
  if (!problem) return sendJson(res, 200, { ok: true });
  // A weak password is worth explaining. Anything else means the link can't be used.
  const badLink = /token|customerEntityId/i.test(problem.message ?? '');
  if (problem.__typename === 'CustomerPasswordError' && !badLink) return sendJson(res, 400, { error: problem.message });
  console.error('Password reset refused:', problem.__typename ?? problem.message);
  sendJson(res, 400, { error: 'This reset link has expired or was already used. Please ask for a new one.' });
}

async function logout(req, res) {
  const session = readSession(req);
  endSession(req, res);
  if (session) await storefront(LOGOUT, {}, session.token).catch(() => {});
  sendJson(res, 200, { ok: true });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const session = readSession(req);
      if (!new URL(req.url, 'http://local').searchParams.has('orders')) return sendJson(res, 200, { customer: session?.customer ?? null });
      if (!session) return sendJson(res, 401, { error: 'Please sign in.' });
      return sendJson(res, 200, await listCustomerOrders(session.customer.id));
    }

    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    if (!isSameSite(req)) return sendJson(res, 403, { error: 'Not allowed' });

    const body = await readJson(req);
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (body.action === 'logout') return await logout(req, res);
    if (body.action === 'reset') return await resetPassword(res, body);
    if (!email) return sendJson(res, 400, { error: 'Please enter your email.' });
    if (body.action === 'login') return await login(req, res, email, String(body.password ?? ''));
    if (body.action === 'register') return await register(req, res, { ...body, email });
    if (body.action === 'forgot') return await requestReset(res, email);
    sendJson(res, 400, { error: 'Unknown action.' });
  } catch (err) {
    console.error(err);
    sendJson(res, 502, { error: 'Accounts are not available right now. Please try again in a moment.' });
  }
}
