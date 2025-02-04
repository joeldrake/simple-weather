import 'jsr:@std/dotenv/load';

const kv = await Deno.openKv();
const one_hour = 60 * 60 * 1000;
const api_key = Deno.env.get('WEATHERAPI_KEY');

Deno.serve(async () => {
	// deno-lint-ignore no-explicit-any
	let weather_data: Deno.KvEntryMaybe<any> = await kv.get(['weather_data']);
	const timestamp: Deno.KvEntryMaybe<number | null> = await kv.get(['timestamp']);

	const more_than_one_hour_ago_since_last_update = Date.now() - (timestamp.value || 0) > one_hour;

	if (!weather_data.value?.current || more_than_one_hour_ago_since_last_update) {
		kv.set(['timestamp'], Date.now());

		const data = await fetch(
			`https://api.weatherapi.com/v1/forecast.json?key=${api_key}&q=Stockholm&days=1&aqi=no&alerts=no`
		);

		const new_weather_data = await data.json();
		kv.set(['weather_data'], new_weather_data);
	}

	weather_data = await kv.get(['weather_data']);

	const day_or_night = weather_data.value?.current?.is_day ? 'day' : 'night';
	const is_cloudy = (weather_data.value?.current?.cloud ?? 0) > 90;
	const day = weather_data.value?.forecast?.forecastday[0]?.day ?? {};

	const weather_today = day?.daily_will_it_snow
		? 'snow'
		: day?.daily_chance_of_rain
		? 'rain'
		: is_cloudy
		? 'cloud'
		: day_or_night === 'day'
		? 'sun'
		: 'stars';

	return new Response(`${weather_today} ${day_or_night}`);
});
