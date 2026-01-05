// app/fonts.ts
import localFont from "next/font/local";

export const sfuiDisplay = localFont({
  src: [
    {
      path: "../public/fonts/SFUIDisplay-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/SFUIDisplay-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/SFUIDisplay-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/SFUIDisplay-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-sfui-display",
});
