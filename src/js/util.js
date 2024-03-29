const getStartedAtTime = (startTime) => {
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  };

  const formattedTime = new Intl.DateTimeFormat('en-US', options)
    .format(new Date(startTime))
    // .replace(',', '');

  return formattedTime;
};

const getTimePassed = (startTime) => {
  let elapsedTime = Date.now() - Date.parse(startTime);
  const hours = Math.floor(elapsedTime / 3600000);
  const minutes = Math.floor((elapsedTime % 3600000) / 60000);
  const seconds = Math.floor((elapsedTime % 60000) / 1000);

  const format = (s) => (s < 10 ? `0${s}` : s);

  const formattedHours = hours > 0 ? `${hours}:` : '';
  const formattedMinutes = hours > 0 || minutes >= 10 ? format(minutes) : minutes;
  const formattedSeconds = `${format(seconds)}`;

  return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
};