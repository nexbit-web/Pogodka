import { Container } from "@/components/shared/Container";
import Image from "next/image";
export default function Home() {
  return (
    <>
      <Container>
        <div className="flex flex-1 flex-col gap-4 p-0 sm:p-4 w-full">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold text-shadow">Роздільна</h1>
            <h2 className="text-7xl">14°</h2>
            <p className="text-lg text-muted-foreground text-shadow">
              Сонячно, відчувається як 19°
            </p>
            <div className="flex gap-4 text-lg text-shadow">
              <p>B:10°</p>
              <p>H:22°</p>
            </div>
          </div>
          <div>
            <div className="flex bg-muted/50 rounded-xl">
              <div className="flex flex-col items-center p-4 w-20  hover:bg-muted/70 rounded-xl text-shadow">
                <p>12</p>
                <Image
                  src="https://cdn.weatherapi.com/weather/64x64/day/332.png"
                  alt="Weather icon"
                  width={40}
                  height={40}
                />
                <p>22°</p>
              </div>
              <div className="flex flex-col items-center p-4 w-20 hover:bg-muted/70 rounded-xl">
                <p>13</p>
                <Image
                  src="https://cdn.weatherapi.com/weather/64x64/night/176.png"
                  alt="Weather icon"
                  width={40}
                  height={40}
                />
                <p>20°</p>
              </div>
            </div>
          </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div>
        </div>
      </Container>
    </>
  );
}
