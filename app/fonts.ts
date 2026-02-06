// app/fonts.ts
import localFont from "next/font/local";

export const sfuiDisplay = localFont({
  src: [
    {
      path: "../public/fonts/SFUIDisplay-Medium.ttf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-sfui-display",
});
