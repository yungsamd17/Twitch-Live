chrome.storage.local.set({ selectedPlatform: "TWITCH" });

const getLiveTwitchStreams = async () => {
  const storageItems = [
    "twitchIsValidated",
    "twitchAccessToken",
    "twitchUserId",
  ];
  chrome.storage.local.get(storageItems, (res) => {
    if (!res.twitchIsValidated) return;
    const followUrl =
      "https://api.twitch.tv/helix/streams/followed" +
      `?&first=100&user_id=${res.twitchUserId}`;
    fetch(followUrl, {
      headers: {
        Authorization: `Bearer ${res.twitchAccessToken}`,
        "Client-ID": TWITCH_APP_TOKEN,
      },
    })
      .then((response) => {
        if (response.status !== 200) {
          handleTwitchUnauthorized();
          throw new Error("An error occurred");
        }
        return response.json();
      })
      .then((response) => {
        chrome.storage.local.set({
          twitchStreams: response.data.map((stream) => ({
            gameName: stream["game_name"],
            thumbnail: stream["thumbnail_url"],
            title: stream["title"],
            channelName: stream["user_name"],
            viewerCount: stream["viewer_count"],
            liveTime: getTimePassed(stream["started_at"]),
          })),
        });
        chrome.runtime.sendMessage({ message: "refresh-page" });
      })
      .catch((error) => {
        handleTwitchUnauthorized();
        console.error(error);
      });
  });
};

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "refresh-twitch-streams") {
    getLiveTwitchStreams();
  }
});
