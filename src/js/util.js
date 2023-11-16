const getTimePassed = (startTime) => {
  let elapsedTime = Date.now() - Date.parse(startTime);
  elapsedTime = (elapsedTime - (elapsedTime % 1000)) / 1000;
  const ss = elapsedTime % 60;
  elapsedTime = (elapsedTime - ss) / 60;
  const mm = elapsedTime % 60;
  elapsedTime = (elapsedTime - mm) / 60;
  const hh = elapsedTime % 24;
  elapsedTime = (elapsedTime - hh) / 24;
  const format = (s) => (s < 10 ? `0${s}` : s);
  return `${hh}:${format(mm)}:${format(ss)}`;
};
