// One consistent line-icon set (24px grid, 1.75 stroke, rounded joins).
function Icon({ size = 20, strokeWidth = 1.75, fill = 'none', children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p) => (
  <Icon {...p}><circle cx="11" cy="11" r="7.5" /><path d="m20.5 20.5-4.2-4.2" /></Icon>
);
export const CartIcon = (p) => (
  <Icon {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Icon>
);
export const TagIcon = (p) => (
  <Icon {...p}><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" /></Icon>
);
export const HomeIcon = (p) => (
  <Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></Icon>
);
export const GridIcon = (p) => (
  <Icon {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></Icon>
);
export const UserIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></Icon>
);
export const CloseIcon = (p) => (
  <Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
);
export const MenuIcon = (p) => (
  <Icon {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" /></Icon>
);
export const ChevronDown = (p) => (
  <Icon size={14} strokeWidth={2} {...p}><path d="m6 9 6 6 6-6" /></Icon>
);
export const ArrowRight = (p) => (
  <Icon size={16} strokeWidth={2} {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Icon>
);
export const ArrowUp = (p) => (
  <Icon size={18} strokeWidth={2} {...p}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></Icon>
);
export const EyeIcon = (p) => (
  <Icon size={16} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>
);
export const PlusIcon = (p) => (
  <Icon size={16} strokeWidth={2} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Icon>
);
export const MinusIcon = (p) => (
  <Icon size={16} strokeWidth={2} {...p}><path d="M5 12h14" /></Icon>
);
export const CheckIcon = (p) => (
  <Icon size={16} strokeWidth={2.2} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
);
export const HeartIcon = ({ filled, ...p }) => (
  <Icon size={18} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M19 14c1.5-1.46 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </Icon>
);
export const Star = ({ filled, ...p }) => (
  <Icon size={15} strokeWidth={1.5} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" />
  </Icon>
);
export const MapPinIcon = (p) => (
  <Icon {...p}><path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></Icon>
);
export const LeafIcon = (p) => (
  <Icon {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12" /></Icon>
);
export const ShieldCheckIcon = (p) => (
  <Icon {...p}><path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z" /><path d="m9 12 2 2 4-4" /></Icon>
);
export const FlameIcon = (p) => (
  <Icon {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z" /></Icon>
);
export const MailIcon = (p) => (
  <Icon size={17} {...p}><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3 7 9 6 9-6" /></Icon>
);
export const PrintIcon = (p) => (
  <Icon size={17} {...p}><path d="M6 9V3h12v6" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" /></Icon>
);
export const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6z" /></svg>
);
export const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" /></svg>
);
export const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.7-2.2-2.7-2.2-4.3 0-3.5 2.5-6.7 7.3-6.7 3.8 0 6.8 2.7 6.8 6.4 0 3.8-2.4 6.9-5.8 6.9-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2 1-.9 2.2-1.4 2.9A10 10 0 1 0 12 2z" /></svg>
);

function Card({ label, children, bg = '#fff' }) {
  return (
    <svg viewBox="0 0 48 30" width="42" height="26" role="img" aria-label={label}>
      <rect x="0.5" y="0.5" width="47" height="29" rx="5" fill={bg} stroke="rgba(0,0,0,.08)" />
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
