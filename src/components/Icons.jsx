const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const SearchIcon = () => (
  <svg {...base}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
export const CartIcon = () => (
  <svg {...base}><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);
export const CloseIcon = () => (
  <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const MenuIcon = () => (
  <svg {...base}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const ChevronDown = () => (
  <svg {...base} width={12} height={12}><path d="M6 9l6 6 6-6" /></svg>
);
export const HeartIcon = ({ filled }) => (
  <svg {...base} width={16} height={16} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);
export const Star = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
);
export const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z" /></svg>
);
export const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" /></svg>
);
export const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.7-2.2-2.7-2.2-4.3 0-3.5 2.5-6.7 7.3-6.7 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.8 6.9-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2 1-.9 2.2-1.4 2.9A10 10 0 1 0 12 2z" /></svg>
);
export const MailIcon = () => (
  <svg {...base} width={16} height={16}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 6l9 7 9-7" /></svg>
);
export const PrintIcon = () => (
  <svg {...base} width={16} height={16}><path d="M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7z" /></svg>
);

function Card({ label, children, bg = '#fff' }) {
  return (
    <svg viewBox="0 0 48 30" width="40" height="25" role="img" aria-label={label}>
      <rect x="0.5" y="0.5" width="47" height="29" rx="3" fill={bg} stroke="#d9cfcd" />
      {children}
    </svg>
  );
}
export const PaymentIcons = () => (
  <ul className="payment-icons">
    <li><Card label="Visa"><text x="24" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fontStyle="italic" fill="#1a1f71" fontFamily="Arial">VISA</text></Card></li>
    <li><Card label="Mastercard"><circle cx="20" cy="15" r="7" fill="#eb001b" /><circle cx="28" cy="15" r="7" fill="#f79e1b" fillOpacity=".85" /></Card></li>
    <li><Card label="American Express" bg="#2e77bb"><text x="24" y="19" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="Arial">AMEX</text></Card></li>
    <li><Card label="PayPal"><text x="24" y="19" textAnchor="middle" fontSize="9" fontWeight="700" fontStyle="italic" fill="#003087" fontFamily="Arial">PayPal</text></Card></li>
  </ul>
);
