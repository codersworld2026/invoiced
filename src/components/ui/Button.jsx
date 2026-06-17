// Editorial button. variant: 'primary' | 'ghost' | 'accent' | 'danger'.
export default function Button({ variant = 'primary', sm = false, className = '', children, ...props }) {
  const cls = ['btn', `btn-${variant}`, sm ? 'btn-sm' : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
