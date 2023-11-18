const getTimePassed = (startTime) => {
  let elapsedTime = Date.now() - Date.parse(startTime);
  elapsedTime = (elapsedTime - (elapsedTime % 1000)) / 1000;
  const ss = Math.floor(elapsedTime % 60);
  elapsedTime = (elapsedTime - ss) / 60;
  const mm = Math.floor(elapsedTime % 60);
  elapsedTime = (elapsedTime - mm) / 60;
  const hh = Math.floor(elapsedTime % 24);

  const format = (s) => (s < 10 ? `0${s}` : s);
  
  // Only include hours if they are greater than zero
  const hoursPart = hh > 0 ? `${format(hh)}:` : '';

  return `${hoursPart}${format(mm)}:${format(ss)}`;
};
