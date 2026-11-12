export default function WhatsAppCommunityButton() {
  return (
    <a
      href="https://whatsapp.com/channel/0029Vb9pJZSKAwEeY9Pd0v3s"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Follow the official NYFB WhatsApp Channel"
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 1000,
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "13px 18px",
        borderRadius: "999px",
        background: "#25D366",
        color: "#073b1d",
        fontWeight: 700,
        fontSize: "14px",
        lineHeight: 1.2,
        textDecoration: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,.22)",
        border: "1px solid rgba(255,255,255,.35)",
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width="22"
        height="22"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M16.04 3C8.9 3 3.1 8.78 3.1 15.9c0 2.27.6 4.48 1.75 6.43L3 29l6.86-1.8a12.95 12.95 0 0 0 6.18 1.57h.01c7.13 0 12.93-5.79 12.94-12.9A12.8 12.8 0 0 0 25.2 6.7 12.84 12.84 0 0 0 16.04 3Zm0 23.57h-.01a10.75 10.75 0 0 1-5.48-1.5l-.39-.23-4.07 1.07 1.09-3.96-.25-.4a10.67 10.67 0 0 1-1.64-5.65c0-5.93 4.83-10.75 10.77-10.75 2.87 0 5.57 1.12 7.6 3.15a10.67 10.67 0 0 1 3.15 7.6c0 5.93-4.83 10.67-10.77 10.67Zm5.9-8.03c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.61-1.9-1.8-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.57.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.4-.3.32-1.14 1.1-1.14 2.68s1.17 3.1 1.33 3.31c.16.21 2.3 3.5 5.57 4.9.78.34 1.39.55 1.87.7.79.25 1.5.22 2.06.13.63-.1 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.3-.21-.62-.37Z" />
      </svg>
      <span>Follow NYFB Channel</span>
    </a>
  );
}
