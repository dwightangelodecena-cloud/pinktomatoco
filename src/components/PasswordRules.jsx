import { CheckIcon } from './Icons.jsx';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'A number', test: (pw) => /\d/.test(pw) },
  { label: 'A symbol', test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

export const passwordIsValid = (pw) => PASSWORD_RULES.every((r) => r.test(pw));
export const PASSWORD_ERROR = 'Your password needs at least 8 characters, a number and a symbol.';

export default function PasswordRules({ password }) {
  return (
    <ul className="password-rules">
      {PASSWORD_RULES.map((r) => (
        <li key={r.label} className={r.test(password) ? 'is-met' : ''}><CheckIcon /> {r.label}</li>
      ))}
    </ul>
  );
}
