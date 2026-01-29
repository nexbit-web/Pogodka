import { WeatherLayout } from "@/components/shared/WeatherLayout";
import { getWeather } from "@/utils/getWeather";

export default async function Home() {
  const data = await getWeather("Київ");
  return <WeatherLayout data={data} />;
}
