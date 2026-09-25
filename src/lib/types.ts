export interface WeatherApiResponse {
	misto: string;
	oblast: string;
	kraina: string;
	latitude: number;
	longitude: number;
	// Сира відповідь Open-Meteo (hourly / daily масиви)
	weather: OpenMeteoWeather;
}

export interface OpenMeteoWeather {
	hourly: {
		time: string[];
		temperature_2m: number[];
		apparent_temperature: number[];
		weathercode: number[];
		windspeed_10m: number[];
		windgusts_10m: number[];
		winddirection_10m: number[];
		relativehumidity_2m: number[];
		dewpoint_2m: number[];
		visibility: number[];
		precipitation: number[];
		pressure_msl: number[];
		surface_pressure?: number[];
		wind_speed_10m?: number[];
	};
	daily: {
		time: string[];
		temperature_2m_max: number[];
		temperature_2m_min: number[];
		precipitation_sum: number[];
		weathercode: number[];
	};
}

export interface CurrentWeather {
	temp: number;
	feels: number;
	dewPoint: number;
	code: number;
	windDir: number;
	humidity: number;
	wind: number;
	gusts: number;
	visibility: number;
	precipitation: number;
	pressure: number;
}

export interface WeeklyDay {
	date: string;
	day: {
		code: number;
		mintemp_c: number;
		maxtemp_c: number;
	};
}

export interface CitySearchResult {
	id: number;
	slug: string;
	nameUa: string;
	nameRu: string;
	nameEn: string;
	region: string;
	latitude: number;
	longitude: number;
}
