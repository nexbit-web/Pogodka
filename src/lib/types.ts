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
		// Можуть бути відсутні у старому кеші
		precipitation_probability?: number[];
	};
	daily: {
		time: string[];
		temperature_2m_max: number[];
		temperature_2m_min: number[];
		precipitation_sum: number[];
		weathercode: number[];
		precipitation_probability_max?: number[];
		sunrise?: string[];
		sunset?: string[];
		uv_index_max?: number[];
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

/** Одна точка погодинного прогнозу всередині дня */
export interface DayHour {
	time: string;
	hour: number;
	temp: number;
	feels: number;
	code: number;
	precip: number;
	precipProb?: number;
	wind: number;
	gusts: number;
	windDir: number;
	humidity: number;
	pressure: number;
}

/** День прогнозу з підсумками та погодинними даними */
export interface ForecastDay {
	date: string;
	code: number;
	min: number;
	max: number;
	precipSum: number;
	precipProbMax?: number;
	sunrise?: string;
	sunset?: string;
	uvMax?: number;
	hours: DayHour[];
}
