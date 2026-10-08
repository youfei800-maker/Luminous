export default function Icon({
  name = "arrow",
  size = 20,
  className = "",
  ...props
}) {
  const paths = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    diagonal: <path d="M6 18 18 6M6 6h12v12" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    bookmark: <path d="M6 4h12v17l-6-4-6 4z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    down: <path d="m6 9 6 6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    share: <path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7" />,
    star: (
      <path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z" />
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
