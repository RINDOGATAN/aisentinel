import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          borderRadius: 4,
        }}
      >
        <svg
          width="24"
          height="28"
          viewBox="0 0 24 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 0L0 5v9c0 7.73 5.12 14.95 12 17 6.88-2.05 12-9.27 12-17V5L12 0z"
            fill="#f5a623"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
