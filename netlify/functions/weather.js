exports.handler = async (event) => {
  const city = event.queryStringParameters.city;

  if (!city) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "City is required",
      }),
    };
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  const base = "https://api.openweathermap.org/data/2.5";
  const q = encodeURIComponent(city);

  try {
    // Current weather (temp, humidity, wind, sunrise/sunset, visibility)
    // and the 5 day / 3 hour forecast (used for the hourly strip and the
    // multi-day outlook) are fetched together so the client only needs
    // one round trip per search.
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${base}/weather?q=${q}&appid=${apiKey}&units=metric`),
      fetch(`${base}/forecast?q=${q}&appid=${apiKey}&units=metric`),
    ]);

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ current, forecast }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
      }),
    };
  }
};
